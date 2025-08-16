import { ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { useCompatibility } from './useCompatibility'

export interface CalendarError {
  id: string
  type: 'validation' | 'network' | 'drag-drop' | 'general' | 'security' | 'performance'
  message: string
  timestamp: Date
  context?: Record<string, any>
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Legacy error handling for backward compatibility
 * @deprecated Use useResilientErrorHandling for production features
 */
export function useErrorHandling() {
  const errors: Ref<CalendarError[]> = ref([])
  const isLoading = ref(false)
  const { ensureUUID } = useCompatibility()

  const createError = (
    type: CalendarError['type'],
    message: string,
    context?: Record<string, any>,
    severity: CalendarError['severity'] = 'medium'
  ): CalendarError => ({
    id: ensureUUID(),
    type,
    message,
    timestamp: new Date(),
    context,
    severity
  })

  const handleError = (error: CalendarError | Error | string, showToast = true) => {
    let calendarError: CalendarError

    if (typeof error === 'string') {
      calendarError = createError('general', error)
    } else if (error instanceof Error) {
      calendarError = createError('general', error.message, { stack: error.stack })
    } else {
      calendarError = error
    }

    errors.value.push(calendarError)
    
    if (showToast) {
      toast.error(calendarError.message)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Calendar Error:', calendarError)
    }

    return calendarError
  }

  const clearError = (errorId: string) => {
    errors.value = errors.value.filter(error => error.id !== errorId)
  }

  const clearAllErrors = () => {
    errors.value = []
  }

  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    errorMessage = 'An error occurred'
  ): Promise<T | null> => {
    isLoading.value = true
    try {
      const result = await operation()
      return result
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(errorMessage))
      return null
    } finally {
      isLoading.value = false
    }
  }

  const validateEvent = (event: any): string[] => {
    const validationErrors: string[] = []

    if (!event.title?.trim()) {
      validationErrors.push('Event title is required')
    }

    if (!event.startDate || !(event.startDate instanceof Date)) {
      validationErrors.push('Valid start date is required')
    }

    if (!event.endDate || !(event.endDate instanceof Date)) {
      validationErrors.push('Valid end date is required')
    }

    if (event.startDate && event.endDate && event.startDate > event.endDate) {
      validationErrors.push('End date must be after start date')
    }

    // Additional security validation
    if (event.title && (event.title.includes('<script') || event.title.includes('javascript:'))) {
      validationErrors.push('Invalid content in event title')
    }

    return validationErrors
  }

  return {
    errors,
    isLoading,
    handleError,
    clearError,
    clearAllErrors,
    withErrorHandling,
    validateEvent
  }
}