import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDb, disconnectDb } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { providersRouter } from './routes/providers.js';
import { apiKeysRouter } from './routes/api-keys.js';
import { openaiRouter } from './routes/openai.js';
import { walletRouter } from './routes/wallet.js';
import { sessionsRouter } from './routes/sessions.js';
import { attachWebSocketServer, initMockProviders } from './services/mock-tunnel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await connectDb();

  const app = express();
  const server = createServer(app);

  attachWebSocketServer(server);
  await initMockProviders();

  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
  }));
  app.use(express.json({ limit: '4mb' }));

  // ── API Routes ──────────────────────────────────────────────────────────
  app.use('/api/v1/auth',      authRouter);
  app.use('/api/v1/admin',     adminRouter);
  app.use('/api/v1/providers', providersRouter);
  app.use('/api/v1/api-keys',  apiKeysRouter);
  app.use('/api/v1/wallet',    walletRouter);
  app.use('/api/v1/sessions',  sessionsRouter);

  // OpenAI-compatible endpoint
  app.use('/v1', openaiRouter);

  // Health check (alias /health for Docker / vite proxy)
  const healthHandler = (_req: express.Request, res: express.Response) =>
    res.json({ status: 'ok', ts: new Date().toISOString() });
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // ── Static / SPA ────────────────────────────────────────────────────────
  const staticPath = path.resolve(process.cwd(), 'dist', 'public');

  app.use(express.static(staticPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  const port = Number(process.env.PORT ?? 3000);

  server.listen(port, () => {
    console.log(`[Server] http://localhost:${port}/`);
    console.log(`[API]    http://localhost:${port}/api/v1/`);
    console.log(`[OpenAI] http://localhost:${port}/v1/chat/completions`);
  });

  process.on('SIGTERM', async () => {
    await disconnectDb();
    process.exit(0);
  });
}

startServer().catch(console.error);
