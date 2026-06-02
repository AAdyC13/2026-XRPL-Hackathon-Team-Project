import { BadRequestException, Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { NodeOsService } from "./node-os.service.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const logoutSchema = z.object({
  token: z.string().min(1)
});

@Controller("/api/v1/node-os")
export class NodeOsController {
  constructor(@Inject(NodeOsService) private readonly nodeOsService: NodeOsService) {}

  @Post("/login")
  login(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Invalid request body.",
        details: parsed.error.flatten()
      });
    }
    return this.nodeOsService.login(parsed.data.username, parsed.data.password);
  }

  @Post("/logout")
  logout(@Body() body: unknown) {
    const parsed = logoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Invalid request body.",
        details: parsed.error.flatten()
      });
    }
    return this.nodeOsService.logout(parsed.data.token);
  }

  @Get("/status")
  status() {
    return this.nodeOsService.getStatus();
  }
}
