# Database & bootstrap seeds

## Schema changes (tables, columns)

Use Prisma migrations — versioned under `prisma/migrations/`.

```bash
pnpm db:migrate          # local dev: create + apply
pnpm db:deploy           # CI / production: apply pending only
```

On VPS, the app container runs `db:deploy` before start (see `scripts/docker-entrypoint.sh`). Run seeds manually when needed: `pnpm seed:db`. The production image runs `prisma generate` at **build time** and `chown`s `/app` to the `node` user so migrate does not fail on read-only `node_modules`.

Runtime DB access uses **Prisma 6.19.x** with `@prisma/adapter-pg` — see `server/db/index.ts` (`DATABASE_URL` required).

> **Version note:** Prisma is pinned at 6.x because `@adminjs/prisma` v5 officially supports `@prisma/client` ^5 || ^6 only. `prisma/schema.prisma` declares `url = env("DATABASE_URL")` in the `datasource` block (required by Prisma 6 CLI); `prisma.config.ts` still holds migrations/seed paths.

## Bootstrap data (users, reference rows)

Script: `server/scripts/seed-db.ts` (idempotent — skips existing demo user / providers).

```bash
pnpm seed:db
```

Demo credentials（執行 seed 後）：

| 帳號 | Email | 密碼 | 角色 |
|------|-------|------|------|
| demo_user_1 | `demo_user_1@gkc.edu.tw` | `Demo1234` | `node_owner`（mock providers） |
| demo_user_2 | `demo_user_2@gkc.edu.tw` | `Demo1234` | `user` |

舊版 `demo@gkc.edu.tw` 會在 seed 時刪除。鏈上地址來自 `.env` 的 `USER1_WALLET_ADDRESS` / `USER2_WALLET_ADDRESS`。

### VPS checklist

1. `docker compose --env-file deploy.env up -d` (postgres + app; `admin-api` 需 `COMPOSE_PROFILES=admin`，見 `deploy.env`)。
2. `.env` on server with `DATABASE_URL=postgresql://gkc:gkc@postgres:5432/gkc_platform` (host **`postgres`**, not `localhost`).
3. Set `JWT_SECRET` (≥32 chars) and XRPL issuer secrets.
4. 若 secret 含 `$` 字元，在 VPS `.env` 內寫成 `$$`（Docker Compose 會把單個 `$` 當變數插值，日誌可能出現 `variable is not set` 並截斷密碼）。
5. Optional: `pnpm seed:db` inside the app container (or locally) for demo user and mock providers.
6. First start applies migrations; later deploys only run pending migrations.
7. GitHub Actions 會將成功部署的 `deploy.env` 與 `docker-compose.yml` 存為 `*.previous`；健康檢查失敗時還原兩者並回滾映像。這**不會**還原已套用的 Prisma migration；請用 forward migration 或備份還原處理 schema 漂移。

## Test database

Tests use `gkc_platform_test` (see `.env.test.example`). API tests reset `users` per case — they do not rely on production seeds.
