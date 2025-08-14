import { ref, computed, type Ref } from 'vue'
import type { CalendarEvent } from '../types'

export interface ResizeConfig {
  enabled: boolean
  snapToGrid: boolean
  minDuration: number // in minutes
  maxDuration: number // in minutes
  animationDuration: number // in milliseconds
  handles: ('top' | 'bottom')[]
}

export interface ResizeState {
  isResizing: boolean
  resizeHandle: 'top' | 'bottom' | null
  originalEvent: CalendarEvent | null
  previewEvent: CalendarEvent | null
  resizingEventId: string | null
}

const DEFAULT_RESIZE_CONFIG: ResizeConfig = {
  enabled: true,
  snapToGrid: true,
  minDuration: 15, // 15 minutes
  maxDuration: 24 * 60, // 24 hours
  animationDuration: 200,
  handles: ['top', 'bottom']
}

/**
 * Composable for managing event resize functionality
 */
export function useEventResize(
  events: Ref<CalendarEvent[]>,
  onEventUpdate: (event: CalendarEvent) => void,
  config: Partial<ResizeConfig> = {}
) {
  const resizeConfig = ref<ResizeConfig>({
    ...DEFAULT_RESIZE_CONFIG,
    ...config
  })

  const resizeState = ref<ResizeState>({
    isResizing: false,
    resizeHandle: null,
    originalEvent: null,
    previewEvent: null,
    resizingEventId: null
  })

  // Check if an event is currently being resized
  const isEventResizing = (eventId: string): boolean => {
    return resizeState.value.resizingEventId === eventId
  }

  // Check if resize is enabled for an event
  const canResizeEvent = (event: CalendarEvent): boolean => {
    return (
      resizeConfig.value.enabled &&
      !event.allDay && // Only timed events can be resized
      event.startDate instanceof Date &&
      event.endDate instanceof Date
    )
  }

  // Get available resize handles for an event
  const getResizeHandles = (event: CalendarEvent): ('top' | 'bottom')[] => {
    if (!canResizeEvent(event)) return []
    return resizeConfig.value.handles
  }

  // Start resize operation
  const startResize = (event: CalendarEvent, handle: 'top' | 'bottom') => {
    if (!canResizeEvent(event)) return

    resizeState.value = {
      isResizing: true,
      resizeHandle: handle,
      originalEvent: { ...event },
      previewEvent: { ...event },
      resizingEventId: event.id
    }
  }

  // Update resize preview
  const updateResize = (previewEvent: CalendarEvent) => {
    if (!resizeState.value.isResizing) return

    resizeState.value.previewEvent = previewEvent
  }

  // End resize operation and commit changes
  const endResize = (finalEvent: CalendarEvent) => {
    if (!resizeState.value.isResizing || !resizeState.value.originalEvent) return

    // Validate the final event
    const isValid = validateResizedEvent(finalEvent)
    
    if (isValid) {
      // Commit the changes
      onEventUpdate(finalEvent)
    } else {
      // Revert to original if invalid
      console.warn('Invalid resize operation, reverting to original event')
    }

    // Reset resize state
    resizeState.value = {
      isResizing: false,
      resizeHandle: null,
      originalEvent: null,
      previewEvent: null,
      resizingEventId: null
    }
  }

  // Cancel resize operation
  const cancelResize = () => {
    resizeState.value = {
      isResizing: false,
      resizeHandle: null,
      originalEvent: null,
      previewEvent: null,
      resizingEventId: null
    }
  }

  // Validate resized event
  const validateResizedEvent = (event: CalendarEvent): boolean => {
    const duration = event.endDate.getTime() - event.startDate.getTime()
    const durationMinutes = duration / (1000 * 60)

    // Check minimum duration
    if (durationMinutes < resizeConfig.value.minDuration) {
      return false
    }

    // Check maximum duration
    if (durationMinutes > resizeConfig.value.maxDuration) {
      return false
    }

    // Check that start is before end
    if (event.startDate >= event.endDate) {
      return false
    }

    return true
  }

  // Snap time to grid
  const snapToGrid = (date: Date, snapInterval: number = 15): Date => {
    if (!resizeConfig.value.snapToGrid) return date

    const minutes = date.getMinutes()
    const snappedMinutes = Math.round(minutes / snapInterval) * snapInterval
    
    const snappedDate = new Date(date)
    snappedDate.setMinutes(snappedMinutes, 0, 0)
    
    return snappedDate
  }

  // Calculate resize constraints for an event
  const getResizeConstraints = (event: CalendarEvent, handle: 'top' | 'bottom') => {
    const eventStart = new Date(event.startDate)
    const eventEnd = new Date(event.endDate)
    
    if (handle === 'top') {
      // When resizing from top, the end time is fixed
      const maxStart = new Date(eventEnd.getTime() - resizeConfig.value.minDuration * 60 * 1000)
      const minStart = new Date(eventEnd.getTime() - resizeConfig.value.maxDuration * 60 * 1000)
      
      return {
        minTime: minStart,
        maxTime: maxStart,
        fixedTime: eventEnd
      }
    } else {
      // When resizing from bottom, the start time is fixed
      const minEnd = new Date(eventStart.getTime() + resizeConfig.value.minDuration * 60 * 1000)
      const maxEnd = new Date(eventStart.getTime() + resizeConfig.value.maxDuration * 60 * 1000)
      
      return {
        minTime: minEnd,
        maxTime: maxEnd,
        fixedTime: eventStart
      }
    }
  }

  // Update resize configuration
  const updateConfig = (newConfig: Partial<ResizeConfig>) => {
    resizeConfig.value = { ...resizeConfig.value, ...newConfig }
  }

  // Get current resize preview event
  const getResizePreview = (): CalendarEvent | null => {
    return resizeState.value.previewEvent
  }

  // Check if resize is currently active
  const isResizeActive = computed(() => resizeState.value.isResizing)

  // Get the currently resizing event ID
  const resizingEventId = computed(() => resizeState.value.resizingEventId)

  // Get resize handle position
  const resizeHandle = computed(() => resizeState.value.resizeHandle)

  return {
    resizeConfig,
    resizeState,
    isResizeActive,
    resizingEventId,
    resizeHandle,
    isEventResizing,
    canResizeEvent,
    getResizeHandles,
    startResize,
    updateResize,
    endResize,
    cancelResize,
    validateResizedEvent,
    snapToGrid,
    getResizeConstraints,
    updateConfig,
    getResizePreview
  }
}