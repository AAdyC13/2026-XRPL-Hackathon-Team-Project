import xrpl, {
  AccountInfoRequest,
  AccountLinesRequest,
  Client,
  Payment,
  SubmittableTransaction,
  Transaction,
  Wallet,
  xrpToDrops
} from "xrpl";
import { env } from "../config/env.js";

let client: Client | undefined;

export async function getClient(): Promise<Client> {
  if (client?.isConnected()) {
    return client;
  }

  client = new xrpl.Client(env.XRPL_WS_URL);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await client.connect();
      return client;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  return client;
}

export async function disconnectClient(): Promise<void> {
  if (client?.isConnected()) {
    await client.disconnect();
  }
}

export function walletFromSeed(seed: string): Wallet {
  return xrpl.Wallet.fromSeed(seed);
}

export async function autofillAndSubmit<T extends SubmittableTransaction>(
  wallet: Wallet,
  transaction: T
): Promise<xrpl.TxResponse> {
  const xrplClient = await getClient();
  const prepared = await xrplClient.autofill(transaction);
  const signed = wallet.sign(prepared);
  return xrplClient.submitAndWait(signed.tx_blob);
}

export async function getAccountInfo(account: string) {
  const xrplClient = await getClient();
  const request: AccountInfoRequest = {
    command: "account_info",
    account,
    ledger_index: "validated"
  };

  return xrplClient.request(request);
}

export async function getAccountLines(account: string) {
  const xrplClient = await getClient();
  const request: AccountLinesRequest = {
    command: "account_lines",
    account,
    ledger_index: "validated"
  };

  return xrplClient.request(request);
}

export async function getXrpBalance(account: string): Promise<string> {
  const response = await getAccountInfo(account);
  return String(xrpl.dropsToXrp(response.result.account_data.Balance));
}

export function dropsFromXrp(amount: string): string {
  return xrpToDrops(amount);
}

export function isPayment(transaction: Transaction): transaction is Payment {
  return transaction.TransactionType === "Payment";
}
