import { AccountLinesResponse, TrustSet } from "xrpl";
import { env, requireIssuerAddress, requireIssuerSeed } from "../../config/env.js";
import { autofillAndSubmit, getAccountLines, walletFromSeed } from "../infrastructure/xrpl.client.js";

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

// Issuer authorizes holder's trust line (Authorized Trust Lines — tfSetfAuth = 0x10000)
export async function issuerAuthorizeTrustLine(holderAddress: string): Promise<void> {
  const issuerWallet = walletFromSeed(requireIssuerSeed());
  const tx: TrustSet = {
    TransactionType: "TrustSet",
    Account: requireIssuerAddress(),
    LimitAmount: {
      currency: env.CURRENCY_CODE,
      issuer: holderAddress,
      value: "0"
    },
    Flags: 0x10000
  };
  await autofillAndSubmit(issuerWallet, tx);
}

// Issuer freezes holder's trust line (Individual Freeze — tfSetFreeze = 0x100000)
export async function freezeTrustLine(holderAddress: string): Promise<void> {
  const issuerWallet = walletFromSeed(requireIssuerSeed());
  const tx: TrustSet = {
    TransactionType: "TrustSet",
    Account: requireIssuerAddress(),
    LimitAmount: {
      currency: env.CURRENCY_CODE,
      issuer: holderAddress,
      value: "0"
    },
    Flags: 0x100000
  };
  await autofillAndSubmit(issuerWallet, tx);
}
