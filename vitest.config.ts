import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    }
  },
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
    setupFiles: ["test/setup.ts"],
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
