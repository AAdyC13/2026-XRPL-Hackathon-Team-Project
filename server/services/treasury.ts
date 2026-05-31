/**
 * Treasury operations: Issuer → Warm → Platform (hot) → third party.
 * Env: GKC_ISSUER_*, WARM_WALLET_*, PLATFORM_*.
 */

import { Wallet } from 'xrpl';
import {
  getXrplClient,
  getIssuerWallet,
  getPlatformWallet,
  gkcAmount,
  getGkcBalance,
  sendGkc,
  ensureTrustLine,
} from './xrpl.js';

export type TreasuryAddresses = {
  issuer: string | null;
  warm: string | null;
  platform: string | null;
};

export type TreasuryBalances = {
  issuer: number | null;
  warm: number | null;
  platform: number | null;
};

export function getTreasuryAddresses(): TreasuryAddresses {
  return {
    issuer: process.env.GKC_ISSUER_ADDRESS?.trim() ?? null,
    warm: process.env.WARM_WALLET_ADDRESS?.trim() ?? null,
    platform: process.env.PLATFORM_ADDRESS?.trim() ?? null,
  };
}

export function getTreasuryConfigStatus(): {
  addresses: TreasuryAddresses;
  seeds: { issuer: boolean; warm: boolean; platform: boolean };
  ready: { issuerToWarm: boolean; warmToPlatform: boolean; platformPayout: boolean };
} {
  const addresses = getTreasuryAddresses();
  const seeds = {
    issuer: Boolean(process.env.GKC_ISSUER_SEED?.trim()),
    warm: Boolean(process.env.WARM_WALLET_SEED?.trim()),
    platform: Boolean(process.env.PLATFORM_SEED?.trim()),
  };
  return {
    addresses,
    seeds,
    ready: {
      issuerToWarm: Boolean(addresses.issuer && addresses.warm && seeds.issuer),
      warmToPlatform: Boolean(addresses.warm && addresses.platform && seeds.warm),
      platformPayout: Boolean(addresses.platform && seeds.platform),
    },
  };
}

function getWarmWallet(): Wallet {
  const seed = process.env.WARM_WALLET_SEED?.trim();
  if (!seed) throw new Error('WARM_WALLET_SEED not set in environment');
  return Wallet.fromSeed(seed);
}

export async function getTreasuryBalances(): Promise<TreasuryBalances> {
  const { issuer, warm, platform } = getTreasuryAddresses();
  const [issuerBal, warmBal, platformBal] = await Promise.all([
    issuer ? getGkcBalance(issuer).catch(() => null) : Promise.resolve(null),
    warm ? getGkcBalance(warm).catch(() => null) : Promise.resolve(null),
    platform ? getGkcBalance(platform).catch(() => null) : Promise.resolve(null),
  ]);
  return { issuer: issuerBal, warm: warmBal, platform: platformBal };
}

/** Issuer Payment → Warm (mint / treasury deposit). */
export async function issueFromIssuerToWarm(amountGkc: number): Promise<string> {
  const warm = process.env.WARM_WALLET_ADDRESS?.trim();
  if (!warm) throw new Error('WARM_WALLET_ADDRESS not set');
  return issueFromIssuerToDestination(warm, amountGkc);
}

/** Issuer Payment → arbitrary destination (must have GKC trustline). */
export async function issueFromIssuerToDestination(
  destination: string,
  amountGkc: number,
): Promise<string> {
  if (amountGkc <= 0) throw new Error('amountGkc must be positive');

  if (!process.env.GKC_ISSUER_SEED?.trim()) {
    const mockHash = `DEV_MOCK_ISSUE_${Date.now().toString(16).toUpperCase()}`;
    console.warn(`[treasury:mock] issueFromIssuer skipped — mock tx: ${mockHash}`);
    return mockHash;
  }

  const hasTrust = await ensureTrustLine(destination);
  if (!hasTrust) {
    throw new Error(
      `Destination ${destination} has no GKC trustline. Run TrustSet on that wallet first.`,
    );
  }

  const client = await getXrplClient();
  const issuer = getIssuerWallet();

  const result = await client.submitAndWait(
    {
      TransactionType: 'Payment',
      Account: issuer.address,
      Destination: destination,
      Amount: gkcAmount(amountGkc.toFixed(6)),
    },
    { wallet: issuer },
  );

  return result.result.hash;
}

/** Warm Payment → Platform (hot wallet refill). */
export async function transferWarmToPlatform(amountGkc: number): Promise<string> {
  if (amountGkc <= 0) throw new Error('amountGkc must be positive');

  const platform = process.env.PLATFORM_ADDRESS?.trim();
  if (!platform) throw new Error('PLATFORM_ADDRESS not set');

  if (!process.env.WARM_WALLET_SEED?.trim()) {
    const mockHash = `DEV_MOCK_WARM_PAY_${Date.now().toString(16).toUpperCase()}`;
    console.warn(`[treasury:mock] transferWarmToPlatform skipped — mock tx: ${mockHash}`);
    return mockHash;
  }

  const hasTrust = await ensureTrustLine(platform);
  if (!hasTrust) {
    throw new Error('Platform has no GKC trustline. Run pnpm setup:xrpl or TrustSet first.');
  }

  const client = await getXrplClient();
  const warm = getWarmWallet();

  const result = await client.submitAndWait(
    {
      TransactionType: 'Payment',
      Account: warm.address,
      Destination: platform,
      Amount: gkcAmount(amountGkc.toFixed(6)),
    },
    { wallet: warm },
  );

  return result.result.hash;
}

/** Platform Payment → third party (on-chain only, no DB ledger). */
export async function transferPlatformToThirdParty(
  toAddress: string,
  amountGkc: number,
  memo?: string,
): Promise<string> {
  if (amountGkc <= 0) throw new Error('amountGkc must be positive');
  if (!toAddress?.trim()) throw new Error('toAddress is required');

  const hasTrust = await ensureTrustLine(toAddress);
  if (!hasTrust) {
    throw new Error(`Recipient ${toAddress} has no GKC trustline.`);
  }

  return sendGkc(toAddress, amountGkc, memo ?? 'TREASURY_PAYOUT');
}

/** Explorer URL helper for API responses. */
export function txExplorerUrl(txHash: string): string {
  const base = process.env.XRPL_EXPLORER ?? 'https://testnet.xrpl.org';
  return `${base}/transactions/${txHash}`;
}
