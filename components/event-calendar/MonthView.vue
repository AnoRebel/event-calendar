<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { format } from "date-fns";
import type { CalendarEvent, MonthViewDay } from "./types";
import DayEventsOverflowPopup from "./DayEventsOverflowPopup.vue";
import LocationDisplay from "./LocationDisplay.vue";
import { useColorManager } from "./composables/useColorManager";
import { useDragAndDropSystem } from "./composables/useDragAndDrop";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

const props = defineProps<{
  days: MonthViewDay[];
}>();

const emit = defineEmits<{
  (
    e: "openAddModal",
    date: Date,
    isAllDaySlot?: boolean,
    allDayTargetDate?: Date
  ): void;
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void;
}>();

// --- Overflow Popup State ---
const MAX_VISIBLE_EVENTS_IN_MONTH_CELL = 2; // Configurable
const overflowPopupOpenForDateKey = ref<string | null>(null);
const overflowPopupTargetRef = ref<HTMLElement | null>(null);

// Initialize enhanced drag and drop system
const { createDragConfig, formatEventDuration, createDroppableZone, createDraggableEvent } = useDragAndDropSystem()

interface MonthDndInstance {
  dayZone: ReturnType<typeof createDroppableZone>
  dayConfig: ReturnType<typeof createDragConfig>
}
const dndDayCellInstances = ref<Record<string, MonthDndInstance>>({});

const getDndConfigForDayCell = (
  dayDate: Date
) => 
  createDragConfig(
    `month-${format(dayDate, "yyyy-MM-dd")}`,
    'day-cell',
    format(dayDate, "yyyy-MM-dd"),
    (updatedEvent: CalendarEvent) => emit("eventUpdate", updatedEvent),
    60 // pixelsPerHour not really used in month view, but required for interface
  )

watch(
  () => props.days,
  (newDays) => {
    if (!newDays || newDays.length === 0) {
      dndDayCellInstances.value = {}
      return
    }
    
    const newInstances: Record<string, MonthDndInstance> = {};
    newDays.forEach((day) => {
      const key = format(day.date, "yyyy-MM-dd");
      
      try {
        // Create drag config for this day
        const dayConfig = getDndConfigForDayCell(day.date)
        
        // Create droppable zone
        const dayZone = createDroppableZone(dayConfig)
        
        newInstances[key] = {
          dayZone,
          dayConfig,
        };
      } catch (error) {
        console.error(`Error setting up drag and drop for day ${key}:`, error)
      }
    });
    dndDayCellInstances.value = newInstances;
  },
  { deep: true }
);

onMounted(() => {
  // Initialize drag and drop on client side only
  if (!props.days || props.days.length === 0) {
    return;
  }
  
  const newInstances: Record<string, MonthDndInstance> = {};
  props.days.forEach((day) => {
    const key = format(day.date, "yyyy-MM-dd");
    
    try {
      // Create drag config for this day
      const dayConfig = getDndConfigForDayCell(day.date);
      
      // Create droppable zone
      const dayZone = createDroppableZone(dayConfig);
      
      newInstances[key] = {
        dayZone,
        dayConfig,
      };
    } catch (error) {
      console.error(`Error setting up drag and drop for day ${key}:`, error);
    }
  });
  dndDayCellInstances.value = newInstances;
});

// Note: Now using direct props data instead of drag-and-drop managed events for better reliability

// Drag handlers for events
const handleEventDragStart = (event: CalendarEvent, dragEvent: DragEvent) => {
  if (!dragEvent.dataTransfer) return
  
  dragEvent.dataTransfer.setData('application/json', JSON.stringify(event))
  dragEvent.dataTransfer.effectAllowed = 'move'
  
  document.body.classList.add('dragging-event')
}

const handleEventDragEnd = (event: CalendarEvent, dragEvent: DragEvent) => {
  document.body.classList.remove('dragging-event')
}

// Drop zone handlers
const handleDragEnter = (dragEvent: DragEvent, dayKey: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.add('drop-zone-active')
  }
}

const handleDragLeave = (dragEvent: DragEvent, dayKey: string) => {
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove('drop-zone-active')
  }
}

const handleDrop = (dragEvent: DragEvent, dayKey: string, dayDate: Date) => {
  dragEvent.preventDefault()
  
  if (dragEvent.currentTarget instanceof HTMLElement) {
    dragEvent.currentTarget.classList.remove('drop-zone-active')
  }

  const draggedData = dragEvent.dataTransfer?.getData('application/json')
  if (!draggedData) return

  try {
    const droppedEvent: CalendarEvent = JSON.parse(draggedData)
    const config = getDndConfigForDayCell(dayDate)
    config.handleDrop(droppedEvent)
  } catch (error) {
    console.error('❌ Error handling drop:', error)
  }
}

const toggleOverflowPopup = (dayKey: string, event: MouseEvent) => {
  if (overflowPopupOpenForDateKey.value === dayKey) {
    overflowPopupOpenForDateKey.value = null;
    overflowPopupTargetRef.value = null;
  } else {
    overflowPopupOpenForDateKey.value = dayKey;
    overflowPopupTargetRef.value = event.currentTarget as HTMLElement;
  }
};

const handleOverflowEventEdit = (event: CalendarEvent) => {
  emit("openEditModal", event);
  overflowPopupOpenForDateKey.value = null; // Close popup
};

// Initialize color manager for getting color classes
const eventsComputed = computed(() => {
  const allEvents: CalendarEvent[] = [];
  props.days.forEach((day) => {
    allEvents.push(...day.events);
  });
  return allEvents;
});
const { getColorClasses } = useColorManager(eventsComputed);

// Cleanup on unmount
onUnmounted(() => {
  dndDayCellInstances.value = {}
  overflowPopupOpenForDateKey.value = null
  overflowPopupTargetRef.value = null
})
</script>

<template>
  <div class="grid grid-cols-7 border-t border-l border-border">
    <div
      v-for="dayHeader in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
      :key="dayHeader"
      class="p-2 text-center font-medium border-r border-b border-border bg-muted/50 h-10 flex items-center justify-center"
    >
      {{ dayHeader }}
    </div>
    <div
      v-for="day in days"
      :key="day.date.toISOString()"
      :ref="dndDayCellInstances[format(day.date, 'yyyy-MM-dd')]?.dayZone.elementRef"
      :data-date-key="format(day.date, 'yyyy-MM-dd')"
      data-type="day-cell"
      @dragover.prevent
      @dragenter="handleDragEnter($event, format(day.date, 'yyyy-MM-dd'))"
      @dragleave="handleDragLeave($event, format(day.date, 'yyyy-MM-dd'))"
      @drop="handleDrop($event, format(day.date, 'yyyy-MM-dd'), day.date)"
      :class="[
        'p-1 border-r border-b border-border min-h-[100px] relative group',
        day.isCurrentMonth ? 'bg-background' : 'bg-muted/30',
        { 'bg-blue-50 dark:bg-blue-900/30': day.isToday },
      ]"
    >
      <span
        :class="[
          'text-sm',
          { 'font-bold text-blue-600 dark:text-blue-400': day.isToday },
        ]"
        >{{ format(day.date, "d") }}</span
      >

      <div class="mt-1 space-y-1">
        <div
          v-for="eventItem in day.events.slice(0, MAX_VISIBLE_EVENTS_IN_MONTH_CELL)"
          :key="eventItem.id"
          :class="[
            'p-2 text-xs rounded cursor-move event-content border-2 transition-all duration-200 hover:shadow-md select-none relative group',
            eventItem.color
              ? getColorClasses(eventItem.color)
              : 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100',
          ]"
          draggable="true"
          :data-event-id="eventItem.id"
          @click="emit('openEditModal', eventItem)"
          @dragstart="handleEventDragStart(eventItem, $event)"
          @dragend="handleEventDragEnd(eventItem, $event)"
        >
          <div class="space-y-0.5">
            <div class="flex items-center gap-1 min-w-0">
              <span class="truncate flex-1 font-medium">{{ eventItem.title }}</span>
              <LocationDisplay
                v-if="eventItem.location"
                :location="eventItem.location"
                :compact="true"
                :show-tooltip="true"
                :icon-size="10"
              />
            </div>
            <div v-if="formatEventDuration(eventItem)" class="event-duration text-opacity-75">
              {{ formatEventDuration(eventItem) }}
            </div>
          </div>
        </div>

        <Popover
          v-if="day.events.length > MAX_VISIBLE_EVENTS_IN_MONTH_CELL"
          :open="overflowPopupOpenForDateKey === format(day.date, 'yyyy-MM-dd')"
          @update:open="
            (isOpen) => {
              if (!isOpen) overflowPopupOpenForDateKey = null;
            }
          "
        >
          <PopoverTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="w-full text-xs h-auto py-0.5 px-1 justify-start text-muted-foreground hover:bg-muted/50"
              @click.stop="
                toggleOverflowPopup(format(day.date, 'yyyy-MM-dd'), $event)
              "
            >
              + {{ day.events.length - MAX_VISIBLE_EVENTS_IN_MONTH_CELL }} more
            </Button>
          </PopoverTrigger>
          <DayEventsOverflowPopup
            v-if="
              overflowPopupOpenForDateKey === format(day.date, 'yyyy-MM-dd')
            "
            :events="day.events.slice(MAX_VISIBLE_EVENTS_IN_MONTH_CELL)"
            :date="day.date"
            @edit-event="handleOverflowEventEdit"
            @close="overflowPopupOpenForDateKey = null"
          />
        </Popover>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-opacity"
        @click="emit('openAddModal', day.date, true, day.date)"
        :title="`Add event on ${format(day.date, 'MMM d')}`"
      >
        <Icon name="lucide:plus" size="14" />
      </Button>
    </div>
  </div>
</template>
