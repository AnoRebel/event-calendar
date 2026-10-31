import { computed, type ComputedRef } from 'vue'
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  isBefore, 
  isAfter, 
  setDay,
  getDay,
  format
} from 'date-fns'
import type { CalendarEvent, RecurringPattern } from '../types'

export function useRecurringEvents(events: ComputedRef<CalendarEvent[]>) {
  
  // Generate recurring event instances within a date range
  const generateRecurringInstances = (
    baseEvent: CalendarEvent, 
    startRange: Date, 
    endRange: Date
  ): CalendarEvent[] => {
    if (!baseEvent.isRecurring || !baseEvent.recurringPattern) {
      return [baseEvent]
    }

    const instances: CalendarEvent[] = []
    const pattern = baseEvent.recurringPattern
    const eventDuration = baseEvent.endDate.getTime() - baseEvent.startDate.getTime()
    
    let currentDate = new Date(baseEvent.startDate)
    let instanceCount = 0
    const maxInstances = pattern.count || 1000 // Reasonable limit

    // Add the original event if it's within range
    if (!isBefore(baseEvent.startDate, startRange) && !isAfter(baseEvent.startDate, endRange)) {
      instances.push(baseEvent)
      instanceCount++
    }

    while (instanceCount < maxInstances) {
      // Calculate next occurrence
      currentDate = getNextOccurrence(currentDate, pattern)
      
      // Check if we've exceeded the end date or count limits
      if (pattern.endDate && isAfter(currentDate, pattern.endDate)) {
        break
      }
      
      if (isAfter(currentDate, endRange)) {
        break
      }
      
      if (!isBefore(currentDate, startRange)) {
        // Create recurring instance
        const recurringInstance: CalendarEvent = {
          ...baseEvent,
          id: `${baseEvent.recurringId || baseEvent.id}-${format(currentDate, 'yyyyMMdd')}`,
          startDate: currentDate,
          endDate: new Date(currentDate.getTime() + eventDuration),
          recurringId: baseEvent.recurringId || baseEvent.id,
          isRecurring: true
        }
        
        instances.push(recurringInstance)
        instanceCount++
      }
    }

    return instances
  }

  // Calculate the next occurrence based on pattern
  const getNextOccurrence = (currentDate: Date, pattern: RecurringPattern): Date => {
    switch (pattern.type) {
      case 'daily':
        return addDays(currentDate, pattern.interval)
      
      case 'weekly':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Find next day of week
          const currentDay = getDay(currentDate)
          const firstDay = pattern.daysOfWeek[0]!
          const nextDay = pattern.daysOfWeek.find(day => day > currentDay) ?? firstDay
          
          if (nextDay > currentDay) {
            return setDay(currentDate, nextDay)
          } else {
            // Move to next week and set to first day
            const nextWeek = addWeeks(currentDate, pattern.interval)
            return setDay(nextWeek, firstDay)
          }
        } else {
          return addWeeks(currentDate, pattern.interval)
        }
      
      case 'monthly':
        if (pattern.dayOfMonth) {
          const nextMonth = addMonths(currentDate, pattern.interval)
          nextMonth.setDate(pattern.dayOfMonth)
          return nextMonth
        } else {
          return addMonths(currentDate, pattern.interval)
        }
      
      case 'yearly':
        if (pattern.monthOfYear !== undefined) {
          const nextYear = addYears(currentDate, pattern.interval)
          nextYear.setMonth(pattern.monthOfYear - 1) // monthOfYear is 1–12
          if (pattern.dayOfMonth) {
            nextYear.setDate(pattern.dayOfMonth)
          }
          return nextYear
        } else {
          return addYears(currentDate, pattern.interval)
        }
      
      default:
        return addDays(currentDate, 1)
    }
  }

  // Expand all recurring events within a date range
  const expandRecurringEventsInRange = (startRange: Date, endRange: Date) => {
    return computed(() => {
      const allInstances: CalendarEvent[] = []
      
      events.value.forEach(event => {
        if (event.isRecurring && event.recurringPattern) {
          // Generate instances for recurring events
          const instances = generateRecurringInstances(event, startRange, endRange)
          allInstances.push(...instances)
        } else {
          // Include non-recurring events if within range
          if (!isBefore(event.startDate, startRange) && !isAfter(event.startDate, endRange)) {
            allInstances.push(event)
          }
        }
      })
      
      return allInstances
    })
  }

  // Helper to create a recurring pattern
  const createRecurringPattern = (
    type: RecurringPattern['type'],
    interval: number = 1,
    options: Partial<RecurringPattern> = {}
  ): RecurringPattern => {
    return {
      type,
      interval,
      ...options
    }
  }

  // Common recurring patterns
  const commonPatterns = {
    daily: () => createRecurringPattern('daily', 1),
    weekdays: () => createRecurringPattern('weekly', 1, { daysOfWeek: [1, 2, 3, 4, 5] }),
    weekly: () => createRecurringPattern('weekly', 1),
    biweekly: () => createRecurringPattern('weekly', 2),
    monthly: () => createRecurringPattern('monthly', 1),
    yearly: () => createRecurringPattern('yearly', 1)
  }

  // Validate recurring pattern
  const validateRecurringPattern = (pattern: RecurringPattern): string[] => {
    const errors: string[] = []
    
    if (pattern.interval < 1) {
      errors.push('Interval must be at least 1')
    }
    
    if (pattern.type === 'weekly' && pattern.daysOfWeek) {
      if (pattern.daysOfWeek.length === 0) {
        errors.push('At least one day must be selected for weekly recurrence')
      }
      if (pattern.daysOfWeek.some(day => day < 0 || day > 6)) {
        errors.push('Invalid day of week (must be 0-6)')
      }
    }
    
    if (pattern.type === 'monthly' && pattern.dayOfMonth) {
      if (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
        errors.push('Day of month must be between 1 and 31')
      }
    }
    
    if (pattern.type === 'yearly' && pattern.monthOfYear !== undefined) {
      if (pattern.monthOfYear < 1 || pattern.monthOfYear > 12) {
        errors.push('Month must be between 1 and 12')
      }
    }
    
    if (pattern.count && pattern.count < 1) {
      errors.push('Count must be at least 1')
    }
    
    return errors
  }

  // Human-readable description, e.g. "Every 2 weeks on Mon, Wed" or "Yearly on March 14".
  const getPatternDescription = (pattern: RecurringPattern): string => {
    const units = { daily: "day", weekly: "week", monthly: "month", yearly: "year" } as const
    const single = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" } as const
    const n = Math.max(1, pattern.interval || 1)
    const base = n === 1 ? single[pattern.type] : `Every ${n} ${units[pattern.type]}s`

    switch (pattern.type) {
      case "weekly": {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const days = (pattern.daysOfWeek ?? []).map(d => dayNames[d]).filter(Boolean)
        return days.length ? `${base} on ${days.join(", ")}` : base
      }
      case "monthly":
        return pattern.dayOfMonth ? `${base} on day ${pattern.dayOfMonth}` : base
      case "yearly": {
        // monthOfYear is 1–12 (as the event dialog stores it).
        const month = pattern.monthOfYear ? format(new Date(2000, pattern.monthOfYear - 1, 1), "MMMM") : ""
        const day = pattern.dayOfMonth ? ` ${pattern.dayOfMonth}` : ""
        return month ? `${base} on ${month}${day}` : base
      }
      default:
        return base
    }
  }

  // Check if event is part of a recurring series
  const isRecurringInstance = (event: CalendarEvent): boolean => {
    return Boolean(event.recurringId && event.recurringId !== event.id)
  }

  // Find the master event for a recurring instance
  const findMasterEvent = (recurringInstance: CalendarEvent): CalendarEvent | undefined => {
    if (!recurringInstance.recurringId) return undefined
    
    return events.value.find(event => 
      event.id === recurringInstance.recurringId && !isRecurringInstance(event)
    )
  }

  return {
    generateRecurringInstances,
    expandRecurringEventsInRange,
    createRecurringPattern,
    commonPatterns,
    validateRecurringPattern,
    getPatternDescription,
    isRecurringInstance,
    findMasterEvent,
    getNextOccurrence
  }
}