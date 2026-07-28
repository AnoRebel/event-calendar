import { isValid, parseISO } from "date-fns"
import type { EventRow, NewEventRow } from "../db/schema"

// The wire shape of an event: same as the client's CalendarEvent but with dates
// as ISO strings (JSON has no Date type). useEventAPI sends/expects exactly this.
export interface EventDTO {
  id: string
  ownerId?: string | null
  title: string
  description?: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  color?: string
  location?: string
  status?: string
  timezone?: string
  isRecurring?: boolean
  recurringPattern?: unknown
  recurringId?: string
}

// DB row -> wire DTO (client JSON).
export function rowToDto(row: EventRow): EventDTO {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.startDate,
    endDate: row.endDate,
    startTime: row.startTime ?? undefined,
    endTime: row.endTime ?? undefined,
    allDay: row.allDay,
    color: row.color ?? undefined,
    location: row.location ?? undefined,
    status: row.status ?? undefined,
    timezone: row.timezone ?? undefined,
    isRecurring: row.isRecurring,
    recurringPattern: row.recurringPattern ? safeParse(row.recurringPattern) : undefined,
    recurringId: row.recurringId ?? undefined,
  }
}

// Incoming create/update payload -> DB row columns. Only known fields are copied
// (unknown fields are ignored, never persisted). Returns a partial for updates.
export function dtoToRow(input: Partial<EventDTO>): Partial<NewEventRow> {
  const row: Partial<NewEventRow> = {}
  if (input.id !== undefined) row.id = input.id
  if (input.ownerId !== undefined) row.ownerId = input.ownerId
  if (input.title !== undefined) row.title = input.title
  if (input.description !== undefined) row.description = input.description
  if (input.startDate !== undefined) row.startDate = toISO(input.startDate)
  if (input.endDate !== undefined) row.endDate = toISO(input.endDate)
  if (input.startTime !== undefined) row.startTime = input.startTime
  if (input.endTime !== undefined) row.endTime = input.endTime
  if (input.allDay !== undefined) row.allDay = !!input.allDay
  if (input.color !== undefined) row.color = input.color
  if (input.location !== undefined) row.location = input.location
  if (input.status !== undefined) row.status = input.status
  if (input.timezone !== undefined) row.timezone = input.timezone
  if (input.isRecurring !== undefined) row.isRecurring = !!input.isRecurring
  if (input.recurringPattern !== undefined) {
    row.recurringPattern = input.recurringPattern ? JSON.stringify(input.recurringPattern) : null
  }
  if (input.recurringId !== undefined) row.recurringId = input.recurringId
  return row
}

function toISO(value: string): string {
  // Accept ISO strings and normalize to a canonical ISO timestamp; pass through
  // anything unparseable unchanged (validation rejects it separately).
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed.toISOString() : value
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}
