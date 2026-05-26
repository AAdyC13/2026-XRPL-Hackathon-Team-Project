-- AlterTable: drop email-verification fields, add is_active
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "verification_token",
  DROP COLUMN IF EXISTS "verification_expiry",
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "key_prefix" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "daily_limit_gkc" DECIMAL(20,8),
    "spent_today_gkc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_spent_gkc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_providers
CREATE TABLE "ai_providers" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "gpu_type" VARCHAR(50) NOT NULL,
    "vram_gb" INTEGER NOT NULL,
    "endpoint_token" VARCHAR(255) NOT NULL,
    "endpoint_url" VARCHAR(500),
    "endpoint_secret" VARCHAR(255),
    "tunnel_session_id" VARCHAR(100),
    "models" TEXT NOT NULL DEFAULT '[]',
    "price_input_per_1k" DECIMAL(10,6) NOT NULL DEFAULT 0.002,
    "price_output_per_1k" DECIMAL(10,6) NOT NULL DEFAULT 0.004,
    "platform_fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    "max_concurrent" INTEGER NOT NULL DEFAULT 4,
    "current_load" INTEGER NOT NULL DEFAULT 0,
    "tokens_per_sec" DECIMAL(10,2),
    "first_token_ms" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending_validation',
    "uptime_30d" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(3,1) NOT NULL DEFAULT 5.0,
    "last_heartbeat" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: gpu_nodes
CREATE TABLE "gpu_nodes" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "node_name" VARCHAR(100) NOT NULL,
    "gpu_type" VARCHAR(50) NOT NULL,
    "fp16_flops" DECIMAL(10,2),
    "vram_gb" INTEGER,
    "cu_score" DECIMAL(10,2),
    "tier" VARCHAR(20),
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending_benchmark',
    "utilization" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "revenue_today" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "revenue_total" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "last_benchmark" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gpu_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_checks
CREATE TABLE "user_checks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "xumm_uuid" VARCHAR(100),
    "xrpl_check_id" VARCHAR(100),
    "send_max_gkc" DECIMAL(20,8) NOT NULL,
    "spent_gkc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inference_sessions
CREATE TABLE "inference_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" UUID,
    "check_id" UUID,
    "api_key_id" UUID,
    "model" VARCHAR(100) NOT NULL,
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "total_input_tok" INTEGER NOT NULL DEFAULT 0,
    "total_output_tok" INTEGER NOT NULL DEFAULT 0,
    "total_cost_gkc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "merkle_root" VARCHAR(64),
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "settled_at" TIMESTAMP(3),
    "tx_hash" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inference_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: session_records
CREATE TABLE "session_records" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost_gkc" DECIMAL(20,8) NOT NULL,
    "leaf_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inference_records
CREATE TABLE "inference_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" UUID,
    "api_key_id" UUID,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_gkc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "provider_revenue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "platform_revenue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "channel_id" VARCHAR(100),
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "tx_hash" VARCHAR(100),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inference_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_channels
CREATE TABLE "payment_channels" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "xrpl_channel_id" VARCHAR(100) NOT NULL,
    "locked_gkc" DECIMAL(20,8) NOT NULL,
    "spent_gkc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "claim_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "claim_signature" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable: transactions
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "amount_gkc" DECIMAL(20,8) NOT NULL,
    "balance_after" DECIMAL(20,8) NOT NULL,
    "reference_id" UUID,
    "tx_hash" VARCHAR(100),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: deposits
CREATE TABLE "deposits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "xumm_uuid" VARCHAR(100) NOT NULL,
    "dest_tag" INTEGER NOT NULL,
    "xrp_amount" DECIMAL(20,8) NOT NULL,
    "gkc_amount" DECIMAL(20,8) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "tx_hash" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE UNIQUE INDEX "ai_providers_endpoint_token_key" ON "ai_providers"("endpoint_token");
CREATE UNIQUE INDEX "user_checks_xrpl_check_id_key" ON "user_checks"("xrpl_check_id");
CREATE UNIQUE INDEX "session_records_session_id_seq_key" ON "session_records"("session_id", "seq");
CREATE UNIQUE INDEX "payment_channels_xrpl_channel_id_key" ON "payment_channels"("xrpl_channel_id");
CREATE UNIQUE INDEX "deposits_xumm_uuid_key" ON "deposits"("xumm_uuid");

-- CreateIndex (performance)
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX "ai_providers_status_idx" ON "ai_providers"("status");
CREATE INDEX "ai_providers_owner_id_idx" ON "ai_providers"("owner_id");
CREATE INDEX "inference_sessions_user_id_idx" ON "inference_sessions"("user_id");
CREATE INDEX "inference_sessions_status_idx" ON "inference_sessions"("status");
CREATE INDEX "session_records_session_id_idx" ON "session_records"("session_id");
CREATE INDEX "inference_records_user_id_idx" ON "inference_records"("user_id");
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX "user_checks_user_id_idx" ON "user_checks"("user_id");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gpu_nodes" ADD CONSTRAINT "gpu_nodes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_checks" ADD CONSTRAINT "user_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON UPDATE CASCADE;
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "user_checks"("id") ON UPDATE CASCADE;
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON UPDATE CASCADE;
ALTER TABLE "session_records" ADD CONSTRAINT "session_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inference_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inference_records" ADD CONSTRAINT "inference_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "inference_records" ADD CONSTRAINT "inference_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON UPDATE CASCADE;
ALTER TABLE "inference_records" ADD CONSTRAINT "inference_records_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON UPDATE CASCADE;
ALTER TABLE "payment_channels" ADD CONSTRAINT "payment_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
