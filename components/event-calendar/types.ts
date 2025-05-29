// composables/types.ts
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  startTime?: string
  endTime?: string
  allDay?: boolean
  color?: EventColor
  location?: string
}

export type ViewMode = "month" | "week" | "day" | "agenda"

// For passing pre-calculated day data to MonthView
export interface MonthViewDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[] // Events specific to this day in month view
}

// For WeekView and DayView structure
export interface TimeSlot {
  time: Date
  label: string
  dateTimeStr: string // For data attributes, e.g., clicking to add
}

export interface DayColumnData {
  date: Date
  dateKey: string // 'yyyy-MM-dd'
  dayLabel?: string // For WeekView, e.g., 'Mon 01'
  isToday: boolean
  allDayEvents: CalendarEvent[]
  timeSlots: TimeSlot[]
  // Timed events will be processed with style by the view component
  timedEventsRaw: CalendarEvent[]
}

export type EventColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange"
