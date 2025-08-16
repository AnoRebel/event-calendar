import { ref, readonly } from 'vue'
import type { CalendarEvent } from '../types'
import { useEventStore } from './useEventStore'
import { usePerformanceCache } from './usePerformanceCache'

interface APIConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

interface APIError {
  status: number
  message: string
  code?: string
  details?: any
}

/**
 * API integration layer with automatic retry and caching
 */
export function useEventAPI(
  config: APIConfig = {
    baseURL: '/api/events',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  }
) {
  const isLoading = ref(false)
  const lastError = ref<APIError | null>(null)
  const requestsInFlight = ref(new Set<string>())
  
  const store = useEventStore()
  const cache = usePerformanceCache<string, any>({
    maxSize: 100,
    ttl: 2 * 60 * 1000, // 2 minutes for API responses
    enabled: true
  })

  // Request deduplication
  const makeRequest = async <T>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<T> => {
    // Prevent duplicate requests
    if (requestsInFlight.value.has(url)) {
      throw new APIError(429, 'Request already in progress')
    }
    
    // Check cache first
    if (cacheKey) {
      const cached = cache.get(cacheKey)
      if (cached) {
        return cached as T
      }
    }
    
    requestsInFlight.value.add(url)
    isLoading.value = true
    lastError.value = null
    
    try {
      const response = await retryRequest(url, options)
      const data = await response.json()
      
      if (cacheKey) {
        cache.set(cacheKey, data)
      }
      
      return data as T
    } catch (error) {
      const apiError = error instanceof APIError ? error : new APIError(500, 'Network error')
      lastError.value = apiError
      throw apiError
    } finally {
      requestsInFlight.value.delete(url)
      isLoading.value = requestsInFlight.value.size > 0
    }
  }

  const retryRequest = async (url: string, options: RequestInit): Promise<Response> => {
    let lastError: Error
    
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), config.timeout)
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new APIError(response.status, `HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response
      } catch (error) {
        lastError = error as Error
        
        if (attempt < config.retryAttempts) {
          const delay = config.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }

  // Event API methods
  const fetchEvents = async (
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 100
  ): Promise<PaginatedResponse<CalendarEvent>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    
    if (startDate) params.append('start', startDate.toISOString())
    if (endDate) params.append('end', endDate.toISOString())
    
    const url = `${config.baseURL}?${params}`
    const cacheKey = `events-${params.toString()}`
    
    return makeRequest<PaginatedResponse<CalendarEvent>>(url, { method: 'GET' }, cacheKey)
  }

  const createEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    const url = config.baseURL
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizeEventData(event))
    }
    
    const createdEvent = await makeRequest<CalendarEvent>(url, options)
    
    // Update local store
    store.addEvent(createdEvent)
    
    // Invalidate related caches
    cache.clear()
    
    return createdEvent
  }

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const url = `${config.baseURL}/${id}`
    const options: RequestInit = {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizeEventData(updates))
    }
    
    const updatedEvent = await makeRequest<CalendarEvent>(url, options)
    
    // Update local store
    store.updateEvent(id, updatedEvent)
    
    // Invalidate related caches
    cache.clear()
    
    return updatedEvent
  }

  const deleteEvent = async (id: string): Promise<void> => {
    const url = `${config.baseURL}/${id}`
    const options: RequestInit = { method: 'DELETE' }
    
    await makeRequest<void>(url, options)
    
    // Update local store
    store.deleteEvent(id)
    
    // Invalidate related caches
    cache.clear()
  }

  const bulkUpdate = async (updates: Array<{ id: string; updates: Partial<CalendarEvent> }>): Promise<CalendarEvent[]> => {
    const url = `${config.baseURL}/bulk`
    const options: RequestInit = {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: updates.map(u => ({
          id: u.id,
          ...sanitizeEventData(u.updates)
        }))
      })
    }
    
    const updatedEvents = await makeRequest<CalendarEvent[]>(url, options)
    
    // Update local store
    store.bulkUpdate(updates)
    
    // Invalidate related caches
    cache.clear()
    
    return updatedEvents
  }

  // Sync local store with API
  const syncEvents = async (force: boolean = false): Promise<void> => {
    if (!force && isLoading.value) return
    
    try {
      const response = await fetchEvents()
      await store.syncWithRemote(response.data)
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    }
  }

  // Data sanitization
  const sanitizeEventData = (event: Partial<CalendarEvent>): any => {
    const sanitized = { ...event }
    
    // Remove undefined values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key as keyof CalendarEvent] === undefined) {
        delete sanitized[key as keyof CalendarEvent]
      }
    })
    
    // Ensure dates are ISO strings for API
    if (sanitized.startDate) {
      sanitized.startDate = new Date(sanitized.startDate).toISOString() as any
    }
    if (sanitized.endDate) {
      sanitized.endDate = new Date(sanitized.endDate).toISOString() as any
    }
    
    return sanitized
  }

  // Background sync
  let syncInterval: ReturnType<typeof setInterval> | null = null
  
  const startBackgroundSync = (intervalMs: number = 60000): void => {
    if (syncInterval || typeof window === 'undefined') return
    
    syncInterval = setInterval(async () => {
      try {
        await syncEvents()
      } catch (error) {
        console.warn('Background sync failed:', error)
      }
    }, intervalMs)
  }

  const stopBackgroundSync = (): void => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
  }

  // Connection status monitoring
  const checkConnection = async (): Promise<boolean> => {
    try {
      const url = `${config.baseURL}/health`
      await makeRequest<{ status: string }>(url, { method: 'GET' })
      return true
    } catch {
      return false
    }
  }

  // Cleanup
  const cleanup = (): void => {
    stopBackgroundSync()
    cache.cleanup()
    store.cleanup()
  }

  return {
    // State
    isLoading: readonly(isLoading),
    lastError: readonly(lastError),
    
    // API methods
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    bulkUpdate,
    syncEvents,
    
    // Connection
    checkConnection,
    startBackgroundSync,
    stopBackgroundSync,
    
    // Store access
    store,
    
    // Cleanup
    cleanup
  }
}

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}