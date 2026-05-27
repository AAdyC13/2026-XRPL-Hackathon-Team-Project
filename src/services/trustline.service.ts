import { AccountLinesResponse, TrustSet } from "xrpl";
import { env, requireIssuerAddress } from "../config/env.js";
import { getAccountLines } from "../infrastructure/xrpl.client.js";

export type BuildTrustSetInput = {
  holder: string;
  limit?: string;
};

export function buildTrustSetTx({ holder, limit = env.DEFAULT_TRUST_LIMIT }: BuildTrustSetInput): TrustSet {
  return {
    TransactionType: "TrustSet",
    Account: holder,
    LimitAmount: {
      currency: env.CURRENCY_CODE,
      issuer: requireIssuerAddress(),
      value: limit
    }
  };
}

export async function getTrustLines(account: string): Promise<AccountLinesResponse["result"]["lines"]> {
  const response = await getAccountLines(account);
  return response.result.lines;
}
