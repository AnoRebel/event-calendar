# Design

## Decisions

- **Pointer events, no library.** `TimeGrid.vue` and `usePointerDrag` own gestures: mouse drags start after 4px,
  touch and pen after a 250 ms hold (so scrolling still works), updates run once per animation frame, and a single
  `eventUpdate` is emitted on release. The pure date maths lives in `useTimeGrid.ts` and is unit tested.
- **Cancel by leaving.** When the pointer is outside every drop target the preview returns to the original position;
  releasing there emits nothing. `Esc` also cancels.
- **No provider.** With no library there is nothing to provide; hosts that still render `DnDProvider` are unaffected.
