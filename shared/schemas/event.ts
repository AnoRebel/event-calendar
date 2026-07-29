import * as v from "valibot"

// Shared valibot schemas for event payloads — used by the server API (authoritative
// validation) and available to the client. Dates are ISO strings on the wire.

const isoDate = v.pipe(
  v.string(),
  v.check(s => !Number.isNaN(new Date(s).getTime()), "Must be a valid ISO date"),
)

const eventColor = v.picklist(["sky", "amber", "violet", "rose", "emerald", "orange"])
const eventStatus = v.picklist(["confirmed", "tentative", "cancelled", "past"])

// Base object (create). Unknown keys are dropped by v.object — exactly the
// "ignore unknown fields" behavior we want.
const BaseEventSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.minLength(1, "Event title is required")),
  description: v.optional(v.string()),
  startDate: isoDate,
  endDate: isoDate,
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  allDay: v.optional(v.boolean()),
  color: v.optional(eventColor),
  location: v.optional(v.string()),
  status: v.optional(eventStatus),
  timezone: v.optional(v.string()),
  isRecurring: v.optional(v.boolean()),
  recurringPattern: v.optional(v.unknown()),
  recurringId: v.optional(v.string()),
})

// end > start for non-all-day events. `input` is typed from the object schema.
const endAfterStart = (input: {
  startDate?: string
  endDate?: string
  allDay?: boolean
}): boolean => {
  if (input.allDay) return true
  if (!input.startDate || !input.endDate) return true
  return new Date(input.startDate) < new Date(input.endDate)
}

export const CreateEventSchema = v.pipe(
  BaseEventSchema,
  v.forward(
    v.partialCheck([["startDate"], ["endDate"], ["allDay"]], endAfterStart, "End time must be after start time"),
    ["endDate"],
  ),
)

// Update: every field optional, same cross-field rule.
export const UpdateEventSchema = v.pipe(
  v.partial(BaseEventSchema),
  v.forward(
    v.partialCheck([["startDate"], ["endDate"], ["allDay"]], endAfterStart, "End time must be after start time"),
    ["endDate"],
  ),
)

export type CreateEventInput = v.InferOutput<typeof CreateEventSchema>
export type UpdateEventInput = v.InferOutput<typeof UpdateEventSchema>
