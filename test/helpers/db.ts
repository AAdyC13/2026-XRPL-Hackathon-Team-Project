import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const DEMO_PASSWORD = "Demo1234";
const DEMO_PASSWORD_HASH_ROUNDS = 10;

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.user.deleteMany();
}

export async function seedDemoUser(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, DEMO_PASSWORD_HASH_ROUNDS);

  await prisma.user.create({
    data: {
      id: "00000000-0000-4000-a000-000000000001",
      username: "demo_user_1",
      email: "demo_user_1@gkc.edu.tw",
      passwordHash,
      role: "node_owner",
      verificationStatus: "verified",
      verifiedAt: new Date(),
      xrpAddress: "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1"
    }
  });
}
