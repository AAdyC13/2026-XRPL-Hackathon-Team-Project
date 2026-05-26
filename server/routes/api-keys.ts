/**
 * server/routes/api-keys.ts
 * ─────────────────────────────────────────────────────
 * GET    /api/v1/api-keys      — list user's API keys
 * POST   /api/v1/api-keys      — create new key
 * DELETE /api/v1/api-keys/:id  — revoke key
 */

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';

export const apiKeysRouter = Router();

// All routes require JWT (not API key, for security)
apiKeysRouter.use(authenticate);

// ── GET / ──────────────────────────────────────────────────────────────────

apiKeysRouter.get('/', async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      dailyLimitGkc: true,
      spentTodayGkc: true,
      totalSpentGkc: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ keys });
});

// ── POST / ─────────────────────────────────────────────────────────────────

const CreateKeySchema = z.object({
  name: z.string().max(80).optional(),
  dailyLimitGkc: z.number().positive().optional(),
});

apiKeysRouter.post('/', async (req, res) => {
  const parsed = CreateKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { name, dailyLimitGkc } = parsed.data;

  // Generate raw key — only shown ONCE
  const rawKey = `gkc_sk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 14); // "gkc_sk_" + 7 chars
  const id = crypto.randomUUID();

  await prisma.apiKey.create({
    data: {
      id,
      userId: req.user!.id,
      keyHash,
      keyPrefix,
      name: name ?? null,
      dailyLimitGkc: dailyLimitGkc ?? null,
    },
  });

  res.status(201).json({
    id,
    key: rawKey, // shown once — user must copy it now
    keyPrefix,
    name,
    dailyLimitGkc: dailyLimitGkc ?? null,
    message: 'Save this key now — it will not be shown again.',
  });
});

// ── DELETE /:id ────────────────────────────────────────────────────────────

apiKeysRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.apiKey.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
      revokedAt: null,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Key not found or already revoked' });
    return;
  }

  await prisma.apiKey.update({
    where: { id: req.params.id },
    data: { revokedAt: new Date() },
  });

  res.json({ success: true });
});
