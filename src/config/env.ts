import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default("postgresql://gkc:gkc@localhost:5432/gkc_platform"),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).default("minimum_32_character_random_secret_for_dev"),
  JWT_EXPIRES_IN: z.string().default("86400"),
  XRPL_WSS: z.string().url().default("wss://s.altnet.rippletest.net:51233"),
  XRPL_WS_URL: z.string().url().optional(),
  GKC_ISSUER_ADDRESS: z.string().optional(),
  GKC_ISSUER_SEED: z.string().optional(),
  ISSUER_ADDRESS: z.string().optional(),
  ISSUER_SEED: z.string().optional(),
  GKC_CURRENCY: z.string().min(3).max(40).default("GKC"),
  CURRENCY_CODE: z.string().min(3).max(40).optional(),
  DEFAULT_TRUST_LIMIT: z.string().default("1000000"),
  XUMM_API_KEY: z.string().optional(),
  XUMM_API_SECRET: z.string().optional(),
  XUMM_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SCHOOL_EMAIL_DOMAIN: z.string().default("edu.tw"),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("noreply@gkc-platform.edu.tw")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const envData = parsed.data;

export const env = {
  ...envData,
  XRPL_WS_URL: envData.XRPL_WS_URL ?? envData.XRPL_WSS,
  CURRENCY_CODE: envData.CURRENCY_CODE ?? envData.GKC_CURRENCY,
  ISSUER_ADDRESS: envData.ISSUER_ADDRESS ?? envData.GKC_ISSUER_ADDRESS,
  ISSUER_SEED: envData.ISSUER_SEED ?? envData.GKC_ISSUER_SEED
};

export function requireIssuerSeed(): string {
  const seed = env.GKC_ISSUER_SEED ?? env.ISSUER_SEED;
  if (!seed) {
    throw new Error("GKC_ISSUER_SEED is required for issuer-signed Testnet operations.");
  }

  return seed;
}

export function requireIssuerAddress(): string {
  const address = env.GKC_ISSUER_ADDRESS ?? env.ISSUER_ADDRESS;
  if (!address) {
    throw new Error("GKC_ISSUER_ADDRESS is required for this operation.");
  }

  return address;
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
