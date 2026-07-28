import { ref } from "vue"
import { parseISO } from "date-fns"
import type { CalendarEvent } from "~/registry/event-calendar/types"

// Wire-format event: dates are ISO strings over HTTP.
interface EventDTO extends Omit<CalendarEvent, "startDate" | "endDate"> {
  startDate: string
  endDate: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// A change broadcast over the WebSocket. Matches the server's EventChange.
export type RemoteEventChange =
  | { type: "created"; event: EventDTO }
  | { type: "updated"; event: EventDTO }
  | { type: "deleted"; id: string; ownerId?: string | null }

const dtoToEvent = (dto: EventDTO): CalendarEvent => ({
  ...dto,
  startDate: parseISO(dto.startDate),
  endDate: parseISO(dto.endDate),
})

const eventToBody = (e: Partial<CalendarEvent>): Record<string, unknown> => {
  const body: Record<string, unknown> = { ...e }
  if (e.startDate instanceof Date) body.startDate = e.startDate.toISOString()
  if (e.endDate instanceof Date) body.endDate = e.endDate.toISOString()
  return body
}

// Owns the calendar's data: loads events from /api/events and performs CRUD.
// The calendar component stays controlled (events in via prop, mutations via
// emits); this composable is the persistence layer app.vue delegates to.
export function useCalendarData() {
  const events = ref<CalendarEvent[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // Ids this client just wrote, so real-time echoes of its own changes can be
  // ignored. Entries expire so the set can't grow unbounded.
  const recentWrites = new Map<string, number>()
  const markWrite = (id: string) => recentWrites.set(id, Date.now())
  const isOwnEcho = (change: RemoteEventChange) => {
    const id = change.type === "deleted" ? change.id : change.event?.id
    if (!id) return false
    const t = recentWrites.get(id)
    if (t === undefined) return false
    if (Date.now() - t > 5000) {
      recentWrites.delete(id)
      return false
    }
    return true
  }

  async function load() {
    isLoading.value = true
    loadError.value = null
    try {
      // Fetch a broad window so month/week/day views all have data.
      const res = await $fetch<PaginatedResponse<EventDTO>>("/api/events", {
        query: { limit: 500 },
      })
      events.value = res.data.map(dtoToEvent)
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : "Failed to load events"
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const dto = await $fetch<EventDTO>("/api/events", {
      method: "POST",
      body: eventToBody(event),
    })
    const created = dtoToEvent(dto)
    markWrite(created.id)
    events.value = [...events.value, created]
    return created
  }

  async function updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const dto = await $fetch<EventDTO>(`/api/events/${event.id}`, {
      method: "PATCH",
      body: eventToBody(event),
    })
    const updated = dtoToEvent(dto)
    markWrite(updated.id)
    events.value = events.value.map(e => (e.id === updated.id ? updated : e))
    return updated
  }

  async function deleteEvent(id: string): Promise<void> {
    markWrite(id)
    await $fetch(`/api/events/${id}`, { method: "DELETE" })
    events.value = events.value.filter(e => e.id !== id)
  }

  // Apply a change that originated elsewhere (a real-time broadcast, section 8),
  // idempotently — used so remote edits appear without a reload.
  function applyRemote(change: RemoteEventChange) {
    if (change.type === "deleted") {
      events.value = events.value.filter(e => e.id !== change.id)
      return
    }
    const incoming = dtoToEvent(change.event)
    const idx = events.value.findIndex(e => e.id === incoming.id)
    if (idx === -1) events.value = [...events.value, incoming]
    else events.value = events.value.map(e => (e.id === incoming.id ? incoming : e))
  }

  return { events, isLoading, loadError, load, createEvent, updateEvent, deleteEvent, applyRemote, isOwnEcho }
}
