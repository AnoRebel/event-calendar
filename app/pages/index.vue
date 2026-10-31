<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { format, isValid, parseISO } from "date-fns"
import { toast } from "vue-sonner"
import { CloudOff, RefreshCw } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import type { CalendarEvent, ViewMode } from "~/registry/event-calendar/types"
import EventCalendar from "~/registry/event-calendar/EventCalendar.vue"

definePageMeta({ middleware: "auth" })
useHead({ title: "Calendar" })

// Events live in TanStack Query (see useCalendarEvents). EventCalendar stays a
// controlled component: events in via the prop, intents out via emits.
const { events, isLoading, error, refetch, createEvent, updateEvent, deleteEvent, applyRemote, isOwnEcho } =
  useCalendarEvents()
const { collaboration, recurringEvents } = useFeatureFlags()
const { loggedIn } = useUserSession()

// Optional realtime sync between a user's tabs and devices; a reconnect resyncs.
const realtime = useCalendarRealtime(applyRemote, isOwnEcho, () => refetch())
if (import.meta.client) {
  watch(
    loggedIn,
    on => {
      if (on && collaboration) realtime.start()
      else realtime.stop()
    },
    { immediate: true },
  )
}

// --- Deep links: ?view=week&date=2026-11-03&action=add ---------------------------
const route = useRoute()
const router = useRouter()
const VIEWS: ViewMode[] = ["month", "week", "day", "agenda"]

const initialView = VIEWS.includes(route.query.view as ViewMode) ? (route.query.view as ViewMode) : "month"
const parsedDate = typeof route.query.date === "string" ? parseISO(route.query.date) : null
const view = ref<ViewMode>(initialView)
const date = ref<Date>(parsedDate && isValid(parsedDate) ? parsedDate : new Date())

// Keep the URL shareable: reflect the view and date without adding history entries.
watch([view, date], ([v, d]) => {
  const query = { ...route.query, view: v, date: format(d, "yyyy-MM-dd") }
  if (query.view === route.query.view && query.date === route.query.date) return
  router.replace({ query })
})

const calendar = ref<InstanceType<typeof EventCalendar> | null>(null)
onMounted(() => {
  if (route.query.action === "add") {
    calendar.value?.openAddModal()
    const { action: _action, ...rest } = route.query
    router.replace({ query: rest })
  }
})

// --- Mutations ---------------------------------------------------------------------
const handleEventAdd = async (event: CalendarEvent) => {
  try {
    await createEvent(event)
    toast.success(`Added "${event.title}"`, { description: format(event.startDate, "EEE, MMM d · p") })
  } catch (err) {
    toast.error("Couldn't add the event", { description: errorMessage(err) })
  }
}

const handleEventUpdate = async (event: CalendarEvent) => {
  try {
    await updateEvent(event)
    toast.success(`Saved "${event.title}"`)
  } catch (err) {
    toast.error("Couldn't save your changes", { description: errorMessage(err) })
  }
}

const handleEventDelete = async (eventId: string) => {
  const deleted = events.value.find(e => e.id === eventId)
  try {
    await deleteEvent(eventId)
    toast.success(deleted ? `Deleted "${deleted.title}"` : "Event deleted")
  } catch (err) {
    toast.error("Couldn't delete the event", { description: errorMessage(err) })
  }
}

const showError = computed(() => !!error.value && events.value.length === 0)
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col px-3 pt-3 sm:px-4 sm:pt-4">
    <div v-if="showError" class="surface-panel flex flex-col items-center gap-3 px-6 py-16 text-center" role="alert">
      <CloudOff class="size-8 text-danger-content" aria-hidden="true" />
      <h1 class="mb-0 text-lg font-semibold">We couldn't load your events</h1>
      <p class="mb-0 max-w-sm text-sm text-content-secondary">{{ errorMessage(error) }}</p>
      <Button variant="outline" type="button" @click="refetch()"><RefreshCw /> Try again</Button>
    </div>

    <EventCalendar
      v-else
      ref="calendar"
      v-model:view="view"
      v-model:date="date"
      :events="events"
      :loading="isLoading"
      :features="{ recurringEvents }"
      class="h-[calc(100dvh-10.5rem)] min-h-[26rem] md:h-[calc(100dvh-6.5rem)]"
      @event-add="handleEventAdd"
      @event-update="handleEventUpdate"
      @event-delete="handleEventDelete"
    />
  </div>
</template>
