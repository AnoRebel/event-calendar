<script setup lang="ts">
import { computed } from "vue"
import { format } from "date-fns"
import type { CalendarEvent } from "./types"
import { PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

const props = defineProps<{
  events: CalendarEvent[]
  date: Date | null
  // For positioning, you might need to pass target element ref or coordinates
  // For simplicity, using Shadcn Popover which handles positioning well.
}>()

const emit = defineEmits<{
  (e: "editEvent", event: CalendarEvent): void
  (e: "close"): void
}>()

const formattedDate = computed(() => {
  return props.date ? format(props.date, "MMMM d, yyyy") : ""
})
</script>

<template>
  <PopoverContent class="w-auto p-0" side="bottom" align="start">
    <Command v-if="date">
      <CommandInput placeholder="Filter events..." />
      <CommandList>
        <CommandEmpty>No events found.</CommandEmpty>
        <CommandGroup :heading="formattedDate">
          <CommandItem
            v-for="event in events"
            :key="event.id"
            :value="event.title"
            class="cursor-pointer flex justify-between items-center"
            @select="emit('editEvent', event)"
          >
            <div class="flex items-center">
              <span :class="['w-2 h-2 rounded-full mr-2 shrink-0', `bg-${event.color}-500`]" />
              <span class="truncate">{{ event.title }}</span>
            </div>
            <span class="text-xs text-muted-foreground ml-2">
              {{ event.allDay ? "All day" : format(new Date(event.startDate), "p") }}
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</template>
