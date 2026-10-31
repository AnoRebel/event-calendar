## ADDED Requirements

### Requirement: Calendar installs from the shadcn-vue registry

The calendar SHALL be installable with `shadcn-vue add <registry-url>` into a Vue 3 or Nuxt 4 project that has
shadcn-vue initialised. The installer SHALL pull every UI primitive and npm dependency the calendar needs.

#### Scenario: Fresh Vite project

- **WHEN** a new Vite + Vue 3 + Tailwind project runs `shadcn-vue init` and then adds the calendar from the registry
- **THEN** the project type-checks and builds, and the calendar renders with drag and drop working inside a
  `DnDProvider`

#### Scenario: Optional tiers

- **WHEN** a Nuxt project adds the `event-calendar-persistence` item
- **THEN** it also receives the calendar UI and data composable, and the `/api/events` routes work against libSQL

### Requirement: Calendar follows the host's theme tokens

The registry calendar SHALL style itself only through the host's shadcn-vue theme variables, so it adopts the host's
colours, radii and dark mode, and renders in Crystal Neuo materials when the host maps those variables onto Crystal
Neuo tokens.

#### Scenario: Default shadcn theme

- **WHEN** the calendar is installed into a project using the default shadcn-vue theme
- **THEN** it uses that theme's colours and radius and switches with its dark mode

## MODIFIED Requirements

### Requirement: An optional Nitro layer provides turnkey persistence

The registry SHALL offer opt-in server items exposing the `/api/events` CRUD backed by libSQL + Drizzle (and a
realtime WebSocket on top), which a host MAY install for turnkey persistence and MAY omit to supply its own backend.
Installing them SHALL be a separate, explicit step from installing the UI.

#### Scenario: Host enables the server layer

- **WHEN** a host installs the persistence item and configures a libSQL URL
- **THEN** the `/api/events` endpoints are available in the host app and the calendar persists through them

#### Scenario: Host omits the server layer

- **WHEN** a host installs only the calendar UI
- **THEN** no server routes are added and the host's own data layer is used, with no libSQL dependency pulled in

#### Scenario: Server layer is documented as opinionated

- **WHEN** a host reads the layer's docs
- **THEN** the libSQL/Drizzle assumptions and the required env/config are stated explicitly

## REMOVED Requirements

### Requirement: Calendar is installable as a Nuxt module

**Reason**: The calendar ships as a shadcn-vue registry so consumers own and edit the source; no Nuxt module is
published.

**Migration**: Install with `shadcn-vue add https://event-calendar.anorebel.net/r/event-calendar.json` and wrap the
app in `DnDProvider` (or add `@vue-dnd-kit/nuxt`).

### Requirement: Calendar is usable as a plain Vue 3 plugin

**Reason**: Registry components are imported directly; a plugin entry adds nothing.

**Migration**: Import `EventCalendar` from the installed folder and wrap the app in `DnDProvider` from
`@vue-dnd-kit/core`.
