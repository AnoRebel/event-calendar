## Purpose

Defines how people move between the calendar, their account and the documentation, how the chrome adapts to the
screen, and how signing in gates personal data.

## ADDED Requirements

### Requirement: Primary navigation

The app SHALL offer navigation to Calendar, Docs and Account from every page, marking the current destination. On
viewports narrower than 768px it SHALL be a bottom tab bar; on wider viewports a top bar.

#### Scenario: Phone navigation

- **WHEN** a signed-in user opens the app on a 390px-wide screen
- **THEN** a bottom tab bar shows Calendar, Docs and Account, the current one is marked, and no content is hidden
  behind it

#### Scenario: Desktop navigation

- **WHEN** the same user opens the app on a 1440px-wide screen
- **THEN** a top bar shows the brand, the destinations, the appearance control and a user menu with sign out

### Requirement: Signed-out visitors are sent to sign in

Pages with personal data SHALL require a session. A signed-out visitor SHALL be sent to the sign-in page and returned
to the page they asked for after signing in. The docs SHALL stay public.

#### Scenario: Deep link while signed out

- **WHEN** a signed-out visitor opens `/account`
- **THEN** they see the sign-in page, and after signing in they land on `/account`

#### Scenario: Docs are public

- **WHEN** a signed-out visitor opens `/docs`
- **THEN** the documentation renders without asking them to sign in

### Requirement: Events load whenever a session starts

The calendar SHALL load the user's events whenever a session becomes active, whether by signing in, by registering,
by the demo, or by returning with an existing session, and SHALL clear them on sign out.

#### Scenario: Sign in shows events

- **WHEN** a user with events signs in
- **THEN** their events appear in the calendar without a manual reload

#### Scenario: Returning visit

- **WHEN** a user with a valid session reloads the calendar
- **THEN** their events appear and the page shows no hydration warnings

### Requirement: Layout works at small widths

Every page SHALL be usable at 360px wide without horizontal page scrolling; dialogs SHALL fit the viewport and keep
their actions reachable.

#### Scenario: Dialog on a phone

- **WHEN** the event dialog opens on a 360px-wide screen
- **THEN** every field is fully visible within the dialog and the save and cancel actions are reachable
