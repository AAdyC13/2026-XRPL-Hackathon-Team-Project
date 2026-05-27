import path from "node:path";
import { fileURLToPath } from "node:url";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module.js";
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
      rootPath: path.resolve(__dirname, "..", "public"),
      // path-to-regexp v8 (Nest serve-static): use named brace wildcards — see nest sample 24-serve-static.
      exclude: ["/api/{*path}", "/health"]
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    WalletModule,
    XrplModule,
    AdminModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
