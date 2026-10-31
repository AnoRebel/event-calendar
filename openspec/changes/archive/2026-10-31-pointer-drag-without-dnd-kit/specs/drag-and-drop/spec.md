## MODIFIED Requirements

### Requirement: Events can be dragged between time slots and days

Users SHALL be able to drag an event onto a different day or time slot, and the event's dates SHALL update to match the drop target.

#### Scenario: Drag to another day

- **WHEN** a user drags an event from one day cell to another
- **THEN** the event's start and end dates shift to the target day, preserving its duration

#### Scenario: Drag to another time slot

- **WHEN** a user drags an event to a different time slot within a day
- **THEN** the event's start time becomes the target slot's time and its duration is preserved

#### Scenario: Drop position resolves without a MouseEvent

- **WHEN** the drop handler computes the target time
- **THEN** it derives it from the pointer's position over the target day column, snapped to 15 minutes

#### Scenario: Drag on a touch screen

- **WHEN** a user presses and holds an event for a quarter of a second and then moves their finger
- **THEN** the event follows the finger and moves on release, while a quick swipe scrolls instead

#### Scenario: Drag is cancelled

- **WHEN** a user releases an event outside any valid drop zone, or presses Escape while dragging
- **THEN** the event returns to its original position and no update is persisted

### Requirement: Events can be resized by dragging handles

Users SHALL be able to resize an event via its top and bottom edges to change its duration, with a mouse, a pen or touch.

#### Scenario: Resize the end of an event

- **WHEN** a user drags an event's bottom handle downward
- **THEN** the event's end time extends to the released position and its start time is unchanged

#### Scenario: Resize below minimum duration

- **WHEN** a user resizes an event so its end would be at or before its start
- **THEN** the event is clamped to the minimum duration rather than inverting

## ADDED Requirements

### Requirement: One update per gesture

Moving or resizing an event SHALL show a live preview while the pointer moves and SHALL emit exactly one update when the gesture ends, and none when nothing changed.

#### Scenario: Long drag

- **WHEN** a user drags an event across several hours and days before releasing
- **THEN** the host receives a single update with the final dates

## REMOVED Requirements

### Requirement: Drag-and-drop uses the installed vue-dnd-kit v2 API

**Reason**: Dragging is implemented on pointer events in the views; vue-dnd-kit is no longer a dependency.

**Migration**: None needed. Hosts may remove `DnDProvider` and `@vue-dnd-kit/*`.

### Requirement: Drag composables run in setup scope

**Reason**: There is no provider-based drag registration any more.

**Migration**: None needed.
