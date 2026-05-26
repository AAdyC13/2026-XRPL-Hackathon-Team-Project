import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller.js";
import { WalletService } from "./wallet.service.js";
import { XrplModule } from "../xrpl/xrpl.module.js";
import { UsersModule } from "../users/users.module.js";

@Module({
  imports: [XrplModule, UsersModule],
  controllers: [WalletController],
  providers: [WalletService]
})
export class WalletModule {}
