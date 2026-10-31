## MODIFIED Requirements

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
