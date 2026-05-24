import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo12345678", 12);

  await prisma.user.upsert({
    where: { email: "demo@gkc.edu.tw" },
    create: {
      username: "gkc_researcher",
      email: "demo@gkc.edu.tw",
      passwordHash,
      role: "node_owner",
      xrpAddress: "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1",
      gkcBalance: 2847.52,
      xrpBalance: 128.5
    },
    update: {
      username: "gkc_researcher",
      passwordHash,
      role: "node_owner",
      xrpAddress: "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1",
      gkcBalance: 2847.52,
      xrpBalance: 128.5
    }
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed data", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
