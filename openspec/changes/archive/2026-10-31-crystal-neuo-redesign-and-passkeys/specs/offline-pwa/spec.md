## Purpose

Makes the app installable and keeps its shell available offline without ever exposing one user's data to another.

## ADDED Requirements

### Requirement: Authenticated data is never cached by the service worker

The service worker SHALL NOT store or serve responses from `/api/` or the realtime socket.

#### Scenario: Shared device

- **WHEN** user A signs out and user B signs in on the same browser while offline
- **THEN** none of user A's events are served to user B

### Requirement: Offline shell

Page navigations SHALL be network-first and fall back to a generic offline page when the network is unavailable;
pages rendered for a signed-in user SHALL NOT be cached. Versioned build assets SHALL be served cache-first.

#### Scenario: Offline reload

- **WHEN** a previously visited app is reloaded with the network off
- **THEN** an offline page explains the network is unavailable and retries when it returns, instead of a browser
  error page

#### Scenario: New deployment

- **WHEN** a new version is deployed
- **THEN** the next online navigation receives the new pages, and caches from older service worker versions are
  removed

### Requirement: Installable

The web app manifest SHALL declare PNG icons at 192px and 512px (including a maskable icon), theme colours, and
shortcuts that open the calendar's add-event and day views.

#### Scenario: Install prompt

- **WHEN** a Chromium browser evaluates the site
- **THEN** it treats the app as installable
