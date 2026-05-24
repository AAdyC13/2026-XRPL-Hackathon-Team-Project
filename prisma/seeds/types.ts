import type { PrismaClient } from "@prisma/client";

export type SeedContext = {
  prisma: PrismaClient;
};

export type SeedDefinition = {
  /** Unique id, e.g. 001_demo_user */
  name: string;
  /** When true, skip without recording if run() returns early (optional bootstrap). */
  optional?: boolean;
  run: (ctx: SeedContext) => Promise<"applied" | "skipped">;
};
