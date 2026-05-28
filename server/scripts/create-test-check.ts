/**
 * server/scripts/create-test-check.ts
 * ─────────────────────────────────────────────────────
 * Creates a REAL XRPL CheckCreate on testnet using the issuer wallet
 * (issuer → platform) for end-to-end testing without Xaman.
 *
 * Usage:
 *   pnpm tsx server/scripts/create-test-check.ts [send_max_gkc]
 *
 * Output: the XRPL Check ID to use with POST /wallet/check/active (manual insert)
 */

import 'dotenv/config';
import { Client, Wallet } from 'xrpl';

const XRPL_WSS  = process.env.XRPL_WSS ?? 'wss://s.altnet.rippletest.net:51233';
const GKC_CURRENCY = process.env.GKC_CURRENCY ?? 'GKC';
const ISSUER_SEED   = process.env.GKC_ISSUER_SEED!;
const ISSUER_ADDR   = process.env.GKC_ISSUER_ADDRESS!;
const PLATFORM_ADDR = process.env.PLATFORM_ADDRESS!;
const sendMaxGkc = parseFloat(process.argv[2] ?? '50');

if (!ISSUER_SEED || !ISSUER_ADDR || !PLATFORM_ADDR) {
  console.error('Missing env: GKC_ISSUER_SEED, GKC_ISSUER_ADDRESS, PLATFORM_ADDRESS');
  process.exit(1);
}

const client = new Client(XRPL_WSS);
await client.connect();
console.log('Connected to XRPL testnet');

const issuer = Wallet.fromSeed(ISSUER_SEED);

// xrplNow is seconds since 2000-01-01
const xrplNow = Math.floor(Date.now() / 1000) - 946684800;
const expireSeconds = 7 * 24 * 3600; // 7 days

const checkTx = await client.submitAndWait(
  {
    TransactionType: 'CheckCreate',
    Account: issuer.address,
    Destination: PLATFORM_ADDR,
    SendMax: {
      currency: GKC_CURRENCY,
      issuer: ISSUER_ADDR,
      value: sendMaxGkc.toFixed(6),
    },
    Expiration: xrplNow + expireSeconds,
  },
  { wallet: issuer },
);

const txHash = checkTx.result.hash;
const meta = checkTx.result.meta as Record<string, unknown>;

// Extract Check ID from AffectedNodes
let checkId: string | null = null;
const nodes = (meta?.AffectedNodes ?? []) as Array<Record<string, unknown>>;
for (const node of nodes) {
  const created = node['CreatedNode'] as Record<string, unknown> | undefined;
  if (created?.LedgerEntryType === 'Check') {
    checkId = (created.LedgerIndex as string) ?? null;
    break;
  }
}

if (!checkId) {
  console.error('TX succeeded but could not extract Check ID. Hash:', txHash);
  console.error('Meta:', JSON.stringify(meta, null, 2));
  await client.disconnect();
  process.exit(1);
}

console.log('\n✅ Real XRPL Check created!');
console.log('   TX Hash  :', txHash);
console.log('   Check ID :', checkId);
console.log('   SendMax  :', sendMaxGkc, 'GKC');
console.log('\n── Insert into DB (run in server shell) ──────────────────────────');
console.log(`
$T = (Invoke-RestMethod 'http://localhost:3001/api/v1/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"demo@gkc.edu.tw","password":"Demo1234"}').token
# Use the Check ID below when opening a session:
# check_id will be inserted by the route when you call /wallet/check/status/:uuid
# OR manually via:
`);

console.log(`XRPL_CHECK_ID=${checkId}`);
console.log(`SEND_MAX=${sendMaxGkc}`);

await client.disconnect();
