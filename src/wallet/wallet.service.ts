import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { getTokenBalance } from "../xrpl/services/asset.service.js";
import { getXrpBalance } from "../xrpl/infrastructure/xrpl.client.js";
import { buildTrustSetTx, getTrustLines } from "../xrpl/services/trustline.service.js";
import { XrplHelperService } from "../xrpl/xrpl-helper.service.js";

@Injectable()
export class WalletService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(XrplHelperService) private readonly xrplHelperService: XrplHelperService
  ) {}

  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException({
        code: "NOT_FOUND",
        message: "User not found."
      });
    }
    return user;
  }

  private async getUserAddress(userId: string) {
    const user = await this.getUser(userId);
    if (!user.xrpAddress) {
      throw new BadRequestException({
        code: "INVALID_PARAMS",
        message: "User has no XRPL address bound."
      });
    }
    return user.xrpAddress;
  }

  async getWallet(userId: string) {
    const user = await this.getUser(userId);
    return {
      gkc_balance: Number(user.gkcBalance),
      xrp_balance: Number(user.xrpBalance),
      xrp_address: user.xrpAddress,
      payment_channel: null
    };
  }

  async prepareTrustline(userId: string, input: { limit?: string; signWithXaman?: boolean; userToken?: string }) {
    const account = await this.getUserAddress(userId);
    const txjson = buildTrustSetTx({ holder: account, limit: input.limit });
    return this.xrplHelperService.maybeCreateXamanPayload(txjson, input.signWithXaman, input.userToken);
  }

  async getBalance(userId: string) {
    const account = await this.getUserAddress(userId);
    const [gkcBalance, xrpBalance, lines] = await Promise.all([
      getTokenBalance(account),
      getXrpBalance(account),
      getTrustLines(account)
    ]);

    return {
      account,
      gkc_balance: gkcBalance,
      xrp_balance: xrpBalance,
      lines
    };
  }
}
