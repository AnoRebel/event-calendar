<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner"
import "vue-sonner/style.css"
import { useServiceWorker } from "~/composables/useServiceWorker"
import { useCompatibility } from "~/registry/event-calendar/composables/useCompatibility"
import { useMobileEnhancement } from "~/composables/useMobileEnhancement"
import { useMonitoring } from "~/registry/event-calendar/composables/useMonitoring"

const { isDark } = useDarkMode()

// App-wide services shared across pages.
const { state: swState } = useServiceWorker()
const compatibility = useCompatibility()
const mobileEnhancement = useMobileEnhancement()
const monitoring = useMonitoring()

compatibility.initialize()

// Feature detection classes + global error monitoring.
onMounted(() => {
  document.documentElement.classList.add(...compatibility.getFeatureClasses())
})

if (import.meta.client) {
  window.addEventListener("unhandledrejection", event => {
    monitoring.recordError({
      error: event.reason?.message || "Unhandled promise rejection",
      component: "global",
    })
    event.preventDefault()
  })
}

useHead({
  titleTemplate: title => (title ? `${title} · Event Calendar` : "Event Calendar"),
  meta: [
    { name: "description", content: "A configurable, drag-and-drop event calendar for Vue 3 and Nuxt." },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "theme-color", content: "#ffffff" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
  ],
  link: [
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "manifest", href: "/manifest.json" },
    { rel: "apple-touch-icon", href: "/favicon.ico" },
  ],
})
</script>

<template>
  <!-- DnDProvider must wrap the app: vue-dnd-kit v2 composables run via inject
       inside descendant components (the calendar views). -->
  <DnDProvider>
    <div class="min-h-screen bg-background">
      <NuxtRouteAnnouncer />
      <NuxtPage />
      <Toaster
        class="pointer-events-auto"
        :theme="isDark ? 'dark' : 'light'"
        position="top-right"
        rich-colors
        close-button
      />
    </div>
    <DragPreview />
  </DnDProvider>
</template>
