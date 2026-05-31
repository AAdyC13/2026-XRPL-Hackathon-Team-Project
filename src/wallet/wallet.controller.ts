import { Body, Controller, Delete, Get, Inject, Param, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
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
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid JWT session." });
    }
    return userId;
  }

  @Get()
  async wallet(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.getWallet(this.userIdFromRequest(request));
  }

  @Post("/bind")
  async initiateWalletBind(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.initiateWalletBind(this.userIdFromRequest(request));
  }

  @Get("/bind/:uuid")
  async pollWalletBind(@Req() request: { user?: { userId?: string } }, @Param("uuid") uuid: string) {
    return this.walletService.pollWalletBind(this.userIdFromRequest(request), uuid);
  }

  @Delete("/bind")
  async unbindWallet(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.unbindWallet(this.userIdFromRequest(request));
  }

  @Post("/rebind")
  async rebindWallet(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.rebindWallet(this.userIdFromRequest(request));
  }

  @Post("/trustline")
  async trustline(@Req() request: { user?: { userId?: string } }, @Body() body: unknown) {
    const payload = parseBody(trustlineBodySchema, body);
    return this.walletService.prepareTrustline(this.userIdFromRequest(request), payload);
  }

  @Post("/trustline/approve")
  async approveTrustLine(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.approveTrustLine(this.userIdFromRequest(request));
  }

  @Get("/balance")
  async balance(@Req() request: { user?: { userId?: string } }) {
    return this.walletService.getBalance(this.userIdFromRequest(request));
  }
}
