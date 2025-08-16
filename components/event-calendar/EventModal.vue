<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { onKeyStroke } from "@vueuse/core"
import { useForm } from "@tanstack/vue-form"
import { toDate } from "reka-ui/date"
import { fromDate, CalendarDate, type DateValue, today, getLocalTimeZone } from "@internationalized/date"
import { format, addHours, isBefore } from "date-fns"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { DefaultEndHour, DefaultStartHour, EndHour, StartHour } from "./constants"
import { useTimezone } from "./composables/useTimezone"

const props = defineProps<{
  isOpen: boolean
  mode: "add" | "edit"
  eventData?: CalendarEvent | null // For pre-filling in edit mode
  targetDate?: Date | null // For pre-filling start date in add mode
  isAllDayFromCell?: boolean // For pre-filling allDay status from cell click
}>()

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void
  (e: "submitEvent", eventPayload: CalendarEvent, mode: "add" | "edit"): void
  (e: "deleteEvent", eventId: string): void
}>()

// Handle ESC key to close modal
// Initialize timezone support
const { userTimezone, commonTimezones, convertEventFromDisplayTimezone } = useTimezone()

onKeyStroke("Escape", e => {
  if (props.isOpen) {
    e.preventDefault()
    emit("update:isOpen", false)
  }
})

const startDateOpen = ref(false)
const endDateOpen = ref(false)
const isAllDay = ref(props.isAllDayFromCell || false)
const isRecurring = ref(false)
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
    return zonedDateTime.toCalendarDate()
  } catch (error) {
    // Fallback: Manual construction
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }
}

// Memoize time options so they're only calculated once
const timeOptions = computed(() => {
  const options = []
  for (let hour = StartHour; hour <= EndHour; hour++) {
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

// Filter timezones based on search term
const filteredTimezones = computed(() => {
  if (!timezoneSearchTerm.value) {
    return commonTimezones.value
  }
  const searchLower = timezoneSearchTerm.value.toLowerCase()
  return commonTimezones.value.filter(
    tz =>
      tz.label.toLowerCase().includes(searchLower) ||
      tz.timezone.toLowerCase().includes(searchLower) ||
      tz.offset.toLowerCase().includes(searchLower)
  )
})

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
    startTime: `${DefaultStartHour}:00`,
    endTime: `${DefaultEndHour}:00`,
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

    // Use generic title if empty
    const eventTitle = value.title.trim() ? value.title : "(no title)"

    // Process recurring pattern
    let recurringPattern = undefined
    if (value.isRecurring && value.recurringPattern) {
      recurringPattern = { ...value.recurringPattern }

      // Handle end conditions
      if (value.recurringEndType === "never") {
        recurringPattern.endDate = undefined
        recurringPattern.count = undefined
      } else if (value.recurringEndType === "after") {
        recurringPattern.endDate = undefined
        // count is already set from the form
      } else if (value.recurringEndType === "on") {
        recurringPattern.count = undefined
        // endDate is already set from the form
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
        const targetDate = ensureValidDate(targetDateNew)
        const defaultEndDate = ensureValidDate(addHours(targetDate, 1))

        // Update ref values
        startDateValue.value = targetDate
        endDateValue.value = defaultEndDate
        recurringEndDateValue.value = undefined
        timezoneSearchTerm.value = ""

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
          startTime: `${DefaultStartHour}:00`,
          endTime: `${DefaultEndHour}:00`,
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

const closePopup = () => {
  emit("update:isOpen", false)
}

const handleDelete = () => {
  if (props.mode === "edit" && props.eventData?.id) {
    emit("deleteEvent", props.eventData.id)
    closePopup()
  }
}

// Helper for datetime-local input formatting
const formatDateTimeLocal = (date: Date | string | undefined) => {
  if (!date) return ""
  return format(new Date(date), `yyyy-MM-dd'T'HH:mm`)
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="closePopup">
    <DialogContent class="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ mode === "add" ? "Create Event" : "Edit Event" }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ mode === "add" ? "Add a new event to your calendar" : "Edit the details of this event" }}
        </DialogDescription>
      </DialogHeader>
      <div v-if="error" class="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm">
        {{ error }}
      </div>
      <form @submit.prevent="form.handleSubmit">
        <div class="grid gap-4 py-4">
          <form.Field name="title">
            <template #default="{ field }">
              <div class="*:not-first:mt-1.5">
                <Label :for="field.name">Title <span class="text-destructive">*</span></Label>
                <Input
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  placeholder="Event title"
                  @blur="field.handleBlur"
                  @update:model-value="field.handleChange"
                />
                <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </div>
            </template>
          </form.Field>

          <form.Field name="description">
            <template #default="{ field }">
              <div class="*:not-first:mt-1.5">
                <Label :for="field.name">Description</Label>
                <Textarea
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  placeholder="Event description"
                  @blur="field.handleBlur"
                  @update:model-value="field.handleChange"
                />
              </div>
            </template>
          </form.Field>

          <div class="flex gap-4">
            <form.Field name="startDate">
              <template #default="{ field }">
                <div class="flex-1 *:not-first:mt-1.5">
                  <Label :for="field.name">Start Date</Label>
                  <Popover :open="startDateOpen" @update:open="val => (startDateOpen = val)">
                    <PopoverTrigger as-child>
                      <Button
                        id="start-date"
                        variant="outline"
                        :class="
                          cn(
                            'group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]',
                            !form.getFieldValue('startDate') && 'text-muted-foreground'
                          )
                        "
                      >
                        <span :class="cn('truncate', !form.getFieldValue('startDate') && 'text-muted-foreground')">
                          {{
                            form.getFieldValue("startDate")
                              ? format(form.getFieldValue("startDate"), "PPP")
                              : "Pick a date"
                          }}
                        </span>
                        <Icon
                          name="lucide:calendar"
                          size="16"
                          class="text-muted-foreground/80 shrink-0"
                          aria-hidden="true"
                        />
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
                              // If end date is before the new start date, update it to match the start date
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
                  <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                    {{ field.state.meta.errors.join(", ") }}
                  </p>
                </div>
              </template>
            </form.Field>

            <form.Field v-if="!isAllDay" name="startTime">
              <template #default="{ field }">
                <div class="min-w-28 *:not-first:mt-1.5">
                  <Label :for="field.name">Start Time</Label>
                  <Select :name="field.name" :model-value="field.state.value" @update:model-value="field.handleChange">
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="option in timeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                    {{ field.state.meta.errors.join(", ") }}
                  </p>
                </div>
              </template>
            </form.Field>
          </div>

          <div class="flex gap-4">
            <form.Field name="endDate">
              <template #default="{ field }">
                <div class="flex-1 *:not-first:mt-1.5">
                  <Label :for="field.name">End Date</Label>
                  <Popover :open="endDateOpen" @update:open="val => (endDateOpen = val)">
                    <PopoverTrigger as-child>
                      <Button
                        id="end-date"
                        variant="outline"
                        :class="
                          cn(
                            'group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]',
                            !form.getFieldValue('endDate') && 'text-muted-foreground'
                          )
                        "
                      >
                        <span :class="cn('truncate', !form.getFieldValue('endDate') && 'text-muted-foreground')">
                          {{
                            form.getFieldValue("endDate") ? format(form.getFieldValue("endDate"), "PPP") : "Pick a date"
                          }}
                        </span>
                        <Icon
                          name="lucide:calendar"
                          size="16"
                          class="text-muted-foreground/80 shrink-0"
                          aria-hidden="true"
                        />
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
                  <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                    {{ field.state.meta.errors.join(", ") }}
                  </p>
                </div>
              </template>
            </form.Field>

            <form.Field v-if="!isAllDay" name="endTime">
              <template #default="{ field }">
                <div class="min-w-28 *:not-first:mt-1.5">
                  <Label :for="field.name">End Time</Label>
                  <Select :name="field.name" :model-value="field.state.value" @update:model-value="field.handleChange">
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="option in timeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                    {{ field.state.meta.errors.join(", ") }}
                  </p>
                </div>
              </template>
            </form.Field>
          </div>

          <form.Field name="allDay">
            <template #default="{ field }">
              <div class="flex items-center gap-2">
                <Checkbox
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  @blur="field.handleBlur"
                  @update:model-value="
                    val => {
                      isAllDay = val
                      field.handleChange(val)
                    }
                  "
                />
                <Label :for="field.name" class="font-normal">All Day Event</Label>
              </div>
            </template>
          </form.Field>

          <form.Field name="location">
            <template #default="{ field }">
              <div class="*:not-first:mt-1.5">
                <Label :for="field.name" class="flex items-center gap-2">
                  <Icon name="lucide:map-pin" size="14" class="text-muted-foreground" />
                  Location
                </Label>
                <div class="relative">
                  <Input
                    :id="field.name"
                    :name="field.name"
                    :model-value="field.state.value"
                    placeholder="Add event location"
                    class="pl-9"
                    @blur="field.handleBlur"
                    @update:model-value="field.handleChange"
                  />
                  <Icon
                    name="lucide:map-pin"
                    size="16"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                  />
                </div>
                <!-- Location preview -->
                <div
                  v-if="field.state.value?.trim()"
                  class="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md p-2"
                >
                  <Icon name="lucide:map-pin" size="14" class="shrink-0" />
                  <span class="truncate">{{ field.state.value }}</span>
                </div>
                <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </div>
            </template>
          </form.Field>

          <form.Field name="color">
            <template #default="{ field }">
              <fieldset class="space-y-4">
                <legend class="text-foreground text-sm leading-none font-medium">Color</legend>
                <RadioGroup
                  :id="field.name"
                  class="flex gap-1.5"
                  :name="field.name"
                  :default-value="colorOptions[0]?.value"
                  :model-value="field.state.value"
                  @blur="field.handleBlur"
                  @update:model-value="field.handleChange"
                >
                  <RadioGroupItem
                    v-for="colorOption in colorOptions"
                    :id="`color-${colorOption.value}`"
                    :key="colorOption.value"
                    :value="colorOption.value"
                    :aria-label="colorOption.label"
                    :class="cn('size-6 shadow-none', colorOption.bgClass, colorOption.borderClass)"
                  />
                </RadioGroup>
                <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </fieldset>
            </template>
          </form.Field>

          <form.Field name="status">
            <template #default="{ field }">
              <div class="*:not-first:mt-1.5">
                <Label :for="field.name">Status</Label>
                <Select :name="field.name" :model-value="field.state.value" @update:model-value="field.handleChange">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="tentative">Tentative</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </div>
            </template>
          </form.Field>

          <form.Field name="timezone">
            <template #default="{ field }">
              <div class="*:not-first:mt-1.5">
                <Label :for="field.name" class="flex items-center gap-2">
                  <Icon name="lucide:globe" size="14" class="text-muted-foreground" />
                  Timezone
                </Label>
                <Popover :open="isTZOpen">
                  <PopoverTrigger as-child>
                    <Button
                      @click.stop="isTZOpen = !isTZOpen"
                      variant="outline"
                      class="cursor-pointer justify-between w-full"
                    >
                      {{ getTZDisplayName(field.state.value) ?? "Select Timezone" }}

                      <Icon name="lucide:chevrons-up-down" class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" side="bottom" align="start">
                    <Command>
                      <CommandInput placeholder="Filter timezones..." />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            v-for="tz in commonTimezones"
                            :key="tz.timezone"
                            :value="tz.timezone"
                            class="cursor-pointer flex justify-between items-center"
                            @select="
                              () => {
                                field.handleChange(tz.timezone)
                                isTZOpen = false
                              }
                            "
                          >
                            {{ tz.label }} ({{ tz.offset }})
                            <Icon
                              name="lucide:check"
                              :class="
                                cn(
                                  'ml-auto h-4 w-4',
                                  tz.timezone === form.getFieldValue('timezone') ? 'opacity-100' : 'opacity-0'
                                )
                              "
                            />
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </div>
            </template>
          </form.Field>

          <!-- Recurring Event Fields -->
          <form.Field name="isRecurring">
            <template #default="{ field }">
              <div class="flex items-center gap-2">
                <Checkbox
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  @blur="field.handleBlur"
                  @update:model-value="
                    val => {
                      isRecurring = val
                      field.handleChange(val)
                    }
                  "
                />
                <Label :for="field.name" class="font-normal flex items-center gap-2">
                  <Icon name="lucide:repeat" size="14" class="text-muted-foreground" />
                  Recurring Event
                </Label>
              </div>
            </template>
          </form.Field>

          <!-- Recurring Pattern Fields (shown only when isRecurring is true) -->
          <div v-if="isRecurring" class="space-y-4 p-4 bg-muted/30 rounded-md">
            <h4 class="text-sm font-medium text-foreground">Recurrence Pattern</h4>

            <form.Field name="recurringPattern.type">
              <template #default="{ field }">
                <div class="*:not-first:mt-1.5">
                  <Label :for="field.name">Repeat</Label>
                  <Select :name="field.name" :model-value="field.state.value" @update:model-value="field.handleChange">
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
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

            <div class="flex gap-4">
              <form.Field name="recurringPattern.interval">
                <template #default="{ field }">
                  <div class="flex-1 *:not-first:mt-1.5">
                    <Label :for="field.name">Every</Label>
                    <Input
                      :id="field.name"
                      :name="field.name"
                      type="number"
                      min="1"
                      max="365"
                      :model-value="field.state.value"
                      placeholder="1"
                      @blur="field.handleBlur"
                      @update:model-value="field.handleChange"
                    />
                  </div>
                </template>
              </form.Field>

              <div class="flex-1 flex items-end">
                <span class="text-sm text-muted-foreground pb-2">
                  {{ form.getFieldValue("recurringPattern.type") || "day(s)"
                  }}{{ form.getFieldValue("recurringPattern.interval") > 1 ? "s" : "" }}
                </span>
              </div>
            </div>

            <!-- Weekly days selection -->
            <form.Field
              v-if="form.getFieldValue('recurringPattern.type') === 'weekly'"
              name="recurringPattern.daysOfWeek"
            >
              <template #default="{ field }">
                <div class="*:not-first:mt-1.5">
                  <Label :for="field.name">Days of the week</Label>
                  <ToggleGroup
                    :model-value="field.state.value"
                    @update:model-value="field.handleChange"
                    type="multiple"
                    variant="outline"
                    size="sm"
                  >
                    <ToggleGroupItem
                      v-for="(day, index) in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
                      :key="day"
                      :value="index"
                      :aria-label="`Toggle ${day}`"
                      class="w-12 h-8 p-0 cursor-pointer"
                    >
                      {{ day }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </template>
            </form.Field>

            <!-- End condition -->
            <div class="space-y-2">
              <Label class="text-sm font-medium">End recurrence</Label>
              <RadioGroup
                :model-value="recurringEndType"
                @update:model-value="
                  value => {
                    recurringEndType = value
                    form.setFieldValue('recurringEndType', value)
                  }
                "
                class="space-y-2"
              >
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="never" id="end-never" />
                  <Label for="end-never" class="font-normal">Never</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="after" id="end-after" />
                  <Label for="end-after" class="font-normal">After</Label>
                  <form.Field name="recurringPattern.count">
                    <template #default="{ field }">
                      <Input
                        :id="field.name"
                        :name="field.name"
                        type="number"
                        min="1"
                        max="999"
                        :model-value="field.state.value"
                        :disabled="recurringEndType !== 'after'"
                        placeholder="10"
                        class="w-20"
                        @blur="field.handleBlur"
                        @update:model-value="field.handleChange"
                      />
                    </template>
                  </form.Field>
                  <span class="text-sm text-muted-foreground">occurrences</span>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="on" id="end-on" />
                  <Label for="end-on" class="font-normal">On</Label>
                  <form.Field name="recurringPattern.endDate">
                    <template #default="{ field }">
                      <Popover>
                        <PopoverTrigger as-child>
                          <Button
                            variant="outline"
                            size="sm"
                            :disabled="recurringEndType !== 'on'"
                            class="w-32 justify-start text-left font-normal"
                          >
                            <Icon name="lucide:calendar" size="14" class="mr-2" />
                            {{ field.state.value ? format(field.state.value, "MMM dd, yyyy") : "Pick date" }}
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
          </div>
        </div>

        <DialogFooter>
          <form.Subscribe>
            <template #default="{ canSubmit, isSubmitting }">
              <Button type="button" variant="outline" @click="closePopup">Cancel</Button>
              <Button type="submit" :disabled="!canSubmit">
                {{ isSubmitting ? "Saving..." : mode === "add" ? "Add Event" : "Save Changes" }}
              </Button>
              <Button
                v-if="mode === 'edit'"
                type="button"
                variant="destructive"
                class="ml-auto"
                :disabled="!canSubmit"
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
</template>
