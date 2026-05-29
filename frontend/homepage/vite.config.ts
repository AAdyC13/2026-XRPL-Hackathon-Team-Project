import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    port: 5174,
  },
  build: {
    outDir: path.resolve(repoRoot, "dist/public"),
    emptyOutDir: true,
  },
});
