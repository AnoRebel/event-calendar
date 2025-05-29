import {
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  format,
  differenceInMinutes,
  isAfter,
  isBefore,
  setHours,
  setMinutes,
} from "date-fns"
import type { CalendarEvent, TimeSlot, DayColumnData } from "../types"

export const PIXELS_PER_HOUR_CONFIG = 60 // Can be made configurable

export function useCalendarUtils() {
  const getEventStyle = (
    event: CalendarEvent,
    dayContextDate: Date,
    pixelsPerHour: number = PIXELS_PER_HOUR_CONFIG
  ) => {
    const eventStart = new Date(event.startDate)
    const eventEnd = new Date(event.endDate)
    const dayStart = startOfDay(dayContextDate)

    let startMinutesOffset = 0
    if (isAfter(eventStart, dayStart) && !isBefore(eventStart, endOfDay(dayContextDate))) {
      // Starts within this day
      startMinutesOffset = differenceInMinutes(eventStart, dayStart)
    } else if (isBefore(eventStart, dayStart)) {
      // Starts before this day (spans into it)
      startMinutesOffset = 0
    }

    let endMinutesOffset = differenceInMinutes(endOfDay(dayContextDate), dayStart) + 1 // Default to full day
    if (isBefore(eventEnd, endOfDay(dayContextDate)) && !isAfter(eventEnd, dayStart)) {
      // Ends within this day
      endMinutesOffset = differenceInMinutes(eventEnd, dayStart)
    } else if (isAfter(eventEnd, endOfDay(dayContextDate))) {
      // Spans past this day
      endMinutesOffset = 24 * 60
    }

    startMinutesOffset = Math.max(0, startMinutesOffset)
    endMinutesOffset = Math.min(24 * 60, endMinutesOffset)

    const top = (startMinutesOffset / 60) * pixelsPerHour
    // Ensure minimum duration visually (e.g., 15 mins)
    const durationMinutes = Math.max(15, endMinutesOffset - startMinutesOffset)
    const height = (durationMinutes / 60) * pixelsPerHour

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: "0%", // Basic, no overlap management
      width: "100%", // Basic, no overlap management
    }
  }

  const generateTimeSlots = (day: Date): TimeSlot[] => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    return eachHourOfInterval({ start: dayStart, end: dayEnd }).map(hour => ({
      time: hour,
      label: format(hour, "ha"),
      dateTimeStr: format(hour, "yyyy-MM-dd'T'HH:mm:ss"),
    }))
  }

  const getDropTime = (
    nativeDropEvent: MouseEvent | PointerEvent,
    targetColumnElement: HTMLElement,
    baseDate: Date,
    pixelsPerHour: number
  ): Date => {
    const columnRect = targetColumnElement.getBoundingClientRect()
    const dropY = nativeDropEvent.clientY - columnRect.top
    const hourDropped = Math.max(0, Math.min(23, Math.floor(dropY / pixelsPerHour)))
    const minutesDroppedFraction = (dropY % pixelsPerHour) / pixelsPerHour
    // Snap to nearest 15 minutes
    const minutesDropped = Math.floor((minutesDroppedFraction * 60) / 15) * 15

    return setMinutes(setHours(new Date(baseDate), hourDropped), minutesDropped)
  }

  return {
    PIXELS_PER_HOUR_CONFIG,
    getEventStyle,
    generateTimeSlots,
    getDropTime,
  }
}
