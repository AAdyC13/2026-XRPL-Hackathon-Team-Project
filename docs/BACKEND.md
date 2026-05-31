# 後端執行架構

本文件描述目前 production 與 CI 使用的後端形態，供部署與除錯參考。

## 執行模型

主要 app 程序由 **NestJS 11** 啟動，並掛載部分 **Express 路由**（`server/legacy/`）與靜態前端（`dist/public/` 官網 + `dist/public/app/` Dashboard）。內部管理後台由獨立 **AdminJS admin-api** 程序啟動，共用 PostgreSQL，但不掛進使用者 app 流量。

| 層級 | 路徑 | 職責 |
|------|------|------|
| 進入點 | `src/main.ts` | `NestFactory.create`、全域 filter、JSON body、`createLegacyApp()`、靜態檔、WebSocket mock tunnel |
| Admin 進入點 | `admin/index.ts` | AdminJS console、獨立登入、User 審核 action、健康檢查 |
| Nest 模組 | `src/` | Auth、Admin、Wallet、XRPL（asset/dex/escrow/trustline/xaman/health）、Prisma |
| Legacy 路由 | `server/legacy/create-legacy-app.ts` | Providers、API Keys、Sessions、Wallet（部分）、OpenAI 相容 `/v1` |
| 共用服務 | `server/services/`、`server/db/` | XRPL 客戶端、mock tunnel、Prisma 連線（過渡期仍由此引用） |

Production app 啟動：`node dist/src/main.js`（見 `package.json` 的 `start`）。Admin 啟動：`node dist/admin/index.js`（見 `admin:start`）。

開發：`pnpm frontend` = 官網 Vite（`:5174`）+ Dashboard Vite（`:5173/app`）；`pnpm backend` = `nest start --watch`。Admin console：`pnpm admin:dev`，預設 `http://localhost:3002/admin`。

## 建置與映像

```bash
pnpm build   # prisma generate → nest build → admin tsc → pnpm build:frontend
```

- 後端編譯輸出：`dist/src/`、`dist/server/`（legacy 一併編譯）、`dist/admin/`
- 前端輸出：`dist/public/`（官網 `index.html`）+ `dist/public/app/`（Dashboard SPA）
- `FRONTEND_URL` 須含 `/app` 後綴（供 XUMM `return_url`）
- Docker：[`Dockerfile`](../Dockerfile) builder 跑 `pnpm build`；runner 可執行 [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh)（`db:deploy` → `pnpm start`）或 `pnpm admin:start`

## 環境變數

以 [`src/config/env.ts`](../src/config/env.ts) 為準，支援 `.env.example` 命名（`XRPL_WSS`、`GKC_ISSUER_*` 等）。VPS 的 `DATABASE_URL` 主機名須為 Compose 服務 `postgres`，見 [DATABASE.md](./DATABASE.md)。

## 資料庫

- Schema：`prisma/schema.prisma`
- ORM：**Prisma 6.19.x** + `@prisma/adapter-pg`（為相容 `@adminjs/prisma` v5 而固定於 6.x，見 [DATABASE.md](./DATABASE.md)）
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

測試 DB：`gkc_platform_test`；demo 密碼 `Demo1234`（與 `test/helpers/db.ts`、seed 一致）。

## CI / CD

| Workflow | 觸發 | 行為 |
|----------|------|------|
| [`ci.yml`](../.github/workflows/ci.yml) | PR、`main`、`backend` | migrate test DB → `pnpm check` → `pnpm test:api` |
| [`deploy-vps.yml`](../.github/workflows/deploy-vps.yml) | `main`、手動 | test → build/push GHCR → SSH deploy |

VPS deploy（[`scripts/vps-post-deploy.sh`](../scripts/vps-post-deploy.sh)）：

1. 部署前將現行 `deploy.env` 與 `docker-compose.yml` 存為 `*.previous`
2. `deploy.env` 含 `IMAGE_TAG`（commit SHA）與 `COMPOSE_PROFILES=admin`（啟用 `admin-api` profile）
3. 首次健康檢查前預設暖機 **50s**（`db:deploy` + Nest 啟動），之後每 20s 重試，連續 4 次失敗才判定失敗
4. 失敗 → 還原 `*.previous` 並 `compose up`；成功 → 將本次狀態寫入 `*.previous`

`docker-compose.yml` 同映像可啟動 `app` 與 `admin-api`（profile `admin`）兩個服務。回滾到不含 AdminJS 的舊映像時，不會啟動 `admin-api`。`admin-api` 預設綁定 `127.0.1.3:3002`，建議由反向代理映射到獨立 admin 網域並加 IP allowlist / VPN。操作細節見 [ADMINJS.md](./ADMINJS.md)。

## API 文件

- 平台 API：[GKC-PLATFORM-API.md](./GKC-PLATFORM-API.md)
- AdminJS 管理後台：[ADMINJS.md](./ADMINJS.md)
- 功能與模組變更摘要：[CHANGELOG.md](../CHANGELOG.md)
