import bcrypt from "bcrypt";
import type { SeedDefinition } from "./types.js";

export const seed002AdminUser: SeedDefinition = {
  name: "002_admin_user",
  optional: true,
  async run({ prisma }) {
    const email = process.env.SEED_ADMIN_EMAIL?.trim();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      console.log("[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set");
      return "skipped";
    }

    if (password.length < 8) {
      throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const username = process.env.SEED_ADMIN_USERNAME?.trim() || "platform_admin";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          username,
          passwordHash,
          role: "admin"
        }
      });
      return "applied";
    }

    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: "admin"
      }
    });

    return "applied";
  }
};
