import type { PrismaClient } from "@prisma/client";

export type SeedRunResult = "applied" | "skipped";

export type SeedDefinition = {
  name: string;
  optional?: boolean;
  run: (prisma: PrismaClient) => Promise<SeedRunResult>;
};
