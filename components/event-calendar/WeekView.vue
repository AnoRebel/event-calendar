<script setup lang="ts">
import { ref, computed, watch, type Ref } from "vue"
import { format, startOfDay, endOfDay } from "date-fns" // Added newDate
import { useDragAndDrop, type VueParentConfig } from "@formkit/drag-and-drop/vue"
import type { DragendEvent } from "@formkit/drag-and-drop"
import type { CalendarEvent, DayColumnData, TimeSlot } from "./types"
import { useCalendarUtils } from "./composables/useCalendarUtils"

const props = defineProps<{
  weekDaysData: DayColumnData[]
  pixelsPerHour?: number
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()

const { getEventStyle, generateTimeSlots, getDropTime } = useCalendarUtils()

interface DndZoneInstance {
  parentRef: Ref<HTMLElement | null>
  values: Ref<CalendarEvent[]>
  updateConfig: (config: Partial<VueParentConfig<CalendarEvent>>) => void
}
const dndAllDayInstances = ref<Record<string, DndZoneInstance>>({})
const dndTimedInstances = ref<Record<string, DndZoneInstance>>({})

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
): Partial<VueParentConfig<CalendarEvent>> => ({
  group: "calendarEventsWeek",
  // dragHandle: '.drag-handle',
  onDragend: (event: DragendEvent) => {
    const droppedEvent = event.detail.targetData.value
    const targetParentEl = event.detail.targetData.parent.el
    // The dateKey for the target should be derived from targetParentEl.dataset.dateKey
    // For simplicity, assuming 'dateKey' is the one passed during config creation.
    // A more robust way is to read dataset from targetParentEl if possible.
    const dropTargetDateKey = targetParentEl.dataset.dateKey || dateKey

    if (!droppedEvent || !dropTargetDateKey) return

    let newStart: Date
    let newEnd: Date
    const duration = new Date(droppedEvent.end).getTime() - new Date(droppedEvent.start).getTime()
    const baseDateOfDrop = newDate(dropTargetDateKey)

    // Determine target zone type from the element itself if possible, or rely on zoneType passed to config
    const actualZoneType =
      targetParentEl.dataset.type === "allDay" ? "allDay" : targetParentEl.dataset.type === "timed" ? "timed" : zoneType

    if (actualZoneType === "allDay") {
      newStart = startOfDay(baseDateOfDrop)
      newEnd = droppedEvent.allDay ? new Date(newStart.getTime() + duration) : endOfDay(baseDateOfDrop)
      emit("eventUpdate", { ...droppedEvent, startDate: newStart, endDate: newEnd, allDay: true })
    } else {
      // 'timed'
      newStart = getDropTime(
        event.detail.nativeEvent as PointerEvent,
        targetParentEl,
        baseDateOfDrop,
        props.pixelsPerHour
      )
      newEnd = new Date(newStart.getTime() + duration)
      emit("eventUpdate", { ...droppedEvent, startDate: newStart, endDate: newEnd, allDay: false })
    }
  },
})

watch(
  () => props.weekDaysData,
  newWeekData => {
    const newAllDayDnd: Record<string, DndZoneInstance> = {}
    const newTimedDnd: Record<string, DndZoneInstance> = {}

    newWeekData.forEach(day => {
      // All-day zone
      const allDayEventsRef = ref([...day.allDayEvents])
      const [adParentRef, adValues, adUpdateConfig] = useDragAndDrop(
        allDayEventsRef,
        getDndConfigForWeekZone(day.dateKey, "allDay")
      )
      newAllDayDnd[day.dateKey] = { parentRef: adParentRef, values: adValues, updateConfig: adUpdateConfig }

      // Timed zone
      const timedEventsRef = ref([...day.timedEventsRaw])
      const [tParentRef, tValues, tUpdateConfig] = useDragAndDrop(
        timedEventsRef,
        getDndConfigForWeekZone(day.dateKey, "timed")
      )
      newTimedDnd[day.dateKey] = { parentRef: tParentRef, values: tValues, updateConfig: tUpdateConfig }
    })

    dndAllDayInstances.value = newAllDayDnd
    dndTimedInstances.value = newTimedDnd
  },
  { deep: true, immediate: true }
)
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
          :ref="dndAllDayInstances[day.dateKey]?.parentRef"
          :data-date-key="day.dateKey"
          data-type="allDay"
          class="min-h-[30px] space-y-0.5"
          @click.self="emit('openAddModal', day.date, true, day.date)"
        >
          <div
            v-for="event in dndAllDayInstances[day.dateKey]?.values.value || []"
            :key="event.id"
            :class="[
              'p-1 text-xs rounded cursor-pointer mb-0.5 drag-handle',
              `bg-${event.color}-200 border-${event.color}-400 text-${event.color}-800 dark:bg-${event.color}-700 dark:border-${event.color}-500 dark:text-${event.color}-100`,
            ]"
            @click="emit('openEditModal', event)"
          >
            {{ event.title }}
          </div>
        </div>
        <Button
          variant="ghost"
          size="xs"
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
          @click="emit('openAddModal', day.date, true, day.date)"
          >+</Button
        >
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
          :ref="dndTimedInstances[day.dateKey]?.parentRef"
          :data-date-key="day.dateKey"
          data-type="timed"
          :class="[
            'flex-1 border-r border-border relative min-w-[120px]',
            { 'bg-blue-50/50 dark:bg-blue-900/20': day.isToday },
          ]"
        >
          <div
            v-for="slot in timeSlotsForView"
            :key="slot.time.toISOString()"
            :data-slot-time="slot.dateTimeStr"
            :style="{ height: `${pixelsPerHour}px` }"
            class="border-b border-dashed border-border/50 dark:border-border/30 box-border relative"
            @click.self="emit('openAddModal', slot.time, false, day.date)"
          />

          <template v-for="styledEvent in day.timedEventsStyled" :key="styledEvent.id">
            <div
              v-if="dndTimedInstances[day.dateKey]?.values?.find(e => e.id === styledEvent.id)"
              :style="styledEvent.style"
              :class="[
                'absolute p-1 text-xs rounded cursor-pointer drag-handle overflow-hidden z-[5]',
                `bg-${styledEvent.color}-300 border-${styledEvent.color}-500 text-${styledEvent.color}-900 dark:bg-${styledEvent.color}-600 dark:border-${styledEvent.color}-400 dark:text-${styledEvent.color}-50`,
              ]"
              @click="
                emit('openEditModal', dndTimedInstances[day.dateKey]!.values?.find(e => e.id === styledEvent.id)!)
              "
            >
              <div class="font-semibold">{{ styledEvent.title }}</div>
              <div class="opacity-80">
                {{ format(new Date(styledEvent.startDate), "p") }} - {{ format(new Date(styledEvent.endDate), "p") }}
              </div>
              <div v-if="styledEvent.location" class="truncate opacity-70">{{ styledEvent.location }}</div>
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
