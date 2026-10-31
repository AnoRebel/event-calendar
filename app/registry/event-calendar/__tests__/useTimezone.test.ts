import { describe, expect, it } from "vitest"
import { ref } from "vue"
import { useTimezone } from "../composables/useTimezone"
import type { CalendarEvent } from "../types"

describe("useTimezone", () => {
  const { toWallClock, fromWallClock, convertEventFromDisplayTimezone, convertEventToDisplayTimezone } = useTimezone(
    ref("UTC"),
  )

  it("interprets dialog input in the event's timezone", () => {
    // The user typed 09:00 on 2 Nov 2026 and picked Tokyo (UTC+9).
    const typed = new Date(2026, 10, 2, 9, 0)
    const instant = fromWallClock(typed, "Asia/Tokyo")
    expect(instant.toISOString()).toBe("2026-11-02T00:00:00.000Z")
  })

  it("round-trips wall-clock time through storage", () => {
    const typed = new Date(2026, 10, 2, 9, 30)
    const instant = fromWallClock(typed, "America/New_York")
    const shown = toWallClock(instant, "America/New_York")
    expect([shown.getHours(), shown.getMinutes(), shown.getDate()]).toEqual([9, 30, 2])
  })

  it("prefills the dialog with the times as entered", () => {
    const event: CalendarEvent = {
      id: "1",
      title: "Standup",
      startDate: new Date("2026-11-02T00:00:00.000Z"),
      endDate: new Date("2026-11-02T00:30:00.000Z"),
      timezone: "Asia/Tokyo",
    }
    const editing = convertEventToDisplayTimezone(event)
    expect(editing.startDate.getHours()).toBe(9)
    const saved = convertEventFromDisplayTimezone(editing)
    expect(saved.startDate.toISOString()).toBe(event.startDate.toISOString())
    expect(saved.endDate.toISOString()).toBe(event.endDate.toISOString())
  })

  it("leaves all-day events alone", () => {
    const event: CalendarEvent = {
      id: "2",
      title: "Holiday",
      startDate: new Date(2026, 11, 25),
      endDate: new Date(2026, 11, 25, 23, 59),
      allDay: true,
      timezone: "Asia/Tokyo",
    }
    expect(convertEventFromDisplayTimezone(event)).toBe(event)
  })
})
