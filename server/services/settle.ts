/**
 * server/services/settle.ts
 * ─────────────────────────────────────────────────────
 * Core settlement logic — shared by:
 *   • sessions router (user-triggered via POST /sessions/:id/settle)
 *   • authenticate middleware (stale-session auto-settle safeguard)
 */

import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { buildMerkleRoot } from './merkle.js';
import { cashCheck, sendGkc } from './xrpl.js';

export interface SettleResult {
  settled: boolean;
  total_cost: number;
  merkle_root: string | null;
  tx_hash: string | null;
}

/**
 * Settle a single inference session:
 *  1. Build Merkle root from all leaf hashes
 *  2. Cash the XRPL Check (if one is linked), or deduct custodial balance
 *  3. Pay the provider their share
 *  4. Mark session as settled
 *
 * Safe to call multiple times: no-ops if session is not 'open'.
 */
export async function settleSession(sessionId: string, userId: string): Promise<SettleResult> {
  // Fetch session with related check and provider (including provider owner for xrpAddress)
  const session = await prisma.inferenceSession.findUnique({
    where: { id: sessionId },
    include: {
      check: {
        select: {
          id: true,
          xummUuid: true,
          xrplCheckId: true,
          sendMaxGkc: true,
          spentGkc: true,
          status: true,
        },
      },
      provider: {
        select: {
          id: true,
          platformFeeRate: true,
          ownerId: true,
        },
      },
    },
  });

  if (!session || session.userId !== userId || session.status !== 'open') {
    return { settled: false, total_cost: 0, merkle_root: null, tx_hash: null };
  }

  // Pull all leaf hashes
  const records = await prisma.sessionRecord.findMany({
    where: { sessionId },
    orderBy: { seq: 'asc' },
    select: { leafHash: true },
  });

  if (records.length === 0) {
    await prisma.inferenceSession.update({
      where: { id: sessionId },
      data: { status: 'settled', settledAt: new Date() },
    });
    return { settled: true, total_cost: 0, merkle_root: null, tx_hash: null };
  }

  const merkleRoot = buildMerkleRoot(records.map(r => r.leafHash));
  const totalCost = Number(session.totalCostGkc);

  // Lock row to prevent double-settlement
  await prisma.inferenceSession.update({
    where: { id: sessionId, status: 'open' },
    data: { status: 'settling', merkleRoot },
  });

  let txHash: string | null = null;

  try {
    // ── 1. Payment ──────────────────────────────────────────────────────
    if (session.check?.xrplCheckId && totalCost > 0) {
      txHash = await cashCheck(session.check.xrplCheckId, totalCost, {
        session_id: sessionId,
        provider_id: session.providerId,
        model: session.model,
        requests: session.totalRequests,
        input_tokens: session.totalInputTok,
        output_tokens: session.totalOutputTok,
        merkle_root: merkleRoot,
        settled_at: new Date().toISOString(),
      });

      // Increment spent amount on the check
      const updatedCheck = await prisma.userCheck.update({
        where: { id: session.check.id },
        data: { spentGkc: { increment: totalCost } },
        select: { sendMaxGkc: true, spentGkc: true },
      });

      if (Number(updatedCheck.spentGkc) >= Number(updatedCheck.sendMaxGkc)) {
        await prisma.userCheck.update({
          where: { id: session.check.id },
          data: { status: 'exhausted' },
        });
      }
    }

    // ── 2. Provider payout ───────────────────────────────────────────────
    if (session.provider && totalCost > 0) {
      // Fetch provider owner's xrpAddress (AiProvider has no xrpAddress in schema)
      const providerOwner = await prisma.user.findUnique({
        where: { id: session.provider.ownerId },
        select: { xrpAddress: true },
      });

      if (providerOwner?.xrpAddress) {
        const providerShare = totalCost * (1 - Number(session.provider.platformFeeRate ?? 0.2));
        await sendGkc(
          providerOwner.xrpAddress,
          providerShare,
          JSON.stringify({ type: 'provider_payout', session_id: sessionId, requests: session.totalRequests }),
        );
      }
    }

    // ── 3. Finalise ──────────────────────────────────────────────────────
    await prisma.inferenceSession.update({
      where: { id: sessionId },
      data: { status: 'settled', settledAt: new Date(), txHash },
    });

    // ── 4. Write to user transaction history ─────────────────────────────
    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.userId,
        type: 'inference',
        amountGkc: totalCost,
        referenceId: sessionId,
        txHash,
        description: `AI 推論結算 — ${session.totalRequests} 次請求 (${session.model})`,
      },
    });

    return { settled: true, total_cost: totalCost, merkle_root: merkleRoot, tx_hash: txHash };
  } catch (err) {
    await prisma.inferenceSession.update({
      where: { id: sessionId },
      data: { status: 'failed' },
    });
    throw err;
  }
}

/**
 * Find and asynchronously settle all open sessions for a user
 * that have had no activity for more than `thresholdHours` hours.
 *
 * Non-blocking: returns immediately, errors are only logged.
 * Called from authenticate middleware as a background safeguard.
 */
export function sweepStaleSessions(userId: string, thresholdHours = 24): void {
  const thirtyMinAgo = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  // Fire-and-forget — do not await, do not block the request
  void (async () => {
    const stale = await prisma.inferenceSession.findMany({
      where: {
        userId,
        status: 'open',
        updatedAt: { lt: thirtyMinAgo },
      },
      select: { id: true },
    });

    for (const { id } of stale) {
      try {
        const result = await settleSession(id, userId);
        console.log(`[settle:sweep] Auto-settled stale session ${id} — cost=${result.total_cost} tx=${result.tx_hash ?? 'none'}`);
      } catch (err) {
        console.error(`[settle:sweep] Failed to auto-settle session ${id}:`, err);
      }
    }
  })();
}
