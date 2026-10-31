import { computed } from "vue"
import { parseISO } from "date-fns"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import type { CalendarEvent } from "~/registry/event-calendar/types"

// Wire-format event: dates are ISO strings over HTTP.
export interface EventDTO extends Omit<CalendarEvent, "startDate" | "endDate"> {
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

export const dtoToEvent = (dto: EventDTO): CalendarEvent => ({
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

const PAGE_SIZE = 500

async function fetchAllEvents(): Promise<CalendarEvent[]> {
  const all: CalendarEvent[] = []
  for (let page = 1; ; page++) {
    const res = await $fetch<PaginatedResponse<EventDTO>>("/api/events", { query: { page, limit: PAGE_SIZE } })
    all.push(...res.data.map(dtoToEvent))
    if (!res.hasMore) return all
  }
}

// Ids this client just wrote, so realtime echoes of its own changes are skipped.
// Entries expire so the map cannot grow without bound.
const recentWrites = new Map<string, number>()
const markWrite = (id: string) => recentWrites.set(id, Date.now())

/**
 * The signed-in user's events, cached with TanStack Query. The calendar stays a
 * controlled component: it renders `events` and its add/update/delete emits call
 * the mutations here, which update the cache optimistically and roll back on
 * failure.
 */
export function useCalendarEvents() {
  const { user, loggedIn } = useUserSession()
  const queryClient = useQueryClient()
  const queryKey = computed(() => ["events", user.value?.id ?? "anonymous"] as const)

  const query = useQuery({
    queryKey,
    queryFn: fetchAllEvents,
    enabled: computed(() => import.meta.client && loggedIn.value),
  })

  const events = computed(() => query.data.value ?? [])
  const setEvents = (update: (list: CalendarEvent[]) => CalendarEvent[]) =>
    queryClient.setQueryData<CalendarEvent[]>(queryKey.value, old => update(old ?? []))

  // Shared optimistic-update plumbing: snapshot, apply, roll back on error.
  const optimistic = <TVars>(apply: (list: CalendarEvent[], vars: TVars) => CalendarEvent[]) => ({
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: queryKey.value })
      const previous = queryClient.getQueryData<CalendarEvent[]>(queryKey.value)
      setEvents(list => apply(list, vars))
      return { previous }
    },
    onError: (_err: unknown, _vars: TVars, context?: { previous?: CalendarEvent[] }) => {
      if (context?.previous) queryClient.setQueryData(queryKey.value, context.previous)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (event: CalendarEvent) => {
      const dto = await $fetch<EventDTO>("/api/events", { method: "POST", body: eventToBody(event) })
      return dtoToEvent(dto)
    },
    ...optimistic<CalendarEvent>((list, event) => [...list, event]),
    // Swap the provisional client id for the server's.
    onSuccess: (created, provisional) => {
      markWrite(created.id)
      setEvents(list => [...list.filter(e => e.id !== provisional.id && e.id !== created.id), created])
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (event: CalendarEvent) => {
      markWrite(event.id)
      const dto = await $fetch<EventDTO>(`/api/events/${event.id}`, { method: "PATCH", body: eventToBody(event) })
      return dtoToEvent(dto)
    },
    ...optimistic<CalendarEvent>((list, event) => list.map(e => (e.id === event.id ? { ...e, ...event } : e))),
    onSuccess: updated => setEvents(list => list.map(e => (e.id === updated.id ? updated : e))),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      markWrite(id)
      await $fetch(`/api/events/${id}`, { method: "DELETE" })
    },
    ...optimistic<string>((list, id) => list.filter(e => e.id !== id)),
  })

  /** Apply a change made elsewhere (another tab or device), idempotently. */
  function applyRemote(change: RemoteEventChange) {
    if (change.type === "deleted") {
      setEvents(list => list.filter(e => e.id !== change.id))
      return
    }
    const incoming = dtoToEvent(change.event)
    setEvents(list =>
      list.some(e => e.id === incoming.id) ? list.map(e => (e.id === incoming.id ? incoming : e)) : [...list, incoming],
    )
  }

  function isOwnEcho(change: RemoteEventChange) {
    const id = change.type === "deleted" ? change.id : change.event?.id
    const t = id ? recentWrites.get(id) : undefined
    if (t === undefined) return false
    if (Date.now() - t > 5000) {
      recentWrites.delete(id!)
      return false
    }
    return true
  }

  return {
    events,
    isLoading: computed(() => query.isPending.value && loggedIn.value),
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => query.refetch(),
    createEvent: (event: CalendarEvent) => createMutation.mutateAsync(event),
    updateEvent: (event: CalendarEvent) => updateMutation.mutateAsync(event),
    deleteEvent: (id: string) => deleteMutation.mutateAsync(id),
    applyRemote,
    isOwnEcho,
  }
}
