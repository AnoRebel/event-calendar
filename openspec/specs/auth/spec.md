# auth Specification

## Purpose
Gives the calendar authenticated user identities and an invite/seed-only registration policy so events can be owned and access controlled.

## Requirements

### Requirement: Users have identities backed by sessions

The system SHALL authenticate users via `nuxt-auth-utils` sealed cookie sessions, sealed with a key derived from
`NUXT_APP_SECRET`. Session state SHALL NOT require a database table; the application SHALL own its account tables
(users, passkey credentials, single-use passkey challenges and invites) in its own Drizzle schema.

#### Scenario: Session survives reload

- **WHEN** a signed-in user reloads the page
- **THEN** the session persists and the user remains signed in

#### Scenario: Sign out clears the session

- **WHEN** a signed-in user signs out
- **THEN** the session cookie is cleared and protected endpoints reject subsequent requests

#### Scenario: Session secret is required

- **WHEN** the app starts in production without a `NUXT_APP_SECRET` of at least 32 characters
- **THEN** startup fails with a clear error rather than running with a weak or default secret

#### Scenario: Legacy secret variable

- **WHEN** the app starts in production with only `NUXT_SESSION_PASSWORD` set
- **THEN** startup fails with an error telling the operator to rename it to `NUXT_APP_SECRET`

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

Where password authentication is used, the system SHALL store only hashes produced by `nuxt-auth-utils`'
`hashPassword` and SHALL never store or log plaintext passwords. Passkey accounts SHALL store only public keys, and an
account created with a passkey SHALL have no password hash.

#### Scenario: Password is hashed at rest

- **WHEN** a user registers with a password
- **THEN** the `users` row contains a scrypt hash and no plaintext value

#### Scenario: Wrong password

- **WHEN** a user signs in with an incorrect password
- **THEN** authentication fails without revealing whether the account exists

#### Scenario: Passkey-only account cannot use a password

- **WHEN** someone tries to sign in with a password to an account that has none
- **THEN** authentication fails with the same generic error as a wrong password

### Requirement: Production secrets are not placeholders

The system SHALL NOT ship with the placeholder secret values currently present in the production environment (`SECRET_KEY=your-super-secret-key-change-this`, `JWT_SECRET=your-jwt-secret-key`, `ENCRYPTION_KEY=your-encryption-key-32-chars`).

#### Scenario: Placeholder secret detected

- **WHEN** the app starts in production with a known placeholder secret value
- **THEN** startup fails with an error naming the offending variable

### Requirement: Create an account with a passkey

A visitor SHALL be able to create an account with a passkey instead of a password, subject to the same registration
policy (bootstrap, invite or open registration) as password sign-up.

#### Scenario: Passkey sign-up

- **WHEN** a visitor enters their name and email and confirms a new passkey with their device
- **THEN** an account is created, the passkey is stored, and they are signed in

#### Scenario: Invite-only policy applies

- **WHEN** registration is invite-only and the visitor has no valid invite
- **THEN** passkey sign-up is refused with the same message as password sign-up

#### Scenario: Email already registered

- **WHEN** a visitor tries to create a passkey account for an email that already has an account
- **THEN** the request is refused without creating a credential

### Requirement: Sign in with a passkey

A user SHALL be able to sign in with any passkey registered to their account without typing their email, and the
browser's passkey autofill SHALL be offered where supported. Each challenge SHALL be single-use and expire.

#### Scenario: Passkey sign-in

- **WHEN** a user chooses "Sign in with a passkey" and confirms with their device
- **THEN** they are signed in to the account that owns the passkey and the passkey's signature counter is updated

#### Scenario: Replayed challenge

- **WHEN** a sign-in response is submitted a second time
- **THEN** it is rejected

#### Scenario: Unknown passkey

- **WHEN** the device offers a passkey that is not registered
- **THEN** sign-in fails with a message that no account uses that passkey

### Requirement: Manage passkeys

A signed-in user SHALL be able to list their passkeys (name, created and last used dates), add another, rename one and
remove one, from their account page.

#### Scenario: Add a passkey to a password account

- **WHEN** a signed-in user adds a passkey from the account page
- **THEN** the new passkey appears in the list and can be used to sign in

#### Scenario: Remove the last sign-in method

- **WHEN** a user without a password tries to remove their only passkey
- **THEN** the removal is refused and the passkey stays

### Requirement: Manage password

A signed-in user SHALL be able to set a password (if they have none) or change it (after confirming the current one).

#### Scenario: Change password

- **WHEN** a user enters their current password and a new one of at least 8 characters
- **THEN** the new password works for sign-in and the old one does not

### Requirement: Create invite links

A signed-in user SHALL be able to create an invite link from their account page when registration is invite-only,
optionally bound to an email address and with an expiry.

#### Scenario: Copy an invite

- **WHEN** a user creates an invite
- **THEN** they receive a link that opens the sign-up form with the invite prefilled, and it works once
