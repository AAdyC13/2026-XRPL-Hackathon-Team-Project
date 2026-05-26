/**
 * server/routes/openai.ts
 * ─────────────────────────────────────────────────────
 * POST /v1/chat/completions
 *
 * OpenAI-compatible endpoint. Accepts:
 *   Authorization: Bearer gkc_sk_...  (API key)
 *   Authorization: Bearer <jwt>       (JWT session)
 *
 * model format:
 *   "<provider-uuid>/<model-name>"  — route to specific provider
 *   "cheapest/<model-name>"         — cheapest provider with that model
 *   "fastest/<model-name>"          — fastest tokens/sec
 *   "lowest_latency/<model-name>"   — lowest first-token latency
 *   "recommended/<model-name>"      — composite score (default)
 *
 * Currently uses MOCK streaming. Real tunnel forwarding comes in Week 2.
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requestInference } from '../services/mock-tunnel.js';
import { proxyInference } from '../services/proxy.js';
import { computeLeafHash } from '../services/merkle.js';

export const openaiRouter = Router();

openaiRouter.post('/chat/completions', authenticate, async (req: Request, res: Response) => {
  const { model = 'recommended/llama3:8b', messages, stream = false } = req.body as {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    stream?: boolean;
  };

  if (!messages?.length) {
    res.status(400).json({ error: { message: 'messages array is required', type: 'invalid_request_error' } });
    return;
  }

  // ── Resolve provider ───────────────────────────────────────────────────

  const [routingOrId, modelName = 'llama3:8b'] = model.split('/');
  const strategies = ['cheapest', 'fastest', 'lowest_latency', 'recommended'];

  let provider: {
    id: string;
    displayName: string;
    priceInputPer1k: number;
    priceOutputPer1k: number;
    endpointUrl: string | null;
    endpointSecret: string | null;
  } | null = null;

  if (strategies.includes(routingOrId)) {
    const orderMap: Record<string, { field: string; dir: 'asc' | 'desc' }> = {
      cheapest: { field: 'priceOutputPer1k', dir: 'asc' },
      fastest: { field: 'tokensPer1k', dir: 'desc' },
      lowest_latency: { field: 'firstTokenMs', dir: 'asc' },
      recommended: { field: 'priceOutputPer1k', dir: 'asc' }, // simplified composite
    };
    const order = orderMap[routingOrId];
    provider = await prisma.aiProvider.findFirst({
      where: {
        status: { in: ['online', 'verified'] },
        models: { contains: modelName },
      },
      orderBy: { [order.field]: order.dir },
      select: {
        id: true,
        displayName: true,
        priceInputPer1k: true,
        priceOutputPer1k: true,
        endpointUrl: true,
        endpointSecret: true,
      },
    });
  } else {
    // Treat as provider UUID
    provider = await prisma.aiProvider.findFirst({
      where: {
        id: routingOrId,
        status: { in: ['online', 'verified'] },
      },
      select: {
        id: true,
        displayName: true,
        priceInputPer1k: true,
        priceOutputPer1k: true,
        endpointUrl: true,
        endpointSecret: true,
      },
    });
  }

  // Fall through to mock if no real provider found (dev mode)
  const usingMock = !provider;
  const hasRealEndpoint = !!(provider?.endpointUrl && provider?.endpointSecret);
  const effectiveProvider = provider ?? {
    id: 'mock',
    displayName: 'Mock Provider (dev)',
    priceInputPer1k: 0.001,
    priceOutputPer1k: 0.002,
    endpointUrl: null,
    endpointSecret: null,
  };

  const completionId = `chatcmpl-${crypto.randomBytes(12).toString('hex')}`;
  const nowSec = Math.floor(Date.now() / 1000);

  // ── Streaming SSE via tunnel ───────────────────────────────────────────

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const abortController = new AbortController();
    // Listen on res (not req) — req 'close' fires as soon as the body is consumed by express.json()
    // which would abort the proxy fetch immediately. res 'close' fires only if the client actually
    // disconnects before the response is fully sent.
    res.on('close', () => {
      if (!res.writableEnded) abortController.abort();
    });

    let fullContent = '';

    try {
      // Use real HTTP proxy if provider has a direct endpoint; else fall back to mock tunnel
      const tokenStream = hasRealEndpoint
        ? proxyInference(
            effectiveProvider.endpointUrl!,
            effectiveProvider.endpointSecret!,
            messages,
            modelName,
            abortController.signal,
          )
        : requestInference(
            effectiveProvider.id,
            messages,
            modelName,
            abortController.signal,
          );

      for await (const token of tokenStream) {
        if (abortController.signal.aborted) break;
        fullContent += token;
        const chunk = {
          id: completionId,
          object: 'chat.completion.chunk',
          created: nowSec,
          model: `${effectiveProvider.id}/${modelName}`,
          choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (_err) {
      // Client disconnected or provider error — end gracefully
    }

    // Recalculate token counts from actual output
    const inputTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
    const finalOutputTokens = Math.ceil(fullContent.length / 4);
    const costGkc =
      (inputTokens / 1000) * Number(effectiveProvider.priceInputPer1k) +
      (finalOutputTokens / 1000) * Number(effectiveProvider.priceOutputPer1k);

    // Persist after streaming completes (only for real providers)
    if (!usingMock && !abortController.signal.aborted) {
      await prisma.inferenceRecord.create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user!.id,
          providerId: effectiveProvider.id,
          apiKeyId: req.user!.apiKeyId ?? null,
          model: modelName,
          inputTokens,
          outputTokens: finalOutputTokens,
          costGkc,
          providerRevenue: costGkc * 0.8,
          platformRevenue: costGkc * 0.2,
          channelId: null,
        },
      });

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { gkcBalance: { decrement: costGkc } },
      });

      // ── Session record (Merkle leaf) ───────────────────────────────────
      const sessionId = (req.headers['x-session-id'] as string | undefined)?.trim();
      if (sessionId) {
        const sess = await prisma.inferenceSession.findFirst({
          where: { id: sessionId, userId: req.user!.id, status: 'open' },
          select: { id: true, totalRequests: true, checkId: true },
        });

        if (sess) {
          const seq = sess.totalRequests + 1;
          const createdAt = new Date().toISOString();
          const leafHash = computeLeafHash(sessionId, seq, inputTokens, finalOutputTokens, costGkc, createdAt);
          const leafId = crypto.randomUUID();

          await prisma.sessionRecord.create({
            data: {
              id: leafId,
              sessionId,
              seq,
              inputTokens,
              outputTokens: finalOutputTokens,
              costGkc,
              leafHash,
              createdAt: new Date(createdAt),
            },
          });

          await prisma.inferenceSession.update({
            where: { id: sessionId },
            data: {
              totalRequests: { increment: 1 },
              totalInputTok: { increment: inputTokens },
              totalOutputTok: { increment: finalOutputTokens },
              totalCostGkc: { increment: costGkc },
            },
          });

          // Guard: stop service if session cost is approaching check limit
          if (sess.checkId) {
            const userCheck = await prisma.userCheck.findUnique({
              where: { id: sess.checkId },
              select: { sendMaxGkc: true, spentGkc: true },
            });
            const updatedSess = await prisma.inferenceSession.findUnique({
              where: { id: sessionId },
              select: { totalCostGkc: true },
            });
            if (userCheck && updatedSess) {
              const remaining =
                Number(userCheck.sendMaxGkc) -
                (Number(userCheck.spentGkc) + Number(updatedSess.totalCostGkc));
              if (remaining < 0) {
                // Mark session as over-limit (soft — actual enforcement is at CheckCash)
                await prisma.inferenceSession.update({
                  where: { id: sessionId },
                  data: { status: 'open' },
                });
              }
            }
          }
        }
      }
    }

    // Send stop chunk + cost meta event (cannot setHeader after res.write)
    const doneChunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created: nowSec,
      model: `${effectiveProvider.id}/${modelName}`,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    };
    res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);

    // Send billing info as a named SSE event (readable by client via EventSource or fetch SSE)
    const metaEvent = {
      input_tokens: inputTokens,
      output_tokens: finalOutputTokens,
      cost_gkc: parseFloat(costGkc.toFixed(6)),
      provider: effectiveProvider.displayName,
    };
    res.write(`event: gkc_meta\ndata: ${JSON.stringify(metaEvent)}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // ── Non-streaming (collect all tokens first) ───────────────────────────

  let fullContent = '';
  try {
    const tokenStream = hasRealEndpoint
      ? proxyInference(effectiveProvider.endpointUrl!, effectiveProvider.endpointSecret!, messages, modelName)
      : requestInference(effectiveProvider.id, messages, modelName);
    for await (const token of tokenStream) {
      fullContent += token;
    }
  } catch (_err) {
    res.status(502).json({ error: { message: 'Provider error', type: 'provider_error' } });
    return;
  }

  const inputTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
  const outputTokens = Math.ceil(fullContent.length / 4);
  const costGkc =
    (inputTokens / 1000) * Number(effectiveProvider.priceInputPer1k) +
    (outputTokens / 1000) * Number(effectiveProvider.priceOutputPer1k);

  if (!usingMock) {
    await prisma.inferenceRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.user!.id,
        providerId: effectiveProvider.id,
        apiKeyId: req.user!.apiKeyId ?? null,
        model: modelName,
        inputTokens,
        outputTokens,
        costGkc,
        providerRevenue: costGkc * 0.8,
        platformRevenue: costGkc * 0.2,
      },
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { gkcBalance: { decrement: costGkc } },
    });

    // ── Session record (Merkle leaf) ─────────────────────────────────────
    const sessionId = (req.headers['x-session-id'] as string | undefined)?.trim();
    if (sessionId) {
      const sess = await prisma.inferenceSession.findFirst({
        where: { id: sessionId, userId: req.user!.id, status: 'open' },
        select: { id: true, totalRequests: true },
      });

      if (sess) {
        const seq = sess.totalRequests + 1;
        const createdAt = new Date().toISOString();
        const leafHash = computeLeafHash(sessionId, seq, inputTokens, outputTokens, costGkc, createdAt);
        const leafId = crypto.randomUUID();

        await prisma.sessionRecord.create({
          data: {
            id: leafId,
            sessionId,
            seq,
            inputTokens,
            outputTokens,
            costGkc,
            leafHash,
            createdAt: new Date(createdAt),
          },
        });

        await prisma.inferenceSession.update({
          where: { id: sessionId },
          data: {
            totalRequests: { increment: 1 },
            totalInputTok: { increment: inputTokens },
            totalOutputTok: { increment: outputTokens },
            totalCostGkc: { increment: costGkc },
          },
        });
      }
    }
  }

  res.setHeader('X-GKC-Input-Tokens', String(inputTokens));
  res.setHeader('X-GKC-Output-Tokens', String(outputTokens));
  res.setHeader('X-GKC-Cost', costGkc.toFixed(6));
  res.setHeader('X-GKC-Provider', encodeURIComponent(effectiveProvider.displayName));

  res.json({
    id: completionId,
    object: 'chat.completion',
    created: nowSec,
    model: `${effectiveProvider.id}/${modelName}`,
    choices: [{ index: 0, message: { role: 'assistant', content: fullContent }, finish_reason: 'stop' }],
    usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
  });
});
