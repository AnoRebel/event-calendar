# Production Deployment (Dokploy)

This app is deployed on [Dokploy](https://dokploy.com) using Railpack, at
[event-calendar.anorebel.net](https://event-calendar.anorebel.net).

- **Build:** `bun run build`
- **Start:** `node .output/server/index.mjs`
- **Auto-deploy:** enabled for the `main` branch — pushing to `main` triggers a new deployment.

## 1. Provision a libSQL database

The app persists to **libSQL** (Turso-compatible / self-hosted `sqld`) via Drizzle ORM. Provision one of:

- a self-hosted `sqld` service (e.g. as a Dokploy service/container), or
- a Turso database.

You'll need the connection URL (and an auth token if the instance requires one).

## 2. Set environment variables

Configure these on the Dokploy application. See `.env.example` for the full, authoritative list — the app reads only
these variables.

**Required**

| Variable                | Notes                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `production`                                                                            |
| `LIBSQL_URL`            | libSQL connection URL (e.g. `http://sqld-host:8080` or a Turso `libsql://…` URL)        |
| `LIBSQL_AUTH_TOKEN`     | Only if the libSQL instance requires auth (Turso, or a JWT-protected `sqld`)            |
| `NUXT_SESSION_PASSWORD` | Seals the auth session cookie. **Min 32 chars.** Generate: `openssl rand -base64 32`    |

> **Secrets guard:** in production the server refuses to boot unless `NUXT_SESSION_PASSWORD` is at least 32 characters
> and not a known placeholder (`server/plugins/secrets-guard.ts`). A missing or weak value aborts startup.

**Registration policy** (default is invite/seed-only — first account bootstraps, then invites are required)

| Variable                  | Effect                                             |
| ------------------------- | -------------------------------------------------- |
| `NUXT_OPEN_REGISTRATION`  | `true` to allow open public registration (runtime) |
| `OPEN_REGISTRATION`       | Build-time default for the same                    |

**Feature flags** (default off)

| Variable                                  | Notes                                       |
| ----------------------------------------- | ------------------------------------------- |
| `FEATURE_RECURRING_EVENTS` / `NUXT_PUBLIC_FEATURES_RECURRING_EVENTS` | Recurring events (build-time / runtime)     |
| `FEATURE_COLLABORATION` / `NUXT_PUBLIC_FEATURES_COLLABORATION`       | Real-time WebSocket sync (build-time / runtime) |

**Analytics** (optional)

| Variable                       | Notes                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `NUXT_UMAMI_SITE_ID`           | **Must be set at BUILD time** — baked into the bundle by `nuxt-umami`           |
| `NUXT_RYBBIT_SITE_ID`          | Rybbit site id                                                                 |
| `NUXT_PUBLIC_ENABLE_ANALYTICS` | `false` disables both Umami and Rybbit                                          |

> Because `NUXT_UMAMI_SITE_ID` is read during the build, set it in the build environment, not just at runtime — otherwise
> Umami silently tracks nothing.

## 3. Run migrations

Apply the Drizzle migrations against the provisioned libSQL database **once** before (or as part of) the first deploy,
and again whenever a new migration is added. Point `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` at the production database and run
this from a checkout of the repo (the migrations live in `server/db/migrations/`):

```bash
LIBSQL_URL=<prod-url> LIBSQL_AUTH_TOKEN=<token-if-any> bun run db:migrate
```

Migrations are not applied automatically on server boot — run this step explicitly so schema changes are deliberate and
observable. After it succeeds, `/api/health` will report `database: healthy`.

## 4. Deploy

Push to `main` (auto-deploy) or trigger a deployment in Dokploy. Railpack builds with `bun run build` and starts with
`node .output/server/index.mjs`.

## Health checks

`GET /api/health` performs a **real database probe** (`SELECT 1` against libSQL). If the database is unreachable the
endpoint reports `unhealthy` and returns **HTTP 503**; otherwise `healthy` (200). Point Dokploy's health check at this
endpoint so a DB outage marks the deployment unhealthy.

```bash
curl -f https://event-calendar.anorebel.net/api/health
```

## Rollback

Dokploy retains prior deployments. To roll back:

- Redeploy a previous build from the Dokploy deployment history, or
- Revert the offending commit on `main` (`git revert <sha>` and push) — auto-deploy ships the reverted state.

If a schema change is involved, remember migrations are forward-only here; plan a compatible follow-up migration rather
than relying on a code rollback alone.
