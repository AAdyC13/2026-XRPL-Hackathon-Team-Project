import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { getClient } from "../infrastructure/xrpl.client.js";

@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("/health")
  async health() {
    let database: "ok" | "error" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "error";
    }

    let xrpl: "connected" | "disconnected" | "error" = "disconnected";
    try {
      const client = await getClient();
      xrpl = client.isConnected() ? "connected" : "disconnected";
    } catch {
      xrpl = "error";
    }

    const ok = database === "ok";

    return {
      ok,
      data: {
        service: ok ? "ok" : "degraded",
        database,
        xrpl
      }
    };
  }
}
