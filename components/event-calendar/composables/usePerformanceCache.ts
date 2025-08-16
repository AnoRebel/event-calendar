import { ref, computed, readonly } from 'vue'
import type { CalendarEvent } from '../types'

interface CacheEntry<T> {
  value: T
  timestamp: number
  hits: number
}

interface CacheConfig {
  maxSize: number
  ttl: number // Time to live in milliseconds
  enabled: boolean
}

/**
 * High-performance caching system for expensive operations
 * Includes LRU eviction and TTL support
 */
export function usePerformanceCache<TKey = string, TValue = any>(
  config: CacheConfig = {
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5 minutes
    enabled: true
  }
) {
  const cache = new Map<TKey, CacheEntry<TValue>>()
  const stats = ref({
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  })

  const get = (key: TKey): TValue | undefined => {
    if (!config.enabled) return undefined
    
    const entry = cache.get(key)
    if (!entry) {
      stats.value.misses++
      return undefined
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > config.ttl) {
      cache.delete(key)
      stats.value.misses++
      return undefined
    }
    
    entry.hits++
    stats.value.hits++
    
    // Move to end (LRU)
    cache.delete(key)
    cache.set(key, entry)
    
    return entry.value
  }

  const set = (key: TKey, value: TValue): void => {
    if (!config.enabled) return
    
    // Evict if at max size
    if (cache.size >= config.maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
        stats.value.evictions++
      }
    }
    
    cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    })
    
    stats.value.size = cache.size
  }

  const has = (key: TKey): boolean => {
    const entry = cache.get(key)
    return !!entry && (Date.now() - entry.timestamp <= config.ttl)
  }

  const clear = (): void => {
    cache.clear()
    stats.value = { hits: 0, misses: 0, evictions: 0, size: 0 }
  }

  const getOrCompute = async <T>(
    key: TKey,
    computeFn: () => Promise<T> | T
  ): Promise<T> => {
    const cached = get(key) as T
    if (cached !== undefined) {
      return cached
    }
    
    const computed = await computeFn()
    set(key, computed as TValue)
    return computed
  }

  // Automatic cleanup of expired entries
  const cleanup = (): void => {
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > config.ttl) {
        cache.delete(key)
      }
    }
    stats.value.size = cache.size
  }

  // Cleanup every 5 minutes (client-side only)
  const cleanupInterval = typeof window !== 'undefined' ? setInterval(cleanup, 5 * 60 * 1000) : null

  const hitRate = computed(() => {
    const total = stats.value.hits + stats.value.misses
    return total === 0 ? 0 : (stats.value.hits / total) * 100
  })

  return {
    get,
    set,
    has,
    clear,
    getOrCompute,
    stats: readonly(stats),
    hitRate,
    cleanup: () => {
      clearInterval(cleanupInterval)
      clear()
    }
  }
}

/**
 * Specialized cache for event operations
 */
export function useEventCache() {
  const cache = usePerformanceCache<string, CalendarEvent[]>({
    maxSize: 500,
    ttl: 10 * 60 * 1000, // 10 minutes
    enabled: true
  })

  const getEventsForDateRange = async (
    startDate: Date,
    endDate: Date,
    computeFn: () => Promise<CalendarEvent[]> | CalendarEvent[]
  ): Promise<CalendarEvent[]> => {
    const key = `${startDate.toISOString()}-${endDate.toISOString()}`
    return cache.getOrCompute(key, computeFn)
  }

  return {
    ...cache,
    getEventsForDateRange
  }
}

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): T {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

/**
 * Throttle hook for frequent operations
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 100
): T {
  let lastCall = 0
  
  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn(...args)
    }
  }) as T
}