/**
 * server/services/proxy.ts
 * ─────────────────────────────────────────────────────
 * Proxy inference requests to an external OpenAI-compatible endpoint.
 *
 * The provider runs any OpenAI-compatible server (vLLM, LM Studio,
 * LocalAI, llama.cpp server, etc.) and exposes it publicly.
 * We forward the request and stream tokens back.
 */

export interface ProxyMessage {
  role: string;
  content: string;
}

/**
 * Calls an external OpenAI-compatible /v1/chat/completions endpoint
 * and yields each content token as a string.
 *
 * Usage:
 *   for await (const token of proxyInference(url, secret, messages, model, signal)) {
 *     res.write(`data: ...`)
 *   }
 */
export async function* proxyInference(
  endpointUrl: string,
  endpointSecret: string,
  messages: ProxyMessage[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  // Normalize URL — strip trailing slash
  const base = endpointUrl.replace(/\/$/, '');

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${endpointSecret}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Provider returned ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error('Provider response has no body');
  }

  // Read SSE stream line by line
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          };
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Malformed SSE chunk — skip silently
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Quick health-check: verify the endpoint is reachable and responds to
 * a minimal chat completion request. Returns latency in ms or throws.
 */
export async function pingEndpoint(
  endpointUrl: string,
  endpointSecret: string,
  model: string,
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const base = endpointUrl.replace(/\/$/, '');
  const start = Date.now();

  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${endpointSecret}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      return { ok: false, latencyMs, error: text };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}
