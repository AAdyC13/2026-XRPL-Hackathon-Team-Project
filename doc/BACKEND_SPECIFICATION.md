# 高科幣 (GKC) 平台後端開發技術規格書

**版本**: 2.0  
**日期**: 2026 年 5 月 23 日  
**狀態**: 開發規範

---

## 執行摘要

高科幣平台結合 XRP Ledger 的 AI 算力交易平台，支援三條核心產品線：

| 產品線 | 對象 | 計費單位 | 結算方式 |
| :--- | :--- | :--- | :--- |
| AI 推論服務 | 學生、研究員、外部開發者 | Token 數 | Payment Channel |
| 算力出租 | 需要訓練/微調的研究者 | GPU 時間 / CU·小時 | Escrow |
| 算力貢獻 | 各實驗室、外部節點 | CU 貢獻量 | Hooks 自動分潤 |

**核心分工**：XRP 解決「怎麼付錢」，GKC 解決「付多少錢」。

---

## 1. 系統架構概覽

### 1.1 整體架構

```
使用者層
學生/研究員          外部開發者           實驗室/GPU 提供者
     │                    │                      │
     └────────────────────┴──────────────────────┘
                          │
                    ┌─────▼──────┐
                    │   服務層    │
                    │            │
              ┌─────┴─────┐      │     ┌──────────────┐
              │ 高科幣錢包  │      │     │   算力市場    │
              │Token儲存扣款│◄────┤────►│  供需撮合/報價 │
              └─────┬─────┘      │     └──────┬───────┘
                    │      ┌─────┴─────┐      │
                    │      │ AI Gateway │      │
                    │      │ 模型路由/計費│     │
                    │      └─────┬─────┘      │
                    └───────────XRP橋──────────┘
                          │
                    ┌─────▼──────┐
                    │   算力層    │
                    │            │
          ┌─────────┴──────┐  ┌──┴────────────┐
          │  本地 LLM 叢集  │  │  外部節點加入  │
          │Llama/Qwen/Mistral│  │  貢獻算力賺幣  │
          └─────────────────┘  └───────────────┘
                          │
              ┌───────────▼───────────┐
              │   XRP Ledger 結算層    │
              │                       │
    ┌─────────┴──┐  ┌────────┐  ┌────┴─────────────┐
    │Payment Chan │  │XRPL AMM│  │  自動分潤合約     │
    │per-token微支│  │GKC⟷XRP │  │  算力貢獻者結算   │
    └────────────┘  └────────┘  └──────────────────┘
```

### 1.2 技術棧

| 元件 | 建議方案 | 說明 |
| :--- | :--- | :--- |
| **後端框架** | Node.js 20+ + Express.js 4.x | RESTful API 服務 |
| **主資料庫** | PostgreSQL 16+ | 使用者資料、交易記錄 |
| **快取層** | Redis 7+ | 餘額快取、Session |
| **區塊鏈** | XRPL Testnet/Mainnet | xrpl.js 3.x SDK |
| **AI 推論** | Ollama 或 vLLM | 本地部署，相容 OpenAI API |
| **身份驗證** | JWT + bcrypt | 無狀態認證 |
| **監控** | Prometheus + Grafana | 指標收集與視覺化 |

---

## 2. 資料模型

### 2.1 使用者 (users)

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(64) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  xrp_address     VARCHAR(64),          -- XRPL 公鑰地址
  gkc_balance     DECIMAL(20, 8) DEFAULT 0,
  xrp_balance     DECIMAL(20, 8) DEFAULT 0,
  role            VARCHAR(20) DEFAULT 'user', -- user | node_owner | admin
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 AI 推論記錄 (inference_records)

```sql
CREATE TABLE inference_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id            VARCHAR(64) NOT NULL,   -- e.g. 'llama-7b'
  model_name          VARCHAR(128) NOT NULL,  -- e.g. 'Llama 2 7B'
  prompt              TEXT NOT NULL,
  output              TEXT,
  input_tokens        INTEGER NOT NULL,
  output_tokens       INTEGER NOT NULL,
  total_tokens        INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_gkc            DECIMAL(20, 8) NOT NULL,
  payment_channel_id  VARCHAR(128),
  tx_hash             VARCHAR(128),
  status              VARCHAR(20) DEFAULT 'pending', -- pending | confirmed | failed
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ
);

CREATE INDEX idx_inference_user_id ON inference_records(user_id);
CREATE INDEX idx_inference_status ON inference_records(status);
CREATE INDEX idx_inference_created_at ON inference_records(created_at DESC);
```

### 2.3 GPU 節點 (gpu_nodes)

```sql
CREATE TABLE gpu_nodes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_name           VARCHAR(128) NOT NULL,
  gpu_type            VARCHAR(128) NOT NULL,
  fp16_flops          DECIMAL(10, 2) NOT NULL,   -- TFLOPS
  vram_gb             INTEGER NOT NULL,
  memory_bandwidth    INTEGER NOT NULL,           -- GB/s
  throughput_tokens   INTEGER NOT NULL,           -- tokens/s 實測
  cu_score            DECIMAL(10, 2) NOT NULL,    -- 加權算力單位
  tier                VARCHAR(4) NOT NULL,        -- S | A | B | C
  status              VARCHAR(20) DEFAULT 'pending_benchmark',
  utilization         DECIMAL(5, 2) DEFAULT 0,
  revenue_today       DECIMAL(20, 8) DEFAULT 0,
  revenue_total       DECIMAL(20, 8) DEFAULT 0,
  benchmark_fail_count INTEGER DEFAULT 0,
  last_benchmark      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gpu_nodes_owner_id ON gpu_nodes(owner_id);
CREATE INDEX idx_gpu_nodes_status ON gpu_nodes(status);
```

### 2.4 交易記錄 (transactions)

```sql
CREATE TYPE tx_type AS ENUM ('inference', 'reward', 'transfer', 'swap', 'deposit', 'withdrawal');
CREATE TYPE tx_status AS ENUM ('pending', 'confirmed', 'failed');

CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_type     tx_type NOT NULL,
  amount      DECIMAL(20, 8) NOT NULL,
  currency    VARCHAR(10) NOT NULL,  -- 'GKC' | 'XRP'
  description TEXT,
  status      tx_status DEFAULT 'pending',
  tx_hash     VARCHAR(128),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(tx_type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

### 2.5 Payment Channel (payment_channels)

```sql
CREATE TABLE payment_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id      VARCHAR(128) NOT NULL UNIQUE,  -- XRPL Channel ID
  amount_drops    BIGINT NOT NULL,               -- 通道鎖定總量 (drops)
  claimed_drops   BIGINT DEFAULT 0,             -- 已累計消費 (drops)
  status          VARCHAR(20) DEFAULT 'open',    -- open | settling | closed
  expiration      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  settled_at      TIMESTAMPTZ
);
```

### 2.6 GKC 定價配置 (pricing_config)

```sql
CREATE TABLE pricing_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type    VARCHAR(64) NOT NULL,        -- 'llm_inference' | 'compute_rental' | 'compute_reward'
  cost_per_unit   DECIMAL(20, 8) NOT NULL,     -- GKC per unit
  unit_label      VARCHAR(64) NOT NULL,        -- '1K tokens' | 'CU·小時'
  scarcity_factor DECIMAL(5, 4) DEFAULT 1.0,  -- 稀缺係數，動態調整
  is_active       BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 初始資料
INSERT INTO pricing_config (service_type, cost_per_unit, unit_label) VALUES
  ('llm_inference',    1.0,  '1K tokens'),
  ('image_generation', 5.0,  '每張圖片'),
  ('compute_rental',   10.0, 'CU·小時'),
  ('compute_reward',   8.0,  'CU·小時');
```

---

## 3. API 端點規範

所有 API 端點以 `/api/v1` 為前綴，除登入/註冊外均需 `Authorization: Bearer {jwt}` 標頭。

### 3.1 認證端點

#### `POST /api/v1/auth/register`

**請求體**:
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**響應** `201 Created`:
```json
{
  "id": "uuid",
  "username": "user123",
  "email": "user@example.com",
  "token": "eyJhbGci..."
}
```

**驗證規則**:
- `username`: 3-64 字元，只允許字母、數字、底線
- `email`: 有效的 Email 格式
- `password`: 最少 8 字元，需包含大小寫與數字

---

#### `POST /api/v1/auth/login`

**請求體**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**響應** `200 OK`:
```json
{
  "token": "eyJhbGci...",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "username": "user123",
    "role": "user"
  }
}
```

---

### 3.2 AI 推論端點

#### `POST /api/v1/inference`

觸發 AI 推論。後端驗證餘額後轉發至推論引擎，結果返回後扣費並更新 Payment Channel。

**請求體**:
```json
{
  "model_id": "llama-7b",
  "prompt": "解釋什麼是區塊鏈",
  "max_tokens": 256,
  "temperature": 0.7
}
```

**響應** `200 OK` (streaming 或同步):
```json
{
  "id": "uuid",
  "model_name": "Llama 2 7B",
  "output": "區塊鏈是一種分散式帳本技術...",
  "input_tokens": 15,
  "output_tokens": 85,
  "cost_gkc": 0.1,
  "tx_hash": "E2E519ABC8F1D...",
  "status": "confirmed",
  "timestamp": "2026-05-23T10:30:00Z"
}
```

**錯誤響應**:
- `402 Payment Required`: GKC 餘額不足
- `503 Service Unavailable`: 推論服務不可用

---

#### `GET /api/v1/inference?limit=20&offset=0`

取得推論歷史記錄（分頁）。

**響應** `200 OK`:
```json
{
  "total": 1284,
  "data": [
    {
      "id": "uuid",
      "model_name": "Llama 2 7B",
      "prompt": "解釋什麼是區塊鏈",
      "output": "區塊鏈是一種...",
      "input_tokens": 15,
      "output_tokens": 85,
      "cost_gkc": 0.1,
      "tx_hash": "E2E519...",
      "status": "confirmed",
      "created_at": "2026-05-23T10:30:00Z"
    }
  ]
}
```

---

#### `GET /api/v1/models`

取得可用模型列表。

**響應** `200 OK`:
```json
{
  "models": [
    {
      "id": "llama-7b",
      "name": "Llama 2 7B",
      "provider": "Meta",
      "cost_per_1k_tokens": 1.0,
      "max_tokens": 4096,
      "description": "輕量級通用模型",
      "is_available": true
    }
  ]
}
```

---

### 3.3 錢包端點

#### `GET /api/v1/wallet`

**響應** `200 OK`:
```json
{
  "gkc_balance": 5250.75,
  "xrp_balance": 128.50,
  "xrp_address": "rN7n7otQDd6FczFgLdlqtyMVrn3Rqq5Q1",
  "payment_channel": {
    "channel_id": "aB3f...",
    "total_locked_xrp": 100,
    "remaining_xrp": 99.79,
    "status": "open"
  }
}
```

---

#### `POST /api/v1/wallet/deposit`

用 XRP 充值 GKC（通過 XRPL AMM 自動兌換）。

**請求體**:
```json
{
  "xrp_amount": 10
}
```

**響應** `201 Created`:
```json
{
  "deposit_id": "uuid",
  "xrp_amount": 10,
  "gkc_received": 1220,
  "exchange_rate": "1 XRP = 122 GKC",
  "tx_hash": "A3F7B2...",
  "status": "confirmed"
}
```

---

#### `POST /api/v1/wallet/swap`

GKC ↔ XRP 兌換（通過 XRPL AMM）。

**請求體**:
```json
{
  "from_currency": "GKC",
  "from_amount": 1000,
  "to_currency": "XRP",
  "slippage_tolerance": 0.005
}
```

**響應** `201 Created`:
```json
{
  "swap_id": "uuid",
  "from_amount": 1000,
  "from_currency": "GKC",
  "to_amount": 8.2,
  "to_currency": "XRP",
  "fee": 0.3,
  "tx_hash": "B5D8A4...",
  "status": "confirmed"
}
```

---

#### `POST /api/v1/wallet/channel/create`

開設 Payment Channel，預存 XRP 以供鏈下微支付。

**請求體**:
```json
{
  "xrp_amount": 100,
  "expiration_hours": 24
}
```

**響應** `201 Created`:
```json
{
  "channel_id": "aB3fC7d...",
  "amount_xrp": 100,
  "expiration": "2026-05-24T10:00:00Z",
  "tx_hash": "C9E2F1...",
  "status": "open"
}
```

---

### 3.4 節點管理端點

#### `GET /api/v1/nodes`

取得使用者的 GPU 節點列表。

**響應** `200 OK`:
```json
{
  "nodes": [
    {
      "id": "uuid",
      "node_name": "A100 Server 1",
      "gpu_type": "NVIDIA A100 80GB",
      "cu_score": 100,
      "tier": "S",
      "status": "active",
      "utilization": 75.0,
      "revenue_today": 125.5,
      "revenue_total": 3250.75,
      "last_benchmark": "2026-05-23T08:00:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/nodes`

註冊新 GPU 節點（觸發自動 Benchmark）。

**請求體**:
```json
{
  "node_name": "RTX 4090 Server",
  "gpu_type": "NVIDIA RTX 4090",
  "fp16_flops": 165,
  "vram_gb": 24,
  "memory_bandwidth": 1008,
  "throughput_tokens": 62
}
```

**響應** `201 Created`:
```json
{
  "id": "uuid",
  "node_name": "RTX 4090 Server",
  "cu_score": 62,
  "tier": "S",
  "status": "pending_benchmark",
  "benchmark_job_id": "uuid"
}
```

---

#### `POST /api/v1/nodes/{node_id}/benchmark`

手動觸發節點基準測試。

**響應** `202 Accepted`:
```json
{
  "job_id": "uuid",
  "node_id": "uuid",
  "status": "queued",
  "estimated_duration_seconds": 120
}
```

---

#### `GET /api/v1/nodes/public`

取得全平台所有活躍節點列表（公開資訊，無需登入）。

**響應** `200 OK`:
```json
{
  "total_active_nodes": 12,
  "total_cu": 850,
  "nodes": [
    {
      "id": "uuid",
      "node_name": "A100 Server 1",
      "gpu_type": "NVIDIA A100 80GB",
      "cu_score": 100,
      "tier": "S",
      "utilization": 75.0,
      "cost_per_cu_hour": 10.0
    }
  ]
}
```

---

### 3.5 交易端點

#### `GET /api/v1/transactions`

**查詢參數**:

| 參數 | 類型 | 說明 |
| :--- | :--- | :--- |
| `type` | string | `all` \| `inference` \| `reward` \| `transfer` \| `swap` |
| `status` | string | `pending` \| `confirmed` \| `failed` |
| `limit` | integer | 每頁筆數（預設 50，最大 200） |
| `offset` | integer | 分頁偏移量 |
| `from` | ISO8601 | 起始時間 |
| `to` | ISO8601 | 結束時間 |

**響應** `200 OK`:
```json
{
  "total": 1284,
  "data": [
    {
      "id": "uuid",
      "type": "inference",
      "amount": 0.15,
      "currency": "GKC",
      "description": "AI 推論 - Llama 2 7B",
      "status": "confirmed",
      "tx_hash": "E2E519...8F1D",
      "created_at": "2026-05-23T10:30:00Z",
      "confirmed_at": "2026-05-23T10:30:03Z"
    }
  ]
}
```

---

### 3.6 統計端點

#### `GET /api/v1/dashboard/stats`

首頁儀表板統計資料。

**響應** `200 OK`:
```json
{
  "monthly_spend_gkc": 2450.50,
  "monthly_inference_count": 1284,
  "monthly_revenue_gkc": 1156.75,
  "active_nodes": 3,
  "total_tokens_used": 2450000,
  "payment_channel_balance_xrp": 99.79
}
```

---

#### `GET /api/v1/dashboard/chart?period=day&metric=usage`

圖表資料。

**查詢參數**:
- `period`: `day` | `week` | `month`
- `metric`: `usage` | `revenue` | `tokens`

**響應** `200 OK`:
```json
{
  "period": "day",
  "metric": "usage",
  "data": [
    { "label": "00:00", "value": 120 },
    { "label": "04:00", "value": 140 },
    { "label": "08:00", "value": 200 }
  ]
}
```

---

## 4. 業務邏輯實現

### 4.1 AI 推論計費流程

```
客戶端                    API Server              推論引擎 (Ollama/vLLM)
   │                           │                           │
   │── POST /inference ────────►│                           │
   │                           │── 驗證 JWT Token           │
   │                           │── 查詢 GKC 餘額            │
   │                           │   (Redis 快取)             │
   │                           │── 估算最大成本             │
   │                           │── 檢查餘額是否充足          │
   │                           │                           │
   │                           │── 轉發請求 ────────────────►│
   │                           │                           │── 執行推論
   │                           │◄── 推論結果 + Token 數 ────│
   │                           │                           │
   │                           │── 計算實際成本             │
   │                           │── 扣減 GKC 餘額            │
   │                           │── 更新 Payment Channel     │
   │                           │── 寫入 inference_records   │
   │                           │── 寫入 transactions        │
   │◄── 返回結果 ───────────────│                           │
```

### 4.2 計算單位 (CU) 評分公式

各維度分數以平台最高規格機器為基準 = 100 分：

```
CU = (FP16算力得分 × 0.40)
   + (VRAM容量得分 × 0.25)
   + (記憶體頻寬得分 × 0.20)
   + (實測吞吐量得分 × 0.15)
```

**JavaScript 實現**:
```javascript
function calculateCUScore(node, baseline) {
  const fp16Score = (node.fp16Flops / baseline.fp16Flops) * 100;
  const vramScore = (node.vramGb / baseline.vramGb) * 100;
  const bwScore   = (node.memoryBandwidth / baseline.memoryBandwidth) * 100;
  const tpScore   = (node.throughputTokens / baseline.throughputTokens) * 100;

  return (fp16Score * 0.40)
       + (vramScore * 0.25)
       + (bwScore   * 0.20)
       + (tpScore   * 0.15);
}
```

### 4.3 動態定價（稀缺係數）

```javascript
function calculateScarcityFactor(activeNodes, pendingRequests) {
  const totalCapacity = activeNodes.reduce((sum, n) => sum + n.cuScore, 0);
  const currentLoad   = pendingRequests * AVG_CU_PER_REQUEST;
  const loadRatio     = currentLoad / totalCapacity;

  if (loadRatio > 0.8) return Math.min(1 + (loadRatio - 0.8) * 2.5, 2.0); // 最高 2× 漲價
  if (loadRatio < 0.3) return Math.max(1 - (0.3 - loadRatio) * 1.5, 0.6); // 最低 0.6×
  return 1.0;
}
```

### 4.4 節點自動下架邏輯

每日自動重跑基準測試，連續三次低於申報值 80% 則自動下架：

```javascript
async function dailyBenchmarkJob(nodeId) {
  const result = await runBenchmark(nodeId);
  const node = await getNode(nodeId);

  const ratio = result.throughputTokens / node.throughputTokens;

  if (ratio < 0.8) {
    await incrementFailCount(nodeId);
    await sendAlert(node.ownerId, `節點 ${node.nodeName} 實測低於申報值 80%`);

    if (node.benchmarkFailCount >= 2) { // 第三次 (0-indexed)
      await setNodeStatus(nodeId, 'inactive');
      await sendAlert(node.ownerId, `節點 ${node.nodeName} 已自動下架`);
    }
  } else {
    await resetFailCount(nodeId);
    await updateCUScore(nodeId, result);
  }
}
```

---

## 5. XRPL 區塊鏈集成

### 5.1 高科幣 (GKC) 發行

GKC 使用 XRPL IOU（Issued Currency）機制發行：

```javascript
// 步驟 1：用戶建立信任線 (TrustSet) — 用戶端執行
const trustSetTx = {
  TransactionType: "TrustSet",
  Account: userAddress,
  LimitAmount: {
    currency: "GKC",
    issuer: GKC_ISSUER_ADDRESS,
    value: "1000000"
  }
};

// 步驟 2：鑄幣 — 用戶充值 XRP 後，平台鑄造 GKC
const mintTx = {
  TransactionType: "Payment",
  Account: GKC_ISSUER_ADDRESS,
  Destination: userAddress,
  Amount: {
    currency: "GKC",
    issuer: GKC_ISSUER_ADDRESS,
    value: gkcAmount.toString()
  }
};

// 步驟 3：銷毀 — 用戶消費後，GKC 回到發行者帳戶
const burnTx = {
  TransactionType: "Payment",
  Account: userAddress,
  Destination: GKC_ISSUER_ADDRESS,
  Amount: {
    currency: "GKC",
    issuer: GKC_ISSUER_ADDRESS,
    value: consumedGkc.toString()
  }
};
```

### 5.2 Payment Channel 微支付

```javascript
// 開設通道（On-chain，一次）
const createChannelTx = {
  TransactionType: "PaymentChannelCreate",
  Account: PLATFORM_ACCOUNT,
  Destination: userAddress,
  Amount: xrpToDrops("100"),   // 鎖定 100 XRP
  SettleDelay: 86400,          // 24 小時到期
  PublicKey: PLATFORM_PUBLIC_KEY
};

// 每次推論後：更新鏈下收據 (Off-chain)
function buildClaim(channelId, cumulativeDrops, privateKey) {
  return {
    channel_id: channelId,
    amount: cumulativeDrops,    // 只增不減
    signature: signPaymentChannelClaim(channelId, cumulativeDrops, privateKey)
  };
}

// 結算（On-chain，批次）
const claimTx = {
  TransactionType: "PaymentChannelClaim",
  Channel: channelId,
  Amount: cumulativeDrops.toString(),
  Signature: claim.signature,
  PublicKey: PLATFORM_PUBLIC_KEY
};
```

**效益對比**:

| 方式 | 100 次推論的鏈上交易數 | 手續費 | 延遲 |
| :--- | :--- | :--- | :--- |
| 每次直接上鏈 | 100 筆 | 100 × 0.00001 XRP | 3–5 秒/次 |
| Payment Channel | 2 筆（開+關） | 2 × 0.00001 XRP | < 10ms/次 |

### 5.3 AMM 流動性池

```javascript
// 建立 GKC/XRP 流動性池（平台初始化，一次）
const createAMMTx = {
  TransactionType: "AMMCreate",
  Account: PLATFORM_ACCOUNT,
  Asset:  { currency: "XRP" },
  Asset2: { currency: "GKC", issuer: GKC_ISSUER_ADDRESS },
  Amount:  xrpToDrops("10000"),     // 注入 10,000 XRP
  Amount2: { value: "1000000", currency: "GKC", issuer: GKC_ISSUER_ADDRESS },
  TradingFee: 300  // 0.3% 手續費
};
```

### 5.4 Escrow（算力任務保證金）

```javascript
// 租用算力時鎖定保證金
const escrowCreateTx = {
  TransactionType: "EscrowCreate",
  Account: renterAddress,
  Destination: nodeOwnerAddress,
  Amount: xrpToDrops(depositXrp.toString()),
  FinishAfter: Math.floor(Date.now() / 1000) + rentalDurationSeconds,
  CancelAfter: Math.floor(Date.now() / 1000) + rentalDurationSeconds + 3600
};

// 任務完成後釋放
const escrowFinishTx = {
  TransactionType: "EscrowFinish",
  Account: nodeOwnerAddress,
  Owner: renterAddress,
  OfferSequence: escrowSequence
};
```

### 5.5 XRPL 帳戶架構

```
發行者帳戶（冷錢包）           營運帳戶（熱錢包）
  Issuer Account      ─授權─►  Operational Account
  - 離線保管                     - 日常鑄幣 / 轉帳
  - DefaultRipple = true         - 線上運行
  - 極少動用                     - 如被攻擊不影響發行根權限
```

> **重要**：`DefaultRipple = true` 必須在帳戶初始化時設定，一旦開啟無法關閉。

---

## 6. 資安設計

### 6.1 認證與授權

- **密碼雜湊**: bcrypt，cost factor = 12
- **JWT**: HS256 簽名，有效期 24 小時；Payload 包含 `userId`, `role`, `iat`, `exp`
- **Refresh Token**: 儲存於 HttpOnly Cookie，有效期 7 天
- **速率限制**: 每 IP 每分鐘最多 60 個請求（登入端點更嚴格：每 15 分鐘 5 次）

### 6.2 輸入驗證

所有請求體使用 `zod` 或 `joi` 進行嚴格驗證，防止 SQL Injection 和 XSS：

```javascript
import { z } from 'zod';

const inferenceSchema = z.object({
  model_id:    z.string().min(1).max(64),
  prompt:      z.string().min(1).max(8192),
  max_tokens:  z.number().int().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional()
});
```

### 6.3 XRPL 安全實踐

- **私鑰管理**: 使用 HSM（Hardware Security Module）或 KMS 管理平台私鑰，絕不以明文儲存
- **交易驗證**: 所有 XRPL 交易提交前必須驗證簽名
- **金額上限**: 單次 Payment Channel 金額不超過通道鎖定總量
- **到期機制**: Payment Channel 設定 24 小時到期，防止資金永久鎖死

---

## 7. 快取策略

| 數據 | Redis 鍵 | TTL | 用途 |
| :--- | :--- | :--- | :--- |
| 用戶餘額 | `user:{id}:balance` | 5 分鐘 | 快速查詢 |
| 模型清單 | `models:list` | 1 小時 | 不常變更的配置 |
| 活躍節點 | `nodes:active:list` | 1 分鐘 | 即時節點狀態 |
| GKC/XRP 匯率 | `exchange:gkc_xrp` | 5 分鐘 | AMM 報價 |
| 稀缺係數 | `pricing:scarcity` | 1 分鐘 | 動態定價 |
| JWT 黑名單 | `jwt:blacklist:{jti}` | JWT 到期時間 | 強制登出 |

---

## 8. 環境變數配置

```bash
# .env
NODE_ENV=production
PORT=3000

# 資料庫
DATABASE_URL=postgresql://gkc_user:password@localhost:5432/gkc_platform
REDIS_URL=redis://localhost:6379

# XRPL
XRPL_NETWORK=testnet
XRPL_WSS_URL=wss://s.altnet.rippletest.net:51233
GKC_ISSUER_ADDRESS=rIssuerAddress...
PLATFORM_ACCOUNT=rPlatformAccount...
# 私鑰必須由 KMS 或 HSM 提供，不可硬編碼

# AI 推論
OLLAMA_BASE_URL=http://localhost:11434

# JWT
JWT_SECRET=minimum_32_character_random_secret
JWT_EXPIRES_IN=24h

# 速率限制
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

---

## 9. 開發優先順序（5 週計畫）

| 週次 | 任務 |
| :--- | :--- |
| **Week 1** | XRPL 帳戶設定 + GKC 發幣 + TrustLine 自動化 |
| **Week 2** | Payment Channel 完整鏈路（開通 → 鏈下簽名 → 結算關閉） |
| **Week 3** | AI Gateway 整合計費邏輯 + 前端 Dashboard 資料串接 |
| **Week 4** | AMM 流動性池建立 + 算力節點 CU Benchmark 腳本 |
| **Week 5** | Hooks 分潤邏輯 + Escrow 算力出租 + Demo 腳本彩排 |

---

## 10. 測試策略

### 10.1 單元測試範例

```javascript
describe('CU Score Calculator', () => {
  it('A100 80G should score ~100 CU', () => {
    const a100 = { fp16Flops: 312, vramGb: 80, memoryBandwidth: 2000, throughputTokens: 100 };
    expect(calculateCUScore(a100, a100)).toBeCloseTo(100, 1);
  });

  it('RTX 4090 should score ~62 CU', () => {
    const baseline = { fp16Flops: 312, vramGb: 80, memoryBandwidth: 2000, throughputTokens: 100 };
    const rtx4090  = { fp16Flops: 165, vramGb: 24, memoryBandwidth: 1008, throughputTokens: 62 };
    const score = calculateCUScore(rtx4090, baseline);
    expect(score).toBeGreaterThan(58);
    expect(score).toBeLessThan(68);
  });
});

describe('Billing Engine', () => {
  it('should correctly calculate inference cost', () => {
    const cost = calculateInferenceCost({
      inputTokens: 100, outputTokens: 150,
      costPer1kTokens: 1.0, scarcityFactor: 1.0
    });
    expect(cost).toBe(0.25);
  });
});
```

### 10.2 XRPL 測試

使用 XRPL Testnet（免費領取測試幣）進行所有鏈上操作測試：
- Payment Channel 開通 → 鏈下累計 → 結算
- AMM 兌換
- Escrow 建立與釋放

鏈上瀏覽器：https://testnet.xrpl.org

---

## 11. 錯誤代碼

| HTTP 代碼 | 錯誤代碼 | 含義 |
| :--- | :--- | :--- |
| 400 | `INVALID_PARAMS` | 請求參數格式錯誤 |
| 401 | `UNAUTHORIZED` | JWT 無效或過期 |
| 402 | `INSUFFICIENT_BALANCE` | GKC 餘額不足 |
| 403 | `FORBIDDEN` | 無權限操作 |
| 404 | `NOT_FOUND` | 資源不存在 |
| 429 | `RATE_LIMIT_EXCEEDED` | 請求過於頻繁 |
| 500 | `INTERNAL_ERROR` | 伺服器內部錯誤 |
| 503 | `SERVICE_UNAVAILABLE` | AI 推論服務不可用 |

---

## 附錄 A：常見 GPU 參考 CU（預設權重）

| GPU 型號 | FP16 (TFLOPS) | VRAM (GB) | 頻寬 (GB/s) | 參考 CU | Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A100 80G | 312 | 80 | 2000 | ~100 | S |
| RTX 4090 | 165 | 24 | 1008 | ~62 | S |
| RTX 3090 | 71 | 24 | 936 | ~48 | A |
| RTX 4080 | 97 | 16 | 717 | ~46 | A |
| RTX 3080 | 45 | 10 | 760 | ~34 | B |
| T4（推論） | 65 | 16 | 300 | ~32 | B |
| RTX 3070 | 41 | 8 | 448 | ~27 | B |
| RTX 2080Ti | 27 | 11 | 616 | ~24 | C |

---

**文件最後更新**：2026 年 5 月 23 日
