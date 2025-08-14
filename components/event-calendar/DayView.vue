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
  dayData: DayColumnData
  pixelsPerHour: number
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()
const { getEventStyle, generateTimeSlots, getDropTime } = useCalendarUtils()

interface DndInstance {
  allDayZone: ReturnType<typeof createDroppableZone>
  timedZone: ReturnType<typeof createDroppableZone>
  allDayConfig: ReturnType<typeof createDragConfig>
  timedConfig: ReturnType<typeof createDragConfig>
}
const dndInstance = ref<DndInstance | null>(null)

// Enhanced drag state for visual feedback
const dragState = ref({
  isDragging: false,
  draggedEventId: null as string | null,
  validDropZones: [] as string[],
  currentDropZone: null as string | null,
})

const timeSlotsForView = computed<TimeSlot[]>(() => {
  return generateTimeSlots(props.dayData.date)
})

// Process raw timed events to include style for positioning
const processedDayData = computed(() => {
  return {
    ...props.dayData,
    timedEventsStyled: props.dayData.timedEventsRaw.map(event => ({
      ...event,
      style: getEventStyle(event, props.dayData.date, props.pixelsPerHour),
    })),
  }
})

// Function to get DnD config - must be defined before use
const getDndConfigForDayZone = (zoneType: "allDay" | "timed") => {
  const { createDragConfig } = useDragAndDropSystem()
  return createDragConfig(
    `day-${zoneType}-${props.dayData.dateKey}`,
    zoneType === "allDay" ? "all-day" : "timed",
    props.dayData.dateKey,
    (updatedEvent: CalendarEvent) => emit("eventUpdate", updatedEvent),
    props.pixelsPerHour
  )
}

// Initialize drag and drop instances immediately
const initializeDragAndDrop = () => {
  const { createDroppableZone } = useDragAndDropSystem()
  
  // Create drag configs for each zone
  const allDayConfig = getDndConfigForDayZone("allDay")
  const timedConfig = getDndConfigForDayZone("timed")
  
  // Create droppable zones
  const allDayZone = createDroppableZone(allDayConfig)
  const timedZone = createDroppableZone(timedConfig)

  dndInstance.value = {
    allDayZone,
    timedZone,
    allDayConfig,
    timedConfig
  }
}

// Initialize on mount and watch for changes
onMounted(() => {
  initializeDragAndDrop()
})

watch(
  () => props.dayData,
  (newDayData) => {
    // Reinitialize drag and drop with new data
    initializeDragAndDrop()
  },
  { deep: true }
)

// Initialize color manager
const allEventsComputed = computed(() => {
  return [...props.dayData.allDayEvents, ...props.dayData.timedEventsRaw]
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
const handleDragEnter = (dragEvent: DragEvent, zoneType: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.add('drop-zone-active')
  }
  dragState.value.currentDropZone = `${zoneType}-${props.dayData.dateKey}`
}

const handleDragLeave = (dragEvent: DragEvent, zoneType: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove('drop-zone-active')
  }
  dragState.value.currentDropZone = null
}

const handleDrop = (dragEvent: DragEvent, zoneType: string) => {
  dragEvent.preventDefault()
  
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove('drop-zone-active')
  }

  const draggedData = dragEvent.dataTransfer?.getData('application/json')
  if (!draggedData) return

  try {
    const droppedEvent: CalendarEvent = JSON.parse(draggedData)
    const config = getDndConfigForDayZone(zoneType as "allDay" | "timed")
    config.handleDrop(droppedEvent)
  } catch (error) {
    console.error('❌ Error handling drop:', error)
  }
}

const handleResizeEnd = debounce((event: CalendarEvent) => {
  // Final update
  emit('eventUpdate', event)
}, 100)

// Note: Cleanup is handled automatically by Vue's reactivity system
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
        :class="[
          'flex-1 border-r border-border p-1 min-h-[60px] relative group',
          { 'bg-blue-50 dark:bg-blue-900/30': processedDayData.isToday },
        ]"
      >
        <div
          class="text-center text-sm mb-1"
          :class="{ 'font-bold text-blue-600 dark:text-blue-400': processedDayData.isToday }"
        >
          {{ format(processedDayData.date, "EEEE, MMM dd") }}
        </div>
        <div
          :ref="dndInstance?.allDayZone.elementRef"
          :data-date-key="processedDayData.dateKey"
          data-type="allDay"
          @dragover.prevent
          @dragenter="handleDragEnter($event, 'allDay')"
          @dragleave="handleDragLeave($event, 'allDay')"
          @drop="handleDrop($event, 'allDay')"
          :class="[
            'min-h-[30px] space-y-0.5 transition-colors duration-200',
            {
              'bg-blue-100/50 dark:bg-blue-800/30 ring-2 ring-blue-300 dark:ring-blue-600': 
                dragState.isDragging && dragState.currentDropZone === 'allday-zone',
              'bg-green-50/30 dark:bg-green-900/20': 
                dragState.isDragging && dragState.validDropZones.includes('allday-zone') && dragState.currentDropZone !== 'allday-zone'
            }
          ]"
        >
          <div
            v-for="event in processedDayData.allDayEvents"
            :key="event.id"
            :class="[
              'p-1 text-xs rounded cursor-move mb-0.5 event-content border transition-all duration-200 hover:shadow-sm select-none',
              event.color ? getColorClasses(event.color) : 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100',
            ]"
            draggable="true"
            @dragstart="handleEventDragStart(event, $event)"
            @dragend="handleEventDragEnd(event, $event)"
            @click="emit('openEditModal', event)"
          >
            <div class="space-y-0.5">
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
          @click="emit('openAddModal', processedDayData.date, true, processedDayData.date)"
          :title="`Add event on ${format(processedDayData.date, 'MMM d')}`"
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
      <div
        :ref="dndInstance?.timedZone.elementRef"
        :data-date-key="processedDayData.dateKey"
        data-type="timed"
        @dragover.prevent
        @dragenter="handleDragEnter($event, 'timed')"
        @dragleave="handleDragLeave($event, 'timed')"
        @drop="handleDrop($event, 'timed')"
        :class="[
          'flex-1 border-r border-border relative transition-colors duration-200',
          { 
            'bg-blue-50/50 dark:bg-blue-900/20': processedDayData.isToday,
            'bg-blue-100/50 dark:bg-blue-800/30 ring-2 ring-blue-300 dark:ring-blue-600': 
              dragState.isDragging && dragState.currentDropZone === 'timed-zone',
            'bg-green-50/30 dark:bg-green-900/20': 
              dragState.isDragging && dragState.validDropZones.includes('timed-zone') && dragState.currentDropZone !== 'timed-zone'
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

        <template v-for="styledEvent in processedDayData.timedEventsStyled" :key="styledEvent.id">
          <div
            v-if="true"
            :style="{ 
              ...styledEvent.style, 
              height: `${calculateEventHeight(styledEvent, props.pixelsPerHour)}px` 
            }"
            :class="[
              'absolute p-1 text-xs rounded cursor-move event-content z-[5] border transition-all duration-200 hover:shadow-md hover:z-10 select-none',
              styledEvent.color ? getColorClasses(styledEvent.color) : 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100',
            ]"
            draggable="true"
            @dragstart="handleEventDragStart(styledEvent, $event)"
            @dragend="handleEventDragEnd(styledEvent, $event)"
            @click="emit('openEditModal', styledEvent)"
          >
            <!-- Resize handles for all sides -->
            <EventResizeHandle
              :event="styledEvent"
              position="top"
              :enabled="!styledEvent.allDay"
              :pixels-per-hour="pixelsPerHour"
              @resize-start="handleResizeStart"
              @resize="handleResize"
              @resize-end="handleResizeEnd"
            />
            
            <EventResizeHandle
              :event="styledEvent"
              position="left"
              :enabled="true"
              :pixels-per-hour="pixelsPerHour"
              @resize-start="handleResizeStart"
              @resize="handleResize"
              @resize-end="handleResizeEnd"
            />
            
            <EventResizeHandle
              :event="styledEvent"
              position="right"
              :enabled="true"
              :pixels-per-hour="pixelsPerHour"
              @resize-start="handleResizeStart"
              @resize="handleResize"
              @resize-end="handleResizeEnd"
            />
            
            <div class="space-y-0.5">
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
              :pixels-per-hour="pixelsPerHour"
              @resize-start="handleResizeStart"
              @resize="handleResize"
              @resize-end="handleResizeEnd"
            />
          </div>
        </template>
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
:root {
  --pixels-per-hour: v-bind(pixelsPerHour + "px");
}
</style>
