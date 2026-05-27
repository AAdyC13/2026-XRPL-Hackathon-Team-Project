import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  ADMIN_PORT: z.coerce.number().int().positive().default(3002),
  ADMIN_PATH: z.string().default("/admin"),
  DATABASE_URL: z.string().min(1).default("postgresql://gkc:gkc@localhost:5432/gkc_platform"),
  ADMIN_EMAIL: z.string().email().default("admin@gkc.local"),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_COOKIE_SECRET: z.string().min(32).optional(),
  ADMIN_IP_ALLOWLIST: z.string().optional(),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[admin] Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

if (data.NODE_ENV === "production") {
  if (!data.ADMIN_PASSWORD && !data.ADMIN_PASSWORD_HASH) {
    throw new Error("ADMIN_PASSWORD or ADMIN_PASSWORD_HASH is required in production.");
  }
  if (!data.ADMIN_COOKIE_SECRET) {
    throw new Error("ADMIN_COOKIE_SECRET is required in production.");
  }
}

export const adminEnv = {
  ...data,
  ADMIN_COOKIE_SECRET:
    data.ADMIN_COOKIE_SECRET ?? "dev_admin_cookie_secret_change_me_32_chars",
  ADMIN_PASSWORD: data.ADMIN_PASSWORD ?? "Demo12345678"
};
