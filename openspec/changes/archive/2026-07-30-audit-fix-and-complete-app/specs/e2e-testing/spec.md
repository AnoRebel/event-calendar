## Purpose

Establishes an end-to-end testing capability using bunwright and a local Chromium-family browser so critical user flows are verified without Playwright.

## ADDED Requirements

### Requirement: End-to-end tests run on bunwright with a local browser

The e2e suite SHALL use `bunwright` driving a locally installed Chromium-family browser (Brave at `/usr/bin/brave`, with Helium at `/usr/bin/helium-browser` as an alternative), configured via `BUN_CHROME_PATH`. It SHALL NOT depend on Playwright or download browser binaries.

#### Scenario: Suite runs without Playwright

- **WHEN** the e2e suite runs
- **THEN** no import of `@playwright/test` is resolved and no browser download occurs

#### Scenario: Browser resolves from the configured path

- **WHEN** the suite launches a browser
- **THEN** it uses the executable named by `BUN_CHROME_PATH` rather than a bundled binary

### Requirement: Playwright is fully removed

The system SHALL NOT retain Playwright configuration or references that cannot resolve, including `playwright.config.ts` and the `eslint-plugin-playwright` entry in `eslint.config.mjs`.

#### Scenario: Lint resolves

- **WHEN** ESLint runs
- **THEN** it does not fail to resolve `eslint-plugin-playwright`

### Requirement: Tests are executable through the runner

The suite SHALL run under `bun:test` via a documented script, since bunwright ships no test runner of its own.

#### Scenario: Single command runs e2e

- **WHEN** a developer runs the documented e2e script
- **THEN** the suite executes and reports pass/fail per test

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

### Requirement: Failures produce diagnosable output

Failing tests SHALL capture evidence rather than reporting a bare assertion failure.

#### Scenario: Test fails

- **WHEN** an e2e test fails
- **THEN** a screenshot is captured to a known path and console output from the page is included
