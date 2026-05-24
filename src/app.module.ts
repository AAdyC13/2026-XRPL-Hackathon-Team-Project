import path from "node:path";
import { fileURLToPath } from "node:url";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { UsersModule } from "./users/users.module.js";
import { WalletModule } from "./wallet/wallet.module.js";
import { XrplModule } from "./xrpl/xrpl.module.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100
      }
    ]),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, "..", "dist", "public"),
      // Express 5 / path-to-regexp v8: wildcards must be named (e.g. /api/*path) or use a group.
      exclude: ["/api/(.*)", "/health"]
    }),
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
export class AppModule {}
