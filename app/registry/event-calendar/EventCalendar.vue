<script setup lang="ts">
import { ref, computed, watch, shallowRef } from "vue"
import { useKeyboardNavigation } from "./composables/useKeyboardNavigation"
import {
  format,
  addMonths,
  addWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns"
import { useCompatibility } from "./composables/useCompatibility"
import type { CalendarEvent, ViewMode, MonthViewDay, DayColumnData } from "./types"
import { useEventFiltering } from "./composables/useEventFiltering"
import { useResilientErrorHandling } from "./composables/useResilientErrorHandling"
import { useColorManager } from "./composables/useColorManager"
import { useTimezone } from "./composables/useTimezone"
import { useRecurringEvents } from "./composables/useRecurringEvents"
import { useSecurity } from "./composables/useSecurity"
import { useMonitoring } from "./composables/useMonitoring"
import { useAdvancedValidation } from "./composables/useAdvancedValidation"
import MonthView from "./MonthView.vue"
import WeekView from "./WeekView.vue"
import DayView from "./DayView.vue"
import AgendaView from "./AgendaView.vue"
import EventModal from "./EventModal.vue"
import { useSwipe } from "@vueuse/core"
import { Button } from "@/components/ui/button"
import { PIXELS_PER_HOUR_CONFIG } from "./composables/useCalendarUtils"
import { ChevronLeft, ChevronRight, Plus } from "lucide-vue-next"

const props = defineProps<{
  events: CalendarEvent[]
  /** Starting view when `v-model:view` is not used. */
  initialView?: ViewMode
  /** Show a loading state over the grid (e.g. while the host fetches events). */
  loading?: boolean
  // Optional feature toggles. Kept as a prop so the calendar has no framework
  // coupling; a Nuxt host can pass useFeatureFlags() here.
  features?: {
    recurringEvents?: boolean
  }
}>()

const emit = defineEmits<{
  (e: "eventAdd" | "eventUpdate", event: CalendarEvent): void
  (e: "eventDelete", eventId: string): void
}>()

// Both are optional v-models, so a host can deep-link or persist them.
const currentView = defineModel<ViewMode>("view", {
  default: (raw: { initialView?: ViewMode }) => raw.initialView || "month",
})
const currentDate = defineModel<Date>("date", { default: () => new Date() })

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; shortcut: string }> = [
  { value: "month", label: "Month", shortcut: "M" },
  { value: "week", label: "Week", shortcut: "W" },
  { value: "day", label: "Day", shortcut: "D" },
  { value: "agenda", label: "Agenda", shortcut: "A" },
]
const localEvents = shallowRef<CalendarEvent[]>([])

// Initialize enhanced composables
const { handleError, withErrorHandling, performHealthCheck } = useResilientErrorHandling()
const { performSecurityCheck, sanitizeEvent, initializeSecurity } = useSecurity()
const { ensureUUID } = useCompatibility()
const { trackCalendarPerformance, measureOperation } = useMonitoring()
const { validateEvent, sanitizeEvent: sanitizeEventData } = useAdvancedValidation()
const { processEventsWithTimezone, convertEventToDisplayTimezone } = useTimezone()

// Initialize security and compatibility on component mount
initializeSecurity()

// Process events with timezone conversion for display
const rawEventsComputed = computed(() => localEvents.value)
const eventsWithTimezone = processEventsWithTimezone(rawEventsComputed)

// Initialize recurring events processing
const { expandRecurringEventsInRange } = useRecurringEvents(eventsWithTimezone)

// Expand recurring events based on current view
const eventsComputed = computed(() => {
  const viewStartDate = computed(() => {
    if (currentView.value === "month") {
      return startOfWeek(startOfMonth(currentDate.value), { weekStartsOn: 1 })
    } else if (currentView.value === "week") {
      return startOfWeek(currentDate.value, { weekStartsOn: 1 })
    } else if (currentView.value === "day") {
      return startOfDay(currentDate.value)
    } else {
      // agenda view - show 3 months
      return startOfMonth(currentDate.value)
    }
  })
  
  const viewEndDate = computed(() => {
    if (currentView.value === "month") {
      return endOfWeek(endOfMonth(currentDate.value), { weekStartsOn: 1 })
    } else if (currentView.value === "week") {
      return endOfWeek(currentDate.value, { weekStartsOn: 1 })
    } else if (currentView.value === "day") {
      return endOfDay(currentDate.value)
    } else {
      // agenda view - show 3 months
      return endOfMonth(addMonths(currentDate.value, 2))
    }
  })
  
  return expandRecurringEventsInRange(viewStartDate.value, viewEndDate.value).value
})
const { getEventsForDay, getAllDayEventsForDay, getTimedEventsForDay, getAgendaEvents, isToday } = useEventFiltering(eventsComputed)

// Initialize color manager
const { 
  assignUniqueColor, 
  assignColorsToEvents, 
  getColorClasses, 
  hasColorConflict,
  getColorStats 
} = useColorManager(eventsComputed)

// Drag, drop and resize are handled inside the views (TimeGrid and MonthView)
// with pointer events; they emit `eventUpdate` once per completed gesture.

watch(
  () => props.events,
  newEvents => {
    localEvents.value = [...newEvents]
  },
  { deep: true, immediate: true }
)

// --- State for EventModal ---
const isEventModalOpen = ref(false)
const popupMode = ref<"add" | "edit">("add")
const eventForPopup = ref<CalendarEvent | null>(null)
const popupTargetDate = ref<Date | null>(null)
const popupIsAllDayFromCell = ref<boolean>(false)

const navigate = (direction: "prev" | "next" | "today") => {
  if (direction === "today") {
    currentDate.value = new Date()
    return
  }
  const S = direction === "prev" ? -1 : 1
  if (currentView.value === "month") currentDate.value = addMonths(currentDate.value, S)
  else if (currentView.value === "week") currentDate.value = addWeeks(currentDate.value, S)
  else if (currentView.value === "day") currentDate.value = addDays(currentDate.value, S)
  else if (currentView.value === "agenda") currentDate.value = addMonths(currentDate.value, S)
}

const calendarTitle = computed(() => {
  if (currentView.value === "month") return format(currentDate.value, "MMMM yyyy")
  if (currentView.value === "week") {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 1 }) // Assuming week starts on Monday
    const end = endOfWeek(currentDate.value, { weekStartsOn: 1 })
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
  }
  if (currentView.value === "day") return format(currentDate.value, "MMMM d, yyyy")
  if (currentView.value === "agenda") return format(currentDate.value, "MMMM yyyy")
  return "Calendar"
})

const openAddModalHandler = (date?: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date) => {
  popupMode.value = "add"
  eventForPopup.value = null
  popupTargetDate.value = allDayTargetDate || date || new Date()
  popupIsAllDayFromCell.value = !!isAllDaySlot
  isEventModalOpen.value = true
}

const openEditModalHandler = (event: CalendarEvent) => {
  popupMode.value = "edit"
  // Convert event to display timezone for editing
  eventForPopup.value = convertEventToDisplayTimezone({ ...event })
  popupTargetDate.value = null // Not needed for edit
  popupIsAllDayFromCell.value = event.allDay || false
  isEventModalOpen.value = true
}

const handleModalSubmit = async (eventPayload: CalendarEvent, mode: "add" | "edit") => {
  await measureOperation(`event_${mode}`, async () => {
    // Security check first
    const securityResult = performSecurityCheck(eventPayload)
    if (!securityResult.isSecure) {
      await handleError(new Error('Security validation failed'), {
        component: 'EventCalendar',
        operation: `event_${mode}`
      })
      return
    }

    // Use sanitized event data. performSecurityCheck cleans string fields on a
    // copy of the payload without dropping required ones, so the sanitized result
    // is still a complete CalendarEvent.
    const sanitizedEvent = { ...eventPayload, ...securityResult.sanitizedEvent } as CalendarEvent

    // Advanced validation
    const validationResult = validateEvent(sanitizedEvent)
    if (!validationResult.isValid) {
      await handleError(new Error(validationResult.errors.map(e => e.message).join(', ')), {
        component: 'EventCalendar',
        operation: `event_${mode}_validation`
      })
      return
    }

    await withErrorHandling(async () => {
      if (mode === "add") {
        // Assign a unique color if not already set. The id here is provisional —
        // the API assigns the authoritative id and the parent reconciles on the
        // returned event.
        const eventWithColor = {
          ...sanitizedEvent,
          id: ensureUUID(),
          color: sanitizedEvent.color || assignUniqueColor(sanitizedEvent)
        }
        emit("eventAdd", eventWithColor as CalendarEvent)
      } else {
        // For edit mode, keep existing color or assign new one if needed.
        const eventWithColor = {
          ...sanitizedEvent,
          color: sanitizedEvent.color || assignUniqueColor(sanitizedEvent)
        }
        emit("eventUpdate", eventWithColor as CalendarEvent)
      }

      isEventModalOpen.value = false // Close popup on submit
    }, {
      component: 'EventCalendar',
      operation: `event_${mode}`
    })
  })
}

const handleModalDelete = async (eventId: string) => {
  await measureOperation('event_delete', async () => {
    await withErrorHandling(async () => {
      emit("eventDelete", eventId)
      isEventModalOpen.value = false // Close popup on delete
    }, {
      component: 'EventCalendar',
      operation: 'event_delete'
    })
  })
}

// Data preparation for views
// Memoize today's date to avoid repeated Date() calls
const today = computed(() => new Date())

const monthViewDaysComputed = computed<MonthViewDay[]>(() => {
  const startMonth = startOfMonth(currentDate.value)
  const endMonth = endOfMonth(currentDate.value)
  const startCalendar = startOfWeek(startMonth, { weekStartsOn: 1 })
  const endCalendar = endOfWeek(endMonth, { weekStartsOn: 1 })
  const currentMonth = currentDate.value.getMonth()
  const todayValue = today.value

  return eachDayOfInterval({ start: startCalendar, end: endCalendar }).map(day => ({
    date: day,
    isCurrentMonth: day.getMonth() === currentMonth,
    isToday: isSameDay(day, todayValue),
    events: eventsComputed.value.filter(event => {
      const eventStartDay = startOfDay(new Date(event.startDate))
      // For month view, an event ending at midnight on day X is still considered to be on day X-1
      const eventEndDay = new Date(event.endDate)
      const effectiveEnd =
        eventEndDay.getHours() === 0 && eventEndDay.getMinutes() === 0 ? subDays(eventEndDay, 1) : eventEndDay

      return isWithinInterval(day, { start: eventStartDay, end: startOfDay(effectiveEnd) })
    }),
  }))
})

const weekViewDaysComputed = computed<DayColumnData[]>(() => {
  const weekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate.value, { weekStartsOn: 1 })
  const todayValue = today.value

  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
    return {
      date: day,
      dateKey: format(day, "yyyy-MM-dd"),
      dayLabel: format(day, "E dd"),
      isToday: isSameDay(day, todayValue),
      allDayEvents: getAllDayEventsForDay(day).value,
      timedEventsRaw: getTimedEventsForDay(day).value,
    } as DayColumnData
  })
})

const dayViewDataComputed = computed<DayColumnData>(() => {
  const day = currentDate.value
  const todayValue = today.value
  return {
    date: day,
    dateKey: format(day, "yyyy-MM-dd"),
    isToday: isSameDay(day, todayValue),
    allDayEvents: getAllDayEventsForDay(day).value,
    timedEventsRaw: getTimedEventsForDay(day).value,
  } as DayColumnData
})

const agendaEventsComputed = computed<CalendarEvent[]>(() => {
  return getAgendaEvents(currentDate.value).value
})

const handleEventUpdateFromView = (updatedEvent: CalendarEvent) => {
  emit("eventUpdate", updatedEvent)
}

// Initialize enhanced keyboard navigation
useKeyboardNavigation(
  currentView,
  currentDate,
  isEventModalOpen,
  navigate,
  () => openAddModalHandler()
)

// Touch: swipe left/right to move between periods. The week view scrolls
// sideways on phones, so it keeps its own horizontal gesture.
const gridEl = ref<HTMLElement | null>(null)
// Gestures that start on an event are drags/resizes, never period swipes.
let swipeFromEvent = false
const onGridPointerDown = (e: PointerEvent) => {
  swipeFromEvent = !!(e.target as HTMLElement | null)?.closest("[data-event-id], [data-resize]")
}
const { direction: swipeDirection } = useSwipe(gridEl, {
  threshold: 60,
  passive: true,
  onSwipeEnd: () => {
    if (currentView.value === "week" || isEventModalOpen.value) return
    if (swipeFromEvent) return
    if (swipeDirection.value === "left") navigate("next")
    else if (swipeDirection.value === "right") navigate("prev")
  },
})

// Exposed for hosts (e.g. an "add event" deep link) and for the test suite,
// which drives event CRUD and view switching through these.
defineExpose({
  currentView,
  currentDate,
  localEvents,
  handleModalSubmit,
  handleModalDelete,
  openAddModal: (date?: Date) => openAddModalHandler(date),
})
</script>

<template>
  <section
    class="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
    aria-label="Calendar"
  >
    <header class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-3 sm:px-4">
      <!-- Title + period navigation -->
      <div class="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <nav class="flex shrink-0 items-center gap-1" aria-label="Calendar navigation">
          <Button variant="outline" size="icon-sm" :aria-label="`Previous ${currentView}`" @click="navigate('prev')">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" @click="navigate('today')">Today</Button>
          <Button variant="outline" size="icon-sm" :aria-label="`Next ${currentView}`" @click="navigate('next')">
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
        <h1
          class="m-0 min-w-0 truncate pl-1 font-display text-base leading-tight font-bold tracking-tight sm:text-xl"
          aria-live="polite"
        >
          {{ calendarTitle }}
        </h1>
      </div>

      <!-- View switch + actions -->
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <div role="radiogroup" aria-label="Calendar view" class="flex flex-1 rounded-lg border bg-muted p-0.5 sm:flex-none">
          <button
            v-for="option in VIEW_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="currentView === option.value"
            :aria-keyshortcuts="option.shortcut"
            :title="`${option.label} (${option.shortcut})`"
            :data-view="option.value"
            class="min-h-8 flex-1 rounded-md px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm sm:flex-none sm:text-sm"
            @click="currentView = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <Button size="sm" data-testid="add-event" class="shrink-0" @click="openAddModalHandler()">
          <Plus aria-hidden="true" />
          <span class="max-sm:sr-only">Add event</span>
        </Button>
        <!-- Host-provided actions (e.g. a theme switch). The calendar has no
             theming or framework coupling of its own. -->
        <slot name="header-actions" />
      </div>
    </header>

    <div
      ref="gridEl"
      class="relative flex min-h-0 flex-1 flex-col"
      :aria-busy="loading || undefined"
      @pointerdown.capture="onGridPointerDown"
    >
      <div
        v-if="loading"
        class="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/15"
        role="status"
        aria-label="Loading events"
      >
        <div class="h-full w-1/3 animate-[calendar-loading_1.1s_ease-in-out_infinite] bg-primary" />
      </div>

      <MonthView
        v-if="currentView === 'month'"
        :days="monthViewDaysComputed"
        :pixels-per-hour="PIXELS_PER_HOUR_CONFIG"
        @open-add-modal="openAddModalHandler"
        @open-edit-modal="openEditModalHandler"
        @event-update="handleEventUpdateFromView"
        @open-day="date => { currentDate = date; currentView = 'day' }"
      />
      <WeekView
        v-else-if="currentView === 'week'"
        :week-days-data="weekViewDaysComputed"
        :pixels-per-hour="PIXELS_PER_HOUR_CONFIG"
        @open-add-modal="openAddModalHandler"
        @open-edit-modal="openEditModalHandler"
        @event-update="handleEventUpdateFromView"
      />
      <DayView
        v-else-if="currentView === 'day'"
        :day-data="dayViewDataComputed"
        :pixels-per-hour="PIXELS_PER_HOUR_CONFIG"
        @open-add-modal="openAddModalHandler"
        @open-edit-modal="openEditModalHandler"
        @event-update="handleEventUpdateFromView"
      />
      <AgendaView
        v-else
        :events="agendaEventsComputed"
        :current-date="currentDate"
        @open-edit-modal="openEditModalHandler"
      />
    </div>

    <!-- Event Add/Edit Modal (Dialog) -->
    <EventModal
      v-model:is-open="isEventModalOpen"
      :mode="popupMode"
      :event-data="eventForPopup"
      :target-date="popupTargetDate"
      :is-all-day-from-cell="popupIsAllDayFromCell"
      :recurring-enabled="props.features?.recurringEvents ?? false"
      @submit-event="handleModalSubmit"
      @delete-event="handleModalDelete"
    />

  </section>
</template>

<style>
@keyframes calendar-loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}
@media (prefers-reduced-motion: reduce) {
  [aria-label="Loading events"] > div {
    animation: none;
  }
}
</style>
