<script setup lang="ts">
import type { CalendarEvent, DayColumnData } from "./types"
import TimeGrid from "./TimeGrid.vue"

// A single day column on the shared time grid.
defineProps<{
  dayData: DayColumnData
  pixelsPerHour?: number
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()
</script>

<template>
  <TimeGrid
    :days="[dayData]"
    :pixels-per-hour="pixelsPerHour"
    @open-add-modal="(...args) => emit('openAddModal', ...args)"
    @open-edit-modal="event => emit('openEditModal', event)"
    @event-update="event => emit('eventUpdate', event)"
  />
</template>
