/**
 * server/routes/sessions.ts
 * ─────────────────────────────────────────────────────
 * Inference Session lifecycle: open → accumulate records → settle
 *
 * POST /api/v1/sessions/open          — start a new session (optionally link a Check)
 * POST /api/v1/sessions/:id/settle    — compute Merkle root, cash Check, pay provider
 * GET  /api/v1/sessions/:id/records   — return all leaf records for client-side verification
 * GET  /api/v1/sessions               — list user's sessions
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { settleSession } from '../services/settle.js';

export const sessionsRouter = Router();
sessionsRouter.use(authenticate);

// ── Open Session ──────────────────────────────────────────────────────────

sessionsRouter.post('/open', async (req: Request, res: Response) => {
  const { provider_id, model, check_id } = req.body as {
    provider_id?: string;
    model?: string;
    check_id?: string;   // user_checks.id (our internal ID, not XRPL ID)
  };

  if (!provider_id || !model) {
    res.status(400).json({ error: 'provider_id and model required' });
    return;
  }

  // Validate check if provided
  if (check_id) {
    const chk = await prisma.userCheck.findUnique({
      where: { id: check_id },
      select: { id: true, sendMaxGkc: true, spentGkc: true, userId: true, status: true },
    });

    if (!chk || chk.userId !== req.user!.id || chk.status !== 'active') {
      res.status(400).json({ error: 'Check not found or not active' });
      return;
    }
    const remaining = Number(chk.sendMaxGkc) - Number(chk.spentGkc);
    if (remaining <= 0) {
      res.status(400).json({ error: 'Check exhausted' });
      return;
    }
  }

  const sessionId = `ses-${crypto.randomUUID()}`;
  await prisma.inferenceSession.create({
    data: {
      id: sessionId,
      userId: req.user!.id,
      providerId: provider_id,
      checkId: check_id ?? null,
      model,
    },
  });

  res.json({ session_id: sessionId });
});

// ── Settle Session ────────────────────────────────────────────────────────

sessionsRouter.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const result = await settleSession(req.params.id, req.user!.id);
    if (!result.settled && result.total_cost === 0 && !result.merkle_root) {
      res.status(404).json({ error: 'Session not found or already settled' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('[sessions] settle error:', err);
    res.status(502).json({ error: 'Settlement failed', detail: (err as Error).message });
  }
});

// ── Get Records (for client-side Merkle verification) ────────────────────

sessionsRouter.get('/:id/records', async (req: Request, res: Response) => {
  const session = await prisma.inferenceSession.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      status: true,
      merkleRoot: true,
      txHash: true,
      totalCostGkc: true,
      totalRequests: true,
    },
  });

  if (!session || session.userId !== req.user!.id) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const records = await prisma.sessionRecord.findMany({
    where: { sessionId: session.id },
    orderBy: { seq: 'asc' },
    select: {
      seq: true,
      inputTokens: true,
      outputTokens: true,
      costGkc: true,
      leafHash: true,
      createdAt: true,
    },
  });

  res.json({ session, records });
});

// ── List Sessions ─────────────────────────────────────────────────────────

sessionsRouter.get('/', async (req: Request, res: Response) => {
  const sessions = await prisma.inferenceSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      model: true,
      status: true,
      totalRequests: true,
      totalCostGkc: true,
      merkleRoot: true,
      txHash: true,
      createdAt: true,
      settledAt: true,
      provider: {
        select: { displayName: true },
      },
    },
  });

  res.json({
    sessions: sessions.map(s => ({
      ...s,
      provider_name: s.provider?.displayName ?? null,
      provider: undefined,
    })),
  });
});
