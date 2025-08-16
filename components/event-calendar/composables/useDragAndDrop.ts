import { ref, type Ref, reactive } from "vue"
import { useDraggable, useDroppable, type IUseDragOptions, type IUseDropOptions } from "@vue-dnd-kit/core"
import { startOfDay, endOfDay, addMinutes, setHours, setMinutes } from "date-fns"
import type { CalendarEvent } from "../types"
import { useCalendarUtils } from "./useCalendarUtils"

export interface DragDropConfig {
  enabled: boolean
  crossViewEnabled: boolean
  visualFeedback: boolean
  snapToGrid: boolean
  allowTimeChange: boolean
  allowDateChange: boolean
  showDuration: boolean
  enableResize: boolean
}

export interface DropZoneInfo {
  id: string
  type: 'time-slot' | 'all-day' | 'day-cell'
  date: Date
  time?: string
  isValid: boolean
  element?: HTMLElement
}

export interface DragState {
  isDragging: boolean
  draggedEvent?: CalendarEvent
  validDropZones: DropZoneInfo[]
  currentDropZone?: DropZoneInfo
  dragPreview?: { x: number; y: number; event: CalendarEvent }
  originalEvent?: CalendarEvent
}

// Global drag state for cross-view compatibility
const globalDragState = reactive<DragState>({
  isDragging: false,
  validDropZones: [],
})

// Configuration with enhanced defaults
const defaultConfig: DragDropConfig = {
  enabled: true,
  crossViewEnabled: true,
  visualFeedback: true,
  snapToGrid: true,
  allowTimeChange: true,
  allowDateChange: true,
  showDuration: true,
  enableResize: true
}

export function useDragAndDropSystem(config: Partial<DragDropConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }
  const { getDropTime } = useCalendarUtils()

  // Enhanced drag configuration with vue-dnd-kit
  const createDragConfig = (
    zoneId: string,
    zoneType: 'all-day' | 'timed' | 'day-cell',
    dateKey: string,
    onEventUpdate: (event: CalendarEvent) => void,
    pixelsPerHour = 60
  ) => {
    const handleDrop = (droppedEvent: CalendarEvent) => {
      try {
        let updatedEvent: CalendarEvent

        if (zoneType === 'all-day') {
          const newDate = new Date(dateKey)
          if (isNaN(newDate.getTime())) {
            throw new Error(`Invalid date: ${dateKey}`)
          }
          updatedEvent = {
            ...droppedEvent,
            startDate: newDate,
            endDate: new Date(newDate),
            allDay: true
          }
        } else if (zoneType === 'timed') {
          const originalStart = new Date(droppedEvent.startDate)
          const originalEnd = new Date(droppedEvent.endDate)
          if (isNaN(originalStart.getTime()) || isNaN(originalEnd.getTime())) {
            throw new Error('Invalid original event dates')
          }
          
          const originalDuration = originalEnd.getTime() - originalStart.getTime()
          const newStart = new Date(dateKey + 'T09:00:00')
          if (isNaN(newStart.getTime())) {
            throw new Error(`Invalid date: ${dateKey}`)
          }
          const newEnd = new Date(newStart.getTime() + originalDuration)
          
          updatedEvent = {
            ...droppedEvent,
            startDate: newStart,
            endDate: newEnd,
            allDay: false
          }
        } else {
          const originalStart = new Date(droppedEvent.startDate)
          const originalEnd = new Date(droppedEvent.endDate)
          
          updatedEvent = {
            ...droppedEvent,
            startDate: new Date(dateKey + 'T' + originalStart.toTimeString().split(' ')[0]),
            endDate: new Date(dateKey + 'T' + originalEnd.toTimeString().split(' ')[0])
          }
        }
        
        onEventUpdate(updatedEvent)
      } catch (error) {
        console.error('❌ Error updating event:', error)
      }
    }

    return {
      zoneId,
      zoneType,
      dateKey,
      handleDrop,
      disabled: !finalConfig.enabled
    }
  }

  // Helper function to create draggable events
  const createDraggableEvent = (event: CalendarEvent) => {
    // Only create draggable on client-side
    if (typeof window === 'undefined') {
      return {
        elementRef: ref(null),
        isDragging: ref(false),
        handleDragStart: () => {},
        handleDragEnd: () => {}
      }
    }

    const { elementRef, isDragging } = useDraggable({
      id: `event-${event.id}`,
      disabled: !finalConfig.enabled,
      data: event
    })

    const handleDragStart = (dragEvent: DragEvent) => {
      if (!dragEvent.dataTransfer || !event) return
      
      globalDragState.isDragging = true
      globalDragState.draggedEvent = event
      
      dragEvent.dataTransfer.setData('application/json', JSON.stringify(event))
      dragEvent.dataTransfer.effectAllowed = 'move'
      
      if (typeof document !== 'undefined') {
        document.body.classList.add('dragging-event')
      }
    }

    const handleDragEnd = () => {
      globalDragState.isDragging = false
      globalDragState.draggedEvent = undefined
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dragging-event')
      }
    }

    return {
      elementRef,
      isDragging,
      handleDragStart,
      handleDragEnd
    }
  }

  // Helper function to create droppable zones
  const createDroppableZone = (config: ReturnType<typeof createDragConfig>) => {
    // Only create droppable on client-side
    if (typeof window === 'undefined') {
      return {
        elementRef: ref(null),
        isOver: ref(false)
      }
    }

    const { elementRef, isOvered: isOver } = useDroppable({
      id: `zone-${config.zoneId}`,
      disabled: config.disabled,
      onDrop: (store, payload) => {
        try {
          const droppedEvent = payload.draggedEl?.eventData as CalendarEvent
          if (droppedEvent && config.handleDrop) {
            config.handleDrop(droppedEvent)
          }
        } catch (error) {
          console.error('Failed to handle drop:', error)
        }
      }
    })

    return {
      elementRef,
      isOver
    }
  }

  // Validate if an event can be dropped in a specific zone
  const validateDropZone = (event: CalendarEvent, targetElement: HTMLElement): boolean => {
    if (!finalConfig.allowDateChange && !finalConfig.allowTimeChange) return false
    
    const targetType = targetElement.dataset.type
    const targetDate = targetElement.dataset.dateKey
    
    if (!targetDate) return false
    
    return true
  }

  // Calculate the updated event based on drop location
  const calculateEventUpdate = (
    originalEvent: CalendarEvent,
    targetElement: HTMLElement,
    dateKey: string,
    zoneType: string,
    pixelsPerHour: number,
    mouseEvent: MouseEvent
  ): CalendarEvent | null => {
    const duration = new Date(originalEvent.endDate).getTime() - new Date(originalEvent.startDate).getTime()
    const baseDateOfDrop = new Date(dateKey)
    const actualZoneType = targetElement.dataset.type || zoneType

    let newStart: Date
    let newEnd: Date

    switch (actualZoneType) {
      case "allDay":
      case "all-day":
        newStart = startOfDay(baseDateOfDrop)
        newEnd = originalEvent.allDay ? 
          new Date(newStart.getTime() + duration) : 
          endOfDay(baseDateOfDrop)
        return { 
          ...originalEvent, 
          startDate: newStart, 
          endDate: newEnd, 
          allDay: true 
        }

      case "timed":
      case "time-slot":
        if (finalConfig.snapToGrid) {
          newStart = getDropTime(mouseEvent, targetElement, baseDateOfDrop, pixelsPerHour)
        } else {
          newStart = new Date(baseDateOfDrop)
          const hours = Math.floor((mouseEvent.offsetY || 0) / pixelsPerHour)
          const minutes = Math.floor(((mouseEvent.offsetY || 0) % pixelsPerHour) / (pixelsPerHour / 60))
          newStart = setMinutes(setHours(newStart, hours), minutes)
        }
        newEnd = new Date(newStart.getTime() + duration)
        return { 
          ...originalEvent, 
          startDate: newStart, 
          endDate: newEnd, 
          allDay: false 
        }

      default:
        const originalStart = new Date(originalEvent.startDate)
        const originalEnd = new Date(originalEvent.endDate)
        
        newStart = new Date(baseDateOfDrop)
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0)
        
        newEnd = new Date(baseDateOfDrop)
        newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), 0, 0)
        
        return { 
          ...originalEvent, 
          startDate: newStart, 
          endDate: newEnd 
        }
    }
  }

  // Utility functions for managing drop zones and drag state
  const registerDropZone = (zoneInfo: DropZoneInfo) => {
    if (!globalDragState.validDropZones.find(zone => zone.id === zoneInfo.id)) {
      globalDragState.validDropZones.push(zoneInfo)
    }
  }

  const unregisterDropZone = (zoneId: string) => {
    globalDragState.validDropZones = globalDragState.validDropZones.filter(
      zone => zone.id !== zoneId
    )
  }

  const isValidDropZone = (zoneId: string): boolean => {
    return globalDragState.validDropZones.some(zone => zone.id === zoneId && zone.isValid)
  }

  const getCurrentDropZone = (): DropZoneInfo | undefined => {
    return globalDragState.currentDropZone
  }

  // Enhanced duration calculation and formatting
  const formatEventDuration = (event: CalendarEvent): string => {
    if (!finalConfig.showDuration) return ''
    
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    const duration = end.getTime() - start.getTime()
    
    if (event.allDay) {
      const days = Math.ceil(duration / (1000 * 60 * 60 * 24))
      return days === 1 ? 'All day' : `${days} days`
    }
    
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  // Calculate visual height for events based on duration
  const calculateEventHeight = (event: CalendarEvent, pixelsPerHour: number = 60): number => {
    if (event.allDay) return 24 // Fixed height for all-day events
    
    const duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime()
    const hours = duration / (1000 * 60 * 60)
    return Math.max(hours * pixelsPerHour, 20) // Minimum 20px height
  }

  // Resize functionality
  const createResizeHandler = (
    event: CalendarEvent,
    onEventUpdate: (event: CalendarEvent) => void,
    direction: 'start' | 'end' = 'end'
  ) => {
    if (!finalConfig.enableResize) return null
    
    let isResizing = false
    let startY = 0
    let originalEvent: CalendarEvent

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      isResizing = true
      startY = e.clientY
      originalEvent = { ...event }
      
      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.body.classList.add('resizing-event')
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const deltaY = e.clientY - startY
      const pixelsPerHour = 60
      const timeChange = (deltaY / pixelsPerHour) * 60 * 60 * 1000

      let newEvent: CalendarEvent
      
      if (direction === 'start') {
        const newStartTime = new Date(originalEvent.startDate.getTime() + timeChange)
        newEvent = {
          ...originalEvent,
          startDate: newStartTime
        }
      } else {
        const newEndTime = new Date(originalEvent.endDate.getTime() + timeChange)
        newEvent = {
          ...originalEvent,
          endDate: newEndTime
        }
      }
      
      if (newEvent.endDate.getTime() - newEvent.startDate.getTime() >= 15 * 60 * 1000) {
        onEventUpdate(newEvent)
      }
    }

    const handleMouseUp = () => {
      isResizing = false
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.classList.remove('resizing-event')
      }
    }

    return { handleMouseDown }
  }

  // Enhanced visual feedback utilities
  const addDragStyles = () => {
    // Only add styles on client-side
    if (typeof document === 'undefined') return
    
    const style = document.createElement('style')
    style.id = 'drag-drop-styles'
    style.textContent = `
      /* Dragging state */
      .dragging-event {
        user-select: none;
      }
      
      .dragging-event .event-content {
        opacity: 0.6;
        transform: scale(0.98);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }
      
      /* Drop zone animations */
      .drop-zone-active {
        background-color: rgba(34, 197, 94, 0.08);
        border: 2px dashed rgba(34, 197, 94, 0.4);
        transform: scale(1.01);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.2);
      }
      
      .drop-zone-valid {
        background-color: rgba(34, 197, 94, 0.1);
        border: 2px solid rgba(34, 197, 94, 0.6);
        transition: all 0.2s ease;
      }
      
      .drop-zone-invalid {
        background-color: rgba(239, 68, 68, 0.1);
        border: 2px solid rgba(239, 68, 68, 0.6);
        transition: all 0.2s ease;
      }
      
      /* Event animations */
      .event-content {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity;
      }
      
      .event-content:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }
    `
    
    if (!document.getElementById('drag-drop-styles')) {
      document.head.appendChild(style)
    }
  }

  // Initialize drag and drop system
  const initializeDragAndDropSystem = () => {
    addDragStyles()
    
    return {
      globalDragState,
      config: finalConfig,
      createDragConfig,
      createDraggableEvent,
      createDroppableZone,
      validateDropZone,
      calculateEventUpdate,
      registerDropZone,
      unregisterDropZone,
      isValidDropZone,
      getCurrentDropZone,
      formatEventDuration,
      calculateEventHeight,
      createResizeHandler,
      addDragStyles,
      useDraggable,
      useDroppable
    }
  }

  return initializeDragAndDropSystem()
}