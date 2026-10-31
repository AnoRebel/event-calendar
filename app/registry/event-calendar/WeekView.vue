<script setup lang="ts">
import type { CalendarEvent, DayColumnData } from "./types"
import TimeGrid from "./TimeGrid.vue"

// Seven day columns. On narrow screens the columns keep a readable width and the
// grid scrolls sideways with the hour gutter pinned.
defineProps<{
  weekDaysData: DayColumnData[]
  pixelsPerHour?: number
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()
</script>

<template>
  <TimeGrid
    :days="weekDaysData"
    :pixels-per-hour="pixelsPerHour"
    min-column-width="6.5rem"
    @open-add-modal="(...args) => emit('openAddModal', ...args)"
    @open-edit-modal="event => emit('openEditModal', event)"
    @event-update="event => emit('eventUpdate', event)"
  />
</template>
