import "dotenv/config";
import { seeds } from "./seeds/index.js";
import { runVersionedSeeds } from "./seeds/runner.js";
import { createPrismaClient, disconnectPrismaClient } from "../src/prisma/create-prisma-client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run seeds.");
  process.exit(1);
}

const bundle = createPrismaClient(databaseUrl);

async function main() {
  await runVersionedSeeds(bundle.prisma, seeds);
}

main()
  .catch((error) => {
    console.error("Failed to seed data", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrismaClient(bundle);
  });
