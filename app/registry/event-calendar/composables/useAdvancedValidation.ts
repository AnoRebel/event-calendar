import { ref, readonly } from 'vue'
import type { CalendarEvent, RecurringPattern } from '../types'

interface ValidationRule<T = any> {
  name: string
  validate: (value: T, context?: any) => boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  infos: ValidationError[]
}

interface ValidationError {
  field: string
  rule: string
  message: string
  severity: 'error' | 'warning' | 'info'
  value?: any
}

interface ValidationContext {
  existingEvents: CalendarEvent[]
  timezone: string
  businessHours?: { start: string; end: string }
  maxDuration?: number
  allowPastEvents?: boolean
}

/**
 * Advanced validation system with comprehensive rules and sanitization
 */
export function useAdvancedValidation(context: ValidationContext = {
  existingEvents: [],
  timezone: 'UTC',
  allowPastEvents: false
}) {
  const validationContext = ref(context)
  const customRules = ref<Map<string, ValidationRule>>(new Map())

  // Core validation rules
  const coreRules: ValidationRule[] = [
    {
      name: 'required_title',
      validate: (title: string) => Boolean(title?.trim()),
      message: 'Event title is required',
      severity: 'error'
    },
    {
      name: 'title_length',
      validate: (title: string) => !title || title.length <= 200,
      message: 'Event title must be 200 characters or less',
      severity: 'error'
    },
    {
      name: 'title_profanity',
      validate: (title: string) => !containsProfanity(title),
      message: 'Event title contains inappropriate content',
      severity: 'warning'
    },
    {
      name: 'required_start_date',
      validate: (startDate: Date) => startDate instanceof Date && !isNaN(startDate.getTime()),
      message: 'Valid start date is required',
      severity: 'error'
    },
    {
      name: 'required_end_date',
      validate: (endDate: Date) => endDate instanceof Date && !isNaN(endDate.getTime()),
      message: 'Valid end date is required',
      severity: 'error'
    },
    {
      name: 'date_order',
      validate: (_, event: CalendarEvent) => {
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        return start <= end
      },
      message: 'End date must be after or equal to start date',
      severity: 'error'
    },
    {
      name: 'past_event',
      validate: (_, event: CalendarEvent) => {
        if (validationContext.value.allowPastEvents) return true
        const now = new Date()
        const start = new Date(event.startDate)
        return start >= now
      },
      message: 'Events cannot be scheduled in the past',
      severity: 'warning'
    },
    {
      name: 'max_duration',
      validate: (_, event: CalendarEvent) => {
        if (!validationContext.value.maxDuration) return true
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return durationHours <= validationContext.value.maxDuration!
      },
      message: `Event duration exceeds maximum allowed (${validationContext.value.maxDuration} hours)`,
      severity: 'warning'
    },
    {
      name: 'business_hours',
      validate: (_, event: CalendarEvent) => {
        if (!validationContext.value.businessHours || event.allDay) return true
        const { start: businessStart, end: businessEnd } = validationContext.value.businessHours
        const startTime = new Date(event.startDate).toTimeString().slice(0, 5)
        const endTime = new Date(event.endDate).toTimeString().slice(0, 5)
        return startTime >= businessStart && endTime <= businessEnd
      },
      message: 'Event is outside business hours',
      severity: 'info'
    },
    {
      name: 'description_length',
      validate: (description: string) => !description || description.length <= 1000,
      message: 'Description must be 1000 characters or less',
      severity: 'error'
    },
    {
      name: 'location_format',
      validate: (location: string) => !location || isValidLocation(location),
      message: 'Invalid location format',
      severity: 'warning'
    }
  ]

  // Recurring event validation rules
  const recurringRules: ValidationRule[] = [
    {
      name: 'recurring_interval',
      validate: (pattern: RecurringPattern) => pattern.interval > 0 && pattern.interval <= 1000,
      message: 'Recurring interval must be between 1 and 1000',
      severity: 'error'
    },
    {
      name: 'recurring_end_constraint',
      validate: (pattern: RecurringPattern) => {
        return Boolean(pattern.endDate || pattern.count || pattern.endsNever)
      },
      message: 'Recurring events must have either an end date, occurrence count, or be set to never end',
      severity: 'error'
    },
    {
      name: 'weekly_days_constraint',
      validate: (pattern: RecurringPattern) => {
        if (pattern.type !== 'weekly') return true
        return Boolean(pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && pattern.daysOfWeek.length <= 7)
      },
      message: 'Weekly recurring events must specify 1-7 days of the week',
      severity: 'error'
    },
    {
      name: 'monthly_day_constraint',
      validate: (pattern: RecurringPattern) => {
        if (pattern.type !== 'monthly') return true
        return Boolean(pattern.dayOfMonth && pattern.dayOfMonth >= 1 && pattern.dayOfMonth <= 31)
      },
      message: 'Monthly recurring events must specify a valid day of month (1-31)',
      severity: 'error'
    },
    {
      name: 'yearly_month_constraint',
      validate: (pattern: RecurringPattern) => {
        if (pattern.type !== 'yearly') return true
        return Boolean(pattern.monthOfYear && pattern.monthOfYear >= 1 && pattern.monthOfYear <= 12)
      },
      message: 'Yearly recurring events must specify a valid month (1-12)',
      severity: 'error'
    }
  ]

  // Validate single event
  const validateEvent = (event: CalendarEvent): ValidationResult => {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const infos: ValidationError[] = []

    // Validate against core rules
    coreRules.forEach(rule => {
      let isValid = false
      try {
        switch (rule.name) {
          case 'required_title':
          case 'title_length':
          case 'title_profanity':
            isValid = rule.validate(event.title, event)
            break
          case 'required_start_date':
            isValid = rule.validate(event.startDate, event)
            break
          case 'required_end_date':
            isValid = rule.validate(event.endDate, event)
            break
          case 'description_length':
            isValid = rule.validate(event.description || '', event)
            break
          case 'location_format':
            isValid = rule.validate(event.location || '', event)
            break
          default:
            isValid = rule.validate(event, event)
        }
      } catch (error) {
        isValid = false
      }

      if (!isValid) {
        const validationError: ValidationError = {
          field: getFieldFromRule(rule.name),
          rule: rule.name,
          message: rule.message,
          severity: rule.severity,
          value: getFieldValue(event, rule.name)
        }

        switch (rule.severity) {
          case 'error':
            errors.push(validationError)
            break
          case 'warning':
            warnings.push(validationError)
            break
          case 'info':
            infos.push(validationError)
            break
        }
      }
    })

    // Validate recurring pattern if present
    if (event.isRecurring && event.recurringPattern) {
      recurringRules.forEach(rule => {
        let isValid = false
        try {
          isValid = rule.validate(event.recurringPattern!, event)
        } catch (error) {
          isValid = false
        }

        if (!isValid) {
          const validationError: ValidationError = {
            field: 'recurringPattern',
            rule: rule.name,
            message: rule.message,
            severity: rule.severity,
            value: event.recurringPattern
          }

          switch (rule.severity) {
            case 'error':
              errors.push(validationError)
              break
            case 'warning':
              warnings.push(validationError)
              break
            case 'info':
              infos.push(validationError)
              break
          }
        }
      })
    }

    // Check custom rules
    customRules.value.forEach(rule => {
      let isValid = false
      try {
        isValid = rule.validate(event, validationContext.value)
      } catch (error) {
        isValid = false
      }

      if (!isValid) {
        const validationError: ValidationError = {
          field: 'custom',
          rule: rule.name,
          message: rule.message,
          severity: rule.severity,
          value: event
        }

        switch (rule.severity) {
          case 'error':
            errors.push(validationError)
            break
          case 'warning':
            warnings.push(validationError)
            break
          case 'info':
            infos.push(validationError)
            break
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos
    }
  }

  // Batch validation
  const validateEvents = (events: CalendarEvent[]): ValidationResult => {
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationError[] = []
    const allInfos: ValidationError[] = []

    events.forEach((event, index) => {
      const result = validateEvent(event)
      
      // Add event index to field names for batch validation
      result.errors.forEach(error => {
        allErrors.push({
          ...error,
          field: `event[${index}].${error.field}`
        })
      })
      
      result.warnings.forEach(warning => {
        allWarnings.push({
          ...warning,
          field: `event[${index}].${warning.field}`
        })
      })
      
      result.infos.forEach(info => {
        allInfos.push({
          ...info,
          field: `event[${index}].${info.field}`
        })
      })
    })

    // Check for conflicts between events
    const conflictErrors = detectEventConflicts(events)
    allWarnings.push(...conflictErrors)

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      infos: allInfos
    }
  }

  // Event sanitization
  const sanitizeEvent = (event: Partial<CalendarEvent>): Partial<CalendarEvent> => {
    const sanitized = { ...event }

    // Sanitize text fields
    if (sanitized.title) {
      sanitized.title = sanitizeText(sanitized.title, 200)
    }
    
    if (sanitized.description) {
      sanitized.description = sanitizeText(sanitized.description, 1000)
    }
    
    if (sanitized.location) {
      sanitized.location = sanitizeText(sanitized.location, 100)
    }

    // Sanitize dates
    if (sanitized.startDate) {
      sanitized.startDate = sanitizeDate(sanitized.startDate)
    }
    
    if (sanitized.endDate) {
      sanitized.endDate = sanitizeDate(sanitized.endDate)
    }

    // Ensure date order
    if (sanitized.startDate && sanitized.endDate) {
      const start = new Date(sanitized.startDate)
      const end = new Date(sanitized.endDate)
      if (start > end) {
        sanitized.endDate = sanitized.startDate
      }
    }

    // Sanitize recurring pattern
    if (sanitized.recurringPattern) {
      sanitized.recurringPattern = sanitizeRecurringPattern(sanitized.recurringPattern)
    }

    return sanitized
  }

  // Helper functions
  const sanitizeText = (text: string, maxLength: number): string => {
    if (!text) return ''
    
    // Remove dangerous characters and HTML
    let cleaned = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .trim()
    
    // Truncate if too long
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength).trim()
    }
    
    return cleaned
  }

  const sanitizeDate = (date: Date | string): Date => {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return new Date() // Fallback to current date
    }
    
    // Ensure reasonable date range (1900-2100)
    const year = d.getFullYear()
    if (year < 1900 || year > 2100) {
      return new Date()
    }
    
    return d
  }

  const sanitizeRecurringPattern = (pattern: RecurringPattern): RecurringPattern => {
    const sanitized = { ...pattern }
    
    // Ensure valid interval
    sanitized.interval = Math.max(1, Math.min(1000, sanitized.interval || 1))
    
    // Sanitize arrays
    if (sanitized.daysOfWeek) {
      sanitized.daysOfWeek = sanitized.daysOfWeek
        .filter(day => day >= 0 && day <= 6)
        .slice(0, 7) // Max 7 days
    }
    
    // Ensure valid constraints
    if (sanitized.dayOfMonth) {
      sanitized.dayOfMonth = Math.max(1, Math.min(31, sanitized.dayOfMonth))
    }
    
    if (sanitized.monthOfYear) {
      sanitized.monthOfYear = Math.max(1, Math.min(12, sanitized.monthOfYear))
    }
    
    return sanitized
  }

  const containsProfanity = (text: string): boolean => {
    // Simple profanity check - in production, use a proper service
    const profanityList = ['spam', 'scam', 'fake'] // Very basic example
    const lowerText = text.toLowerCase()
    return profanityList.some(word => lowerText.includes(word))
  }

  const isValidLocation = (location: string): boolean => {
    // Basic location validation
    return location.length <= 100 && !/[<>"]/.test(location)
  }

  const detectEventConflicts = (events: CalendarEvent[]): ValidationError[] => {
    const conflicts: ValidationError[] = []
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i]
        const event2 = events[j]
        
        if (!event1 || !event2) continue
        
        // Check for time overlap
        const start1 = new Date(event1.startDate)
        const end1 = new Date(event1.endDate)
        const start2 = new Date(event2.startDate)
        const end2 = new Date(event2.endDate)
        
        const overlap = start1 < end2 && start2 < end1
        
        if (overlap) {
          conflicts.push({
            field: `event[${i}]`,
            rule: 'event_conflict',
            message: `Event conflicts with "${event2.title}"`,
            severity: 'warning',
            value: { conflictsWith: event2.id }
          })
        }
      }
    }
    
    return conflicts
  }

  const getFieldFromRule = (ruleName: string): string => {
    const fieldMap: Record<string, string> = {
      'required_title': 'title',
      'title_length': 'title',
      'title_profanity': 'title',
      'required_start_date': 'startDate',
      'required_end_date': 'endDate',
      'date_order': 'dates',
      'past_event': 'startDate',
      'max_duration': 'duration',
      'business_hours': 'time',
      'description_length': 'description',
      'location_format': 'location'
    }
    return fieldMap[ruleName] || 'unknown'
  }

  const getFieldValue = (event: CalendarEvent, ruleName: string): any => {
    const fieldName = getFieldFromRule(ruleName)
    return (event as any)[fieldName]
  }

  // Custom rule management
  const addCustomRule = (rule: ValidationRule): void => {
    customRules.value.set(rule.name, rule)
  }

  const removeCustomRule = (ruleName: string): void => {
    customRules.value.delete(ruleName)
  }

  const updateValidationContext = (newContext: Partial<ValidationContext>): void => {
    validationContext.value = { ...validationContext.value, ...newContext }
  }

  return {
    // State
    validationContext: readonly(validationContext),
    customRules: readonly(customRules),
    
    // Validation methods
    validateEvent,
    validateEvents,
    sanitizeEvent,
    
    // Rule management
    addCustomRule,
    removeCustomRule,
    updateValidationContext,
    
    // Utilities
    containsProfanity,
    isValidLocation,
    detectEventConflicts
  }
}