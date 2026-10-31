## Purpose

Syncs event changes live between connected clients over a Nitro crossws WebSocket so multiple sessions see creates, updates, and deletes in real time.

## ADDED Requirements

### Requirement: Event changes broadcast to connected clients

The system SHALL propagate event creates, updates, and deletes to other connected clients over a Nitro `crossws` WebSocket endpoint. Because libSQL provides no change feed, subscription, or LISTEN/NOTIFY primitive, fan-out SHALL be performed by the application: the API handler writes to the database and then explicitly publishes to the WebSocket topic.

#### Scenario: Create is broadcast

- **WHEN** one client creates an event
- **THEN** other connected clients receive the new event and render it without reloading

#### Scenario: Update is broadcast

- **WHEN** one client drags an event to a new time
- **THEN** other connected clients see the event move

#### Scenario: Delete is broadcast

- **WHEN** one client deletes an event
- **THEN** the event disappears for other connected clients

#### Scenario: Broadcast follows a successful write

- **WHEN** a write to the database fails
- **THEN** no broadcast is published and clients do not show the change

#### Scenario: Originating client is not duplicated

- **WHEN** a client's own write is broadcast back to it
- **THEN** the client does not render a duplicate of the event

### Requirement: WebSocket connections are authenticated

The system SHALL establish the connected user's identity in the WebSocket `open` hook rather than relying on context returned from `upgrade`, which is not reliably propagated to `peer.context`.

#### Scenario: Unauthenticated socket

- **WHEN** a connection is opened without a valid session
- **THEN** the peer is not subscribed to any event topic and receives no broadcasts

#### Scenario: Broadcasts respect authorization

- **WHEN** an event changes that a connected user is not authorized to see
- **THEN** that user's client does not receive it

### Requirement: The app works without a live WebSocket

Real-time sync SHALL be an enhancement. Loss of the WebSocket SHALL NOT break event CRUD.

#### Scenario: WebSocket unavailable

- **WHEN** the WebSocket connection fails or is unavailable
- **THEN** the calendar still loads and the user can still create, edit, and delete events over HTTP

#### Scenario: Reconnect after drop

- **WHEN** a dropped connection is re-established
- **THEN** the client resynchronizes so its view matches server state

### Requirement: Concurrent edits resolve deterministically

The system SHALL define a deterministic outcome when two users edit the same event concurrently, and SHALL NOT leave clients showing divergent state.

#### Scenario: Two users edit the same event

- **WHEN** two users update the same event at nearly the same time
- **THEN** the resolution is applied consistently and every connected client converges on the same final state
