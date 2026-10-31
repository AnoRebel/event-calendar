# Proposal

## Why

Dragging and resizing now run on pointer events inside the calendar views, which is what makes touch hold-to-drag,
live previews and one update per gesture possible. `@vue-dnd-kit` is no longer used, yet the project still installs
it, requires every host to wrap the app in a `DnDProvider`, and its spec describes an API the code doesn't call.

## What Changes

- Remove `@vue-dnd-kit/core`, `@vue-dnd-kit/nuxt`, the unused `useDragAndDrop` composable and the `DnDProvider`
  wrapper. **BREAKING** for registry consumers only in the sense that the provider is no longer needed (keeping it is
  harmless).
- Releasing a dragged event outside the calendar cancels the move.
- Update the drag-and-drop and distributable-module specs, the docs and the README.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `drag-and-drop`: requirements describe pointer-driven drag and resize instead of vue-dnd-kit.
- `distributable-module`: installing the calendar no longer requires a drag-and-drop provider.

## Impact

`app/registry/event-calendar/*`, `app/app.vue`, `nuxt.config.ts`, `package.json`, `registry.json`, docs.
