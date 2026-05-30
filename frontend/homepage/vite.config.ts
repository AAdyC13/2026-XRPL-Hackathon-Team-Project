import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const port = Number(env.DEV_HOMEPAGE_PORT) || 5174;
  const dashboardOrigin = `http://localhost:${Number(env.DEV_DASHBOARD_PORT) || 5173}`;
  const apiOrigin = `http://localhost:${env.PORT ?? "3001"}`;

  return {
    plugins: [react()],
    root: __dirname,
    server: {
      port,
      // Mirror production: /app/* is the dashboard SPA (Nest fallback in src/main.ts).
      proxy: {
        "/app": dashboardOrigin,
        "/api": apiOrigin,
        "/health": apiOrigin,
        "/v1": apiOrigin,
      },
    },
    build: {
      outDir: path.resolve(repoRoot, "dist/public"),
      emptyOutDir: true,
    },
  };
});
