-- DropForeignKey
ALTER TABLE "deposits" DROP CONSTRAINT "deposits_user_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_records" DROP CONSTRAINT "inference_records_api_key_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_records" DROP CONSTRAINT "inference_records_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_records" DROP CONSTRAINT "inference_records_user_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_sessions" DROP CONSTRAINT "inference_sessions_api_key_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_sessions" DROP CONSTRAINT "inference_sessions_check_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_sessions" DROP CONSTRAINT "inference_sessions_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "inference_sessions" DROP CONSTRAINT "inference_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_channels" DROP CONSTRAINT "payment_channels_user_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropIndex
DROP INDEX "ai_providers_owner_id_idx";

-- DropIndex
DROP INDEX "ai_providers_status_idx";

-- DropIndex
DROP INDEX "api_keys_user_id_idx";

-- DropIndex
DROP INDEX "inference_records_user_id_idx";

-- DropIndex
DROP INDEX "inference_sessions_status_idx";

-- DropIndex
DROP INDEX "inference_sessions_user_id_idx";

-- DropIndex
DROP INDEX "session_records_session_id_idx";

-- DropIndex
DROP INDEX "transactions_user_id_idx";

-- DropIndex
DROP INDEX "user_checks_user_id_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "theme" VARCHAR(10) NOT NULL DEFAULT 'light';

-- AddForeignKey
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "user_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_records" ADD CONSTRAINT "inference_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_records" ADD CONSTRAINT "inference_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_records" ADD CONSTRAINT "inference_records_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_channels" ADD CONSTRAINT "payment_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
