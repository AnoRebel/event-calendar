## Purpose

Defines the drag-and-drop and resize behavior of calendar events, built on the vue-dnd-kit v2 API, so events can be rescheduled directly in the views.

## ADDED Requirements

### Requirement: Drag-and-drop uses the installed vue-dnd-kit v2 API

The system SHALL use `makeDraggable` and `makeDroppable` from `@vue-dnd-kit/core` v2.4.7. It SHALL NOT import `useDraggable`, `useDroppable`, `IUseDragOptions`, or `IUseDropOptions`, which are the removed v1 API and do not exist in the installed package.

#### Scenario: Imports resolve

- **WHEN** the project is type-checked and built
- **THEN** no import from `@vue-dnd-kit/core` fails to resolve and no drag composable is `undefined` at runtime

#### Scenario: Provider is mounted

- **WHEN** any calendar view renders a draggable event
- **THEN** a `<DnDProvider>` ancestor is present, as v2 requires provider-based registration

### Requirement: Drag composables run in setup scope

Drag and drop registration SHALL occur during component `setup()`. It SHALL NOT be invoked from `onMounted` or `watch` callbacks, which is where `DayView.vue` and `MonthView.vue` currently call it and where v2's `inject`-based registration fails.

#### Scenario: No out-of-scope registration warning

- **WHEN** a view mounts and its events render
- **THEN** Vue emits no inject/lifecycle-outside-setup warning and drag handlers are live

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
- **THEN** it derives pointer position from the drag provider's pointer state and the zone's bounding rect, since v2's drop event supplies no raw `MouseEvent`

#### Scenario: Drag is cancelled

- **WHEN** a user releases an event outside any valid drop zone
- **THEN** the event returns to its original position and no update is persisted

### Requirement: Events can be resized by dragging handles

Users SHALL be able to resize an event via its edge handles to change its duration. Resize SHALL remain implemented directly on pointer events, because vue-dnd-kit v2 provides no resize API.

#### Scenario: Resize the end of an event

- **WHEN** a user drags an event's bottom handle downward
- **THEN** the event's end time extends to the released position and its start time is unchanged

#### Scenario: Resize below minimum duration

- **WHEN** a user resizes an event so its end would be at or before its start
- **THEN** the event is clamped to the minimum duration rather than inverting

### Requirement: Resize logic has a single implementation

Resize behavior SHALL exist in exactly one place. The duplicate implementation inside `useDragAndDrop` (`createResizeHandler`) and the unused `useEventResize` composable SHALL be consolidated.

#### Scenario: No duplicate resize code

- **WHEN** the codebase is searched for resize drag handling
- **THEN** exactly one implementation exists and it is the one the views use

### Requirement: Drag and drop degrades safely during SSR

Drag registration SHALL NOT execute during server rendering.

#### Scenario: Server render

- **WHEN** a calendar view renders on the server
- **THEN** no drag registration runs and the page renders without error
