import { execSync } from "node:child_process";
import dotenv from "dotenv";
import { Client } from "pg";

function getDatabaseName(connectionString: string): string {
  const parsed = new URL(connectionString);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(`Invalid DATABASE_URL database name: ${databaseName}`);
  }
  return databaseName;
}

async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const parsed = new URL(connectionString);
  const databaseName = getDatabaseName(connectionString);
  parsed.pathname = "/postgres";

  const client = new Client({ connectionString: parsed.toString() });
  await client.connect();

  try {
    const checkResult = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (checkResult.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: ".env.test" });
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env.test.example" });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for tests.");
  }

  await ensureDatabaseExists(databaseUrl);
  execSync("corepack pnpm prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
}
