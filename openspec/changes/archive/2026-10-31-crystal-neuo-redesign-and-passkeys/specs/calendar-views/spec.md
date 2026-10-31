## Purpose

Describes what the month, week, day and agenda views and the event dialog show and how they respond to input and
screen size.

## ADDED Requirements

### Requirement: Views fill the available width

Week and day views SHALL size their day columns to fill the calendar's width. When the viewport is too narrow for
seven readable columns, the week view SHALL scroll horizontally with the time gutter kept in view.

#### Scenario: Desktop week

- **WHEN** the week view renders at 1440px
- **THEN** the seven day columns span the full width of the calendar

#### Scenario: Phone week

- **WHEN** the week view renders at 390px
- **THEN** the days can be scrolled horizontally and the hour labels stay visible

### Requirement: Toolbar adapts to width

The calendar toolbar SHALL keep previous, today, next, the title, add event and the view switcher usable at every
width, without truncating the view names into single letters.

#### Scenario: Phone toolbar

- **WHEN** the calendar renders at 360px
- **THEN** the view switcher shows readable labels and the title is not cut off mid-word

### Requirement: Event dialog defaults are consistent

Creating an event SHALL prefill a start and an end time one hour apart (or the clicked slot), the date the user
clicked, and the browser's timezone.

#### Scenario: Add from toolbar

- **WHEN** a user clicks Add event at 14:20
- **THEN** the dialog prefills today, 15:00 to 16:00, and the browser's timezone

#### Scenario: Add from a time slot

- **WHEN** a user clicks the 09:00 slot on Tuesday in the week view
- **THEN** the dialog prefills Tuesday 09:00 to 10:00

### Requirement: Deep links open views and actions

The calendar SHALL honour `?view=month|week|day|agenda`, `?date=YYYY-MM-DD` and `?action=add` in its URL and keep the
current view and date reflected in the URL.

#### Scenario: Install shortcut

- **WHEN** the installed app is opened through its "Add event" shortcut (`/?action=add`)
- **THEN** the calendar opens with the new-event dialog showing

#### Scenario: Shareable view

- **WHEN** a user switches to the day view for 3 November
- **THEN** the URL contains `view=day` and `date=2026-11-03`, and reloading restores that view

### Requirement: Event resize has one implementation

Resizing an event in the week and day views SHALL use a single pointer-based implementation that works with mouse,
pen and touch.

#### Scenario: Touch resize

- **WHEN** a user drags the bottom edge of a one-hour event down by one hour on a touch screen
- **THEN** the event becomes two hours long and the change is saved
