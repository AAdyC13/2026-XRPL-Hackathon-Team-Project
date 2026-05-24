import type { PrismaClient } from "@prisma/client";
import type { SeedDefinition } from "./types.js";

const SEED_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS seed_migrations (
  name VARCHAR(128) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function ensureSeedMigrationsTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(SEED_MIGRATIONS_TABLE);
}

async function isSeedApplied(prisma: PrismaClient, name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM seed_migrations WHERE name = ${name} LIMIT 1
  `;
  return rows.length > 0;
}

async function recordSeedApplied(prisma: PrismaClient, name: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO seed_migrations (name) VALUES (${name})
  `;
}

export async function runVersionedSeeds(prisma: PrismaClient, seeds: SeedDefinition[]): Promise<void> {
  await ensureSeedMigrationsTable(prisma);

  for (const seed of seeds) {
    if (await isSeedApplied(prisma, seed.name)) {
      console.log(`[seed] skip ${seed.name} (already applied)`);
      continue;
    }

    console.log(`[seed] running ${seed.name}...`);
    const result = await seed.run({ prisma });

    if (result === "skipped") {
      if (seed.optional) {
        console.log(`[seed] optional ${seed.name} skipped (not recorded)`);
        continue;
      }
      throw new Error(`Seed ${seed.name} returned skipped but is not optional.`);
    }

    await recordSeedApplied(prisma, seed.name);
    console.log(`[seed] applied ${seed.name}`);
  }
}
