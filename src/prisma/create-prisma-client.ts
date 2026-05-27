import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

export type PrismaClientBundle = {
  prisma: PrismaClient;
  pool: Pool;
};

export function createPrismaClientOptions(connectionString: string): {
  clientOptions: ConstructorParameters<typeof PrismaClient>[0];
  pool: Pool;
} {
  const pool = new Pool({ connectionString });
  return {
    clientOptions: { adapter: new PrismaPg(pool) },
    pool
  };
}

export function createPrismaClient(connectionString: string): PrismaClientBundle {
  const { clientOptions, pool } = createPrismaClientOptions(connectionString);
  const prisma = new PrismaClient(clientOptions);
  return { prisma, pool };
}

export async function disconnectPrismaClient({ prisma, pool }: PrismaClientBundle): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
