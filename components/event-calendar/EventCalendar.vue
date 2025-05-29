<script setup lang="ts">
import { ref, computed, watch } from "vue"
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
import type { CalendarEvent, ViewMode, MonthViewDay, DayColumnData } from "./types" // Adjust path
import MonthView from "./MonthView.vue"
import WeekView from "./WeekView.vue"
import DayView from "./DayView.vue"
import AgendaView from "./AgendaView.vue"
import EventModal from "./EventModal.vue"
import { Button } from "@/components/ui/button"
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
const localEvents = ref<CalendarEvent[]>([])

watch(
  () => props.events,
  newEvents => {
    localEvents.value = newEvents.map(e => ({
      ...e,
      start: new Date(e.startDate),
      end: new Date(e.endDate),
    }))
  },
  { deep: true, immediate: true }
)

// --- State for EventModal ---
const isEventModalOpen = ref(false)
const popupMode = ref<"add" | "edit">("add")
const eventForPopup = ref<CalendarEvent | null>(null)
const popupTargetDate = ref<Date | null>(null)
const popupIsAllDayFromCell = ref<boolean>(false)

// Add keyboard shortcuts for view switching
onKeyStroke(
  (e: KeyboardEvent) => {
    // Skip if user is typing in an input, textarea or contentEditable element
    // or if the event dialog is open
    if (
      isEventModalOpen.value ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return
    }

    switch (e.key.toLowerCase()) {
      case "m":
        currentView.value = "month"
        break
      case "w":
        currentView.value = "week"
        break
      case "d":
        currentView.value = "day"
        break
      case "a":
        currentView.value = "agenda"
        break
    }
  },
  { eventName: "keydown" }
)

const navigate = (direction: "prev" | "next" | "today") => {
  if (direction === "today") {
    currentDate.value = new Date()
    return
  }
  const S = direction === "prev" ? -1 : 1
  if (currentView.value === "month") currentDate.value = addMonths(currentDate.value, S)
  else if (currentView.value === "week") currentDate.value = addWeeks(currentDate.value, S)
  else if (currentView.value === "day") currentDate.value = addDays(currentDate.value, S)
}

const calendarTitle = computed(() => {
  if (currentView.value === "month") return format(currentDate.value, "MMMM yyyy")
  if (currentView.value === "week") {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 1 }) // Assuming week starts on Monday
    const end = endOfWeek(currentDate.value, { weekStartsOn: 1 })
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
  }
  if (currentView.value === "day") return format(currentDate.value, "MMMM d, yyyy")
  return "Agenda" // Agenda view might not have a dynamic title like this
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

const handleModalSubmit = (eventPayload: CalendarEvent, mode: "add" | "edit") => {
  if (mode === "add") {
    emit("eventAdd", { ...eventPayload, id: uuidv4() })
  } else {
    // id should be present in eventPayload if mode is 'edit' due to form pre-fill
    emit("eventUpdate", eventPayload)
  }
  isEventModalOpen.value = false // Close popup on submit
}

const handleModalDelete = (eventId: string) => {
  emit("eventDelete", eventId)
  isEventModalOpen.value = false // Close popup on delete
}

// Data preparation for views
const monthViewDaysComputed = computed<MonthViewDay[]>(() => {
  const startMonth = startOfMonth(currentDate.value)
  const endMonth = endOfMonth(currentDate.value)
  const startCalendar = startOfWeek(startMonth, { weekStartsOn: 1 })
  const endCalendar = endOfWeek(endMonth, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: startCalendar, end: endCalendar }).map(day => ({
    date: day,
    isCurrentMonth: day.getMonth() === currentDate.value.getMonth(),
    isToday: isSameDay(day, new Date()),
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

  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
    const dayStart = startOfDay(day)
    const dayPlusOne = addDays(dayStart, 1)
    return {
      date: day,
      dateKey: format(day, "yyyy-MM-dd"),
      dayLabel: format(day, "E dd"),
      isToday: isSameDay(day, new Date()),
      allDayEvents: localEvents.value.filter(
        event =>
          event.allDay &&
          isWithinInterval(day, {
            start: startOfDay(new Date(event.startDate)),
            end: endOfDay(new Date(event.endDate)),
          })
      ),
      // timeSlots: generateTimeSlots(day), // generateTimeSlots is in composable, can be called by WeekView
      timedEventsRaw: localEvents.value.filter(
        event =>
          !event.allDay &&
          (isWithinInterval(new Date(event.startDate), { start: dayStart, end: dayPlusOne }) ||
            isWithinInterval(new Date(event.endDate), { start: dayStart, end: dayPlusOne }) ||
            (new Date(event.startDate) < dayStart && new Date(event.endDate) > dayPlusOne))
      ),
    } as DayColumnData // Added 'as DayColumnData'
  })
})

const dayViewDataComputed = computed<DayColumnData>(() => {
  const day = currentDate.value
  const dayStart = startOfDay(day)
  const dayPlusOne = addDays(dayStart, 1)
  return {
    date: day,
    dateKey: format(day, "yyyy-MM-dd"),
    isToday: isSameDay(day, new Date()),
    allDayEvents: localEvents.value.filter(
      event =>
        event.allDay &&
        isWithinInterval(day, { start: startOfDay(new Date(event.startDate)), end: endOfDay(new Date(event.endDate)) })
    ),
    // timeSlots: generateTimeSlots(day), // generateTimeSlots is in composable, can be called by DayView
    timedEventsRaw: localEvents.value.filter(
      event =>
        !event.allDay &&
        (isWithinInterval(new Date(event.startDate), { start: dayStart, end: dayPlusOne }) ||
          isWithinInterval(new Date(event.endDate), { start: dayStart, end: dayPlusOne }) ||
          (new Date(event.startDate) < dayStart && new Date(event.endDate) > dayPlusOne))
    ),
  } as DayColumnData // Added 'as DayColumnData'
})

const agendaEventsComputed = computed<CalendarEvent[]>(() => {
  return [...localEvents.value]
    .filter(event => new Date(event.startDate) >= startOfDay(currentDate.value))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
})

const handleEventUpdateFromView = (updatedEvent: CalendarEvent) => {
  emit("eventUpdate", updatedEvent)
}
</script>

<template>
  <div class="p-4 flex flex-col h-full bg-background text-foreground">
    <header class="flex items-center justify-between mb-4">
      <!-- Header content (same as before) -->
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="navigate('prev')">&lt;</Button>
        <Button variant="outline" @click="navigate('today')">Today</Button>
        <Button variant="outline" @click="navigate('next')">&gt;</Button>
        <h2 class="text-xl font-semibold ml-4">{{ calendarTitle }}</h2>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="default" @click="openAddModalHandler()">Add Event</Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-1.5 max-[479px]:h-8">
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
  </div>
</template>
