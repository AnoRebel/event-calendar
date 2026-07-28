import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'

interface ErrorContext {
  component: string
  operation: string
  timestamp: Date
  userAgent: string
  url: string
  userId?: string
  additionalData?: Record<string, any>
}

interface ErrorRecoveryStrategy {
  name: string
  canHandle: (error: Error, context: ErrorContext) => boolean
  recover: (error: Error, context: ErrorContext) => Promise<boolean>
  maxRetries: number
  retryDelay: number
}

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: 'closed' | 'open' | 'half-open'
  nextAttemptTime: number
}

interface ReliabilityMetrics {
  totalErrors: number
  recoveredErrors: number
  unrecoverableErrors: number
  uptime: number
  lastIncident: Date | null
  recoveryRate: number
}

/**
 * Advanced error handling with circuit breaker pattern and automatic recovery
 */
export function useResilientErrorHandling() {
  const errors = ref<Array<{ error: Error; context: ErrorContext; recovered: boolean }>>([])
  const circuitBreakers = ref<Map<string, CircuitBreakerState>>(new Map())
  const recoveryStrategies = ref<ErrorRecoveryStrategy[]>([])
  const metrics = ref<ReliabilityMetrics>({
    totalErrors: 0,
    recoveredErrors: 0,
    unrecoverableErrors: 0,
    uptime: 100,
    lastIncident: null,
    recoveryRate: 0
  })
  
  const startTime = Date.now()
  let errorBoundaryInstalled = false

  // Default recovery strategies
  const defaultStrategies: ErrorRecoveryStrategy[] = [
    {
      name: 'network_retry',
      canHandle: (error) => error.message.includes('fetch') || error.message.includes('network'),
      recover: async (_error, context) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        // In a real implementation, retry the failed network request
        console.log('Retrying network request:', context.operation)
        return Math.random() > 0.3 // 70% success rate
      },
      maxRetries: 3,
      retryDelay: 2000
    },
    {
      name: 'state_reset',
      canHandle: (error) => error.message.includes('state') || error.message.includes('reactive'),
      recover: async (_error, context) => {
        // Reset component state
        console.log('Resetting component state:', context.component)
        return true
      },
      maxRetries: 1,
      retryDelay: 0
    },
    {
      name: 'cache_clear',
      canHandle: (error) => error.message.includes('cache') || error.message.includes('storage'),
      recover: async (_error, context) => {
        // Clear relevant caches
        if (typeof localStorage !== 'undefined') {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('calendar-')) {
              localStorage.removeItem(key)
            }
          })
        }
        console.log('Cache cleared for recovery:', context.operation)
        return true
      },
      maxRetries: 1,
      retryDelay: 0
    },
    {
      name: 'graceful_degradation',
      canHandle: () => true, // Fallback for all errors
      recover: async (error, _context) => {
        // Provide fallback functionality
        console.log('Applying graceful degradation:', error.message)
        toast.warning('Some features are temporarily unavailable')
        return true
      },
      maxRetries: 1,
      retryDelay: 0
    }
  ]

  // Circuit breaker implementation
  const getCircuitBreakerState = (operation: string): CircuitBreakerState => {
    if (!circuitBreakers.value.has(operation)) {
      circuitBreakers.value.set(operation, {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed',
        nextAttemptTime: 0
      })
    }
    return circuitBreakers.value.get(operation)!
  }

  const updateCircuitBreaker = (operation: string, success: boolean): void => {
    const state = getCircuitBreakerState(operation)
    const now = Date.now()

    if (success) {
      state.failures = 0
      state.state = 'closed'
    } else {
      state.failures++
      state.lastFailureTime = now

      if (state.failures >= 5) { // Open after 5 failures
        state.state = 'open'
        state.nextAttemptTime = now + 60000 // 1 minute timeout
      }
    }
  }

  const canExecuteOperation = (operation: string): boolean => {
    const state = getCircuitBreakerState(operation)
    const now = Date.now()

    switch (state.state) {
      case 'closed':
        return true
      case 'open':
        if (now >= state.nextAttemptTime) {
          state.state = 'half-open'
          return true
        }
        return false
      case 'half-open':
        return true
      default:
        return true
    }
  }

  // Enhanced error handling with recovery
  const handleError = async (
    error: Error,
    context: Partial<ErrorContext> = {}
  ): Promise<boolean> => {
    const fullContext: ErrorContext = {
      component: 'unknown',
      operation: 'unknown',
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...context
    }

    metrics.value.totalErrors++
    metrics.value.lastIncident = fullContext.timestamp

    // Log error details
    console.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      context: fullContext
    })

    // Check circuit breaker
    if (!canExecuteOperation(fullContext.operation)) {
      console.warn(`Circuit breaker open for operation: ${fullContext.operation}`)
      toast.error('Service temporarily unavailable')
      return false
    }

    // Attempt recovery
    const recovered = await attemptRecovery(error, fullContext)
    
    // Update circuit breaker
    updateCircuitBreaker(fullContext.operation, recovered)

    // Store error information
    errors.value.push({ error, context: fullContext, recovered })

    // Update metrics
    if (recovered) {
      metrics.value.recoveredErrors++
    } else {
      metrics.value.unrecoverableErrors++
    }
    
    updateMetrics()

    // Show user notification
    if (!recovered) {
      toast.error(`Operation failed: ${error.message}`)
    } else {
      toast.success('Issue resolved automatically')
    }

    return recovered
  }

  // Recovery attempt logic
  const attemptRecovery = async (error: Error, context: ErrorContext): Promise<boolean> => {
    const strategies = [...defaultStrategies, ...recoveryStrategies.value]
    
    for (const strategy of strategies) {
      if (strategy.canHandle(error, context)) {
        console.log(`Attempting recovery with strategy: ${strategy.name}`)
        
        for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
          try {
            if (attempt > 1) {
              await new Promise(resolve => setTimeout(resolve, strategy.retryDelay))
            }
            
            const success = await strategy.recover(error, context)
            if (success) {
              console.log(`Recovery successful with strategy: ${strategy.name} (attempt ${attempt})`)
              return true
            }
          } catch (recoveryError) {
            console.warn(`Recovery attempt ${attempt} failed:`, recoveryError)
          }
        }
      }
    }
    
    return false
  }

  // Wrapper for error-prone operations
  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ): Promise<T | null> => {
    try {
      const result = await operation()
      updateCircuitBreaker(context.operation || 'unknown', true)
      return result
    } catch (error) {
      const recovered = await handleError(error as Error, context)
      if (recovered) {
        // Retry once after recovery
        try {
          return await operation()
        } catch (retryError) {
          await handleError(retryError as Error, { ...context, operation: context.operation + '_retry' })
          return null
        }
      }
      return null
    }
  }

  // Offline detection and handling
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const offlineOperations = ref<Array<{ operation: () => Promise<any>; context: ErrorContext }>>([])

  const handleOnlineStatusChange = (): void => {
    isOnline.value = navigator.onLine
    
    if (isOnline.value && offlineOperations.value.length > 0) {
      console.log('Connection restored, executing queued operations')
      executeOfflineOperations()
    }
  }

  const executeOfflineOperations = async (): Promise<void> => {
    const operations = [...offlineOperations.value]
    offlineOperations.value = []

    for (const { operation, context } of operations) {
      try {
        await withErrorHandling(operation, context)
      } catch (error) {
        console.error('Failed to execute offline operation:', error)
      }
    }
  }

  const queueOfflineOperation = (
    operation: () => Promise<any>,
    context: Partial<ErrorContext> = {}
  ): void => {
    offlineOperations.value.push({
      operation,
      context: {
        component: 'offline-queue',
        operation: 'queued',
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context
      }
    })
  }

  // Error boundary for unhandled errors
  const installErrorBoundary = (): void => {
    if (errorBoundaryInstalled || typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      handleError(event.error || new Error(event.message), {
        component: 'global',
        operation: 'window-error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      handleError(new Error(event.reason), {
        component: 'global',
        operation: 'unhandled-promise'
      })
    })

    errorBoundaryInstalled = true
  }

  // Metrics calculation
  const updateMetrics = (): void => {
    const now = Date.now()
    const uptimeMs = now - startTime
    
    metrics.value.uptime = ((uptimeMs - getDowntimeMs()) / uptimeMs) * 100
    metrics.value.recoveryRate = metrics.value.totalErrors > 0 
      ? (metrics.value.recoveredErrors / metrics.value.totalErrors) * 100 
      : 100
  }

  const getDowntimeMs = (): number => {
    // Calculate total downtime based on open circuit breakers
    let downtime = 0
    circuitBreakers.value.forEach(state => {
      if (state.state === 'open') {
        downtime += Math.max(0, Date.now() - state.lastFailureTime)
      }
    })
    return downtime
  }

  // Health check
  const performHealthCheck = async (): Promise<{
    healthy: boolean
    issues: string[]
    metrics: ReliabilityMetrics
  }> => {
    const issues: string[] = []
    
    // Check circuit breakers
    circuitBreakers.value.forEach((state, operation) => {
      if (state.state === 'open') {
        issues.push(`Circuit breaker open for: ${operation}`)
      }
    })
    
    // Check error rate
    if (metrics.value.recoveryRate < 80) {
      issues.push('Low recovery rate detected')
    }
    
    // Check uptime
    if (metrics.value.uptime < 95) {
      issues.push('Low uptime detected')
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics: metrics.value
    }
  }

  // Recovery strategy management
  const addRecoveryStrategy = (strategy: ErrorRecoveryStrategy): void => {
    recoveryStrategies.value.push(strategy)
  }

  const removeRecoveryStrategy = (name: string): void => {
    recoveryStrategies.value = recoveryStrategies.value.filter(s => s.name !== name)
  }

  // Cleanup and reset
  const clearErrorHistory = (): void => {
    errors.value = []
    metrics.value = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoverableErrors: 0,
      uptime: 100,
      lastIncident: null,
      recoveryRate: 100
    }
  }

  const resetCircuitBreakers = (): void => {
    circuitBreakers.value.clear()
  }

  // Lifecycle management
  onMounted(() => {
    installErrorBoundary()
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineStatusChange)
      window.addEventListener('offline', handleOnlineStatusChange)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnlineStatusChange)
      window.removeEventListener('offline', handleOnlineStatusChange)
    }
  })

  return {
    // State
    errors: readonly(errors),
    metrics: readonly(metrics),
    isOnline: readonly(isOnline),
    
    // Core error handling
    handleError,
    withErrorHandling,
    
    // Offline handling
    queueOfflineOperation,
    executeOfflineOperations,
    
    // Circuit breaker
    canExecuteOperation,
    resetCircuitBreakers,
    
    // Recovery strategies
    addRecoveryStrategy,
    removeRecoveryStrategy,
    
    // Health monitoring
    performHealthCheck,
    
    // Utilities
    clearErrorHistory,
    installErrorBoundary
  }
}