<script setup lang="ts">
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
} from "date-fns"
import { useForm } from "@tanstack/vue-form"
import { v4 as uuidv4 } from "uuid" // For generating event IDs

// Assuming shadcn-nuxt components are globally available or imported:
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// For D&D, you would import vue-draggable-next
// import draggable from 'vue-draggable-next';

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  color?: "sky" | "amber" | "violet" | "rose" | "emerald" | "orange"
  location?: string
}

type ViewMode = "month" | "week" | "day" | "agenda"

const props = defineProps<{
  events: CalendarEvent[]
  initialView?: ViewMode
}>()

const emit = defineEmits<{
  (e: "eventAdd", event: CalendarEvent): void
  (e: "eventUpdate", event: CalendarEvent): void
  (e: "eventDelete", eventId: string): void
}>()

const currentView = ref<ViewMode>(props.initialView || "month")
const currentDate = ref(new Date()) // Reference date for the current view
const localEvents = ref<CalendarEvent[]>(JSON.parse(JSON.stringify(props.events))) // Deep copy for local manipulation

watch(
  () => props.events,
  newEvents => {
    localEvents.value = JSON.parse(JSON.stringify(newEvents)) // Re-sync if external events change
  },
  { deep: true }
)

const isModalOpen = ref(false)
const modalMode = ref<"add" | "edit">("add")
const eventToEdit = ref<CalendarEvent | null>(null)

// --- TanStack Form ---
const form = useForm<CalendarEvent>({
  initialValues: {
    id: "",
    title: "",
    description: "",
    start: new Date(),
    end: new Date(),
    allDay: false,
    color: "sky",
    location: "",
  },
  onSubmit: async ({ value }) => {
    const eventData = {
      ...value,
      // Ensure dates are proper Date objects if they were stringified
      start: new Date(value.start),
      end: new Date(value.end),
    }
    if (modalMode.value === "add") {
      const newEvent = { ...eventData, id: uuidv4() }
      emit("eventAdd", newEvent)
      localEvents.value.push(newEvent) // Optimistic update
    } else if (eventToEdit.value) {
      const updatedEvent = { ...eventData, id: eventToEdit.value.id }
      emit("eventUpdate", updatedEvent)
      const index = localEvents.value.findIndex(e => e.id === updatedEvent.id)
      if (index !== -1) localEvents.value.splice(index, 1, updatedEvent) // Optimistic update
    }
    closeModal()
  },
  // Add validation here if needed, e.g., using Zod
})

// --- Date Navigation ---
const navigate = (direction: "prev" | "next" | "today") => {
  if (direction === "today") {
    currentDate.value = new Date()
    return
  }
  const S = direction === "prev" ? -1 : 1
  if (currentView.value === "month") currentDate.value = addMonths(currentDate.value, S)
  else if (currentView.value === "week") currentDate.value = addWeeks(currentDate.value, S)
  else if (currentView.value === "day") currentDate.value = addDays(currentDate.value, S)
}

const calendarTitle = computed(() => {
  if (currentView.value === "month") return format(currentDate.value, "MMMM yyyy")
  if (currentView.value === "week") {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 1 }) // Assuming week starts on Monday
    const end = endOfWeek(currentDate.value, { weekStartsOn: 1 })
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
  }
  if (currentView.value === "day") return format(currentDate.value, "MMMM d, yyyy")
  return "Agenda" // Agenda view might not have a dynamic title like this
})

// --- Event Handling ---
const openAddModal = (date?: Date) => {
  modalMode.value = "add"
  eventToEdit.value = null
  const initialStartDate = date || new Date()
  const initialEndDate = date ? addDays(date, 1) : addDays(new Date(), 1)

  form.reset({
    id: "",
    title: "",
    description: "",
    start: initialStartDate,
    end: initialEndDate,
    allDay: false,
    color: "sky",
    location: "",
  }) // Clears validation errors
  isModalOpen.value = true
}

const openEditModal = (event: CalendarEvent) => {
  modalMode.value = "edit"
  eventToEdit.value = { ...event } // Copy event to avoid direct mutation
  form.reset({
    ...event,
    start: new Date(event.start), // Ensure Date objects
    end: new Date(event.end),
  })
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  eventToEdit.value = null
}

const handleDelete = () => {
  if (eventToEdit.value && eventToEdit.value.id) {
    emit("eventDelete", eventToEdit.value.id)
    localEvents.value = localEvents.value.filter(e => e.id !== eventToEdit.value!.id) // Optimistic update
    closeModal()
  }
}

// --- Computed properties for views ---
// Example for Month View
const monthViewDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(currentDate.value), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end }).map(day => ({
    date: day,
    isCurrentMonth: day.getMonth() === currentDate.value.getMonth(),
    events: localEvents.value.filter(
      event =>
        isWithinInterval(day, { start: new Date(event.start), end: new Date(event.end) }) ||
        isSameDay(day, new Date(event.start))
    ),
  }))
})

// Placeholder for other views' data
const weekViewData = computed(() => {
  /* ... logic for week view ... */ return []
})
const dayViewData = computed(() => {
  /* ... logic for day view ... */ return []
})
const agendaEvents = computed(() => {
  return localEvents.value
    .filter(event => new Date(event.start) >= currentDate.value)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
})

// --- Drag and Drop ---
// For D&D with vue-draggable-next, you'd wrap event lists or day cells.
// Example:
// const onEventDropInMonth = (evt: any, dayDate: Date) => {
//   const eventId = evt.item.dataset.eventId;
//   const droppedEvent = localEvents.value.find(e => e.id === eventId);
//   if (droppedEvent) {
//     const originalStartDate = new Date(droppedEvent.start);
//     const duration = new Date(droppedEvent.end).getTime() - originalStartDate.getTime();
//     const newStart = new Date(dayDate); // Simplified, needs time adjustment
//     newStart.setHours(originalStartDate.getHours(), originalStartDate.getMinutes());
//     const newEnd = new Date(newStart.getTime() + duration);
//
//     const updatedEvent = { ...droppedEvent, start: newStart, end: newEnd };
//     emit('eventUpdate', updatedEvent);
//     // Optimistic update localEvents
//   }
// };
// This requires careful handling of event properties, allDay status, and view-specific rules.
// You would use `v-draggable` on event items and make calendar cells/slots droppable targets.
</script>

<template>
  <div class="p-4 flex flex-col h-full">
    <!-- Header: Navigation and View Switcher -->
    <header class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="navigate('prev')">&lt;</Button>
        <Button variant="outline" @click="navigate('today')">Today</Button>
        <Button variant="outline" @click="navigate('next')">&gt;</Button>
        <h2 class="text-xl font-semibold ml-4">{{ calendarTitle }}</h2>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="openAddModal()">Add Event</Button>
        <Select v-model="currentView">
          <SelectTrigger class="w-[120px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="agenda">Agenda</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>

    <!-- Calendar Grid / List Area -->
    <main class="flex-grow overflow-auto">
      <!-- Month View (Simplified Example) -->
      <div v-if="currentView === 'month'" class="grid grid-cols-7 border-t border-l">
        <!-- Day Headers -->
        <div
          v-for="dayHeader in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
          :key="dayHeader"
          class="p-2 text-center font-medium border-r border-b bg-muted/50"
        >
          {{ dayHeader }}
        </div>
        <!-- Day Cells -->
        <div
          v-for="day in monthViewDays"
          :key="day.date.toISOString()"
          :class="[
            'p-2 border-r border-b min-h-[120px] relative',
            day.isCurrentMonth ? 'bg-background' : 'bg-muted/30',
          ]"
          @click.self="openAddModal(day.date)"
          @dragover.prevent
          @drop.prevent="
            () => {
              /* onEventDropInMonth(event, day.date) */
            }
          "
        >
          <span>{{ format(day.date, "d") }}</span>
          <!-- Render events for this day -->
          <!-- For D&D: make event items draggable using vue-draggable-next or similar -->
          <div
            v-for="event in day.events"
            :key="event.id"
            :class="['mt-1 p-1 text-xs rounded cursor-pointer', `bg-${event.color}-200 border-${event.color}-400`]"
            :draggable="true"
            :data-event-id="event.id"
            @click="openEditModal(event)"
            @dragstart="
              e => {
                if (e.dataTransfer) e.dataTransfer.setData('text/plain', event.id)
              } /* More D&D setup needed */
            "
          >
            {{ event.title }}
            <div v-if="event.location" class="text-xs truncate opacity-75">{{ event.location }}</div>
          </div>
        </div>
      </div>

      <!-- Week View (Placeholder) -->
      <div v-else-if="currentView === 'week'" class="border p-4">
        Week View - Placeholder
        <!-- Detailed grid with time slots and days. D&D per slot. -->
        <!-- All-day events section at the top. -->
      </div>

      <!-- Day View (Placeholder) -->
      <div v-else-if="currentView === 'day'" class="border p-4">
        Day View - Placeholder
        <!-- Detailed grid with time slots for the single day. D&D per slot. -->
        <!-- All-day events section at the top. -->
      </div>

      <!-- Agenda View (Placeholder) -->
      <div v-else-if="currentView === 'agenda'" class="space-y-2">
        <div
          v-for="event in agendaEvents"
          :key="event.id"
          :class="['p-3 rounded shadow', `bg-${event.color}-100 border-${event.color}-300`]"
          @click="openEditModal(event)"
        >
          <h3 class="font-semibold">{{ event.title }}</h3>
          <p class="text-sm">{{ format(new Date(event.start), "PPp") }} - {{ format(new Date(event.end), "PPp") }}</p>
          <p v-if="event.description" class="text-sm opacity-80">{{ event.description }}</p>
          <p v-if="event.location" class="text-sm opacity-70">
            <i class="i-lucide-map-pin mr-1" />{{ event.location }}
          </p>
        </div>
        <div v-if="!agendaEvents.length" class="text-muted-foreground">No upcoming events.</div>
      </div>
    </main>

    <!-- Event Add/Edit Modal -->
    <Dialog
      :open="isModalOpen"
      @update:open="
        $event => {
          isModalOpen = $event
          if (!$event) closeModal()
        }
      "
    >
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ modalMode === "add" ? "Add Event" : "Edit Event" }}</DialogTitle>
          <DialogDescription>
            {{ modalMode === "add" ? "Fill in the details for your new event." : "Update your event details." }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="form.handleSubmit">
          <div class="grid gap-4 py-4">
            <form.Field v-slot="{ field }" name="title">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="title" class="text-right">Title</Label>
                <Input id="title" v-bind="field" class="col-span-3" />
                <p v-if="field.state.meta.errors.length" class="col-span-4 text-red-500 text-sm">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </div>
            </form.Field>

            <form.Field v-slot="{ field }" name="description">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="description" class="text-right">Description</Label>
                <Textarea id="description" v-bind="field" class="col-span-3" />
              </div>
            </form.Field>

            <form.Field v-slot="{ field }" name="start">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="start" class="text-right">Start Date</Label>
                <!-- Ideally use a shadcn-vue Date Picker component here -->
                <Input
                  id="start"
                  type="datetime-local"
                  :value="format(new Date(field.state.value || new Date()), `yyyy-MM-dd'T'HH:mm`)"
                  class="col-span-3"
                  @input="field.handleChange(new Date(($event.target as HTMLInputElement).value).toISOString())"
                />
              </div>
            </form.Field>

            <form.Field v-slot="{ field }" name="end">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="end" class="text-right">End Date</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  :value="format(new Date(field.state.value || new Date()), `yyyy-MM-dd'T'HH:mm`)"
                  class="col-span-3"
                  @input="field.handleChange(new Date(($event.target as HTMLInputElement).value).toISOString())"
                />
              </div>
            </form.Field>

            <form.Field v-slot="{ field }" name="allDay">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="allDay" class="text-right">All Day</Label>
                <Checkbox
                  id="allDay"
                  :checked="!!field.state.value"
                  class="col-span-3 justify-self-start"
                  @update:checked="field.handleChange"
                />
              </div>
            </form.Field>

            <form.Field v-slot="{ field }" name="color">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="color" class="text-right">Color</Label>
                <Select v-bind="field">
                  <SelectTrigger class="col-span-3">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sky">Sky</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="rose">Rose</SelectItem>
                    <SelectItem value="emerald">Emerald</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form.Field>

            <form.Field v-slot="{ field }" name="location">
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="location" class="text-right">Location</Label>
                <Input id="location" v-bind="field" class="col-span-3" />
              </div>
            </form.Field>
          </div>
          <DialogFooter>
            <form.Subscribe>
              <template #default="{ canSubmit, isSubmitting }">
                <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
                <Button type="submit" :disabled="!canSubmit">
                  {{ isSubmitting ? "Saving..." : "Save Event" }}
                </Button>
                <Button
                  v-if="modalMode === 'edit'"
                  type="button"
                  variant="destructive"
                  class="ml-auto"
                  @click="handleDelete"
                >
                  Delete
                </Button>
              </template>
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
