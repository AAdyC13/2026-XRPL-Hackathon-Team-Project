/**
 * server/services/mock-tunnel.ts
 * ─────────────────────────────────────────────────────
 * Mock GPU Tunnel Service
 *
 * Architecture:
 *  ┌─────────┐  SSE   ┌──────────────────────┐  WS   ┌──────────────┐
 *  │ Browser │◄──────►│ /v1/chat/completions  │◄─────►│ GPU Provider │
 *  └─────────┘        └──────────────────────┘       └──────────────┘
 *                              │
 *                      (mock fallback)
 *                              │
 *                      in-process token gen
 *
 * WebSocket Protocol (for real providers):
 *
 *   Provider → Server  { type:"auth",  token:"gkc_ep_..." }
 *   Server  → Provider { type:"auth_ok", providerId, displayName }
 *   Server  → Provider { type:"request", requestId, messages, model }
 *   Provider → Server  { type:"token",   requestId, content }
 *   Provider → Server  { type:"done",    requestId, inputTokens, outputTokens }
 *   Provider → Server  { type:"error",   requestId, message }
 *
 * Mock providers are registered automatically from DB on startup.
 * When a real provider connects with a valid endpoint_token, it overrides
 * the mock for that provider_id.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import crypto from 'crypto';
import { prisma } from '../db/index.js';

// ── Types ──────────────────────────────────────────────────────────────────

interface Message {
  role: string;
  content: string;
}

interface PendingRequest {
  resolve: (value: void) => void;
  reject: (err: Error) => void;
  onToken: (token: string) => void;
  onDone: (inputTokens: number, outputTokens: number) => void;
}

interface ProviderEntry {
  id: string;
  displayName: string;
  ws: WebSocket | null; // null = use mock
  isReal: boolean;
  pendingRequests: Map<string, PendingRequest>;
}

// ── Registry ───────────────────────────────────────────────────────────────

const providers = new Map<string, ProviderEntry>();

export async function initMockProviders(): Promise<void> {
  const rows = await prisma.aiProvider.findMany({
    where: { status: { in: ['online', 'verified'] } },
    select: { id: true, displayName: true },
  });

  for (const row of rows) {
    if (!providers.has(row.id)) {
      providers.set(row.id, {
        id: row.id,
        displayName: row.displayName,
        ws: null,
        isReal: false,
        pendingRequests: new Map(),
      });
    }
  }
  console.log(`[tunnel] Registered ${rows.length} mock providers`);
}

// ── WebSocket server ───────────────────────────────────────────────────────

export function attachWebSocketServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/tunnel' });

  wss.on('connection', (ws: WebSocket, req) => {
    const remoteIp = req.socket.remoteAddress ?? 'unknown';
    let registeredProviderId: string | null = null;

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        ws.close(1003, 'invalid JSON');
        return;
      }

      if (msg.type === 'auth') {
        const token = String(msg.token ?? '');
        prisma.aiProvider.findFirst({
          where: { endpointToken: token, status: { in: ['online', 'verified'] } },
          select: { id: true, displayName: true },
        }).then(row => {
          if (!row) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'invalid token' }));
            ws.close(1008, 'unauthorized');
            return;
          }

          registeredProviderId = row.id;

          // Upgrade mock entry to real WS connection
          let entry = providers.get(row.id);
          if (!entry) {
            entry = { id: row.id, displayName: row.displayName, ws: null, isReal: false, pendingRequests: new Map() };
            providers.set(row.id, entry);
          }
          entry.ws = ws;
          entry.isReal = true;

          ws.send(JSON.stringify({ type: 'auth_ok', providerId: row.id, displayName: row.displayName }));
          console.log(`[tunnel] Real provider connected: ${row.displayName} (${remoteIp})`);
        }).catch(err => {
          console.error('[tunnel] auth DB error:', err);
          ws.close(1011, 'internal error');
        });
        return;
      }

      if (!registeredProviderId) {
        ws.close(1008, 'not authenticated');
        return;
      }

      const entry = providers.get(registeredProviderId);
      if (!entry) return;

      const requestId = String(msg.requestId ?? '');
      const pending = entry.pendingRequests.get(requestId);
      if (!pending) return;

      if (msg.type === 'token') {
        pending.onToken(String(msg.content ?? ''));
      } else if (msg.type === 'done') {
        pending.onDone(Number(msg.inputTokens ?? 0), Number(msg.outputTokens ?? 0));
        pending.resolve();
        entry.pendingRequests.delete(requestId);
      } else if (msg.type === 'error') {
        pending.reject(new Error(String(msg.message ?? 'provider error')));
        entry.pendingRequests.delete(requestId);
      }
    });

    ws.on('close', () => {
      if (registeredProviderId) {
        const entry = providers.get(registeredProviderId);
        if (entry) {
          entry.ws = null;
          entry.isReal = false;
          // Reject all pending requests for this provider
          entry.pendingRequests.forEach(pending => {
            pending.reject(new Error('provider disconnected'));
          });
          entry.pendingRequests.clear();
          console.log(`[tunnel] Provider disconnected: ${registeredProviderId}`);
        }
      }
    });
  });

  console.log('[tunnel] WebSocket server listening at /ws/tunnel');
}

// ── requestInference ───────────────────────────────────────────────────────

/**
 * Request inference from a provider (real or mock).
 * Yields string tokens as they arrive.
 *
 * @param providerId  provider UUID, or 'mock' for direct mock
 * @param messages    OpenAI message array
 * @param model       model name (e.g. "llama3:8b")
 * @param signal      AbortSignal for cancellation
 */
export async function* requestInference(
  providerId: string,
  messages: Message[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const entry = providers.get(providerId);

  if (entry?.isReal && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
    yield* forwardToReal(entry, messages, model, signal);
  } else {
    yield* mockTokenStream(messages, model, signal);
  }
}

// ── Forward to real provider ───────────────────────────────────────────────

async function* forwardToReal(
  entry: ProviderEntry,
  messages: Message[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const requestId = crypto.randomBytes(8).toString('hex');
  const tokenQueue: string[] = [];
  let resolveNext: (() => void) | null = null;
  let done = false;
  let error: Error | null = null;

  const pending: PendingRequest = {
    resolve: () => { done = true; resolveNext?.(); },
    reject: (err) => { error = err; done = true; resolveNext?.(); },
    onToken: (t) => { tokenQueue.push(t); resolveNext?.(); resolveNext = null; },
    onDone: (_i, _o) => { /* could update token counts here */ },
  };

  entry.pendingRequests.set(requestId, pending);
  entry.ws!.send(JSON.stringify({ type: 'request', requestId, messages, model }));

  signal?.addEventListener('abort', () => {
    entry.pendingRequests.delete(requestId);
    done = true;
    resolveNext?.();
  });

  while (true) {
    if (tokenQueue.length > 0) {
      yield tokenQueue.shift()!;
    } else if (done) {
      if (error) throw error;
      break;
    } else {
      await new Promise<void>(r => { resolveNext = r; });
    }
  }
}

// ── Mock token stream generator ────────────────────────────────────────────

const MOCK_REPLIES: Record<string, string[]> = {
  greeting: [
    '你好！我是運行在 GKC 去中心化算力平台上的 AI 助手。',
    '有什麼我可以幫助你的嗎？',
  ],
  gkc: [
    '高科幣（GKC）是基於 XRPL 的 IOU 代幣，',
    '用於在 GKC 算力平台上支付 AI 推論費用。',
    '每次推論依照輸入/輸出 token 數計費，',
    '平台抽取 20% 手續費，其餘 80% 即時結算給 GPU 提供者。',
    '\n\n目前 GKC 在 XRPL Testnet 上發行，',
    'Issuer 地址：`rBeY7pzk4siwXCb6XpVGj9nZ6FcQBdyh79`',
  ],
  xrpl: [
    'XRPL（XRP Ledger）是一個高效能的去中心化帳本。\n\n',
    '**核心特性：**\n',
    '• 共識機制：Ripple Protocol Consensus，無需挖礦\n',
    '• 結算速度：每筆約 3–5 秒\n',
    '• 手續費：每筆僅 0.00001 XRP（約 $0.000006 USD）\n',
    '• IOU 支援：可發行任意自定義代幣（如 GKC）\n',
    '\nGKC 平台利用 XRPL Payment 批量結算推論費用，大幅降低鏈上成本。',
  ],
  code: [
    '以下是計算 GKC 推論費用的 TypeScript 函式：\n\n',
    '```typescript\n',
    'function calcCost(\n',
    '  inputTokens: number,\n',
    '  outputTokens: number,\n',
    '  priceInput: number,  // GKC/1K tokens\n',
    '  priceOutput: number,\n',
    '): number {\n',
    '  return (inputTokens / 1000) * priceInput\n',
    '       + (outputTokens / 1000) * priceOutput;\n',
    '}\n',
    '```\n\n',
    '呼叫範例：`calcCost(45, 128, 0.001, 0.002)` → `0.000301 GKC`',
  ],
  default: [
    '這是來自 GKC Mock Tunnel 的串流回應。\n\n',
    '在生產環境中，此請求會透過 WebSocket 隧道轉發到真實的 GPU 提供者節點，',
    '使用 Ollama 執行推論，並逐 token 串流回傳。\n\n',
    '目前使用 Mock 模式，模擬約 120 tokens/s 的串流速度。',
  ],
};

async function* mockTokenStream(
  messages: Message[],
  _model: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const userMsg = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() ?? '';

  let chunks: string[];
  if (userMsg.includes('hello') || userMsg.includes('hi') || userMsg.includes('你好') || userMsg.includes('嗨')) {
    chunks = MOCK_REPLIES.greeting;
  } else if (userMsg.includes('gkc') || userMsg.includes('高科幣')) {
    chunks = MOCK_REPLIES.gkc;
  } else if (userMsg.includes('xrpl') || userMsg.includes('ripple')) {
    chunks = MOCK_REPLIES.xrpl;
  } else if (userMsg.includes('code') || userMsg.includes('程式') || userMsg.includes('function') || userMsg.includes('函式')) {
    chunks = MOCK_REPLIES.code;
  } else {
    // Generic: stream user's question echoed back + explanation
    chunks = [
      ...MOCK_REPLIES.default,
      `\n\n您的問題是：「${userMsg.slice(0, 80)}${userMsg.length > 80 ? '…' : ''}」`,
    ];
  }

  for (const chunk of chunks) {
    if (signal?.aborted) return;
    // Stream char-by-char within each chunk for realism
    for (let i = 0; i < chunk.length; i++) {
      if (signal?.aborted) return;
      yield chunk[i];
      // Variable delay: punctuation = longer pause, normal chars = fast
      const ch = chunk[i];
      const delay = '。！？\n'.includes(ch) ? 60 : '，、：'.includes(ch) ? 30 : 8;
      await sleep(delay);
    }
    await sleep(20);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
