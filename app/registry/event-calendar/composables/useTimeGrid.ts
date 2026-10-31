import {
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfDay,
  max as maxDate,
  min as minDate,
  parse,
  startOfDay,
} from "date-fns"
import type { CalendarEvent } from "../types"

// Pure helpers behind the week/day time grid and drag-and-drop. Everything is in
// the viewer's local time; `dateKey` is "yyyy-MM-dd".

export const SNAP_MINUTES = 15
export const MIN_EVENT_MINUTES = 15

/** "yyyy-MM-dd" as local midnight (not UTC, which `new Date(key)` would give). */
export const dayFromKey = (dateKey: string) => parse(dateKey, "yyyy-MM-dd", new Date())

export const snapMinutes = (minutes: number, step = SNAP_MINUTES) =>
  Math.min(24 * 60 - step, Math.max(0, Math.round(minutes / step) * step))

const duration = (event: CalendarEvent) =>
  Math.max(0, new Date(event.endDate).getTime() - new Date(event.startDate).getTime())

/** Move an event to another day, keeping its time of day and length (month cells). */
export function moveToDay(event: CalendarEvent, dateKey: string): CalendarEvent {
  const start = new Date(event.startDate)
  const days = differenceInCalendarDays(dayFromKey(dateKey), startOfDay(start))
  const shift = (d: Date | string) => {
    const next = new Date(d)
    next.setDate(next.getDate() + days)
    return next
  }
  return { ...event, startDate: shift(event.startDate), endDate: shift(event.endDate) }
}

/** Drop onto a time slot: start at `minutes` past midnight, keeping the length. */
export function moveToTime(event: CalendarEvent, dateKey: string, minutes: number): CalendarEvent {
  const start = addMinutes(dayFromKey(dateKey), snapMinutes(minutes))
  // An all-day event dropped into the grid becomes a one-hour event.
  const length = event.allDay ? 60 * 60_000 : Math.max(duration(event), MIN_EVENT_MINUTES * 60_000)
  return { ...event, allDay: false, startDate: start, endDate: new Date(start.getTime() + length) }
}

/** Drop onto the all-day row: keep how many days the event spans. */
export function moveToAllDay(event: CalendarEvent, dateKey: string): CalendarEvent {
  const day = dayFromKey(dateKey)
  const spanDays = event.allDay
    ? Math.max(0, differenceInCalendarDays(new Date(event.endDate), new Date(event.startDate)))
    : 0
  const end = endOfDay(day)
  end.setDate(end.getDate() + spanDays)
  return { ...event, allDay: true, startDate: day, endDate: end }
}

/** Resize from the top or bottom edge by `deltaMinutes`, snapped, keeping a minimum length. */
export function resizeEvent(event: CalendarEvent, edge: "start" | "end", deltaMinutes: number): CalendarEvent {
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)
  const delta = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES
  if (edge === "start") {
    const next = minDate([addMinutes(start, delta), addMinutes(end, -MIN_EVENT_MINUTES)])
    return { ...event, startDate: next }
  }
  const next = maxDate([addMinutes(end, delta), addMinutes(start, MIN_EVENT_MINUTES)])
  return { ...event, endDate: next }
}

/** Minutes from the start of `day` to the event's visible start and end on that day. */
export function visibleRange(event: CalendarEvent, day: Date) {
  const dayStart = startOfDay(day)
  const dayEnd = addMinutes(dayStart, 24 * 60)
  const start = maxDate([new Date(event.startDate), dayStart])
  const end = minDate([new Date(event.endDate), dayEnd])
  const top = Math.max(0, differenceInMinutes(start, dayStart))
  const bottom = Math.min(24 * 60, Math.max(top + MIN_EVENT_MINUTES, differenceInMinutes(end, dayStart)))
  return { top, bottom }
}

export interface LaidOutEvent {
  event: CalendarEvent
  top: number // minutes
  bottom: number // minutes
  lane: number
  lanes: number
}

/**
 * Side-by-side layout for overlapping events: events that overlap (directly or
 * through a chain) form a cluster; each takes the first free lane, and every
 * event in a cluster is as wide as 1 / (lanes in that cluster).
 */
export function layoutDay(events: CalendarEvent[], day: Date): LaidOutEvent[] {
  const items = events
    .map(event => ({ event, ...visibleRange(event, day) }))
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom)

  const result: LaidOutEvent[] = []
  let cluster: LaidOutEvent[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1

  const flush = () => {
    for (const item of cluster) item.lanes = laneEnds.length
    result.push(...cluster)
    cluster = []
    laneEnds = []
  }

  for (const item of items) {
    if (item.top >= clusterEnd) flush()
    let lane = laneEnds.findIndex(end => end <= item.top)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.bottom)
    } else {
      laneEnds[lane] = item.bottom
    }
    cluster.push({ ...item, lane, lanes: 1 })
    clusterEnd = Math.max(clusterEnd, item.bottom)
  }
  flush()
  return result
}
