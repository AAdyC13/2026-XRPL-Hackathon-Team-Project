import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller.js";
import { XrplAssetController } from "./controllers/asset.controller.js";
import { XrplDexController } from "./controllers/dex.controller.js";
import { XrplEscrowController } from "./controllers/escrow.controller.js";
import { XrplTrustlineController } from "./controllers/trustline.controller.js";
import { XrplXamanController } from "./controllers/xaman.controller.js";
import { XrplHelperService } from "./xrpl-helper.service.js";

@Module({
  controllers: [
    HealthController,
    XrplTrustlineController,
    XrplAssetController,
    XrplDexController,
    XrplEscrowController,
    XrplXamanController
  ],
  providers: [XrplHelperService],
  exports: [XrplHelperService]
})
export class XrplModule {}
