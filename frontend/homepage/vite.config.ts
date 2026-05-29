import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const port = Number(env.DEV_HOMEPAGE_PORT) || 5174;

  return {
    plugins: [react()],
    root: __dirname,
    server: {
      port,
    },
    build: {
      outDir: path.resolve(repoRoot, "dist/public"),
      emptyOutDir: true,
    },
  };
});
