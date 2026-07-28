import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useEventStatus } from '../composables/useEventStatus'
import type { CalendarEvent } from '../types'

describe('useEventStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: '1',
    title: 'Test Event',
    startDate: new Date('2024-01-01T10:00:00'),
    endDate: new Date('2024-01-01T11:00:00'),
    ...overrides
  })

  it('auto-detects past events', () => {
    const pastEvent = createMockEvent({
      startDate: new Date('2024-01-01T08:00:00'),
      endDate: new Date('2024-01-01T09:00:00')
    })
    
    const events = ref<CalendarEvent[]>([pastEvent])
    const { getEventStatus } = useEventStatus(events)
    
    expect(getEventStatus(pastEvent)).toBe('past')
  })

  it('respects explicit status over auto-detection', () => {
    const cancelledEvent = createMockEvent({
      startDate: new Date('2024-01-01T14:00:00'),
      endDate: new Date('2024-01-01T15:00:00'),
      status: 'cancelled'
    })
    
    const events = ref<CalendarEvent[]>([cancelledEvent])
    const { getEventStatus } = useEventStatus(events)
    
    expect(getEventStatus(cancelledEvent)).toBe('cancelled')
  })

  it('handles all-day events correctly', () => {
    const allDayPastEvent = createMockEvent({
      startDate: new Date('2023-12-31T00:00:00'),
      endDate: new Date('2023-12-31T23:59:59'),
      allDay: true
    })
    
    const events = ref<CalendarEvent[]>([allDayPastEvent])
    const { getEventStatus } = useEventStatus(events)
    
    expect(getEventStatus(allDayPastEvent)).toBe('past')
  })

  it('provides correct status classes', () => {
    const events = ref<CalendarEvent[]>([])
    const { getEventStatusClasses } = useEventStatus(events)
    
    const cancelledEvent = createMockEvent({ status: 'cancelled' })
    const pastEvent = createMockEvent({ 
      startDate: new Date('2024-01-01T08:00:00'),
      endDate: new Date('2024-01-01T09:00:00')
    })
    const tentativeEvent = createMockEvent({ status: 'tentative' })
    const confirmedEvent = createMockEvent({ status: 'confirmed' })
    
    expect(getEventStatusClasses(cancelledEvent)).toContain('line-through')
    expect(getEventStatusClasses(pastEvent)).toContain('opacity-70')
    expect(getEventStatusClasses(tentativeEvent)).toContain('border-dashed')
    expect(getEventStatusClasses(confirmedEvent)).toBe('')
  })

  it('provides correct status indicators', () => {
    const events = ref<CalendarEvent[]>([])
    const { getEventStatusIndicator } = useEventStatus(events)
    
    const cancelledEvent = createMockEvent({ status: 'cancelled' })
    const pastEvent = createMockEvent({ 
      startDate: new Date('2024-01-01T08:00:00'),
      endDate: new Date('2024-01-01T09:00:00')
    })
    const tentativeEvent = createMockEvent({ status: 'tentative' })
    const confirmedEvent = createMockEvent({ status: 'confirmed' })
    
    expect(getEventStatusIndicator(cancelledEvent)).toBe('✕')
    expect(getEventStatusIndicator(pastEvent)).toBe('⏰')
    expect(getEventStatusIndicator(tentativeEvent)).toBe('?')
    expect(getEventStatusIndicator(confirmedEvent)).toBe('')
  })

  it('provides correct status tooltips', () => {
    const events = ref<CalendarEvent[]>([])
    const { getEventStatusTooltip } = useEventStatus(events)
    
    const cancelledEvent = createMockEvent({ status: 'cancelled' })
    const pastEvent = createMockEvent({ 
      startDate: new Date('2024-01-01T08:00:00'),
      endDate: new Date('2024-01-01T09:00:00')
    })
    const tentativeEvent = createMockEvent({ status: 'tentative' })
    const confirmedEvent = createMockEvent({ status: 'confirmed' })
    
    expect(getEventStatusTooltip(cancelledEvent)).toBe('This event has been cancelled')
    expect(getEventStatusTooltip(pastEvent)).toBe('This event has already ended')
    expect(getEventStatusTooltip(tentativeEvent)).toBe('This event is tentative')
    expect(getEventStatusTooltip(confirmedEvent)).toBe('')
  })

  it('correctly identifies past and cancelled events', () => {
    const events = ref<CalendarEvent[]>([])
    const { isEventInPast, isEventCancelled } = useEventStatus(events)
    
    const pastEvent = createMockEvent({
      startDate: new Date('2024-01-01T08:00:00'),
      endDate: new Date('2024-01-01T09:00:00')
    })
    const cancelledEvent = createMockEvent({ status: 'cancelled' })
    const futureEvent = createMockEvent({
      startDate: new Date('2024-01-01T14:00:00'),
      endDate: new Date('2024-01-01T15:00:00')
    })
    
    expect(isEventInPast(pastEvent)).toBe(true)
    expect(isEventInPast(futureEvent)).toBe(false)
    expect(isEventCancelled(cancelledEvent)).toBe(true)
    expect(isEventCancelled(futureEvent)).toBe(false)
  })

  it('processes events with computed status', () => {
    const testEvents = [
      createMockEvent({ 
        id: '1',
        startDate: new Date('2024-01-01T08:00:00'),
        endDate: new Date('2024-01-01T09:00:00')
      }),
      createMockEvent({ 
        id: '2',
        status: 'cancelled'
      })
    ]
    
    const events = ref<CalendarEvent[]>(testEvents)
    const { processEventsWithStatus } = useEventStatus(events)
    
    const processedEvents = processEventsWithStatus.value
    expect(processedEvents[0].computedStatus).toBe('past')
    expect(processedEvents[1].computedStatus).toBe('cancelled')
    expect(processedEvents[0].statusIndicator).toBe('⏰')
    expect(processedEvents[1].statusIndicator).toBe('✕')
  })
})