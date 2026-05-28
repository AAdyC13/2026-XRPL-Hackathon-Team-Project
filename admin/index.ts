import AdminJS from "adminjs";
import * as AdminJSExpress from "@adminjs/express";
import { Database, Resource } from "@adminjs/prisma";
import express from "express";
import session from "express-session";
import { adminEnv } from "./env.js";
import { authenticateAdmin } from "./auth.js";
import { auditAdminEvent } from "./audit.js";
import { adminIpAllowlist, adminRateLimit } from "./security.js";
import { createPrismaClient, disconnectPrismaClient } from "../src/prisma/create-prisma-client.js";
import { buildAdminResources } from "./resources.js";

AdminJS.registerAdapter({ Database, Resource });

const { prisma, pool } = createPrismaClient(adminEnv.DATABASE_URL);

async function bootstrap() {
  await prisma.$connect();

  const app = express();
  app.set("trust proxy", true);
  app.use(adminIpAllowlist);
  app.use(adminRateLimit);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "admin-api", ts: new Date().toISOString() });
  });

  const admin = new AdminJS({
    rootPath: adminEnv.ADMIN_PATH,
    branding: {
      companyName: "GKC Admin",
      withMadeWithLove: false
    },
    resources: buildAdminResources(prisma)
  });

  const sessionOptions: session.SessionOptions = {
    secret: adminEnv.ADMIN_COOKIE_SECRET,
    name: "gkc_admin_session",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: adminEnv.NODE_ENV === "production"
    }
  };

  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: authenticateAdmin,
      cookieName: "gkc_admin",
      cookiePassword: adminEnv.ADMIN_COOKIE_SECRET
    },
    null,
    sessionOptions
  );

  app.use(admin.options.rootPath, router);

  const server = app.listen(adminEnv.ADMIN_PORT, () => {
    auditAdminEvent("started", { port: adminEnv.ADMIN_PORT, path: adminEnv.ADMIN_PATH });
    console.log(`GKC admin console listening on http://localhost:${adminEnv.ADMIN_PORT}${adminEnv.ADMIN_PATH}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectPrismaClient({ prisma, pool });
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch(async (error) => {
  console.error("[admin] Failed to start", error);
  await disconnectPrismaClient({ prisma, pool });
  process.exit(1);
});
