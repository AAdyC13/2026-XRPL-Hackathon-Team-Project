import "./load-env.js";
import type { ActionRequest, ActionResponse } from "adminjs";
import {
  getTreasuryConfigStatus,
  getTreasuryBalances,
  issueFromIssuerToWarm,
  transferWarmToPlatform,
  transferPlatformToThirdParty,
  txExplorerUrl
} from "../server/services/treasury.js";

type TreasuryPageRecord = {
  config: ReturnType<typeof getTreasuryConfigStatus>;
  balances?: Awaited<ReturnType<typeof getTreasuryBalances>>;
  error?: string;
  success?: string;
  txHash?: string;
  explorerUrl?: string;
};

function pageRecord(extra: Partial<TreasuryPageRecord> = {}): ActionResponse {
  return {
    record: {
      config: getTreasuryConfigStatus(),
      ...extra
    }
  };
}

function parseAmount(raw: unknown): number {
  const n = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("amountGkc must be a positive number");
  }
  return n;
}

export async function treasuryPageHandler(
  request: ActionRequest
): Promise<ActionResponse> {
  const params = (request.query ?? {}) as Record<string, string>;
  const action = params.action;

  try {
    if (action === "issuer-to-warm") {
      const txHash = await issueFromIssuerToWarm(parseAmount(params.amountGkc));
      return pageRecord({
        balances: await getTreasuryBalances(),
        success: `Issuer → Warm 成功`,
        txHash,
        explorerUrl: txExplorerUrl(txHash)
      });
    }

    if (action === "warm-to-platform") {
      const txHash = await transferWarmToPlatform(parseAmount(params.amountGkc));
      return pageRecord({
        balances: await getTreasuryBalances(),
        success: `Warm → Platform 成功`,
        txHash,
        explorerUrl: txExplorerUrl(txHash)
      });
    }

    if (action === "platform-payout") {
      const toAddress = params.toAddress?.trim();
      if (!toAddress) throw new Error("toAddress is required");
      const txHash = await transferPlatformToThirdParty(
        toAddress,
        parseAmount(params.amountGkc),
        params.memo?.trim() || undefined
      );
      return pageRecord({
        balances: await getTreasuryBalances(),
        success: `Platform → ${toAddress} 成功`,
        txHash,
        explorerUrl: txExplorerUrl(txHash)
      });
    }

    return pageRecord({ balances: await getTreasuryBalances() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return pageRecord({
      balances: await getTreasuryBalances().catch(() => undefined),
      error: msg
    });
  }
}
