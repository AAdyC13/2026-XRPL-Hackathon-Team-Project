import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { env } from "../config/env.js";
import { createPrismaClientOptions } from "./create-prisma-client.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const { clientOptions, pool } = createPrismaClientOptions(env.DATABASE_URL);
    super(clientOptions);
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
