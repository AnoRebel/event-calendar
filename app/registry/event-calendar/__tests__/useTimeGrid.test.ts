import { describe, expect, it } from "vitest"
import { layoutDay, moveToAllDay, moveToDay, moveToTime, resizeEvent, visibleRange } from "../composables/useTimeGrid"
import type { CalendarEvent } from "../types"

const ev = (id: string, start: Date, end: Date, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: id,
  startDate: start,
  endDate: end,
  ...extra,
})
const at = (h: number, m = 0, day = 2) => new Date(2026, 10, day, h, m)

describe("time grid helpers", () => {
  it("positions an event by its time of day", () => {
    expect(visibleRange(ev("a", at(16), at(17)), at(0))).toEqual({ top: 960, bottom: 1020 })
  })

  it("clips multi-day events to the visible day", () => {
    const range = visibleRange(ev("a", at(22, 0, 1), at(2, 0, 3)), at(0))
    expect(range).toEqual({ top: 0, bottom: 1440 })
  })

  it("drops onto a time slot at the dropped time, keeping the length", () => {
    const moved = moveToTime(ev("a", at(9), at(10, 30)), "2026-11-05", 14 * 60 + 7)
    expect(moved.startDate).toEqual(new Date(2026, 10, 5, 14, 0))
    expect(moved.endDate).toEqual(new Date(2026, 10, 5, 15, 30))
  })

  it("moves to another day in local time, keeping time and span", () => {
    const moved = moveToDay(ev("a", at(9, 0, 2), at(11, 0, 3)), "2026-11-10")
    expect(moved.startDate).toEqual(new Date(2026, 10, 10, 9))
    expect(moved.endDate).toEqual(new Date(2026, 10, 11, 11))
  })

  it("drops onto the all-day row on the local day", () => {
    const moved = moveToAllDay(ev("a", at(9), at(10)), "2026-11-07")
    expect(moved.allDay).toBe(true)
    expect(moved.startDate).toEqual(new Date(2026, 10, 7))
    expect((moved.endDate as Date).getDate()).toBe(7)
  })

  it("resizes in 15-minute steps and never below 15 minutes", () => {
    const e = ev("a", at(9), at(10))
    expect(resizeEvent(e, "end", 50).endDate).toEqual(at(10, 45))
    expect(resizeEvent(e, "end", -500).endDate).toEqual(at(9, 15))
    expect(resizeEvent(e, "start", -30).startDate).toEqual(at(8, 30))
  })

  it("lays overlapping events side by side", () => {
    const out = layoutDay(
      [ev("a", at(9), at(11)), ev("b", at(10), at(12)), ev("c", at(11), at(12)), ev("d", at(14), at(15))],
      at(0),
    )
    const byId = Object.fromEntries(out.map(o => [o.event.id, o]))
    expect(byId.a!.lanes).toBe(2)
    expect(byId.b!.lane).toBe(1)
    expect(byId.c!.lane).toBe(0) // reuses the lane "a" freed at 11:00
    expect(byId.d!.lanes).toBe(1)
  })
})
