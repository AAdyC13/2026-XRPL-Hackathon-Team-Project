import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { runVersionedSeeds } from "../../prisma/seeds/runner.js";
import type { SeedDefinition } from "../../prisma/seeds/types.js";

function createMockPrisma(applied: Set<string>) {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn(async (_strings: TemplateStringsArray, name?: string) => {
      if (name && applied.has(name)) {
        return [{ name }];
      }
      return [];
    }),
    $executeRaw: vi.fn(async (_strings: TemplateStringsArray, name?: string) => {
      if (name) {
        applied.add(name);
      }
    })
  } as unknown as PrismaClient;
}

describe("runVersionedSeeds", () => {
  it("runs only seeds that are not yet recorded", async () => {
    const applied = new Set<string>();
    const prisma = createMockPrisma(applied);
    const runA = vi.fn(async () => "applied" as const);
    const runB = vi.fn(async () => "applied" as const);

    const seeds: SeedDefinition[] = [
      { name: "001_a", run: runA },
      { name: "002_b", run: runB }
    ];

    await runVersionedSeeds(prisma, seeds);

    expect(runA).toHaveBeenCalledTimes(1);
    expect(runB).toHaveBeenCalledTimes(1);
    expect(applied.has("001_a")).toBe(true);
    expect(applied.has("002_b")).toBe(true);

    await runVersionedSeeds(prisma, seeds);

    expect(runA).toHaveBeenCalledTimes(1);
    expect(runB).toHaveBeenCalledTimes(1);
  });

  it("does not record optional seeds that return skipped", async () => {
    const applied = new Set<string>();
    const prisma = createMockPrisma(applied);
    const runOptional = vi.fn(async () => "skipped" as const);

    await runVersionedSeeds(prisma, [
      { name: "002_admin_user", optional: true, run: runOptional }
    ]);

    expect(runOptional).toHaveBeenCalledTimes(1);
    expect(applied.has("002_admin_user")).toBe(false);
  });
});
