import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { apiKeysRouter } from "../../server/routes/api-keys.js";
import { openaiRouter } from "../../server/routes/openai.js";
import { providersRouter } from "../../server/routes/providers.js";
import { sessionsRouter } from "../../server/routes/sessions.js";

@Module({})
export class InferenceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(providersRouter)
      .forRoutes({ path: "api/v1/providers", method: RequestMethod.ALL });
    consumer
      .apply(apiKeysRouter)
      .forRoutes({ path: "api/v1/api-keys", method: RequestMethod.ALL });
    consumer
      .apply(sessionsRouter)
      .forRoutes({ path: "api/v1/sessions", method: RequestMethod.ALL });
    consumer
      .apply(openaiRouter)
      .forRoutes({ path: "v1", method: RequestMethod.ALL });
  }
}
