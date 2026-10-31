## Purpose

Makes the calendar installable in other Vue/Nuxt projects — as a shadcn-vue registry and a Nuxt module — so consumers can copy in the components and optional server layers.

## ADDED Requirements

### Requirement: Calendar is installable as a Nuxt module

The calendar SHALL be publishable as a Nuxt module that host projects can add to their `modules` array. Installing it SHALL auto-register the calendar components and composables and SHALL set up the `@vue-dnd-kit` provider so drag-and-drop works without host-side wiring.

#### Scenario: Fresh Nuxt project installs the module

- **WHEN** a Nuxt 4 project adds the module and imports the calendar component
- **THEN** the calendar renders, and drag/drop/resize work without the host manually adding a `<DnDProvider>`

#### Scenario: Components and composables auto-import

- **WHEN** a host uses the calendar component or its public composables
- **THEN** they resolve via auto-import with no explicit path imports required

### Requirement: Calendar is usable as a plain Vue 3 plugin

The calendar SHALL also ship a framework-agnostic entry that a non-Nuxt Vue 3 application can register via `app.use(...)`, so the component library is not Nuxt-only.

#### Scenario: Vue 3 app without Nuxt

- **WHEN** a Vite + Vue 3 app installs the package and calls `app.use(EventCalendarPlugin)`
- **THEN** the calendar component is available and functional, including drag-and-drop

#### Scenario: Styles are consumable

- **WHEN** a host imports the package's stylesheet entry
- **THEN** the calendar renders with its intended styling and documents any required Tailwind or CSS setup

### Requirement: The UI layer stays data-agnostic

The distributed UI SHALL receive events through props and emit create/update/delete intents as events, exactly as the current component does. It SHALL NOT embed persistence, network calls, or auth. Host applications own the data layer.

#### Scenario: Host supplies events and handles mutations

- **WHEN** a host passes an events array and listens for add/update/delete emits
- **THEN** the calendar renders those events and delegates all persistence to the host

#### Scenario: No app-coupled imports leak into the package

- **WHEN** the package is built
- **THEN** it contains no imports of host-app-only modules (`~/composables`, app-level runtime config, or the app's server routes)

### Requirement: An optional Nitro layer provides turnkey persistence

The package SHALL offer an opt-in Nitro layer exposing the `/api/events` CRUD backed by libSQL + Drizzle, which a host MAY enable for turnkey persistence and MAY omit to supply its own backend. Enabling it SHALL be a separate, explicit step from installing the UI module.

#### Scenario: Host enables the server layer

- **WHEN** a host opts into the Nitro layer and configures a libSQL URL
- **THEN** the `/api/events` endpoints are available in the host app and the calendar persists through them

#### Scenario: Host omits the server layer

- **WHEN** a host installs only the UI module
- **THEN** no server routes are added and the host's own data layer is used, with no libSQL dependency pulled in

#### Scenario: Server layer is documented as opinionated

- **WHEN** a host reads the layer's docs
- **THEN** the libSQL/Drizzle assumptions and the required env/config are stated explicitly

### Requirement: The module is versioned and documented

The package SHALL declare its public API surface (components, composables, props, emits, and the optional layer's config) and SHALL be independently versioned from the demo app.

#### Scenario: Consumer reads the public API

- **WHEN** a developer reads the package README
- **THEN** it lists the exported components/composables, the event props/emits contract, and install steps for both Nuxt and plain Vue

#### Scenario: Type declarations ship

- **WHEN** a TypeScript host imports the package
- **THEN** type declarations resolve for the components, composables, and public types

### Requirement: The demo app consumes the module

The existing app SHALL serve as the reference consumer of the module rather than duplicating the calendar source, so the distributed package is dogfooded.

#### Scenario: App uses the packaged calendar

- **WHEN** the demo app renders the calendar
- **THEN** it imports it from the module/package rather than from a divergent in-repo copy
