<script setup lang="ts">
import { ref, watch, type Ref } from "vue"
import { endOfDay, format, startOfDay } from "date-fns" // Added newDate
import { useDragAndDrop, type VueParentConfig } from "@formkit/drag-and-drop/vue"
import type { DragendEvent } from "@formkit/drag-and-drop"
import type { CalendarEvent, MonthViewDay } from "./types"
import DayEventsOverflowPopup from "./DayEventsOverflowPopup.vue"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"

const props = defineProps<{
  days: MonthViewDay[]
  // pixelsPerHour?: number; // Not directly used here, can be removed if not needed for D&D config
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()

// --- Overflow Popup State ---
const MAX_VISIBLE_EVENTS_IN_MONTH_CELL = 2 // Configurable
const overflowPopupOpenForDateKey = ref<string | null>(null)
const overflowPopupTargetRef = ref<HTMLElement | null>(null)

interface MonthDndInstance {
  parentRef: Ref<HTMLElement | null>
  values: Ref<CalendarEvent[]> // This is the reactive array from useDragAndDrop
  updateConfig: (config: Partial<VueParentConfig<CalendarEvent>>) => void
}
const dndDayCellInstances = ref<Record<string, MonthDndInstance>>({})

const getDndConfigForDayCell = (dayDate: Date): Partial<VueParentConfig<CalendarEvent>> => ({
  group: "calendarEventsMonth",
  // dragHandle: '.drag-handle', // Add this class to your event items if you want drag handles
  onDragend: (event: DragendEvent) => {
    const droppedEvent = event.detail.targetData.value
    const targetParentEl = event.detail.targetData.parent.el
    const targetDateStr = targetParentEl.dataset.dateKey // Ensure this data attribute is on the parent

    if (droppedEvent && targetDateStr) {
      const newDateForEvent = startOfDay(new Date(targetDateStr))
      const duration = new Date(droppedEvent.end).getTime() - new Date(droppedEvent.start).getTime()

      // If original was timed and less than a day, and dropped on month, consider making it all day for that day
      // or keep its original time if that's desired behavior for month view drops.
      // This example makes it an all-day event for the new date.
      const newStart = newDateForEvent
      const newEnd = new Date(newStart.getTime() + duration) // Maintain duration if it was already allDay
      // Or endOfDay(newStart) if converting timed to allDay

      const updatedEvent: CalendarEvent = {
        ...droppedEvent,
        startDate: newStart,
        endDate: droppedEvent.allDay ? newEnd : endOfDay(newStart), // If originally timed, span full new day
        allDay: true,
      }
      emit("eventUpdate", updatedEvent)
    }
  },
})

watch(
  () => props.days,
  newDays => {
    const newInstances: Record<string, MonthDndInstance> = {}
    newDays.forEach(day => {
      const key = format(day.date, "yyyy-MM-dd")
      // IMPORTANT: useDragAndDrop expects a Ref<T[]> for its first argument if you want it to be reactive
      // to external changes to that list, or it manages its own internal list if given a plain array.
      // Here, we give it a new ref each time props.days changes, effectively re-initializing.
      const dayEventsRef = ref([...day.events])

      const [parentRef, dndReactiveValues, updateConfigFn] = useDragAndDrop(
        dayEventsRef, // Pass the ref of events for this specific day cell
        getDndConfigForDayCell(day.date)
      )
      newInstances[key] = { parentRef, values: dndReactiveValues, updateConfig: updateConfigFn }
    })
    dndDayCellInstances.value = newInstances
  },
  { deep: true, immediate: true }
)

const getVisibleEvents = (dayKey: string) => {
  const events = dndDayCellInstances.value[dayKey]?.values.value || []
  return events.slice(0, MAX_VISIBLE_EVENTS_IN_MONTH_CELL)
}

const getOverflowEvents = (dayKey: string) => {
  const events = dndDayCellInstances.value[dayKey]?.values.value || []
  return events.slice(MAX_VISIBLE_EVENTS_IN_MONTH_CELL)
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
      :ref="dndDayCellInstances[format(day.date, 'yyyy-MM-dd')]?.parentRef"
      :data-date-key="format(day.date, 'yyyy-MM-dd')"
      :class="[
        'p-1 border-r border-b border-border min-h-[100px] relative group',
        day.isCurrentMonth ? 'bg-background' : 'bg-muted/30',
        { 'bg-blue-50 dark:bg-blue-900/30': day.isToday },
      ]"
      @click.self="emit('openAddModal', day.date, true, day.date)"
    >
      <span :class="['text-sm', { 'font-bold text-blue-600 dark:text-blue-400': day.isToday }]">{{
        format(day.date, "d")
      }}</span>

      <div class="mt-1 space-y-1">
        <div
          v-for="eventItem in getVisibleEvents(format(day.date, 'yyyy-MM-dd'))"
          :key="eventItem.id"
          :class="[
            'p-1 text-xs rounded cursor-pointer drag-handle truncate',
            `bg-${eventItem.color}-200 border-${eventItem.color}-400 text-${eventItem.color}-800 dark:bg-${eventItem.color}-700 dark:border-${eventItem.color}-500 dark:text-${eventItem.color}-100`,
          ]"
          @click="emit('openEditModal', eventItem)"
        >
          {{ eventItem.title }}
        </div>

        <Popover
          v-if="getOverflowEvents(format(day.date, 'yyyy-MM-dd')).length > 0"
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
              class="w-full text-xs h-auto py-0.5 px-1 justify-start text-muted-foreground hover:bg-muted/50"
              @click.stop="toggleOverflowPopup(format(day.date, 'yyyy-MM-dd'), $event)"
            >
              + {{ getOverflowEvents(format(day.date, "yyyy-MM-dd")).length }} more
            </Button>
          </PopoverTrigger>
          <DayEventsOverflowPopup
            v-if="overflowPopupOpenForDateKey === format(day.date, 'yyyy-MM-dd')"
            :events="getOverflowEvents(format(day.date, 'yyyy-MM-dd'))"
            :date="day.date"
            @edit-event="handleOverflowEventEdit"
            @close="overflowPopupOpenForDateKey = null"
          />
        </Popover>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="absolute top-0 right-0 opacity-0 group-hover:opacity-100"
        @click="emit('openAddModal', day.date, true, day.date)"
        >+</Button
      >
    </div>
  </div>
</template>
