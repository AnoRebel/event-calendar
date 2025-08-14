<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CalendarEvent } from './types'
import { useColorManager } from './composables/useColorManager'

interface DragFeedbackProps {
  isDragging: boolean
  draggedEvent?: CalendarEvent
  validDropZones?: string[]
  currentDropZone?: string
  dragPosition?: { x: number; y: number }
}

const props = withDefaults(defineProps<DragFeedbackProps>(), {
  isDragging: false,
  validDropZones: () => [],
  currentDropZone: undefined,
  dragPosition: () => ({ x: 0, y: 0 })
})

const dragPreviewRef = ref<HTMLElement | null>(null)
const mousePosition = ref({ x: 0, y: 0 })

// Initialize color manager for drag preview
const eventsComputed = computed(() => props.draggedEvent ? [props.draggedEvent] : [])
const { getColorClasses } = useColorManager(eventsComputed)

// Track mouse position for drag preview
const updateMousePosition = (e: MouseEvent) => {
  mousePosition.value = { x: e.clientX, y: e.clientY }
}

// Drag preview styles
const dragPreviewStyle = computed(() => {
  if (!props.isDragging || !props.draggedEvent) return { display: 'none' }
  
  return {
    position: 'fixed' as const,
    left: `${mousePosition.value.x + 10}px`,
    top: `${mousePosition.value.y - 10}px`,
    zIndex: 9999,
    pointerEvents: 'none' as const,
    transform: 'rotate(2deg)',
    opacity: 0.9
  }
})

// Drop zone highlight classes
const getDropZoneClasses = (zoneId: string) => {
  const isValid = props.validDropZones.includes(zoneId)
  const isCurrent = props.currentDropZone === zoneId
  
  return {
    'drop-zone-valid': isValid && !isCurrent,
    'drop-zone-current': isCurrent && isValid,
    'drop-zone-invalid': !isValid && isCurrent,
    'transition-all duration-200': true
  }
}

// Format time for display
const formatEventTime = (event: CalendarEvent) => {
  if (event.allDay) return 'All day'
  
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)
  
  return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('mousemove', updateMousePosition)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('mousemove', updateMousePosition)
  }
})
</script>

<template>
  <!-- Drag Preview -->
  <Teleport to="body">
    <div
      v-if="isDragging && draggedEvent"
      ref="dragPreviewRef"
      :style="dragPreviewStyle"
      :class="[
        'max-w-xs p-3 rounded-lg shadow-lg border-2 backdrop-blur-sm',
        draggedEvent.color ? getColorClasses(draggedEvent.color) : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
      ]"
    >
      <!-- Event preview content -->
      <div class="space-y-1">
        <div class="font-semibold text-sm truncate">
          {{ draggedEvent.title }}
        </div>
        <div class="text-xs opacity-80">
          {{ formatEventTime(draggedEvent) }}
        </div>
        <div v-if="draggedEvent.location" class="text-xs opacity-70 flex items-center gap-1">
          <Icon name="lucide:map-pin" size="10" />
          <span class="truncate">{{ draggedEvent.location }}</span>
        </div>
      </div>
      
      <!-- Drag indicator -->
      <div class="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
    </div>
  </Teleport>


</template>