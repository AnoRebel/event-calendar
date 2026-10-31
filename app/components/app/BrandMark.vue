<script setup lang="ts">
// The app mark: a calendar tile in the material's accent, drawn inline so it
// follows every material and theme.
defineProps<{ size?: number }>()
</script>

<template>
  <svg :width="size ?? 28" :height="size ?? 28" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
    <rect x="2" y="4" width="28" height="26" rx="7" fill="var(--accent-primary-base)" />
    <rect x="2" y="4" width="28" height="8" rx="4" fill="var(--accent-primary-strong)" />
    <rect x="9" y="1.5" width="3" height="6" rx="1.5" fill="var(--content-primary)" />
    <rect x="20" y="1.5" width="3" height="6" rx="1.5" fill="var(--content-primary)" />
    <circle cx="11" cy="19" r="2" fill="var(--content-on-accent)" />
    <circle cx="16" cy="19" r="2" fill="var(--content-on-accent)" opacity="0.7" />
    <circle cx="21" cy="19" r="2" fill="var(--content-on-accent)" opacity="0.45" />
    <circle cx="11" cy="24.5" r="2" fill="var(--content-on-accent)" opacity="0.45" />
  </svg>
</template>
