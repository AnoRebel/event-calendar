# Design

## Context

The app is Nuxt 4.6 (`compatibilityVersion: 5`) with shadcn-vue primitives, a calendar distributed as a shadcn-vue
registry, libSQL via Drizzle, and nuxt-auth-utils sessions. Crystal Neuo v4 is a token-driven design system with four
independent axes (material, platform, theme, density) expressed as `data-*` attributes. It is not published to npm, so
the app cannot depend on it as a package.

## Goals / Non-Goals

**Goals**

- Every surface (app chrome, auth, account, docs, the calendar and its dialogs) renders in the active Crystal Neuo
  material, platform, theme and density, and switches live.
- The registry calendar keeps working in an ordinary shadcn-vue project, with no Crystal Neuo dependency.
- Passkeys are a first-class way to create an account and sign in, alongside passwords.
- Every flow works at 360px wide.

**Non-Goals**

- Replacing shadcn-vue/Reka UI primitives with Crystal Neuo's own Vue components: Reka supplies the accessible
  behaviour (focus management, combobox, popovers) the calendar relies on, and Crystal Neuo is applied through tokens.
- Cross-browser live refraction (Chromium only, as Crystal Neuo documents).
- OAuth providers.

## Conventions

- Dates: `date-fns` and `@date-fns/tz` (`TZDate`). `@internationalized/date` appears only where reka-ui's calendar
  requires its `DateValue` type.
- Forms: TanStack Form with valibot schemas as validators (Standard Schema), and the same valibot schemas validate on
  the server.
- Server state in the app: TanStack Query (`@tanstack/vue-query`) — events, account, passkeys, invites — with
  optimistic updates for calendar mutations. The registry calendar stays data-agnostic (props in, emits out).
- Utilities: VueUse. Charts, if any are added: TanStack Chart.

## Decisions

### 1. Vendor Crystal Neuo build output

`app/assets/crystal-neuo/` holds `tokens.css`, `base.css` and `components.css`; `app/lib/crystal-neuo/` holds the
compiled runtime (`index.js`, `axes.js`, `platform.js`, `refraction.js` + `.d.ts`). `scripts/sync-crystal-neuo.ts`
re-copies them from a Crystal Neuo checkout (`CRYSTAL_NEUO_DIR`) after running its build, so upgrades are one command.
Alternative considered: a git dependency. Rejected because the repository is private and would break `bun install` for
anyone cloning this app.

### 2. Cascade layering

Tailwind v4 emits utilities in `@layer utilities`. Crystal Neuo's `base.css` styles elements (`h1`, `p`, `a`) and
would override utilities if unlayered, so it is imported with `layer(base)` and `components.css` with
`layer(components)`. `tokens.css` stays unlayered: it only declares custom properties, and those must beat Tailwind's
`@layer theme` defaults for shared names (`--radius-*`, `--leading-*`, `--tracking-*`).

### 3. Bridge shadcn variables onto semantic tokens

`main.css` maps shadcn's variables onto Crystal Neuo roles (`--background → --surface-app`,
`--card → --surface-raised`, `--popover → --surface-overlay`, `--primary → --accent-primary-base`,
`--muted-foreground → --content-secondary`, `--border → --border-default`, `--ring → --focus-ring`,
`--destructive → --state-danger-base`, …). The calendar source keeps using shadcn utilities (`bg-card`,
`text-muted-foreground`), so it stays portable and still follows every material. Radius utilities resolve to the
material's radii because the shadcn `--radius-*` overrides are removed from `@theme`.
The `dark:` variant targets `[data-theme=dark]` and `[data-theme=high-contrast]` instead of a `.dark` class.

### 4. Appearance runtime

`useAppearance()` wraps the vendored runtime: reactive getters for each axis, setters that persist through the runtime,
`watchSystemTheme` for the `system` preference, and `startRefraction` when refraction is on. Crystal Neuo's
`prePaintScript` is injected into `<head>` so stored settings apply before first paint. The `<html>` defaults are
declared once in `nuxt.config` (`data-material="refraction" data-platform="web" data-theme="light"
data-density="comfortable"`) and never rebound by Vue, avoiding hydration mismatches. The Appearance dialog is a
Reka `Dialog` (a bottom sheet on phones) with material swatches previewed in their own material.

### 5. Shell and routes

`/` is the calendar, `/account` the account page, `/docs/**` documentation, `/login` the sign-in page. `/` and
`/account` are server-rendered (not prerendered), so the session is known at render and there is no hydration flash.
A route middleware redirects signed-out visitors to `/login?redirect=…`. The calendar page watches `loggedIn` and
loads data whenever it becomes true, which fixes the lost `authenticated` event. Wide screens get a glass top bar;
below `md` a bottom tab bar (Calendar, Docs, Account) plus a top bar with the appearance button.

### 6. Passkeys

nuxt-auth-utils' `defineWebAuthnRegisterEventHandler` / `defineWebAuthnAuthenticateEventHandler` with
`@simplewebauthn/*` v13. Challenges are stored in a `webauthn_challenges` table (single use, five-minute expiry), not
in memory, so multiple instances work. Credentials live in a `credentials` table keyed by credential id, with owner,
public key, counter, transports, backed-up flag, a user-editable name and timestamps. Registration paths:

- Signed out: creates an account (email + name) and applies the same registration policy as passwords
  (bootstrap / invite / open). The user row has no password hash.
- Signed in: adds a credential to the current account; the submitted user name must match the session email.

Authentication uses discoverable credentials (no user name needed) and the browser's conditional-UI autofill when
supported. The counter is updated on every sign-in. A credential can be removed only if the account keeps another
passkey or a password.

### 7. Service worker

Rewritten from scratch with one `fetch` listener: navigations are network-first with a static offline page as the
fallback (server-rendered pages carry the user's name and email, so they are never cached);
`/_nuxt/` hashed assets are cache-first; `/api/` and `/_ws` are never intercepted. Old caches are deleted on activate.
`skipWaiting` is driven by the existing update prompt.

### 8. Documentation

`@nuxt/content` v3 with the native Node SQLite connector; pages in `content/docs/*.md` rendered by
`pages/docs/[...slug].vue` with a sidebar, table of contents and Crystal Neuo prose styles. The existing install tabs
and code blocks become MDC components. The README shrinks to an overview that links to the docs.

## Risks / Trade-offs

- Vendored CSS can drift from upstream → the sync script and a version comment in each file make updates explicit.
- Google Fonts adds a third-party request → `display=swap` with system fallbacks, and the docs explain how to
  self-host.
- Removing `NUXT_SESSION_PASSWORD` signs everyone out once → the secrets guard names the new variable.
- Passkeys require HTTPS or `localhost` and a correct `Host` header behind proxies → documented in PRODUCTION.md.

## Migration Plan

1. Set `NUXT_APP_SECRET`, remove `NUXT_SESSION_PASSWORD`.
2. Deploy; the Docker entrypoint (or `bun run db:migrate`) applies the credentials migration.
3. Existing users keep their passwords and can add passkeys from the account page.
