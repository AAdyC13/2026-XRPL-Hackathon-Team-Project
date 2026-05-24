# Database & bootstrap seeds

## Schema changes (tables, columns)

Use Prisma migrations — versioned under `prisma/migrations/`.

```bash
pnpm db:migrate          # local dev: create + apply
pnpm db:deploy           # CI / production: apply pending only
```

On VPS, the app container runs `db:deploy` then `db:seed` before start (see `scripts/docker-entrypoint.sh`). The production image runs `prisma generate` at **build time** and `chown`s `/app` to the `node` user so migrate/seed do not fail on read-only `node_modules`.

## Bootstrap data (users, reference rows)

Use **versioned seeds** under `prisma/seeds/`. Each seed has a stable id (`001_demo_user`, `002_admin_user`, …).

- Tracked in DB table `seed_migrations` (created automatically).
- **Already applied → skipped** on every later deploy (safe for persistent VPS volumes).
- Add `003_your_seed.ts`, register in `prisma/seeds/index.ts`.

```bash
pnpm db:seed
```

Production: `Dockerfile` runs `db:seed` after `db:deploy` on each container start.

### Built-in seeds

| Id | Purpose | Required env |
|----|---------|----------------|
| `001_demo_user` | Demo login for dev/demo | — |
| `002_admin_user` | Platform admin account | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (optional) |

Demo credentials (after `001` runs): `demo@gkc.edu.tw` / `Demo12345678`.

### VPS checklist

1. `docker compose up -d` (postgres + app).
2. `.env` on server with `DATABASE_URL=postgresql://gkc:gkc@postgres:5432/gkc_platform` (host **`postgres`**, not `localhost`).
3. Set `JWT_SECRET` (≥32 chars) and XRPL issuer secrets.
4. For admin bootstrap: set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before first deploy (or before adding seed `002` on an existing DB).
5. First start applies migrations + seeds; later deploys only run new migrations/seeds.

## Test database

Tests use `gkc_platform_test` (see `.env.test.example`). API tests reset `users` per case — they do not rely on production seeds.
