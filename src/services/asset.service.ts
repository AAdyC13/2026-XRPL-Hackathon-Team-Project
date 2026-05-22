import { Amount, Payment } from "xrpl";
import { env, requireIssuerAddress, requireIssuerSeed } from "../config/env.js";
import { autofillAndSubmit, getAccountLines, walletFromSeed } from "../infrastructure/xrpl.client.js";

export type IssuePaymentInput = {
  destination: string;
  amount: string;
};

export type TransferPaymentInput = {
  from: string;
  to: string;
  amount: string;
};

function acuAmount(value: string): Amount {
  return {
    currency: env.CURRENCY_CODE,
    issuer: requireIssuerAddress(),
    value
  };
}

export function buildIssuePayment({ destination, amount }: IssuePaymentInput): Payment {
  return {
    TransactionType: "Payment",
    Account: requireIssuerAddress(),
    Destination: destination,
    Amount: acuAmount(amount)
  };
}

export function buildTransferPayment({ from, to, amount }: TransferPaymentInput): Payment {
  return {
    TransactionType: "Payment",
    Account: from,
    Destination: to,
    Amount: acuAmount(amount)
  };
}

export async function issueToken(input: IssuePaymentInput) {
  const issuerWallet = walletFromSeed(requireIssuerSeed());
  return autofillAndSubmit(issuerWallet, buildIssuePayment(input));
}

export async function getTokenBalance(account: string): Promise<string> {
  const lines = await getAccountLines(account);
  const issuer = requireIssuerAddress();
  const line = lines.result.lines.find(
    (item) => item.currency === env.CURRENCY_CODE && item.account === issuer
  );

  return line?.balance ?? "0";
}
