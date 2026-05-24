# Automated Testing Guide

本文件說明本專案的自動化測試規範、執行流程與 CI 行為。

## 測試分層

- Unit（`test/unit/`）：純邏輯測試，不依賴 HTTP 或外部服務。
- API Integration（`test/api/`）：使用 Nest + supertest 驗證 API 路由、JWT、資料庫互動。

## 本地 Merge 前 Checklist

```bash
corepack pnpm check
corepack pnpm test
```

可選加跑：

```bash
corepack pnpm build
```

## 測試環境準備

1. 啟動 PostgreSQL

```bash
docker compose up -d postgres
```

2. 建立測試環境變數檔

```bash
cp .env.test.example .env.test
```

3. 執行測試（會自動 migrate test DB）

```bash
corepack pnpm test
```

## 主要測試指令

```bash
corepack pnpm test
corepack pnpm test:api
corepack pnpm test:unit
corepack pnpm test:ci
```

## Mock 策略

- CI 與本地測試均 mock XRPL 依賴，不直接連線 Testnet。
- 目前 mock 範圍：
  - `src/xrpl/infrastructure/xrpl.client.ts`
  - `src/xrpl/services/asset.service.ts`
  - `src/xrpl/services/trustline.service.ts`
- 不 mock Prisma，API 測試使用真實 PostgreSQL（`gkc_platform_test`）。

## 測試資料策略

- 每個 API spec 在 `beforeEach` 清理 `users` 表並重建 demo user。
- demo user 與 seed 對齊：
  - Email: `demo@gkc.edu.tw`
  - Password: `Demo12345678`

## CI 規範

- `ci.yml`：在 PR / push 觸發 `check:backend + test:ci`。
- `deploy-vps.yml`：deploy 前必須先通過 `test` job，失敗即停止 build/deploy。

## 常見問題

- `DATABASE_URL is required for tests`：確認 `.env.test` 已建立，或至少有 `.env.test.example`。
- `ECONNREFUSED 5432`：確認 PostgreSQL 容器已啟動。
- `401 on protected API`：先呼叫 `/api/v1/auth/login` 取得 Bearer token。
