## Purpose

Applies the Crystal Neuo design language to every screen of the app and lets each visitor choose how it looks, with
their choices remembered and accessibility preferences always respected.

## ADDED Requirements

### Requirement: Every surface follows the active design axes

All app surfaces, including the calendar, its dialogs, menus and toasts, SHALL take their colours, radii, borders,
shadows, typography and spacing from Crystal Neuo tokens, so changing the material, platform, theme or density
restyles the whole interface without a reload.

#### Scenario: Switching material restyles the calendar

- **WHEN** a user changes the material from refraction to tactile
- **THEN** the top bar, buttons, calendar grid, event chips and open dialogs immediately use the tactile palette,
  borders and shadows

#### Scenario: High contrast theme

- **WHEN** the theme is set to high contrast
- **THEN** every surface uses the shared high-contrast palette and glass surfaces become opaque

### Requirement: Appearance settings

The app SHALL provide an Appearance dialog, reachable from the app chrome on every page, where a user can choose the
material (six options), platform style (five options plus "match this device"), theme (system, light, dark, high
contrast), density (three options) and the glass options frost, rim light, refraction and reduced transparency.

#### Scenario: Opening the dialog

- **WHEN** a user activates the appearance control in the top bar or tab bar
- **THEN** a dialog lists every axis with the current values selected, and each material option previews its own look

#### Scenario: Match this device

- **WHEN** the user chooses "match this device" on an iPhone
- **THEN** the platform is set to iOS

#### Scenario: Refraction is unavailable

- **WHEN** the browser cannot render live refraction
- **THEN** the dialog says so and frosted glass stays in place

### Requirement: Appearance choices persist without a flash

Appearance choices SHALL persist on the device and SHALL be applied before the first paint of every page.

#### Scenario: Reload keeps the material

- **WHEN** a user selects the bloom material, dark theme and compact density and reloads
- **THEN** the page renders in bloom, dark and compact from the first frame

#### Scenario: System theme follows the OS

- **WHEN** the theme preference is system and the operating system switches to dark mode
- **THEN** the app switches to the dark theme without a reload

### Requirement: Accessibility preferences win

Reduced motion, reduced transparency (system setting or the dialog toggle), forced colours and high contrast SHALL
disable animation, blur and refraction respectively, regardless of the chosen material.

#### Scenario: Reduced motion

- **WHEN** the operating system requests reduced motion
- **THEN** transitions complete instantly and refraction is off even if enabled in the dialog

### Requirement: Material typefaces are available

The display, text and numeric typefaces each material names SHALL be loaded, falling back to system fonts when they
cannot be fetched.

#### Scenario: Signal numerals

- **WHEN** the material is signal
- **THEN** calendar dates render in the material's dot-matrix numeric face
