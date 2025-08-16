<script setup lang="ts">
const { isDark, toggle } = useDarkMode()
</script>

<template>
  <button
    @click="toggle()"
    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 p-0"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <Icon
      :name="isDark ? 'lucide:sun' : 'lucide:moon'"
      class="h-4 w-4 transition-all duration-200"
      :class="{ 'rotate-90 scale-0': isDark, 'rotate-0 scale-100': !isDark }"
    />
    <Icon
      :name="isDark ? 'lucide:moon' : 'lucide:sun'"
      class="absolute h-4 w-4 transition-all duration-200"
      :class="{ 'rotate-0 scale-100': isDark, '-rotate-90 scale-0': !isDark }"
    />
    <span class="sr-only">Toggle theme</span>
  </button>
</template>