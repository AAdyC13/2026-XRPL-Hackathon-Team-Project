import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "../../src/auth/auth.module.js";
import { PrismaModule } from "../../src/prisma/prisma.module.js";
import { UsersModule } from "../../src/users/users.module.js";
import { WalletModule } from "../../src/wallet/wallet.module.js";
import { XrplModule } from "../../src/xrpl/xrpl.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100000
      }
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    WalletModule,
    XrplModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class TestAppModule {}
