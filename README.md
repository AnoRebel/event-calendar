# Event Calendar

A full-stack event calendar built with Nuxt 4 (Vue 3, Composition API, TypeScript) and shadcn-vue. Multiple calendar
views, drag-and-drop scheduling, per-user events with authentication, and a libSQL/Drizzle backend. Deployed at
[event-calendar.anorebel.net](https://event-calendar.anorebel.net).

The calendar UI is a Vue/Nuxt take on the React/Next.js shadcn
[event-calendar component](https://github.com/origin-space/event-calendar).

## Features

### Calendar views

- **Month** — traditional monthly grid with event display
- **Week** — 7-day view with hourly time slots and drag-and-drop
- **Day** — single-day view with hourly time slots
- **Agenda** — list of upcoming events

Switch views from the toolbar or with keyboard shortcuts: `M` (month), `W` (week), `D` (day), `A` (agenda). Shortcuts
are disabled while typing in an input or when the event modal is open.

### Event management

- Create, edit, and delete events through a modal (CRUD persisted via the server API)
- All-day and timed events, with conversion between them
- Drag-and-drop to move events between time slots and days (native HTML5 drag with `@vue-dnd-kit/core`), with visual
  drop-zone feedback and duration preservation
- Color-coded events: `sky`, `amber`, `violet`, `rose`, `emerald`, `orange`
- Event status with distinct styling: `confirmed` (default), `tentative` (dashed border), `cancelled` (strikethrough),
  and `past` (auto-detected once an event has ended)
- Multi-day events render with connected visual continuity across day boundaries
- Location display with icon and tooltip

### Accounts and per-user data

Events are owned by the signed-in user. The app ships with email/password authentication and an invite-based
registration policy — see [Authentication & registration](#authentication--registration) below.

### Timezones

- Automatic browser timezone detection and display in the user's local timezone
- DST-aware conversions

### PWA / offline shell

- Service worker for an installable, offline-capable app shell
- Dark/light theme with system-preference detection, a manual toggle, and persistence via `localStorage`

### Feature-flagged (off by default)

- **Recurring events** — daily/weekly/monthly/yearly recurrence UI and payloads
- **Real-time collaboration** — WebSocket sync of event changes between a user's open sessions

Both are disabled unless explicitly turned on (see [Feature flags](#feature-flags)). HTTP CRUD works with or without the
collaboration socket.

## Tech stack

- **Nuxt 4** (`future.compatibilityVersion: 5`), Vue 3, TypeScript — run on the **Bun** runtime
- **shadcn-vue** (New York style) + **Reka UI**, **Tailwind CSS v4**, Lucide icons via `@nuxt/icon`
- **libSQL** (Turso-compatible / self-hosted `sqld`) via **Drizzle ORM** for persistence
- **nuxt-auth-utils** (sealed-cookie sessions) + **nuxt-authorization** (ownership abilities)
- **Nitro crossws** WebSocket for optional real-time sync
- `@vue-dnd-kit/core` (drag-and-drop), `date-fns` + `@date-fns/tz` (dates), `@tanstack/vue-form` (forms),
  `vue-sonner` (toasts), `@vueuse/core`
- Self-hosted **Umami** (`nuxt-umami`) and **Rybbit** analytics
- Testing: **Vitest** (unit) and **bunwright** (e2e)

## Local setup

Requires [Bun](https://bun.sh).

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env. For local dev the database falls back to a file DB
# (file:./.data/events.db), so you can leave LIBSQL_URL empty.
# NUXT_SESSION_PASSWORD is required — generate one with:
#   openssl rand -base64 32

# 3. Create the database schema
bun run db:migrate

# 4. (Optional) Seed sample data
bun run db:seed

# 5. Start the dev server on http://localhost:3000
bun run dev
```

> Drizzle-kit commands must run under `bun --bun` (already wired into the `db:*` scripts).

## Authentication & registration

Authentication is email/password. Sessions are **sealed cookies** (nuxt-auth-utils) — there is no session table; only
`users`, `events`, and `invites` exist in the schema. Passwords are stored as scrypt hashes. `NUXT_SESSION_PASSWORD`
(min 32 characters) seals the session cookie and is **required**; in production the app refuses to boot without a strong
value (`server/plugins/secrets-guard.ts`).

Events are per-user: the events API returns `401` when unauthenticated and `403` for a non-owner.

### Registration policy

By default registration is **invite/seed-only**:

1. **Bootstrap** — while the `users` table is empty, the first account registers freely.
2. **After that** — registration requires a valid invite token. A signed-in user creates one via `POST /api/invites`;
   the token can be shared or passed as an `?invite=TOKEN` link.
3. **Open registration (opt-in)** — allow anyone to register by setting `NUXT_OPEN_REGISTRATION=true` (runtime, no
   rebuild) or `OPEN_REGISTRATION=true` (build-time default).

## Feature flags

Both flags default to **off**. Enable at build time or override at runtime without a rebuild:

| Feature       | Build-time                 | Runtime (no rebuild)                        |
| ------------- | -------------------------- | ------------------------------------------- |
| Recurring     | `FEATURE_RECURRING_EVENTS` | `NUXT_PUBLIC_FEATURES_RECURRING_EVENTS`     |
| Collaboration | `FEATURE_COLLABORATION`    | `NUXT_PUBLIC_FEATURES_COLLABORATION`        |

Set a flag to `true` or `1` to enable it.

## Analytics

Self-hosted **Umami** (via a cloak proxy at `/api/savory`) and **Rybbit**. Disable both with
`NUXT_PUBLIC_ENABLE_ANALYTICS=false`.

> `NUXT_UMAMI_SITE_ID` is read at **build time** — `nuxt-umami` bakes it into the bundle during module setup. It must be
> present in the build environment; setting it only at runtime has no effect.

## Scripts

```bash
# Development
bun run dev              # Dev server on http://localhost:3000
bun run build            # Production build (.output/)
bun run preview          # Preview the production build
bun run generate         # Static generation

# Database (Drizzle + libSQL)
bun run db:generate      # Generate a migration from schema changes
bun run db:migrate       # Apply migrations
bun run db:push          # Push schema directly (dev convenience)
bun run db:studio        # Drizzle Studio
bun run db:seed          # Seed sample data

# Quality
bun run lint             # ESLint
bun run lint:fix         # ESLint --fix
bun run format           # Prettier
bun run typecheck        # vue-tsc type check

# Testing
bun run test             # Vitest (watch)
bun run test:run         # Vitest once
bun run test:ui          # Vitest UI
bun run test:coverage    # Vitest coverage
bun run test:e2e         # bunwright e2e (see below)
```

## Testing

- **Unit** — Vitest. Run `bun run test:run`.
- **End-to-end** — [bunwright](https://www.npmjs.com/package/bunwright) driving Brave under `bun test`. Set the browser
  path and run:

  ```bash
  BUN_CHROME_PATH=/usr/bin/brave bun run test:e2e
  ```

  (Playwright was removed in favor of bunwright.)

## Use it in your own project

The calendar ships as a **shadcn-vue registry** — components are copied into your project (yours to edit), the shadcn
way, not installed as an opaque npm package. It's modular: the UI is standalone, and persistence / realtime are
optional layers that each pull the one before them.

```bash
# Calendar UI only (no backend)
npx shadcn-vue@latest add https://event-calendar.anorebel.net/r/event-calendar.json

# …or add a layer (each pulls in the ones below it):
#   event-calendar-data           client data composable
#   event-calendar-persistence    Nitro + libSQL /api/events CRUD (Nuxt only)
#   event-calendar-realtime       WebSocket live sync (installs everything)
```

Requires a Vue 3 / Nuxt 4 project with Tailwind and shadcn-vue initialised (`npx shadcn-vue@latest init`). The 15 UI
primitives the calendar uses are declared as registry dependencies, so the installer pulls them in automatically. Wrap
the calendar in a `<DnDProvider>` (via `@vue-dnd-kit/nuxt` on Nuxt, or imported from `@vue-dnd-kit/core` in plain Vue).

The registry source lives in `registry/`; `bun run registry:build` compiles it to `public/r/*.json`. A full
installation & usage guide (props, emits, setup, adding auth) is published at
**[event-calendar.anorebel.net/r](https://event-calendar.anorebel.net)** / the hosted docs page.

## Architecture

- **`registry/event-calendar/EventCalendar.vue`** — the main calendar component (the registry is the canonical source;
  the demo app imports it from here). It is **controlled**: it renders the `events` prop and emits
  `event-add` / `event-update` / `event-delete`; it does not own persistence. Views (`MonthView`, `WeekView`, `DayView`,
  `AgendaView`), the `EventModal`, and calendar composables live alongside it. Feature toggles come in via a `features`
  prop and a header control via the `#header-actions` slot, so the component has no framework coupling.
- **`composables/useCalendarData.ts`** — loads events for the visible range and wires the calendar's add/update/delete
  emits to the server API. `composables/useCalendarRealtime.ts` layers optional WebSocket sync on top;
  `composables/useFeatureFlags.ts` exposes the runtime flags.
- **Server API** (`server/api/`):
  - `GET /api/events` — paginated, date-range filtered, owner-scoped
  - `POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id`
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
  - `POST /api/invites` — create an invite (authenticated)
  - `GET /api/health` — real libSQL probe (`SELECT 1`); returns `503` if the database is unreachable
- **Persistence** — libSQL via Drizzle ORM. Schema in `server/db/schema.ts` (`events`, `users`, `invites`), kept
  dialect-portable (only `text`/`integer` columns; dates stored as ISO-8601 strings) so a move to Postgres is a config
  and import change rather than a query rewrite. Connection via `LIBSQL_URL` (+ optional `LIBSQL_AUTH_TOKEN`); local
  dev falls back to `file:./.data/events.db`. Migrations under `server/db/migrations/`.
- **Real-time** — a Nitro `crossws` WebSocket at `/_ws` broadcasts on write to owner-scoped topics. Feature-flagged and
  off by default; the app is fully functional over plain HTTP without it.

## Deployment

The app is deployed on Dokploy via Railpack (build: `bun run build`, start: `node .output/server/index.mjs`). See
[PRODUCTION.md](PRODUCTION.md) for the deploy runbook. General Nuxt options are in the
[Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment).

## License

MIT.
