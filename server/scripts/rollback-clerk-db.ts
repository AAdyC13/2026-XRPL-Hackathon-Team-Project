import 'dotenv/config';
import { readFileSync } from 'fs';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const sql = readFileSync('docs/sql/rollback_clerk_user_id.sql', 'utf8');
  await pool.query(sql);
  console.log('[rollback] Clerk migration reverted on database');

  const cols = await pool.query(
    `SELECT column_name, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name IN ('clerk_user_id', 'password_hash')
     ORDER BY column_name`,
  );
  console.table(cols.rows);

  const mig = await pool.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name LIKE '%clerk%'`,
  );
  console.log('clerk_migrations_remaining:', mig.rows.length);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
