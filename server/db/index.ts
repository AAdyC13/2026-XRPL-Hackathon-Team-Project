import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  return url;
}

const pool = new pg.Pool({ connectionString: requireDatabaseUrl() });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function connectDb() {
  await prisma.$connect();
  console.log('[DB] PostgreSQL connected via Prisma');
}

export async function disconnectDb() {
  await prisma.$disconnect();
  await pool.end();
}
