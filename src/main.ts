import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import path from "node:path";
import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";
import { ApiExceptionFilter } from "./common/filters/http-exception.filter.js";
import { createLegacyApp } from "../server/legacy/create-legacy-app.js";
import { connectDb, disconnectDb } from "../server/db/index.js";
import { attachWebSocketServer, initMockProviders } from "../server/services/mock-tunnel.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  app.useGlobalFilters(new ApiExceptionFilter());

  // Legacy Express routers (createLegacyApp) require body parsing middleware explicitly.
  app.use(express.json({ limit: "4mb" }));
  app.use(createLegacyApp());

  const staticPath = path.resolve(process.cwd(), "dist", "public");
  app.use(express.static(staticPath));

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get(["/app", "/app/*"], (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(staticPath, "app", "index.html"));
  });

  await connectDb();
  attachWebSocketServer(app.getHttpServer());
  await initMockProviders();

  await app.listen(env.PORT);
  console.log(`A platform API listening on http://localhost:${env.PORT}`);

  process.on("SIGTERM", async () => {
    await disconnectDb();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
