## Purpose

Defines runtime feature flags that actually gate optional behavior (recurring events, collaboration, etc.) so features can be toggled without a rebuild.

## ADDED Requirements

### Requirement: Feature flags gate real behavior

The `FEATURE_*` flags SHALL be exposed through `runtimeConfig` and SHALL actually control whether their features are available. Today all four (`FEATURE_RECURRING_EVENTS`, `FEATURE_EXTERNAL_CALENDARS`, `FEATURE_COLLABORATION`, `FEATURE_ADVANCED_NOTIFICATIONS`) exist only in `.env.example` and are read by no code.

#### Scenario: Flag disabled hides the feature

- **WHEN** a feature flag is set false
- **THEN** its UI is not reachable and its endpoints reject requests

#### Scenario: Flag enabled exposes the feature

- **WHEN** a feature flag is set true
- **THEN** the feature is available to the user

#### Scenario: Server enforces the flag

- **WHEN** a flag is disabled and a client calls the corresponding endpoint directly
- **THEN** the system rejects the request rather than relying on the UI being hidden

### Requirement: Flags are read at runtime

Flags SHALL be resolvable from the environment at runtime, so toggling one requires a restart at most and never a rebuild.

#### Scenario: Flag changed without rebuild

- **WHEN** a flag's environment value changes and the app restarts
- **THEN** the new value takes effect against the same build artifact

### Requirement: Flag defaults are safe

Every flag SHALL have an explicit default. An unset or unparseable flag SHALL resolve to disabled rather than enabled.

#### Scenario: Flag unset

- **WHEN** a flag is absent from the environment
- **THEN** the feature is treated as disabled

#### Scenario: Flag has an unparseable value

- **WHEN** a flag holds a value that is not a recognized boolean
- **THEN** the feature is treated as disabled

### Requirement: Declared flags match shipped features

The system SHALL NOT advertise a flag for a feature that does not exist. `FEATURE_COLLABORATION` is currently `true` in the production environment while no collaboration code exists at all.

#### Scenario: Collaboration flag reflects reality

- **WHEN** the collaboration flag is enabled
- **THEN** real collaboration is available, not a no-op

#### Scenario: Removed feature drops its flag

- **WHEN** a feature is removed from the codebase
- **THEN** its flag is removed from configuration and documentation rather than left dangling

### Requirement: Health reporting is honest

`/api/health` SHALL report the true state of its dependencies. It currently hardcodes `database: 'healthy'` and `redis: 'healthy'` behind `setTimeout` calls commented as simulations, meaning it reports green against a dead backend.

#### Scenario: Database is reachable

- **WHEN** the health endpoint is called and libSQL responds to a real probe query
- **THEN** it reports the database healthy

#### Scenario: Database is unreachable

- **WHEN** libSQL is down or unreachable
- **THEN** the health endpoint reports the database unhealthy and returns a non-200 status

#### Scenario: No simulated checks remain

- **WHEN** the health endpoint's dependency checks are inspected
- **THEN** each performs a real probe and none returns a hardcoded status
