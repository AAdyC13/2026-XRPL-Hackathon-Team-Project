/**
 * server/services/xrpl.ts
 * ─────────────────────────────────────────────────────
 * XRPL singleton client + GKC IOU helpers.
 */

import { Client, Wallet, type AccountLinesTrustline } from 'xrpl';
import crypto from 'crypto';
import { prisma } from '../db/index.js';

const XRPL_WSS = process.env.XRPL_WSS ?? 'wss://s.altnet.rippletest.net:51233';
export const GKC_CURRENCY = process.env.GKC_CURRENCY ?? 'GKC';

// Lazy singleton ─ created on first use
let _client: Client | null = null;

export async function getXrplClient(): Promise<Client> {
  if (!_client) {
    _client = new Client(XRPL_WSS);
  }
  if (!_client.isConnected()) {
    await _client.connect();
  }
  return _client;
}

export async function disconnectXrpl() {
  if (_client?.isConnected()) {
    await _client.disconnect();
    _client = null;
  }
}

// ── Wallets ────────────────────────────────────────────────────────────────

export function getPlatformWallet(): Wallet {
  const seed = process.env.PLATFORM_SEED;
  if (!seed) throw new Error('PLATFORM_SEED not set in environment');
  return Wallet.fromSeed(seed);
}

export function getIssuerWallet(): Wallet {
  const seed = process.env.GKC_ISSUER_SEED;
  if (!seed) throw new Error('GKC_ISSUER_SEED not set in environment');
  return Wallet.fromSeed(seed);
}

// ── GKC Amount helper ──────────────────────────────────────────────────────

export function gkcAmount(value: number | string) {
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set in environment');
  return {
    currency: GKC_CURRENCY,
    issuer,
    value: String(value),
  };
}

// ── Ensure user has a TrustLine ────────────────────────────────────────────

export async function ensureTrustLine(userAddress: string): Promise<boolean> {
  const client = await getXrplClient();
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');

  const lines = await client.request({
    command: 'account_lines',
    account: userAddress,
    peer: issuer,
  });

  const hasTrust = (lines.result.lines as AccountLinesTrustline[]).some(
    (l) => l.currency === GKC_CURRENCY,
  );
  return hasTrust;
}

// ── Send GKC from Platform to a recipient ─────────────────────────────────

export async function sendGkc(
  toAddress: string,
  amount: number,
  memo?: string,
): Promise<string> {
  // ── Dev mock mode ──────────────────────────────────────────────────────
  if (!process.env.PLATFORM_SEED) {
    const mockHash = `DEV_MOCK_PAY_${Date.now().toString(16).toUpperCase()}`;
    console.warn(`[xrpl:mock] sendGkc skipped (no PLATFORM_SEED) — mock tx: ${mockHash}`);
    return mockHash;
  }

  const client = await getXrplClient();
  const platform = getPlatformWallet();

  const Memos = memo
    ? [{ Memo: { MemoData: Buffer.from(memo).toString('hex').toUpperCase() } }]
    : undefined;

  const result = await client.submitAndWait(
    {
      TransactionType: 'Payment',
      Account: platform.address,
      Destination: toAddress,
      Amount: gkcAmount(amount.toFixed(6)),
      ...(Memos ? { Memos } : {}),
    },
    { wallet: platform },
  );

  return result.result.hash;
}

// ── Setup TrustLine (called by user wallet, not Platform) ─────────────────
//
// Users must do this ONCE before they can receive GKC.
// This is a client-side transaction — the user signs it in their own wallet
// (XUMM / browser extension). This helper builds the unsigned tx for them.
export function buildTrustSetTx(userAddress: string, limitGkc = '10000000') {
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');
  return {
    TransactionType: 'TrustSet' as const,
    Account: userAddress,
    LimitAmount: {
      currency: GKC_CURRENCY,
      issuer,
      value: limitGkc,
    },
  };
}

// ── Topup: Platform sends GKC to a user who already has a TrustLine ───────
//
// Flow:
//   1. User pays real money (or XRP) off-platform
//   2. Admin calls this to credit GKC to the user's XRP address
//   3. Also updates gkcBalance in Prisma (PostgreSQL)
export async function topupUserGkc(
  toAddress: string,
  amount: number,
  userId: string,
): Promise<string> {
  // Verify TrustLine exists before sending (XRPL will reject if not set)
  const hasTrust = await ensureTrustLine(toAddress);
  if (!hasTrust) {
    throw new Error(
      `Address ${toAddress} has no TrustLine for GKC. ` +
      `User must sign a TrustSet transaction first.`,
    );
  }

  const txHash = await sendGkc(toAddress, amount, `GKC_TOPUP:${userId}`);

  // Mirror the on-chain balance to DB via Prisma
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { gkcBalance: { increment: amount } },
    select: { gkcBalance: true },
  });

  await prisma.transaction.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      type: 'topup',
      amountGkc: amount,
      balanceAfter: Number(updated.gkcBalance),
      txHash,
      description: 'GKC top-up via XRPL',
    },
  });

  return txHash;
}

// ── Provider payout: Platform → Provider's XRP address ───────────────────
//
// Called by daily settlement cron.
// Provider must have set a TrustLine (same as users).
// If they haven't, payment is held in DB as pending.
export async function settleProviderPayout(
  providerXrpAddress: string,
  amountGkc: number,
  providerId: string,
): Promise<{ txHash: string } | { pending: true; reason: string }> {
  const hasTrust = await ensureTrustLine(providerXrpAddress);
  if (!hasTrust) {
    // Can't send — log as pending, provider needs to set TrustLine
    return {
      pending: true,
      reason: `Provider ${providerXrpAddress} has no GKC TrustLine. Payment queued.`,
    };
  }

  const txHash = await sendGkc(
    providerXrpAddress,
    amountGkc,
    `PROVIDER_PAYOUT:${providerId}`,
  );

  // Mark related inference_records as settled via Prisma
  await prisma.inferenceRecord.updateMany({
    where: { providerId, settled: false },
    data: { settled: true, txHash },
  });

  return { txHash };
}

// ── Get GKC balance for any address ───────────────────────────────────────

export async function getGkcBalance(address: string): Promise<number> {
  const client = await getXrplClient();
  const issuer = process.env.GKC_ISSUER_ADDRESS;
  if (!issuer) throw new Error('GKC_ISSUER_ADDRESS not set');

  const balances = await client.getBalances(address);
  const gkc = balances.find(b => b.currency === GKC_CURRENCY && b.issuer === issuer);
  return gkc ? parseFloat(gkc.value) : 0;
}

// ── Cash an XRPL Check (platform collects from user's authorization) ───────
//
// The Check was created by the user (via Xaman / CheckCreate).
// Platform calls this at session end with the exact amount consumed.
// memoData is included in the tx as a JSON blob (session summary + Merkle root).
export async function cashCheck(
  xrplCheckId: string,
  amountGkc: number,
  memoData: Record<string, unknown>,
): Promise<string> {
  // ── Dev mock mode ──────────────────────────────────────────────────────
  if (!process.env.PLATFORM_SEED || xrplCheckId.startsWith('MOCK_CHECK_')) {
    const mockHash = `DEV_MOCK_${Date.now().toString(16).toUpperCase()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    console.warn(`[xrpl:mock] cashCheck skipped (mock check) — mock tx: ${mockHash}`);
    console.warn(`[xrpl:mock] Would cash Check ${xrplCheckId} for ${amountGkc} GKC`);
    console.warn(`[xrpl:mock] Memo:`, JSON.stringify(memoData));
    return mockHash;
  }

  const client = await getXrplClient();
  const platform = getPlatformWallet();

  const memoHex = Buffer.from(JSON.stringify(memoData)).toString('hex').toUpperCase();

  const result = await client.submitAndWait(
    {
      TransactionType: 'CheckCash',
      Account: platform.address,
      CheckID: xrplCheckId,
      Amount: gkcAmount(amountGkc.toFixed(6)),
      Memos: [{ Memo: { MemoData: memoHex } }],
    },
    { wallet: platform },
  );

  return result.result.hash;
}

// ── createCheckFromIssuer ───────────────────────────────────────────────────
// DEV HELPER: Creates a real CheckCreate on testnet from the issuer wallet
// to the platform wallet. Used by the demo page dev endpoint.

export async function createCheckFromIssuer(
  sendMaxGkc: number,
): Promise<{ checkId: string; txHash: string }> {
  const client = await getXrplClient();
  const issuer = getIssuerWallet();
  const platformAddress = process.env.PLATFORM_ADDRESS;
  if (!platformAddress) throw new Error('PLATFORM_ADDRESS not set');

  const xrplNow = Math.floor(Date.now() / 1000) - 946684800;
  const expireSeconds = 7 * 24 * 3600;

  const checkTx = await client.submitAndWait(
    {
      TransactionType: 'CheckCreate',
      Account: issuer.address,
      Destination: platformAddress,
      SendMax: gkcAmount(sendMaxGkc.toFixed(6)),
      Expiration: xrplNow + expireSeconds,
    },
    { wallet: issuer },
  );

  const txHash = checkTx.result.hash;
  const meta = checkTx.result.meta as Record<string, unknown>;
  const nodes = (meta?.AffectedNodes ?? []) as Array<Record<string, unknown>>;

  let checkId: string | null = null;
  for (const node of nodes) {
    const created = node['CreatedNode'] as Record<string, unknown> | undefined;
    if (created?.LedgerEntryType === 'Check') {
      checkId = (created.LedgerIndex as string) ?? null;
      break;
    }
  }

  if (!checkId) throw new Error(`CheckCreate TX succeeded but no Check ID in meta (hash: ${txHash})`);
  return { checkId, txHash };
}

// ── Issuer authorizes a holder's TrustLine (Authorized Trust Lines) ────────
// Sets tfSetfAuth flag (0x10000) on the issuer's TrustSet to the holder.
// Must be called after the user signs their own TrustSet.
export async function issuerAuthorizeTrustLine(holderAddress: string): Promise<void> {
  const issuerSeed = process.env.GKC_ISSUER_SEED;
  if (!issuerSeed) throw new Error('GKC_ISSUER_SEED not set');
  const issuerAddress = process.env.GKC_ISSUER_ADDRESS;
  if (!issuerAddress) throw new Error('GKC_ISSUER_ADDRESS not set');

  const client = await getXrplClient();
  const issuer = Wallet.fromSeed(issuerSeed);

  await client.submitAndWait(
    {
      TransactionType: 'TrustSet',
      Account: issuerAddress,
      LimitAmount: {
        currency: GKC_CURRENCY,
        issuer: holderAddress,
        value: '0',
      },
      Flags: 0x10000,
    },
    { wallet: issuer },
  );
}

// ── Issuer freezes a holder's TrustLine (Individual Freeze) ───────────────
// Sets tfSetFreeze flag (0x100000). Used when unbinding wallet.
export async function freezeTrustLine(holderAddress: string): Promise<void> {
  const issuerSeed = process.env.GKC_ISSUER_SEED;
  if (!issuerSeed) throw new Error('GKC_ISSUER_SEED not set');
  const issuerAddress = process.env.GKC_ISSUER_ADDRESS;
  if (!issuerAddress) throw new Error('GKC_ISSUER_ADDRESS not set');

  const client = await getXrplClient();
  const issuer = Wallet.fromSeed(issuerSeed);

  await client.submitAndWait(
    {
      TransactionType: 'TrustSet',
      Account: issuerAddress,
      LimitAmount: {
        currency: GKC_CURRENCY,
        issuer: holderAddress,
        value: '0',
      },
      Flags: 0x100000,
    },
    { wallet: issuer },
  );
}

