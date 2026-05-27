# Database & bootstrap seeds

## Schema changes (tables, columns)

Use Prisma migrations — versioned under `prisma/migrations/`.

```bash
pnpm db:migrate          # local dev: create + apply
pnpm db:deploy           # CI / production: apply pending only
```

On VPS, the app container runs `db:deploy` before start (see `scripts/docker-entrypoint.sh`). Run seeds manually when needed: `pnpm seed:db`. The production image runs `prisma generate` at **build time** and `chown`s `/app` to the `node` user so migrate does not fail on read-only `node_modules`.

Runtime DB access uses Prisma 7 with `@prisma/adapter-pg` — see `server/db/index.ts` (`DATABASE_URL` required).

## Bootstrap data (users, reference rows)

Script: `server/scripts/seed-db.ts` (idempotent — skips existing demo user / providers).

```bash
pnpm seed:db
```

Demo credentials: `demo@gkc.edu.tw` / `password123`.

### VPS checklist

1. `docker compose up -d` (postgres + app).
2. `.env` on server with `DATABASE_URL=postgresql://gkc:gkc@postgres:5432/gkc_platform` (host **`postgres`**, not `localhost`).
3. Set `JWT_SECRET` (≥32 chars) and XRPL issuer secrets.
4. Optional: `pnpm seed:db` inside the app container (or locally) for demo user and mock providers.
5. First start applies migrations; later deploys only run pending migrations.
6. GitHub Actions stores the last successful `IMAGE_TAG` as `deploy.env.previous` and can roll back the app image after a failed post-deploy health gate. This does **not** roll back already-applied Prisma migrations; fix database drift with a forward migration or a database backup restore.

## Test database

Tests use `gkc_platform_test` (see `.env.test.example`). API tests reset `users` per case — they do not rely on production seeds.
