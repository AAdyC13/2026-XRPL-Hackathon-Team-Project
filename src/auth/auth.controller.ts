import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

const registerBodySchema = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

@Controller("/api/v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("/register")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(@Body() body: unknown) {
    const parsed = registerBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Invalid request body.",
        details: parsed.error.flatten()
      });
    }

    return this.authService.register(parsed.data);
  }

  @Post("/login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() body: unknown) {
    const parsed = loginBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "Invalid request body.",
        details: parsed.error.flatten()
      });
    }

    return this.authService.login(parsed.data);
  }

  @Get("/me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: { user?: { userId?: string } }) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid JWT session."
      });
    }

    return this.authService.me(userId);
  }
}
