# Changelog

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式。

---

## [未發布] — 2026-05-26

### 新增

#### 後端

- **Admin 模組** (`src/admin/`)
  - `AdminGuard`：驗證 JWT payload 內 `role === 'admin'`，否則回傳 403
  - `AdminService`：`listUsers`（分頁+狀態篩選）、`approveUser`、`rejectUser`、`resetUser`（重設回 pending）
  - API endpoints：
    - `GET  /api/v1/admin/users?status=&page=&limit=`
    - `PATCH /api/v1/admin/users/:id/approve`
    - `PATCH /api/v1/admin/users/:id/reject`
    - `PATCH /api/v1/admin/users/:id/reset`
  - 所有端點雙重守衛：`JwtAuthGuard` + `AdminGuard`

- **Xaman 錢包綁定** (`src/wallet/`)
  - `POST /api/v1/wallet/bind`：建立 Xaman SignIn payload，回傳 QR code
  - `GET  /api/v1/wallet/bind/:uuid`：輪詢 Xaman 簽名結果；簽名完成後寫入 `user.xrpAddress`
  - `DELETE /api/v1/wallet/bind`：解除錢包綁定（需 GKC 餘額 = 0，否則 400）

- **Authorized Trust Lines** (`src/xrpl/services/trustline.service.ts`)
  - `issuerAuthorizeTrustLine(holderAddress)`：Issuer 送出 `TrustSet { Flags: tfSetfAuth }`，授權信任線
  - `freezeTrustLine(holderAddress)`：Issuer 送出 `TrustSet { Flags: tfSetFreeze }`，凍結解綁用戶的 GKC 信任線
  - `POST /api/v1/wallet/trustline/approve`：前端 TrustSet 上鏈後呼叫，觸發 Issuer 授權

- **資料庫 Schema** (`prisma/schema.prisma`)
  - `User` 新增欄位：`verificationStatus`（default: `'pending'`）、`verificationToken`、`verificationExpiry`、`verifiedAt`、`xamanUserToken`
  - `xrpAddress` 加上 `@unique` 約束（防止多帳號共用同一錢包）
  - Migration：`20260525140500_add_verification_wallet_fields`

- **一次性 Issuer 初始化腳本** (`scripts/issuer-setup.ts`)
  - 對 Issuer 帳號執行 `AccountSet { SetFlag: asfRequireAuth }`
  - 啟用後所有 TrustSet 須由 Issuer 端明確授權

- **UsersService 擴充**
  - `findMany(filter?, pagination?)`：分頁查詢，支援 `verificationStatus` 篩選
  - `count(filter?)`：計算符合條件的用戶數
  - `findByVerificationToken(token)`
  - `findByXrpAddress(xrpAddress)`
  - `updateUser(id, data)`

#### 前端

- **Admin Console**（完全獨立介面）
  - `AdminLayout`：獨立側邊欄，紅色系品牌，與一般用戶介面視覺切割
  - `AdminHome`（`/admin`）：概覽首頁，預留監視功能欄位
  - `Admin`（`/admin/users`）：用戶審核表格，Tabs 切換 pending / verified / rejected
    - Pending 用戶：批准 / 拒絕按鈕
    - Rejected 用戶：重設為待審核按鈕

- **AuthContext**
  - `login()` 回傳 `AuthUser`，讓 Login 頁可即時取得 role 進行分流
  - `verificationStatus` 型別加入 `'rejected'`
  - 新增 `refreshProfile()`（wrapped in `useCallback`）

- **Dashboard** 錢包綁定引導 Banner
  - 條件：`verificationStatus === 'verified' && !xrpAddress`
  - 顯示引導訊息並提供「前往綁定」連結至 `/wallet`

- **DEMO 標記**：所有示例資料元件加上黃色 `DEMO` badge
  - `Transactions.tsx`：頁面頂部提示條 + 每列 TransactionRow
  - `Wallet.tsx`：交易歷史 CardTitle + 每列 TransactionRow + AMM 兌換 CardTitle
  - `Dashboard.tsx`：今日使用趨勢、本週收益、活躍算力節點三個 Card

### 修改

- **`src/auth/auth.service.ts`**
  - 移除 edu.tw 學校信箱網域驗證（`register()` 現在接受任意 email）
  - 移除 `verificationToken` 生成與 email 寄送邏輯
  - 移除 `verifyEmail()` 方法
  - 移除 `resendVerification()` 方法
  - `register()` 回傳訊息更新為「帳號已建立，等待管理員審核」

- **`src/auth/auth.controller.ts`**
  - 移除 `GET /api/v1/auth/verify-email` endpoint
  - 移除 `POST /api/v1/auth/resend-verification` endpoint

- **`client/src/App.tsx`**
  - `ProtectedRoute`：admin 用戶自動 redirect → `/admin`
  - `AdminRoute`：非 admin 自動 redirect → `/dashboard`
  - 路由調整：`/admin` → `AdminHome`，`/admin/users` → `Admin`

- **`client/src/pages/Login.tsx`**
  - 登入後依 role 分流：admin → `/admin`，一般用戶 → `/dashboard`

- **`client/src/pages/Register.tsx`**
  - 移除 edu.tw 即時驗證提示
  - 成功畫面改為「等待管理員審核」

- **`client/src/pages/Wallet.tsx`**
  - Stage A banner（pending）文案改為「等待管理員審核」
  - 新增 Stage（rejected）：顯示「審核未通過」提示

- **`client/src/components/Layout.tsx`**
  - 移除 admin 入口連結（admin 有獨立介面，不使用此 Layout）

### 移除

- `src/mail/mail.service.ts` 的 `sendVerificationEmail()` 呼叫路徑（mail service 本身保留，供未來使用）

---

## 備註

### 首次部署前置作業

1. 執行資料庫 migration：
   ```bash
   pnpm db:migrate
   ```

2. Seed admin 帳號（若尚未執行）：
   ```bash
   pnpm db:seed
   ```

3. 對 XRPL Testnet Issuer 帳號啟用 `asfRequireAuth`（**只需執行一次**）：
   ```bash
   npx tsx scripts/issuer-setup.ts
   ```

### 環境變數新增

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `APP_URL` | 平台對外 URL，用於 email 連結（暫未使用） | — |
| `MAIL_HOST` | SMTP host（暫未啟用） | — |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP 用戶 | — |
| `MAIL_PASS` | SMTP 密碼 | — |
| `MAIL_FROM` | 寄件人地址 | — |
