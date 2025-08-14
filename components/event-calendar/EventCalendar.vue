<script setup lang="ts">
import { ref, computed, watch, shallowRef } from "vue"
import { useKeyboardNavigation } from "./composables/useKeyboardNavigation"
import { useDragAndDropSystem } from "./composables/useDragAndDrop"
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
import { v4 as uuidv4 } from "uuid"
import type { CalendarEvent, ViewMode, MonthViewDay, DayColumnData } from "./types"
import { useEventFiltering } from "./composables/useEventFiltering"
import { useErrorHandling } from "./composables/useErrorHandling"
import { useColorManager } from "./composables/useColorManager"
import MonthView from "./MonthView.vue"
import WeekView from "./WeekView.vue"
import DayView from "./DayView.vue"
import AgendaView from "./AgendaView.vue"
import EventModal from "./EventModal.vue"
import DragDropVisualFeedback from "./DragDropVisualFeedback.vue"
import { Button } from "@/components/ui/button"
import DarkModeToggle from "@/components/ui/DarkModeToggle.vue"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { PIXELS_PER_HOUR_CONFIG } from "./composables/useCalendarUtils" // Adjust path

const props = defineProps<{
  events: CalendarEvent[]
  initialView?: ViewMode
}>()

const emit = defineEmits<{
  (e: "eventAdd" | "eventUpdate", event: CalendarEvent): void
  (e: "eventDelete", eventId: string): void
}>()

const currentView = ref<ViewMode>(props.initialView || "month")
const currentDate = ref(new Date())
const localEvents = shallowRef<CalendarEvent[]>([])

// Initialize composables
const { handleError, validateEvent, withErrorHandling } = useErrorHandling()
const eventsComputed = computed(() => localEvents.value)
const { getEventsForDay, getAllDayEventsForDay, getTimedEventsForDay, getAgendaEvents, isToday } = useEventFiltering(eventsComputed)

// Initialize color manager
const { 
  assignUniqueColor, 
  assignColorsToEvents, 
  getColorClasses, 
  hasColorConflict,
  getColorStats 
} = useColorManager(eventsComputed)

// Initialize enhanced drag and drop system
const { 
  globalDragState, 
  formatEventDuration, 
  calculateEventHeight 
} = useDragAndDropSystem({
  enabled: true,
  crossViewEnabled: true,
  visualFeedback: true,
  showDuration: true,
  enableResize: true
})

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
  eventForPopup.value = { ...event } // Pass a copy
  popupTargetDate.value = null // Not needed for edit
  popupIsAllDayFromCell.value = event.allDay || false
  isEventModalOpen.value = true
}

const handleModalSubmit = async (eventPayload: CalendarEvent, mode: "add" | "edit") => {
  // Validate event data before processing
  const validationErrors = validateEvent(eventPayload)
  if (validationErrors.length > 0) {
    handleError(validationErrors.join(', '))
    return
  }

  await withErrorHandling(async () => {
    if (mode === "add") {
      // Assign unique color if not already set
      const eventWithColor = {
        ...eventPayload,
        id: uuidv4(),
        color: eventPayload.color || assignUniqueColor(eventPayload)
      }
      emit("eventAdd", eventWithColor)
    } else {
      // For edit mode, keep existing color or assign new one if needed
      const eventWithColor = {
        ...eventPayload,
        color: eventPayload.color || assignUniqueColor(eventPayload)
      }
      emit("eventUpdate", eventWithColor)
    }
    isEventModalOpen.value = false // Close popup on submit
  }, `Failed to ${mode} event`)
}

const handleModalDelete = (eventId: string) => {
  emit("eventDelete", eventId)
  isEventModalOpen.value = false // Close popup on delete
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
    events: localEvents.value.filter(event => {
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

// Drag and drop system is automatically initialized when useDragAndDropSystem is called
</script>

<template>
  <div class="p-6 flex flex-col h-full bg-background text-foreground border border-border rounded-lg shadow-sm transition-colors duration-300">
    
    <header class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
      <!-- Navigation and title -->
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <nav class="flex items-center gap-1 sm:gap-2" role="navigation" aria-label="Calendar navigation">
          <Button 
            variant="outline" 
            size="sm" 
            class="h-9 w-9 p-0"
            :aria-label="`Go to previous ${currentView}`"
            @click="navigate('prev')"
          >
            <Icon name="lucide:chevron-left" size="16" aria-hidden="true" />
            <span class="sr-only">Previous</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            class="h-9 px-3"
            @click="navigate('today')"
            aria-label="Go to today"
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            class="h-9 w-9 p-0"
            :aria-label="`Go to next ${currentView}`"
            @click="navigate('next')"
          >
            <Icon name="lucide:chevron-right" size="16" aria-hidden="true" />
            <span class="sr-only">Next</span>
          </Button>
        </nav>
        <h1 class="text-lg sm:text-xl font-semibold ml-2 sm:ml-4 truncate" role="heading" aria-level="1">
          {{ calendarTitle }}
        </h1>
      </div>
      <!-- Actions -->
      <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <Button 
          variant="default" 
          size="sm" 
          class="h-9 px-3" 
          @click="openAddModalHandler()"
        >
          <Icon name="lucide:plus" size="16" class="mr-1" />
          <span class="hidden sm:inline">Add Event</span>
          <span class="sm:hidden">Add</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="h-9 gap-1.5 px-3">
              <span>
                <span className="min-[480px]:hidden" aria-hidden="true">
                  {{ currentView.charAt(0).toUpperCase() }}
                </span>
                <span className="max-[479px]:sr-only">
                  {{ currentView.charAt(0).toUpperCase() + currentView.slice(1) }}
                </span>
              </span>
              <Icon name="lucide:chevron-down" class="-me-1 opacity-60" size="16" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="min-w-32">
            <DropdownMenuItem @click="() => (currentView = 'month')">
              Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="() => (currentView = 'week')">
              Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="() => (currentView = 'day')">
              Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="() => (currentView = 'agenda')">
              Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DarkModeToggle />
      </div>
    </header>

    <main class="flex-grow overflow-auto">
      <MonthView
        v-if="currentView === 'month'"
        :days="monthViewDaysComputed"
        :pixels-per-hour="PIXELS_PER_HOUR_CONFIG"
        @open-add-modal="openAddModalHandler"
        @open-edit-modal="openEditModalHandler"
        @event-update="handleEventUpdateFromView"
      />
      <WeekView
        v-if="currentView === 'week'"
        :week-days-data="weekViewDaysComputed"
        :pixels-per-hour="PIXELS_PER_HOUR_CONFIG"
        @open-add-modal="openAddModalHandler"
        @open-edit-modal="openEditModalHandler"
        @event-update="handleEventUpdateFromView"
      />
      <DayView
        v-if="currentView === 'day'"
        :day-data="dayViewDataComputed"
        :pixels-per-hour="PIXELS_PER_HOUR_CONFIG"
        @open-add-modal="openAddModalHandler"
        @open-edit-modal="openEditModalHandler"
        @event-update="handleEventUpdateFromView"
      />
      <AgendaView
        v-if="currentView === 'agenda'"
        :events="agendaEventsComputed"
        :current-date="currentDate"
        @open-edit-modal="openEditModalHandler"
      />
    </main>

    <!-- Event Add/Edit Modal (Dialog) -->
    <EventModal
      v-model:is-open="isEventModalOpen"
      :mode="popupMode"
      :event-data="eventForPopup"
      :target-date="popupTargetDate"
      :is-all-day-from-cell="popupIsAllDayFromCell"
      @submit-event="handleModalSubmit"
      @delete-event="handleModalDelete"
    />

    <!-- Drag and Drop Visual Feedback -->
    <DragDropVisualFeedback
      :is-dragging="globalDragState.isDragging"
      :dragged-event="globalDragState.draggedEvent"
      :valid-drop-zones="globalDragState.validDropZones.map(zone => zone.id)"
      :current-drop-zone="globalDragState.currentDropZone?.id"
      :drag-position="globalDragState.dragPreview ? { x: globalDragState.dragPreview.x, y: globalDragState.dragPreview.y } : { x: 0, y: 0 }"
    />
  </div>
</template>
