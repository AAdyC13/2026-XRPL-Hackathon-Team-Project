import bcrypt from "bcrypt";
import { adminEnv } from "./env.js";
import { auditAdminEvent } from "./audit.js";

export async function authenticateAdmin(email: string, password: string) {
  if (email !== adminEnv.ADMIN_EMAIL) {
    auditAdminEvent("login_failed", { email, reason: "email_mismatch" });
    return null;
  }

  const passwordMatches = adminEnv.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, adminEnv.ADMIN_PASSWORD_HASH)
    : password === adminEnv.ADMIN_PASSWORD;

  if (!passwordMatches) {
    auditAdminEvent("login_failed", { email, reason: "password_mismatch" });
    return null;
  }

  auditAdminEvent("login_succeeded", { email });
  return {
    email,
    role: "admin"
  };
}
