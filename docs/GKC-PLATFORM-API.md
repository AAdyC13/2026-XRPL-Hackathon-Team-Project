# GKC Platform API 文件

> **Base URL**：`/api/v1`  
> **認證方式**：JWT Bearer Token（`Authorization: Bearer <token>`）  
> **舊版 ACU API** 請見 [API.md](./API.md)（legacy client 參考用）

---

## 統一回應格式

成功：

```json
{ "field": "value", ... }
```

失敗（HTTP 4xx / 5xx）：

```json
{
  "statusCode": 400,
  "code": "INVALID_PARAMS",
  "message": "錯誤說明"
}
```

---

## Auth

### `POST /api/v1/auth/register`

建立新帳號。帳號初始 `verificationStatus` 為 `pending`，需等待管理員審核。
帳密政策由單一模組維護：`src/auth/policies/account-policy.ts`（Auth API 與 AdminJS 共用）。
前端註冊頁會先做 UX 預檢（`client/src/policies/account-policy.ts`），但後端驗證仍是最終裁決。

**Request Body**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `username` | string | 3–64 字元，英數字與底線 |
| `email` | string | 有效 email 格式 |
| `password` | string | 最少 8 碼，需含大小寫英文與數字 |

**Response `200`**

```json
{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "token": "eyJ...",
  "verificationStatus": "pending",
  "message": "帳號已建立，等待管理員審核。"
}
```

---

### `POST /api/v1/auth/login`

登入並取得 JWT。

**Request Body**

| 欄位 | 型別 |
|------|------|
| `email` | string |
| `password` | string |

**Response `200`**

```json
{
  "token": "eyJ...",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "username": "alice",
    "email": "alice@example.com",
    "role": "user",
    "xrpAddress": null,
    "verificationStatus": "pending",
    "gkcBalance": 0,
    "xrpBalance": 0
  }
}
```

> `role` 可為 `user` | `node_owner` | `admin`  
> `verificationStatus` 可為 `pending` | `verified` | `rejected`

---

### `GET /api/v1/auth/me`

🔒 **需要 JWT**

取得目前登入用戶的完整 Profile。

**Response `200`**：同 `user` 物件格式（見 login）

---

## Wallet

### `GET /api/v1/wallet`

🔒 **需要 JWT**

取得錢包摘要。

**Response `200`**

```json
{
  "gkc_balance": 1250.5,
  "xrp_balance": 42.3,
  "xrp_address": "rXXX...",
  "verification_status": "verified",
  "payment_channel": null
}
```

---

### `GET /api/v1/wallet/balance`

🔒 **需要 JWT**

查詢鏈上 GKC TrustLine 狀態。需已綁定 `xrpAddress`。

**Response `200`**

```json
{
  "lines": [
    { "currency": "GKC", "account": "rIssuer...", "balance": "1250.5", "limit": "1000000" }
  ]
}
```

---

### `POST /api/v1/wallet/trustline`

🔒 **需要 JWT**（verificationStatus = verified + xrpAddress 已綁定）

建立 GKC TrustSet Xaman payload（用戶側 TrustSet）。

**Request Body**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `limit` | string | TrustLine 上限，例如 `"1000000"` |
| `signWithXaman` | boolean | 固定傳 `true` |

**Response `200`**

```json
{
  "txjson": { "TransactionType": "TrustSet", ... },
  "xaman": {
    "uuid": "payload-uuid",
    "qrPng": "https://xumm.app/sign/..."
  }
}
```

---

### `POST /api/v1/wallet/trustline/approve`

🔒 **需要 JWT**

用戶 TrustSet 上鏈後呼叫，觸發 Issuer 執行授權（`TrustSet { Flags: tfSetfAuth }`）。

**Response `200`**

```json
{ "authorized": true, "address": "rXXX..." }
```

**錯誤**

| Code | HTTP | 說明 |
|------|------|------|
| `FORBIDDEN` | 403 | verificationStatus ≠ verified |
| `BAD_REQUEST` | 400 | xrpAddress 尚未綁定 |
| `BAD_REQUEST` | 400 | TrustLine 尚未上鏈 |

---

### `POST /api/v1/wallet/bind`

🔒 **需要 JWT**（verificationStatus = verified + 尚未綁定錢包）

建立 Xaman Sign-In payload，開始錢包綁定流程。

**Response `200`**

```json
{
  "uuid": "payload-uuid",
  "qrPng": "https://xumm.app/sign/..."
}
```

**錯誤**

| Code | HTTP | 說明 |
|------|------|------|
| `FORBIDDEN` | 403 | verificationStatus ≠ verified |
| `BAD_REQUEST` | 400 | 已有綁定錢包 |

---

### `GET /api/v1/wallet/bind/:uuid`

🔒 **需要 JWT**

輪詢 Xaman 簽名結果。建議 2 秒輪詢一次，直到 `bound: true` 或 `cancelled / expired`。

**Response `200`（未簽名）**

```json
{ "bound": false }
```

**Response `200`（已簽名）**

```json
{
  "bound": true,
  "address": "rXXX..."
}
```

**Response `200`（取消 / 過期）**

```json
{ "bound": false, "cancelled": true }
{ "bound": false, "expired": true }
```

---

### `DELETE /api/v1/wallet/bind`

🔒 **需要 JWT**

解除錢包綁定。

**前置條件**：鏈上 GKC 餘額必須為 0，否則回傳 400。

成功後：
1. Issuer 執行 Individual Freeze（舊錢包的 GKC 信任線被凍結，無法再接收 GKC）
2. 清除 `user.xrpAddress` 與 `user.xamanUserToken`

**Response `200`**

```json
{ "unbound": true }
```

**錯誤**

| Code | HTTP | 說明 |
|------|------|------|
| `BAD_REQUEST` | 400 | GKC 餘額不為零 |
| `BAD_REQUEST` | 400 | 尚未綁定錢包 |

---

## Admin

> 所有 Admin 端點需要 `role === 'admin'` 的 JWT，否則回傳 403。

---

### `GET /api/v1/admin/users`

🔒 **需要 JWT（admin）**

列出用戶，支援狀態篩選與分頁。

**Query Parameters**

| 參數 | 型別 | 說明 |
|------|------|------|
| `status` | string | 選填，`pending` \| `verified` \| `rejected` |
| `page` | number | 頁碼，從 1 開始（預設 1） |
| `limit` | number | 每頁筆數，上限 100（預設 20） |

**Response `200`**

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "alice",
      "email": "alice@example.com",
      "role": "user",
      "verificationStatus": "pending",
      "xrpAddress": null,
      "createdAt": "2026-05-25T14:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### `PATCH /api/v1/admin/users/:id/approve`

🔒 **需要 JWT（admin）**

批准用戶，`verificationStatus` 設為 `verified`，記錄 `verifiedAt`。

**Response `200`**：回傳更新後的用戶物件（同 users 列表中的欄位格式）

---

### `PATCH /api/v1/admin/users/:id/reject`

🔒 **需要 JWT（admin）**

拒絕用戶，`verificationStatus` 設為 `rejected`。

**Response `200`**：回傳更新後的用戶物件

---

### `PATCH /api/v1/admin/users/:id/reset`

🔒 **需要 JWT（admin）**

將用戶狀態重設回 `pending`（用於撤回拒絕決定）。

**Response `200`**：回傳更新後的用戶物件

---

## 用戶狀態流程圖

```
        register()
            ↓
         pending  ←──── reset ────┐
            │                     │
      admin approve           admin reject
            ↓                     │
         verified              rejected
            │
     POST /wallet/bind
            ↓
      xrpAddress 已綁定
            │
     POST /wallet/trustline
     POST /wallet/trustline/approve
            ↓
        帳號完全啟用
            │
     DELETE /wallet/bind（需 GKC = 0）
            ↓
      xrpAddress 清除（舊錢包凍結）
            │
        回到 xrpAddress = null
```

---

## 前端路由對應

| 路由 | 元件 | 存取限制 |
|------|------|---------|
| `/login` | Login | 公開 |
| `/register` | Register | 公開 |
| `/dashboard` | Dashboard | 一般用戶（admin → redirect /admin） |
| `/wallet` | Wallet | 一般用戶 |
| `/admin` | AdminHome | Admin only |
| `/admin/users` | Admin（用戶審核） | Admin only |
