<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue"
import { addMinutes, differenceInMinutes, format, isSameDay, startOfDay } from "date-fns"
import { useIntervalFn, useNow } from "@vueuse/core"
import { MapPin, Plus } from "@lucide/vue"
import type { CalendarEvent, DayColumnData } from "./types"
import { useColorManager } from "./composables/useColorManager"
import { useEventStatus } from "./composables/useEventStatus"
import { layoutDay, moveToAllDay, moveToTime, resizeEvent, snapMinutes } from "./composables/useTimeGrid"
import { cn } from "@/lib/utils"

// The time grid behind both the week and day views: one implementation of event
// positioning, overlap lanes, click-to-add, pointer-driven move and resize.
//
// Moving and resizing use pointer events (mouse, pen and touch alike): the event
// follows the pointer as a live preview — overlapping events re-flow around it —
// and a single update is emitted on release.
const props = withDefaults(
  defineProps<{
    days: DayColumnData[]
    pixelsPerHour?: number
    /** Minimum column width; narrower viewports scroll sideways. */
    minColumnWidth?: string
  }>(),
  { pixelsPerHour: 60, minColumnWidth: "0px" },
)

const emit = defineEmits<{
  (e: "openAddModal", date: Date, isAllDaySlot?: boolean, allDayTargetDate?: Date): void
  (e: "openEditModal" | "eventUpdate", event: CalendarEvent): void
}>()

const allEvents = computed(() => props.days.flatMap(day => [...day.allDayEvents, ...day.timedEventsRaw]))
const { getColorClasses } = useColorManager(allEvents)
const { getEventStatusClasses, getEventStatusTooltip } = useEventStatus(allEvents)

const pxPerMinute = computed(() => props.pixelsPerHour / 60)
const gridHeight = computed(() => props.pixelsPerHour * 24)
const hours = Array.from({ length: 24 }, (_, h) => h)
const hourLabel = (h: number) => format(new Date(2000, 0, 1, h), "h a")
const time = (d: Date | string) => new Date(d).getTime()

// --- Gesture state -------------------------------------------------------------------
type Gesture =
  | {
      kind: "pending-move"
      event: CalendarEvent
      pointerId: number
      x: number
      y: number
      grabMinutes: number
      pointerType: string
      /** Set when the press began on a resize edge (touch waits for a hold first). */
      resizeEdge?: "start" | "end"
      timer?: ReturnType<typeof setTimeout>
    }
  | { kind: "move"; event: CalendarEvent; pointerId: number; grabMinutes: number }
  | { kind: "resize"; event: CalendarEvent; pointerId: number; edge: "start" | "end"; y: number }

const gesture = shallowRef<Gesture | null>(null)
/** The in-flight version of the event being moved or resized. */
const preview = shallowRef<CalendarEvent | null>(null)
/**
 * The last committed move/resize, shown until the host's updated events arrive
 * (so the event never flashes back to its old slot). Cleared when props catch up,
 * or after a few seconds if the host rejected the change.
 */
const committed = shallowRef<CalendarEvent | null>(null)
let committedTimer: ReturnType<typeof setTimeout> | undefined
/** Swallows the click that the browser fires after a drag or resize. */
let suppressClick = false
const scroller = ref<HTMLElement | null>(null)

let frame = 0
let lastPointer: { x: number; y: number } | null = null

// While a touch drag is active, stop the page from scrolling under the finger.
const blockTouchScroll = (e: TouchEvent) => {
  if (gesture.value && gesture.value.kind !== "pending-move") e.preventDefault()
}
onMounted(() => document.addEventListener("touchmove", blockTouchScroll, { passive: false }))
onBeforeUnmount(() => {
  document.removeEventListener("touchmove", blockTouchScroll)
  cancelAnimationFrame(frame)
  stopListening()
})

function listen() {
  window.addEventListener("pointermove", onPointerMove, { passive: true })
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerCancel)
}
function stopListening() {
  window.removeEventListener("pointermove", onPointerMove)
  window.removeEventListener("pointerup", onPointerUp)
  window.removeEventListener("pointercancel", onPointerCancel)
}

const minutesInColumn = (clientY: number, column: Element) =>
  (clientY - column.getBoundingClientRect().top) / pxPerMinute.value

/** Press on an event: becomes a move after a small drag (mouse) or a short hold (touch). */
function onEventPointerDown(event: CalendarEvent, e: PointerEvent) {
  if (e.button !== 0) return
  const column = (e.currentTarget as HTMLElement).closest("[data-type]")
  const grabMinutes = event.allDay || !column
    ? 0
    : minutesInColumn(e.clientY, column) - differenceInMinutes(new Date(event.startDate), startOfDay(new Date(event.startDate)))
  const pending: Gesture = { kind: "pending-move", event, pointerId: e.pointerId, x: e.clientX, y: e.clientY, grabMinutes, pointerType: e.pointerType }
  if (e.pointerType !== "mouse") {
    // Touch/pen: a hold starts the drag; moving first means the user is scrolling.
    pending.timer = setTimeout(() => {
      if (gesture.value === pending) beginMove(pending)
    }, 250)
  }
  gesture.value = pending
  listen()
}

function beginMove(g: Extract<Gesture, { kind: "pending-move" }>) {
  clearTimeout(g.timer)
  if (g.resizeEdge) {
    gesture.value = { kind: "resize", event: g.event, pointerId: g.pointerId, edge: g.resizeEdge, y: g.y }
    preview.value = g.event
    navigator.vibrate?.(10)
    return
  }
  gesture.value = { kind: "move", event: g.event, pointerId: g.pointerId, grabMinutes: g.grabMinutes }
  preview.value = g.event
  navigator.vibrate?.(10)
}

function onResizePointerDown(event: CalendarEvent, edge: "start" | "end", e: PointerEvent) {
  if (e.button !== 0) return
  e.stopPropagation()
  if (e.pointerType === "mouse") {
    e.preventDefault()
    gesture.value = { kind: "resize", event, pointerId: e.pointerId, edge, y: e.clientY }
    preview.value = event
  } else {
    // Touch/pen: like moving, resizing needs a short hold, so a scroll that
    // happens to start on an edge still scrolls.
    const pending: Gesture = { kind: "pending-move", event, pointerId: e.pointerId, x: e.clientX, y: e.clientY, grabMinutes: 0, pointerType: e.pointerType, resizeEdge: edge }
    pending.timer = setTimeout(() => {
      if (gesture.value === pending) beginMove(pending)
    }, 250)
    gesture.value = pending
  }
  listen()
}

function onPointerMove(e: PointerEvent) {
  const g = gesture.value
  if (!g || e.pointerId !== g.pointerId) return
  if (g.kind === "pending-move") {
    const moved = Math.hypot(e.clientX - g.x, e.clientY - g.y)
    if (g.pointerType === "mouse" && moved > 4) beginMove(g)
    else if (g.pointerType !== "mouse" && moved > 8) {
      // Moved before the hold completed: it's a scroll, not a drag.
      clearTimeout(g.timer)
      gesture.value = null
      stopListening()
    }
    return
  }
  lastPointer = { x: e.clientX, y: e.clientY }
  // One layout update per frame, however fast pointer events arrive.
  if (!frame) frame = requestAnimationFrame(applyPointer)
}

function applyPointer() {
  frame = 0
  const g = gesture.value
  if (!g || !lastPointer) return
  const { x, y } = lastPointer

  if (g.kind === "resize") {
    preview.value = resizeEvent(g.event, g.edge, (y - g.y) / pxPerMinute.value)
  } else if (g.kind === "move") {
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-type][data-date-key]")
    if (zone && scroller.value?.contains(zone)) {
      const dateKey = zone.dataset.dateKey!
      preview.value =
        zone.dataset.type === "allDay"
          ? moveToAllDay(g.event, dateKey)
          : moveToTime(g.event, dateKey, minutesInColumn(y, zone) - g.grabMinutes)
    }
  }
  autoScroll(y)
}

// Scroll the grid while the pointer is held near its top or bottom edge.
function autoScroll(y: number) {
  const el = scroller.value
  if (!el || !gesture.value || gesture.value.kind === "pending-move") return
  const rect = el.getBoundingClientRect()
  const edge = 48
  const speed = y < rect.top + edge ? -(rect.top + edge - y) / 3 : y > rect.bottom - edge ? (y - (rect.bottom - edge)) / 3 : 0
  if (speed) {
    el.scrollTop += speed
    if (!frame) frame = requestAnimationFrame(applyPointer)
  }
}

function onPointerUp(e: PointerEvent) {
  const g = gesture.value
  if (!g || e.pointerId !== g.pointerId) return
  if (g.kind !== "pending-move") {
    if (frame) {
      cancelAnimationFrame(frame)
      frame = 0
      applyPointer()
    }
    const next = preview.value
    if (next && (time(next.startDate) !== time(g.event.startDate) || time(next.endDate) !== time(g.event.endDate) || !!next.allDay !== !!g.event.allDay)) {
      committed.value = next
      clearTimeout(committedTimer)
      committedTimer = setTimeout(() => (committed.value = null), 4000)
      emit("eventUpdate", next)
    }
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
  } else {
    clearTimeout(g.timer)
  }
  endGesture()
}

function onPointerCancel(e: PointerEvent) {
  if (gesture.value && e.pointerId === gesture.value.pointerId) endGesture()
}

function endGesture() {
  const g = gesture.value
  if (g?.kind === "pending-move") clearTimeout(g.timer)
  gesture.value = null
  preview.value = null
  lastPointer = null
  stopListening()
}

const activeId = computed(() => (gesture.value && gesture.value.kind !== "pending-move" ? gesture.value.event.id : null))
const isDragging = computed(() => gesture.value?.kind === "move")

// Escape cancels a drag or resize.
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && activeId.value) endGesture()
}
onMounted(() => window.addEventListener("keydown", onKeydown))
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown))

watch(allEvents, events => {
  const c = committed.value
  const incoming = c && events.find(e => e.id === c.id)
  if (incoming && time(incoming.startDate) === time(c.startDate) && time(incoming.endDate) === time(c.endDate)) {
    committed.value = null
  }
})

// --- Columns: events per day (with the live preview applied) and their lanes ------
const columns = computed(() => {
  const p = preview.value ?? committed.value
  return props.days.map(day => {
    const timed = day.timedEventsRaw.filter(e => e.id !== p?.id)
    const allDay = day.allDayEvents.filter(e => e.id !== p?.id)
    if (p && isSameDay(new Date(p.startDate), day.date)) (p.allDay ? allDay : timed).push(p)
    // Keep a timed preview that spans midnight visible on the following days too.
    else if (p && !p.allDay && new Date(p.startDate) < day.date && new Date(p.endDate) > day.date) timed.push(p)
    return { day, allDay, laid: layoutDay(timed, day.date) }
  })
})

// --- Click to add ----------------------------------------------------------------------
const addAt = (day: DayColumnData, e: MouseEvent) => {
  if (suppressClick || activeId.value) return
  const minutes = snapMinutes(minutesInColumn(e.clientY, e.currentTarget as HTMLElement), 30)
  emit("openAddModal", addMinutes(startOfDay(day.date), minutes))
}

const openEvent = (event: CalendarEvent) => {
  if (!suppressClick) emit("openEditModal", event)
}

// --- Now line + initial scroll --------------------------------------------------------
// Ticks once a minute (VueUse 15 takes the interval as a scheduler).
const now = useNow({ scheduler: cb => useIntervalFn(cb, 60_000) })
const nowTop = computed(() => differenceInMinutes(now.value, startOfDay(now.value)) * pxPerMinute.value)

const scrollToWorkingHours = async () => {
  await nextTick()
  if (!scroller.value) return
  const showsToday = props.days.some(d => isSameDay(d.date, now.value))
  const minutes = showsToday ? Math.max(0, differenceInMinutes(now.value, startOfDay(now.value)) - 90) : 7 * 60
  scroller.value.scrollTop = minutes * pxPerMinute.value
}
onMounted(scrollToWorkingHours)
watch(() => props.days[0]?.dateKey, scrollToWorkingHours)

const eventClasses = (event: CalendarEvent) =>
  cn(
    "calendar-event group/event overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs leading-tight shadow-sm outline-none select-none [-webkit-touch-callout:none]",
    "focus-visible:ring-2 focus-visible:ring-ring hover:shadow-md cursor-grab",
    getEventStatusClasses(event),
    event.color ? getColorClasses(event.color) : "bg-muted border-border text-foreground",
  )

const gridStyle = computed(() => ({
  gridTemplateColumns: `3.5rem repeat(${props.days.length}, minmax(${props.minColumnWidth}, 1fr))`,
}))
</script>

<template>
  <div
    ref="scroller"
    class="relative min-h-0 flex-1 overflow-auto overscroll-contain"
    :class="isDragging && 'cursor-grabbing select-none'"
    data-testid="time-grid"
  >
    <div class="grid min-w-full" :style="gridStyle">
      <!-- Sticky header: day names + all-day row (subgrid keeps the columns aligned). -->
      <div class="sticky top-0 z-30 col-span-full grid grid-cols-subgrid border-b bg-card">
        <div class="sticky left-0 z-10 border-r bg-card" />
        <div
          v-for="day in days"
          :key="`head-${day.dateKey}`"
          class="flex flex-col items-center gap-0.5 border-r py-2 last:border-r-0"
          :aria-current="day.isToday ? 'date' : undefined"
        >
          <span class="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">{{ format(day.date, "EEE") }}</span>
          <span
            class="grid size-8 place-items-center rounded-full font-[family-name:var(--font-family-numeric,inherit)] text-base font-semibold tabular-nums"
            :class="day.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'"
          >{{ format(day.date, "d") }}</span>
        </div>

        <div class="sticky left-0 z-10 flex items-center justify-center border-t border-r bg-card px-1 text-[0.65rem] text-muted-foreground">
          All day
        </div>
        <div
          v-for="{ day, allDay } in columns"
          :key="`allday-${day.dateKey}`"
          class="group/allday relative min-h-9 border-t border-r p-1 pr-7 last:border-r-0"
          :class="isDragging && 'bg-accent/30'"
          data-type="allDay"
          :data-date-key="day.dateKey"
        >
          <div class="grid gap-0.5">
            <div
              v-for="event in allDay"
              :key="event.id"
              role="button"
              tabindex="0"
              :data-event-id="event.id"
              :title="getEventStatusTooltip(event) || event.title"
              :class="cn(eventClasses(event), 'w-full touch-pan-y truncate py-0.5 font-medium', activeId === event.id && 'pointer-events-none opacity-80 ring-2 ring-ring')"
              @pointerdown="onEventPointerDown(event, $event)"
              @click.stop="openEvent(event)"
              @keydown.enter.prevent="openEvent(event)"
            >
              {{ event.title }}
            </div>
          </div>
          <button
            type="button"
            class="absolute top-1 right-1 grid size-6 place-items-center rounded-full text-primary opacity-60 transition-opacity group-hover/allday:opacity-100 hover:bg-accent focus-visible:opacity-100 sm:opacity-0"
            :aria-label="`Add an all-day event on ${format(day.date, 'EEEE, MMMM d')}`"
            @click="emit('openAddModal', day.date, true, day.date)"
          >
            <Plus class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- Hour gutter -->
      <div class="sticky left-0 z-20 border-r bg-card" :style="{ height: `${gridHeight}px` }" aria-hidden="true">
        <div v-for="h in hours" :key="h" class="relative" :style="{ height: `${pixelsPerHour}px` }">
          <span v-if="h > 0" class="absolute -top-2 right-1.5 text-[0.65rem] whitespace-nowrap text-muted-foreground tabular-nums">
            {{ hourLabel(h) }}
          </span>
        </div>
      </div>

      <!-- Day columns -->
      <div
        v-for="{ day, laid } in columns"
        :key="`col-${day.dateKey}`"
        class="relative border-r last:border-r-0"
        :class="day.isToday && 'bg-primary/[0.035]'"
        :style="{
          height: `${gridHeight}px`,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${pixelsPerHour - 1}px, var(--border) ${pixelsPerHour - 1}px, var(--border) ${pixelsPerHour}px)`,
        }"
        data-type="timed"
        :data-date-key="day.dateKey"
        :aria-label="format(day.date, 'EEEE, MMMM d')"
        @click="addAt(day, $event)"
      >
        <div
          v-for="item in laid"
          :key="item.event.id"
          role="button"
          tabindex="0"
          :data-event-id="item.event.id"
          :title="getEventStatusTooltip(item.event) || undefined"
          :aria-label="`${item.event.title}, ${format(new Date(item.event.startDate), 'p')} to ${format(new Date(item.event.endDate), 'p')}`"
          :class="[
            eventClasses(item.event),
            'absolute touch-pan-y',
            activeId === item.event.id ? 'pointer-events-none z-40 shadow-lg ring-2 ring-ring' : 'z-10 hover:z-30',
          ]"
          :style="{
            top: `${item.top * pxPerMinute}px`,
            height: `${Math.max(18, (item.bottom - item.top) * pxPerMinute - 2)}px`,
            left: `calc(${(item.lane / item.lanes) * 100}% + 2px)`,
            width: `calc(${100 / item.lanes}% - 4px)`,
          }"
          @pointerdown="onEventPointerDown(item.event, $event)"
          @click.stop="openEvent(item.event)"
          @keydown.enter.prevent="openEvent(item.event)"
          @keydown.space.prevent="openEvent(item.event)"
        >
          <span class="block truncate font-semibold">{{ item.event.title }}</span>
          <span v-if="item.bottom - item.top >= 40" class="block truncate opacity-80 tabular-nums">
            {{ format(new Date(item.event.startDate), "p") }} – {{ format(new Date(item.event.endDate), "p") }}
          </span>
          <span v-if="item.event.location && item.bottom - item.top >= 75" class="mt-0.5 flex items-center gap-1 truncate opacity-80">
            <MapPin class="size-3 shrink-0" aria-hidden="true" />{{ item.event.location }}
          </span>

          <!-- Resize handles: top and bottom edges. -->
          <!-- Slim edges so short events stay easy to grab and move; the top handle
               only appears when the event is tall enough to leave room to grab. -->
          <span
            v-if="(item.bottom - item.top) * pxPerMinute >= 40"
            class="pointer-events-auto absolute inset-x-0 top-0 h-1.5 cursor-ns-resize touch-pan-y"
            aria-hidden="true"
            data-resize="start"
            @pointerdown="onResizePointerDown(item.event, 'start', $event)"
            @click.stop
          />
          <span
            class="pointer-events-auto absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize touch-pan-y items-end justify-center pb-px"
            aria-hidden="true"
            data-resize="end"
            @pointerdown="onResizePointerDown(item.event, 'end', $event)"
            @click.stop
          >
            <span class="h-0.5 w-6 rounded-full bg-current opacity-0 transition-opacity group-hover/event:opacity-50" />
          </span>
        </div>

        <!-- Current time -->
        <div
          v-if="isSameDay(day.date, now)"
          class="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-red-500"
          :style="{ top: `${nowTop}px` }"
          aria-hidden="true"
        >
          <span class="absolute -top-1 -left-1 size-2.5 rounded-full bg-red-500" />
        </div>
      </div>
    </div>
  </div>
</template>
