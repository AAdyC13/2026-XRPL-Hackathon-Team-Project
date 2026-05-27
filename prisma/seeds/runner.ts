import type { PrismaClient } from "@prisma/client";
import type { SeedDefinition } from "./types.js";

async function isSeedApplied(prisma: PrismaClient, name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM "_seed_history" WHERE name = ${name}
  `;
  return rows.length > 0;
}

async function recordSeedApplied(prisma: PrismaClient, name: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "_seed_history" (name, applied_at)
    VALUES (${name}, NOW())
    ON CONFLICT (name) DO NOTHING
  `;
}

export async function runVersionedSeeds(
  prisma: PrismaClient,
  seeds: SeedDefinition[]
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_seed_history" (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const seed of seeds) {
    if (await isSeedApplied(prisma, seed.name)) {
      continue;
    }

    const result = await seed.run(prisma);
    if (result === "skipped" && seed.optional) {
      continue;
    }

    if (result === "applied") {
      await recordSeedApplied(prisma, seed.name);
    }
  }
}
