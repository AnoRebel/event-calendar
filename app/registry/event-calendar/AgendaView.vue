<script setup lang="ts">
import { computed } from "vue"
import { format, isToday } from "date-fns"
import { CalendarX2, MapPin } from "lucide-vue-next"
import type { CalendarEvent } from "./types"
import { useColorManager } from "./composables/useColorManager"
import { useEventStatus } from "./composables/useEventStatus"
import { dayFromKey } from "./composables/useTimeGrid"

const props = defineProps<{
  events: CalendarEvent[] // Already filtered to the visible range by the parent
  currentDate: Date
}>()

const emit = defineEmits<{
  (e: "openEditModal", event: CalendarEvent): void
}>()

const eventsComputed = computed(() => props.events)
const { getBorderColorClasses } = useColorManager(eventsComputed)
const { getEventStatusClasses, getEventStatusTooltip } = useEventStatus(eventsComputed)

// Events grouped by their (local) start day, days in order, events by start time.
const groups = computed(() => {
  const byDay = new Map<string, CalendarEvent[]>()
  for (const event of props.events) {
    const key = format(new Date(event.startDate), "yyyy-MM-dd")
    byDay.set(key, [...(byDay.get(key) ?? []), event])
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, events]) => ({
      key,
      date: dayFromKey(key),
      events: events.sort(
        (a, b) => Number(!a.allDay) - Number(!b.allDay) || new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    }))
})

const timeRange = (event: CalendarEvent) =>
  event.allDay ? "All day" : `${format(new Date(event.startDate), "p")} – ${format(new Date(event.endDate), "p")}`
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="agenda-view">
    <div v-if="!groups.length" class="flex flex-col items-center gap-2 px-6 py-20 text-center text-muted-foreground">
      <CalendarX2 class="size-8" aria-hidden="true" />
      <p class="m-0 text-sm">Nothing scheduled in {{ format(currentDate, "MMMM yyyy") }}.</p>
    </div>

    <ol v-else class="m-0 list-none p-0">
      <li v-for="group in groups" :key="group.key" class="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 border-b px-3 py-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:px-4">
        <div class="sticky top-3 self-start text-center" :aria-current="isToday(group.date) ? 'date' : undefined">
          <div class="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">{{ format(group.date, "EEE") }}</div>
          <div
            class="mx-auto grid size-10 place-items-center rounded-full font-[family-name:var(--font-family-numeric,inherit)] text-xl font-semibold tabular-nums"
            :class="isToday(group.date) && 'bg-primary text-primary-foreground'"
          >
            {{ format(group.date, "d") }}
          </div>
          <div class="text-[0.7rem] text-muted-foreground">{{ format(group.date, "MMM") }}</div>
        </div>

        <ul class="m-0 grid list-none gap-2 p-0">
          <li v-for="event in group.events" :key="event.id">
            <button
              type="button"
              :title="getEventStatusTooltip(event) || undefined"
              :class="[
                'w-full rounded-lg border border-l-4 bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                event.color ? getBorderColorClasses(event.color) : 'border-l-muted-foreground',
                getEventStatusClasses(event),
              ]"
              @click="emit('openEditModal', event)"
            >
              <span class="block truncate text-sm font-semibold">{{ event.title }}</span>
              <span class="block text-xs text-muted-foreground tabular-nums">{{ timeRange(event) }}</span>
              <span v-if="event.location" class="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin class="size-3 shrink-0" aria-hidden="true" />{{ event.location }}
              </span>
              <span v-if="event.description" class="mt-1 line-clamp-2 block text-xs text-muted-foreground">{{ event.description }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ol>
  </div>
</template>
