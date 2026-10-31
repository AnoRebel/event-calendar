# distributable-module Specification

## Purpose
Makes the calendar installable in other Vue/Nuxt projects — as a shadcn-vue registry and a Nuxt module — so consumers can copy in the components and optional server layers.

## Requirements

### Requirement: The UI layer stays data-agnostic

The distributed UI SHALL receive events through props and emit create/update/delete intents as events, exactly as the current component does. It SHALL NOT embed persistence, network calls, or auth. Host applications own the data layer.

#### Scenario: Host supplies events and handles mutations

- **WHEN** a host passes an events array and listens for add/update/delete emits
- **THEN** the calendar renders those events and delegates all persistence to the host

#### Scenario: No app-coupled imports leak into the package

- **WHEN** the package is built
- **THEN** it contains no imports of host-app-only modules (`~/composables`, app-level runtime config, or the app's server routes)

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

### Requirement: Calendar installs from the shadcn-vue registry

The calendar SHALL be installable with `shadcn-vue add <registry-url>` into a Vue 3 or Nuxt 4 project that has
shadcn-vue initialised. The installer SHALL pull every UI primitive and npm dependency the calendar needs, and the
calendar SHALL work without any provider component or Nuxt module.

#### Scenario: Fresh Vite project

- **WHEN** a new Vite + Vue 3 + Tailwind project runs `shadcn-vue init` and then adds the calendar from the registry
- **THEN** the project type-checks and builds, and the calendar renders with drag, drop and resize working, with no
  wrapper component

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
