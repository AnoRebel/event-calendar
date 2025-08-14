import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EventCalendar from '../EventCalendar.vue'
import type { CalendarEvent } from '../types'

// Mock the composables
vi.mock('../composables/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    isNavigationEnabled: true,
    enableNavigation: vi.fn(),
    disableNavigation: vi.fn()
  })
}))

vi.mock('../composables/useEventFiltering', () => ({
  useEventFiltering: () => ({
    getEventsForDay: vi.fn(() => ({ value: [] })),
    getAllDayEventsForDay: vi.fn(() => ({ value: [] })),
    getTimedEventsForDay: vi.fn(() => ({ value: [] })),
    getAgendaEvents: vi.fn(() => ({ value: [] })),
    isToday: vi.fn(() => ({ value: false }))
  })
}))

vi.mock('../composables/useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: vi.fn(),
    validateEvent: vi.fn(() => []),
    withErrorHandling: vi.fn((fn) => fn())
  })
}))

vi.mock('../composables/useColorManager', () => ({
  useColorManager: () => ({
    assignUniqueColor: vi.fn(() => 'sky'),
    assignColorsToEvents: vi.fn(),
    getColorClasses: vi.fn(() => ({ bg: 'bg-sky-200', border: 'border-sky-400', text: 'text-sky-800', hover: 'hover:bg-sky-300' })),
    hasColorConflict: vi.fn(() => false),
    getColorStats: vi.fn(() => ({}))
  })
}))

describe('EventCalendar', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Test Event',
      startDate: new Date('2024-01-01T10:00:00'),
      endDate: new Date('2024-01-01T11:00:00'),
      color: 'sky'
    }
  ]

  it('renders correctly', () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    expect(wrapper.exists()).toBe(true)
  })

  it('displays calendar title', () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    expect(wrapper.find('h1').exists()).toBe(true)
  })

  it('has navigation buttons', () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('emits eventAdd when adding event', async () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    // Simulate event addition
    await wrapper.vm.handleModalSubmit({
      id: '2',
      title: 'New Event',
      startDate: new Date(),
      endDate: new Date(),
      color: 'emerald'
    }, 'add')
    
    expect(wrapper.emitted('eventAdd')).toBeTruthy()
  })
})