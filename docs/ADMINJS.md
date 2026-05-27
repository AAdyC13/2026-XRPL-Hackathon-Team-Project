# AdminJS 管理後台

本專案使用獨立 `admin-api` 服務提供 AdminJS console。第一期只開放 `users` 帳號管理，不開放交易、充值、推論消費等營運表的直接 CRUD。

與使用者 app（NestJS `src/`）分離：admin-api 有自己的 Express 進入點（`admin/index.ts`）、session 登入與 IP/rate limit，直接透過 Prisma 讀寫 PostgreSQL，不走 `/api/v1/admin/*` JWT API。

## 依賴與版本

| 套件 | 版本 | 備註 |
|------|------|------|
| `adminjs` | 7.x | 內建 React admin UI |
| `@adminjs/prisma` | 5.x | 官方僅支援 `@prisma/client` ^5 \|\| ^6 |
| `prisma` / `@prisma/client` | **6.19.x** | 專案固定於 6.x 以相容 adapter |
| `@tiptap/extension-*` | 2.1.13 | 透過 `pnpm-workspace.yaml` overrides 鎖版，避免 AdminJS 內建 editor 衝突 |

建置時 `pnpm build` 會一併編譯 `admin/` → `dist/admin/`。

## 本地啟動

```bash
pnpm admin:dev
```

預設網址：`http://localhost:3002/admin`

## 環境變數

| 變數 | 用途 |
|------|------|
| `ADMIN_PORT` | admin-api port，預設 `3002` |
| `ADMIN_PATH` | AdminJS root path，預設 `/admin` |
| `ADMIN_EMAIL` | 管理員登入 email |
| `ADMIN_PASSWORD` | 開發用明文密碼 |
| `ADMIN_PASSWORD_HASH` | 生產建議使用 bcrypt hash |
| `ADMIN_COOKIE_SECRET` | admin session cookie secret |
| `ADMIN_IP_ALLOWLIST` | 選填，逗號分隔 IP 白名單 |
| `ADMIN_RATE_LIMIT_MAX` | 每 IP 每分鐘請求上限 |

## User 欄位策略

| 欄位 | 策略 |
|------|------|
| `verificationStatus` | 可編輯 |
| `role` | 可編輯 |
| `isActive` | 可編輯 |
| `id`, `email`, `username`, `createdAt`, `updatedAt` | 唯讀 |
| `passwordHash`, `xamanUserToken` | 隱藏 |

## 自訂操作

| Action | 效果 |
|--------|------|
| `approve` | `verificationStatus = verified`, 設定 `verifiedAt` |
| `reject` | `verificationStatus = rejected`, 清空 `verifiedAt` |
| `reset` | `verificationStatus = pending`, 清空 `verifiedAt` |
| `activate` | `isActive = true` |
| `deactivate` | `isActive = false` |

所有 action 會寫入結構化 console audit log。生產環境建議由容器 log pipeline 收集。

## 部署

`docker-compose.yml` 以同一個 GHCR image 啟動 `admin-api`，command 為：

```bash
pnpm admin:start
```

建議透過反向代理提供獨立網域，例如 `admin.example.com`，並在 proxy 層加 VPN / IP allowlist。
