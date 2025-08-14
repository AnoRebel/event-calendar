<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { format } from "date-fns"
import type { CalendarEvent, DayColumnData, TimeSlot } from "./types"
import { useCalendarUtils } from "./composables/useCalendarUtils"
import LocationDisplay from "./LocationDisplay.vue"
import EventResizeHandle from "./EventResizeHandle.vue"
import { useColorManager } from "./composables/useColorManager"
import { useDragAndDropSystem } from "./composables/useDragAndDrop"
import { throttle, debounce } from "./utils"
import { Button } from "@/components/ui/button"

const props = defineProps<{
  weekDaysData: DayColumnData[]
  pixelsPerHour?: number
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()

const { getEventStyle, generateTimeSlots, getDropTime } = useCalendarUtils()

// Initialize color manager
const allEventsComputed = computed(() => {
  const allEvents: CalendarEvent[] = []
  props.weekDaysData.forEach(day => {
    allEvents.push(...day.allDayEvents, ...day.timedEventsRaw)
  })
  return allEvents
})

const { getColorClasses } = useColorManager(allEventsComputed)

// Initialize enhanced drag and drop system
const { createDragConfig, formatEventDuration, calculateEventHeight, createDroppableZone, createDraggableEvent } = useDragAndDropSystem()

// Resize event handlers with performance optimization
const handleResizeStart = (event: CalendarEvent) => {
  // Handle resize start
}

const handleResize = throttle((event: CalendarEvent) => {
  // Update the event immediately for visual feedback
  emit('eventUpdate', event)
}, 16) // ~60fps

const handleResizeEnd = debounce((event: CalendarEvent) => {
  // Final update
  emit('eventUpdate', event)
}, 100)

// Drag handlers for events
const handleEventDragStart = (event: CalendarEvent, dragEvent: DragEvent) => {
  if (!dragEvent.dataTransfer) return
  
  dragState.value.isDragging = true
  dragState.value.draggedEventId = event.id
  
  dragEvent.dataTransfer.setData('application/json', JSON.stringify(event))
  dragEvent.dataTransfer.effectAllowed = 'move'
  
  document.body.classList.add('dragging-event')
}

const handleEventDragEnd = (event: CalendarEvent, dragEvent: DragEvent) => {
  dragState.value.isDragging = false
  dragState.value.draggedEventId = null
  document.body.classList.remove('dragging-event')
}

// Drop zone handlers
const handleDragEnter = (dragEvent: DragEvent, dateKey: string, zoneType: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.add('drop-zone-active')
  }
  dragState.value.currentDropZone = `${zoneType}-${dateKey}`
}

const handleDragLeave = (dragEvent: DragEvent, dateKey: string, zoneType: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove('drop-zone-active')
  }
  dragState.value.currentDropZone = null
}

const handleDrop = (dragEvent: DragEvent, dateKey: string, zoneType: string) => {
  dragEvent.preventDefault()
  
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove('drop-zone-active')
  }

  const draggedData = dragEvent.dataTransfer?.getData('application/json')
  if (!draggedData) return

  try {
    const droppedEvent: CalendarEvent = JSON.parse(draggedData)
    const config = getDndConfigForWeekZone(dateKey, zoneType as "allDay" | "timed")
    config.handleDrop(droppedEvent)
  } catch (error) {
    console.error('❌ Error handling drop:', error)
  }
}

interface DndZoneInstance {
  allDayZone: ReturnType<typeof createDroppableZone>
  timedZone: ReturnType<typeof createDroppableZone>
  allDayConfig: ReturnType<typeof createDragConfig>
  timedConfig: ReturnType<typeof createDragConfig>
}

const dndInstances = ref<Record<string, DndZoneInstance>>({})

// Enhanced drag state for visual feedback
const dragState = ref({
  isDragging: false,
  draggedEventId: null as string | null,
  validDropZones: [] as string[],
  currentDropZone: null as string | null,
  dragPreview: null as { x: number; y: number; event: CalendarEvent } | null,
})

const timeSlotsForView = computed<TimeSlot[]>(() => {
  if (props.weekDaysData.length > 0) {
    return generateTimeSlots(props.weekDaysData[0].date)
  }
  return []
})

// Process raw timed events to include style for positioning
const processedWeekDaysData = computed(() => {
  return props.weekDaysData.map(day => ({
    ...day,
    timedEventsStyled: day.timedEventsRaw.map(event => ({
      ...event,
      style: getEventStyle(event, day.date, props.pixelsPerHour),
    })),
  }))
})

const getDndConfigForWeekZone = (
  dateKey: string,
  zoneType: "allDay" | "timed"
) => 
  createDragConfig(
    `week-${zoneType}-${dateKey}`,
    zoneType === "allDay" ? "all-day" : "timed",
    dateKey,
    (updatedEvent: CalendarEvent) => emit("eventUpdate", updatedEvent),
    props.pixelsPerHour || 60
  )

watch(
  () => props.weekDaysData,
  newWeekData => {
    const newDndInstances: Record<string, DndZoneInstance> = {}

    newWeekData.forEach(day => {
      // Create drag configs for each zone
      const allDayConfig = getDndConfigForWeekZone(day.dateKey, "allDay")
      const timedConfig = getDndConfigForWeekZone(day.dateKey, "timed")
      
      // Create droppable zones
      const allDayZone = createDroppableZone(allDayConfig)
      const timedZone = createDroppableZone(timedConfig)

      newDndInstances[day.dateKey] = {
        allDayZone,
        timedZone,
        allDayConfig,
        timedConfig
      }
    })

    dndInstances.value = newDndInstances
  },
  { deep: true }
)

onMounted(() => {
  // Initialize drag and drop on client side only
  const newDndInstances: Record<string, DndZoneInstance> = {}

  props.weekDaysData.forEach(day => {
    // Create drag configs for each zone
    const allDayConfig = getDndConfigForWeekZone(day.dateKey, "allDay")
    const timedConfig = getDndConfigForWeekZone(day.dateKey, "timed")
    
    // Create droppable zones
    const allDayZone = createDroppableZone(allDayConfig)
    const timedZone = createDroppableZone(timedConfig)

    newDndInstances[day.dateKey] = {
      allDayZone,
      timedZone,
      allDayConfig,
      timedConfig
    }
  })

  dndInstances.value = newDndInstances
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- All Day Events Header -->
    <div class="flex border-b border-border sticky top-0 bg-background z-20">
      <div
        class="w-16 border-r border-border p-2 text-xs text-muted-foreground flex items-center justify-center shrink-0"
      >
        All-day
      </div>
      <div
        v-for="day in processedWeekDaysData"
        :key="`allday-header-${day.dateKey}`"
        :class="[
          'flex-1 border-r border-border p-1 min-h-[60px] relative group',
          { 'bg-blue-50 dark:bg-blue-900/30': day.isToday },
        ]"
      >
        <div class="text-center text-sm mb-1" :class="{ 'font-bold text-blue-600 dark:text-blue-400': day.isToday }">
          {{ day.dayLabel }}
        </div>
        <div
          :ref="dndInstances[day.dateKey]?.allDayZone.elementRef"
          :data-date-key="day.dateKey"
          data-type="allDay"
          @dragover.prevent
          @dragenter="handleDragEnter($event, day.dateKey, 'allDay')"
          @dragleave="handleDragLeave($event, day.dateKey, 'allDay')"
          @drop="handleDrop($event, day.dateKey, 'allDay')"
          :class="[
            'min-h-[30px] space-y-0.5 transition-colors duration-200',
            {
              'bg-blue-100/50 dark:bg-blue-800/30 ring-2 ring-blue-300 dark:ring-blue-600': 
                dragState.isDragging && dragState.currentDropZone === `allDay-${day.dateKey}`,
              'bg-green-50/30 dark:bg-green-900/20': 
                dragState.isDragging && dragState.validDropZones.includes(`allday-${day.dateKey}`)
            }
          ]"
        >
          <div
            v-for="event in day.allDayEvents"
            :key="event.id"
            :class="[
              'p-1 text-xs rounded cursor-move mb-0.5 event-content border transition-all duration-200 hover:shadow-sm select-none',
              event.color ? getColorClasses(event.color) : 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100',
            ]"
            draggable="true"
            @dragstart="handleEventDragStart(event, $event)"
            @dragend="handleEventDragEnd(event, $event)"
            @click.stop="emit('openEditModal', event)"
          >
            <div class="space-y-0.5 drag-handle">
              <div class="flex items-center gap-1 min-w-0">
                <span class="truncate flex-1 font-medium">{{ event.title }}</span>
                <LocationDisplay
                  v-if="event.location"
                  :location="event.location"
                  :compact="true"
                  :show-tooltip="true"
                  :icon-size="10"
                />
              </div>
              <div v-if="formatEventDuration(event)" class="event-duration text-opacity-75">
                {{ formatEventDuration(event) }}
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-opacity"
          @click="emit('openAddModal', day.date, true, day.date)"
          :title="`Add event on ${day.dayLabel}`"
        >
          <Icon name="lucide:plus" size="14" />
        </Button>
      </div>
    </div>

    <!-- Timed Events Grid -->
    <div class="flex flex-grow overflow-hidden">
      <div class="w-16 border-r border-border text-xs text-muted-foreground overflow-y-auto shrink-0">
        <!-- Time Gutter -->
        <div
          v-for="slot in timeSlotsForView"
          :key="slot.label"
          :style="{ height: `${pixelsPerHour}px` }"
          class="text-center pt-1 border-b border-border box-border relative -top-[calc(var(--pixels-per-hour)/2)] first:top-0"
        >
          <span class="block leading-none">{{ slot.label }}</span>
        </div>
      </div>
      <div class="flex flex-1 overflow-x-auto">
        <div
          v-for="day in processedWeekDaysData"
          :key="`timedcol-${day.dateKey}`"
          :ref="dndInstances[day.dateKey]?.timedZone.elementRef"
          :data-date-key="day.dateKey"
          data-type="timed"
          @dragover.prevent
          @dragenter="handleDragEnter($event, day.dateKey, 'timed')"
          @dragleave="handleDragLeave($event, day.dateKey, 'timed')"
          @drop="handleDrop($event, day.dateKey, 'timed')"
          :class="[
            'flex-1 border-r border-border relative min-w-[120px] transition-colors duration-200',
            { 
              'bg-blue-50/50 dark:bg-blue-900/20': day.isToday,
              'bg-blue-100/50 dark:bg-blue-800/30 ring-2 ring-blue-300 dark:ring-blue-600': 
                dragState.isDragging && dragState.currentDropZone === `timed-${day.dateKey}`,
              'bg-green-50/30 dark:bg-green-900/20': 
                dragState.isDragging && dragState.validDropZones.includes(`timed-${day.dateKey}`) && dragState.currentDropZone !== `timed-${day.dateKey}`
            },
          ]"
        >
          <div
            v-for="slot in timeSlotsForView"
            :key="slot.time.toISOString()"
            :data-slot-time="slot.dateTimeStr"
            :style="{ height: `${pixelsPerHour}px` }"
            class="border-b border-dashed border-border/50 dark:border-border/30 box-border relative"
          />

          <template v-for="styledEvent in day.timedEventsStyled" :key="styledEvent.id">
            <div
              v-if="true"
              :style="{ 
                ...styledEvent.style, 
                height: `${calculateEventHeight(styledEvent, props.pixelsPerHour || 60)}px` 
              }"
              :class="[
                'absolute p-1 text-xs rounded cursor-move event-content overflow-hidden z-[5] border transition-all duration-200 hover:shadow-md hover:z-10 select-none',
                styledEvent.color ? getColorClasses(styledEvent.color) : 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100',
              ]"
              draggable="true"
              @dragstart="handleEventDragStart(styledEvent, $event)"
              @dragend="handleEventDragEnd(styledEvent, $event)"
              @click.stop="emit('openEditModal', styledEvent)"
            >
              <!-- Resize handles for all sides -->
              <EventResizeHandle
                :event="styledEvent"
                position="top"
                :enabled="!styledEvent.allDay"
                :pixels-per-hour="pixelsPerHour || 60"
                @resize-start="handleResizeStart"
                @resize="handleResize"
                @resize-end="handleResizeEnd"
              />
              
              <EventResizeHandle
                :event="styledEvent"
                position="left"
                :enabled="true"
                :pixels-per-hour="pixelsPerHour || 60"
                @resize-start="handleResizeStart"
                @resize="handleResize"
                @resize-end="handleResizeEnd"
              />
              
              <EventResizeHandle
                :event="styledEvent"
                position="right"
                :enabled="true"
                :pixels-per-hour="pixelsPerHour || 60"
                @resize-start="handleResizeStart"
                @resize="handleResize"
                @resize-end="handleResizeEnd"
              />
              
              <div class="space-y-0.5 drag-handle">
                <div class="font-semibold truncate">{{ styledEvent.title }}</div>
                <div class="opacity-80 text-xs">
                  {{ format(new Date(styledEvent.startDate), "p") }} - {{ format(new Date(styledEvent.endDate), "p") }}
                </div>
                <div v-if="formatEventDuration(styledEvent)" class="event-duration">
                  {{ formatEventDuration(styledEvent) }}
                </div>
                <LocationDisplay
                  v-if="styledEvent.location"
                  :location="styledEvent.location"
                  :compact="true"
                  :show-tooltip="true"
                  :icon-size="10"
                />
              </div>
              
              <!-- Resize handle for bottom -->
              <EventResizeHandle
                :event="styledEvent"
                position="bottom"
                :enabled="!styledEvent.allDay"
                :pixels-per-hour="pixelsPerHour || 60"
                @resize-start="handleResizeStart"
                @resize="handleResize"
                @resize-end="handleResizeEnd"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Style for the time gutter text to align with the top of the hour slot */
.overflow-y-auto .leading-none {
  position: relative;
  top: -0.5em; /* Adjust this to visually align text with the line */
}
.overflow-y-auto .border-b:first-child .leading-none {
  top: 0; /* First slot text aligned at the very top */
}
/* Ensure CSS variable can be used by child styles if PIXELS_PER_HOUR is passed as CSS var */
:root {
  --pixels-per-hour: v-bind(pixelsPerHour + "px");
}
</style>
