/**
 * Admin treasury API — Issuer → Warm → Platform → third party.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import {
  getTreasuryConfigStatus,
  getTreasuryBalances,
  issueFromIssuerToWarm,
  transferWarmToPlatform,
  transferPlatformToThirdParty,
  txExplorerUrl,
} from '../services/treasury.js';

export const treasuryRouter = Router();

treasuryRouter.use(authenticate);
treasuryRouter.use(requireRole('admin'));

treasuryRouter.get('/status', async (_req, res) => {
  try {
    const config = getTreasuryConfigStatus();
    const balances = await getTreasuryBalances();
    res.json({ config, balances, explorerBase: process.env.XRPL_EXPLORER ?? 'https://testnet.xrpl.org' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

const AmountSchema = z.object({
  amountGkc: z.number().positive(),
});

const PayoutSchema = z.object({
  amountGkc: z.number().positive(),
  toAddress: z.string().min(25).max(60),
  memo: z.string().max(200).optional(),
});

treasuryRouter.post('/issuer-to-warm', async (req, res) => {
  const parsed = AmountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  try {
    const txHash = await issueFromIssuerToWarm(parsed.data.amountGkc);
    res.json({ txHash, explorerUrl: txExplorerUrl(txHash) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

treasuryRouter.post('/warm-to-platform', async (req, res) => {
  const parsed = AmountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  try {
    const txHash = await transferWarmToPlatform(parsed.data.amountGkc);
    res.json({ txHash, explorerUrl: txExplorerUrl(txHash) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

treasuryRouter.post('/platform-payout', async (req, res) => {
  const parsed = PayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  try {
    const { amountGkc, toAddress, memo } = parsed.data;
    const txHash = await transferPlatformToThirdParty(toAddress, amountGkc, memo);
    res.json({ txHash, explorerUrl: txExplorerUrl(txHash) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});
