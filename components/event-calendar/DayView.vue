<script setup lang="ts">
import { ref, computed, watch, type Ref } from "vue"
import { format, startOfDay, endOfDay } from "date-fns" // Added newDate
import { useDragAndDrop, type VueParentConfig } from "@formkit/drag-and-drop/vue"
import type { DragendEvent } from "@formkit/drag-and-drop"
import type { CalendarEvent, DayColumnData, TimeSlot } from "./types"
import { useCalendarUtils } from "./composables/useCalendarUtils"

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
  parentRef: Ref<HTMLElement | null>
  values: Ref<CalendarEvent[]>
  updateConfig: (config: Partial<VueParentConfig<CalendarEvent>>) => void
}
const dndAllDayInstance = ref<DndInstance | null>(null)
const dndTimedInstance = ref<DndInstance | null>(null)

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

const getDndConfigForDayZone = (zoneType: "allDay" | "timed"): Partial<VueParentConfig<CalendarEvent>> => ({
  group: "calendarEventsDay",
  // dragHandle: '.drag-handle',
  onDragend: (event: DragendEvent) => {
    const droppedEvent = event.detail.targetData.value
    const targetParentEl = event.detail.targetData.parent.el
    const dropTargetDateKey = props.dayData.dateKey // DayView uses its own dateKey

    if (!droppedEvent || !dropTargetDateKey) return

    let newStart: Date
    let newEnd: Date
    const duration = new Date(droppedEvent.end).getTime() - new Date(droppedEvent.start).getTime()
    const baseDateOfDrop = new Date(dropTargetDateKey)

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
  () => props.dayData,
  newDayData => {
    // All-day zone
    const allDayEventsRef = ref([...newDayData.allDayEvents])
    const [adParentRef, adValues, adUpdateConfig] = useDragAndDrop(allDayEventsRef, getDndConfigForDayZone("allDay"))
    dndAllDayInstance.value = { parentRef: adParentRef, values: adValues, updateConfig: adUpdateConfig }

    // Timed zone
    const timedEventsRef = ref([...newDayData.timedEventsRaw])
    const [tParentRef, tValues, tUpdateConfig] = useDragAndDrop(timedEventsRef, getDndConfigForDayZone("timed"))
    dndTimedInstance.value = { parentRef: tParentRef, values: tValues, updateConfig: tUpdateConfig }
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
          :ref="dndAllDayInstance?.parentRef"
          :data-date-key="processedDayData.dateKey"
          data-type="allDay"
          class="min-h-[30px] space-y-0.5"
          @click.self="emit('openAddModal', processedDayData.date, true, processedDayData.date)"
        >
          <div
            v-for="event in dndAllDayInstance?.values || []"
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
          size="sm"
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
          @click="emit('openAddModal', processedDayData.date, true, processedDayData.date)"
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
      <div
        :ref="dndTimedInstance?.parentRef"
        :data-date-key="processedDayData.dateKey"
        data-type="timed"
        :class="[
          'flex-1 border-r border-border relative',
          { 'bg-blue-50/50 dark:bg-blue-900/20': processedDayData.isToday },
        ]"
      >
        <div
          v-for="slot in timeSlotsForView"
          :key="slot.time.toISOString()"
          :data-slot-time="slot.dateTimeStr"
          :style="{ height: `${pixelsPerHour}px` }"
          class="border-b border-dashed border-border/50 dark:border-border/30 box-border relative"
          @click.self="emit('openAddModal', slot.time, false, processedDayData.date)"
        />

        <template v-for="styledEvent in processedDayData.timedEventsStyled" :key="styledEvent.id">
          <div
            v-if="dndTimedInstance?.values.find(e => e.id === styledEvent.id)"
            :style="styledEvent.style"
            :class="[
              'absolute p-1 text-xs rounded cursor-pointer drag-handle overflow-hidden z-[5]',
              `bg-${styledEvent.color}-300 border-${styledEvent.color}-500 text-${styledEvent.color}-900 dark:bg-${styledEvent.color}-600 dark:border-${styledEvent.color}-400 dark:text-${styledEvent.color}-50`,
            ]"
            @click="emit('openEditModal', dndTimedInstance!.values.find(e => e.id === styledEvent.id)!)"
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
