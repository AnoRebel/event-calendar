# auth Specification

## Purpose
Gives the calendar authenticated user identities and an invite/seed-only registration policy so events can be owned and access controlled.
## Requirements
### Requirement: Users have identities backed by sessions

The system SHALL authenticate users via `nuxt-auth-utils` sealed cookie sessions. Session state SHALL NOT require a database table; the application SHALL own a single `users` table in its own Drizzle schema.

#### Scenario: Session survives reload

- **WHEN** a signed-in user reloads the page
- **THEN** the session persists and the user remains signed in

#### Scenario: Sign out clears the session

- **WHEN** a signed-in user signs out
- **THEN** the session cookie is cleared and protected endpoints reject subsequent requests

#### Scenario: Session secret is required

- **WHEN** the app starts without a `NUXT_SESSION_PASSWORD` of at least 32 characters
- **THEN** startup fails with a clear error rather than running with a weak or default secret

### Requirement: Event endpoints require authentication

All mutating `/api/events` endpoints SHALL reject unauthenticated requests.

#### Scenario: Unauthenticated write

- **WHEN** a request without a valid session sends `POST`, `PATCH`, or `DELETE` to `/api/events`
- **THEN** the system returns 401 and no data is modified

#### Scenario: Authenticated write

- **WHEN** a request with a valid session creates an event
- **THEN** the event is persisted and attributed to that user as its owner

### Requirement: Users may only modify events they are authorized for

The system SHALL enforce per-event authorization on the server using `nuxt-authorization` abilities. Client-side gating SHALL be treated as presentation only and SHALL NOT be the enforcement point.

#### Scenario: Owner edits their event

- **WHEN** a user updates an event they own
- **THEN** the update succeeds

#### Scenario: Non-owner edits another user's event

- **WHEN** a user attempts to update or delete an event they do not own
- **THEN** the system returns 403 and the event is unchanged

#### Scenario: Listing is scoped to the user

- **WHEN** an authenticated user lists events
- **THEN** the response contains only events they are authorized to see

### Requirement: Credentials are stored safely

Where password authentication is used, the system SHALL store only hashes produced by `nuxt-auth-utils`' `hashPassword` and SHALL never store or log plaintext passwords.

#### Scenario: Password is hashed at rest

- **WHEN** a user registers with a password
- **THEN** the `users` row contains a scrypt hash and no plaintext value

#### Scenario: Wrong password

- **WHEN** a user signs in with an incorrect password
- **THEN** authentication fails without revealing whether the account exists

### Requirement: Production secrets are not placeholders

The system SHALL NOT ship with the placeholder secret values currently present in the production environment (`SECRET_KEY=your-super-secret-key-change-this`, `JWT_SECRET=your-jwt-secret-key`, `ENCRYPTION_KEY=your-encryption-key-32-chars`).

#### Scenario: Placeholder secret detected

- **WHEN** the app starts in production with a known placeholder secret value
- **THEN** startup fails with an error naming the offending variable

