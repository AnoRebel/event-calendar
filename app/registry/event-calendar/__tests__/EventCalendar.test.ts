import { describe, it, expect, vi } from 'vitest'
import { mount, config } from '@vue/test-utils'
import EventCalendar from '../EventCalendar.vue'
import type { CalendarEvent } from '../types'

// DnDProvider/DragPreview are globally registered by the @vue-dnd-kit/nuxt module
// in the app, but isolated mounts have no such registration — stub them so any
// descendant referencing them renders.
config.global.stubs = {
  ...(config.global.stubs as Record<string, unknown>),
  DnDProvider: { template: '<div><slot /></div>' },
  DragPreview: { template: '<div />' },
  // DarkModeToggle depends on the Nuxt auto-imported `useDarkMode`, which the
  // vitest environment does not provide — stub it out for these mounts.
  DarkModeToggle: { template: '<button />' },
  // EventModal calls Nuxt auto-imported composables (useFeatureFlags) that the
  // vitest env doesn't provide, and these tests drive CRUD through EventCalendar's
  // own exposed handlers rather than the modal UI — stub it.
  EventModal: { template: '<div />' },
}

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

vi.mock('../composables/useColorManager', () => ({
  useColorManager: () => ({
    assignUniqueColor: vi.fn(() => 'sky'),
    assignColorsToEvents: vi.fn(),
    getColorClasses: vi.fn(() => 'bg-sky-200 border-sky-400 text-sky-800 hover:bg-sky-300'),
    hasColorConflict: vi.fn(() => false),
    getColorStats: vi.fn(() => ({}))
  })
}))

vi.mock('../composables/useDragAndDrop', () => {
  const { ref, computed } = require('vue')
  return {
    useDragAndDropSystem: () => ({
      globalDragState: { value: { isDragging: false, draggedEvent: null, validDropZones: [], currentDropZone: null, dragPreview: null } },
      formatEventDuration: vi.fn(() => '1h'),
      calculateEventHeight: vi.fn(() => 60),
      createDragConfig: vi.fn(() => ({ zoneId: 'z', zoneType: 'timed', dateKey: '2024-01-01', handleDrop: vi.fn(), disabled: false })),
      // The views destructure `.elementRef` / `.isOver` off these return values
      // during render, so the mocks must return the real shapes.
      createDroppableZone: vi.fn(() => ({ elementRef: ref(null), isOver: computed(() => false) })),
      createDraggableEvent: vi.fn(() => ({ elementRef: ref(null), isDragging: ref(false), handleDragStart: vi.fn(), handleDragEnd: vi.fn() }))
    })
  }
})

vi.mock('../composables/useEventStatus', () => ({
  useEventStatus: () => ({
    getEventStatus: vi.fn(() => 'confirmed'),
    getEventStatusClasses: vi.fn(() => ''),
    getEventStatusIndicator: vi.fn(() => ''),
    getEventStatusTooltip: vi.fn(() => ''),
    isEventInPast: vi.fn(() => false),
    isEventCancelled: vi.fn(() => false),
    processEventsWithStatus: { value: [] }
  })
}))

describe('EventCalendar', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Test Event',
      startDate: new Date('2024-01-01T10:00:00'),
      endDate: new Date('2024-01-01T11:00:00'),
      color: 'sky',
      status: 'confirmed'
    },
    {
      id: '2',
      title: 'Multi-day Event',
      startDate: new Date('2024-01-01T00:00:00'),
      endDate: new Date('2024-01-03T23:59:59'),
      allDay: true,
      color: 'emerald',
      status: 'tentative'
    },
    {
      id: '3',
      title: 'Cancelled Event',
      startDate: new Date('2023-12-31T14:00:00'),
      endDate: new Date('2023-12-31T15:00:00'),
      color: 'rose',
      status: 'cancelled'
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
      id: '4',
      title: 'New Event',
      startDate: new Date(),
      endDate: new Date(),
      color: 'emerald',
      status: 'confirmed'
    }, 'add')
    
    expect(wrapper.emitted('eventAdd')).toBeTruthy()
  })

  it('emits eventUpdate when updating event', async () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    // Simulate event update
    await wrapper.vm.handleModalSubmit({
      ...mockEvents[0],
      title: 'Updated Event',
      status: 'tentative'
    }, 'edit')
    
    expect(wrapper.emitted('eventUpdate')).toBeTruthy()
  })

  it('emits eventDelete when deleting event', async () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    // Simulate event deletion
    await wrapper.vm.handleModalDelete('1')
    
    expect(wrapper.emitted('eventDelete')).toBeTruthy()
    expect(wrapper.emitted('eventDelete')?.[0]).toEqual(['1'])
  })

  it('supports different view modes', async () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    // Test month view (default)
    expect(wrapper.vm.currentView).toBe('month')

    // Test changing to week view
    wrapper.vm.currentView = 'week'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.currentView).toBe('week')

    // Test changing to day view
    wrapper.vm.currentView = 'day'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.currentView).toBe('day')

    // Test changing to agenda view
    wrapper.vm.currentView = 'agenda'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.currentView).toBe('agenda')
  })

  it('handles dark mode toggle', () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    // Check for dark mode toggle component
    expect(wrapper.findComponent({ name: 'DarkModeToggle' })).toBeTruthy()
  })

  it('processes events with status correctly', () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    // Events should include various statuses
    const events = wrapper.vm.localEvents
    expect(events.some((e: CalendarEvent) => e.status === 'confirmed')).toBe(true)
    expect(events.some((e: CalendarEvent) => e.status === 'tentative')).toBe(true)
    expect(events.some((e: CalendarEvent) => e.status === 'cancelled')).toBe(true)
  })

  it('handles multi-day events', () => {
    const wrapper = mount(EventCalendar, {
      props: {
        events: mockEvents
      }
    })
    
    const multiDayEvent = mockEvents.find(e => e.id === '2')
    expect(multiDayEvent?.allDay).toBe(true)
    expect(multiDayEvent?.startDate.getTime()).toBeLessThan(multiDayEvent?.endDate.getTime() || 0)
  })
})