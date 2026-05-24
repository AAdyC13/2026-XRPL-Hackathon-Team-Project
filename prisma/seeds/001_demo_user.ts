import bcrypt from "bcrypt";
import type { SeedDefinition } from "./types.js";

const DEMO_EMAIL = "demo@gkc.edu.tw";
const DEMO_PASSWORD = "Demo12345678";

export const seed001DemoUser: SeedDefinition = {
  name: "001_demo_user",
  async run({ prisma }) {
    const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (existing) {
      return "applied";
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await prisma.user.create({
      data: {
        username: "gkc_researcher",
        email: DEMO_EMAIL,
        passwordHash,
        role: "node_owner",
        xrpAddress: "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1",
        gkcBalance: 2847.52,
        xrpBalance: 128.5
      }
    });

    return "applied";
  }
};
