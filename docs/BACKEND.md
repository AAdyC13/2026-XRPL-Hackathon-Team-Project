# 後端執行架構

本文件描述目前 production 與 CI 使用的後端形態，供部署與除錯參考。

## 執行模型

單一 Node 程序由 **NestJS 11** 啟動，並掛載部分 **Express 路由**（`server/legacy/`）與靜態前端（`dist/public`）。

| 層級 | 路徑 | 職責 |
|------|------|------|
| 進入點 | `src/main.ts` | `NestFactory.create`、全域 filter、JSON body、`createLegacyApp()`、靜態檔、WebSocket mock tunnel |
| Nest 模組 | `src/` | Auth、Admin、Wallet、XRPL（asset/dex/escrow/trustline/xaman/health）、Prisma |
| Legacy 路由 | `server/legacy/create-legacy-app.ts` | Providers、API Keys、Sessions、Wallet（部分）、OpenAI 相容 `/v1` |
| 共用服務 | `server/services/`、`server/db/` | XRPL 客戶端、mock tunnel、Prisma 連線（過渡期仍由此引用） |

Production 啟動：`node dist/src/main.js`（見 `package.json` 的 `start`）。

開發：`pnpm dev` = `nest start --watch` + Vite。

## 建置與映像

```bash
pnpm build   # prisma generate → nest build → vite build
```

- 後端編譯輸出：`dist/src/`、`dist/server/`（legacy 一併編譯）
- 前端輸出：`dist/public/`
- Docker：[`Dockerfile`](../Dockerfile) builder 跑 `pnpm build`；runner 執行 [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh)（`db:deploy` → `pnpm start`）

## 環境變數

以 [`src/config/env.ts`](../src/config/env.ts) 為準，支援 `.env.example` 命名（`XRPL_WSS`、`GKC_ISSUER_*` 等）。VPS 的 `DATABASE_URL` 主機名須為 Compose 服務 `postgres`，見 [DATABASE.md](./DATABASE.md)。

## 資料庫

- Schema：`prisma/schema.prisma`
- 版本化 migration：`prisma/migrations/`（`pnpm db:migrate` 本地、`pnpm db:deploy` CI/VPS）
- Bootstrap 資料：`pnpm seed:db`（`server/scripts/seed-db.ts`，可重複執行）

**部署回滾僅還原 app 映像 tag**，不會還原已套用的 migration。破壞性 schema 變更應採 expand/contract 或事先備份。

## 自動化測試

見 [TESTING.md](./TESTING.md)。

| 指令 | 用途 |
|------|------|
| `pnpm check` | 後端 + 前端型別檢查 |
| `pnpm test` | Vitest 全量（unit + api） |
| `pnpm test:api` | Health + Auth API（CI 使用） |

測試 DB：`gkc_platform_test`；demo 密碼 `Demo12345678`（與 `test/helpers/db.ts` 一致）。

## CI / CD

| Workflow | 觸發 | 行為 |
|----------|------|------|
| [`ci.yml`](../.github/workflows/ci.yml) | PR、`main`、`backend` | migrate test DB → `pnpm check` → `pnpm test:api` |
| [`deploy-vps.yml`](../.github/workflows/deploy-vps.yml) | `main`、手動 | test → build/push GHCR → SSH deploy |

VPS deploy（[`scripts/vps-post-deploy.sh`](../scripts/vps-post-deploy.sh)）：

1. 部署前將現行 `deploy.env` 存為 `deploy.env.previous`
2. `docker compose up` 新 `IMAGE_TAG`（commit SHA）
3. **3 分鐘觀察期**（每 20s）：`app`/`postgres` running、`RestartCount` 增量、容器內 `GET /health`（`ok` 且 `database: ok`）
4. 失敗 → 回滾 `deploy.env.previous` 並讓 workflow 失敗；成功 → 將本次 tag 寫入 `deploy.env.previous`

## API 文件

- 平台 API：[GKC-PLATFORM-API.md](./GKC-PLATFORM-API.md)
- 功能與模組變更摘要：[CHANGELOG.md](../CHANGELOG.md)
