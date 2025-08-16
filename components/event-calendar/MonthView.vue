<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { format, startOfDay, subDays, isSameDay } from "date-fns"
import type { CalendarEvent, MonthViewDay } from "./types"
import DayEventsOverflowPopup from "./DayEventsOverflowPopup.vue"
import LocationDisplay from "./LocationDisplay.vue"
import { useColorManager } from "./composables/useColorManager"
import { useDragAndDropSystem } from "./composables/useDragAndDrop"
import { useEventStatus } from "./composables/useEventStatus"
import { useMultiDayLayout, type LayoutEvent } from "./composables/useMultiDayLayout"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"

const props = defineProps<{
  days: MonthViewDay[]
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()

// --- Overflow Popup State ---
const MAX_VISIBLE_EVENTS_IN_MONTH_CELL = 2 // Configurable
const overflowPopupOpenForDateKey = ref<string | null>(null)
const overflowPopupTargetRef = ref<HTMLElement | null>(null)

// Initialize enhanced drag and drop system
const { createDragConfig, formatEventDuration, createDroppableZone, createDraggableEvent } = useDragAndDropSystem()

interface MonthDndInstance {
  dayZone: ReturnType<typeof createDroppableZone>
  dayConfig: ReturnType<typeof createDragConfig>
}
const dndDayCellInstances = ref<Record<string, MonthDndInstance>>({})

const getDndConfigForDayCell = (dayDate: Date) =>
  createDragConfig(
    `month-${format(dayDate, "yyyy-MM-dd")}`,
    "day-cell",
    format(dayDate, "yyyy-MM-dd"),
    (updatedEvent: CalendarEvent) => emit("eventUpdate", updatedEvent),
    60 // pixelsPerHour not really used in month view, but required for interface
  )

watch(
  () => props.days,
  newDays => {
    if (!newDays || newDays.length === 0) {
      dndDayCellInstances.value = {}
      return
    }

    const newInstances: Record<string, MonthDndInstance> = {}
    newDays.forEach(day => {
      const key = format(day.date, "yyyy-MM-dd")

      try {
        // Create drag config for this day
        const dayConfig = getDndConfigForDayCell(day.date)

        // Create droppable zone
        const dayZone = createDroppableZone(dayConfig)

        newInstances[key] = {
          dayZone,
          dayConfig,
        }
      } catch (error) {
        console.error(`Error setting up drag and drop for day ${key}:`, error)
      }
    })
    dndDayCellInstances.value = newInstances
  },
  { deep: true }
)

onMounted(() => {
  // Initialize drag and drop on client side only
  if (!props.days || props.days.length === 0) {
    return
  }

  const newInstances: Record<string, MonthDndInstance> = {}
  props.days.forEach(day => {
    const key = format(day.date, "yyyy-MM-dd")

    try {
      // Create drag config for this day
      const dayConfig = getDndConfigForDayCell(day.date)

      // Create droppable zone
      const dayZone = createDroppableZone(dayConfig)

      newInstances[key] = {
        dayZone,
        dayConfig,
      }
    } catch (error) {
      console.error(`Error setting up drag and drop for day ${key}:`, error)
    }
  })
  dndDayCellInstances.value = newInstances
})

// Note: Now using direct props data instead of drag-and-drop managed events for better reliability

// Drag handlers for events
const handleEventDragStart = (event: CalendarEvent, dragEvent: DragEvent) => {
  if (!dragEvent.dataTransfer) return

  dragEvent.dataTransfer.setData("application/json", JSON.stringify(event))
  dragEvent.dataTransfer.effectAllowed = "move"

  document.body.classList.add("dragging-event")
}

const handleEventDragEnd = (event: CalendarEvent, dragEvent: DragEvent) => {
  document.body.classList.remove("dragging-event")
}

// Drop zone handlers
const handleDragEnter = (dragEvent: DragEvent, dayKey: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.add("drop-zone-active")
  }
}

const handleDragLeave = (dragEvent: DragEvent, dayKey: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove("drop-zone-active")
  }
}

const handleDrop = (dragEvent: DragEvent, dayKey: string, dayDate: Date) => {
  dragEvent.preventDefault()

  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove("drop-zone-active")
  }

  const draggedData = dragEvent.dataTransfer?.getData("application/json")
  if (!draggedData) return

  try {
    const droppedEvent: CalendarEvent = JSON.parse(draggedData)
    const config = getDndConfigForDayCell(dayDate)
    config.handleDrop(droppedEvent)
  } catch (error) {
    console.error("❌ Error handling drop:", error)
  }
}

const toggleOverflowPopup = (dayKey: string, event: MouseEvent) => {
  if (overflowPopupOpenForDateKey.value === dayKey) {
    overflowPopupOpenForDateKey.value = null
    overflowPopupTargetRef.value = null
  } else {
    overflowPopupOpenForDateKey.value = dayKey
    overflowPopupTargetRef.value = event.currentTarget as HTMLElement
  }
}

const handleOverflowEventEdit = (event: CalendarEvent) => {
  emit("openEditModal", event)
  overflowPopupOpenForDateKey.value = null // Close popup
}

// Initialize color manager for getting color classes
const eventsComputed = computed(() => {
  const allEvents: CalendarEvent[] = []
  props.days.forEach(day => {
    allEvents.push(...day.events)
  })
  return allEvents
})
const { getColorClasses } = useColorManager(eventsComputed)

// Initialize event status manager
const { getEventStatusClasses, getEventStatusIndicator, getEventStatusTooltip } = useEventStatus(eventsComputed)

// Initialize multi-day layout system
const daysComputed = computed(() => props.days)
const { processEventsWithLayout, getEventPosition } = useMultiDayLayout(daysComputed)

// Multi-day event helper functions
const isMultiDayEvent = (event: CalendarEvent): boolean => {
  const startDate = new Date(event.startDate)
  const endDate = new Date(event.endDate)
  const startDay = startOfDay(startDate)
  const endDay = startOfDay(endDate)

  // Check if the event spans more than one day
  return !isSameDay(startDay, endDay)
}

const isEventStart = (event: CalendarEvent, date: Date): boolean => {
  const eventStart = startOfDay(new Date(event.startDate))
  const currentDay = startOfDay(date)
  return isSameDay(eventStart, currentDay)
}

const isEventEnd = (event: CalendarEvent, date: Date): boolean => {
  const eventEnd = startOfDay(new Date(event.endDate))
  const currentDay = startOfDay(date)
  // For events ending at midnight, consider them ending on the previous day
  const effectiveEnd =
    new Date(event.endDate).getHours() === 0 && new Date(event.endDate).getMinutes() === 0
      ? subDays(eventEnd, 1)
      : eventEnd

  return isSameDay(effectiveEnd, currentDay)
}

const getMultiDayEventClasses = (event: CalendarEvent, date: Date): string => {
  if (!isMultiDayEvent(event)) {
    return "rounded"
  }

  const isStart = isEventStart(event, date)
  const isEnd = isEventEnd(event, date)

  if (isStart && isEnd) {
    return "rounded"
  } else if (isStart) {
    return "rounded-l rounded-r-none"
  } else if (isEnd) {
    return "rounded-r rounded-l-none"
  } else {
    return "rounded-none"
  }
}

// Cleanup on unmount
onUnmounted(() => {
  dndDayCellInstances.value = {}
  overflowPopupOpenForDateKey.value = null
  overflowPopupTargetRef.value = null
})
</script>

<template>
  <div class="border border-border rounded-lg overflow-hidden">
    <!-- Header Row -->
    <div class="grid grid-cols-7 bg-muted/50">
      <div
        v-for="dayHeader in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
        :key="dayHeader"
        class="p-2 text-center font-medium border-r border-border last:border-r-0 h-10 flex items-center justify-center text-sm"
      >
        {{ dayHeader }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7" style="grid-template-rows: repeat(6, minmax(140px, 1fr))">
      <div
        v-for="day in processEventsWithLayout"
        :key="day.date.toISOString()"
        :ref="dndDayCellInstances[format(day.date, 'yyyy-MM-dd')]?.dayZone.elementRef"
        :data-date-key="format(day.date, 'yyyy-MM-dd')"
        data-type="day-cell"
        @dragover.prevent
        @dragenter="handleDragEnter($event, format(day.date, 'yyyy-MM-dd'))"
        @dragleave="handleDragLeave($event, format(day.date, 'yyyy-MM-dd'))"
        @drop="handleDrop($event, format(day.date, 'yyyy-MM-dd'), day.date)"
        :class="[
          'p-2 border-r border-b border-border last-of-type:border-r-0 relative group flex flex-col',
          day.isCurrentMonth ? 'bg-background' : 'bg-muted/30',
          { 'bg-blue-50 dark:bg-blue-900/30': day.isToday },
        ]"
      >
        <!-- Day Number -->
        <div class="flex justify-between items-start mb-2 shrink-0">
          <span :class="['text-sm font-medium', { 'font-bold text-blue-600 dark:text-blue-400': day.isToday }]">{{
            format(day.date, "d")
          }}</span>

          <Button
            variant="ghost"
            size="sm"
            class="cursor-pointer opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-200 rounded-full shadow-sm hover:shadow-md dark:hover:text-primary"
            @click="emit('openAddModal', day.date, true, day.date)"
            :title="`Add event on ${format(day.date, 'MMM d')}`"
          >
            <Icon name="lucide:plus" size="14" class="font-bold stroke-2" />
          </Button>
        </div>

        <!-- Events Container -->
        <div class="flex-1 overflow-hidden min-h-0 relative">
          <!-- Events positioned by lane -->
          <div class="relative min-h-[44px]">
            <div
              v-for="(eventItem, index) in day.events.slice(0, MAX_VISIBLE_EVENTS_IN_MONTH_CELL)"
              :key="eventItem.id"
              :style="{
                position: 'absolute',
                top: `${(eventItem as LayoutEvent).layoutLane * 22}px`,
                left: '0',
                right: '0',
                height: '20px',
                zIndex: 10 + index,
              }"
              :class="[
                'px-1.5 py-0.5 text-xs cursor-move event-content border-2 transition-all duration-200 hover:shadow-md select-none flex items-center',
                getMultiDayEventClasses(eventItem, day.date),
                getEventStatusClasses(eventItem),
                eventItem.color
                  ? getColorClasses(eventItem.color)
                  : 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100',
              ]"
              draggable="true"
              :data-event-id="eventItem.id"
              :title="getEventStatusTooltip(eventItem)"
              @click="emit('openEditModal', eventItem)"
              @dragstart="handleEventDragStart(eventItem, $event)"
              @dragend="handleEventDragEnd(eventItem, $event)"
            >
              <div class="flex items-center gap-1 min-w-0 w-full">
                <!-- Status indicator -->
                <span
                  v-if="getEventStatusIndicator(eventItem) && isEventStart(eventItem, day.date)"
                  class="text-xs opacity-75 shrink-0"
                >
                  {{ getEventStatusIndicator(eventItem) }}
                </span>
                <span class="truncate flex-1 font-medium leading-tight text-xs">{{ eventItem.title }}</span>
                <LocationDisplay
                  v-if="eventItem.location && isEventStart(eventItem, day.date)"
                  :location="eventItem.location"
                  :compact="true"
                  :show-tooltip="true"
                  :icon-size="6"
                />
              </div>
            </div>
          </div>

          <!-- +More button positioned below the events -->
          <div
            v-if="day.events.length > MAX_VISIBLE_EVENTS_IN_MONTH_CELL"
            :style="{ paddingTop: `${Math.max(MAX_VISIBLE_EVENTS_IN_MONTH_CELL * 22 - 22, 0)}px` }"
            class="mt-1"
          >
            <Popover
              :open="overflowPopupOpenForDateKey === format(day.date, 'yyyy-MM-dd')"
              @update:open="
                isOpen => {
                  if (!isOpen) overflowPopupOpenForDateKey = null
                }
              "
            >
              <PopoverTrigger as-child>
                <Button
                  variant="ghost"
                  size="sm"
                  class="w-full text-xs h-auto py-1 px-1 justify-start text-muted-foreground hover:bg-muted/50 bg-background/80"
                  @click.stop="toggleOverflowPopup(format(day.date, 'yyyy-MM-dd'), $event)"
                >
                  + {{ day.events.length - MAX_VISIBLE_EVENTS_IN_MONTH_CELL }} more
                </Button>
              </PopoverTrigger>
              <DayEventsOverflowPopup
                v-if="overflowPopupOpenForDateKey === format(day.date, 'yyyy-MM-dd')"
                :events="day.events.slice(MAX_VISIBLE_EVENTS_IN_MONTH_CELL)"
                :date="day.date"
                @edit-event="handleOverflowEventEdit"
                @close="overflowPopupOpenForDateKey = null"
              />
            </Popover>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
