import { computed, type ComputedRef } from 'vue'
import { isPast, isToday, endOfDay } from 'date-fns'
import type { CalendarEvent, EventStatus } from '../types'

export function useEventStatus(events: ComputedRef<CalendarEvent[]>) {
  
  // Determine event status based on current time and explicit status
  const getEventStatus = (event: CalendarEvent): EventStatus => {
    // If status is explicitly set, use it (unless it needs auto-updating)
    if (event.status && event.status !== 'past') {
      return event.status
    }

    // Auto-determine if event is past
    const eventEnd = new Date(event.endDate)
    const now = new Date()
    
    if (event.allDay) {
      // For all-day events, consider them past after the day ends
      if (isPast(endOfDay(eventEnd))) {
        return 'past'
      }
    } else {
      // For timed events, check if the end time has passed
      if (isPast(eventEnd)) {
        return 'past'
      }
    }

    return event.status || 'confirmed'
  }

  // Get CSS classes for event status styling
  const getEventStatusClasses = (event: CalendarEvent): string => {
    const status = getEventStatus(event)
    
    switch (status) {
      case 'cancelled':
        return 'opacity-50 line-through saturate-50'
      case 'past':
        return 'opacity-70 saturate-75'
      case 'tentative':
        return 'opacity-80 border-dashed'
      case 'confirmed':
      default:
        return ''
    }
  }

  // Get visual indicator for event status
  const getEventStatusIndicator = (event: CalendarEvent): string => {
    const status = getEventStatus(event)
    
    switch (status) {
      case 'cancelled':
        return '✕'
      case 'past':
        return '⏰'
      case 'tentative':
        return '?'
      case 'confirmed':
      default:
        return ''
    }
  }

  // Get tooltip text for event status
  const getEventStatusTooltip = (event: CalendarEvent): string => {
    const status = getEventStatus(event)
    
    switch (status) {
      case 'cancelled':
        return 'This event has been cancelled'
      case 'past':
        return 'This event has already ended'
      case 'tentative':
        return 'This event is tentative'
      case 'confirmed':
      default:
        return ''
    }
  }

  // Check if event is in past
  const isEventInPast = (event: CalendarEvent): boolean => {
    return getEventStatus(event) === 'past'
  }

  // Check if event is cancelled
  const isEventCancelled = (event: CalendarEvent): boolean => {
    return getEventStatus(event) === 'cancelled'
  }

  // Process events with auto-status updates
  const processEventsWithStatus = computed(() => {
    return events.value.map(event => ({
      ...event,
      computedStatus: getEventStatus(event),
      statusClasses: getEventStatusClasses(event),
      statusIndicator: getEventStatusIndicator(event),
      statusTooltip: getEventStatusTooltip(event)
    }))
  })

  return {
    getEventStatus,
    getEventStatusClasses,
    getEventStatusIndicator,
    getEventStatusTooltip,
    isEventInPast,
    isEventCancelled,
    processEventsWithStatus
  }
}