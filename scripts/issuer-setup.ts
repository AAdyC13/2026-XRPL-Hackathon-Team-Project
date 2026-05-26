/**
 * 一次性執行：對 Issuer 帳號啟用 asfRequireAuth flag
 * 啟用後，所有新的 TrustSet 都需要 Issuer 端明確授權才生效（Authorized Trust Lines）
 *
 * 執行方式：npx tsx scripts/issuer-setup.ts
 */
import dotenv from "dotenv";
dotenv.config();

import xrpl from "xrpl";

const XRPL_WS_URL = process.env.XRPL_WS_URL ?? "wss://s.altnet.rippletest.net:51233";
const ISSUER_SEED = process.env.ISSUER_SEED;
const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS;

if (!ISSUER_SEED || !ISSUER_ADDRESS) {
  console.error("ISSUER_SEED and ISSUER_ADDRESS must be set in .env");
  process.exit(1);
}

async function main() {
  const client = new xrpl.Client(XRPL_WS_URL);
  await client.connect();
  console.log("Connected to XRPL:", XRPL_WS_URL);

  const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_SEED!);
  console.log("Issuer address:", issuerWallet.address);

  const accountInfo = await client.request({
    command: "account_info",
    account: ISSUER_ADDRESS!,
    ledger_index: "validated"
  });

  const flags = accountInfo.result.account_data.Flags ?? 0;
  const asfRequireAuth = 0x00000004;

  if (flags & asfRequireAuth) {
    console.log("asfRequireAuth is already set on the Issuer account. No action needed.");
    await client.disconnect();
    return;
  }

  const tx: xrpl.AccountSet = {
    TransactionType: "AccountSet",
    Account: ISSUER_ADDRESS!,
    SetFlag: xrpl.AccountSetAsfFlags.asfRequireAuth
  };

  const prepared = await client.autofill(tx);
  const signed = issuerWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  console.log("AccountSet result:", result.result.meta && typeof result.result.meta === "object" && "TransactionResult" in result.result.meta
    ? (result.result.meta as { TransactionResult: string }).TransactionResult
    : result.result.engine_result
  );
  console.log("asfRequireAuth enabled. GKC trust lines now require Issuer authorization.");

  await client.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
