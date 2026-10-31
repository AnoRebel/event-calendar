<script setup lang="ts">
import { computed, ref } from "vue"
import { endOfDay, format, isSameDay, isWithinInterval, startOfDay, subMilliseconds } from "date-fns"
import { useMediaQuery } from "@vueuse/core"
import { Plus } from "lucide-vue-next"
import type { CalendarEvent, MonthViewDay } from "./types"
import { useColorManager } from "./composables/useColorManager"
import { useEventStatus } from "./composables/useEventStatus"
import { usePointerDrag } from "./composables/usePointerDrag"
import { moveToDay } from "./composables/useTimeGrid"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const props = defineProps<{
  days: MonthViewDay[]
  /** Kept for API compatibility with the other views; unused here. */
  pixelsPerHour?: number
}>()

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
  /** A day was chosen (phones): the calendar opens it in the day view. */
  (e: "openDay", date: Date): void
}>()

const MAX_CHIPS = 3
const isPhone = useMediaQuery("(max-width: 639px)")

const allEvents = computed(() => {
  const seen = new Map<string, CalendarEvent>()
  for (const day of props.days) for (const e of day.events) seen.set(e.id, e)
  return [...seen.values()]
})
const { getColorClasses } = useColorManager(allEvents)
const { getEventStatusClasses, getEventStatusTooltip } = useEventStatus(allEvents)

// Static class names (Tailwind can't see dynamically built ones like `bg-${color}-500`).
const DOT: Record<string, string> = {
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
}
const dotClass = (event: CalendarEvent) => DOT[event.color ?? ""] ?? "bg-muted-foreground"

// --- Drag between days (pointer events) -------------------------------------------
const drag = usePointerDrag({
  events: allEvents,
  resolve: (event, x, y) => {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-month-cell]")
    return cell ? moveToDay(event, cell.dataset.dateKey!) : null
  },
  commit: event => emit("eventUpdate", event),
})

// An event shows on a day when it overlaps it; an event ending exactly at midnight
// does not spill into the next day.
const coversDay = (event: CalendarEvent, day: Date) => {
  const start = startOfDay(new Date(event.startDate))
  const endRaw = new Date(event.endDate)
  const end = endRaw > new Date(event.startDate) ? subMilliseconds(endRaw, 1) : endRaw
  return isWithinInterval(day, { start, end: endOfDay(end) })
}
const isMultiDay = (event: CalendarEvent) => !isSameDay(new Date(event.startDate), subMilliseconds(new Date(event.endDate), 1))

// Per day: events with the drag preview applied, multi-day/all-day first.
const cells = computed(() => {
  const moved = drag.current()
  return props.days.map(day => {
    let events = moved ? day.events.filter(e => e.id !== moved.id) : day.events
    if (moved && coversDay(moved, day.date)) events = [...events, moved]
    events = [...events].sort((a, b) => {
      const spanA = isMultiDay(a) || a.allDay ? 0 : 1
      const spanB = isMultiDay(b) || b.allDay ? 0 : 1
      return spanA - spanB || new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })
    return { day, key: format(day.date, "yyyy-MM-dd"), events }
  })
})

const weekdays = computed(() => props.days.slice(0, 7).map(d => d.date))
const rows = computed(() => Math.ceil(props.days.length / 7))

const onCellClick = (date: Date) => {
  if (drag.shouldSuppressClick()) return
  if (isPhone.value) emit("openDay", date)
  else emit("openAddModal", date)
}
const openEvent = (event: CalendarEvent) => {
  if (!drag.shouldSuppressClick()) emit("openEditModal", event)
}
const openMore = ref<string | null>(null)

const chipClasses = (event: CalendarEvent, date: Date) => {
  const spans = isMultiDay(event) || event.allDay
  const startsHere = isSameDay(new Date(event.startDate), date)
  const endsHere = isSameDay(subMilliseconds(new Date(event.endDate), 1), date) || !isMultiDay(event)
  return cn(
    "calendar-event flex w-full min-w-0 cursor-grab items-center gap-1.5 px-1.5 py-0.5 text-left text-xs leading-5 outline-none select-none touch-pan-y [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-ring",
    getEventStatusClasses(event),
    spans
      ? cn(
          "border font-medium",
          event.color ? getColorClasses(event.color) : "bg-muted border-border",
          startsHere ? "rounded-l-md" : "-ml-1.5 rounded-l-none border-l-0 pl-3",
          endsHere ? "rounded-r-md" : "-mr-1.5 rounded-r-none border-r-0",
        )
      : "rounded-md hover:bg-accent",
    drag.dragging.value?.id === event.id && "pointer-events-none opacity-90 ring-2 ring-ring",
  )
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="month-view">
    <div class="grid grid-cols-7 border-b bg-muted/40">
      <div
        v-for="day in weekdays"
        :key="day.toISOString()"
        class="py-2 text-center text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        <span class="sm:hidden">{{ format(day, "EEEEE") }}</span>
        <span class="max-sm:hidden">{{ format(day, "EEE") }}</span>
      </div>
    </div>

    <div
      class="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto overscroll-contain"
      :class="drag.dragging.value && 'cursor-grabbing select-none'"
      :style="{ gridTemplateRows: `repeat(${rows}, minmax(${isPhone ? '3.75rem' : '7rem'}, 1fr))` }"
    >
      <div
        v-for="cell in cells"
        :key="cell.key"
        data-month-cell
        :data-date-key="cell.key"
        class="group/cell relative flex min-w-0 flex-col gap-0.5 border-r border-b p-1 transition-colors [&:nth-child(7n)]:border-r-0"
        :class="[
          !cell.day.isCurrentMonth && 'bg-muted/40 text-muted-foreground',
          drag.dragging.value && drag.current() && coversDay(drag.current()!, cell.day.date) && 'bg-accent/50',
        ]"
        @click="onCellClick(cell.day.date)"
      >
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="grid size-7 place-items-center rounded-full font-[family-name:var(--font-family-numeric,inherit)] text-sm tabular-nums hover:bg-accent"
            :class="cell.day.isToday && 'bg-primary font-semibold text-primary-foreground hover:bg-primary'"
            :aria-label="format(cell.day.date, 'EEEE, MMMM d')"
            :aria-current="cell.day.isToday ? 'date' : undefined"
            @click.stop="emit('openDay', cell.day.date)"
          >
            {{ format(cell.day.date, "d") }}
          </button>
          <button
            type="button"
            class="grid size-6 place-items-center rounded-full text-primary opacity-0 transition-opacity group-hover/cell:opacity-100 hover:bg-accent focus-visible:opacity-100 max-sm:hidden"
            :aria-label="`Add event on ${format(cell.day.date, 'EEEE, MMMM d')}`"
            @click.stop="emit('openAddModal', cell.day.date)"
          >
            <Plus class="size-3.5" />
          </button>
        </div>

        <!-- Phones: colour dots (tap the day to open it). -->
        <div v-if="cell.events.length" class="flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden="true">
          <span v-for="event in cell.events.slice(0, 4)" :key="event.id" class="size-1.5 rounded-full" :class="dotClass(event)" />
          <span v-if="cell.events.length > 4" class="text-[0.6rem] leading-none">+</span>
        </div>

        <!-- Wider screens: event chips -->
        <div class="grid min-w-0 gap-0.5 max-sm:hidden">
          <div
            v-for="event in cell.events.slice(0, MAX_CHIPS)"
            :key="event.id"
            role="button"
            tabindex="0"
            :data-event-id="event.id"
            :title="getEventStatusTooltip(event) || event.title"
            :class="chipClasses(event, cell.day.date)"
            @pointerdown="drag.start(event, $event)"
            @click.stop="openEvent(event)"
            @keydown.enter.prevent="openEvent(event)"
          >
            <template v-if="isMultiDay(event) || event.allDay">
              <span class="truncate">{{ event.title }}</span>
            </template>
            <template v-else>
              <span class="size-2 shrink-0 rounded-full" :class="dotClass(event)" aria-hidden="true" />
              <span class="shrink-0 text-muted-foreground tabular-nums">{{ format(new Date(event.startDate), "p").replace(":00", "") }}</span>
              <span class="truncate font-medium">{{ event.title }}</span>
            </template>
          </div>

          <Popover
            v-if="cell.events.length > MAX_CHIPS"
            :open="openMore === cell.key"
            @update:open="open => (openMore = open ? cell.key : null)"
          >
            <PopoverTrigger as-child>
              <button
                type="button"
                class="w-full rounded-md px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                @click.stop
              >
                {{ cell.events.length - MAX_CHIPS }} more
              </button>
            </PopoverTrigger>
            <PopoverContent class="w-64 p-2" align="start" @click.stop>
              <p class="mb-2 px-1 text-sm font-semibold">{{ format(cell.day.date, "EEEE, MMMM d") }}</p>
              <div class="grid gap-1">
                <button
                  v-for="event in cell.events"
                  :key="event.id"
                  type="button"
                  class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  @click="openMore = null; emit('openEditModal', event)"
                >
                  <span class="size-2 shrink-0 rounded-full" :class="dotClass(event)" aria-hidden="true" />
                  <span class="min-w-0 flex-1 truncate">{{ event.title }}</span>
                  <span class="shrink-0 text-xs text-muted-foreground">
                    {{ event.allDay ? "All day" : format(new Date(event.startDate), "p") }}
                  </span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  </div>
</template>
