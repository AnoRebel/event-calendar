<script lang="ts" setup>
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'

const props = defineProps<ToasterProps>()
</script>

<template>
  <!-- Toasts take the material's overlay surface, radius, shadow and state colours. -->
  <Sonner
    class="toaster group"
    v-bind="props"
    :style="{
      '--normal-bg': 'var(--surface-overlay)',
      '--normal-text': 'var(--content-primary)',
      '--normal-border': 'var(--border-subtle)',
      '--success-bg': 'color-mix(in oklab, var(--state-success-base) 14%, var(--surface-overlay))',
      '--success-text': 'var(--content-primary)',
      '--success-border': 'color-mix(in oklab, var(--state-success-base) 45%, transparent)',
      '--error-bg': 'color-mix(in oklab, var(--state-danger-base) 14%, var(--surface-overlay))',
      '--error-text': 'var(--content-primary)',
      '--error-border': 'color-mix(in oklab, var(--state-danger-base) 45%, transparent)',
      '--warning-bg': 'color-mix(in oklab, var(--state-warning-base) 16%, var(--surface-overlay))',
      '--warning-text': 'var(--content-primary)',
      '--warning-border': 'color-mix(in oklab, var(--state-warning-base) 45%, transparent)',
      '--info-bg': 'color-mix(in oklab, var(--accent-primary-base) 12%, var(--surface-overlay))',
      '--info-text': 'var(--content-primary)',
      '--info-border': 'color-mix(in oklab, var(--accent-primary-base) 40%, transparent)',
      '--border-radius': 'var(--radius-lg)',
      fontFamily: 'var(--font-family-ui)',
    }"
  />
</template>
