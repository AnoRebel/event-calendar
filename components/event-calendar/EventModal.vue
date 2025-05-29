<script setup lang="ts">
import { watch } from "vue"
import { useForm } from "@tanstack/vue-form"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CalendarEvent, EventColor } from "./types"
import { DefaultEndHour, DefaultStartHour, EndHour, StartHour } from "./constants"

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

const startDateOpen = ref(false)
const endDateOpen = ref(false)

const formatTimeForInput = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = Math.floor(date.getMinutes() / 15) * 15
  return `${hours}:${minutes.toString().padStart(2, "0")}`
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
    startDate: props.targetDate ? new Date(props.targetDate) : new Date(),
    endDate: props.targetDate ? addHours(new Date(props.targetDate), 1) : addHours(new Date(), 1),
    startTime: `${DefaultStartHour}:00`,
    endTime: `${DefaultEndHour}:00`,
    allDay: props.isAllDayFromCell || false,
    color: "sky",
    location: "",
  } as CalendarEvent,
  onSubmit: async ({ value }) => {
    const start = new Date(value.startDate)
    const end = new Date(value.endDate)

    if (!value.allDay) {
      const [startHours = 0, startMinutes = 0] = value.startTime.split(":").map(Number)
      const [endHours = 0, endMinutes = 0] = value.endTime.split(":").map(Number)

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
    // Ensure dates are proper Date objects
    const submittedEvent = {
      ...value,
      start: new Date(value.startDate),
      end: new Date(value.endDate),
    }
    /* {
      id: event?.id || "",
      title: eventTitle,
      description,
      start,
      end,
      allDay,
      location,
      color,
    } */
    emit("submitEvent", submittedEvent, props.mode)
    closePopup()
  },
  // Add Zod or Yup validation schema here if desired
})

watch(
  () => [props.isOpen, props.mode, props.eventData, props.targetDate, props.isAllDayFromCell],
  ([isOpenNew, modeNew, eventDataNew, targetDateNew, isAllDayNew]) => {
    if (isOpenNew) {
      if (modeNew === "edit" && eventDataNew) {
        form.reset({
          ...eventDataNew,
          startDate: new Date(eventDataNew.startDate), // Ensure Date objects
          endDate: new Date(eventDataNew.endDate),
          startTime: formatTimeForInput(eventDataNew.startDate),
          endTime: formatTimeForInput(eventDataNew.endDate),
        })
      } else {
        // 'add' mode or reset
        form.reset({
          id: "",
          title: "",
          description: "",
          startDate: targetDateNew ? new Date(targetDateNew) : new Date(),
          endDate: targetDateNew ? addHours(new Date(targetDateNew), 1) : addHours(new Date(), 1),
          allDay: isAllDayNew || false,
          color: "sky",
          location: "",
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
    <DialogContent class="sm:max-w-[425px]">
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
                        class="cn( 'group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]', !startDate && 'text-muted-foreground' )"
                      >
                        <span class="cn( 'truncate', !startDate && 'text-muted-foreground' )">
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
                        :model-value="field.state.value"
                        :date="form.getFieldValue('startDate')"
                        @update:model-value="
                          date => {
                            if (date) {
                              field.handleChange(date)
                              // If end date is before the new start date, update it to match the start date
                              if (isBefore(form.getFieldValue('endDate'), date)) {
                                form.setFieldValue('endDate', date)
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

            <form.Field v-if="!form.getFieldValue('allDay')" name="startTime">
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
                        class="cn( 'group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]', !endDate && 'text-muted-foreground' )"
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
                        :model-value="field.state.value"
                        :date="form.getFieldValue('endDate')"
                        :min-value="form.getFieldValue('startDate')"
                        @update:model-value="
                          date => {
                            if (date) {
                              field.handleChange(date)
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

            <form.Field v-if="!form.getFieldValue('allDay')" name="endTime">
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
                  @update:model-value="field.handleChange"
                />
                <Label :for="field.name" class="font-normal">All Day Event</Label>
              </div>
            </template>
          </form.Field>

          <form.Field name="location">
            <template #default="{ field }">
              <div class="*:not-first:mt-1.5">
                <Label :for="field.name">Location</Label>
                <Input
                  :id="field.name"
                  :name="field.name"
                  :model-value="field.state.value"
                  placeholder="Event location"
                  @blur="field.handleBlur"
                  @update:model-value="field.handleChange"
                />
                <p v-if="field.state.meta.isTouched && !field.state.meta.isValid" class="text-xs text-destructive">
                  {{ field.state.meta.errors.join(", ") }}
                </p>
              </div>
            </template>
          </form.Field>

          <form.Field name="color">
            <template #default="{ field }">
              <fieldset class="space-y-4">
                <legend class="text-foreground text-sm leading-none font-medium">Etiquette</legend>
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
