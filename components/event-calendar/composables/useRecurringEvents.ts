import { computed, ref, type ComputedRef } from 'vue'
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  isBefore, 
  isAfter, 
  startOfDay,
  endOfDay,
  setDay,
  getDay,
  format
} from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
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
          const nextDay = pattern.daysOfWeek.find(day => day > currentDay) ?? 
                         pattern.daysOfWeek[0]
          
          if (nextDay > currentDay) {
            return setDay(currentDate, nextDay)
          } else {
            // Move to next week and set to first day
            const nextWeek = addWeeks(currentDate, pattern.interval)
            return setDay(nextWeek, pattern.daysOfWeek[0])
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
          nextYear.setMonth(pattern.monthOfYear)
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
      if (pattern.monthOfYear < 0 || pattern.monthOfYear > 11) {
        errors.push('Month must be between 0 and 11')
      }
    }
    
    if (pattern.count && pattern.count < 1) {
      errors.push('Count must be at least 1')
    }
    
    return errors
  }

  // Get human-readable description of pattern
  const getPatternDescription = (pattern: RecurringPattern): string => {
    const interval = pattern.interval > 1 ? ` every ${pattern.interval}` : ''
    
    switch (pattern.type) {
      case 'daily':
        return `Daily${interval > 1 ? interval + ' days' : ''}`
      
      case 'weekly':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const selectedDays = pattern.daysOfWeek.map(d => dayNames[d]).join(', ')
          return `Weekly on ${selectedDays}${interval}`
        }
        return `Weekly${interval > 1 ? interval + ' weeks' : ''}`
      
      case 'monthly':
        const dayStr = pattern.dayOfMonth ? ` on day ${pattern.dayOfMonth}` : ''
        return `Monthly${dayStr}${interval > 1 ? interval + ' months' : ''}`
      
      case 'yearly':
        const monthStr = pattern.monthOfYear !== undefined ? 
          ` in ${format(new Date(2000, pattern.monthOfYear), 'MMMM')}` : ''
        const yearDayStr = pattern.dayOfMonth ? ` ${pattern.dayOfMonth}` : ''
        return `Yearly${monthStr}${yearDayStr}${interval > 1 ? interval + ' years' : ''}`
      
      default:
        return 'Custom'
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