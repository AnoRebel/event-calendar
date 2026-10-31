## Why

An audit of the app found that it is a demo shell wrapped in a production-shaped façade. Events live in a plain `ref` seeded with 29 hardcoded samples (`app.vue:14`, `app.vue:445`) — a page refresh loses everything. A well-built HTTP client (`useEventAPI`) points at `/api/events`, a route that was never written, and is instantiated at `EventCalendar.vue:69` but never called, which kept the gap invisible. The headline drag-and-drop feature is broken at the import level: `useDragAndDrop.ts:2` imports four symbols that do not exist in the installed `@vue-dnd-kit/core` v2.4.7 (they are the v1 API). `/api/health` hardcodes `database: 'healthy'` and will report green against a dead database. Umami has been silently collecting nothing in production for months. `vue-tsc` reports 51 type errors, and the recent dependency update removed `@playwright/test`, leaving the e2e suite and ESLint config unable to resolve their imports.

The README, `PRODUCTION.md`, `docker-compose.yml`, and `.env.example` collectively describe a Postgres/Redis-backed collaborative calendar that does not exist in the code. This change closes the gap between what the app claims and what it does.

## What Changes

**Fixes (broken today)**

- Port `useDragAndDrop` from the v1 `@vue-dnd-kit/core` API to the real v2.4.7 API (`makeDraggable`/`makeDroppable`), add the required `<DnDProvider>`, and move composable calls out of `onMounted`/`watch` into `setup()` scope in `DayView.vue` and `MonthView.vue`. **BREAKING** internally: `isOvered` (boolean) becomes `isDragOver` (`IPlacement | undefined`).
- Fix Umami: map the project-standard `NUXT_UMAMI_SITE_ID` to the module's expected `NUXT_UMAMI_ID` at build time. The env var name stays `NUXT_UMAMI_SITE_ID` everywhere; no Dokploy change required.
- Make `/api/health` honest — probe libSQL for real instead of hardcoding `healthy`.
- Resolve the 51 `vue-tsc` errors; remove the stale `eslint-plugin-playwright` reference from `eslint.config.mjs:3` and the dead `@vercel/*` entries in `trustedDependencies`.
- Replace the unrunnable Playwright e2e suite with bunwright driving Brave; delete `playwright.config.ts`.

**Feature completion (claimed but absent)**

- Add real persistence on libSQL + Drizzle, and write the missing `/api/events` CRUD that `useEventAPI` already expects.
- Add authentication via `nuxt-auth-utils` + authorization via `nuxt-authorization`.
- Add real-time collaboration via Nitro `crossws` WebSockets using broadcast-on-write.
- Wire `FEATURE_*` flags into `runtimeConfig` so they actually gate behavior. **BREAKING**: `app.vue` stops seeding 29 sample events and loads from the API instead.

**Removals**

- Delete `useEventAPI`'s dead instantiation, the deprecated `useErrorHandling`, the never-mounted `ExternalCalendarSettings.vue`, and the duplicate resize logic in favor of the existing `useEventResize`. **BREAKING**: `useExternalCalendar` is entirely simulated (`'simulated_access_token'`, `mockEvents`) and is removed rather than shipped as a fake.

## Capabilities

### New Capabilities

- `event-persistence`: Durable event storage on libSQL via Drizzle, and the `/api/events` CRUD surface backing it.
- `auth`: User identity, sessions, and per-event authorization.
- `realtime-collaboration`: Multi-user live sync of event changes over WebSockets.
- `analytics`: Umami and Rybbit telemetry, correctly configured and verifiable.
- `e2e-testing`: Browser-driven end-to-end tests on bunwright + Brave.
- `feature-flags`: Runtime-gated feature toggles that reflect reality.
- `drag-and-drop`: Event dragging and resizing against the real vue-dnd-kit v2 API.
- `distributable-module`: The calendar packaged as an installable Nuxt module + Vue 3 plugin, with an optional Nitro persistence layer, consumed by the demo app.

### Modified Capabilities

None — `openspec/specs/` is empty; this is the project's first set of specs.

## Impact

- **Dependencies added**: `@libsql/client`, `drizzle-orm`, `drizzle-kit`, `nuxt-auth-utils`, `nuxt-authorization`, `@vue-dnd-kit/nuxt`. **Removed**: `playwright.config.ts` and the `@playwright/test`/`eslint-plugin-playwright` references.
- **Code**: `app.vue` (sample data → API), `EventCalendar.vue`, `useDragAndDrop.ts`, all four view components, `nuxt.config.ts`, `eslint.config.mjs`, `server/api/*`, new `server/db/*` and `server/routes/_ws.ts`.
- **Infra**: A libSQL service must exist in Dokploy (the Analytics project already runs Umami/Rybbit; Dokploy has native libSQL support). The unused `DATABASE_URL`/`REDIS_URL` Postgres and Redis env entries become obsolete.
- **Security**: Introduces authentication where none existed. `SECRET_KEY`/`JWT_SECRET`/`ENCRYPTION_KEY` are currently the literal placeholder strings from `.env.example` in production and must be replaced; `NUXT_SESSION_PASSWORD` (≥32 chars) is newly required.
- **Analytics**: Rybbit is live and working — its behavior is preserved exactly (same endpoint, same site ID); only its config location moves.
- **Docs**: README and `PRODUCTION.md` describe an aspirational system and need correcting to match what ships.
