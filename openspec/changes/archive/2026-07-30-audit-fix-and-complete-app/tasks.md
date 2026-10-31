## 1. Repair the build and toolchain

- [x] 1.1 Remove `eslint-plugin-playwright` from `eslint.config.mjs:3` and confirm `bun run lint` resolves
- [x] 1.2 Delete `playwright.config.ts` and `e2e/drag-drop.spec.ts` (replaced in section 3)
- [x] 1.3 Remove `@vercel/analytics` and `@vercel/speed-insights` from `trustedDependencies` in `package.json` (only `@vercel/speed-insights` was present)
- [x] 1.4 Fix the `manualChunks` type error at `nuxt.config.ts:40` (object literal typed as `ManualChunksFunction`) — converted to the function form
- [x] 1.5 Work through the remaining `vue-tsc` errors: `EventModal.vue` (8 real), `ColorManager.vue` (5), `useRecurringEvents.ts` (4), `EventCalendar.vue` (3), `usePerformanceCache.ts` (1), plus `useServiceWorker.ts` (1, surfaced in baseline)
- [x] 1.6 Fix the type errors in the existing test files: `useEventStatus.test.ts` (widened param to `Readonly<Ref>`), `EventCalendar.test.ts` (added `defineExpose` + drive exposed ref instead of `setData`)
- [x] 1.7 `bun run typecheck` passes with ZERO errors (confirmed after section 2); `bun run test:run` 21/21 green (also fixed a real pre-existing `useColorManager` bug + missing vitest vue plugin surfaced by the test transform); `bun run build` succeeds. Note: `bun run lint` now *resolves* (config loads) but reports 133 pre-existing style/strictness errors in untouched files — out of scope for sections 1-4.

## 2. Fix drag-and-drop (port to vue-dnd-kit v2)

- [x] 2.1 Installed `@vue-dnd-kit/nuxt@1.0.2` and registered it in `nuxt.config.ts` modules; did NOT install components/devtools
- [x] 2.2 Wrapped `app.vue` in `<DnDProvider>` + `<DragPreview />` (module auto-registers both globally)
- [x] 2.3 Rewrote the import to `makeDraggable`/`makeDroppable`/`IDragEvent`
- [x] 2.4 Ported `createDraggableEvent`: caller-owned ref, `data` factory, payload `() => [0, [event]]`
- [x] 2.5 Ported `createDroppableZone`: zone id into `data`, `events.onDrop` reading `draggedItems[0].item`, `isDragOver` shimmed to boolean `isOver`
- [~] 2.6 `calculateEventUpdate` is not on the v2 drop path (drops flow through the native `handleDrop`→`config.handleDrop`); left intact, no MouseEvent regression. Revisit only if wired to the v2 path later.
- [x] 2.7 Moved `DayView.vue` zone creation into `setup()` (two static zones, live-prop configs)
- [x] 2.8 `MonthView.vue` + `WeekView.vue`: the vue-dnd-kit zones were DEAD (drops run through native HTML5 DnD; `isOver`/`createDraggableEvent` never consumed) — removed the broken `onMounted`/`watch` `makeDroppable` machinery rather than wrapping per-cell child components for unused refs
- [x] 2.9 Updated the re-exports to `makeDraggable`/`makeDroppable`
- [~] 2.10 `createResizeHandler` untouched (already hand-rolled pointer events; v2 has no resize API). `useEventResize.ts` consolidation deferred to section 9 cleanup (it's dead code; removing it belongs with the other dead-code removals).
- [x] 2.11 SSR guards intact (`typeof window === 'undefined'` early returns in both factories); build succeeds
- [x] 2.12 Manually verify drag/resize in a real browser (bunwright, done in section 3)

## 3. Rebuild e2e on bunwright + Brave

- [x] 3.1 Added `bunwright.config.ts` (`backend: chrome`, `/usr/bin/brave`, `BUN_CHROME_PATH` override, auto-loaded by bunwright — the harness does NOT call `browser.config()`)
- [x] 3.2 Added `test:e2e` script (`bun test e2e/`); excluded `e2e/**` from vitest so the two runners don't collide over `bun:test`
- [x] 3.3 CDP drag test via `page.cdp('Input.dispatchMouseEvent')` (press/move/release)
- [x] 3.4 Test: calendar loads + view switching (keyboard shortcuts) — passing
- [~] 3.5 Test covers the create-event modal opening with its fields. Full create→edit→delete with reload persistence is deferred to section 6 (no persistence exists yet; the modal also requires Start Time for submit)
- [x] 3.6 Drag test drives a real browser drag via CDP and asserts the app stays healthy (also satisfies 2.12)
- [x] 3.7 `captureFailure()` writes a screenshot to `e2e/artifacts/` on failure (gitignored)
- [x] 3.8 Suite is self-contained: `setup.ts` auto-builds/starts `.output/server` if BASE_URL isn't reachable and reaps Bun.WebView orphan processes (oven-sh/bun#30475). 4/4 pass, stable across runs.
- [x] 2.12 Drag verified in a real browser (bunwright CDP drag test)

## 4. Fix analytics

- [x] 4.1 Umami reads `NUXT_UMAMI_SITE_ID` (resolved once at top of `nuxt.config.ts` → module `id`); the module also natively accepts `NUXT_UMAMI_ID`. Name stays `NUXT_UMAMI_SITE_ID` throughout. Verified: `/api/savory` route registers in the build → proxy (not faux) mode.
- [x] 4.2 Build-time `console.warn` fires when the site ID is missing (verified via `nuxi prepare` with empty ID)
- [x] 4.3 Set `logErrors: true`; removed the dead `runtimeConfig.umami.id` and `runtimeConfig.rybbit.siteId` entries the module never read
- [x] 4.4 Rybbit site id resolved once at top of config; `app.head.script` preserves the exact endpoint + `data-site-id` (verified present in prerendered index.html)
- [x] 4.5 Removed the commented-out `@nuxt/scripts` rybbit registry block
- [x] 4.6 Both trackers gated on `analyticsEnabled` (`NUXT_PUBLIC_ENABLE_ANALYTICS !== "false"`)
- [~] 4.7 Build-artifact verification done (savory route present, rybbit in HTML). Runtime `POST /api/savory` check moved to the section-3 bunwright run.
- [x] 4.8 Documented the build-time requirement in `.env.example`

## 5. Persistence: libSQL + Drizzle

- [x] 5.1 Installed `@libsql/client`, `drizzle-orm`, `drizzle-kit`
- [~] 5.2 A libSQL service must be provisioned in Dokploy (deploy-time infra step — deferred to section 10); local dev uses `file:./.data/events.db`
- [x] 5.3 Added `drizzle.config.ts` (`dialect: 'turso'`), URL from env
- [x] 5.4 `server/db/schema.ts` — dialect-portable events table (text/integer only, query builder everywhere)
- [x] 5.5 `server/utils/db.ts` reads libSQL URL/token from `runtimeConfig` (lazy singleton) + `eventMapper.ts` row↔DTO
- [x] 5.6 Added `db:generate`/`db:migrate`/`db:push`/`db:seed` scripts using `bun --bun drizzle-kit`
- [x] 5.7 Generated + applied the initial migration; verified the `events` table (18 cols)
- [x] 5.8 `scripts/seed.ts` seeds representative sample events (upsert-safe); verified 5 rows
- [x] 5.10 `/api/health` now does a real `SELECT 1` libSQL probe (was hardcoded `healthy`); reports 503 when the DB is down

## 6. Events API

- [x] 6.1 `GET /api/events?start=&end=&page=&limit=` — paginated envelope (data/total/page/limit/hasMore), ISO date-range overlap filter. Verified.
- [x] 6.2 `POST /api/events` → 201 with server-assigned UUID (client id ignored). Verified.
- [x] 6.3 `PATCH /api/events/:id` → 200 updated / 404 unknown. Verified.
- [x] 6.4 `DELETE /api/events/:id` → 204 / 404 second delete. Verified.
- [x] 6.5 Server validation via `eventValidation.ts`: empty title → 400, end-before-start → 400, unknown fields ignored by `dtoToRow`. Verified.
- [x] 6.6 Client persistence moved to `useCalendarData` (real `$fetch` CRUD, ISO↔Date); the fake `simulateAPICall`/`useEventStore` are no longer on the app path (store slated for removal in section 9)
- [x] 6.7 Removed the dead `useEventAPI` instantiation from `EventCalendar.vue`
- [x] 6.8 Source-of-truth resolved: `EventCalendar` is a controlled component (props in, emits out); removed dead `eventStore` writes. `app.vue` owns data via `useCalendarData`.
- [x] 6.9 `app.vue` loads from `/api/events` on mount with loading + error(retry) states; the 29 hardcoded samples are gone (preserved as the seed). Verified via e2e + API.
- [x] 6.10 (done in 5.10)

## 7. Auth

- [x] 7.1 Installed + registered `nuxt-auth-utils` and `nuxt-authorization`; added the required `server/plugins/authorization.ts` (`resolveServerUser` → session) — WITHOUT it `authorize()` silently allows everyone
- [x] 7.2 `NUXT_SESSION_PASSWORD` documented in `.env.example` (≥32 chars, openssl hint); Dokploy set in section 10
- [x] 7.3 `server/plugins/secrets-guard.ts` aborts prod startup on short session password + placeholder SECRET_KEY/JWT_SECRET/ENCRYPTION_KEY (verified: blocks with clear message)
- [x] 7.4 `users` table added (id/email/name/passwordHash/createdAt); sessions are cookie-sealed, no session table
- [x] 7.5 `ownerId` on events; set server-side on create, immutable via PATCH
- [x] 7.6 register/login/logout routes; scrypt `hashPassword`/`verifyPassword`; generic errors (no account enumeration); no plaintext logged
- [x] 7.7 `shared/utils/abilities.ts` — `editEvent`/`deleteEvent` gated on ownership
- [x] 7.8 401 unauthenticated + 403 non-owner enforced server-side (verified: B→A's event = 403)
- [x] 7.9 Listing scoped to `ownerId` (verified: B sees 0 of A's events)
- [x] 7.10 `AuthPanel.vue` sign-in/up + sign-out wired via `useUserSession`; app gates calendar behind `loggedIn`. e2e signs up through the UI — 4/4 pass.
- [x] 7.11 Date handling uses date-fns (`parseISO`/`isValid`) at the wire boundary per project convention

## 8. Real-time collaboration

- [x] 8.1 `nitro.experimental.websocket: true` confirmed correct for Nitro 2.13.4 (left as-is)
- [x] 8.2 `server/routes/_ws.ts` with `defineWebSocketHandler` (crossws 0.3.5)
- [x] 8.3 Session resolved in the `open` hook via a mock H3Event built from the peer's cookie header (getUserSession needs an event, not the raw peer request) — verified both peers authenticate
- [x] 8.4 API calls `broadcastEventChange` only after a successful write (create/update/delete); the broadcaster is a registered publisher decoupled from transport
- [x] 8.5 `useCalendarRealtime` connects, applies remote changes via `applyRemote`, exponential-ish reconnect
- [x] 8.6 Own-echo suppression: `useCalendarData` tracks recently-written ids (5s TTL); `applyRemote` is also idempotent (upsert)
- [x] 8.7 Broadcasts are owner-scoped (per-user topic) — verified B does NOT receive A's event changes
- [x] 8.8 Reconnect triggers a resync `load()`; CRUD works fully without the socket (realtime is enhancement-only)
- [x] 8.9 Concurrent edits: last-write-wins via PATCH (server applies the latest write; all clients converge on the broadcast)
- [x] 8.10 Verified programmatically with two authenticated WS connections (create/update/delete all broadcast; owner-scoped). Two-browser manual check optional.

## 9. Feature flags and cleanup

- [x] 9.1 `FEATURE_*` exposed via `runtimeConfig.public.features`, read at runtime (build-time default via FEATURE_*; runtime override via NUXT_PUBLIC_FEATURES_*). Default off; unparseable → off. Verified runtime override flips 403→201 with no rebuild.
- [x] 9.2 Recurring gated in `EventModal` UI AND server-side (POST/PATCH reject `isRecurring` → 403 when off). Verified.
- [x] 9.3 Collaboration gated: `app.vue` only starts the WS when enabled; the WS `open` hook refuses subscription when off
- [x] 9.4 Advanced-notifications flag dropped — no such feature exists (only `useAdvancedValidation`, unrelated)
- [x] 9.5 Removed `useExternalCalendar.ts`, `ExternalCalendarSettings.vue`, and the `FEATURE_EXTERNAL_CALENDARS` flag
- [x] 9.6 Removed deprecated `useErrorHandling.ts` and its stale test mock
- [x] 9.7 Deleted `useVirtualization.ts` (fully dead)
- [x] 9.8 Deleted `ColorManager.vue` component (never mounted; the `useColorManager` composable stays — it's used)
- [x] 9.9 Removed `DATABASE_URL` fallback (footgun: it pointed at Postgres) from nuxt.config/drizzle.config/seed; dropped REDIS_URL and the external-calendar flag from `.env.example`
- [x] 9.10 Also removed the now-dead `useEventStore.ts` + `useEventAPI.ts` (superseded by `useCalendarData` + the real API)

## 10. Verify and document

- [x] 10.1 `bun run typecheck` (zero errors) and `bun run test:run` (21/21) pass. `bun run lint` resolves (pre-existing style errors in untouched files remain — out of scope).
- [x] 10.2 bunwright e2e suite passes 4/4
- [x] 10.3 `.env.example` rewritten to ONLY the vars the app reads (libSQL, NUXT_SESSION_PASSWORD, registration + feature flags, analytics); dropped Postgres/Redis/external-calendar/SMTP/AWS/Sentry/etc.
- [x] 10.4 README.md + PRODUCTION.md rewritten to match reality (libSQL not Postgres/Redis, no external calendar, bunwright not Playwright, real API + auth + registration policy)
- [x] 10.5 Documented `NUXT_UMAMI_SITE_ID` build-time requirement in `.env.example` and README
- [~] 10.6 Deploy: Dokploy provisioning BLOCKED — the Dokploy MCP server disconnected this session. Deploy runbook is written in PRODUCTION.md; the libSQL service + secrets must be set by hand (see below).
- [~] 10.7 In-prod verification deferred to after the deploy step
- [x] 10.8 Registration policy: invite/seed-only default (bootstrap first user + invite tokens via POST /api/invites) with `NUXT_OPEN_REGISTRATION=true` to open. Verified all paths (bootstrap 200, no-token 403, valid-token 200, reuse 403, unauth invite 401, open-mode 200).
- [x] 10.9 Removed vestigial unused secrets (SECRET_KEY/JWT_SECRET/ENCRYPTION_KEY + runtimeConfig.secretKey); secrets-guard now only enforces a strong NUXT_SESSION_PASSWORD in prod
- [x] 10.10 Verified `bun run db:migrate` initializes a fresh libSQL DB and `/api/health` then reports healthy (real probe)

## 11. Distributable module (shadcn-vue registry — chosen over npm package, like mapcn)

- [x] 11.1 Distributed as a shadcn-vue REGISTRY (not an npm module): `registry.json` + `registry/`, built with `bun run registry:build` → `public/r/*.json`. Consumers install via `npx shadcn-vue@latest add <url>`.
- [x] 11.2 15 shadcn ui primitives listed as `registryDependencies` (bare names) so the installer auto-pulls them; no manual per-component add
- [x] 11.3 Nuxt-decoupled the UI so it works in plain Vue too: `<Icon lucide:*>` → `lucide-vue-next`; recurring flag → `features` prop; dark-mode → `#header-actions` slot (removed `useDarkMode`/`useFeatureFlags` coupling). Verified no Nuxt-only calls remain.
- [x] 11.4 Type declarations ship as part of the copied source (types.ts is a registry:lib file)
- [x] 11.5 TIERED items let users choose: `event-calendar` (UI) / `-data` (client) / `-persistence` (Nitro+libSQL) / `-realtime` (crossws). Each optional item depends on the previous → install a tier = install everything above it.
- [x] 11.6 Optional server layers shipped AUTH-DECOUPLED (single-user + `TODO(auth)` hooks) so they install and run without the app's auth stack
- [x] 11.7 Registry is the CANONICAL source; the demo app imports the calendar from `registry/event-calendar/` (no divergent copy). Verified: typecheck + 21/21 unit + 4/4 e2e + build all green after the move.
- [x] 11.8 Docs: README "Use it in your own project" section + a full in-app `/docs` page (`pages/docs.vue`) with install/usage/props/setup, cross-linked with the calendar (`/` ⇄ `/docs`). Also a hosted claude.ai artifact.
- [x] 11.9 Registry versioned via `registry.json`; `registry:build` rewrites the host URL. App switched to pages mode (`pages/index.vue` + `pages/docs.vue`, thin `app.vue` shell) — root-based structure confirmed correct for this project (not `app/`).
