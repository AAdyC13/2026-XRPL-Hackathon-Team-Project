# A 平台後端 API 契約

所有端點回傳統一格式：

```json
{ "ok": true, "data": {} }
```

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body." } }
```

## Health

### `GET /health`

檢查 API 與 XRPL 連線狀態。

## Trust Line

### `POST /api/trustline/prepare`

建立 TrustSet 交易草稿，讓使用者帳號可持有 ACU。

```json
{
  "account": "r...",
  "limit": "1000000",
  "signWithXaman": false
}
```

### `GET /api/trustline/:account`

查詢帳號 trust lines。

## Issued Asset

### `POST /api/asset/issue/prepare`

建立 issuer 發 ACU 到目的帳號的 Payment 交易草稿。

```json
{
  "destination": "r...",
  "amount": "10",
  "signWithXaman": false
}
```

### `POST /api/asset/issue`

Testnet 開發便利端點。由 server 使用 `.env` 的 `ISSUER_SEED` 直接簽署並送出發幣交易。

### `GET /api/asset/balance/:account`

查詢帳號對 issuer 的 ACU 餘額。

### `POST /api/asset/transfer/prepare`

建立使用者轉移 ACU 的 Payment 交易草稿。

```json
{
  "from": "r...",
  "to": "r...",
  "amount": "5",
  "signWithXaman": true
}
```

## Xaman

### `POST /api/xaman/payload`

為任意 `txjson` 建立 Xaman 簽署請求。

```json
{
  "txjson": {
    "TransactionType": "TrustSet",
    "Account": "r..."
  }
}
```

### `GET /api/xaman/payload/:uuid`

輪詢 Xaman payload 狀態。

### `POST /api/xaman/payload/:uuid/submit`

若 payload 回傳 signed blob，將交易送到 XRPL；若 Xaman 已代廣播，回傳其 tx id。

## DEX

### `POST /api/dex/offer/prepare`

建立 ACU/XRP `OfferCreate` 交易草稿。

```json
{
  "account": "r...",
  "side": "sellAcu",
  "acuAmount": "10",
  "xrpAmount": "1",
  "signWithXaman": true
}
```

`side` 可為：

- `sellAcu`：賣 ACU、收 XRP
- `buyAcu`：付 XRP、買 ACU

### `DELETE /api/dex/offer/:sequence/prepare`

建立 `OfferCancel` 交易草稿。

```json
{
  "account": "r...",
  "signWithXaman": true
}
```

### `GET /api/dex/book?side=sellAcu&limit=20`

查詢 ACU/XRP order book。

### `GET /api/dex/offers/:account`

查詢帳號目前掛單。

## Escrow

目前 MVP 使用標準 XRPL crypto-condition escrow 模擬 XLS-100 Smart Escrow 的履約語意。XLS-100 `SmartEscrow` amendment 可用後，只需替換 `escrow.service` 內部交易組裝。

### `POST /api/escrow/create/prepare`

建立條件式託管交易草稿，並回傳 `condition` / `fulfillment`。

```json
{
  "sender": "r...",
  "receiver": "r...",
  "amount": "10",
  "cancelAfterSeconds": 3600,
  "signWithXaman": false
}
```

### `POST /api/escrow/finish/prepare`

建立釋放託管的 `EscrowFinish` 交易草稿。

```json
{
  "finisher": "r...",
  "owner": "r...",
  "offerSequence": 123,
  "condition": "A025...",
  "fulfillment": "A022...",
  "signWithXaman": true
}
```

### `POST /api/escrow/cancel/prepare`

建立取消託管的 `EscrowCancel` 交易草稿。

```json
{
  "account": "r...",
  "owner": "r...",
  "offerSequence": 123,
  "signWithXaman": true
}
```
