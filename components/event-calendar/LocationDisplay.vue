<script setup lang="ts">
import { computed } from "vue"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface LocationDisplayProps {
  location?: string
  showIcon?: boolean
  showTooltip?: boolean
  compact?: boolean
  iconSize?: number
}

const props = withDefaults(defineProps<LocationDisplayProps>(), {
  showIcon: true,
  showTooltip: true,
  compact: false,
  iconSize: 12,
})

const hasLocation = computed(() => Boolean(props.location?.trim()))

const displayText = computed(() => {
  if (!props.location) return ""
  
  if (props.compact && props.location.length > 20) {
    return props.location.substring(0, 17) + "..."
  }
  
  return props.location
})

const iconClasses = computed(() => [
  "shrink-0 text-current opacity-70",
  props.compact ? "mr-1" : "mr-1.5"
])
</script>

<template>
  <div v-if="hasLocation" class="flex items-center">
    <Popover v-if="showTooltip && location">
      <PopoverTrigger as-child>
        <div class="flex items-center cursor-help">
          <Icon
            v-if="showIcon"
            name="lucide:map-pin"
            :size="iconSize"
            :class="iconClasses"
            aria-hidden="true"
          />
          <span
            v-if="!compact || !showIcon"
            class="truncate text-current opacity-80"
            :class="{ 'text-xs': compact }"
          >
            {{ displayText }}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent class="w-auto max-w-xs p-2" side="top" align="start">
        <div class="flex items-start gap-2">
          <Icon
            name="lucide:map-pin"
            size="14"
            class="shrink-0 text-muted-foreground mt-0.5"
            aria-hidden="true"
          />
          <div class="text-sm">
            <div class="font-medium">Location</div>
            <div class="text-muted-foreground">{{ location }}</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <!-- Non-tooltip version -->
    <div v-else class="flex items-center">
      <Icon
        v-if="showIcon"
        name="lucide:map-pin"
        :size="iconSize"
        :class="iconClasses"
        aria-hidden="true"
      />
      <span
        v-if="!compact || !showIcon"
        class="truncate text-current opacity-80"
        :class="{ 'text-xs': compact }"
        :title="location"
      >
        {{ displayText }}
      </span>
    </div>
  </div>
</template>