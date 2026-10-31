## MODIFIED Requirements

### Requirement: End-to-end tests run on bunwright with a local browser

The e2e suite SHALL use `bunwright` driving a locally installed Chromium-family browser (Chromium, Chrome, Brave or
Helium), configured via `BUN_CHROME_PATH` and defaulting to the first one found on the machine. It SHALL NOT depend
on Playwright or download browser binaries.

#### Scenario: Suite runs without Playwright

- **WHEN** the e2e suite runs
- **THEN** no import of `@playwright/test` is resolved and no browser download occurs

#### Scenario: Browser resolves from the configured path

- **WHEN** the suite launches a browser
- **THEN** it uses the executable named by `BUN_CHROME_PATH` rather than a bundled binary

### Requirement: Core user journeys are covered

The suite SHALL cover the primary flows end-to-end against a running app.

#### Scenario: Calendar loads

- **WHEN** the app is opened
- **THEN** the calendar renders and its views can be switched

#### Scenario: Event lifecycle

- **WHEN** a test creates, edits, and deletes an event
- **THEN** each change is reflected in the UI and persists across a reload

#### Scenario: Drag-and-drop is exercised in a real browser

- **WHEN** a test drags an event to a different time slot
- **THEN** the event moves and the change persists, with the drag driven through raw CDP input events since bunwright exposes no drag API

#### Scenario: Passkey sign-in

- **WHEN** a test registers a passkey with a virtual authenticator, signs out and signs back in with it
- **THEN** the session is restored and the user's events load

#### Scenario: Appearance and small screens

- **WHEN** a test switches material in the Appearance dialog and reloads at a phone viewport
- **THEN** the chosen material is applied and the bottom navigation is shown
