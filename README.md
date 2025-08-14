# Vue Event Calendar

A comprehensive event calendar application built with Vue 3, Nuxt 3/4, and ShadCN Vue components. This is a Vue/Nuxt implementation inspired by the React/Next.js ShadCN [component](https://full-calendar-steel.vercel.app/) found at https://github.com/origin-space/event-calendar.

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

- **@vueuse/core** - Vue composition utilities (including keyboard shortcuts)
- **date-fns** - Date manipulation and formatting
- **@vue-dnd-kit/core** - Modern Vue 3 drag and drop functionality
- **vue-sonner** - Toast notifications
- **@tanstack/vue-form** - Form management

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

## Project Structure

```
components/
├── event-calendar/                    # Core calendar components
│   ├── EventCalendar.vue             # Main calendar container
│   ├── MonthView.vue                 # Monthly calendar view
│   ├── WeekView.vue                  # Weekly calendar view with drag-and-drop
│   ├── DayView.vue                   # Daily calendar view with drag-and-drop
│   ├── AgendaView.vue                # Agenda list view
│   ├── EventModal.vue                # Event creation/editing modal
│   ├── LocationDisplay.vue           # Location display component with tooltips
│   ├── DayEventsOverflowPopup.vue    # Event overflow handling
│   ├── types.ts                      # TypeScript interfaces and types
│   ├── utils.ts                      # Calendar utility functions
│   ├── constants.ts                  # Calendar constants
│   └── composables/                  # Vue composables
│       └── useCalendarUtils.ts       # Calendar utility composable
└── ui/                               # ShadCN UI components
```

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
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  color?: EventColor;
  location?: string;
}

type EventColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange";
type ViewMode = "month" | "week" | "day" | "agenda";

// Location Display Props
interface LocationDisplayProps {
  location?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
  compact?: boolean;
  iconSize?: number;
}
```

### Component Props

```typescript
interface EventCalendarProps {
  events: CalendarEvent[];
  initialView?: ViewMode;
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
  enabled: boolean;
  crossViewEnabled: boolean;
  visualFeedback: boolean;
  snapToGrid: boolean;
  allowTimeChange: boolean;
  allowDateChange: boolean;
}

interface DropZoneInfo {
  id: string;
  type: "time-slot" | "all-day" | "day-cell";
  date: Date;
  time?: string;
  isValid: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedEvent?: CalendarEvent;
  validDropZones: DropZoneInfo[];
  currentDropZone?: DropZoneInfo;
  dragPreview?: { x: number; y: number; event: CalendarEvent };
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
} = useDragAndDropSystem();
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
  id: string;
  type: 'validation' | 'network' | 'drag-drop' | 'general';
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

const {
  errors,           // Reactive array of errors
  isLoading,        // Global loading state
  handleError,      // Handle and display errors
  clearError,       // Clear specific error
  clearAllErrors,   // Clear all errors
  withErrorHandling, // Wrap async operations
  validateEvent     // Validate event data
} = useErrorHandling();
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
<LocationDisplay
  :location="event.location"
  :compact="true"
  :show-tooltip="true"
  :icon-size="12"
/>
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

## Recent Updates & Migration

### Vue-DnD-Kit Migration (v2.0)

The project has been successfully migrated from `@formkit/drag-and-drop` to `@vue-dnd-kit/core` for improved Vue 3 compatibility and performance:

**Key Improvements:**
- **Better Vue 3 Integration**: Native Vue 3 Composition API support with `useDraggable` and `useDroppable` composables
- **Enhanced SSR Compatibility**: Improved server-side rendering support with client-side only initialization
- **Better TypeScript Support**: Full TypeScript integration with better type safety
- **Performance Optimizations**: Reduced bundle size and improved rendering performance
- **Cleaner Code Architecture**: More maintainable and extensible drag-and-drop system

**Migration Benefits:**
- **Improved Stability**: More reliable drag-and-drop operations across all views
- **Enhanced Visual Feedback**: Better drop zone highlighting and drag previews
- **Cross-View Compatibility**: Seamless dragging between Month, Week, and Day views
- **Error Handling**: Robust error handling for drag-and-drop operations
- **Modern Standards**: Uses latest Vue 3 patterns and best practices

**Technical Changes:**
- Replaced FormKit drag-and-drop with vue-dnd-kit components
- Updated all view components (Month, Week, Day) with new drag handlers
- Enhanced the `useDragAndDropSystem` composable for better flexibility
- Added comprehensive error handling and validation
- Improved performance with `shallowRef` for large event collections
- Removed debugging console logs for production-ready code

### Code Quality Improvements

**Cleanup & Optimization:**
- Removed unused imports and dependencies
- Eliminated debugging console.log statements
- Optimized computed properties with `shallowRef` for better performance
- Added comprehensive error handling and edge case protection
- Improved TypeScript type safety throughout the application
- Enhanced SSR compatibility checks

**Bug Fixes:**
- Fixed null/undefined reference errors in drag handlers
- Added proper date validation in event processing
- Improved error handling for malformed drag data
- Enhanced event parsing with try-catch blocks
- Added safety checks for DOM element references

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

Check out the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information on deployment options.
