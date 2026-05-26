/**
 * setup-xrpl.ts
 * ──────────────────────────────────────────────────────────────────────────
 * One-time script to set up GKC (高科幣) as an IOU token on XRPL Testnet.
 *
 * What this does:
 *  1. Creates (or loads) two wallets: GKC_ISSUER and PLATFORM
 *  2. Funds them from the Testnet faucet (free test XRP)
 *  3. Enables DefaultRipple on the Issuer account
 *  4. Sets up TrustLine: PLATFORM trusts GKC from ISSUER
 *  5. Issues initial 1,000,000 GKC to PLATFORM account
 *  6. Prints the .env values to copy
 *
 * Usage:
 *   pnpm run setup:xrpl
 *
 * If GKC_ISSUER_SEED and PLATFORM_SEED are already in .env,
 * the script will reuse those wallets instead of creating new ones.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { Client, Wallet } from 'xrpl';
import dotenv from 'dotenv';

dotenv.config();

const XRPL_WSS = process.env.XRPL_WSS ?? 'wss://s.altnet.rippletest.net:51233';
const GKC_CURRENCY = 'GKC';
const INITIAL_SUPPLY = '1000000'; // 1,000,000 GKC
const TRUST_LIMIT = '10000000';   // 10,000,000 GKC max trust

// ── Helpers ────────────────────────────────────────────────────────────────

function printSection(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  printSection('GKC (高科幣) XRPL Testnet Setup');
  console.log(`Network: ${XRPL_WSS}`);

  const client = new Client(XRPL_WSS);
  await client.connect();
  console.log('✓ Connected to XRPL');

  // ── Step 1: Create or load wallets ────────────────────────────────────

  printSection('Step 1 — Wallets');

  let issuerWallet: Wallet;
  let platformWallet: Wallet;

  if (process.env.GKC_ISSUER_SEED && process.env.PLATFORM_SEED) {
    // Reuse existing wallets from .env
    issuerWallet = Wallet.fromSeed(process.env.GKC_ISSUER_SEED);
    platformWallet = Wallet.fromSeed(process.env.PLATFORM_SEED);
    console.log('Loading wallets from .env...');
    console.log('  Issuer  :', issuerWallet.address);
    console.log('  Platform:', platformWallet.address);
  } else {
    // Create fresh wallets funded by faucet
    console.log('Funding new wallets from Testnet faucet...');
    console.log('(This may take 15–30 seconds)');

    const issuerResult = await client.fundWallet();
    issuerWallet = issuerResult.wallet;
    console.log('  ✓ Issuer  :', issuerWallet.address, '(', issuerResult.balance, 'XRP)');

    // Small delay between faucet calls to avoid rate limit
    await sleep(3000);

    const platformResult = await client.fundWallet();
    platformWallet = platformResult.wallet;
    console.log('  ✓ Platform:', platformWallet.address, '(', platformResult.balance, 'XRP)');
  }

  // ── Step 2: Enable DefaultRipple on Issuer ────────────────────────────
  //
  // DefaultRipple allows anyone who trusts GKC from this issuer to send
  // GKC to each other through the issuer (rippling). Required for IOU tokens.

  printSection('Step 2 — Enable DefaultRipple on Issuer');

  try {
    const accountSetTx = await client.submitAndWait(
      {
        TransactionType: 'AccountSet',
        Account: issuerWallet.address,
        SetFlag: 8, // asfDefaultRipple
      },
      { wallet: issuerWallet },
    );
    console.log('  ✓ DefaultRipple enabled');
    console.log('  TX:', accountSetTx.result.hash);
  } catch (err: unknown) {
    // If already set, that's fine
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('tecNO_ENTRY') || msg.includes('already')) {
      console.log('  ✓ DefaultRipple already enabled, skipping');
    } else {
      throw err;
    }
  }

  // ── Step 3: Platform sets TrustLine ───────────────────────────────────
  //
  // Before the Issuer can send GKC to Platform, Platform must opt-in
  // by creating a TrustLine (TrustSet transaction).
  // This is also what end-users will need to do to receive GKC.

  printSection('Step 3 — Platform TrustLine (opts in to receive GKC)');

  const trustSetTx = await client.submitAndWait(
    {
      TransactionType: 'TrustSet',
      Account: platformWallet.address,
      LimitAmount: {
        currency: GKC_CURRENCY,
        issuer: issuerWallet.address,
        value: TRUST_LIMIT,
      },
    },
    { wallet: platformWallet },
  );
  console.log('  ✓ TrustLine created:', GKC_CURRENCY, '/', issuerWallet.address);
  console.log('  TX:', trustSetTx.result.hash);

  // ── Step 4: Issue GKC to Platform ─────────────────────────────────────
  //
  // The Issuer sends GKC IOU to Platform. Because Platform set a TrustLine,
  // this works. The Issuer's GKC balance goes negative (it's the obligation).
  // Platform can then distribute GKC to users (who also need TrustLines).

  printSection(`Step 4 — Issue ${INITIAL_SUPPLY} GKC to Platform`);

  const issueTx = await client.submitAndWait(
    {
      TransactionType: 'Payment',
      Account: issuerWallet.address,
      Destination: platformWallet.address,
      Amount: {
        currency: GKC_CURRENCY,
        issuer: issuerWallet.address,
        value: INITIAL_SUPPLY,
      },
    },
    { wallet: issuerWallet },
  );
  console.log('  ✓ Issued', INITIAL_SUPPLY, GKC_CURRENCY, 'to Platform');
  console.log('  TX:', issueTx.result.hash);

  // ── Step 5: Verify balances ───────────────────────────────────────────

  printSection('Step 5 — Verify Balances');

  const platformBalances = await client.getBalances(platformWallet.address);
  console.log('  Platform balances:');
  for (const b of platformBalances) {
    const label = b.currency === 'XRP' ? 'XRP' : `${b.currency} (from ${b.issuer?.slice(0, 8)}...)`;
    console.log(`    ${label}: ${b.value}`);
  }

  // ── Step 6: Print .env values ─────────────────────────────────────────

  printSection('✅ Setup Complete — Copy these values to your .env file');

  console.log(`
GKC_ISSUER_ADDRESS=${issuerWallet.address}
GKC_ISSUER_SEED=${issuerWallet.seed}

PLATFORM_ADDRESS=${platformWallet.address}
PLATFORM_SEED=${platformWallet.seed}
`);

  console.log('Explorer links (Testnet):');
  console.log(`  Issuer  : https://testnet.xrpl.org/accounts/${issuerWallet.address}`);
  console.log(`  Platform: https://testnet.xrpl.org/accounts/${platformWallet.address}`);

  console.log('\n⚠️  Keep SEED values secret. Never commit them to git.');
  console.log('    .env is already in .gitignore.\n');

  await client.disconnect();
}

main().catch(err => {
  console.error('\n❌ Setup failed:', err.message ?? err);
  process.exit(1);
});
