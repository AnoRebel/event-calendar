import { isValid, parseISO } from "date-fns"
import type { EventDTO } from "./eventMapper"

export interface ValidationError {
  field: string
  message: string
}

// Server-side validation for event create/update payloads. This is the
// authoritative check — the client validates too, but the API never trusts it.
// `partial` allows update payloads that omit fields.
export function validateEventInput(
  input: Partial<EventDTO>,
  { partial = false }: { partial?: boolean } = {},
): ValidationError[] {
  const errors: ValidationError[] = []

  const hasTitle = input.title !== undefined
  if (!partial || hasTitle) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      errors.push({ field: "title", message: "Event title is required" })
    }
  }

  const hasStart = input.startDate !== undefined
  const hasEnd = input.endDate !== undefined

  if (!partial || hasStart) {
    if (!isValidDate(input.startDate)) {
      errors.push({ field: "startDate", message: "A valid start date is required" })
    }
  }
  if (!partial || hasEnd) {
    if (!isValidDate(input.endDate)) {
      errors.push({ field: "endDate", message: "A valid end date is required" })
    }
  }

  // End must be after start for non-all-day events, when both are present/valid.
  if (isValidDate(input.startDate) && isValidDate(input.endDate) && !input.allDay) {
    const start = parseISO(input.startDate as string)
    const end = parseISO(input.endDate as string)
    if (start >= end) {
      errors.push({ field: "endDate", message: "End time must be after start time" })
    }
  }

  return errors
}

function isValidDate(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false
  return isValid(parseISO(value))
}
