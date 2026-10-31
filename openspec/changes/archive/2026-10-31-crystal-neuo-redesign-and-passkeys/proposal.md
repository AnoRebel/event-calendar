# Proposal

## Why

An end-to-end audit of the running app found that the calendar never loads a signed-in user's events, the dependency
upgrades had broken every server route and the production build, the layout does not work on phones, the service
worker can serve one user's cached events to another, and several documented features (invite links, PWA shortcuts,
installability) have no implementation. The UI is also a stock shadcn look that does not match the Crystal Neuo design
language used across the rest of the product family, and sign-in is password-only even though passkeys are the safer,
faster default.

## What Changes

- **Dependency repair** (already applied): server code imports from `nuxt/server` under `compatibilityVersion: 5`
  with `experimental.nitroAutoImports`, drizzle 1.x client/migrations, Rolldown-compatible build, Nuxt 4 TypeScript
  project references with strict mode clean, compose files that match the real libSQL stack.
- **BREAKING** — the session secret is `NUXT_APP_SECRET` (nuxt-auth-utils 0.6); `NUXT_SESSION_PASSWORD` is rejected
  with a migration hint. Existing sessions are signed out once.
- Crystal Neuo becomes the design system: vendored tokens, base and component CSS plus the runtime; shadcn-vue
  variables are bridged onto Crystal Neuo semantic tokens so every primitive and the calendar follow the active
  material. Material display fonts are loaded and applied.
- An **Appearance** dialog lets people switch material (refraction, tactile, signal, folio, bloom, hybrid), platform
  style, theme (system, light, dark, high contrast), density, and glass (frost, rim light, refraction, reduced
  transparency). Choices persist and apply before first paint.
- A redesigned, responsive app shell: glass top bar on wide screens, bottom tab bar on phones, a user menu, and
  dedicated routes for the calendar, account and documentation.
- **Passkeys**: create an account with a passkey, sign in with a passkey (including browser autofill), add, rename and
  remove passkeys from the account page. Passwords remain available; an account must keep at least one way to sign in.
- An account page with profile details, passkey management, password set/change and invite-link creation.
- Calendar fixes: events load after sign-in and on reload, responsive toolbar and views (scrollable week, agenda-style
  day list on phones), consistent dialog defaults (start/end time, browser timezone), working PWA deep links
  (`?view=`, `?action=add`), a single resize implementation, and restyled dialogs.
- A rewritten service worker: network-first navigation with an offline shell, cache-first hashed assets, and no
  caching of authenticated API responses. Installable manifest with real icons.
- Documentation moves into the app with Nuxt Content (`/docs/**`), styled with Crystal Neuo, covering installation,
  usage, theming, auth/passkeys, self-hosting and the API. README and PRODUCTION guide are rewritten to match, and each
  installation method (registry, local dev, Docker, Docker Compose) is verified.

## Capabilities

### New Capabilities

- `design-system`: Crystal Neuo integration, token bridging for UI primitives, the appearance settings and their
  persistence, fonts, and accessibility fallbacks.
- `app-shell`: navigation between calendar, account and docs; responsive chrome; sign-in gating and data loading.
- `calendar-views`: behaviour of the month, week, day and agenda views and the event dialog across screen sizes,
  including deep links.
- `offline-pwa`: service worker caching rules and installability.
- `documentation`: in-app documentation and the guarantees about install instructions.

### Modified Capabilities

- `auth`: session secret requirement changes to `NUXT_APP_SECRET`; adds passkey registration and authentication,
  account management, and invite creation from the UI.
- `distributable-module`: requirements realigned with the shipped shadcn-vue registry (instead of an npm module) and
  verified installation into a fresh project.
- `e2e-testing`: the browser is any local Chromium-family binary, and the suite covers passkeys, appearance settings
  and mobile layout.

## Impact

- Code: `app/` (shell, pages, components, composables, styles), `app/registry/event-calendar/*` (restyle, fixes),
  `server/api/auth/**`, new `server/api/webauthn/**`, `server/api/account/**`, `server/db/schema.ts` + a migration,
  `public/sw.js`, `public/manifest.json`, `content/**`, `nuxt.config.ts`.
- Dependencies: adds `@simplewebauthn/server`, `@simplewebauthn/browser`, `@nuxt/content`.
- Database: new `credentials` and `webauthn_challenges` tables; `users.password_hash` becomes nullable.
- Operations: `NUXT_APP_SECRET` replaces `NUXT_SESSION_PASSWORD`. Passkeys derive the relying party from the request
  URL, so a reverse proxy must forward the original `Host` (and `X-Forwarded-Proto`), and the site must be served over
  HTTPS (or `localhost`).
