import { env, requireIssuerAddress } from "../src/config/env.js";
import { disconnectClient, getAccountLines, getClient, getXrpBalance } from "../src/infrastructure/xrpl.client.js";

async function main() {
  const client = await getClient();
  const issuer = requireIssuerAddress();
  const xrpBalance = await getXrpBalance(issuer);
  const lines = await getAccountLines(issuer);

  console.log(`Connected to ${env.XRPL_WS_URL}`);
  console.log(`Issuer: ${issuer}`);
  console.log(`XRP balance: ${xrpBalance}`);
  console.log(`Trust lines: ${lines.result.lines.length}`);

  await client.request({ command: "server_info" });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectClient();
  });
