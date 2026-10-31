<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { onKeyStroke } from "@vueuse/core"
import { useForm } from "@tanstack/vue-form"
import * as v from "valibot"
import { toDate } from "reka-ui/date"
import { fromDate, CalendarDate, type DateValue, today, getLocalTimeZone } from "@internationalized/date"
import { format, addHours, addMinutes, isBefore, startOfHour, startOfDay } from "date-fns"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CalendarEvent, EventColor, EventStatus } from "./types"
import { EndHour, StartHour } from "./constants"
import { useTimezone } from "./composables/useTimezone"
import { Calendar as CalendarIcon, MapPin, Globe, ChevronsUpDown, Check, Repeat } from "@lucide/vue"

const props = defineProps<{
  isOpen: boolean
  mode: "add" | "edit"
  eventData?: CalendarEvent | null // For pre-filling in edit mode
  targetDate?: Date | null // For pre-filling start date in add mode
  isAllDayFromCell?: boolean // For pre-filling allDay status from cell click
  // Whether recurring-event UI is enabled. Passed down from EventCalendar so the
  // component stays framework-agnostic (no Nuxt runtime coupling).
  recurringEnabled?: boolean
}>()

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void
  (e: "submitEvent", eventPayload: CalendarEvent, mode: "add" | "edit"): void
  (e: "deleteEvent", eventId: string): void
}>()

// Handle ESC key to close modal
// Initialize timezone support
const { userTimezone, commonTimezones, convertEventFromDisplayTimezone, detectUserTimezone } = useTimezone()

onKeyStroke("Escape", e => {
  if (props.isOpen) {
    e.preventDefault()
    emit("update:isOpen", false)
  }
})

// Recurring-event UI is gated by the `recurringEnabled` prop (default off),
// provided by EventCalendar. Keeps this component free of any Nuxt coupling.
const recurringEnabled = computed(() => props.recurringEnabled ?? false)

const startDateOpen = ref(false)
const endDateOpen = ref(false)
const isAllDay = ref(props.isAllDayFromCell || false)
const isRecurring = ref(false)
const confirmingDelete = ref(false)
const isTZOpen = ref(false)
const recurringEndType = ref("never")
const startDateValue = ref<Date | undefined>(undefined)
const endDateValue = ref<Date | undefined>(addHours(new Date(), 1))
const recurringEndDateValue = ref<Date | undefined>(undefined)
const error = ref<string | null>(null)
const timezoneSearchTerm = ref("")

const setError = (message: string) => {
  error.value = message
}

const clearError = () => {
  error.value = null
}

const formatTimeForInput = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = Math.floor(date.getMinutes() / 15) * 15
  return `${hours}:${minutes.toString().padStart(2, "0")}`
}

const convertToDateValue = (date: Date, timezone: string = "UTC"): DateValue => {
  try {
    // Method 1: Using fromDate and converting to CalendarDate
    const zonedDateTime = fromDate(date, timezone)
    return new CalendarDate(zonedDateTime.year, zonedDateTime.month, zonedDateTime.day)
  } catch (error) {
    // Fallback: Manual construction
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }
}

// Memoize time options so they're only calculated once
const timeOptions = computed(() => {
  const options = []
  // EndHour is exclusive (24 means "until midnight"), so the last slot is 23:45.
  for (let hour = StartHour; hour < EndHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      const value = `${formattedHour}:${formattedMinute}`
      // Use a fixed date to avoid unnecessary date object creations
      const date = new Date(2000, 0, 1, hour, minute)
      const label = format(date, "h:mm a")
      options.push({ value, label })
    }
  }
  return options
})

const getTZDisplayName = (timezone: string) => {
  const tz = commonTimezones.find(t => t.timezone === timezone)
  return tz ? `${tz.label} (${tz.offset})` : timezone
}

// Helper to ensure proper Date object for Calendar component
const ensureValidDate = (value: any): Date => {
  if (!value) return new Date()
  if (value instanceof Date && !isNaN(value.getTime())) return value
  if ("calendar" in value) return toDate(value)
  const parsed = new Date(value)
  return !isNaN(parsed.getTime()) ? parsed : new Date()
}


// Default start/end for a new event. A slot click (a target with a time) starts
// there; otherwise the next full hour today (or 09:00 on another day). Events
// last an hour, rounded to the 15-minute grid the time pickers offer.
const defaultTimesFor = (target?: Date | null) => {
  const now = new Date()
  let start: Date
  if (target && (target.getHours() !== 0 || target.getMinutes() !== 0)) {
    start = new Date(target)
    start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0)
  } else if (!target || startOfDay(target).getTime() === startOfDay(now).getTime()) {
    start = startOfHour(addHours(now, 1))
    // Late evening: keep the event on the chosen day.
    if (start.getDate() !== now.getDate()) start = addMinutes(startOfDay(addHours(now, 24)), -60)
  } else {
    start = new Date(target)
    start.setHours(9, 0, 0, 0)
  }
  const end = addHours(start, 1)
  return { start, end, startTime: formatTimeForInput(start), endTime: formatTimeForInput(end) }
}

// Field rules (valibot, via TanStack Form's Standard Schema support). They match
// the server's event schema, so the dialog never submits what the API rejects.
const titleSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Give the event a title"),
  v.maxLength(200, "Keep the title under 200 characters"),
)
const locationSchema = v.pipe(v.string(), v.maxLength(500, "Keep the location under 500 characters"))
const descriptionSchema = v.pipe(v.string(), v.maxLength(5000, "Keep the notes under 5,000 characters"))

const colorOptions: Array<{
  value: EventColor
  label: string
  bgClass: string
  borderClass: string
}> = [
  {
    value: "sky",
    label: "Sky",
    bgClass: "bg-sky-400 data-[state=checked]:bg-sky-400",
    borderClass: "border-sky-400 data-[state=checked]:border-sky-400",
  },
  {
    value: "amber",
    label: "Amber",
    bgClass: "bg-amber-400 data-[state=checked]:bg-amber-400",
    borderClass: "border-amber-400 data-[state=checked]:border-amber-400",
  },
  {
    value: "violet",
    label: "Violet",
    bgClass: "bg-violet-400 data-[state=checked]:bg-violet-400",
    borderClass: "border-violet-400 data-[state=checked]:border-violet-400",
  },
  {
    value: "rose",
    label: "Rose",
    bgClass: "bg-rose-400 data-[state=checked]:bg-rose-400",
    borderClass: "border-rose-400 data-[state=checked]:border-rose-400",
  },
  {
    value: "emerald",
    label: "Emerald",
    bgClass: "bg-emerald-400 data-[state=checked]:bg-emerald-400",
    borderClass: "border-emerald-400 data-[state=checked]:border-emerald-400",
  },
  {
    value: "orange",
    label: "Orange",
    bgClass: "bg-orange-400 data-[state=checked]:bg-orange-400",
    borderClass: "border-orange-400 data-[state=checked]:border-orange-400",
  },
]

const form = useForm({
  defaultValues: {
    id: props.mode == "add" ? uuidv4() : props.eventData?.id,
    title: "",
    description: "",
    startDate: ensureValidDate(props.targetDate),
    endDate: ensureValidDate(props.targetDate ? addHours(new Date(props.targetDate), 1) : addHours(new Date(), 1)),
    startTime: defaultTimesFor(props.targetDate).startTime,
    endTime: defaultTimesFor(props.targetDate).endTime,
    allDay: props.isAllDayFromCell || false,
    color: "sky",
    location: "",
    status: "confirmed",
    timezone: userTimezone.value,
    isRecurring: false,
    recurringPattern: {
      type: "daily",
      interval: 1,
      daysOfWeek: [],
      count: undefined,
      endDate: undefined,
    },
    recurringEndType: "never",
  } as CalendarEvent & { recurringEndType?: string },
  onSubmit: async ({ value }) => {
    const start = new Date(value.startDate)
    const end = new Date(value.endDate)

    if (!value.allDay) {
      const [startHours = 0, startMinutes = 0] = (value.startTime || "09:00").split(":").map(Number)
      const [endHours = 0, endMinutes = 0] = (value.endTime || "10:00").split(":").map(Number)

      if (startHours < StartHour || startHours > EndHour || endHours < StartHour || endHours > EndHour) {
        setError(`Selected time must be between ${StartHour}:00 and ${EndHour}:00`)
        return
      }

      start.setHours(startHours, startMinutes, 0)
      end.setHours(endHours, endMinutes, 0)
    } else {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    }

    // Validate that end date is not before start date
    if (isBefore(end, start)) {
      setError("End date cannot be before start date")
      return
    }

    const eventTitle = value.title.trim()

    // Process recurring pattern
    let recurringPattern = undefined
    if (value.isRecurring && value.recurringPattern) {
      recurringPattern = { ...value.recurringPattern }

      // Handle end conditions
      if (value.recurringEndType === "never") {
        recurringPattern.endDate = undefined
        recurringPattern.count = undefined
        // Mark as "never" ending for validation
        recurringPattern.endsNever = true
      } else if (value.recurringEndType === "after") {
        recurringPattern.endDate = undefined
        recurringPattern.endsNever = false
        // count is already set from the form
      } else if (value.recurringEndType === "on") {
        recurringPattern.count = undefined
        recurringPattern.endsNever = false
        // endDate is already set from the form
      }

      // Handle weekly events - ensure daysOfWeek is populated
      if (recurringPattern.type === 'weekly') {
        if (!recurringPattern.daysOfWeek || recurringPattern.daysOfWeek.length === 0) {
          // Default to the day of the week of the start date
          const startDayOfWeek = start.getDay()
          recurringPattern.daysOfWeek = [startDayOfWeek]
        }
      }

      // Handle monthly events - ensure dayOfMonth is populated
      if (recurringPattern.type === 'monthly') {
        if (!recurringPattern.dayOfMonth) {
          // Default to the day of the month of the start date
          recurringPattern.dayOfMonth = start.getDate()
        }
      }

      // Handle yearly events - ensure monthOfYear is populated
      if (recurringPattern.type === 'yearly') {
        if (!recurringPattern.monthOfYear) {
          // Default to the month of the start date (getMonth() returns 0-11, but we want 1-12)
          recurringPattern.monthOfYear = start.getMonth() + 1
        }
        if (!recurringPattern.dayOfMonth) {
          // Also set day of month for yearly events
          recurringPattern.dayOfMonth = start.getDate()
        }
      }
    }

    // Ensure dates are proper Date objects and use correct field names
    const eventData: CalendarEvent = {
      ...value,
      title: eventTitle,
      startDate: start,
      endDate: end,
      recurringPattern,
      recurringId: value.isRecurring && props.mode === "add" ? uuidv4() : value.recurringId,
    }

    // Convert timezone before submitting
    const submittedEvent = convertEventFromDisplayTimezone(eventData)
    emit("submitEvent", submittedEvent, props.mode)
    closePopup()
  },
  // Add Zod or Yup validation schema here if desired
})

watch(
  () => [props.isOpen, props.mode, props.eventData, props.targetDate, props.isAllDayFromCell],
  ([isOpenNew, modeNew, eventDataNew, targetDateNew, isAllDayNew]) => {
    if (isOpenNew) {
      clearError() // Clear any previous errors when opening modal
      confirmingDelete.value = false
      // The browser's zone can change between openings (travel, OS settings).
      userTimezone.value = detectUserTimezone()
      if (modeNew === "edit" && eventDataNew && typeof eventDataNew === "object" && "startDate" in eventDataNew) {
        // Determine the recurring end type for the UI
        let recurringEndType = "never"
        if (eventDataNew.recurringPattern?.count) {
          recurringEndType = "after"
        } else if (eventDataNew.recurringPattern?.endDate) {
          recurringEndType = "on"
        }

        const startDate = ensureValidDate(eventDataNew.startDate)
        const endDate = ensureValidDate(eventDataNew.endDate)

        // Update ref values
        startDateValue.value = startDate
        endDateValue.value = endDate
        recurringEndDateValue.value = eventDataNew.recurringPattern?.endDate
          ? ensureValidDate(eventDataNew.recurringPattern.endDate)
          : undefined
        timezoneSearchTerm.value = ""
        isAllDay.value = Boolean(eventDataNew.allDay)
        isRecurring.value = Boolean(eventDataNew.isRecurring)

        form.reset({
          ...eventDataNew,
          startDate,
          endDate,
          startTime: formatTimeForInput(eventDataNew.startDate),
          endTime: formatTimeForInput(eventDataNew.endDate),
          recurringEndType,
          recurringPattern: {
            type: "daily",
            interval: 1,
            daysOfWeek: [],
            count: undefined,
            endDate: undefined,
            ...eventDataNew.recurringPattern,
          },
        })
      } else {
        // 'add' mode or reset
        const defaults = defaultTimesFor(targetDateNew ? ensureValidDate(targetDateNew) : null)
        const targetDate = defaults.start
        const defaultEndDate = defaults.end

        // Update ref values
        startDateValue.value = targetDate
        endDateValue.value = defaultEndDate
        recurringEndDateValue.value = undefined
        timezoneSearchTerm.value = ""
        isAllDay.value = Boolean(isAllDayNew)
        isRecurring.value = false

        form.reset({
          id: "",
          title: "",
          description: "",
          startDate: targetDate,
          endDate: defaultEndDate,
          allDay: Boolean(isAllDayNew),
          color: "sky" as EventColor,
          location: "",
          status: "confirmed" as EventStatus,
          timezone: userTimezone.value,
          startTime: defaults.startTime,
          endTime: defaults.endTime,
          isRecurring: false,
          recurringPattern: {
            type: "daily",
            interval: 1,
            daysOfWeek: [],
            count: undefined,
            endDate: undefined,
          },
          recurringEndType: "never",
        })
      }
    }
  },
  { deep: true }
)

// Watch for changes to recurring pattern type and auto-populate fields
watch(
  () => form.getFieldValue('recurringPattern.type'),
  (newType, oldType) => {
    const startDate = form.getFieldValue('startDate')
    if (!startDate) return

    const date = ensureValidDate(startDate)

    if (newType === 'weekly' && oldType !== 'weekly') {
      const currentDaysOfWeek = form.getFieldValue('recurringPattern.daysOfWeek') || []
      if (currentDaysOfWeek.length === 0) {
        // Auto-select the day of the week of the start date
        const dayOfWeek = date.getDay()
        form.setFieldValue('recurringPattern.daysOfWeek', [dayOfWeek])
      }
    } else if (newType === 'monthly' && oldType !== 'monthly') {
      const currentDayOfMonth = form.getFieldValue('recurringPattern.dayOfMonth')
      if (!currentDayOfMonth) {
        // Auto-set the day of the month of the start date
        form.setFieldValue('recurringPattern.dayOfMonth', date.getDate())
      }
    } else if (newType === 'yearly' && oldType !== 'yearly') {
      const currentMonthOfYear = form.getFieldValue('recurringPattern.monthOfYear')
      const currentDayOfMonth = form.getFieldValue('recurringPattern.dayOfMonth')
      
      if (!currentMonthOfYear) {
        // Auto-set the month of the start date (getMonth() returns 0-11, but we want 1-12)
        form.setFieldValue('recurringPattern.monthOfYear', date.getMonth() + 1)
      }
      if (!currentDayOfMonth) {
        // Auto-set the day of the month of the start date
        form.setFieldValue('recurringPattern.dayOfMonth', date.getDate())
      }
    }
  }
)

const closePopup = () => {
  emit("update:isOpen", false)
}

const handleDelete = () => {
  // First press asks for confirmation; the second deletes.
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  if (props.mode === "edit" && props.eventData?.id) {
    emit("deleteEvent", props.eventData.id)
    closePopup()
  }
}

// Short enough for a phone's half-width column; the year only when it isn't this year.
const dateLabel = (value: unknown) => {
  if (!value) return "Pick a date"
  const date = ensureValidDate(value)
  return format(date, date.getFullYear() === new Date().getFullYear() ? "EEE, MMM d" : "MMM d, yyyy")
}
const fieldClass = "grid min-w-0 gap-1.5"
// Standard Schema validators report issue objects; show their messages.
const fieldErrors = (errors: unknown[]) =>
  errors
    .flatMap(e => (Array.isArray(e) ? e : [e]))
    .map(e => (typeof e === "string" ? e : (e as { message?: string })?.message))
    .filter(Boolean)
    .join(", ")
</script>

<template>
  <Dialog :open="isOpen" @update:open="closePopup">
    <!-- The dialog scrolls its own body between a fixed header and footer, so it
         fits the screen with any DialogContent (the app's or shadcn's stock one). -->
    <DialogContent class="flex max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-4rem)] sm:max-w-xl sm:p-0">
      <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="form.handleSubmit">
        <DialogHeader class="shrink-0 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogTitle>{{ mode === "add" ? "New event" : "Edit event" }}</DialogTitle>
          <DialogDescription>
            {{ mode === "add" ? "Add an event to your calendar." : "Change the details of this event." }}
          </DialogDescription>
        </DialogHeader>

        <div class="grid min-h-0 min-w-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
          <p v-if="error" role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ error }}
          </p>

          <form.Field name="title" :validators="{ onBlur: titleSchema, onSubmit: titleSchema }">
            <template #default="{ field }">
              <div :class="fieldClass">
                <Label :for="field.name">Title <span class="text-destructive" aria-hidden="true">*</span></Label>
                <Input
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  placeholder="What's happening?"
                  autocomplete="off"
                  @blur="field.handleBlur"
                  @update:model-value="(v) => field.handleChange(String(v))"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-destructive">
                  {{ fieldErrors(field.state.meta.errors) }}
                </p>
              </div>
            </template>
          </form.Field>

          <!-- When: date + time pairs. Grid tracks with minmax(0, …) can never
               push the dialog wider than the screen. -->
          <fieldset class="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
            <legend class="sr-only">When</legend>
            <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)] gap-3" :class="isAllDay && 'grid-cols-1'">
              <form.Field name="startDate">
                <template #default="{ field }">
                  <div :class="fieldClass">
                    <Label for="start-date">Starts</Label>
                    <Popover :open="startDateOpen" @update:open="val => (startDateOpen = val)">
                      <PopoverTrigger as-child>
                        <Button id="start-date" type="button" variant="outline" class="w-full min-w-0 justify-between px-3 font-normal">
                          <span class="truncate">{{ dateLabel(form.getFieldValue("startDate")) }}</span>
                          <CalendarIcon :size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent class="w-auto p-2" align="start">
                        <Calendar
                          mode="single"
                          @update:model-value="
                            date => {
                              if (date) {
                                const newDate = toDate(date)
                                startDateValue = newDate
                                field.handleChange(newDate)
                                // Keep the end on or after the start.
                                if (isBefore(endDateValue ?? new Date(), newDate)) {
                                  endDateValue = newDate
                                  form.setFieldValue('endDate', newDate)
                                }
                                startDateOpen = false
                              }
                            }
                          "
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </template>
              </form.Field>

              <form.Field v-if="!isAllDay" name="startTime">
                <template #default="{ field }">
                  <div :class="fieldClass">
                    <Label :for="field.name">Time</Label>
                    <Select :name="field.name" :model-value="field.state.value" @update:model-value="(v: unknown) => field.handleChange(v as never)">
                      <SelectTrigger :id="field.name" class="w-full min-w-0" aria-label="Start time">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent class="max-h-72">
                        <SelectItem v-for="option in timeOptions" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </template>
              </form.Field>
            </div>

            <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)] gap-3" :class="isAllDay && 'grid-cols-1'">
              <form.Field name="endDate">
                <template #default="{ field }">
                  <div :class="fieldClass">
                    <Label for="end-date">Ends</Label>
                    <Popover :open="endDateOpen" @update:open="val => (endDateOpen = val)">
                      <PopoverTrigger as-child>
                        <Button id="end-date" type="button" variant="outline" class="w-full min-w-0 justify-between px-3 font-normal">
                          <span class="truncate">{{ dateLabel(form.getFieldValue("endDate")) }}</span>
                          <CalendarIcon :size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent class="w-auto p-2" align="start">
                        <Calendar
                          mode="single"
                          :min-value="convertToDateValue(startDateValue ?? new Date(), getLocalTimeZone())"
                          @update:model-value="
                            date => {
                              if (date) {
                                const newDate = toDate(date)
                                endDateValue = newDate
                                field.handleChange(newDate)
                                endDateOpen = false
                              }
                            }
                          "
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </template>
              </form.Field>

              <form.Field v-if="!isAllDay" name="endTime">
                <template #default="{ field }">
                  <div :class="fieldClass">
                    <Label :for="field.name">Time</Label>
                    <Select :name="field.name" :model-value="field.state.value" @update:model-value="(v: unknown) => field.handleChange(v as never)">
                      <SelectTrigger :id="field.name" class="w-full min-w-0" aria-label="End time">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent class="max-h-72">
                        <SelectItem v-for="option in timeOptions" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </template>
              </form.Field>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <form.Field name="allDay">
                <template #default="{ field }">
                  <div class="flex min-h-11 items-center gap-2">
                    <Checkbox
                      :id="field.name"
                      :name="field.name"
                      :model-value="field.state.value"
                      @blur="field.handleBlur"
                      @update:model-value="
                        val => {
                          isAllDay = val === true
                          field.handleChange(val === true)
                        }
                      "
                    />
                    <Label :for="field.name" class="font-normal">All day</Label>
                  </div>
                </template>
              </form.Field>

              <form.Field name="timezone">
                <template #default="{ field }">
                  <Popover :open="isTZOpen" @update:open="val => (isTZOpen = val)">
                    <PopoverTrigger as-child>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="min-w-0 max-w-full gap-1.5 px-2 font-normal text-muted-foreground"
                        :aria-label="`Timezone: ${getTZDisplayName(String(field.state.value ?? ''))}`"
                      >
                        <Globe :size="14" aria-hidden="true" />
                        <span class="truncate">{{ getTZDisplayName(String(field.state.value ?? "")) }}</span>
                        <ChevronsUpDown class="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-[min(22rem,calc(100vw-2rem))] p-0" side="bottom" align="end">
                      <Command>
                        <CommandInput placeholder="Search timezones…" />
                        <CommandList class="max-h-64">
                          <CommandEmpty>No timezone found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              v-for="tz in commonTimezones"
                              :key="tz.timezone"
                              :value="`${tz.label} ${tz.timezone} ${tz.offset}`"
                              class="flex cursor-pointer items-center justify-between gap-2"
                              @select="
                                () => {
                                  field.handleChange(tz.timezone)
                                  isTZOpen = false
                                }
                              "
                            >
                              <span class="truncate">{{ tz.label }}</span>
                              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ tz.offset }}</span>
                              <Check
                                :class="cn('size-4 shrink-0', tz.timezone === form.getFieldValue('timezone') ? 'opacity-100' : 'opacity-0')"
                              />
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </template>
              </form.Field>
            </div>
          </fieldset>

          <form.Field name="location" :validators="{ onChange: locationSchema }">
            <template #default="{ field }">
              <div :class="fieldClass">
                <Label :for="field.name">Location</Label>
                <div class="relative min-w-0">
                  <MapPin :size="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    :id="field.name"
                    :name="field.name"
                    :model-value="field.state.value"
                    placeholder="Add a place or link"
                    class="pl-9"
                    @blur="field.handleBlur"
                    @update:model-value="(v) => field.handleChange(String(v))"
                  />
                </div>
                <p v-if="!field.state.meta.isValid" class="text-xs text-destructive">
                  {{ fieldErrors(field.state.meta.errors) }}
                </p>
              </div>
            </template>
          </form.Field>

          <form.Field name="description" :validators="{ onChange: descriptionSchema }">
            <template #default="{ field }">
              <div :class="fieldClass">
                <Label :for="field.name">Notes</Label>
                <Textarea
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  placeholder="Agenda, links, anything useful"
                  @blur="field.handleBlur"
                  @update:model-value="(v) => field.handleChange(String(v))"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-destructive">
                  {{ fieldErrors(field.state.meta.errors) }}
                </p>
              </div>
            </template>
          </form.Field>

          <div class="grid min-w-0 gap-4 sm:grid-cols-2">
            <form.Field name="color">
              <template #default="{ field }">
                <fieldset class="grid min-w-0 gap-1.5">
                  <legend class="mb-1.5 text-sm font-medium">Colour</legend>
                  <RadioGroup
                    :id="field.name"
                    class="flex flex-wrap gap-0.5"
                    :name="field.name"
                    :model-value="field.state.value"
                    @blur="field.handleBlur"
                    @update:model-value="(v: unknown) => field.handleChange(v as never)"
                  >
                    <!-- Each swatch sits in a full-size touch target. -->
                    <label
                      v-for="colorOption in colorOptions"
                      :key="colorOption.value"
                      :for="`color-${colorOption.value}`"
                      class="grid size-9 cursor-pointer place-items-center rounded-full"
                    >
                      <RadioGroupItem
                        :id="`color-${colorOption.value}`"
                        :value="colorOption.value"
                        :aria-label="colorOption.label"
                        :class="cn('size-6 shadow-none', colorOption.bgClass, colorOption.borderClass)"
                      />
                    </label>
                  </RadioGroup>
                </fieldset>
              </template>
            </form.Field>

            <form.Field name="status">
              <template #default="{ field }">
                <div :class="fieldClass">
                  <Label :for="field.name">Status</Label>
                  <Select :name="field.name" :model-value="field.state.value" @update:model-value="(v: unknown) => field.handleChange(v as never)">
                    <SelectTrigger :id="field.name" class="w-full min-w-0">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="tentative">Tentative</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </template>
            </form.Field>
          </div>

          <!-- Recurring Event Fields (feature-flagged) -->
          <form.Field v-if="recurringEnabled" name="isRecurring">
            <template #default="{ field }">
              <div class="flex min-h-11 items-center gap-2">
                <Checkbox
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  @blur="field.handleBlur"
                  @update:model-value="
                    val => {
                      isRecurring = val === true
                      field.handleChange(val === true)
                    }
                  "
                />
                <Label :for="field.name" class="flex items-center gap-2 font-normal">
                  <Repeat :size="14" class="text-muted-foreground" aria-hidden="true" />
                  Repeats
                </Label>
              </div>
            </template>
          </form.Field>

          <!-- Recurring Pattern Fields (shown only when enabled and isRecurring is true) -->
          <fieldset v-if="recurringEnabled && isRecurring" class="grid min-w-0 gap-4 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
            <legend class="sr-only">Recurrence</legend>

            <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <form.Field name="recurringPattern.type">
                <template #default="{ field }">
                  <div :class="fieldClass">
                    <Label :for="field.name">Repeat</Label>
                    <Select :name="field.name" :model-value="field.state.value" @update:model-value="(v: unknown) => field.handleChange(v as never)">
                      <SelectTrigger :id="field.name" class="w-full min-w-0">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </template>
              </form.Field>

              <form.Field name="recurringPattern.interval">
                <template #default="{ field }">
                  <div :class="fieldClass">
                    <Label :for="field.name">Every</Label>
                    <div class="flex min-w-0 items-center gap-2">
                      <Input
                        :id="field.name"
                        :name="field.name"
                        type="number"
                        min="1"
                        max="365"
                        inputmode="numeric"
                        class="w-16 shrink-0 px-2 text-center"
                        :model-value="field.state.value"
                        @blur="field.handleBlur"
                        @update:model-value="(v) => field.handleChange(Number(v))"
                      />
                      <span class="truncate text-sm text-muted-foreground">
                        {{ ({ daily: "day", weekly: "week", monthly: "month", yearly: "year" } as Record<string, string>)[form.getFieldValue("recurringPattern.type") ?? "daily"] ?? "day"
                        }}{{ (form.getFieldValue("recurringPattern.interval") ?? 1) > 1 ? "s" : "" }}
                      </span>
                    </div>
                  </div>
                </template>
              </form.Field>
            </div>

            <!-- Weekly days selection -->
            <form.Field v-if="form.getFieldValue('recurringPattern.type') === 'weekly'" name="recurringPattern.daysOfWeek">
              <template #default="{ field }">
                <div :class="fieldClass">
                  <Label>On</Label>
                  <ToggleGroup
                    :model-value="field.state.value"
                    type="multiple"
                    variant="outline"
                    size="sm"
                    class="grid w-full grid-cols-7"
                    @update:model-value="(v: unknown) => field.handleChange(v as never)"
                  >
                    <ToggleGroupItem
                      v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                      :key="index"
                      :value="index"
                      :aria-label="['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]"
                      class="h-9 min-w-0 cursor-pointer px-0"
                    >
                      {{ day }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </template>
            </form.Field>

            <!-- End condition -->
            <div class="grid min-w-0 gap-2">
              <Label>Ends</Label>
              <RadioGroup
                :model-value="recurringEndType"
                class="grid gap-2"
                @update:model-value="
                  value => {
                    recurringEndType = String(value)
                    form.setFieldValue('recurringEndType', String(value))
                  }
                "
              >
                <div class="flex min-h-9 items-center gap-2">
                  <RadioGroupItem id="end-never" value="never" />
                  <Label for="end-never" class="font-normal">Never</Label>
                </div>
                <div class="flex min-h-9 flex-wrap items-center gap-2">
                  <RadioGroupItem id="end-after" value="after" />
                  <Label for="end-after" class="font-normal">After</Label>
                  <form.Field name="recurringPattern.count">
                    <template #default="{ field }">
                      <Input
                        :id="field.name"
                        :name="field.name"
                        type="number"
                        min="1"
                        max="999"
                        inputmode="numeric"
                        :model-value="field.state.value"
                        :disabled="recurringEndType !== 'after'"
                        placeholder="10"
                        class="w-20 px-2 text-center"
                        aria-label="Number of occurrences"
                        @blur="field.handleBlur"
                        @update:model-value="(v) => field.handleChange(Number(v))"
                      />
                    </template>
                  </form.Field>
                  <span class="text-sm text-muted-foreground">times</span>
                </div>
                <div class="flex min-h-9 flex-wrap items-center gap-2">
                  <RadioGroupItem id="end-on" value="on" />
                  <Label for="end-on" class="font-normal">On</Label>
                  <form.Field name="recurringPattern.endDate">
                    <template #default="{ field }">
                      <Popover>
                        <PopoverTrigger as-child>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            :disabled="recurringEndType !== 'on'"
                            class="justify-start font-normal"
                          >
                            <CalendarIcon :size="14" aria-hidden="true" />
                            {{ field.state.value ? format(field.state.value, "MMM d, yyyy") : "Pick a date" }}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent class="w-auto p-2">
                          <Calendar
                            mode="single"
                            :min-value="today(getLocalTimeZone())"
                            @update:model-value="
                              date => {
                                if (date) {
                                  const newDate = toDate(date)
                                  recurringEndDateValue = newDate
                                  field.handleChange(newDate)
                                }
                              }
                            "
                          />
                        </PopoverContent>
                      </Popover>
                    </template>
                  </form.Field>
                </div>
              </RadioGroup>
            </div>
          </fieldset>
        </div>

        <!-- Actions stay reachable: pinned to the bottom of the sheet on phones. -->
        <!-- A plain container (not DialogFooter) so host dialog styles can't shift it. -->
        <div
          class="grid shrink-0 grid-cols-2 gap-2 border-t bg-popover px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-6 sm:pb-6"
        >
          <form.Subscribe>
            <template #default="{ canSubmit, isSubmitting }">
              <Button
                v-if="mode === 'edit'"
                type="button"
                :variant="confirmingDelete ? 'destructive' : 'ghost'"
                class="col-span-2 sm:col-span-1 sm:mr-auto"
                :class="!confirmingDelete && 'text-destructive'"
                :disabled="isSubmitting"
                @click="handleDelete"
              >
                {{ confirmingDelete ? "Confirm delete" : "Delete" }}
              </Button>
              <Button type="button" variant="outline" @click="closePopup">Cancel</Button>
              <Button type="submit" :disabled="!canSubmit || isSubmitting" :aria-busy="isSubmitting || undefined">
                {{ isSubmitting ? "Saving…" : mode === "add" ? "Add event" : "Save" }}
              </Button>
            </template>
          </form.Subscribe>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
