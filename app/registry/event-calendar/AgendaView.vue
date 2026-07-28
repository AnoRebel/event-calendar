<script setup lang="ts">
import { computed } from "vue"
import { format } from "date-fns"
import type { CalendarEvent } from "./types"
import LocationDisplay from "./LocationDisplay.vue"
import { useColorManager } from "./composables/useColorManager"
import { useDragAndDropSystem } from "./composables/useDragAndDrop"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getVisibleRange } from "./utils"

const props = defineProps<{
  events: CalendarEvent[] // Expects events already sorted and filtered by the parent
  currentDate: Date // Current date for month display
}>()

const emit = defineEmits<{
  (e: "openEditModal", event: CalendarEvent): void
}>()

// Initialize color manager
const eventsComputed = computed(() => props.events)
const { getBorderColorClasses } = useColorManager(eventsComputed)

// Initialize drag and drop system for duration display
const { formatEventDuration } = useDragAndDropSystem()

// Month display
const monthDisplay = computed(() => {
  return format(props.currentDate, "MMMM yyyy")
})

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
      dateDisplay: format(new Date(dateStr), "EEEE, MMM d"),
      events: eventsOnDay,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime()) // Ensure days are sorted
})
</script>

<template>
  <div class="space-y-4 p-2">
    <!-- Month Header -->
    <div class="text-center">
      <h2 class="text-lg font-semibold text-foreground">{{ monthDisplay }}</h2>
      <p class="text-sm text-muted-foreground">{{ props.events.length }} events this month</p>
    </div>

    <ScrollArea class="h-[500px]">
      <div v-if="!groupedEvents.length" class="text-muted-foreground text-center py-8">
        No events in {{ monthDisplay.toLowerCase() }}.
      </div>

      <div v-for="group in groupedEvents" :key="group.dateDisplay" class="space-y-2 mb-4">
        <h3 class="text-sm font-semibold text-primary sticky top-0 bg-background/95 py-1 px-2 rounded backdrop-blur-sm border-b">
          {{ group.dateDisplay }}
        </h3>
        
        <div
          v-for="event in group.events"
          :key="event.id"
          :class="[
            'border-l-3 hover:shadow-sm transition-all cursor-pointer rounded-r-md border bg-card p-3',
            event.color ? getBorderColorClasses(event.color) : 'border-gray-500 dark:border-gray-400',
          ]"
          @click="emit('openEditModal', event)"
        >
          <div class="space-y-1">
            <div class="flex items-start justify-between">
              <h4 class="font-medium text-sm leading-tight">{{ event.title }}</h4>
              <span v-if="formatEventDuration(event)" class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2 shrink-0">
                {{ formatEventDuration(event) }}
              </span>
            </div>
            
            <p class="text-xs text-muted-foreground">
              <template v-if="event.allDay">All day</template>
              <template v-else>
                {{ format(new Date(event.startDate), "p") }} - {{ format(new Date(event.endDate), "p") }}
              </template>
            </p>
            
            <p v-if="event.description" class="text-xs text-muted-foreground line-clamp-2">
              {{ event.description }}
            </p>
            
            <div v-if="event.location" class="mt-1">
              <LocationDisplay
                :location="event.location"
                :compact="true"
                :show-tooltip="true"
                :icon-size="12"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
