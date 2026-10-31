# Production

The full guide is [Self-hosting](content/docs/07.self-hosting.md) (also at `/docs/self-hosting` in the running app), and
every variable is listed in [Configuration](content/docs/08.configuration.md). This page is the checklist for the
hosted instance at [event-calendar.anorebel.net](https://event-calendar.anorebel.net), deployed on
[Dokploy](https://dokploy.com) with Railpack.

- **Build:** `bun run build` · **Start:** `node .output/server/index.mjs`
- **Auto-deploy:** pushes to `main`.
- **Health check:** `GET /api/health` (returns `503` when the database is unreachable).

## Before deploying this version

1. **Rename the session secret.** Set `NUXT_APP_SECRET` (at least 32 characters, `openssl rand -base64 32`) and remove
   `NUXT_SESSION_PASSWORD`. The server refuses to start in production without a strong `NUXT_APP_SECRET`, and tells you
   if only the old variable is set. Everyone is signed out once.
2. **Run the migrations** against the production database (they add passkey tables and make passwords optional):

   ```bash
   LIBSQL_URL=<prod-url> LIBSQL_AUTH_TOKEN=<token-if-any> bun run db:migrate
   ```

3. **Passkeys need the public host.** Make sure the proxy forwards `Host` and `X-Forwarded-Proto` and the site is
   served over HTTPS; passkeys are bound to `event-calendar.anorebel.net`.
4. **Analytics ids are build-time.** `NUXT_UMAMI_SITE_ID` and `NUXT_RYBBIT_SITE_ID` must be in the build environment.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NUXT_APP_SECRET` | yes | Session sealing key source. |
| `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN` | yes (unless using a mounted file) | libSQL / Turso connection. |
| `NUXT_OPEN_REGISTRATION` | no | `true` for open sign-up; default invite-only. |
| `NUXT_DEMO_ENABLED` | no | Shared demo account, reset daily. |
| `FEATURE_RECURRING_EVENTS`, `FEATURE_COLLABORATION` | no | Build-time flags; override at runtime with `NUXT_PUBLIC_FEATURES_*`. |
| `NUXT_UMAMI_SITE_ID`, `NUXT_RYBBIT_SITE_ID` | no | **Build time.** |
| `NUXT_PUBLIC_ENABLE_ANALYTICS` | no | `false` disables analytics. |

## Rollback

Redeploy a previous build from Dokploy's history, or revert the commit on `main`. Migrations only move forward, so after
a schema change roll forward with a compatible migration rather than rolling back code alone. The passkey migration is
additive: older builds keep working against it, except for accounts that have no password.
