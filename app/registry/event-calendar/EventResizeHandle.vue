<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CalendarEvent } from './types'

interface ResizeHandleProps {
  event: CalendarEvent
  position: 'top' | 'bottom' | 'left' | 'right'
  enabled?: boolean
  pixelsPerHour?: number
  minDuration?: number // in minutes
  maxDuration?: number // in minutes
  snapToGrid?: boolean
  onResize?: (event: CalendarEvent) => void
}

const props = withDefaults(defineProps<ResizeHandleProps>(), {
  enabled: true,
  pixelsPerHour: 60,
  minDuration: 15,
  maxDuration: 24 * 60, // 24 hours
  snapToGrid: true
})

const emit = defineEmits<{
  (e: 'resize-start', event: CalendarEvent): void
  (e: 'resize', event: CalendarEvent): void
  (e: 'resize-end', event: CalendarEvent): void
}>()

const isResizing = ref(false)
const startY = ref(0)
const startX = ref(0)
const originalEvent = ref<CalendarEvent | null>(null)
const previewEvent = ref<CalendarEvent | null>(null)

const handleClasses = computed(() => {
  const baseClasses = [
    'absolute transition-all duration-200 z-30 event-resize-handle group',
    `resize-${props.position}`,
    isResizing.value ? 'opacity-100' : '',
    props.enabled ? '' : 'pointer-events-none'
  ]

  if (props.position === 'top' || props.position === 'bottom') {
    return [...baseClasses, 'left-0 right-0 h-3 cursor-ns-resize', props.position === 'top' ? '-top-1' : '-bottom-1']
  } else {
    return [...baseClasses, 'top-0 bottom-0 w-3 cursor-ew-resize', props.position === 'left' ? '-left-1' : '-right-1']
  }
})

const handleStyle = computed(() => ({
  background: isResizing.value 
    ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' 
    : 'rgba(75, 85, 99, 0.6)',
  borderRadius: '2px',
  opacity: isResizing.value ? '1' : '0'
}))

const snapToTimeGrid = (minutes: number): number => {
  if (!props.snapToGrid) return minutes
  const snapInterval = 15 // 15-minute intervals
  return Math.round(minutes / snapInterval) * snapInterval
}

const calculateNewEventTime = (deltaY: number, deltaX: number = 0): CalendarEvent | null => {
  if (!originalEvent.value) return null

  const originalStart = new Date(originalEvent.value.startDate)
  const originalEnd = new Date(originalEvent.value.endDate)
  
  let newStart = new Date(originalStart)
  let newEnd = new Date(originalEnd)
  
  if (props.position === 'top' || props.position === 'bottom') {
    // Vertical resizing - change time
    const deltaMinutes = Math.round((deltaY / props.pixelsPerHour) * 60)
    const snappedDelta = snapToTimeGrid(deltaMinutes)
    
    if (props.position === 'top') {
      // Resizing from top - change start time
      newStart = new Date(originalStart.getTime() + snappedDelta * 60 * 1000)
      
      // Ensure minimum duration
      const duration = newEnd.getTime() - newStart.getTime()
      if (duration < props.minDuration * 60 * 1000) {
        newStart = new Date(newEnd.getTime() - props.minDuration * 60 * 1000)
      }
      
      // Ensure start is not after end
      if (newStart >= newEnd) {
        newStart = new Date(newEnd.getTime() - props.minDuration * 60 * 1000)
      }
    } else {
      // Resizing from bottom - change end time
      newEnd = new Date(originalEnd.getTime() + snappedDelta * 60 * 1000)
      
      // Ensure minimum duration
      const duration = newEnd.getTime() - newStart.getTime()
      if (duration < props.minDuration * 60 * 1000) {
        newEnd = new Date(newStart.getTime() + props.minDuration * 60 * 1000)
      }
      
      // Ensure end is not before start
      if (newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + props.minDuration * 60 * 1000)
      }
    }
  } else {
    // Horizontal resizing - change date (for multi-day events)
    const daysDelta = Math.round(deltaX / 100) // Approximate: 100px per day
    
    if (props.position === 'left') {
      // Resizing from left - change start date
      newStart = new Date(originalStart)
      newStart.setDate(newStart.getDate() + daysDelta)
      
      // Ensure start is not after end
      if (newStart >= newEnd) {
        newStart = new Date(newEnd)
        newStart.setDate(newStart.getDate() - 1)
      }
    } else {
      // Resizing from right - change end date
      newEnd = new Date(originalEnd)
      newEnd.setDate(newEnd.getDate() + daysDelta)
      
      // Ensure end is not before start
      if (newEnd <= newStart) {
        newEnd = new Date(newStart)
        newEnd.setDate(newEnd.getDate() + 1)
      }
    }
  }
  
  // Check maximum duration for vertical resizing
  if (props.position === 'top' || props.position === 'bottom') {
    const finalDuration = newEnd.getTime() - newStart.getTime()
    if (finalDuration > props.maxDuration * 60 * 1000) {
      if (props.position === 'top') {
        newStart = new Date(newEnd.getTime() - props.maxDuration * 60 * 1000)
      } else {
        newEnd = new Date(newStart.getTime() + props.maxDuration * 60 * 1000)
      }
    }
  }
  
  return {
    ...originalEvent.value,
    startDate: newStart,
    endDate: newEnd
  }
}

const handleMouseDown = (e: MouseEvent) => {
  if (!props.enabled) return
  
  console.log('🎯 Resize handle mousedown:', props.event.title, 'position:', props.position)
  
  // Stop propagation to prevent drag events
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  
  isResizing.value = true
  startY.value = e.clientY
  startX.value = e.clientX
  originalEvent.value = { ...props.event }
  previewEvent.value = { ...props.event }
  
  emit('resize-start', props.event)
  
  // Use capture phase to ensure we get the events first
  document.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true })
  document.addEventListener('mouseup', handleMouseUp, { passive: false, capture: true })
  
  const cursor = (props.position === 'left' || props.position === 'right') ? 'ew-resize' : 'ns-resize'
  document.body.style.cursor = cursor
  document.body.style.userSelect = 'none'
  document.body.classList.add('resizing-event')
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing.value || !originalEvent.value) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const deltaY = e.clientY - startY.value
  const deltaX = e.clientX - startX.value
  const newEvent = calculateNewEventTime(deltaY, deltaX)
  
  if (newEvent) {
    const delta = (props.position === 'left' || props.position === 'right') ? `X:${deltaX}` : `Y:${deltaY}`
    console.log('📏 Resizing event:', newEvent.title, 'delta:', delta)
    previewEvent.value = newEvent
    emit('resize', newEvent)
  }
}

const handleMouseUp = () => {
  if (!isResizing.value || !previewEvent.value) return
  
  console.log('🎯 Resize completed:', previewEvent.value.title)
  
  isResizing.value = false
  
  emit('resize-end', previewEvent.value)
  
  // Cleanup with capture flag matching the add
  document.removeEventListener('mousemove', handleMouseMove, { capture: true })
  document.removeEventListener('mouseup', handleMouseUp, { capture: true })
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.body.classList.remove('resizing-event')
  
  originalEvent.value = null
  previewEvent.value = null
}

// Touch support for mobile devices
const handleTouchStart = (e: TouchEvent) => {
  if (!props.enabled) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const touch = e.touches[0]
  isResizing.value = true
  startY.value = touch.clientY
  originalEvent.value = { ...props.event }
  previewEvent.value = { ...props.event }
  
  emit('resize-start', props.event)
  
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isResizing.value || !originalEvent.value) return
  
  e.preventDefault()
  const touch = e.touches[0]
  const deltaY = touch.clientY - startY.value
  const newEvent = calculateNewEventTime(deltaY)
  
  if (newEvent) {
    previewEvent.value = newEvent
    emit('resize', newEvent)
  }
}

const handleTouchEnd = () => {
  if (!isResizing.value || !previewEvent.value) return
  
  isResizing.value = false
  
  emit('resize-end', previewEvent.value)
  
  // Cleanup
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  
  originalEvent.value = null
  previewEvent.value = null
}

// Cleanup on unmount
onUnmounted(() => {
  if (isResizing.value) {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
})
</script>

<template>
  <div
    v-if="enabled"
    :class="handleClasses"
    :style="handleStyle"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
    :title="`Resize event ${position === 'top' ? 'start' : position === 'bottom' ? 'end' : position} ${position === 'left' || position === 'right' ? 'date' : 'time'}`"
  >
    <!-- Visual indicators for each direction with enhanced visibility -->
    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
      <!-- Horizontal handles (top/bottom) -->
      <div v-if="position === 'top' || position === 'bottom'" class="w-8 h-1 bg-white rounded-full border border-blue-400 shadow-sm">
        <!-- Grip dots for better visibility -->
        <div class="absolute inset-0 flex items-center justify-center gap-1">
          <div class="w-1 h-1 bg-blue-500 rounded-full"></div>
          <div class="w-1 h-1 bg-blue-500 rounded-full"></div>
          <div class="w-1 h-1 bg-blue-500 rounded-full"></div>
        </div>
      </div>
      
      <!-- Vertical handles (left/right) -->
      <div v-if="position === 'left' || position === 'right'" class="h-8 w-1 bg-white rounded-full border border-blue-400 shadow-sm">
        <!-- Grip dots for better visibility -->
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div class="h-1 w-1 bg-blue-500 rounded-full"></div>
          <div class="h-1 w-1 bg-blue-500 rounded-full"></div>
          <div class="h-1 w-1 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    </div>
    
    <!-- Cursor icon overlay -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <!-- Double arrow icons for resize directions -->
      <div v-if="position === 'top' || position === 'bottom'" class="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
        ↕
      </div>
      <div v-if="position === 'left' || position === 'right'" class="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
        ↔
      </div>
    </div>
  </div>
</template>