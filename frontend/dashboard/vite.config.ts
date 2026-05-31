import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiOrigin = `http://localhost:${env.PORT ?? "3000"}`;
  const port = Number(env.DEV_DASHBOARD_PORT) || 5173;

  return {
    base: "/app/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@shared": path.resolve(repoRoot, "shared"),
        "@assets": path.resolve(repoRoot, "attached_assets"),
      },
    },
    root: __dirname,
    server: {
      port,
      proxy: {
        "/api": apiOrigin,
        "/health": apiOrigin,
        "/v1": apiOrigin,
      },
    },
    build: {
      outDir: path.resolve(repoRoot, "dist/public/app"),
      emptyOutDir: false,
    },
  };
});
