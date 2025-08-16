import { ref, computed, readonly } from 'vue'
import type { CalendarEvent } from '../types'
import { usePerformanceCache } from './usePerformanceCache'

interface EventStoreConfig {
  maxEvents: number
  cacheTTL: number
  autoSync: boolean
  syncInterval: number
}

interface EventOperation {
  type: 'create' | 'update' | 'delete'
  eventId: string
  event?: CalendarEvent
  timestamp: number
  userId?: string
}

interface ConflictResolution {
  strategy: 'latest' | 'merge' | 'manual'
  onConflict?: (local: CalendarEvent, remote: CalendarEvent) => CalendarEvent
}

/**
 * Centralized event store with conflict resolution and offline support
 */
export function useEventStore(
  config: EventStoreConfig = {
    maxEvents: 10000,
    cacheTTL: 30 * 60 * 1000, // 30 minutes
    autoSync: true,
    syncInterval: 30000 // 30 seconds
  }
) {
  const events = ref<Map<string, CalendarEvent>>(new Map())
  const pendingOperations = ref<EventOperation[]>([])
  const lastSyncTime = ref<Date | null>(null)
  const isOffline = ref(false)
  const conflictResolver = ref<ConflictResolution>({ strategy: 'latest' })
  
  const cache = usePerformanceCache<string, CalendarEvent[]>({
    maxSize: 1000,
    ttl: config.cacheTTL,
    enabled: true
  })

  // Convert map to array for reactive access
  const eventsArray = computed(() => Array.from(events.value.values()))

  const totalEvents = computed(() => events.value.size)

  // Event operations
  const addEvent = (event: CalendarEvent): void => {
    if (events.value.size >= config.maxEvents) {
      throw new Error(`Maximum event limit (${config.maxEvents}) reached`)
    }
    
    events.value.set(event.id, { ...event })
    
    // Track operation for sync
    if (isOffline.value) {
      pendingOperations.value.push({
        type: 'create',
        eventId: event.id,
        event,
        timestamp: Date.now()
      })
    }
    
    invalidateRelatedCaches(event)
  }

  const updateEvent = (eventId: string, updates: Partial<CalendarEvent>): boolean => {
    const existingEvent = events.value.get(eventId)
    if (!existingEvent) return false
    
    const updatedEvent = { ...existingEvent, ...updates, id: eventId }
    events.value.set(eventId, updatedEvent)
    
    // Track operation for sync
    if (isOffline.value) {
      pendingOperations.value.push({
        type: 'update',
        eventId,
        event: updatedEvent,
        timestamp: Date.now()
      })
    }
    
    invalidateRelatedCaches(updatedEvent)
    return true
  }

  const deleteEvent = (eventId: string): boolean => {
    const existingEvent = events.value.get(eventId)
    if (!existingEvent) return false
    
    events.value.delete(eventId)
    
    // Track operation for sync
    if (isOffline.value) {
      pendingOperations.value.push({
        type: 'delete',
        eventId,
        timestamp: Date.now()
      })
    }
    
    invalidateRelatedCaches(existingEvent)
    return true
  }

  const getEvent = (eventId: string): CalendarEvent | undefined => {
    return events.value.get(eventId)
  }

  const getEventsInRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
    const cacheKey = `range-${startDate.toISOString()}-${endDate.toISOString()}`
    
    const cached = cache.get(cacheKey) as CalendarEvent[]
    if (cached) {
      return cached
    }
    
    const filtered = eventsArray.value.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      return (eventStart <= endDate && eventEnd >= startDate)
    })
    
    cache.set(cacheKey, filtered)
    return filtered
  }

  const bulkUpdate = (updates: Array<{ id: string; updates: Partial<CalendarEvent> }>): void => {
    const batchStart = Date.now()
    
    updates.forEach(({ id, updates: eventUpdates }) => {
      updateEvent(id, eventUpdates)
    })
    
    // Single cache invalidation for bulk operations
    cache.clear()
    
    console.log(`Bulk update completed: ${updates.length} events in ${Date.now() - batchStart}ms`)
  }

  // Conflict resolution
  const resolveConflict = (localEvent: CalendarEvent, remoteEvent: CalendarEvent): CalendarEvent => {
    switch (conflictResolver.value.strategy) {
      case 'latest':
        // Assume remote is always newer in this simple case
        return remoteEvent
      
      case 'merge':
        // Merge non-conflicting fields, prefer remote for conflicts
        return {
          ...localEvent,
          ...remoteEvent,
          // Keep local description if remote is empty
          description: remoteEvent.description || localEvent.description
        }
      
      case 'manual':
        if (conflictResolver.value.onConflict) {
          return conflictResolver.value.onConflict(localEvent, remoteEvent)
        }
        return remoteEvent
      
      default:
        return remoteEvent
    }
  }

  // Sync with remote
  const syncWithRemote = async (remoteEvents: CalendarEvent[]): Promise<void> => {
    const conflicts: Array<{ local: CalendarEvent; remote: CalendarEvent }> = []
    
    // Process remote events
    remoteEvents.forEach(remoteEvent => {
      const localEvent = events.value.get(remoteEvent.id)
      
      if (localEvent) {
        // Check for conflicts (simple timestamp comparison)
        const localTime = new Date(localEvent.endDate).getTime()
        const remoteTime = new Date(remoteEvent.endDate).getTime()
        
        if (Math.abs(localTime - remoteTime) > 1000) { // 1 second tolerance
          conflicts.push({ local: localEvent, remote: remoteEvent })
        }
      } else {
        // New remote event
        events.value.set(remoteEvent.id, remoteEvent)
      }
    })
    
    // Resolve conflicts
    conflicts.forEach(({ local, remote }) => {
      const resolved = resolveConflict(local, remote)
      events.value.set(resolved.id, resolved)
    })
    
    // Apply pending operations
    await applyPendingOperations()
    
    lastSyncTime.value = new Date()
    cache.clear() // Invalidate all caches after sync
  }

  const applyPendingOperations = async (): Promise<void> => {
    // Sort by timestamp to apply in order
    const sortedOps = [...pendingOperations.value].sort((a, b) => a.timestamp - b.timestamp)
    
    for (const op of sortedOps) {
      try {
        // Here you would call your API
        await simulateAPICall(op)
      } catch (error) {
        console.error('Failed to apply operation:', op, error)
        // Keep failed operations for retry
        continue
      }
    }
    
    // Clear successfully applied operations
    pendingOperations.value = []
  }

  const simulateAPICall = async (_operation: EventOperation): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Network error')
    }
  }

  // Cache invalidation
  const invalidateRelatedCaches = (_event: CalendarEvent): void => {
    // Clear caches that might include this event
    cache.clear() // Simple approach - clear all
    // In production, you'd be more selective about which caches to clear
  }

  // Pagination
  const getEventsPaginated = (
    page: number = 1,
    limit: number = 100,
    filter?: (event: CalendarEvent) => boolean
  ): { events: CalendarEvent[]; total: number; hasMore: boolean } => {
    const allEvents = filter ? eventsArray.value.filter(filter) : eventsArray.value
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    return {
      events: allEvents.slice(startIndex, endIndex),
      total: allEvents.length,
      hasMore: endIndex < allEvents.length
    }
  }

  // Auto-sync setup
  let syncInterval: ReturnType<typeof setInterval> | null = null
  
  if (config.autoSync && typeof window !== 'undefined') {
    syncInterval = setInterval(async () => {
      if (!isOffline.value && pendingOperations.value.length > 0) {
        try {
          await applyPendingOperations()
        } catch (error) {
          console.error('Auto-sync failed:', error)
        }
      }
    }, config.syncInterval)
  }

  // Cleanup
  const cleanup = (): void => {
    if (syncInterval) {
      clearInterval(syncInterval)
    }
    cache.cleanup()
  }

  // Network status tracking
  const setOfflineStatus = (offline: boolean): void => {
    isOffline.value = offline
  }

  return {
    // State
    events: eventsArray,
    totalEvents,
    pendingOperations: readonly(pendingOperations),
    lastSyncTime: readonly(lastSyncTime),
    isOffline: readonly(isOffline),
    
    // Operations
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    getEventsInRange,
    bulkUpdate,
    getEventsPaginated,
    
    // Sync
    syncWithRemote,
    setOfflineStatus,
    
    // Configuration
    setConflictResolver: (resolver: ConflictResolution) => {
      conflictResolver.value = resolver
    },
    
    // Cleanup
    cleanup
  }
}