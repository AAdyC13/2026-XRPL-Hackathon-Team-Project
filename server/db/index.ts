import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDb() {
  await prisma.$connect();
  console.log('[DB] PostgreSQL connected via Prisma');
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
