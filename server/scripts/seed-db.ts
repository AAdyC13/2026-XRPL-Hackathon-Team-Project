/**
 * server/scripts/seed-db.ts
 * ─────────────────────────────────────────────────────
 * Seeds the database with:
 *  - 1 demo user  (demo@gkc.edu.tw / Demo1234)
 *  - 6 mock AI providers (matching the frontend mock data)
 *
 * Usage: pnpm run seed:db
 * Safe to run multiple times (skips existing records).
 */

import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../db/index.js';

// ── Demo User ──────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'Demo1234';
const DEMO_EMAIL = 'demo@gkc.edu.tw';
/** Stable UUID for idempotent seed (schema uses @db.Uuid). */
const DEMO_USER_ID = '00000000-0000-4000-a000-000000000001';
// Use the GKC issuer address for demo — valid checksum, no trust line needed
const DEMO_XRP_ADDRESS = process.env.GKC_ISSUER_ADDRESS ?? 'rBeY7pzk4siwXCb6XpVGj9nZ6FcQBdyh79';

(async () => {
const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
const demoId = existingUser?.id ?? DEMO_USER_ID;
if (!existingUser) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.create({
    data: {
      id: demoId,
      username: 'gkc_researcher',
      email: DEMO_EMAIL,
      passwordHash: hash,
      role: 'node_owner',
      xrpAddress: DEMO_XRP_ADDRESS,
      gkcBalance: 2847.52,
      xrpBalance: 128.50,
    },
  });
  console.log('✓ Demo user created: demo@gkc.edu.tw / Demo1234');
} else {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.update({
    where: { id: demoId },
    data: { xrpAddress: DEMO_XRP_ADDRESS, passwordHash: hash },
  });
  console.log('· Demo user already exists — password and xrp_address refreshed');
}

// ── Mock Providers ─────────────────────────────────────────────────────────

const MOCK_PROVIDERS = [
  {
    id: '00000000-0000-4000-a000-000000000101',
    owner_id: demoId,
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
    owner_id: demoId,
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
    owner_id: demoId,
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
    owner_id: demoId,
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
    owner_id: demoId,
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
    owner_id: demoId,
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

let created = 0;
let skipped = 0;

for (const p of MOCK_PROVIDERS) {
  const exists = await prisma.aiProvider.findUnique({ where: { id: p.id } });
  if (exists) { skipped++; continue; }

  const endpointToken = `gkc_ep_mock_${p.id}`;
  await prisma.aiProvider.create({
    data: {
      id: p.id,
      ownerId: p.owner_id,
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
      endpointToken: endpointToken,
      verifiedAt: new Date(),
    },
  });
  created++;
}

console.log(`✓ Providers: ${created} created, ${skipped} skipped`);
console.log('\n✅ Seed complete. Start server: pnpm run server:dev');

await prisma.$disconnect();
})();
