# PostgreSQL：復原 Clerk migration (`20260527020000_add_clerk_user_id`)

本 migration 曾對 `users` 表做兩件事：

1. 新增可為空的 `clerk_user_id` 欄位與 unique index
2. 將 `password_hash` 改為 **可為 NULL**（供 Clerk-only 使用者）

回退程式碼後，若 DB 仍保留上述結構，Prisma schema（`password_hash` 必填）可能與實際 DB 不一致。

## 執行前檢查

```sql
-- 是否有 Clerk 建立、且沒有本地密碼的列（回退 NOT NULL 前必查）
SELECT id, email, clerk_user_id, password_hash IS NULL AS missing_password
FROM users
WHERE clerk_user_id IS NOT NULL OR password_hash IS NULL;
```

- 若存在 `password_hash IS NULL` 的列：先刪除測試帳、或為其補上密碼雜湊，再執行下方 `SET NOT NULL`。
- 若只有 `clerk_user_id` 有值、密碼仍在：可直接刪欄位。

## 建議復原 SQL（本地 / 與 deploy 相同邏輯）

```sql
BEGIN;

-- 1) 移除 Clerk 對映欄位與索引
DROP INDEX IF EXISTS "users_clerk_user_id_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id";

-- 2) 恢復 password_hash 為 NOT NULL（僅在無 NULL 列時成功）
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

-- 3) 從 Prisma 遷移紀錄移除（避免 migrate deploy 以為已套用）
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260527020000_add_clerk_user_id';

COMMIT;
```

## 使用 psql 執行（專案預設連線）

```bash
# 依 .env 的 DATABASE_URL 調整
psql "postgresql://gkc:gkc@localhost:5432/gkc_platform" -f docs/sql/rollback_clerk_user_id.sql
```

或將上方 SQL 存成檔案後手動執行。

## VPS / Docker Compose

在能連到 production DB 的環境執行**同一套 SQL**（先備份）：

```bash
docker compose exec postgres pg_dump -U gkc gkc_platform > backup_before_clerk_rollback.sql
# 再執行復原 SQL
```

## 回退後

```bash
pnpm db:generate
```

確認 `prisma/schema.prisma` 的 `User` 已無 `clerkUserId`，且 `passwordHash` 為必填。

## 風險

| 情況 | 處理 |
|------|------|
| 僅 Clerk 註冊、無 `password_hash` | 刪除該列或補密碼後再 `SET NOT NULL` |
| 已用 email 綁定舊帳的 Clerk 使用者 | 刪 `clerk_user_id` 不影響既有 `password_hash` 登入 |
| migration 紀錄未刪 | 日後若誤加回 migration 檔，deploy 可能跳過或衝突 |
