# Vue Event Calendar

A comprehensive event calendar application built with Vue 3, Nuxt 3/4, and ShadCN Vue components. This is a Vue/Nuxt
implementation inspired by the React/Next.js ShadCN [component](https://full-calendar-steel.vercel.app/) found at
https://github.com/origin-space/event-calendar.

## Features

### 📅 Multiple Calendar Views

- **Month View**: Traditional monthly calendar grid with event display
- **Week View**: 7-day view with time slots and drag-and-drop support
- **Day View**: Single day detailed view with hourly time slots
- **Agenda View**: List-based view of upcoming events

### ⚡ Interactive Features

- **Event Management**: Create, edit, and delete events with a modal interface
- **Enhanced Drag & Drop**: Move events between time slots with visual feedback
  - Drag events within WeekView and DayView with precise time slot targeting
  - Visual drop zone highlighting during drag operations
  - Support for both all-day and timed event conversions
  - Cross-view dragging between different calendar views
- **All-day & Timed Events**: Support for both event types with seamless conversion
- **Event Colors**: Color-coded events with predefined color schemes
- **Event Status Management**: Visual feedback for different event states
  - **Past Events**: Automatic detection with reduced opacity and time indicators
  - **Cancelled Events**: Strikethrough text with reduced saturation and cancel icons
  - **Tentative Events**: Dashed borders with question mark indicators
  - **Confirmed Events**: Standard appearance (default state)
- **Multi-day Event Support**: Visual continuity for events spanning multiple days
  - Connected visual styling across day boundaries
  - Rounded borders that flow from start to end day
  - Information display only on event start day
  - Visual connection indicators for continuation
- **Location Support**: Add and display event locations with tooltips and icons
  - Compact location display for small event cards
  - Hover tooltips showing full location details
  - Location icons with customizable sizing
- **Loading States**: Visual feedback during async operations with loading indicators
- **Error Handling**: Comprehensive error handling with toast notifications and validation

### ⌨️ Keyboard Navigation

Quick view switching with keyboard shortcuts:

- `M` - Switch to Month view
- `W` - Switch to Week view
- `D` - Switch to Day view
- `A` - Switch to Agenda view

_Note: Keyboard shortcuts are disabled when typing in input fields or when the event modal is open._

### 📱 Responsive Design

- Mobile-friendly interface with adaptive layouts
- Touch-friendly interactions for mobile devices
- Responsive event cards and time slot sizing
- **Dark/Light Mode**: Seamless theme switching with smooth transitions
  - Auto-detects system preference
  - Manual toggle with animated sun/moon icon
  - Persistent theme selection via localStorage
  - Smooth color transitions across all components

### 🎨 Visual Enhancements

- **Equal Grid Sizing**: Month view uses consistent cell dimensions for uniform layout
- **Header Alignment**: Week view headers perfectly align with time grid columns
- **Multi-day Visual Connection**: Events spanning multiple days show visual continuity
- **Status Indicators**: Clear visual feedback for event states with icons and styling
- **Improved Spacing**: Better component spacing and padding throughout the interface

## Technology Stack

### Core Framework

- **Nuxt 3/4** - Vue.js meta-framework with SSR/SSG capabilities
- **Vue 3** - Composition API with TypeScript support
- **TypeScript** - Strict typing throughout the application

### UI & Styling

- **ShadCN Vue** - Component library (New York style)
- **Tailwind CSS v4** - Utility-first CSS framework
- **Reka UI** - Headless UI components for Vue
- **Iconify** - Icon library with Lucide icons

### Key Libraries

- **@vueuse/core** - Vue composition utilities (including keyboard shortcuts and dark mode)
- **date-fns** - Date manipulation and formatting
- **@vue-dnd-kit/core** - Modern Vue 3 drag and drop functionality
- **vue-sonner** - Toast notifications
- **@tanstack/vue-form** - Form management with validation
- **uuid** - Unique identifier generation for events

## Setup

Make sure to install dependencies using Bun (recommended):

```bash
bun install
```

## Development

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

## Production

Build the application for production:

```bash
bun run build
```

Locally preview production build:

```bash
bun run preview
```

Generate static site:

```bash
bun run generate
```

## Testing

Run tests with Vitest:

```bash
bun run test
```

Run tests with UI:

```bash
bun run test:ui
```

Run tests once:

```bash
bun run test:run
```

Run tests with coverage:

```bash
bun run test:coverage
```

## Project Structure

```
components/
├── event-calendar/                    # Core calendar components
│   ├── EventCalendar.vue             # Main calendar container
│   ├── MonthView.vue                 # Monthly calendar view with equal grid sizing
│   ├── WeekView.vue                  # Weekly calendar view with aligned headers
│   ├── DayView.vue                   # Daily calendar view with drag-and-drop
│   ├── AgendaView.vue                # Agenda list view with month navigation
│   ├── EventModal.vue                # Event creation/editing modal with status
│   ├── LocationDisplay.vue           # Location display component with tooltips
│   ├── DayEventsOverflowPopup.vue    # Event overflow handling
│   ├── DragDropVisualFeedback.vue    # Visual feedback component
│   ├── EventResizeHandle.vue         # Event resizing handles
│   ├── types.ts                      # TypeScript interfaces and types
│   ├── utils.ts                      # Calendar utility functions
│   ├── constants.ts                  # Calendar constants
│   ├── __tests__/                    # Test files
│   │   ├── EventCalendar.test.ts     # Main component tests
│   │   ├── useColorManager.test.ts   # Color manager tests
│   │   └── useEventStatus.test.ts    # Event status tests
│   └── composables/                  # Vue composables
│       ├── useCalendarUtils.ts       # Calendar utility composable
│       ├── useColorManager.ts        # Color management composable
│       ├── useDarkMode.ts           # Dark mode composable
│       ├── useDragAndDrop.ts        # Enhanced drag-and-drop system
│       ├── useErrorHandling.ts       # Error handling composable
│       ├── useEventFiltering.ts      # Event filtering composable
│       ├── useEventStatus.ts         # Event status management
│       └── useKeyboardNavigation.ts  # Keyboard navigation composable
└── ui/                               # ShadCN UI components
    ├── DarkModeToggle.vue           # Dark/Light mode toggle component
    └── [other ShadCN components]    # Button, Dialog, Input, etc.
```

## ShadCN Component/Block Usage

This Event Calendar can be used as a ShadCN-style component/block in your Vue/Nuxt applications. It follows the ShadCN
design principles with proper TypeScript types, accessible markup, and Tailwind CSS styling.

### Installation as a ShadCN Block

1. **Copy the component files** from `components/event-calendar/` to your project
2. **Install required dependencies**:
   ```bash
   bun install @vueuse/core date-fns @date-fns/tz @vue-dnd-kit/core @tanstack/vue-form uuid vue-sonner
   ```
3. **Ensure you have the required ShadCN components** installed:
   ```bash
   bunx --bun shadcn-vue@latest add button dialog input label textarea select checkbox radio-group popover calendar
   ```
4. **Add to your Nuxt configuration** (nuxt.config.ts):
   ```typescript
   export default defineNuxtConfig({
     modules: ["@vueuse/nuxt", "@nuxtjs/tailwindcss", "shadcn-nuxt"],
     shadcn: {
       prefix: "",
       componentDir: "./components/ui",
     },
   })
   ```

### Component Structure

```
components/event-calendar/
├── EventCalendar.vue              # Main component - drop this into any page
├── types.ts                       # TypeScript interfaces
├── composables/                   # Reusable Vue composables
│   ├── useCalendarUtils.ts        # Calendar utilities
│   ├── useColorManager.ts         # Event color management
│   ├── useDragAndDrop.ts         # Enhanced drag-and-drop
│   ├── useErrorHandling.ts        # Error handling system
│   ├── useEventFiltering.ts       # Event filtering logic
│   ├── useEventStatus.ts          # Event status management
│   ├── useExternalCalendar.ts     # External calendar integration
│   ├── useKeyboardNavigation.ts   # Keyboard shortcuts
│   ├── useMultiDayLayout.ts      # Multi-day event layout
│   ├── useRecurringEvents.ts     # Recurring event support
│   └── useTimezone.ts            # Timezone handling
└── [view-components].vue          # Month, Week, Day, Agenda views
```

### Quick Start Example

```vue
<template>
  <div class="p-6">
    <EventCalendar
      :events="events"
      :initial-view="'month'"
      @event-add="handleEventAdd"
      @event-update="handleEventUpdate"
      @event-delete="handleEventDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { CalendarEvent } from "@/components/event-calendar/types"
import { toast } from "vue-sonner"

// Event management
const events = ref<CalendarEvent[]>([
  {
    id: "1",
    title: "Team Meeting",
    description: "Weekly sync with the team",
    startDate: new Date(2024, 0, 15, 10, 0),
    endDate: new Date(2024, 0, 15, 11, 0),
    allDay: false,
    color: "sky",
    location: "Conference Room A",
    status: "confirmed",
  },
])

const handleEventAdd = (event: CalendarEvent) => {
  events.value.push(event)
  toast.success(`Event "${event.title}" created`)
}

const handleEventUpdate = (event: CalendarEvent) => {
  const index = events.value.findIndex(e => e.id === event.id)
  if (index !== -1) {
    events.value[index] = event
    toast.success(`Event "${event.title}" updated`)
  }
}

const handleEventDelete = (eventId: string) => {
  events.value = events.value.filter(e => e.id !== eventId)
  toast.success("Event deleted")
}
</script>
```

### Advanced Configuration

```vue
<template>
  <EventCalendar
    :events="events"
    :initial-view="view"
    @event-add="handleEventAdd"
    @event-update="handleEventUpdate"
    @event-delete="handleEventDelete"
    class="h-screen"
  />
</template>

<script setup lang="ts">
// Full configuration with advanced features
const events = ref<CalendarEvent[]>([
  {
    id: crypto.randomUUID(),
    title: "Multi-day Conference",
    description: "Annual tech conference",
    startDate: new Date(2024, 0, 15, 9, 0),
    endDate: new Date(2024, 0, 17, 17, 0),
    allDay: false,
    color: "violet",
    location: "Convention Center",
    status: "confirmed",
    timezone: "America/New_York",
    isRecurring: false,
  },
])
</script>
```

### Customization Options

#### Event Colors

Available colors: `sky`, `amber`, `violet`, `rose`, `emerald`, `orange`

#### Event Status Types

- `confirmed` - Default appearance
- `tentative` - Dashed border with question mark
- `cancelled` - Strikethrough with reduced opacity
- `past` - Auto-detected, reduced opacity

#### View Modes

- `month` - Traditional calendar grid
- `week` - 7-day view with time slots
- `day` - Single day detailed view
- `agenda` - List view of events

#### Keyboard Shortcuts

- `M` - Switch to Month view
- `W` - Switch to Week view
- `D` - Switch to Day view
- `A` - Switch to Agenda view

### Styling Customization

The component uses Tailwind CSS classes and CSS custom properties. Override styles by:

```vue
<template>
  <EventCalendar :events="events" class="custom-calendar" />
</template>

<style scoped>
.custom-calendar {
  /* Override default styles */
  --calendar-border-color: theme("colors.gray.300");
  --event-border-radius: theme("borderRadius.lg");
}

/* Custom event styling */
.custom-calendar :deep(.event-content) {
  @apply shadow-lg hover:shadow-xl;
}
</style>
```

### Integration with Backend

```typescript
// api/events.ts
export interface EventAPI {
  fetchEvents: (start: Date, end: Date) => Promise<CalendarEvent[]>
  createEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
}

// composables/useEventAPI.ts
export const useEventAPI = () => {
  const events = ref<CalendarEvent[]>([])
  const isLoading = ref(false)

  const loadEvents = async (start: Date, end: Date) => {
    isLoading.value = true
    try {
      events.value = await $fetch("/api/events", {
        query: { start: start.toISOString(), end: end.toISOString() },
      })
    } finally {
      isLoading.value = false
    }
  }

  return { events: readonly(events), isLoading: readonly(isLoading), loadEvents }
}
```

### Performance Considerations

- Uses `shallowRef` for large event collections
- Memoized computed properties for expensive operations
- Virtual scrolling for large time ranges (agenda view)
- Optimized drag-and-drop with throttled updates
- SSR-compatible with client-side hydration

## Usage

### Basic Implementation

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue"
import type { CalendarEvent } from "@/components/event-calendar/types"
import { toast } from "vue-sonner"

const events = ref<CalendarEvent[]>([])

const handleEventAdd = async (newEvent: CalendarEvent) => {
  events.value.push(newEvent)
  toast.success(`Event "${newEvent.title}" created successfully`)
}

const handleEventUpdate = async (updatedEvent: CalendarEvent) => {
  const index = events.value.findIndex(event => event.id === updatedEvent.id)
  if (index !== -1) {
    events.value[index] = updatedEvent
    toast.success(`Event "${updatedEvent.title}" updated successfully`)
  }
}

const handleEventDelete = async (eventId: string) => {
  const eventIndex = events.value.findIndex(event => event.id === eventId)
  if (eventIndex !== -1) {
    const deletedEvent = events.value[eventIndex]
    events.value.splice(eventIndex, 1)
    toast.success(`Event "${deletedEvent.title}" deleted successfully`)
  }
}

onMounted(() => {
  events.value = [
    {
      id: "1",
      title: "Team Meeting",
      description: "Weekly team sync",
      startDate: new Date(),
      endDate: new Date(),
      allDay: false,
      color: "sky",
      location: "Conference Room A",
    },
  ]
})
</script>

<template>
  <div>
    <EventCalendar
      :events="events"
      @event-add="handleEventAdd"
      @event-update="handleEventUpdate"
      @event-delete="handleEventDelete"
    />
  </div>
</template>
```

### Event Interface

```typescript
interface CalendarEvent {
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
  status?: EventStatus
  // Recurring event support (future implementation)
  isRecurring?: boolean
  recurringPattern?: RecurringPattern
  recurringId?: string
}

type EventColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange"
type EventStatus = "confirmed" | "cancelled" | "tentative" | "past"
type ViewMode = "month" | "week" | "day" | "agenda"

interface RecurringPattern {
  type: "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  endDate?: Date
  count?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  monthOfYear?: number
}

// Location Display Props
interface LocationDisplayProps {
  location?: string
  showIcon?: boolean
  showTooltip?: boolean
  compact?: boolean
  iconSize?: number
}
```

### Component Props

```typescript
interface EventCalendarProps {
  events: CalendarEvent[]
  initialView?: ViewMode
}
```

### Component Events

```typescript
// Event handlers
@eventAdd(event: CalendarEvent): void
@eventUpdate(event: CalendarEvent): void
@eventDelete(eventId: string): void
```

## Drag & Drop Features

The calendar includes advanced drag-and-drop functionality powered by `@vue-dnd-kit/core`:

### Enhanced Cross-View Drag & Drop System

- **Global Drag State**: Unified drag-and-drop system that works across all calendar views
- **Cross-View Dragging**: Move events between different calendar views (Month, Week, Day)
- **Smart Event Conversion**: Automatically converts between all-day and timed events based on drop target
- **Precise Time Targeting**: Drop events on specific time slots with pixel-perfect positioning
- **Visual Feedback**: Drop zones are highlighted during drag operations with color-coded indicators
- **Duration Preservation**: Event duration is maintained when moving between time slots

### Drag & Drop Configuration System

The enhanced system provides flexible configuration for different drop zones:

```typescript
interface DragDropConfig {
  enabled: boolean
  crossViewEnabled: boolean
  visualFeedback: boolean
  snapToGrid: boolean
  allowTimeChange: boolean
  allowDateChange: boolean
}

interface DropZoneInfo {
  id: string
  type: "time-slot" | "all-day" | "day-cell"
  date: Date
  time?: string
  isValid: boolean
}

interface DragState {
  isDragging: boolean
  draggedEvent?: CalendarEvent
  validDropZones: DropZoneInfo[]
  currentDropZone?: DropZoneInfo
  dragPreview?: { x: number; y: number; event: CalendarEvent }
}
```

### Drag & Drop System API

The `useDragAndDropSystem` composable provides:

```typescript
const {
  globalDragState, // Global drag state management
  createDragConfig, // Create drag configuration for zones
  registerDropZone, // Register valid drop zones
  unregisterDropZone, // Unregister drop zones
  isValidDropZone, // Check if zone accepts drops
  getCurrentDropZone, // Get current drop target
  createDraggableEvent, // Create draggable event handlers
  createDroppableZone, // Create droppable zone handlers
} = useDragAndDropSystem()
```

### Cross-View Event Handling

- **All-day to Timed**: Dragging from all-day zones to time slots converts events to timed events
- **Timed to All-day**: Dragging from time slots to all-day zones converts events to all-day events
- **Date Changes**: Moving events between different days preserves time but updates the date
- **Time Precision**: Mouse position determines exact drop time within time slots

## Error Handling & Loading States

The calendar includes comprehensive error handling and loading state management:

### Error Handling System

The `useErrorHandling` composable provides centralized error management:

```typescript
interface CalendarError {
  id: string
  type: "validation" | "network" | "drag-drop" | "general"
  message: string
  timestamp: Date
  context?: Record<string, any>
}

const {
  errors, // Reactive array of errors
  isLoading, // Global loading state
  handleError, // Handle and display errors
  clearError, // Clear specific error
  clearAllErrors, // Clear all errors
  withErrorHandling, // Wrap async operations
  validateEvent, // Validate event data
} = useErrorHandling()
```

### Loading States

- **Global Loading State**: Unified loading indicator across all operations
- **Async Operation Feedback**: Visual feedback during event creation, updates, and deletions
- **Simulated Network Delays**: Realistic UX with simulated async operations
- **Loading Indicators**: Toast notifications and UI feedback during operations

### Event Validation

Comprehensive validation for event data:

- **Required Fields**: Title validation
- **Date Validation**: Start/end date consistency checks
- **Time Logic**: End time must be after start time for timed events
- **Real-time Feedback**: Immediate validation feedback in forms

### Error Recovery

- **Graceful Degradation**: Operations fail gracefully without breaking the UI
- **User Feedback**: Clear error messages via toast notifications
- **Development Logging**: Detailed error logging in development mode
- **Context Preservation**: Error context for debugging and recovery

### Location Display Component

The `LocationDisplay` component provides flexible location rendering:

```vue
<LocationDisplay :location="event.location" :compact="true" :show-tooltip="true" :icon-size="12" />
```

**Props:**

- `location` - Location text to display
- `showIcon` - Show/hide map pin icon (default: true)
- `showTooltip` - Enable hover tooltip with full location (default: true)
- `compact` - Compact mode for small spaces (default: false)
- `iconSize` - Icon size in pixels (default: 12)

## Configuration

The project uses several configuration files:

- `nuxt.config.ts` - Nuxt configuration with modules and plugins
- `components.json` - ShadCN component configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

## Event Status Management

The calendar includes comprehensive event status management with visual feedback:

### Event Status Types

- **Confirmed** (default): Standard event appearance
- **Tentative**: Events with uncertain confirmation status
- **Cancelled**: Events that have been cancelled but remain visible
- **Past**: Events that have already ended (auto-detected)

### Visual Feedback

Each status type provides distinct visual indicators:

```typescript
// Status styling examples
confirmed: "" // No additional styling (default)
tentative: "opacity-80 border-dashed" // Dashed border with reduced opacity
cancelled: "opacity-50 line-through saturate-50" // Strikethrough with reduced saturation
past: "opacity-70 saturate-75" // Reduced opacity and saturation
```

### Status Indicators

- **Cancelled**: ✕ (cross mark)
- **Past**: ⏰ (clock icon)
- **Tentative**: ? (question mark)
- **Confirmed**: No indicator

### Automatic Status Detection

The system automatically detects past events:

- **Timed Events**: Marked as past when end time has passed
- **All-day Events**: Marked as past after the day ends
- **Real-time Updates**: Status updates automatically as time progresses

### Status Management API

The `useEventStatus` composable provides:

```typescript
const {
  getEventStatus, // Get current event status
  getEventStatusClasses, // Get CSS classes for status styling
  getEventStatusIndicator, // Get status indicator icon
  getEventStatusTooltip, // Get status tooltip text
  isEventInPast, // Check if event is past
  isEventCancelled, // Check if event is cancelled
  processEventsWithStatus, // Process events with computed status
} = useEventStatus(events)
```

## Multi-day Event Support

Enhanced visual continuity for events spanning multiple days:

### Visual Connection Features

- **Connected Borders**: Rounded borders that flow from start to end day
- **Visual Indicators**: Subtle connection lines for continuation
- **Information Display**: Event details shown only on start day
- **Smart Rendering**: Optimized rendering for long-duration events

### Multi-day Event Styling

Events automatically adapt their appearance based on position:

```typescript
// Border radius classes based on event position
startDay: "rounded-l rounded-r-none" // Left rounded only
middleDay: "rounded-none" // No rounding
endDay: "rounded-r rounded-l-none" // Right rounded only
singleDay: "rounded" // Full rounding
```

### Helper Functions

The system provides utilities for multi-day event handling:

```typescript
const {
  isMultiDayEvent, // Check if event spans multiple days
  isEventStart, // Check if current day is event start
  isEventEnd, // Check if current day is event end
  getMultiDayEventClasses, // Get appropriate CSS classes
} = useMultiDayEvents()
```

## Dark Mode Support

Comprehensive dark mode implementation with smooth transitions:

### Features

- **Auto-detection**: Respects system preference on first visit
- **Manual Toggle**: Animated sun/moon icon toggle button
- **Persistence**: Theme choice saved to localStorage
- **Smooth Transitions**: All components transition smoothly between themes

### Implementation

Uses VueUse's `useDark` composable:

```typescript
export const useDarkMode = () => {
  const isDark = useDark({
    selector: "html",
    attribute: "class",
    valueDark: "dark",
    valueLight: "light",
    storageKey: "event-calendar-theme",
  })

  const toggle = useToggle(isDark)

  return { isDark: readonly(isDark), toggle }
}
```

### CSS Transitions

Smooth color transitions applied globally:

```css
* {
  transition: colors 300ms ease-in-out;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

Check out the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information on
deployment options.
