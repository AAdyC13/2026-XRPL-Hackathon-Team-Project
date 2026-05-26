/**
 * server/routes/providers.ts
 * ─────────────────────────────────────────────────────
 * GET  /api/v1/providers/marketplace   — public browsing
 * POST /api/v1/providers               — register as provider (JWT)
 * GET  /api/v1/providers/:id           — get single provider
 */

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { z } from 'zod';
import { pingEndpoint } from '../services/proxy.js';

export const providersRouter = Router();

// ── GET /marketplace ───────────────────────────────────────────────────────

providersRouter.get('/marketplace', async (req, res) => {
  const { model, sort = 'recommended' } = req.query as { model?: string; sort?: string };

  const where: Record<string, unknown> = {
    status: { in: ['online', 'verified'] },
  };

  if (model) {
    // models is a JSON array string, use string_contains for substring match
    where['models'] = { contains: model };
  }

  // Fetch all matching rows; complex scoring sorts are done in-process
  const rows = await prisma.aiProvider.findMany({
    where,
    select: {
      id: true,
      displayName: true,
      gpuType: true,
      vramGb: true,
      models: true,
      priceInputPer1k: true,
      priceOutputPer1k: true,
      tokensPerSec: true,
      firstTokenMs: true,
      uptime30d: true,
      totalRequests: true,
      avgRating: true,
      currentLoad: true,
      maxConcurrent: true,
      status: true,
    },
  });

  type ProviderRow = typeof rows[number];

  // Apply sort in JavaScript (Prisma Decimal fields need Number() conversion)
  const sorted = [...rows].sort((a: ProviderRow, b: ProviderRow) => {
    switch (sort) {
      case 'cheapest':
        return (
          Number(a.priceOutputPer1k) - Number(b.priceOutputPer1k) ||
          Number(a.priceInputPer1k) - Number(b.priceInputPer1k)
        );
      case 'fastest':
        return (Number(b.tokensPerSec) || 0) - (Number(a.tokensPerSec) || 0);
      case 'lowest_latency':
        return (a.firstTokenMs ?? Infinity) - (b.firstTokenMs ?? Infinity);
      case 'recommended':
      default: {
        const score = (r: ProviderRow) =>
          Number(r.priceOutputPer1k) * 0.4 +
          (1.0 / (Number(r.tokensPerSec) || 1)) * 0.3 +
          (1.0 - Number(r.avgRating) / 5.0) * 0.2 +
          (1.0 - Number(r.uptime30d)) * 0.1;
        return score(a) - score(b);
      }
    }
  });

  const providers = sorted.map(r => ({
    id: r.id,
    displayName: r.displayName,
    gpuType: r.gpuType,
    vramGb: r.vramGb,
    models: JSON.parse(r.models) as string[],
    priceInputPer1k: Number(r.priceInputPer1k),
    priceOutputPer1k: Number(r.priceOutputPer1k),
    tokensPerSec: r.tokensPerSec !== null ? Number(r.tokensPerSec) : null,
    firstTokenMs: r.firstTokenMs,
    uptime30d: Number(r.uptime30d),
    totalRequests: r.totalRequests,
    avgRating: Number(r.avgRating),
    currentLoad: r.currentLoad,
    maxConcurrent: r.maxConcurrent,
    status: r.status,
    loadPercent: r.maxConcurrent > 0 ? Math.round((r.currentLoad / r.maxConcurrent) * 100) : 0,
  }));

  res.json({ providers, count: providers.length });
});

// ── POST / — register as provider ─────────────────────────────────────────

const RegisterProviderSchema = z.object({
  displayName: z.string().min(2).max(80),
  gpuType: z.string().min(2).max(40),
  vramGb: z.number().int().min(4).max(1024),
  models: z.array(z.string()).min(1),
  priceInputPer1k: z.number().min(0.001).max(0.05),
  priceOutputPer1k: z.number().min(0.002).max(0.10),
  maxConcurrent: z.number().int().min(1).max(64).optional(),
});

providersRouter.post('/', authenticate, async (req, res) => {
  const parsed = RegisterProviderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;

  const id = crypto.randomUUID();
  // endpoint_token is what the provider agent uses to authenticate the tunnel connection
  const endpointToken = `gkc_ep_${crypto.randomBytes(24).toString('hex')}`;

  await prisma.aiProvider.create({
    data: {
      id,
      ownerId: req.user!.id,
      displayName: d.displayName,
      gpuType: d.gpuType,
      vramGb: d.vramGb,
      models: JSON.stringify(d.models),
      priceInputPer1k: d.priceInputPer1k,
      priceOutputPer1k: d.priceOutputPer1k,
      maxConcurrent: d.maxConcurrent ?? 4,
      endpointToken,
    },
  });

  const agentInstallCmd =
    `curl -sSL https://gkc.edu.tw/install-agent.sh | ` +
    `GKC_TOKEN=${endpointToken} bash`;

  res.status(201).json({
    id,
    endpointToken,
    agentInstallCmd,
    message: 'Provider registered. Run agent on your GPU machine to go online.',
  });
});

// ── GET /:id ───────────────────────────────────────────────────────────────

providersRouter.get('/:id', async (req, res) => {
  const row = await prisma.aiProvider.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      displayName: true,
      gpuType: true,
      vramGb: true,
      models: true,
      priceInputPer1k: true,
      priceOutputPer1k: true,
      tokensPerSec: true,
      firstTokenMs: true,
      uptime30d: true,
      totalRequests: true,
      avgRating: true,
      currentLoad: true,
      maxConcurrent: true,
      status: true,
      createdAt: true,
    },
  });

  if (!row) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  res.json({
    ...row,
    models: JSON.parse(row.models) as string[],
    priceInputPer1k: Number(row.priceInputPer1k),
    priceOutputPer1k: Number(row.priceOutputPer1k),
    tokensPerSec: row.tokensPerSec !== null ? Number(row.tokensPerSec) : null,
    uptime30d: Number(row.uptime30d),
    avgRating: Number(row.avgRating),
  });
});

// ── POST /admin/register — admin shortcut to add a direct-endpoint provider ──
// Allows registering a provider with a known public URL + Bearer token.
// The provider goes straight to 'online' status (no agent needed).
//
// Example:
//   POST /api/v1/providers/admin/register
//   { displayName, gpuType, vramGb, models, endpointUrl, endpointSecret,
//     priceInputPer1k, priceOutputPer1k }

const AdminRegisterSchema = z.object({
  displayName: z.string().min(2).max(80),
  gpuType: z.string().min(2).max(40),
  vramGb: z.number().int().min(1).max(1024),
  models: z.array(z.string()).min(1),
  endpointUrl: z.string().url(),
  endpointSecret: z.string().min(1),
  priceInputPer1k: z.number().min(0).max(1).optional(),
  priceOutputPer1k: z.number().min(0).max(1).optional(),
  maxConcurrent: z.number().int().min(1).max(256).optional(),
  tokensPerSec: z.number().positive().optional(),
  pingOnRegister: z.boolean().optional(),
});

providersRouter.post('/admin/register', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = AdminRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;

  // Optional ping to verify endpoint is reachable
  if (d.pingOnRegister !== false) {
    const ping = await pingEndpoint(d.endpointUrl, d.endpointSecret, d.models[0]);
    if (!ping.ok) {
      res.status(400).json({
        error: `Endpoint unreachable: ${ping.error}`,
        latencyMs: ping.latencyMs,
        hint: 'Set pingOnRegister: false to skip this check.',
      });
      return;
    }
    console.log(`[providers] Ping OK — ${d.endpointUrl} (${ping.latencyMs}ms)`);
  }

  const id = crypto.randomUUID();
  const endpointToken = `gkc_ep_${crypto.randomBytes(24).toString('hex')}`;

  await prisma.aiProvider.create({
    data: {
      id,
      ownerId: req.user!.id,
      displayName: d.displayName,
      gpuType: d.gpuType,
      vramGb: d.vramGb,
      models: JSON.stringify(d.models),
      priceInputPer1k: d.priceInputPer1k ?? 0.001,
      priceOutputPer1k: d.priceOutputPer1k ?? 0.002,
      maxConcurrent: d.maxConcurrent ?? 4,
      endpointToken,
      endpointUrl: d.endpointUrl,
      endpointSecret: d.endpointSecret,
      tokensPerSec: d.tokensPerSec ?? null,
      status: 'online',
      uptime30d: 1.0,
      verifiedAt: new Date(),
    },
  });

  res.status(201).json({
    id,
    status: 'online',
    displayName: d.displayName,
    models: d.models,
    endpointUrl: d.endpointUrl,
    message: 'Provider registered and online.',
  });
});

// ── POST /admin/:id/ping — test a registered provider's endpoint ───────────

providersRouter.post('/admin/:id/ping', authenticate, requireRole('admin'), async (req, res) => {
  const row = await prisma.aiProvider.findUnique({
    where: { id: req.params.id },
    select: { endpointUrl: true, endpointSecret: true, models: true },
  });

  if (!row) { res.status(404).json({ error: 'Provider not found' }); return; }
  if (!row.endpointUrl || !row.endpointSecret) {
    res.status(400).json({ error: 'Provider has no direct endpoint configured (uses agent tunnel)' });
    return;
  }

  const models = JSON.parse(row.models) as string[];
  const ping = await pingEndpoint(row.endpointUrl, row.endpointSecret, models[0]);
  res.json(ping);
});

// ── PATCH /admin/:id/status — set provider status (admin only) ─────────────

providersRouter.patch('/admin/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  const { status } = req.body as { status?: string };
  const allowed = ['online', 'offline', 'verified', 'suspended', 'pending_validation'];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    return;
  }
  await prisma.aiProvider.update({
    where: { id: req.params.id },
    data: { status, updatedAt: new Date() },
  });
  res.json({ ok: true, id: req.params.id, status });
});
