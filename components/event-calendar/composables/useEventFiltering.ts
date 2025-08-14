import { computed, type ComputedRef } from 'vue'
import { 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  isSameDay,
  subDays,
  startOfMonth,
  endOfMonth
} from 'date-fns'
import type { CalendarEvent } from '../types'

/**
 * Optimized event filtering composable with memoization
 */
export function useEventFiltering(events: ComputedRef<CalendarEvent[]>) {
  // Memoize today's date to avoid repeated Date() calls
  const today = computed(() => new Date())

  /**
   * Get events for a specific day with optimized filtering
   */
  const getEventsForDay = (day: Date) => {
    return computed(() => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      return events.value.filter(event => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        
        // Check if the event overlaps with the day (either starts, ends, or spans the day)
        return (
          // Event starts on this day
          isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
          // Event ends on this day  
          isWithinInterval(eventEnd, { start: dayStart, end: dayEnd }) ||
          // Event spans across this day (starts before and ends after)
          (eventStart < dayStart && eventEnd > dayEnd)
        )
      })
    })
  }

  /**
   * Get all-day events for a specific day
   */
  const getAllDayEventsForDay = (day: Date) => {
    return computed(() => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      return events.value.filter(event => {
        if (!event.allDay) return false
        
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        
        // Check if the all-day event overlaps with the day
        return (
          // Event starts on this day
          isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
          // Event ends on this day  
          isWithinInterval(eventEnd, { start: dayStart, end: dayEnd }) ||
          // Event spans across this day (starts before and ends after)
          (eventStart < dayStart && eventEnd > dayEnd)
        )
      })
    })
  }

  /**
   * Get timed events for a specific day
   */
  const getTimedEventsForDay = (day: Date) => {
    return computed(() => {
      const dayStart = startOfDay(day)
      const dayPlusOne = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      
      return events.value.filter(event => {
        if (event.allDay) return false
        
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        
        return (
          isWithinInterval(eventStart, { start: dayStart, end: dayPlusOne }) ||
          isWithinInterval(eventEnd, { start: dayStart, end: dayPlusOne }) ||
          (eventStart < dayStart && eventEnd > dayPlusOne)
        )
      })
    })
  }

  /**
   * Get events for agenda view (month-based events sorted by date)
   */
  const getAgendaEvents = (fromDate: Date) => {
    return computed(() => {
      const monthStart = startOfMonth(fromDate)
      const monthEnd = endOfMonth(fromDate)
      
      return events.value
        .filter(event => {
          const eventStart = startOfDay(new Date(event.startDate))
          const eventEnd = startOfDay(new Date(event.endDate))
          
          // Include events that start or end within the month, or span across it
          return (eventStart <= monthEnd && eventEnd >= monthStart)
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    })
  }

  /**
   * Check if a day is today (memoized)
   */
  const isToday = (day: Date) => {
    return computed(() => isSameDay(day, today.value))
  }

  return {
    today,
    getEventsForDay,
    getAllDayEventsForDay,
    getTimedEventsForDay,
    getAgendaEvents,
    isToday
  }
}