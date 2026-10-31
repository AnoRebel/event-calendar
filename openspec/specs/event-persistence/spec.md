# event-persistence Specification

## Purpose
Persists calendar events durably in libSQL via a portable Drizzle schema and CRUD API so events survive reloads and server restarts.
## Requirements
### Requirement: Events persist across sessions

The system SHALL store events durably in libSQL so that they survive page reloads, browser restarts, and server restarts.

#### Scenario: Event survives a page reload

- **WHEN** a user creates an event and reloads the page
- **THEN** the event is still present in the calendar

#### Scenario: Event survives a server restart

- **WHEN** an event exists and the server process is restarted
- **THEN** the event is still returned by `GET /api/events`

#### Scenario: No sample data is seeded

- **WHEN** a user loads the app against an empty database
- **THEN** the calendar renders an empty state and no hardcoded sample events appear

### Requirement: Event CRUD API

The system SHALL expose `/api/events` supporting list, create, read, update, and delete, matching the request and response shapes `useEventAPI` already expects.

#### Scenario: List events in a date range

- **WHEN** a client sends `GET /api/events?start=<ISO>&end=<ISO>`
- **THEN** the system returns 200 with only the events overlapping that range

#### Scenario: Create an event

- **WHEN** a client sends `POST /api/events` with a valid event body
- **THEN** the system returns 201 with the persisted event including its server-assigned id

#### Scenario: Update an event

- **WHEN** a client sends `PATCH /api/events/:id` with valid changes
- **THEN** the system returns 200 with the updated event and the change is persisted

#### Scenario: Delete an event

- **WHEN** a client sends `DELETE /api/events/:id`
- **THEN** the system returns 204 and the event no longer appears in subsequent lists

#### Scenario: Request for a missing event

- **WHEN** a client requests, updates, or deletes an id that does not exist
- **THEN** the system returns 404 and does not create a record

### Requirement: Event payload validation

The system SHALL reject invalid event payloads at the API boundary and SHALL NOT rely on client-side validation alone.

#### Scenario: Missing title

- **WHEN** a client submits an event with an empty or whitespace-only title
- **THEN** the system returns 400 with a message identifying the title field

#### Scenario: End before start

- **WHEN** a client submits a non-all-day event whose `endDate` is not after its `startDate`
- **THEN** the system returns 400 with a message identifying the date range

#### Scenario: Unknown fields are not persisted

- **WHEN** a client submits an event body containing fields outside the event schema
- **THEN** the system ignores those fields rather than writing them to the database

### Requirement: Dialect-portable data access

All database access SHALL go through Drizzle using dialect-portable constructs, so that migrating from libSQL to Postgres is a configuration change rather than a query rewrite.

#### Scenario: No raw dialect-specific SQL

- **WHEN** the server queries or writes events
- **THEN** it uses the Drizzle query builder and avoids libSQL-only SQL constructs

### Requirement: Schema migrations are versioned

The system SHALL manage schema changes through committed Drizzle migration files rather than runtime schema mutation.

#### Scenario: Fresh database is initialized

- **WHEN** migrations run against an empty libSQL database
- **THEN** the events schema is created and the app starts successfully

