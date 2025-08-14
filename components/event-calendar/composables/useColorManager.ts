import { ref, computed, type Ref } from 'vue'
import type { CalendarEvent, EventColor } from '../types'

export interface ColorConfig {
  palette: EventColor[]
  autoAssign: boolean
  allowDuplicates: boolean
  themeAware: boolean
}

export interface ColorState {
  usedColors: Map<string, EventColor>
  availableColors: EventColor[]
  colorAssignments: Map<string, EventColor>
}

const DEFAULT_COLOR_PALETTE: EventColor[] = [
  'sky',
  'emerald', 
  'violet',
  'rose',
  'amber',
  'orange'
]

/**
 * Color management system for automatic unique color assignment
 */
export function useColorManager(
  events: Ref<CalendarEvent[]> | CalendarEvent[],
  config: Partial<ColorConfig> = {}
) {
  // Handle both ref and plain array inputs
  const eventsRef = Array.isArray(events) ? ref(events) : events
  const colorConfig = ref<ColorConfig>({
    palette: DEFAULT_COLOR_PALETTE,
    autoAssign: true,
    allowDuplicates: false,
    themeAware: true,
    ...config
  })

  const colorState = ref<ColorState>({
    usedColors: new Map(),
    availableColors: [...DEFAULT_COLOR_PALETTE],
    colorAssignments: new Map()
  })

  // Track which colors are currently in use
  const usedColors = computed(() => {
    const used = new Set<EventColor>()
    eventsRef.value.forEach(event => {
      if (event.color) {
        used.add(event.color)
      }
    })
    return used
  })

  // Get available colors that haven't been used yet
  const availableColors = computed(() => {
    if (colorConfig.value.allowDuplicates) {
      return colorConfig.value.palette
    }
    return colorConfig.value.palette.filter(color => !usedColors.value.has(color))
  })

  // Get the next available color in the palette
  const getNextAvailableColor = (): EventColor => {
    const available = availableColors.value
    
    if (available.length > 0) {
      return available[0]
    }
    
    // If no colors are available, cycle through the palette
    const eventCount = eventsRef.value.length
    const paletteIndex = eventCount % colorConfig.value.palette.length
    const selectedColor = colorConfig.value.palette[paletteIndex]
    return selectedColor || 'sky' // Fallback to sky if undefined
  }

  // Assign a unique color to an event
  const assignUniqueColor = (event: CalendarEvent): EventColor => {
    // If event already has a color and we allow duplicates, keep it
    if (event.color && colorConfig.value.allowDuplicates) {
      return event.color
    }

    // If event already has a unique color, keep it
    if (event.color && availableColors.value.includes(event.color)) {
      return event.color
    }

    // Get the next available color
    const newColor = getNextAvailableColor()
    
    // Store the assignment
    colorState.value.colorAssignments.set(event.id, newColor)
    
    return newColor
  }

  // Assign colors to all events that don't have them
  const assignColorsToEvents = (eventList: CalendarEvent[]): CalendarEvent[] => {
    if (!colorConfig.value.autoAssign) {
      return eventList
    }

    return eventList.map(event => {
      if (!event.color) {
        return {
          ...event,
          color: assignUniqueColor(event)
        }
      }
      return event
    })
  }

  // Get color statistics
  const getColorStats = () => {
    const stats = new Map<EventColor, number>()
    
    eventsRef.value.forEach(event => {
      if (event.color) {
        stats.set(event.color, (stats.get(event.color) || 0) + 1)
      }
    })
    
    return {
      totalEvents: eventsRef.value.length,
      coloredEvents: eventsRef.value.filter(e => e.color).length,
      colorDistribution: Object.fromEntries(stats),
      availableColors: availableColors.value,
      usedColors: Array.from(usedColors.value)
    }
  }

  // Rebalance colors to ensure better distribution
  const rebalanceColors = (): CalendarEvent[] => {
    const eventsWithoutColors = eventsRef.value.filter(e => !e.color)
    const eventsWithColors = eventsRef.value.filter(e => e.color)
    
    // Clear existing assignments
    colorState.value.colorAssignments.clear()
    
    // Reassign colors to events without colors
    const rebalanced = eventsWithoutColors.map((event, index) => {
      const colorIndex = index % colorConfig.value.palette.length
      const assignedColor = colorConfig.value.palette[colorIndex] || 'sky'
      
      colorState.value.colorAssignments.set(event.id, assignedColor)
      
      return {
        ...event,
        color: assignedColor
      }
    })
    
    return [...eventsWithColors, ...rebalanced]
  }

  // Update color configuration
  const updateConfig = (newConfig: Partial<ColorConfig>) => {
    colorConfig.value = { ...colorConfig.value, ...newConfig }
    
    // Update available colors if palette changed
    if (newConfig.palette) {
      colorState.value.availableColors = [...newConfig.palette]
    }
  }

  // Get theme-aware color classes for Tailwind
  const getColorClasses = (color: EventColor) => {
    const colorMap = {
      sky: 'bg-sky-200 dark:bg-sky-700 border-sky-400 dark:border-sky-500 text-sky-800 dark:text-sky-100 hover:bg-sky-300 dark:hover:bg-sky-600',
      emerald: 'bg-emerald-200 dark:bg-emerald-700 border-emerald-400 dark:border-emerald-500 text-emerald-800 dark:text-emerald-100 hover:bg-emerald-300 dark:hover:bg-emerald-600',
      violet: 'bg-violet-200 dark:bg-violet-700 border-violet-400 dark:border-violet-500 text-violet-800 dark:text-violet-100 hover:bg-violet-300 dark:hover:bg-violet-600',
      rose: 'bg-rose-200 dark:bg-rose-700 border-rose-400 dark:border-rose-500 text-rose-800 dark:text-rose-100 hover:bg-rose-300 dark:hover:bg-rose-600',
      amber: 'bg-amber-200 dark:bg-amber-700 border-amber-400 dark:border-amber-500 text-amber-800 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-600',
      orange: 'bg-orange-200 dark:bg-orange-700 border-orange-400 dark:border-orange-500 text-orange-800 dark:text-orange-100 hover:bg-orange-300 dark:hover:bg-orange-600'
    }
    
    return colorMap[color] || colorMap.sky
  }

  // Get border-only classes for agenda view
  const getBorderColorClasses = (color: EventColor) => {
    const colorMap = {
      sky: 'border-sky-500 dark:border-sky-400',
      emerald: 'border-emerald-500 dark:border-emerald-400',
      violet: 'border-violet-500 dark:border-violet-400',
      rose: 'border-rose-500 dark:border-rose-400',
      amber: 'border-amber-500 dark:border-amber-400',
      orange: 'border-orange-500 dark:border-orange-400'
    }
    
    return colorMap[color] || colorMap.sky
  }

  // Check if a color conflicts with existing events
  const hasColorConflict = (color: EventColor, excludeEventId?: string): boolean => {
    if (colorConfig.value.allowDuplicates) {
      return false
    }
    
    return eventsRef.value.some(event => 
      event.color === color && event.id !== excludeEventId
    )
  }

  // Resolve color conflicts
  const resolveColorConflicts = (): CalendarEvent[] => {
    const resolvedEvents: CalendarEvent[] = []
    const usedColorsInPass = new Set<EventColor>()
    
    eventsRef.value.forEach(event => {
      let eventColor = event.color
      
      // If color is already used in this pass, assign a new one
      if (eventColor && usedColorsInPass.has(eventColor)) {
        eventColor = getNextAvailableColor()
      }
      
      // If still no color, assign one
      if (!eventColor) {
        eventColor = getNextAvailableColor()
      }
      
      usedColorsInPass.add(eventColor)
      resolvedEvents.push({
        ...event,
        color: eventColor
      })
    })
    
    return resolvedEvents
  }

  return {
    colorConfig,
    colorState,
    usedColors,
    availableColors,
    assignUniqueColor,
    assignColorsToEvents,
    getColorStats,
    rebalanceColors,
    updateConfig,
    getColorClasses,
    getBorderColorClasses,
    hasColorConflict,
    resolveColorConflicts,
    getNextAvailableColor
  }
}