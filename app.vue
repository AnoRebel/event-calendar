<script setup lang="ts">
import { ref, onMounted } from "vue"
import { addDays, setHours, setMinutes, subDays, addWeeks, addMonths } from "date-fns"
import type { CalendarEvent } from "@/components/event-calendar/types"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "vue-sonner"
import "vue-sonner/style.css"

// Reactive events state for full CRUD operations
const events = ref<CalendarEvent[]>([])
const isLoading = ref(false)
const { isDark } = useDarkMode()

// Initialize with comprehensive sample data showcasing all enhanced features
const initializeSampleEvents = (): CalendarEvent[] => [
  // Past events
  {
    id: "1",
    title: "Annual Planning",
    description: "Strategic planning session for next year's roadmap and objectives",
    startDate: subDays(new Date(), 24),
    endDate: subDays(new Date(), 23),
    allDay: true,
    color: "sky",
    location: "Main Conference Hall",
  },
  {
    id: "2",
    title: "Project Deadline",
    description: "Submit final deliverables for Q4 project",
    startDate: setMinutes(setHours(subDays(new Date(), 9), 13), 0),
    endDate: setMinutes(setHours(subDays(new Date(), 9), 15), 30),
    color: "amber",
    location: "Office Building A",
  },
  {
    id: "3",
    title: "Quarterly Budget Review",
    description: "Review and approve budget allocations for next quarter",
    startDate: subDays(new Date(), 13),
    endDate: subDays(new Date(), 13),
    allDay: true,
    color: "orange",
    location: "Executive Conference Room",
    status: "cancelled",
  },

  // Today's events (for testing drag and drop)
  {
    id: "4",
    title: "Team Standup",
    description: "Daily team synchronization meeting",
    startDate: setMinutes(setHours(new Date(), 9), 0),
    endDate: setMinutes(setHours(new Date(), 9), 30),
    color: "sky",
    location: "Conference Room A",
  },
  {
    id: "5",
    title: "Client Presentation",
    description: "Present project proposal to potential client",
    startDate: setMinutes(setHours(new Date(), 14), 0),
    endDate: setMinutes(setHours(new Date(), 15), 30),
    color: "emerald",
    location: "Client Office Downtown",
  },
  {
    id: "test-drag-1",
    title: "Draggable Test Event",
    description: "Test event for drag and drop functionality",
    startDate: setMinutes(setHours(new Date(), 10), 0),
    endDate: setMinutes(setHours(new Date(), 11), 0),
    color: "violet",
    location: "Test Location",
  },
  {
    id: "test-drag-2",
    title: "Resizable Test Event",
    description: "Test event for resizing functionality",
    startDate: setMinutes(setHours(new Date(), 13), 0),
    endDate: setMinutes(setHours(new Date(), 14), 30),
    color: "rose",
    location: "Test Location 2",
  },

  // Tomorrow's events
  {
    id: "6",
    title: "Lunch with Client",
    description: "Discuss new project requirements and timeline",
    startDate: setMinutes(setHours(addDays(new Date(), 1), 12), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 1), 13), 15),
    color: "emerald",
    location: "Downtown Cafe & Bistro",
    status: "tentative",
  },
  {
    id: "7",
    title: "Code Review Session",
    description: "Review pull requests and discuss architecture decisions",
    startDate: setMinutes(setHours(addDays(new Date(), 1), 15), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 1), 16), 30),
    color: "violet",
    location: "Development Office",
  },

  // Multi-day events
  {
    id: "8",
    title: "Product Launch Campaign",
    description: "Comprehensive product launch with marketing activities",
    startDate: addDays(new Date(), 3),
    endDate: addDays(new Date(), 6),
    allDay: true,
    color: "violet",
    location: "Multiple Locations",
  },

  // Future events with overlaps for testing
  {
    id: "9",
    title: "Sales Conference",
    description: "Quarterly sales team meeting and strategy session",
    startDate: setMinutes(setHours(addDays(new Date(), 4), 14), 30),
    endDate: setMinutes(setHours(addDays(new Date(), 5), 16), 45),
    color: "rose",
    location: "Hotel Conference Center",
  },
  {
    id: "10",
    title: "Team Building Event",
    description: "Outdoor team building activities and lunch",
    startDate: setMinutes(setHours(addDays(new Date(), 5), 9), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 5), 17), 0),
    color: "orange",
    location: "Adventure Park",
  },
  {
    id: "11",
    title: "Sprint Planning",
    description: "Plan next sprint backlog and assign tasks",
    startDate: setMinutes(setHours(addDays(new Date(), 5), 10), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 5), 12), 0),
    color: "sky",
    location: "Conference Room B",
  },
  {
    id: "12",
    title: "Design Review",
    description: "Review UI/UX designs for new features",
    startDate: setMinutes(setHours(addDays(new Date(), 5), 14), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 5), 15), 30),
    color: "amber",
    location: "Design Studio",
  },

  // Weekly recurring pattern simulation
  {
    id: "13",
    title: "Weekly All-Hands",
    description: "Company-wide weekly meeting",
    startDate: setMinutes(setHours(addWeeks(new Date(), 1), 10), 0),
    endDate: setMinutes(setHours(addWeeks(new Date(), 1), 11), 0),
    color: "sky",
    location: "Main Auditorium",
  },
  {
    id: "14",
    title: "Marketing Strategy Session",
    description: "Quarterly marketing planning and campaign review",
    startDate: setMinutes(setHours(addDays(new Date(), 9), 10), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 9), 15), 30),
    color: "emerald",
    location: "Marketing Department",
  },

  // Monthly events
  {
    id: "15",
    title: "Board Meeting",
    description: "Monthly board of directors meeting",
    startDate: setMinutes(setHours(addWeeks(new Date(), 2), 9), 0),
    endDate: setMinutes(setHours(addWeeks(new Date(), 2), 12), 0),
    color: "rose",
    location: "Executive Boardroom",
  },
  {
    id: "16",
    title: "Annual Shareholders Meeting",
    description: "Presentation of yearly results and future plans",
    startDate: addDays(new Date(), 17),
    endDate: addDays(new Date(), 17),
    allDay: true,
    color: "sky",
    location: "Grand Conference Center",
  },

  // Long-term events
  {
    id: "17",
    title: "Product Development Workshop",
    description: "Multi-day workshop for brainstorming new features and innovations",
    startDate: setMinutes(setHours(addDays(new Date(), 26), 9), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 27), 17), 0),
    color: "rose",
    location: "Innovation Lab",
  },
  {
    id: "18",
    title: "Conference Attendance",
    description: "Attend industry conference for latest trends and networking",
    startDate: addMonths(new Date(), 1),
    endDate: addDays(addMonths(new Date(), 1), 2),
    allDay: true,
    color: "violet",
    location: "Convention Center",
  },

  // Events for testing edge cases and advanced features
  {
    id: "19",
    title: "Late Night Deploy",
    description: "Production deployment and monitoring",
    startDate: setMinutes(setHours(addDays(new Date(), 2), 22), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 3), 2), 0),
    color: "amber",
    location: "Data Center",
  },
  {
    id: "20",
    title: "Early Morning Workout",
    description: "Team fitness session",
    startDate: setMinutes(setHours(addDays(new Date(), 3), 6), 30),
    endDate: setMinutes(setHours(addDays(new Date(), 3), 7), 30),
    color: "emerald",
    location: "Company Gym",
  },

  // Additional events to showcase enhanced features
  {
    id: "21",
    title: "Quick Standup",
    description: "Brief team sync",
    startDate: setMinutes(setHours(addDays(new Date(), 1), 9), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 1), 9), 15),
    color: "sky",
    location: "Dev Team Area",
  },
  {
    id: "22",
    title: "Client Call",
    description: "Weekly client check-in",
    startDate: setMinutes(setHours(addDays(new Date(), 1), 9), 30),
    endDate: setMinutes(setHours(addDays(new Date(), 1), 10), 0),
    color: "emerald",
    location: "Virtual Meeting",
  },
  {
    id: "23",
    title: "Architecture Review",
    description: "System design discussion",
    startDate: setMinutes(setHours(addDays(new Date(), 1), 10), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 1), 11), 30),
    color: "violet",
    location: "Conference Room C",
  },
  {
    id: "24",
    title: "Lunch Break",
    description: "Team lunch",
    startDate: setMinutes(setHours(new Date(), 12), 0),
    endDate: setMinutes(setHours(new Date(), 13), 0),
    color: "orange",
    location: "Office Cafeteria",
  },
  {
    id: "25",
    title: "Focus Time",
    description: "Deep work session",
    startDate: setMinutes(setHours(new Date(), 13), 0),
    endDate: setMinutes(setHours(new Date(), 15), 0),
    color: "amber",
    location: "Quiet Zone",
  },

  // Multi-day and multi-hour events for testing
  {
    id: "26",
    title: "International Conference",
    description: "3-day technology conference with workshops and networking",
    startDate: addDays(new Date(), 7),
    endDate: addDays(new Date(), 9),
    allDay: true,
    color: "violet",
    location: "Convention Center",
  },
  {
    id: "27",
    title: "Software Development Workshop",
    description: "Intensive 6-hour coding workshop",
    startDate: setMinutes(setHours(addDays(new Date(), 2), 9), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 2), 15), 0),
    color: "emerald",
    location: "Tech Hub",
  },
  {
    id: "28",
    title: "Weekend Retreat",
    description: "Team building and strategic planning weekend",
    startDate: setMinutes(setHours(addDays(new Date(), 12), 18), 0), // Friday 6 PM
    endDate: setMinutes(setHours(addDays(new Date(), 14), 16), 0), // Sunday 4 PM
    color: "rose",
    location: "Mountain Resort",
  },
  {
    id: "29",
    title: "Extended Meeting Series",
    description: "Multi-hour planning session",
    startDate: setMinutes(setHours(addDays(new Date(), 3), 10), 0),
    endDate: setMinutes(setHours(addDays(new Date(), 3), 16), 30),
    color: "sky",
    location: "Conference Room Alpha",
  },
]

// Enhanced event handlers with loading states and comprehensive error handling
const handleEventAdd = async (newEvent: CalendarEvent) => {
  isLoading.value = true
  try {
    // Simulate async operation for realistic UX
    await new Promise(resolve => setTimeout(resolve, 300))

    // Validate event data
    if (!newEvent.title?.trim()) {
      throw new Error("Event title is required")
    }

    if (newEvent.startDate >= newEvent.endDate && !newEvent.allDay) {
      throw new Error("End time must be after start time")
    }

    events.value.push(newEvent)
    toast.success(`Event "${newEvent.title}" created successfully`, {
      description: newEvent.location ? `Location: ${newEvent.location}` : undefined,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create event"
    toast.error("Error creating event", {
      description: errorMessage,
    })
  } finally {
    isLoading.value = false
  }
}

const handleEventUpdate = async (updatedEvent: CalendarEvent) => {
  isLoading.value = true
  try {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 200))

    const index = events.value.findIndex(event => event.id === updatedEvent.id)
    if (index === -1) {
      throw new Error("Event not found")
    }

    // Validate updated event data
    if (!updatedEvent.title?.trim()) {
      throw new Error("Event title is required")
    }

    if (updatedEvent.startDate >= updatedEvent.endDate && !updatedEvent.allDay) {
      throw new Error("End time must be after start time")
    }

    events.value[index] = updatedEvent
    toast.success(`Event "${updatedEvent.title}" updated successfully`, {
      description: "Changes have been saved",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update event"
    toast.error("Error updating event", {
      description: errorMessage,
    })
  } finally {
    isLoading.value = false
  }
}

const handleEventDelete = async (eventId: string) => {
  isLoading.value = true
  try {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 150))

    const eventIndex = events.value.findIndex(event => event.id === eventId)
    if (eventIndex === -1) {
      throw new Error("Event not found")
    }

    const deletedEvent = events.value[eventIndex]
    events.value.splice(eventIndex, 1)

    if (deletedEvent) {
      toast.success(`Event "${deletedEvent.title}" deleted successfully`, {
        description: "Event has been permanently removed",
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete event"
    toast.error("Error deleting event", {
      description: errorMessage,
    })
  } finally {
    isLoading.value = false
  }
}

// Initialize events on component mount
onMounted(() => {
  events.value = initializeSampleEvents()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <NuxtRouteAnnouncer />
    <div class="mx-auto p-4 md:p-6 lg:p-8">
      <EventCalendar
        :events="events"
        @event-add="handleEventAdd"
        @event-update="handleEventUpdate"
        @event-delete="handleEventDelete"
      />
    </div>
    <Toaster
      class="pointer-events-auto"
      :theme="isDark ? 'dark' : 'light'"
      position="top-right"
      richColors
      closeButton
    />
  </div>
</template>
