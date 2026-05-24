import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiExceptionFilter } from "../../src/common/filters/http-exception.filter.js";
import { PrismaService } from "../../src/prisma/prisma.service.js";
import { TestAppModule } from "./test-app.module.js";

export async function createTestApp(): Promise<{
  app: INestApplication;
  http: ReturnType<typeof request>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();

  return {
    app,
    http: request(app.getHttpServer()),
    prisma: app.get(PrismaService)
  };
}
