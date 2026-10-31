## 1. Dependency repair

- [x] 1.1 Confirm dependencies are current; keep TypeScript on 6.x (7.0 has no API for Vue tooling) and bump icons
- [x] 1.2 Import server helpers from `nuxt/server` (h3 only where `nuxt/server` has no equivalent); keep
      `compatibilityVersion: 5` with `experimental.nitroAutoImports` for modules that read `#imports`
- [x] 1.3 Move session sealing to `NUXT_APP_SECRET`; update secrets guard, `.env.example`, e2e harness
- [x] 1.4 drizzle-orm 1.x `drizzle({ client })`; drizzle-kit 1.x migration folders; runtime migrator reads both
      layouts and recognises previously applied names
- [x] 1.5 Remove legacy `manualChunks` (Rolldown placeholder error); fix shadcn `componentDir`; stop duplicate
      component scan; rename demo reset task file so the schedule resolves
- [x] 1.6 Nuxt 4 TypeScript project references; fix every strict-mode error
- [x] 1.7 Replace stale Postgres/Redis compose files and fix the musl dev image

## 2. Crystal Neuo foundation

- [ ] 2.1 Vendor tokens/base/components CSS and the compiled runtime; add `scripts/sync-crystal-neuo.ts`
- [ ] 2.2 Rewrite `main.css`: layered imports, shadcn variable bridge, `dark:` variant on `data-theme`, radius
      utilities from material tokens
- [ ] 2.3 Root attributes and pre-paint script in `nuxt.config`; material fonts with fallbacks
- [ ] 2.4 `useAppearance()` composable (axes, system theme watcher, refraction lifecycle)
- [ ] 2.5 Appearance dialog (material swatches, platform + detect, theme, density, glass toggles, refraction notice);
      bottom sheet on phones
- [ ] 2.6 Restyle shadcn primitives in `app/components/ui` to use material tokens (buttons, inputs, dialog, menus,
      select, popover, toasts)
- [ ] 2.7 Remove the old `.dark` class dark-mode composable and toggle

## 3. App shell and routing

- [ ] 3.1 Layout with glass top bar (brand, nav, appearance, user menu) and phone tab bar
- [ ] 3.2 `/login` page, auth middleware with redirect back; `/` and `/account` server-rendered
- [ ] 3.3 Calendar page loads events whenever the session becomes active and clears them on sign out
- [ ] 3.4 Error page styled with the design system

## 4. Passkeys and account

- [ ] 4.1 Add `@simplewebauthn/server` and `@simplewebauthn/browser`; enable `auth.webAuthn`
- [ ] 4.2 Schema: `credentials`, `webauthn_challenges`, nullable `users.password_hash`; migration
- [ ] 4.3 Shared registration policy helper used by password and passkey sign-up
- [ ] 4.4 `POST /api/webauthn/register` (sign-up and add-to-account) with stored single-use challenges
- [ ] 4.5 `POST /api/webauthn/authenticate` with discoverable credentials and counter update
- [ ] 4.6 Account API: profile, passkey list/rename/delete (last-method guard), password set/change, invite list/create
- [ ] 4.7 Sign-in page: password and passkey tabs, passkey autofill, demo, invite and bootstrap states
- [ ] 4.8 Account page: profile, passkeys, password, invites, sign out

## 5. Calendar fixes and restyle

- [ ] 5.1 Toolbar: responsive layout, segmented view switcher, readable labels
- [ ] 5.2 Month view: material styling, today marker, numeric face, overflow popover, phone layout
- [ ] 5.3 Week/day views: columns fill width; phone week scrolls horizontally with sticky gutter; now indicator
- [ ] 5.4 Agenda view restyle
- [ ] 5.5 Event dialog: responsive layout, consistent default times, browser timezone, styled controls
- [ ] 5.6 Consolidate resize into one pointer-event implementation
- [ ] 5.7 Deep links `?view`, `?date`, `?action=add`, kept in sync with the URL
- [ ] 5.8 Replace React-only `className` attributes and other template slips

## 6. PWA

- [ ] 6.1 Rewrite `public/sw.js` (network-first navigation, cache-first `/_nuxt/`, never `/api/`)
- [ ] 6.2 Manifest with 192/512 PNG + maskable icons, theme colours, working shortcuts
- [ ] 6.3 Update prompt uses the design system toast

## 7. Documentation

- [ ] 7.1 Add `@nuxt/content`; docs layout with sidebar, table of contents, prose styles, copyable code
- [ ] 7.2 Write guides: introduction, installation (registry tiers), usage/API, theming with Crystal Neuo,
      authentication and passkeys, self-hosting (Docker, Compose, Dokploy), configuration reference, development
- [ ] 7.3 Rewrite README and PRODUCTION.md to match and link to the docs
- [ ] 7.4 Rebuild the registry output and verify a fresh-project install
- [ ] 7.5 Verify local dev, production build, Docker image and Compose

## 8. Verification

- [ ] 8.1 Unit tests for appearance, registration policy and passkey guards
- [ ] 8.2 e2e: auth (password + passkey via virtual authenticator), event lifecycle, appearance, phone layout
- [ ] 8.3 Typecheck, lint, unit, e2e and build all pass; screenshots reviewed at phone and desktop sizes
