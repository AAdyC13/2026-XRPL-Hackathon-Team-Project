import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { UsersService } from "../users/users.service.js";
import { getTokenBalance } from "../xrpl/services/asset.service.js";
import { getXrpBalance } from "../xrpl/infrastructure/xrpl.client.js";
import { buildTrustSetTx, getTrustLines, issuerAuthorizeTrustLine, freezeTrustLine } from "../xrpl/services/trustline.service.js";
import { createWalletBindPayload, getPayloadStatus } from "../xrpl/services/xaman.service.js";
import { XrplHelperService } from "../xrpl/xrpl-helper.service.js";

@Injectable()
export class WalletService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(XrplHelperService) private readonly xrplHelperService: XrplHelperService
  ) {}

  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException({ code: "NOT_FOUND", message: "User not found." });
    }
    return user;
  }

  private async getUserAddress(userId: string) {
    const user = await this.getUser(userId);
    if (!user.xrpAddress) {
      throw new BadRequestException({ code: "INVALID_PARAMS", message: "User has no XRPL address bound." });
    }
    return user.xrpAddress;
  }

  async getWallet(userId: string) {
    const user = await this.getUser(userId);
    return {
      gkc_balance: Number(user.gkcBalance),
      xrp_balance: Number(user.xrpBalance),
      xrp_address: user.xrpAddress,
      verification_status: user.verificationStatus,
      payment_channel: null
    };
  }

  async initiateWalletBind(userId: string) {
    const user = await this.getUser(userId);

    if (user.verificationStatus !== "verified") {
      throw new ForbiddenException({ code: "NOT_VERIFIED", message: "請先完成學校信箱驗證才能綁定錢包。" });
    }

    if (user.xrpAddress) {
      throw new BadRequestException({ code: "ALREADY_BOUND", message: "已綁定錢包，請先解除綁定再重新綁定。" });
    }

    return createWalletBindPayload();
  }

  async pollWalletBind(userId: string, uuid: string) {
    const user = await this.getUser(userId);

    if (user.verificationStatus !== "verified") {
      throw new ForbiddenException({ code: "NOT_VERIFIED", message: "請先完成學校信箱驗證才能綁定錢包。" });
    }

    const status = await getPayloadStatus(uuid);

    if (!status.signed || !status.account) {
      return { bound: false, resolved: status.resolved, cancelled: status.cancelled, expired: status.expired };
    }

    const existingUser = await this.usersService.findByXrpAddress(status.account);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException({ code: "ADDRESS_TAKEN", message: "此 Xaman 錢包已被其他帳號綁定。" });
    }

    if (!user.xrpAddress) {
      await this.usersService.updateUser(userId, {
        xrpAddress: status.account,
        xamanUserToken: status.userToken ?? null
      });
    }

    return { bound: true, address: status.account };
  }

  async unbindWallet(userId: string) {
    const user = await this.getUser(userId);

    if (!user.xrpAddress) {
      throw new BadRequestException({ code: "NOT_BOUND", message: "尚未綁定錢包。" });
    }

    const balance = await getTokenBalance(user.xrpAddress).catch(() => "0");
    if (parseFloat(balance) > 0) {
      throw new BadRequestException({ code: "BALANCE_NOT_ZERO", message: "請先清空 GKC 餘額才能解除錢包綁定。" });
    }

    await freezeTrustLine(user.xrpAddress).catch(() => {});

    await this.usersService.updateUser(userId, { xrpAddress: null, xamanUserToken: null });

    return { unbound: true };
  }

  async prepareTrustline(userId: string, input: { limit?: string; signWithXaman?: boolean; userToken?: string }) {
    const user = await this.getUser(userId);

    if (user.verificationStatus !== "verified") {
      throw new ForbiddenException({ code: "NOT_VERIFIED", message: "請先完成學校信箱驗證才能建立信任鍊。" });
    }

    if (!user.xrpAddress) {
      throw new BadRequestException({ code: "NO_WALLET", message: "請先綁定 Xaman 錢包才能建立信任鍊。" });
    }

    const txjson = buildTrustSetTx({ holder: user.xrpAddress, limit: input.limit });
    return this.xrplHelperService.maybeCreateXamanPayload(
      txjson,
      input.signWithXaman,
      input.userToken ?? user.xamanUserToken ?? undefined
    );
  }

  async approveTrustLine(userId: string) {
    const user = await this.getUser(userId);

    if (!user.xrpAddress) {
      throw new BadRequestException({ code: "NO_WALLET", message: "請先綁定 Xaman 錢包。" });
    }

    const lines = await getTrustLines(user.xrpAddress);
    const hasTrustLine = lines.some(
      (l) => l.currency === "GKC" || l.currency?.toUpperCase() === "GKC"
    );
    if (!hasTrustLine) {
      throw new BadRequestException({ code: "NO_TRUSTLINE", message: "尚未偵測到 GKC TrustLine，請先在 Xaman 簽名。" });
    }

    await issuerAuthorizeTrustLine(user.xrpAddress);

    return { approved: true, address: user.xrpAddress };
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
