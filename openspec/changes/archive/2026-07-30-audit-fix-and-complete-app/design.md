## Context

The app is a Nuxt 4.4 / Nitro / Bun calendar deployed on Dokploy at `event-calendar.anorebel.net`, built with Railpack from `AnoRebel/event-calendar@main`. An audit established that the UI layer (views, colors, filtering, modal, keyboard nav, multi-day layout) is genuinely implemented, while the production layer beneath it is simulated:

- **No persistence.** Events are a `ref` seeded with 29 hardcoded samples (`app.vue:14`, `app.vue:445`). `useEventStore.simulateAPICall` (`useEventStore.ts:230-238`) fakes latency with `setTimeout` and a 10% random failure. The store is also write-only — views render from `props.events`, not from the store.
- **No API.** `useEventAPI` is a competent client (retry, backoff, dedup) aimed at `/api/events`, which does not exist. It is instantiated at `EventCalendar.vue:69` and never called, which is why the 404s were never observed.
- **Broken drag-and-drop.** `useDragAndDrop.ts:2` imports the v1 API from `@vue-dnd-kit/core` v2.4.7. Those symbols were removed in v2.
- **Dishonest health.** `server/api/health.get.ts:13-14` hardcodes `database: 'healthy'` / `redis: 'healthy'`.
- **Silent analytics.** Umami has never tracked; Rybbit works.
- **Broken tooling.** The dependency update removed `@playwright/test`; `playwright.config.ts:1`, `e2e/drag-drop.spec.ts:1`, and `eslint.config.mjs:3` cannot resolve. `vue-tsc` reports 51 errors.

The user has decided: complete the flagged features, on libSQL with a portable Drizzle schema, with auth and real-time collaboration, e2e on bunwright + Brave, and Rybbit's working behavior preserved.

## Goals / Non-Goals

**Goals:**

- Make the app's behavior match its claims: real persistence, real API, real health, real flags.
- Fix everything that is broken today (drag-and-drop, Umami, types, lint, e2e).
- Add identity and multi-user live collaboration.
- Keep the data layer portable to Postgres.
- Preserve Rybbit exactly as it works today, and keep the `NUXT_UMAMI_SITE_ID` env name unchanged so no Dokploy edit is needed.

**Non-Goals:**

- External calendar sync (Google/Microsoft). `useExternalCalendar` is entirely simulated and its only consumer is never mounted; it is removed, not fixed.
- Redis. `REDIS_URL` is set in production but unused; single-process fan-out needs no Redis.
- The Postgres at `DATABASE_URL`. It is live but has never been touched by code; it is superseded by libSQL.
- Design/visual overhaul. The UI layer is sound; this change is about the foundation.
- Offline write sync. `public/sw.js:257` IndexedDB hooks stay placeholders.

## Decisions

### libSQL + Drizzle, with a portable schema

**Chosen** over Postgres on operational grounds: Dokploy supports libSQL natively, and it is lighter than standing up a schema in the existing Postgres.

The user's stated reason — that libSQL would be "more convenient even for the real time collab" — **does not hold, and this was verified rather than assumed.** libSQL has no realtime subscription, change feed, or LISTEN/NOTIFY. A Turso employee stated this directly (HN 43537577): attempts were abandoned; the replacement is planned for Limbo with no ETA. The CDC feature that does exist is poll-only, lives in the new Turso rewrite rather than libSQL/sqld, and is marked unstable — so it is unavailable to a self-hosted deployment.

This does not invalidate the choice, because **realtime is application-level regardless of database.** Postgres LISTEN/NOTIFY would only matter across multiple server processes, which this app does not run (`replicas: 1`). So libSQL costs nothing here. But the reasoning is recorded so the decision isn't re-litigated on a false premise.

Because the premise turned out to be wrong, the schema stays **dialect-portable** (Drizzle query builder only, no libSQL-specific SQL) so a Postgres move is a config change. Connection: `@libsql/client` + `drizzle-orm/libsql`, URL read from `runtimeConfig` so it is runtime-configurable. Self-hosted sqld without auth uses an `http://` URL and **omits** `authToken`. `drizzle-kit` must be invoked as `bun --bun drizzle-kit …`, as it otherwise fails to detect Bun's driver.

*Alternative rejected:* `bun:sqlite` + `drizzle-orm/bun-sqlite` — fastest, but local-file only, so it cannot reach a remote sqld service.

### Realtime: Nitro crossws + broadcast-on-write

The API handler writes to libSQL, then explicitly publishes to a crossws topic. The database stays dumb; the app owns fan-out.

`nitro.experimental.websocket: true` is **already correct** for the installed Nitro 2.13.4 and must not be "fixed" — the `features.websocket` naming in current Nitro docs is v3/Nuxt 5. WebSockets work under the Node output (`.output/server/index.mjs`); the reverse proxy needs upgrade support. Identity is attached in the `open` hook, **not** via context returned from `upgrade` — nuxt#33829 means that context does not reliably reach `peer.context`.

*Alternative rejected:* polling — wasteful and laggy for an app already configured for WebSockets.

### Auth: nuxt-auth-utils + nuxt-authorization

Sealed cookie sessions mean **zero session tables**; the app owns exactly one `users` table, keeping the Drizzle schema ours. `nuxt-authorization` is auth-layer agnostic and ships a documented `nuxt-auth-utils` integration; both are Nuxt 4 compatible.

*Alternative rejected:* Better Auth. More capable (2FA, orgs, plugins) and its Drizzle `sqlite` provider does cover libSQL, but it mandates its own multi-table schema and its CLI `migrate` is incompatible with Drizzle — migrations would be manual anyway. Over-scoped for a small self-hosted calendar. Revisit if orgs/SSO/2FA are ever needed.

### Umami: map the env var in nuxt.config

The root cause is a name mismatch: the module reads only `NUXT_UMAMI_ID` (or `NUXT_PUBLIC_UMAMI_ID`); production sets `NUXT_UMAMI_SITE_ID`. With no ID resolved, the module falls back to **faux mode**, which returns `Promise.resolve({ok:false})` and sends nothing — silently. That is precisely the observed behavior.

Two further facts, both confirmed against the installed `dist/module.mjs`:

1. **Cloak mode never injects a script tag.** It registers a server proxy at `/api/savory` and blanks the public config deliberately. The absent script tag in production HTML was a red herring — that is correct behavior. Verification is a `POST /api/savory`, not markup inspection.
2. **The ID is read in the module `setup()` hook — at build time** (`dist/module.mjs:130-133`). Setting it only in the running container has no effect. `runtimeConfig.umami.id` in `nuxt.config.ts:98` does nothing; the module never reads it.

**Decision:** per the user, `NUXT_UMAMI_SITE_ID` stays the name everywhere. `nuxt.config.ts` maps it to `NUXT_UMAMI_ID` at build time. Dokploy is untouched, the name stays consistent across the user's projects, and the build warns loudly instead of shipping a silent non-tracking build. `logErrors: true` while verifying.

### Rybbit: preserve behavior, move config

Rybbit is live and firing (`script.js` → 200, correct `data-site-id`). Its only flaw is that `app.head.script` gates on a build-time `process.env` read, so the site ID is baked in. It moves to `runtimeConfig` for runtime configurability. **What is sent and where does not change.** The commented-out `@nuxt/scripts` registry block is removed rather than left as a decoy.

### Drag-and-drop: port to the real v2 API

| v1 (in use) | v2.4.7 (real) |
|---|---|
| `useDraggable(options)` | `makeDraggable(elRef, options?, payload?)` |
| `useDroppable(options)` | `makeDroppable(elRef, options?, payload?)` |
| returns `elementRef` | **caller owns the ref**, passes it in |
| `data: event` | `data: () => event` (factory) |
| `onDrop: (store, payload)` | `events: { onDrop: (e: IDragEvent) }` |
| `isOvered: boolean` | `isDragOver: IPlacement \| undefined` |
| — | `<DnDProvider>` ancestor **required** |

Four consequences:

1. `makeDroppable` has no `id` option — the zone id moves into `data`.
2. `<DnDProvider>` must wrap the app; `@vue-dnd-kit/nuxt@^1.0.2` (peers core `^2.0.0` + nuxt `^4.0.0`) provides it. `@vue-dnd-kit/components` and `@vue-dnd-kit/devtools` are v1-era and must **not** be installed.
3. `DayView.vue` and `MonthView.vue` call the factories inside `onMounted`/`watch`; v2 registers via `inject`, so these must move into `setup()`. This is the second real blocker after the imports.
4. `calculateEventUpdate` reads `mouseEvent.offsetY` (`useDragAndDrop.ts:251-255`), but v2's drop event carries no raw `MouseEvent`. Pointer position is re-derived from `useDnDProvider().pointer` plus the zone's `getBoundingClientRect()`.

**Resize is unaffected.** `createResizeHandler` (`useDragAndDrop.ts:340-404`) never used the library — it is hand-rolled `mousedown`/`mousemove`/`mouseup`. vue-dnd-kit v2 has no resize API and never will; hand-rolling stays correct. It is consolidated with the dead-but-complete `useEventResize`, keeping one implementation.

### E2E: bunwright + bun:test + CDP for drag

bunwright is a `Bun.WebView` DSL with **no test runner and no drag API** — only `click`/`type`/`press`, plus raw `page.cdp()`. So: `bun:test` as the runner, Brave via `BUN_CHROME_PATH=/usr/bin/brave`, and drag rebuilt on `page.cdp('Input.dispatchMouseEvent')`. Both `/usr/bin/brave` and `/usr/bin/helium-browser` are present.

## Risks / Trade-offs

- **Drag-and-drop is the app's headline feature and the port is the riskiest change** → It is sequenced first, behind e2e coverage written against real browser input, so regressions surface immediately rather than in production.
- **CDP-driven drag tests are lower-level and more brittle than Playwright's `dragTo`** → Accepted deliberately: the user chose bunwright over Playwright. The pointer helper is isolated in one place so brittleness is contained.
- **Removing the 29 sample events makes the app look empty on first load** → An empty state is required, and the demo data is preserved as a seed script rather than deleted.
- **Auth is new; there is none today** → Every existing user of the deployed app is anonymous. Introducing ownership needs a decision on what happens to pre-existing events (see Open Questions).
- **libSQL has no realtime and no LISTEN/NOTIFY** → Fan-out is app-level and correct at `replicas: 1`; if the app ever scales past one process, broadcasts will not cross processes and a shared bus (or Postgres LISTEN/NOTIFY) becomes necessary. Recorded so this is a known cliff, not a surprise.
- **Umami's build-time binding is invisible and easy to regress** → A build-time warning on a missing ID makes a silent non-tracking build impossible to ship again unnoticed.
- **Production secrets are literal `.env.example` placeholders** → Startup validation fails fast rather than running on `your-jwt-secret-key`.
- **`@vue-dnd-kit/nuxt` is a young package (v1.0.2)** → It only supplies the provider; if it proves unreliable, wrapping `<DnDProvider>` manually in a layout is a trivial fallback.

## Migration Plan

1. Provision a libSQL service in Dokploy; set its URL in the Event Calendar app's env.
2. Set `NUXT_SESSION_PASSWORD` (≥32 chars) and replace the placeholder `SECRET_KEY`/`JWT_SECRET`/`ENCRYPTION_KEY`.
3. Run Drizzle migrations against the fresh database.
4. Deploy. Auto-deploy is on (`triggerType: push`, `branch: main`), so merging to `main` ships it — coordinate so infra exists first.
5. Verify: Umami `POST /api/savory` fires; Rybbit still loads; `/api/health` reports true DB state; drag/drop/resize work in a real browser.

**Rollback:** revert the commit and redeploy; Dokploy keeps prior deployments. No destructive migration runs against existing data, because there is no existing data — nothing was ever persisted.

## Open Questions

- **Sign-up policy.** Open registration, invite-only, or a single seeded user? This is a personal deployment on a public domain, so open registration may be undesirable.
- **Pre-existing events and ownership.** Nothing was ever persisted, so there is likely nothing to migrate — but this should be confirmed before the events table gains a non-null `ownerId`.
- **Sharing model.** `FEATURE_COLLABORATION` implies shared events, but the authorization spec currently scopes listing to the owner. Are events private-by-default with explicit sharing, or is a single shared calendar the goal? This shapes the abilities and the WS topic design.
- **Concurrent edit resolution.** Last-write-wins is assumed; if that is unacceptable for overlapping drags, per-field merge or optimistic-concurrency rejection is needed.
- **Postgres and Redis env entries.** `DATABASE_URL` and `REDIS_URL` become obsolete — remove from Dokploy, or leave for other uses?
