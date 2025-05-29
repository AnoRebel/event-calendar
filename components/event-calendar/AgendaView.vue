<script setup lang="ts">
import { format } from "date-fns"
import type { CalendarEvent } from "./types" // Adjust path

const props = defineProps<{
  events: CalendarEvent[] // Expects events already sorted and filtered by the parent
}>()

const emit = defineEmits<{
  (e: "openEditModal", event: CalendarEvent): void
}>()

// Helper to group events by day for clearer display in agenda
const groupedEvents = computed(() => {
  if (!props.events || props.events.length === 0) return []

  const groups: Record<string, CalendarEvent[]> = {}
  props.events.forEach(event => {
    const dayKey = format(new Date(event.startDate), "yyyy-MM-dd")
    if (!groups[dayKey]) {
      groups[dayKey] = []
    }
    groups[dayKey].push(event)
  })

  return Object.entries(groups)
    .map(([dateStr, eventsOnDay]) => ({
      date: new Date(dateStr), // Store actual date object for formatting
      dateDisplay: format(new Date(dateStr), "EEEE, MMMM d, yyyy"),
      events: eventsOnDay,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime()) // Ensure days are sorted
})
</script>

<template>
  <div class="space-y-6 p-2 sm:p-4">
    <div v-if="!groupedEvents.length" class="text-muted-foreground text-center py-8">No upcoming events.</div>

    <div v-for="group in groupedEvents" :key="group.dateDisplay" class="space-y-3">
      <h3 class="text-lg font-semibold text-primary sticky top-0 bg-background/90 py-2 z-10 backdrop-blur-sm">
        {{ group.dateDisplay }}
      </h3>
      <Card
        v-for="event in group.events"
        :key="event.id"
        :class="[
          `border-l-4 hover:shadow-md transition-shadow cursor-pointer`,
          `border-${event.color}-500 dark:border-${event.color}-400`,
        ]"
        @click="emit('openEditModal', event)"
      >
        <CardHeader class="pb-2 pt-3">
          <CardTitle class="text-md sm:text-lg">{{ event.title }}</CardTitle>
        </CardHeader>
        <CardContent class="pb-3">
          <p class="text-sm text-muted-foreground">
            <template v-if="event.allDay"> All day </template>
            <template v-else>
              {{ format(new Date(event.startDate), "p") }} - {{ format(new Date(event.endDate), "p") }}
            </template>
          </p>
          <p v-if="event.description" class="text-sm mt-1 whitespace-pre-wrap">
            {{ event.description }}
          </p>
          <p v-if="event.location" class="text-sm mt-1 text-muted-foreground flex items-center">
            <Icon name="lucide:map-pin" class="mr-1 h-4 w-4 shrink-0" />
            {{ event.location }}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
