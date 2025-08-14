import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useColorManager } from '../composables/useColorManager'
import type { CalendarEvent } from '../types'

describe('useColorManager', () => {
  it('assigns unique colors to events', () => {
    const events = ref<CalendarEvent[]>([
      { id: '1', title: 'Event 1', startDate: new Date(), endDate: new Date() },
      { id: '2', title: 'Event 2', startDate: new Date(), endDate: new Date() }
    ])
    
    const { assignUniqueColor } = useColorManager(events)
    
    const color1 = assignUniqueColor(events.value[0])
    const color2 = assignUniqueColor(events.value[1])
    
    expect(color1).toBeDefined()
    expect(color2).toBeDefined()
    expect(color1).not.toBe(color2)
  })

  it('provides theme-aware color classes', () => {
    const events = ref<CalendarEvent[]>([])
    const { getColorClasses } = useColorManager(events)
    
    const classes = getColorClasses('sky')
    
    expect(classes).toHaveProperty('bg')
    expect(classes).toHaveProperty('border')
    expect(classes).toHaveProperty('text')
    expect(classes).toHaveProperty('hover')
  })

  it('detects color conflicts', () => {
    const events = ref<CalendarEvent[]>([
      { id: '1', title: 'Event 1', startDate: new Date(), endDate: new Date(), color: 'sky' }
    ])
    
    const { hasColorConflict } = useColorManager(events, { allowDuplicates: false })
    
    expect(hasColorConflict('sky')).toBe(true)
    expect(hasColorConflict('emerald')).toBe(false)
  })
})