import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";
import { ApiExceptionFilter } from "./common/filters/http-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalFilters(new ApiExceptionFilter());

  await app.listen(env.PORT);
  console.log(`A platform API listening on http://localhost:${env.PORT}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
