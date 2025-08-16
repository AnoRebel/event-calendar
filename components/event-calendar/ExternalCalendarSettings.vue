<script setup lang="ts">
import { ref } from 'vue'
import { useExternalCalendar, type ExternalCalendarConfig } from './composables/useExternalCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const props = defineProps<{
  config?: ExternalCalendarConfig
}>()

const emit = defineEmits<{
  (e: 'syncComplete', events: any[]): void
  (e: 'syncError', error: string): void
}>()

// Initialize external calendar integration
const config = props.config || {}
const { 
  providers, 
  syncStatus, 
  enabledProviders, 
  hasActiveSync, 
  syncStatusText,
  enableProvider,
  disconnectProvider,
  syncExternalCalendars
} = useExternalCalendar(config)

const isExpanded = ref(false)

const handleProviderToggle = async (providerId: string, enabled: boolean) => {
  try {
    if (enabled) {
      await enableProvider(providerId)
    } else {
      disconnectProvider(providerId)
    }
  } catch (error) {
    console.error('Provider toggle failed:', error)
    emit('syncError', `Failed to ${enabled ? 'connect to' : 'disconnect from'} ${providerId}`)
  }
}

const handleSync = async () => {
  if (enabledProviders.value.length === 0) {
    emit('syncError', 'No external calendars connected')
    return
  }

  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1) // 1 month ago
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0) // 2 months ahead
    
    const externalEvents = await syncExternalCalendars(
      { value: [] } as any, // This would be the actual local events
      { start: startDate, end: endDate }
    )
    
    emit('syncComplete', externalEvents)
  } catch (error) {
    console.error('Sync failed:', error)
    emit('syncError', `Sync failed: ${error}`)
  }
}
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="flex items-center gap-2">
            <Icon name="lucide:cloud" size="20" />
            External Calendars
          </CardTitle>
          <CardDescription>
            Connect and sync with external calendar services
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          @click="isExpanded = !isExpanded"
          class="p-2"
        >
          <Icon 
            name="lucide:chevron-down" 
            size="16" 
            :class="{ 'rotate-180': isExpanded }"
            class="transition-transform duration-200"
          />
        </Button>
      </div>
    </CardHeader>
    
    <CardContent v-if="isExpanded" class="space-y-4">
      <!-- Sync Status -->
      <div class="flex items-center justify-between p-3 bg-muted/30 rounded-md">
        <div class="flex items-center gap-2">
          <Icon 
            :name="hasActiveSync ? 'lucide:loader-2' : 'lucide:cloud'" 
            size="16" 
            :class="{ 'animate-spin': hasActiveSync }"
          />
          <span class="text-sm font-medium">{{ syncStatusText }}</span>
        </div>
        <Button
          size="sm"
          :disabled="hasActiveSync || enabledProviders.length === 0"
          @click="handleSync"
        >
          Sync Now
        </Button>
      </div>

      <!-- Sync Errors -->
      <Alert v-if="syncStatus.syncErrors && syncStatus.syncErrors.length > 0" variant="destructive">
        <Icon name="lucide:alert-circle" size="16" />
        <AlertDescription>
          <div class="space-y-1">
            <div v-for="error in syncStatus.syncErrors" :key="error" class="text-sm">
              {{ error }}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <!-- Provider List -->
      <div class="space-y-3">
        <h4 class="text-sm font-medium text-foreground">Available Providers</h4>
        
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="flex items-center justify-between p-3 border border-border rounded-md"
        >
          <div class="flex items-center gap-3">
            <Icon 
              :name="provider.icon" 
              size="20" 
              :style="{ color: provider.color }"
            />
            <div>
              <p class="text-sm font-medium">{{ provider.name }}</p>
              <div class="flex items-center gap-2">
                <Badge 
                  :variant="provider.isAuthenticated ? 'default' : 'secondary'"
                  class="text-xs"
                >
                  {{ provider.isAuthenticated ? 'Connected' : 'Not Connected' }}
                </Badge>
                <Badge 
                  v-if="provider.isEnabled"
                  variant="outline" 
                  class="text-xs"
                >
                  Syncing
                </Badge>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <Label :for="`${provider.id}-switch`" class="sr-only">
              Enable {{ provider.name }}
            </Label>
            <Switch
              :id="`${provider.id}-switch`"
              :checked="provider.isEnabled"
              :disabled="hasActiveSync"
              @update:checked="(checked) => handleProviderToggle(provider.id, checked)"
            />
          </div>
        </div>
      </div>

      <!-- Connected Providers Summary -->
      <div v-if="enabledProviders.length > 0" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <div class="flex items-center gap-2 text-green-800 dark:text-green-200">
          <Icon name="lucide:check-circle" size="16" />
          <p class="text-sm font-medium">
            {{ enabledProviders.length }} calendar{{ enabledProviders.length !== 1 ? 's' : '' }} connected
          </p>
        </div>
        <p class="text-xs text-green-600 dark:text-green-300 mt-1">
          External events will be automatically synced and displayed in your calendar views.
        </p>
      </div>

      <!-- Configuration Notice -->
      <Alert>
        <Icon name="lucide:info" size="16" />
        <AlertDescription>
          <div class="text-sm">
            <p class="font-medium">Setup Required</p>
            <p class="mt-1">
              To enable external calendar integration, you need to configure API credentials 
              for each provider in your application settings.
            </p>
            <ul class="mt-2 space-y-1 list-disc list-inside text-xs">
              <li>Google Calendar: Requires Google API credentials</li>
              <li>Microsoft Outlook: Requires Microsoft Graph API registration</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
</template>