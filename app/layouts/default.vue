<script setup lang="ts">
import { ref } from "vue"

// App chrome: glass top bar everywhere, a floating tab bar on phones, and the
// Appearance dialog reachable from both.
const appearanceOpen = ref(false)
</script>

<template>
  <div class="app-backdrop flex min-h-dvh flex-col">
    <a
      href="#main"
      class="sr-only z-50 rounded-md bg-surface-overlay px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >Skip to content</a>
    <AppTopBar @appearance="appearanceOpen = true" />
    <main id="main" class="flex w-full min-w-0 flex-1 flex-col pb-tabbar md:pb-8">
      <slot />
    </main>
    <AppTabBar />
    <AppearanceDialog v-model:open="appearanceOpen" />
  </div>
</template>
