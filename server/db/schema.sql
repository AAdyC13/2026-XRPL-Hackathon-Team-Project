-- GKC Platform SQLite Schema
-- SQLite adaptation of the PostgreSQL spec in BACKEND_SPECIFICATION.md

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'user',
  -- 'user' | 'node_owner' | 'provider' | 'admin'
  xrp_address     TEXT,
  gkc_balance     REAL NOT NULL DEFAULT 0,
  xrp_balance     REAL NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── AI Providers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id                   TEXT PRIMARY KEY,
  owner_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL,
  gpu_type             TEXT NOT NULL,
  vram_gb              INTEGER NOT NULL,
  endpoint_token       TEXT NOT NULL UNIQUE,   -- Agent connects with this (legacy / WS tunnel)
  endpoint_url         TEXT,                   -- Direct HTTP endpoint (OpenAI-compatible)
  endpoint_secret      TEXT,                   -- Bearer token for endpoint_url
  tunnel_session_id    TEXT,                   -- Set when Agent connects
  models               TEXT NOT NULL DEFAULT '[]',  -- JSON array: ["llama3:8b"]
  price_input_per_1k   REAL NOT NULL DEFAULT 0.002,
  price_output_per_1k  REAL NOT NULL DEFAULT 0.004,
  platform_fee_rate    REAL NOT NULL DEFAULT 0.20,
  max_concurrent       INTEGER NOT NULL DEFAULT 4,
  current_load         INTEGER NOT NULL DEFAULT 0,
  tokens_per_sec       REAL,
  first_token_ms       INTEGER,
  status               TEXT NOT NULL DEFAULT 'pending_validation',
  -- 'pending_validation' | 'verified' | 'online' | 'offline' | 'suspended'
  uptime_30d           REAL NOT NULL DEFAULT 0,
  total_requests       INTEGER NOT NULL DEFAULT 0,
  avg_rating           REAL NOT NULL DEFAULT 5.0,
  last_heartbeat       TEXT,
  verified_at          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── API Keys ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL UNIQUE,   -- SHA-256(raw_key)
  key_prefix      TEXT NOT NULL,          -- e.g. "gkc_sk_abc1" (display only)
  name            TEXT,
  daily_limit_gkc REAL,                   -- NULL = unlimited
  spent_today_gkc REAL NOT NULL DEFAULT 0,
  total_spent_gkc REAL NOT NULL DEFAULT 0,
  last_used_at    TEXT,
  revoked_at      TEXT,                   -- NULL = active
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Inference Records ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inference_records (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  provider_id      TEXT REFERENCES ai_providers(id),
  api_key_id       TEXT REFERENCES api_keys(id),  -- NULL if using JWT
  model            TEXT NOT NULL,
  input_tokens     INTEGER NOT NULL DEFAULT 0,
  output_tokens    INTEGER NOT NULL DEFAULT 0,
  cost_gkc         REAL NOT NULL DEFAULT 0,
  provider_revenue REAL NOT NULL DEFAULT 0,
  platform_revenue REAL NOT NULL DEFAULT 0,
  channel_id       TEXT,                 -- Payment Channel XRPL ID
  settled          INTEGER NOT NULL DEFAULT 0,  -- 0=off-chain, 1=settled on XRPL
  tx_hash          TEXT,                 -- XRPL tx hash when settled
  duration_ms      INTEGER,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Payment Channels ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_channels (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  xrpl_channel_id  TEXT NOT NULL UNIQUE,  -- XRPL PayChannel object ID
  locked_gkc       REAL NOT NULL,
  spent_gkc        REAL NOT NULL DEFAULT 0,
  -- Latest signed claim (off-chain)
  claim_amount     REAL NOT NULL DEFAULT 0,
  claim_signature  TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  -- 'open' | 'closing' | 'closed'
  expires_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Transactions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  -- 'inference_debit' | 'topup' | 'channel_open' | 'channel_close' | 'provider_payout'
  amount_gkc  REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference_id TEXT,    -- inference_record.id or payment_channel.id
  tx_hash     TEXT,     -- XRPL tx hash if on-chain
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── GPU Nodes (for node owners) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gpu_nodes (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_name      TEXT NOT NULL,
  gpu_type       TEXT NOT NULL,
  fp16_flops     REAL,
  vram_gb        INTEGER,
  cu_score       REAL,
  tier           TEXT,
  status         TEXT NOT NULL DEFAULT 'pending_benchmark',
  utilization    REAL NOT NULL DEFAULT 0,
  revenue_today  REAL NOT NULL DEFAULT 0,
  revenue_total  REAL NOT NULL DEFAULT 0,
  last_benchmark TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Deposits (XRP → GKC 充值紀錄) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  xumm_uuid   TEXT NOT NULL UNIQUE,
  dest_tag    INTEGER NOT NULL,
  xrp_amount  REAL NOT NULL,
  gkc_amount  REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'completed' | 'cancelled' | 'expired'
  tx_hash     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_providers_status   ON ai_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_owner    ON ai_providers(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user      ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash      ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_inference_user     ON inference_records(user_id);
CREATE INDEX IF NOT EXISTS idx_inference_created  ON inference_records(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user  ON transactions(user_id);

-- ── User Checks (XRPL Check objects for billing authorization) ─────────────
CREATE TABLE IF NOT EXISTS user_checks (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xumm_uuid       TEXT,                   -- Xaman payload UUID (while pending)
  xrpl_check_id   TEXT UNIQUE,            -- XRPL Check object ID (after signed)
  send_max_gkc    REAL NOT NULL,           -- SendMax from CheckCreate
  spent_gkc       REAL NOT NULL DEFAULT 0, -- Accumulated across sessions
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'active' | 'exhausted' | 'expired' | 'cancelled'
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Inference Sessions (groups API calls for Merkle settlement) ────────────
CREATE TABLE IF NOT EXISTS inference_sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  provider_id     TEXT REFERENCES ai_providers(id),
  check_id        TEXT REFERENCES user_checks(id),  -- NULL = no Check linked
  model           TEXT NOT NULL,
  total_requests  INTEGER NOT NULL DEFAULT 0,
  total_input_tok INTEGER NOT NULL DEFAULT 0,
  total_output_tok INTEGER NOT NULL DEFAULT 0,
  total_cost_gkc  REAL NOT NULL DEFAULT 0,
  merkle_root     TEXT,                   -- Computed at settlement
  status          TEXT NOT NULL DEFAULT 'open',
  -- 'open' | 'settling' | 'settled' | 'failed'
  settled_at      TEXT,
  tx_hash         TEXT,                   -- XRPL CheckCash tx hash
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Session Records (per-request Merkle leaves) ────────────────────────────
CREATE TABLE IF NOT EXISTS session_records (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES inference_sessions(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  input_tokens    INTEGER NOT NULL,
  output_tokens   INTEGER NOT NULL,
  cost_gkc        REAL NOT NULL,
  leaf_hash       TEXT NOT NULL,          -- SHA-256(session_id|seq|input|output|cost|ts)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user     ON inference_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status   ON inference_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_rec_sess  ON session_records(session_id);
CREATE INDEX IF NOT EXISTS idx_user_checks_user  ON user_checks(user_id);
