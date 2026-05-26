-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verification_expiry" TIMESTAMP(3),
ADD COLUMN     "verification_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN     "verification_token" VARCHAR(255),
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "xaman_user_token" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_xrp_address_key" ON "users"("xrp_address");
