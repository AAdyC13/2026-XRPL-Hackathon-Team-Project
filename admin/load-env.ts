/**
 * Load project-root .env before any XRPL / treasury code reads process.env.
 * admin-api 的 cwd 不一定是 repo 根目錄，不可只依賴 dotenv 預設路徑。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const adminDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(adminDir, "..");

const result = dotenv.config({ path: path.join(projectRoot, ".env") });

if (result.error && (result.error as NodeJS.ErrnoException).code !== "ENOENT") {
  console.warn("[admin] dotenv:", result.error.message);
}
