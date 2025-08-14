<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { CalendarEvent, EventColor } from './types'
import { useColorManager } from './composables/useColorManager'

interface ColorManagerProps {
  events: CalendarEvent[]
  onEventsUpdate?: (events: CalendarEvent[]) => void
}

const props = defineProps<ColorManagerProps>()
const emit = defineEmits<{
  (e: 'eventsUpdate', events: CalendarEvent[]): void
}>()

const eventsRef = computed(() => props.events)
const {
  colorConfig,
  getColorStats,
  rebalanceColors,
  resolveColorConflicts,
  updateConfig,
  getColorClasses,
  availableColors,
  usedColors
} = useColorManager(eventsRef)

const stats = computed(() => getColorStats())

const handleRebalance = () => {
  const rebalanced = rebalanceColors()
  emit('eventsUpdate', rebalanced)
}

const handleResolveConflicts = () => {
  const resolved = resolveColorConflicts()
  emit('eventsUpdate', resolved)
}

const toggleAllowDuplicates = (checked: boolean) => {
  updateConfig({ allowDuplicates: checked })
}

const toggleAutoAssign = (checked: boolean) => {
  updateConfig({ autoAssign: checked })
}

const colorPalette: EventColor[] = ['sky', 'emerald', 'violet', 'rose', 'amber', 'orange']
</script>

<template>
  <Card class="w-full max-w-2xl">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Icon name="lucide:palette" size="20" />
        Color Management
      </CardTitle>
      <CardDescription>
        Manage automatic color assignment for calendar events
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Configuration Options -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium">Configuration</h3>
        
        <div class="flex items-center space-x-2">
          <Checkbox
            id="auto-assign"
            :checked="colorConfig.autoAssign"
            @update:checked="toggleAutoAssign"
          />
          <Label for="auto-assign" class="text-sm">
            Automatically assign colors to new events
          </Label>
        </div>
        
        <div class="flex items-center space-x-2">
          <Checkbox
            id="allow-duplicates"
            :checked="colorConfig.allowDuplicates"
            @update:checked="toggleAllowDuplicates"
          />
          <Label for="allow-duplicates" class="text-sm">
            Allow duplicate colors
          </Label>
        </div>
      </div>

      <Separator />

      <!-- Color Palette -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium">Color Palette</h3>
        <div class="flex gap-2">
          <div
            v-for="color in colorPalette"
            :key="color"
            :class="[
              'w-8 h-8 rounded-full border-2 flex items-center justify-center',
              getColorClasses(color).bg,
              getColorClasses(color).border,
              usedColors.has(color) ? 'ring-2 ring-offset-2 ring-primary' : ''
            ]"
            :title="`${color} ${usedColors.has(color) ? '(in use)' : '(available)'}`"
          >
            <Icon
              v-if="usedColors.has(color)"
              name="lucide:check"
              size="14"
              :class="getColorClasses(color).text"
            />
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ availableColors.length }} of {{ colorPalette.length }} colors available
        </p>
      </div>

      <Separator />

      <!-- Statistics -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium">Statistics</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Total Events:</span>
            <span class="ml-2 font-medium">{{ stats.totalEvents }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Colored Events:</span>
            <span class="ml-2 font-medium">{{ stats.coloredEvents }}</span>
          </div>
        </div>
        
        <!-- Color Distribution -->
        <div v-if="Object.keys(stats.colorDistribution).length > 0" class="space-y-2">
          <h4 class="text-xs font-medium text-muted-foreground">Color Distribution</h4>
          <div class="space-y-1">
            <div
              v-for="[color, count] in Object.entries(stats.colorDistribution)"
              :key="color"
              class="flex items-center justify-between text-xs"
            >
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-3 h-3 rounded-full border',
                    getColorClasses(color as EventColor).bg,
                    getColorClasses(color as EventColor).border
                  ]"
                />
                <span class="capitalize">{{ color }}</span>
              </div>
              <span class="font-medium">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <!-- Actions -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium">Actions</h3>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="handleRebalance"
            :disabled="stats.totalEvents === 0"
          >
            <Icon name="lucide:shuffle" size="14" class="mr-1" />
            Rebalance Colors
          </Button>
          <Button
            variant="outline"
            size="sm"
            @click="handleResolveConflicts"
            :disabled="stats.totalEvents === 0 || colorConfig.allowDuplicates"
          >
            <Icon name="lucide:zap" size="14" class="mr-1" />
            Resolve Conflicts
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          Rebalance redistributes colors evenly. Resolve conflicts ensures no duplicate colors.
        </p>
      </div>
    </CardContent>
  </Card>
</template>