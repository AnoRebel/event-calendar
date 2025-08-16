import { computed, type ComputedRef } from 'vue'
import { format, isSameDay, startOfDay, endOfDay, isWithinInterval, addDays } from 'date-fns'
import type { CalendarEvent, MonthViewDay } from '../types'

export interface LayoutEvent extends CalendarEvent {
  layoutLane: number
  layoutStart: string // YYYY-MM-DD format
  layoutEnd: string // YYYY-MM-DD format
  layoutSpan: number // Number of days
}

export function useMultiDayLayout(days: ComputedRef<MonthViewDay[]>) {
  
  const processEventsWithLayout = computed(() => {
    const daysWithLayout = days.value.map(day => ({ ...day, events: [] as LayoutEvent[] }))
    const allEvents: CalendarEvent[] = []
    
    // Collect all events
    days.value.forEach(day => {
      allEvents.push(...day.events)
    })
    
    // Remove duplicates (same event appearing on multiple days)
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    )
    
    // Sort events by start date, then by duration (longer events first)
    const sortedEvents = uniqueEvents.sort((a, b) => {
      const startDiff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      if (startDiff !== 0) return startDiff
      
      const durationA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime()
      const durationB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime()
      return durationB - durationA // Longer events first
    })
    
    // Track which lanes are occupied for each day
    const dayLaneOccupancy: Record<string, Set<number>> = {}
    days.value.forEach(day => {
      dayLaneOccupancy[format(day.date, 'yyyy-MM-dd')] = new Set()
    })
    
    // Assign lanes to events
    const layoutEvents: LayoutEvent[] = sortedEvents.map(event => {
      const eventStart = startOfDay(new Date(event.startDate))
      const eventEnd = endOfDay(new Date(event.endDate))
      
      // Find all days this event spans within the current month view
      const eventDays = days.value.filter(day => 
        isWithinInterval(day.date, { start: eventStart, end: eventEnd })
      )
      
      if (eventDays.length === 0) return null
      
      // Find the lowest available lane across all days this event spans
      let lane = 0
      while (true) {
        const isLaneAvailable = eventDays.every(day => {
          const dayKey = format(day.date, 'yyyy-MM-dd')
          return !dayLaneOccupancy[dayKey].has(lane)
        })
        
        if (isLaneAvailable) break
        lane++
      }
      
      // Mark this lane as occupied for all days
      eventDays.forEach(day => {
        const dayKey = format(day.date, 'yyyy-MM-dd')
        dayLaneOccupancy[dayKey].add(lane)
      })
      
      const layoutStart = format(eventDays[0].date, 'yyyy-MM-dd')
      const layoutEnd = format(eventDays[eventDays.length - 1].date, 'yyyy-MM-dd')
      
      return {
        ...event,
        layoutLane: lane,
        layoutStart,
        layoutEnd,
        layoutSpan: eventDays.length
      } as LayoutEvent
    }).filter(Boolean) as LayoutEvent[]
    
    // Assign events to their respective days
    layoutEvents.forEach(event => {
      const eventStart = startOfDay(new Date(event.startDate))
      const eventEnd = endOfDay(new Date(event.endDate))
      
      daysWithLayout.forEach(day => {
        if (isWithinInterval(day.date, { start: eventStart, end: eventEnd })) {
          day.events.push(event)
        }
      })
    })
    
    return daysWithLayout
  })
  
  const getEventPosition = (event: LayoutEvent, date: Date) => {
    const dayKey = format(date, 'yyyy-MM-dd')
    const isStart = dayKey === event.layoutStart
    const isEnd = dayKey === event.layoutEnd
    const isMiddle = !isStart && !isEnd
    
    return {
      isStart,
      isEnd,
      isMiddle,
      lane: event.layoutLane,
      span: event.layoutSpan
    }
  }
  
  const getMaxLanes = computed(() => {
    let maxLanes = 0
    const dayLanes: Record<string, number> = {}
    
    processEventsWithLayout.value.forEach(day => {
      const lanes = new Set()
      day.events.forEach(event => lanes.add(event.layoutLane))
      dayLanes[format(day.date, 'yyyy-MM-dd')] = lanes.size
      maxLanes = Math.max(maxLanes, lanes.size)
    })
    
    return { maxLanes, dayLanes }
  })
  
  return {
    processEventsWithLayout,
    getEventPosition,
    getMaxLanes
  }
}