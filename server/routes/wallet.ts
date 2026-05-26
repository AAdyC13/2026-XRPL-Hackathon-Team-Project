/**
 * server/routes/wallet.ts
 * ─────────────────────────────────────────────────────
 * GET    /api/v1/wallet/trustline-tx         — build unsigned TrustSet tx for user to sign
 * POST   /api/v1/wallet/topup                — admin credits GKC to user (after off-chain payment)
 * GET    /api/v1/wallet/balance              — on-chain GKC balance for user's XRP address
 * GET    /api/v1/wallet/transactions         — user's DB transaction history
 * POST   /api/v1/wallet/bind/initiate        — initiate Xaman wallet binding (QR / deeplink)
 * GET    /api/v1/wallet/bind/poll/:uuid      — poll Xaman payload, link XRP address on sign
 * DELETE /api/v1/wallet/bind                 — unbind wallet (requires zero on-chain balance)
 * POST   /api/v1/wallet/trustline/approve    — server-side issuer trustline authorization
 */

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import {
  buildTrustSetTx,
  topupUserGkc,
  getGkcBalance,
  ensureTrustLine,
  sendGkc,
  createCheckFromIssuer,
  freezeTrustLine,
  issuerAuthorizeTrustLine,
} from '../services/xrpl.js';
import {
  createTrustLinePayload,
  createDepositPayload,
  createCheckPayload,
  getPayloadStatus,
  isXummConfigured,
  createWalletBindPayload,
} from '../services/xumm.js';
import { z } from 'zod';

export const walletRouter = Router();

walletRouter.use(authenticate);

// ── GET /trustline-tx ──────────────────────────────────────────────────────
// Returns the unsigned TrustSet transaction JSON.
// The frontend submits this to XUMM or signs with xrpl.js in-browser.

walletRouter.get('/trustline-tx', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xrpAddress: true },
  });

  if (!user?.xrpAddress) {
    res.status(400).json({ error: 'No XRP address linked to your account' });
    return;
  }

  const tx = buildTrustSetTx(user.xrpAddress);

  res.json({
    tx,
    instructions: [
      '1. Sign this transaction with your XRP wallet (XUMM or xrpl.js)',
      '2. Submit to XRPL Testnet: wss://s.altnet.rippletest.net:51233',
      '3. Once confirmed, you can receive GKC top-ups',
    ],
    xrplNetwork: process.env.XRPL_WSS,
  });
});

// ── POST /topup ─────────────────────────────────────────────────────────────
// Admin-only: credit GKC to a user after confirming off-chain payment.

const TopupSchema = z.object({
  userId: z.string(),
  amountGkc: z.number().positive(),
});

walletRouter.post('/topup', requireRole('admin'), async (req, res) => {
  const parsed = TopupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { userId, amountGkc } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, xrpAddress: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (!user.xrpAddress) {
    res.status(400).json({ error: 'User has no XRP address — cannot send on-chain GKC' });
    return;
  }

  try {
    const txHash = await topupUserGkc(user.xrpAddress, amountGkc, user.id);
    res.json({
      txHash,
      amountGkc,
      explorerUrl: `${process.env.XRPL_EXPLORER ?? 'https://testnet.xrpl.org'}/transactions/${txHash}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// ── GET /balance ───────────────────────────────────────────────────────────
// Returns both on-chain XRPL balance and off-chain DB balance.
// They should match after each settled batch; discrepancy = pending spending.

walletRouter.get('/balance', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xrpAddress: true, gkcBalance: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const dbBalance = Number(user.gkcBalance);

  let onChainGkc: number | null = null;
  let hasTrustLine = false;
  if (user.xrpAddress) {
    try {
      [onChainGkc, hasTrustLine] = await Promise.all([
        getGkcBalance(user.xrpAddress),
        ensureTrustLine(user.xrpAddress),
      ]);
    } catch {
      // XRPL unreachable — still return DB balance
    }
  }

  res.json({
    dbBalance,
    onChainBalance: onChainGkc,
    pendingSettlement: onChainGkc !== null ? onChainGkc - dbBalance : null,
    xrpAddress: user.xrpAddress,
    hasTrustLine,
  });
});

// ── POST /link-address ────────────────────────────────────────────────────
// User links (or updates) their XRP address.

const LinkAddressSchema = z.object({
  xrpAddress: z.string().min(25).max(60),
});

walletRouter.post('/link-address', async (req, res) => {
  const parsed = LinkAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid XRP address' });
    return;
  }
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { xrpAddress: parsed.data.xrpAddress },
  });
  res.json({ ok: true, xrpAddress: parsed.data.xrpAddress });
});

// ── POST /bind/initiate ────────────────────────────────────────────────────
// Initiates Xaman wallet binding — creates a SignIn payload for user to scan.
// Returns QR PNG and deeplink.

walletRouter.post('/bind/initiate', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定，請聯繫管理員（需設定 XUMM_API_KEY / XUMM_API_SECRET）' });
    return;
  }

  try {
    const payload = await createWalletBindPayload();
    res.json(payload);
  } catch (err) {
    res.status(503).json({ error: 'XUMM 服務暫時不可用', details: (err as Error).message });
  }
});

// ── GET /bind/poll/:uuid ───────────────────────────────────────────────────
// Polls Xaman payload for a signed XRP address and links it to the user.
// Ensures the address is not already taken by another user.

walletRouter.get('/bind/poll/:uuid', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定' });
    return;
  }

  try {
    const status = await getPayloadStatus(req.params.uuid);

    if (status.signed && status.account) {
      // Check if the address is already bound to a different user
      const existing = await prisma.user.findFirst({
        where: { xrpAddress: status.account },
        select: { id: true },
      });

      if (existing && existing.id !== req.user!.id) {
        res.status(409).json({ error: 'This XRP address is already linked to another account' });
        return;
      }

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { xrpAddress: status.account },
      });

      res.json({ ...status, linked: true, xrpAddress: status.account });
      return;
    }

    res.json({ ...status, linked: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── DELETE /bind ───────────────────────────────────────────────────────────
// Unbind wallet. Requires on-chain GKC balance = 0. Freezes the trustline,
// then sets xrpAddress to null.

walletRouter.delete('/bind', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xrpAddress: true },
  });

  if (!user?.xrpAddress) {
    res.status(400).json({ error: 'No XRP address is currently bound' });
    return;
  }

  try {
    const onChainBalance = await getGkcBalance(user.xrpAddress);
    if (onChainBalance !== 0) {
      res.status(400).json({
        error: `Cannot unbind: on-chain GKC balance is ${onChainBalance}. Must be 0 before unbinding.`,
      });
      return;
    }

    await freezeTrustLine(user.xrpAddress);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { xrpAddress: null },
    });

    res.json({ ok: true, message: 'Wallet unbound and trustline frozen' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /trustline/approve ────────────────────────────────────────────────
// Server calls issuerAuthorizeTrustLine on behalf of user.
// Verifies user has a trustline before authorizing.

walletRouter.post('/trustline/approve', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xrpAddress: true },
  });

  if (!user?.xrpAddress) {
    res.status(400).json({ error: 'No XRP address linked to your account' });
    return;
  }

  try {
    const hasTrustLine = await ensureTrustLine(user.xrpAddress);
    if (!hasTrustLine) {
      res.status(400).json({ error: 'User has no GKC trustline. Sign a TrustSet transaction first.' });
      return;
    }

    await issuerAuthorizeTrustLine(user.xrpAddress);
    res.json({ ok: true, message: 'Trustline authorized by issuer', xrpAddress: user.xrpAddress });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /xumm/trustline ───────────────────────────────────────────────────
// Creates a XUMM payload for user to sign the TrustSet tx in their XUMM app.

walletRouter.post('/xumm/trustline', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定，請聯繫管理員（需設定 XUMM_API_KEY / XUMM_API_SECRET）' });
    return;
  }

  try {
    const payload = await createTrustLinePayload();
    res.json(payload);
  } catch (err) {
    res.status(503).json({ error: 'XUMM 服務暫時不可用', details: (err as Error).message });
  }
});

// ── GET /xumm/status/:uuid ─────────────────────────────────────────────────
// Poll XUMM payload status. On first sign, auto-sends 100 GKC welcome bonus.

walletRouter.get('/xumm/status/:uuid', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定' });
    return;
  }

  try {
    const status = await getPayloadStatus(req.params.uuid);

    // Auto welcome bonus — runs async, does not block response
    if (status.signed && status.account) {
      // Update user's xrpAddress if not already set to this address
      await prisma.user.updateMany({
        where: {
          id: req.user!.id,
          OR: [{ xrpAddress: null }, { NOT: { xrpAddress: status.account } }],
        },
        data: { xrpAddress: status.account },
      });

      const user = await prisma.user.findFirst({
        where: { xrpAddress: status.account },
        select: { id: true, gkcBalance: true },
      });

      if (user) {
        const alreadySent = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            description: { contains: '歡迎獎勵' },
          },
        });

        if (!alreadySent) {
          sendGkc(status.account, 100, 'GKC_WELCOME')
            .then(async txHash => {
              const updated = await prisma.user.update({
                where: { id: user.id },
                data: { gkcBalance: { increment: 100 } },
                select: { gkcBalance: true },
              });
              await prisma.transaction.create({
                data: {
                  id: crypto.randomUUID(),
                  userId: user.id,
                  type: 'topup',
                  amountGkc: 100,
                  balanceAfter: Number(updated.gkcBalance),
                  txHash,
                  description: '新用戶歡迎獎勵 GKC × 100',
                },
              });
              console.log(`[wallet] Welcome bonus sent → ${status.account} tx=${txHash}`);
            })
            .catch(e => console.error('[wallet] Welcome bonus failed:', e));
        }
      }
    }

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /transactions ──────────────────────────────────────────────────────

walletRouter.get('/transactions', async (req, res) => {
  const { limit = '20', offset = '0' } = req.query as { limit?: string; offset?: string };
  const take = Number(limit);
  const skip = Number(offset);

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        type: true,
        amountGkc: true,
        balanceAfter: true,
        referenceId: true,
        txHash: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where: { userId: req.user!.id } }),
  ]);

  res.json({ transactions: rows, total, limit: take, offset: skip });
});

// ── POST /deposit/xumm ─────────────────────────────────────────────────────
// Creates a XUMM Payment payload: user sends XRP → platform credits GKC.

const DepositSchema = z.object({
  gkcAmount: z.number().positive().min(10).max(1_000_000),
});

walletRouter.post('/deposit/xumm', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定，請聯繫管理員' });
    return;
  }

  const parsed = DepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '充值金額無效（最少 10 GKC）', details: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xrpAddress: true },
  });

  if (!user?.xrpAddress) {
    res.status(400).json({ error: '請先綁定 XRP 地址才能充值' });
    return;
  }

  const GKC_PER_XRP = parseFloat(process.env.GKC_PER_XRP ?? '10');
  const { gkcAmount } = parsed.data;
  const xrpAmount = parseFloat((gkcAmount / GKC_PER_XRP).toFixed(6));

  // Random 8-digit destination tag to identify this deposit
  const destTag = Math.floor(10_000_000 + Math.random() * 89_999_999);

  try {
    const payload = await createDepositPayload(user.xrpAddress, xrpAmount, destTag);

    await prisma.deposit.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.user!.id,
        xummUuid: payload.uuid,
        destTag,
        xrpAmount,
        gkcAmount,
      },
    });

    res.json({ ...payload, xrpAmount, gkcAmount, rate: GKC_PER_XRP });
  } catch (err) {
    res.status(503).json({ error: 'XUMM 服務暫時不可用', details: (err as Error).message });
  }
});

// ── GET /deposit/status/:uuid ──────────────────────────────────────────────
// Poll deposit XUMM status. On sign, credit GKC to user and record transaction.

walletRouter.get('/deposit/status/:uuid', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定' });
    return;
  }

  const deposit = await prisma.deposit.findFirst({
    where: { xummUuid: req.params.uuid, userId: req.user!.id },
  });

  if (!deposit) {
    res.status(404).json({ error: 'Deposit not found' });
    return;
  }

  // Already processed — return cached result
  if (deposit.status === 'completed') {
    res.json({ status: 'completed', gkcCredited: Number(deposit.gkcAmount), txHash: deposit.txHash });
    return;
  }
  if (deposit.status === 'cancelled' || deposit.status === 'expired') {
    res.json({ status: deposit.status });
    return;
  }

  try {
    const xummStatus = await getPayloadStatus(req.params.uuid);

    if (xummStatus.signed && xummStatus.txid) {
      // Credit GKC and record transaction
      const updated = await prisma.user.update({
        where: { id: deposit.userId },
        data: { gkcBalance: { increment: Number(deposit.gkcAmount) } },
        select: { gkcBalance: true },
      });

      await prisma.transaction.create({
        data: {
          id: crypto.randomUUID(),
          userId: deposit.userId,
          type: 'topup',
          amountGkc: Number(deposit.gkcAmount),
          balanceAfter: Number(updated.gkcBalance),
          txHash: xummStatus.txid,
          description: `充值 ${Number(deposit.gkcAmount)} GKC（${Number(deposit.xrpAmount)} XRP，匯率 1:${process.env.GKC_PER_XRP ?? '10'}）`,
        },
      });

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: 'completed', txHash: xummStatus.txid },
      });

      console.log(`[wallet] Deposit completed: +${Number(deposit.gkcAmount)} GKC → user ${deposit.userId} tx=${xummStatus.txid}`);
      res.json({ status: 'completed', gkcCredited: Number(deposit.gkcAmount), txHash: xummStatus.txid });
      return;
    }

    if (xummStatus.cancelled || xummStatus.expired) {
      const newStatus = xummStatus.cancelled ? 'cancelled' : 'expired';
      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: newStatus },
      });
      res.json({ status: newStatus });
      return;
    }

    res.json({ status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /check/create ─────────────────────────────────────────────────────
// Create a Xaman CheckCreate payload.  The user scans and signs it;
// the XRPL Check object authorises the platform to deduct up to sendMaxGkc.

walletRouter.post('/check/create', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定' });
    return;
  }

  const sendMaxGkc = Number(req.body.send_max_gkc);
  const expireDays = Number(req.body.expire_days ?? 30);

  if (!sendMaxGkc || sendMaxGkc <= 0) {
    res.status(400).json({ error: 'send_max_gkc must be a positive number' });
    return;
  }
  if (expireDays < 1 || expireDays > 365) {
    res.status(400).json({ error: 'expire_days must be 1–365' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { xrpAddress: true },
  });

  try {
    const payload = await createCheckPayload(sendMaxGkc, expireDays, user?.xrpAddress ?? undefined);

    // Pre-create the UserCheck row in 'pending' state
    const checkId = `chk-${crypto.randomUUID()}`;
    await prisma.userCheck.create({
      data: {
        id: checkId,
        userId: req.user!.id,
        xummUuid: payload.uuid,
        sendMaxGkc,
        status: 'pending',
      },
    });

    res.json({
      check_id: checkId,
      uuid: payload.uuid,
      qr_png: payload.qrPng,
      deeplink: payload.deeplink,
      expires_in_sec: payload.expiresInSec,
    });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

// ── GET /check/status/:uuid ────────────────────────────────────────────────
// Poll until Xaman is signed.  On success, records the XRPL Check ID and
// marks the check as 'active'.

walletRouter.get('/check/status/:uuid', async (req, res) => {
  if (!isXummConfigured()) {
    res.status(503).json({ error: 'Xaman 未設定' });
    return;
  }

  const chk = await prisma.userCheck.findFirst({
    where: { xummUuid: req.params.uuid, userId: req.user!.id },
    select: { id: true, status: true, xrplCheckId: true, sendMaxGkc: true },
  });

  if (!chk) {
    res.status(404).json({ error: 'Check not found' });
    return;
  }

  // Already resolved
  if (chk.status === 'active') {
    res.json({ status: 'active', check_id: chk.id, xrpl_check_id: chk.xrplCheckId });
    return;
  }
  if (chk.status === 'cancelled' || chk.status === 'expired') {
    res.json({ status: chk.status });
    return;
  }

  try {
    const xummStatus = await getPayloadStatus(req.params.uuid);

    if (xummStatus.signed && xummStatus.txid) {
      // The txid IS the XRPL Check object ID after ledger validation
      await prisma.userCheck.update({
        where: { id: chk.id },
        data: { status: 'active', xrplCheckId: xummStatus.txid },
      });

      res.json({ status: 'active', check_id: chk.id, xrpl_check_id: xummStatus.txid, send_max_gkc: Number(chk.sendMaxGkc) });
      return;
    }

    if (xummStatus.cancelled || xummStatus.expired) {
      const newStatus = xummStatus.cancelled ? 'cancelled' : 'expired';
      await prisma.userCheck.update({
        where: { id: chk.id },
        data: { status: newStatus },
      });
      res.json({ status: newStatus });
      return;
    }

    res.json({ status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /check/active ──────────────────────────────────────────────────────
// Returns the user's current active Check (if any) for the frontend to display.

walletRouter.get('/check/active', async (req, res) => {
  const chk = await prisma.userCheck.findFirst({
    where: { userId: req.user!.id, status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sendMaxGkc: true,
      spentGkc: true,
      status: true,
      xrplCheckId: true,
      createdAt: true,
    },
  });

  if (!chk) {
    res.json({ active: false });
    return;
  }

  const remaining = Number(chk.sendMaxGkc) - Number(chk.spentGkc);
  res.json({
    active: true,
    check: {
      id: chk.id,
      send_max_gkc: Number(chk.sendMaxGkc),
      spent_gkc: Number(chk.spentGkc),
      status: chk.status,
      xrpl_check_id: chk.xrplCheckId,
      created_at: chk.createdAt,
      remaining_gkc: remaining,
    },
  });
});

// ── POST /check/mock ───────────────────────────────────────────────────────
// DEV ONLY — create an active check directly in DB, no Xaman required.
// Disabled in production (NODE_ENV=production).

walletRouter.post('/check/mock', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const sendMaxGkc = Number(req.body.send_max_gkc ?? 100);
  const checkId = `chk-mock-${crypto.randomUUID()}`;
  const mockXrplId = `MOCK_CHECK_${Date.now().toString(16).toUpperCase()}`;

  // Revoke any existing active mock checks for this user first
  await prisma.userCheck.updateMany({
    where: { userId: req.user!.id, status: 'active' },
    data: { status: 'expired' },
  });

  await prisma.userCheck.create({
    data: {
      id: checkId,
      userId: req.user!.id,
      xummUuid: `mock-uuid-${checkId}`,
      xrplCheckId: mockXrplId,
      sendMaxGkc,
      status: 'active',
    },
  });

  console.log(`[wallet:mock] Created mock check ${checkId} for user ${req.user!.id} — limit ${sendMaxGkc} GKC`);

  res.json({
    check_id: checkId,
    xrpl_check_id: mockXrplId,
    send_max_gkc: sendMaxGkc,
    status: 'active',
    _dev: true,
  });
});

// ── POST /check/inject ─────────────────────────────────────────────────────
// DEV ONLY — register a REAL XRPL Check ID created programmatically
// (e.g. from server/scripts/create-test-check.ts) without going through Xaman.
// Disabled in production.

walletRouter.post('/check/inject', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { xrpl_check_id, send_max_gkc } = req.body as {
    xrpl_check_id?: string;
    send_max_gkc?: number;
  };

  if (!xrpl_check_id || typeof xrpl_check_id !== 'string' || xrpl_check_id.length !== 64) {
    res.status(400).json({ error: 'xrpl_check_id must be a 64-char XRPL hex hash' });
    return;
  }

  const sendMaxGkc = Number(send_max_gkc ?? 50);
  const checkId = `chk-real-${crypto.randomUUID()}`;

  // Revoke any existing active checks for this user
  await prisma.userCheck.updateMany({
    where: { userId: req.user!.id, status: 'active' },
    data: { status: 'expired' },
  });

  await prisma.userCheck.create({
    data: {
      id: checkId,
      userId: req.user!.id,
      xummUuid: `injected-${checkId}`,
      xrplCheckId: xrpl_check_id,
      sendMaxGkc,
      status: 'active',
    },
  });

  console.log(`[wallet:inject] Real check ${xrpl_check_id} registered as ${checkId}`);

  res.json({
    check_id: checkId,
    xrpl_check_id,
    send_max_gkc: sendMaxGkc,
    status: 'active',
  });
});

// ── POST /check/dev-real-create ────────────────────────────────────────────
// DEV ONLY — creates a REAL XRPL CheckCreate (issuer → platform) server-side
// without requiring Xaman, then auto-registers it for the authenticated user.
// Perfect for the /demo page one-click flow.

walletRouter.post('/check/dev-real-create', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const sendMaxGkc = Math.max(1, Math.min(500, Number(req.body.send_max_gkc ?? 50)));

  try {
    const { checkId: xrplCheckId, txHash } = await createCheckFromIssuer(sendMaxGkc);

    const checkId = `chk-real-${crypto.randomUUID()}`;

    await prisma.userCheck.updateMany({
      where: { userId: req.user!.id, status: 'active' },
      data: { status: 'expired' },
    });

    await prisma.userCheck.create({
      data: {
        id: checkId,
        userId: req.user!.id,
        xummUuid: `dev-real-${checkId}`,
        xrplCheckId,
        sendMaxGkc,
        status: 'active',
      },
    });

    console.log(`[wallet:dev-real-create] Check ${xrplCheckId} (${sendMaxGkc} GKC) registered as ${checkId}`);

    res.json({
      check_id: checkId,
      xrpl_check_id: xrplCheckId,
      create_tx_hash: txHash,
      send_max_gkc: sendMaxGkc,
      status: 'active',
    });
  } catch (err) {
    console.error('[wallet:dev-real-create] error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
