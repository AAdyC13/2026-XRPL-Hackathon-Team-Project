import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seeds } from "./seeds/index.js";
import { runVersionedSeeds } from "./seeds/runner.js";

const prisma = new PrismaClient();

async function main() {
  await runVersionedSeeds(prisma, seeds);
}

main()
  .catch((error) => {
    console.error("Failed to seed data", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
