/**
 * server/scripts/seed-db.ts
 * ─────────────────────────────────────────────────────
 * Seeds the database with:
 *  - demo_user_1 / demo_user_2（綁定 USER1/USER2 錢包地址）
 *  - 6 mock AI providers（owner = demo_user_1）
 *
 * Removes legacy demo@gkc.edu.tw on each run.
 *
 * Usage: pnpm run seed:db
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../db/index.js';

const DEMO_PASSWORD = 'Demo1234';
const LEGACY_DEMO_EMAIL = 'demo@gkc.edu.tw';
const GKC_ISSUER = process.env.GKC_ISSUER_ADDRESS?.trim();

const DEMO_USER_1_ID = '00000000-0000-4000-a000-000000000001';
const DEMO_USER_2_ID = '00000000-0000-4000-a000-000000000002';

type DemoUserSeed = {
  id: string;
  username: string;
  email: string;
  role: string;
  xrpAddressEnv: string;
};

const DEMO_USERS: DemoUserSeed[] = [
  {
    id: DEMO_USER_1_ID,
    username: 'demo_user_1',
    email: 'demo_user_1@gkc.edu.tw',
    role: 'node_owner',
    xrpAddressEnv: 'USER1_WALLET_ADDRESS',
  },
  {
    id: DEMO_USER_2_ID,
    username: 'demo_user_2',
    email: 'demo_user_2@gkc.edu.tw',
    role: 'user',
    xrpAddressEnv: 'USER2_WALLET_ADDRESS',
  },
];

function resolveUserXrpAddress(envKey: string): string | null {
  const address = process.env[envKey]?.trim();
  if (!address) {
    console.warn(`· ${envKey} 未設定 — 對應帳號 xrp_address 留空`);
    return null;
  }
  if (GKC_ISSUER && address === GKC_ISSUER) {
    console.warn(`· ${envKey} 不可與 GKC_ISSUER_ADDRESS 相同`);
    return null;
  }
  return address;
}

/** Delete rows that reference users without onDelete: Cascade. */
async function purgeUserDependents(userId: string): Promise<void> {
  await prisma.inferenceRecord.deleteMany({ where: { userId } });
  await prisma.inferenceSession.deleteMany({ where: { userId } });
  await prisma.paymentChannel.deleteMany({ where: { userId } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.deposit.deleteMany({ where: { userId } });
  await prisma.userCheck.deleteMany({ where: { userId } });
  await prisma.apiKey.deleteMany({ where: { userId } });
  await prisma.gpuNode.deleteMany({ where: { ownerId: userId } });
  await prisma.aiProvider.deleteMany({ where: { ownerId: userId } });
}

async function removeLegacyDemoUser(): Promise<void> {
  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_DEMO_EMAIL } });
  if (!legacy) return;

  await purgeUserDependents(legacy.id);
  await prisma.user.delete({ where: { id: legacy.id } });
  console.log(`✓ Removed legacy account: ${LEGACY_DEMO_EMAIL}`);
}

async function upsertDemoUser(def: DemoUserSeed, passwordHash: string): Promise<void> {
  const xrpAddress = resolveUserXrpAddress(def.xrpAddressEnv);
  const existing = await prisma.user.findUnique({ where: { email: def.email } });

  const baseData = {
    username: def.username,
    passwordHash,
    role: def.role,
    verificationStatus: 'verified' as const,
    verifiedAt: new Date(),
    isActive: true,
    ...(xrpAddress !== null ? { xrpAddress } : {}),
  };

  if (!existing) {
    await prisma.user.create({
      data: {
        id: def.id,
        email: def.email,
        ...baseData,
        xrpAddress: xrpAddress ?? undefined,
      },
    });
    console.log(`✓ Created ${def.email} / ${DEMO_PASSWORD}`);
    return;
  }

  const xrpAddressUpdate =
    xrpAddress ??
    (GKC_ISSUER && existing.xrpAddress === GKC_ISSUER ? null : undefined);

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      ...baseData,
      ...(xrpAddressUpdate !== undefined ? { xrpAddress: xrpAddressUpdate } : {}),
    },
  });
  console.log(
    `· ${def.email} already exists — refreshed` +
      (xrpAddressUpdate !== undefined
        ? `, xrp_address → ${xrpAddressUpdate ?? '(cleared)'}`
        : ''),
  );
}

// ── Mock Providers (owner = demo_user_1) ───────────────────────────────────

const MOCK_PROVIDERS = [
  {
    id: '00000000-0000-4000-a000-000000000101',
    display_name: 'TaiwanAI Node #1',
    gpu_type: 'RTX 4090',
    vram_gb: 24,
    models: ['llama3:8b', 'llama3:70b', 'mistral:7b'],
    price_input_per_1k: 0.001,
    price_output_per_1k: 0.002,
    tokens_per_sec: 142,
    first_token_ms: 380,
    uptime_30d: 0.987,
    avg_rating: 4.9,
    total_requests: 18423,
    status: 'online',
    current_load: 2,
    max_concurrent: 8,
  },
  {
    id: '00000000-0000-4000-a000-000000000102',
    display_name: 'NTHU Research GPU',
    gpu_type: 'A100 80G',
    vram_gb: 80,
    models: ['llama3:70b', 'codellama:34b', 'mixtral:8x7b'],
    price_input_per_1k: 0.003,
    price_output_per_1k: 0.006,
    tokens_per_sec: 89,
    first_token_ms: 520,
    uptime_30d: 0.999,
    avg_rating: 4.8,
    total_requests: 9211,
    status: 'online',
    current_load: 3,
    max_concurrent: 4,
  },
  {
    id: '00000000-0000-4000-a000-000000000103',
    display_name: 'Home Server Pro',
    gpu_type: 'RTX 3090',
    vram_gb: 24,
    models: ['llama3:8b', 'phi3:mini', 'gemma:7b'],
    price_input_per_1k: 0.0008,
    price_output_per_1k: 0.0015,
    tokens_per_sec: 98,
    first_token_ms: 290,
    uptime_30d: 0.921,
    avg_rating: 4.5,
    total_requests: 31004,
    status: 'online',
    current_load: 5,
    max_concurrent: 6,
  },
  {
    id: '00000000-0000-4000-a000-000000000104',
    display_name: 'Enterprise H100',
    gpu_type: 'H100 SXM',
    vram_gb: 80,
    models: ['llama3:70b', 'mixtral:8x22b', 'codellama:70b'],
    price_input_per_1k: 0.005,
    price_output_per_1k: 0.010,
    tokens_per_sec: 310,
    first_token_ms: 180,
    uptime_30d: 0.995,
    avg_rating: 5.0,
    total_requests: 5832,
    status: 'online',
    current_load: 1,
    max_concurrent: 16,
  },
  {
    id: '00000000-0000-4000-a000-000000000105',
    display_name: 'Budget Node Taiwan',
    gpu_type: 'RTX 4080 Super',
    vram_gb: 16,
    models: ['llama3:8b', 'mistral:7b', 'phi3:mini'],
    price_input_per_1k: 0.0006,
    price_output_per_1k: 0.0012,
    tokens_per_sec: 115,
    first_token_ms: 340,
    uptime_30d: 0.943,
    avg_rating: 4.3,
    total_requests: 44201,
    status: 'online',
    current_load: 6,
    max_concurrent: 8,
  },
  {
    id: '00000000-0000-4000-a000-000000000106',
    display_name: 'Student Lab GPU',
    gpu_type: 'RTX 3080 Ti',
    vram_gb: 12,
    models: ['llama3:8b', 'gemma:7b'],
    price_input_per_1k: 0.0005,
    price_output_per_1k: 0.001,
    tokens_per_sec: 76,
    first_token_ms: 420,
    uptime_30d: 0.872,
    avg_rating: 4.1,
    total_requests: 7803,
    status: 'online',
    current_load: 0,
    max_concurrent: 4,
  },
];

(async () => {
  await removeLegacyDemoUser();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of DEMO_USERS) {
    await upsertDemoUser(user, passwordHash);
  }

  let created = 0;
  let skipped = 0;

  for (const p of MOCK_PROVIDERS) {
    const exists = await prisma.aiProvider.findUnique({ where: { id: p.id } });
    if (exists) {
      if (exists.ownerId !== DEMO_USER_1_ID) {
        await prisma.aiProvider.update({
          where: { id: p.id },
          data: { ownerId: DEMO_USER_1_ID },
        });
        console.log(`· Provider ${p.display_name}: owner → demo_user_1`);
      }
      skipped++;
      continue;
    }

    await prisma.aiProvider.create({
      data: {
        id: p.id,
        ownerId: DEMO_USER_1_ID,
        displayName: p.display_name,
        gpuType: p.gpu_type,
        vramGb: p.vram_gb,
        models: JSON.stringify(p.models),
        priceInputPer1k: p.price_input_per_1k,
        priceOutputPer1k: p.price_output_per_1k,
        tokensPerSec: p.tokens_per_sec,
        firstTokenMs: p.first_token_ms,
        uptime30d: p.uptime_30d,
        avgRating: p.avg_rating,
        totalRequests: p.total_requests,
        status: p.status,
        currentLoad: p.current_load,
        maxConcurrent: p.max_concurrent,
        endpointToken: `gkc_ep_mock_${p.id}`,
        verifiedAt: new Date(),
      },
    });
    created++;
  }

  console.log(`✓ Providers: ${created} created, ${skipped} skipped`);
  console.log('\n✅ Seed complete.');
  console.log('   demo_user_1@gkc.edu.tw / Demo1234  (node_owner, mock providers)');
  console.log('   demo_user_2@gkc.edu.tw / Demo1234  (user)');

  await prisma.$disconnect();
})();
