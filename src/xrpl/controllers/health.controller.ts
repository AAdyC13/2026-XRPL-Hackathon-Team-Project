import { Controller, Get } from "@nestjs/common";
import { getClient } from "../infrastructure/xrpl.client.js";

@Controller()
export class HealthController {
  @Get("/health")
  async health() {
    const client = await getClient();
    return {
      ok: true,
      data: {
        service: "ok",
        xrpl: client.isConnected() ? "connected" : "disconnected"
      }
    };
  }
}
