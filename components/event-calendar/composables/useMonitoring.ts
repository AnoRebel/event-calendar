import { ref, readonly, onMounted } from 'vue'

interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
}

interface ErrorMetric {
  error: string
  count: number
  lastOccurrence: Date
  component?: string
  userAgent?: string
}

interface MonitoringConfig {
  enablePerformanceTracking: boolean
  enableErrorTracking: boolean
  enableUserInteractionTracking: boolean
  sampleRate: number
  maxMetrics: number
  reportingInterval: number
}

/**
 * Production monitoring and analytics
 */
export function useMonitoring(
  config: MonitoringConfig = {
    enablePerformanceTracking: true,
    enableErrorTracking: true,
    enableUserInteractionTracking: true,
    sampleRate: 0.1, // 10% sampling
    maxMetrics: 1000,
    reportingInterval: 30000 // 30 seconds
  }
) {
  const metrics = ref<PerformanceMetric[]>([])
  const errors = ref<Map<string, ErrorMetric>>(new Map())
  const isInitialized = ref(false)
  const sessionId = ref('')

  let reportingTimer: ReturnType<typeof setInterval> | null = null

  // Core Web Vitals tracking
  const trackWebVitals = (): void => {
    if (!config.enablePerformanceTracking || typeof window === 'undefined') return

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          
          if (lastEntry) {
            recordMetric({
              name: 'web_vitals_lcp',
              value: lastEntry.startTime,
              timestamp: new Date(),
              tags: { type: 'core_web_vital' }
            })
          }
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (error) {
        console.warn('LCP observer not supported:', error)
      }

      // First Input Delay
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            recordMetric({
              name: 'web_vitals_fid',
              value: entry.processingStart - entry.startTime,
              timestamp: new Date(),
              tags: { type: 'core_web_vital' }
            })
          })
        })
        observer.observe({ entryTypes: ['first-input'] })
      } catch (error) {
        console.warn('FID observer not supported:', error)
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          
          recordMetric({
            name: 'web_vitals_cls',
            value: clsValue,
            timestamp: new Date(),
            tags: { type: 'core_web_vital' }
          })
        })
        observer.observe({ entryTypes: ['layout-shift'] })
      } catch (error) {
        console.warn('CLS observer not supported:', error)
      }
    }
  }

  // Custom performance tracking
  const trackPageLoad = (): void => {
    if (!config.enablePerformanceTracking || typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const timing = performance.timing
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      // Page load time
      recordMetric({
        name: 'page_load_time',
        value: timing.loadEventEnd - timing.navigationStart,
        timestamp: new Date(),
        tags: { type: 'performance' }
      })

      // DNS lookup time
      recordMetric({
        name: 'dns_lookup_time',
        value: timing.domainLookupEnd - timing.domainLookupStart,
        timestamp: new Date(),
        tags: { type: 'performance' }
      })

      // Server response time
      recordMetric({
        name: 'server_response_time',
        value: timing.responseEnd - timing.requestStart,
        timestamp: new Date(),
        tags: { type: 'performance' }
      })

      // DOM processing time
      recordMetric({
        name: 'dom_processing_time',
        value: timing.domComplete - timing.domLoading,
        timestamp: new Date(),
        tags: { type: 'performance' }
      })

      // Time to Interactive (approximation)
      if (navigationTiming?.loadEventEnd) {
        recordMetric({
          name: 'time_to_interactive',
          value: navigationTiming.loadEventEnd,
          timestamp: new Date(),
          tags: { type: 'performance' }
        })
      }
    })
  }

  // Resource performance tracking
  const trackResourcePerformance = (): void => {
    if (!config.enablePerformanceTracking || typeof window === 'undefined') return

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.duration > 1000) { // Only track slow resources
              recordMetric({
                name: 'slow_resource_load',
                value: entry.duration,
                timestamp: new Date(),
                tags: {
                  type: 'resource_performance',
                  resource: entry.name,
                  resource_type: (entry as any).initiatorType
                }
              })
            }
          })
        })
        observer.observe({ entryTypes: ['resource'] })
      } catch (error) {
        console.warn('Resource observer not supported:', error)
      }
    }
  }

  // User interaction tracking
  const trackUserInteractions = (): void => {
    if (!config.enableUserInteractionTracking || typeof window === 'undefined') return

    const interactionEvents = ['click', 'scroll', 'keydown']
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (Math.random() > config.sampleRate) return // Sampling

        recordMetric({
          name: `user_interaction_${eventType}`,
          value: 1,
          timestamp: new Date(),
          tags: { type: 'user_interaction' }
        })
      }, { passive: true })
    })

    // Track session duration
    const sessionStart = Date.now()
    window.addEventListener('beforeunload', () => {
      recordMetric({
        name: 'session_duration',
        value: Date.now() - sessionStart,
        timestamp: new Date(),
        tags: { type: 'user_behavior' }
      })
    })
  }

  // Error tracking
  const trackErrors = (): void => {
    if (!config.enableErrorTracking || typeof window === 'undefined') return

    // JavaScript errors
    window.addEventListener('error', (event) => {
      recordError({
        error: event.error?.message || event.message,
        component: 'global',
        userAgent: navigator.userAgent,
        additional: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      })
    })

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      recordError({
        error: event.reason?.message || 'Unhandled Promise Rejection',
        component: 'global',
        userAgent: navigator.userAgent,
        additional: {
          reason: event.reason
        }
      })
    })
  }

  // Calendar-specific performance tracking
  const trackCalendarPerformance = (operation: string, duration: number, metadata?: Record<string, any>): void => {
    recordMetric({
      name: `calendar_${operation}_duration`,
      value: duration,
      timestamp: new Date(),
      tags: {
        type: 'calendar_performance',
        operation,
        ...metadata
      }
    })
  }

  const recordMetric = (metric: PerformanceMetric): void => {
    if (metrics.value.length >= config.maxMetrics) {
      // Remove oldest metrics
      metrics.value.splice(0, Math.floor(config.maxMetrics * 0.1))
    }
    
    metrics.value.push(metric)
  }

  const recordError = (errorData: {
    error: string
    component?: string
    userAgent?: string
    additional?: any
  }): void => {
    const errorKey = `${errorData.error}_${errorData.component}`
    const existing = errors.value.get(errorKey)
    
    if (existing) {
      existing.count++
      existing.lastOccurrence = new Date()
    } else {
      errors.value.set(errorKey, {
        error: errorData.error,
        count: 1,
        lastOccurrence: new Date(),
        component: errorData.component,
        userAgent: errorData.userAgent
      })
    }
  }

  // Performance measurement utilities
  const measureOperation = async <T>(
    operationName: string,
    operation: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      const duration = performance.now() - startTime
      
      trackCalendarPerformance(operationName, duration, metadata)
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      trackCalendarPerformance(`${operationName}_error`, duration, metadata)
      recordError({
        error: error instanceof Error ? error.message : 'Unknown error',
        component: operationName
      })
      
      throw error
    }
  }

  // Reporting
  const generateReport = (): {
    session: string
    timestamp: Date
    metrics: PerformanceMetric[]
    errors: ErrorMetric[]
    summary: {
      totalMetrics: number
      totalErrors: number
      averagePageLoadTime: number
      errorRate: number
    }
  } => {
    const pageLoadMetrics = metrics.value.filter(m => m.name === 'page_load_time')
    const averagePageLoadTime = pageLoadMetrics.length > 0
      ? pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length
      : 0

    const totalErrors = Array.from(errors.value.values()).reduce((sum, e) => sum + e.count, 0)
    const errorRate = metrics.value.length > 0 ? (totalErrors / metrics.value.length) * 100 : 0

    return {
      session: sessionId.value,
      timestamp: new Date(),
      metrics: [...metrics.value],
      errors: Array.from(errors.value.values()),
      summary: {
        totalMetrics: metrics.value.length,
        totalErrors,
        averagePageLoadTime,
        errorRate
      }
    }
  }

  const sendReport = async (report: ReturnType<typeof generateReport>): Promise<void> => {
    if (typeof window === 'undefined') return

    try {
      // Send to your analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      })
    } catch (error) {
      console.warn('Failed to send analytics report:', error)
    }
  }

  const startReporting = (): void => {
    if (reportingTimer || typeof window === 'undefined') return

    reportingTimer = setInterval(async () => {
      if (metrics.value.length === 0 && errors.value.size === 0) return

      const report = generateReport()
      await sendReport(report)
      
      // Clear metrics after sending
      metrics.value = []
      errors.value.clear()
    }, config.reportingInterval)
  }

  const stopReporting = (): void => {
    if (reportingTimer) {
      clearInterval(reportingTimer)
      reportingTimer = null
    }
  }

  // Utility functions
  const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  // Initialize monitoring
  const initialize = (): void => {
    if (isInitialized.value || typeof window === 'undefined') return

    sessionId.value = generateSessionId()
    trackWebVitals()
    trackPageLoad()
    trackResourcePerformance()
    trackUserInteractions()
    trackErrors()
    startReporting()
    
    isInitialized.value = true
  }

  const cleanup = (): void => {
    stopReporting()
    isInitialized.value = false
  }

  onMounted(() => {
    // Delay initialization to avoid affecting page load performance
    setTimeout(initialize, 1000)
  })

  return {
    // State
    metrics: readonly(metrics),
    errors: readonly(errors),
    isInitialized: readonly(isInitialized),
    sessionId: readonly(sessionId),
    
    // Tracking methods
    trackCalendarPerformance,
    measureOperation,
    recordError,
    
    // Reporting
    generateReport,
    sendReport,
    
    // Control
    initialize,
    cleanup,
    startReporting,
    stopReporting
  }
}