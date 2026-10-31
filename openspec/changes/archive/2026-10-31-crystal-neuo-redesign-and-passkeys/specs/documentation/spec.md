## Purpose

Keeps the project's documentation inside the running app, accurate to the current code, and makes sure every
documented installation path actually works.

## ADDED Requirements

### Requirement: Documentation is served by the app

The app SHALL publish its documentation under `/docs` with navigation between pages, an on-page table of contents,
code samples with copy buttons, and the same appearance settings as the rest of the app.

#### Scenario: Browsing the docs

- **WHEN** a visitor opens `/docs`
- **THEN** they see an index of guides, can move to any page from a sidebar (a menu on phones), and code blocks can be
  copied

### Requirement: Documented install methods work

Each installation method the docs describe (registry install into a new project, local development, Docker and Docker
Compose) SHALL be verified against the current code before release, and the docs SHALL list the environment
variables the app actually reads.

#### Scenario: Registry install

- **WHEN** a developer follows the registry instructions in a new Vite + Vue project with shadcn-vue initialised
- **THEN** the calendar installs, the project builds, and the calendar renders

#### Scenario: Environment reference

- **WHEN** a developer reads the configuration page
- **THEN** every variable listed is read by the app and every variable the app reads is listed
