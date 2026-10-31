# analytics Specification

## Purpose
Provides privacy-friendly, self-hosted product analytics (Umami and Rybbit) so the team can measure usage and page views without third-party trackers.
## Requirements
### Requirement: Umami tracks page views

The system SHALL send page view events to the self-hosted Umami instance at `https://umami.anorebel.net` in production.

#### Scenario: Page view reaches Umami

- **WHEN** a user navigates to a route in the deployed app
- **THEN** the browser issues a `POST` to the cloaked proxy endpoint `/api/savory`

#### Scenario: Umami is not in faux mode

- **WHEN** the app is built with a valid site ID present
- **THEN** the build log does not contain `[umami] Currently running in test mode due to incorrect/missing options.`

#### Scenario: Cloak mode emits no third-party script tag

- **WHEN** the deployed HTML is inspected
- **THEN** it contains no `<script src>` pointing at the Umami host and no exposed site ID, because tracking is proxied server-side

### Requirement: Umami site ID uses the project-standard env var name

The system SHALL read the Umami site ID from `NUXT_UMAMI_SITE_ID` and SHALL internally supply it to `nuxt-umami` under the `NUXT_UMAMI_ID` name the module requires. The name `NUXT_UMAMI_SITE_ID` SHALL be the only one used in `.env.example`, documentation, and deployment configuration.

#### Scenario: Existing deployment env keeps working

- **WHEN** the app is built in an environment where only `NUXT_UMAMI_SITE_ID` is set
- **THEN** Umami initializes with that site ID and tracks normally, with no change required to the Dokploy environment

#### Scenario: Site ID absent

- **WHEN** the app is built with `NUXT_UMAMI_SITE_ID` unset or empty
- **THEN** the build surfaces a clear warning rather than silently shipping a non-tracking build

### Requirement: Umami site ID is bound at build time

Because `nuxt-umami` resolves its configuration during the module setup hook, the site ID SHALL be present in the build environment. Documentation SHALL state that setting it only at runtime has no effect.

#### Scenario: Build environment carries the site ID

- **WHEN** a production image is built
- **THEN** `NUXT_UMAMI_SITE_ID` is available to the build step, not only to the running container

### Requirement: Rybbit tracking behavior is preserved

The system SHALL continue sending analytics to `https://rybbit.anorebel.net` using site ID `9cfed8c3615d`, which is working in production today. Refactoring its configuration location SHALL NOT change what is sent or where.

#### Scenario: Rybbit still loads after refactor

- **WHEN** the deployed page loads
- **THEN** the Rybbit script from `https://rybbit.anorebel.net/api/script.js` is present with the correct `data-site-id`

#### Scenario: Rybbit is disabled without a site ID

- **WHEN** no Rybbit site ID is configured
- **THEN** no Rybbit script tag is emitted and no requests are made to the Rybbit host

### Requirement: Analytics respect the enable flag

The system SHALL NOT send analytics of either kind when analytics are disabled by configuration.

#### Scenario: Analytics disabled

- **WHEN** the app runs with analytics disabled
- **THEN** no requests are made to the Umami or Rybbit hosts

