-- Rollback: 20260527020000_add_clerk_user_id
-- Run only after checking docs/DB_ROLLBACK_CLERK.md

BEGIN;

DROP INDEX IF EXISTS "users_clerk_user_id_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id";
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260527020000_add_clerk_user_id';

COMMIT;
