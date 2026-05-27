import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const DEMO_PASSWORD = "Demo12345678";
const DEMO_PASSWORD_HASH_ROUNDS = 12;

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.user.deleteMany();
}

export async function seedDemoUser(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, DEMO_PASSWORD_HASH_ROUNDS);

  await prisma.user.create({
    data: {
      username: "gkc_researcher",
      email: "demo@gkc.edu.tw",
      passwordHash,
      role: "node_owner",
      verificationStatus: "verified",
      xrpAddress: "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1",
      gkcBalance: 2847.52,
      xrpBalance: 128.5
    }
  });
}
