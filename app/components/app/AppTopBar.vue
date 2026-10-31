<script setup lang="ts">
import { Moon, Palette, Sun } from "@lucide/vue"
import { Button } from "@/components/ui/button"

const emit = defineEmits<{ (e: "appearance"): void }>()
const { loggedIn } = useUserSession()
const route = useRoute()
const { items, isCurrent } = useAppNavigation()
const appearance = useAppearance()
const isDark = appearance.isDark
</script>

<template>
  <!-- Glass chrome: frosted (and optionally refracting) in glass materials,
       solid in the others. Sticky so the calendar scrolls beneath it. -->
  <header class="sticky top-0 z-40 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
    <div class="cn-glass mx-auto flex h-14 max-w-screen-2xl items-center gap-2 rounded-2xl px-2 sm:gap-3 sm:px-3">
      <NuxtLink to="/" class="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-content-primary no-underline">
        <BrandMark :size="28" />
        <span class="truncate font-display text-base font-bold tracking-tight">Event Calendar</span>
      </NuxtLink>

      <nav aria-label="Primary" class="ml-2 hidden items-center gap-1 md:flex">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          :aria-current="isCurrent(item) ? 'page' : undefined"
          class="inline-flex min-h-control-sm items-center gap-2 rounded-lg px-3 text-sm font-medium text-content-secondary no-underline transition-colors hover:bg-hover hover:text-content-primary aria-[current=page]:bg-brand-soft aria-[current=page]:text-content-primary"
        >
          <component :is="item.icon" class="size-4" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-1 sm:gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          data-testid="theme-toggle"
          @click="appearance.toggleDark()"
        >
          <ClientOnly>
            <Sun v-if="isDark" />
            <Moon v-else />
            <template #fallback><Moon /></template>
          </ClientOnly>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-haspopup="dialog"
          data-testid="appearance-button"
          @click="emit('appearance')"
        >
          <Palette />
          <span class="max-sm:sr-only">Appearance</span>
        </Button>
        <UserMenu v-if="loggedIn" @appearance="emit('appearance')" />
        <Button v-else-if="route.name !== 'login'" as-child size="sm">
          <NuxtLink to="/login">Sign in</NuxtLink>
        </Button>
      </div>
    </div>
  </header>
</template>
