import { describe, expect, it } from "vitest"
import { computed } from "vue"
import { useRecurringEvents } from "../composables/useRecurringEvents"
import type { RecurringPattern } from "../types"

const { getPatternDescription, getNextOccurrence, validateRecurringPattern } = useRecurringEvents(computed(() => []))

describe("useRecurringEvents", () => {
  it("describes patterns in plain language", () => {
    expect(getPatternDescription({ type: "daily", interval: 1 })).toBe("Daily")
    expect(getPatternDescription({ type: "weekly", interval: 2, daysOfWeek: [1, 3] })).toBe("Every 2 weeks on Mon, Wed")
    expect(getPatternDescription({ type: "monthly", interval: 1, dayOfMonth: 15 })).toBe("Monthly on day 15")
    expect(getPatternDescription({ type: "yearly", interval: 1, monthOfYear: 3, dayOfMonth: 14 })).toBe("Yearly on March 14")
  })

  it("treats monthOfYear as 1–12 when repeating yearly", () => {
    const pattern: RecurringPattern = { type: "yearly", interval: 1, monthOfYear: 3, dayOfMonth: 14 }
    const next = getNextOccurrence(new Date(2026, 2, 14), pattern)
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2027, 2, 14])
  })

  it("accepts December and rejects month 13", () => {
    expect(validateRecurringPattern({ type: "yearly", interval: 1, monthOfYear: 12 })).toEqual([])
    expect(validateRecurringPattern({ type: "yearly", interval: 1, monthOfYear: 13 }).length).toBe(1)
  })
})
