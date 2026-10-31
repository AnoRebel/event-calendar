# Event Calendar

A drag-and-drop event calendar for Vue 3 and Nuxt — and a complete, self-hostable calendar app built around it, with
passkey sign-in and the [Crystal Neuo](https://crystal-neuo.anorebel.net) design system.

**Live:** [event-calendar.anorebel.net](https://event-calendar.anorebel.net) ·
**Docs:** [event-calendar.anorebel.net/docs](https://event-calendar.anorebel.net/docs) (source in
[`content/docs/`](content/docs))

## Features

- **Month, week, day and agenda views** with keyboard shortcuts, swipe navigation and shareable URLs.
- **Drag, drop and resize** with a mouse, pen or finger, with a live preview and one save per gesture. Overlapping
  events sit side by side.
- **Timezone-aware** entry and display; all-day and multi-day events; colours, statuses and locations.
- **Passkeys** for sign-up and sign-in, plus passwords, invite links and an account page.
- **Crystal Neuo appearance settings:** six materials, five platform styles, light/dark/high-contrast themes and three
  densities, applied before first paint.
- **Installable PWA** with an offline page; optional real-time sync between tabs and devices.
- **Responsive and accessible** from 360px up.

## Quick start

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev            # http://localhost:3000
```

Requires Bun 1.3+ and Node.js 22.5+. Set `NUXT_DEMO_ENABLED=true` in `.env` for a one-click demo account. See
[Run it locally](content/docs/02.getting-started.md).

## Use the calendar in your project

The calendar is a [shadcn-vue](https://www.shadcn-vue.com) registry item — the source is copied into your project:

```bash
npx shadcn-vue@latest add https://event-calendar.anorebel.net/r/event-calendar.json
```

Optional layers add a data composable (`event-calendar-data`), Nitro + libSQL persistence
(`event-calendar-persistence`) and WebSocket sync (`event-calendar-realtime`). See
[Add to your project](content/docs/03.installation.md) and the [component API](content/docs/04.usage.md).

## Self-hosting

```bash
echo "NUXT_APP_SECRET=$(openssl rand -base64 32)" > .env
docker compose up -d
```

Docker, Compose, Dokploy, databases, backups and upgrades are covered in
[Self-hosting](content/docs/07.self-hosting.md); every environment variable is in
[Configuration](content/docs/08.configuration.md).

> **Upgrading?** `NUXT_SESSION_PASSWORD` is now `NUXT_APP_SECRET`, and new migrations add passkey support.

## Development

| | |
| --- | --- |
| `bun run typecheck` · `bun run lint` | Types and lint |
| `bun run test:run` | Unit tests (Vitest) |
| `bun run test:e2e` | End-to-end tests (bunwright; set `BUN_CHROME_PATH`) |
| `bun run registry:build` | Build the registry to `public/r/` |
| `bun run design:sync` | Update the vendored Crystal Neuo |

Conventions, layout and testing details: [Development](content/docs/10.development.md). Planned and completed changes
are tracked with OpenSpec in [`openspec/`](openspec).

## Tech stack

Nuxt 4 · Vue 3 · TypeScript · Bun · shadcn-vue + Reka UI · Tailwind CSS v4 · Crystal Neuo · libSQL + Drizzle ·
nuxt-auth-utils (sessions, WebAuthn) · TanStack Query & Form · valibot · date-fns · VueUse · Nuxt Content.

The calendar UI started as a Vue port of the React
[event-calendar](https://github.com/origin-space/event-calendar) component.

## License

[MIT](LICENSE)
