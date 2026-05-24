import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default("postgresql://gkc:gkc@localhost:5432/gkc_platform"),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).default("minimum_32_character_random_secret_for_dev"),
  JWT_EXPIRES_IN: z.string().default("86400"),
  XRPL_WS_URL: z.string().url().default("wss://s.altnet.rippletest.net:51233"),
  ISSUER_ADDRESS: z.string().optional(),
  ISSUER_SEED: z.string().optional(),
  CURRENCY_CODE: z.string().min(3).max(40).default("GKC"),
  DEFAULT_TRUST_LIMIT: z.string().default("1000000"),
  XUMM_API_KEY: z.string().optional(),
  XUMM_API_SECRET: z.string().optional(),
  XUMM_WEBHOOK_URL: z.string().url().optional().or(z.literal(""))
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export function requireIssuerSeed(): string {
  if (!env.ISSUER_SEED) {
    throw new Error("ISSUER_SEED is required for issuer-signed Testnet operations.");
  }

  return env.ISSUER_SEED;
}

export function requireIssuerAddress(): string {
  if (!env.ISSUER_ADDRESS) {
    throw new Error("ISSUER_ADDRESS is required for this operation.");
  }

  return env.ISSUER_ADDRESS;
}

export function requireXummCredentials(): { apiKey: string; apiSecret: string } {
  if (!env.XUMM_API_KEY || !env.XUMM_API_SECRET) {
    throw new Error("XUMM_API_KEY and XUMM_API_SECRET are required for Xaman payloads.");
  }

  return {
    apiKey: env.XUMM_API_KEY,
    apiSecret: env.XUMM_API_SECRET
  };
}
