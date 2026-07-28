<script setup lang="ts">
import { onMounted } from "vue"
import { toast } from "vue-sonner"
import type { CalendarEvent } from "@/registry/event-calendar/types"
import { useCalendarData } from "~/composables/useCalendarData"
import { useCalendarRealtime } from "~/composables/useCalendarRealtime"
import EventCalendar from "~/registry/event-calendar/EventCalendar.vue"

// Calendar data is owned by useCalendarData, which persists to /api/events.
// EventCalendar stays a controlled component: events flow in via the prop and
// mutations come back as emits handled below.
const { events, isLoading, loadError, load, createEvent, updateEvent, deleteEvent, applyRemote, isOwnEcho } =
  useCalendarData()

// Auth: the calendar is per-user, so gate it behind a session.
const { loggedIn, user, clear: clearSession } = useUserSession()

// Feature flags (runtime).
const { collaboration: collaborationEnabled, recurringEvents: recurringEnabled } = useFeatureFlags()

// Real-time collaboration is feature-flagged; reconnect resyncs by reloading.
const realtime = useCalendarRealtime(applyRemote, isOwnEcho, () => {
  load().catch(() => {})
})

const onAuthenticated = async () => {
  try {
    await load()
    if (collaborationEnabled) realtime.start()
  } catch {
    toast.error("Could not load your events", { description: "Please try again." })
  }
}

const signOut = async () => {
  realtime.stop()
  await $fetch("/api/auth/logout", { method: "POST" })
  await clearSession()
  events.value = []
  toast.success("Signed out")
}

const handleEventAdd = async (newEvent: CalendarEvent) => {
  try {
    await createEvent(newEvent)
    toast.success(`Event "${newEvent.title}" created`, {
      description: newEvent.location ? `Location: ${newEvent.location}` : undefined,
    })
  } catch (error) {
    toast.error("Error creating event", {
      description: error instanceof Error ? error.message : "Failed to create event",
    })
  }
}

const handleEventUpdate = async (updatedEvent: CalendarEvent) => {
  try {
    await updateEvent(updatedEvent)
    toast.success(`Event "${updatedEvent.title}" updated`, { description: "Changes have been saved" })
  } catch (error) {
    toast.error("Error updating event", {
      description: error instanceof Error ? error.message : "Failed to update event",
    })
  }
}

const handleEventDelete = async (eventId: string) => {
  const deleted = events.value.find(e => e.id === eventId)
  try {
    await deleteEvent(eventId)
    toast.success(deleted ? `Event "${deleted.title}" deleted` : "Event deleted", {
      description: "Event has been permanently removed",
    })
  } catch (error) {
    toast.error("Error deleting event", {
      description: error instanceof Error ? error.message : "Failed to delete event",
    })
  }
}

// Load events on mount only when already authenticated (a returning session).
onMounted(async () => {
  if (loggedIn.value) {
    try {
      await load()
      if (collaborationEnabled) realtime.start()
    } catch {
      toast.error("Could not load your events", { description: "Please try again." })
    }
  }
})
</script>

<template>
  <div>
    <!-- Logged out: show the auth panel. -->
    <AuthPanel v-if="!loggedIn" @authenticated="onAuthenticated" />

    <!-- Logged in: the calendar. -->
    <template v-else>
      <div class="mx-auto flex max-w-full items-center justify-end gap-3 px-4 pt-4 md:px-6 lg:px-8">
        <NuxtLink
          to="/docs"
          class="mr-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="lucide:book-open" size="14" />
          Docs
        </NuxtLink>
        <span class="text-sm text-muted-foreground">{{ user?.name || user?.email }}</span>
        <button
          class="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
          @click="signOut"
        >
          <Icon name="lucide:log-out" size="14" />
          Sign out
        </button>
      </div>

      <div class="mx-auto p-4 md:p-6 lg:p-8">
        <!-- Loading state on first load -->
        <div
          v-if="isLoading && events.length === 0"
          class="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Icon name="lucide:loader-circle" size="28" class="animate-spin" />
          <p class="text-sm">Loading your events…</p>
        </div>

        <!-- Load error state -->
        <div
          v-else-if="loadError && events.length === 0"
          class="flex flex-col items-center justify-center gap-3 py-24 text-center"
        >
          <Icon name="lucide:triangle-alert" size="28" class="text-destructive" />
          <p class="text-sm text-muted-foreground">We couldn't load your events.</p>
          <button class="text-sm font-medium text-primary underline-offset-4 hover:underline" @click="load">
            Try again
          </button>
        </div>

        <!-- Calendar (also renders its own empty state when there are no events) -->
        <EventCalendar
          v-else
          :events="events"
          :features="{ recurringEvents: recurringEnabled }"
          @event-add="handleEventAdd"
          @event-update="handleEventUpdate"
          @event-delete="handleEventDelete"
        >
          <template #header-actions>
            <DarkModeToggle />
          </template>
        </EventCalendar>
      </div>
    </template>
  </div>
</template>
