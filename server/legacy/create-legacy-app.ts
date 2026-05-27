import express from 'express';
import { apiKeysRouter } from '../routes/api-keys.js';
import { openaiRouter } from '../routes/openai.js';
import { providersRouter } from '../routes/providers.js';
import { sessionsRouter } from '../routes/sessions.js';
import { walletRouter } from '../routes/wallet.js';

export function createLegacyApp() {
  const app = express.Router();

  app.use('/api/v1/providers', providersRouter);
  app.use('/api/v1/api-keys', apiKeysRouter);
  app.use('/api/v1/sessions', sessionsRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/v1', openaiRouter);

  return app;
}
