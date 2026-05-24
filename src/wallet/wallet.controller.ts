import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { parseBody } from "../common/zod.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { WalletService } from "./wallet.service.js";

const trustlineBodySchema = z.object({
  limit: z.string().optional(),
  signWithXaman: z.boolean().optional(),
  userToken: z.string().optional()
});

@Controller("/api/v1/wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(@Inject(WalletService) private readonly walletService: WalletService) {}

  private userIdFromRequest(request: { user?: { userId?: string } }) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid JWT session."
      });
    }
    return userId;
  }

  @Get()
  async wallet(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.getWallet(this.userIdFromRequest(request));
  }

  @Post("/trustline")
  async trustline(@Req() request: { user?: { userId?: string } }, @Body() body: unknown) {
    const payload = parseBody(trustlineBodySchema, body);
    return this.walletService.prepareTrustline(this.userIdFromRequest(request), payload);
  }

  @Get("/balance")
  async balance(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.getBalance(this.userIdFromRequest(request));
  }
}
