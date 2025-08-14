import type { CalendarEvent } from './types'

/**
 * Performance utilities for calendar operations
 */

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for drag operations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Memoization for expensive calculations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Virtual scrolling helper for large event lists
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
) {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const end = Math.min(totalItems, start + visibleCount + overscan * 2)
  
  return { start, end }
}

// Efficient event filtering with caching
export const createEventFilter = memoize((
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
) => {
  return events.filter(event => {
    const eventStart = new Date(event.startDate)
    const eventEnd = new Date(event.endDate)
    
    return eventStart <= endDate && eventEnd >= startDate
  })
})

// Batch DOM updates for better performance
export function batchDOMUpdates(callback: () => void) {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(callback)
  } else {
    setTimeout(callback, 0)
  }
}

// Memory cleanup utilities
export function cleanupEventListeners(
  element: HTMLElement,
  events: Array<{ type: string; handler: EventListener }>
) {
  events.forEach(({ type, handler }) => {
    element.removeEventListener(type, handler)
  })
}

// Optimize color calculations
export const getOptimizedColorClasses = memoize((color: string) => {
  const colorMap: Record<string, any> = {
    sky: {
      bg: 'bg-sky-200 dark:bg-sky-700',
      border: 'border-sky-400 dark:border-sky-500',
      text: 'text-sky-800 dark:text-sky-100',
      hover: 'hover:bg-sky-300 dark:hover:bg-sky-600'
    },
    emerald: {
      bg: 'bg-emerald-200 dark:bg-emerald-700',
      border: 'border-emerald-400 dark:border-emerald-500',
      text: 'text-emerald-800 dark:text-emerald-100',
      hover: 'hover:bg-emerald-300 dark:hover:bg-emerald-600'
    },
    violet: {
      bg: 'bg-violet-200 dark:bg-violet-700',
      border: 'border-violet-400 dark:border-violet-500',
      text: 'text-violet-800 dark:text-violet-100',
      hover: 'hover:bg-violet-300 dark:hover:bg-violet-600'
    },
    rose: {
      bg: 'bg-rose-200 dark:bg-rose-700',
      border: 'border-rose-400 dark:border-rose-500',
      text: 'text-rose-800 dark:text-rose-100',
      hover: 'hover:bg-rose-300 dark:hover:bg-rose-600'
    },
    amber: {
      bg: 'bg-amber-200 dark:bg-amber-700',
      border: 'border-amber-400 dark:border-amber-500',
      text: 'text-amber-800 dark:text-amber-100',
      hover: 'hover:bg-amber-300 dark:hover:bg-amber-600'
    },
    orange: {
      bg: 'bg-orange-200 dark:bg-orange-700',
      border: 'border-orange-400 dark:border-orange-500',
      text: 'text-orange-800 dark:text-orange-100',
      hover: 'hover:bg-orange-300 dark:hover:bg-orange-600'
    }
  }
  
  return colorMap[color] || colorMap.sky
})

// Performance monitoring
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (typeof performance !== 'undefined') {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    console.log(`${name} took ${end - start} milliseconds`)
    return result
  }
  return fn()
}