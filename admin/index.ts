import "./load-env.js";
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
import { AdminComponents, componentLoader } from "./components.js";
import { treasuryPageHandler } from "./treasury-page-handler.js";

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
    componentLoader,
    branding: {
      companyName: "GKC Admin",
      withMadeWithLove: false
    },
    resources: buildAdminResources(prisma),
    pages: {
      treasuryOps: {
        icon: "Money",
        component: AdminComponents.TreasuryPage,
        handler: treasuryPageHandler
      }
    },
    locale: {
      language: "zh",
      translations: {
        labels: {
          treasuryOps: "錢包調撥"
        }
      }
    }
  });

  if (adminEnv.NODE_ENV !== "production") {
    admin.watch();
  }

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

  const server = app.listen(adminEnv.ADMIN_PORT, async () => {
    auditAdminEvent("started", { port: adminEnv.ADMIN_PORT, path: adminEnv.ADMIN_PATH });
    const { getTreasuryAddresses } = await import("../server/services/treasury.js");
    const addrs = getTreasuryAddresses();
    console.log("[admin] .env treasury addresses:", {
      issuer: addrs.issuer ? `${addrs.issuer.slice(0, 8)}…` : "(unset)",
      warm: addrs.warm ? `${addrs.warm.slice(0, 8)}…` : "(unset)",
      platform: addrs.platform ? `${addrs.platform.slice(0, 8)}…` : "(unset)",
      warmEqualsPlatform: Boolean(addrs.warm && addrs.platform && addrs.warm === addrs.platform)
    });
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
