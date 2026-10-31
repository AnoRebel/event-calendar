<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner"
import "vue-sonner/style.css"
import { useServiceWorker } from "~/composables/useServiceWorker"
import { useMonitoring } from "~/registry/event-calendar/composables/useMonitoring"

const { isDark } = useAppearance()
const isPhone = useMediaQuery("(max-width: 767px)")

// Offline shell + update prompt, and global error reporting.
useServiceWorker()
const monitoring = useMonitoring()
if (import.meta.client) {
  window.addEventListener("unhandledrejection", event => {
    monitoring.recordError({
      error: event.reason?.message || "Unhandled promise rejection",
      component: "global",
    })
  })
}

useHead({
  titleTemplate: title => (title ? `${title} · Event Calendar` : "Event Calendar"),
  meta: [
    { name: "description", content: "A drag-and-drop event calendar for Vue 3 and Nuxt, with passkeys and the Crystal Neuo design system." },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
  ],
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "any" },
    { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  ],
})
</script>

<template>
  <!-- DnDProvider must wrap the app: vue-dnd-kit v2 composables run via inject
       inside descendant components (the calendar views). -->
  <DnDProvider>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster
      :theme="isDark ? 'dark' : 'light'"
      :position="isPhone ? 'top-center' : 'bottom-right'"
      close-button
    />
    <DragPreview />
  </DnDProvider>
</template>
