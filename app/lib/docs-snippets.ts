// Code snippets shown (syntax-highlighted) on the /docs page.
//
// These live in app/lib (NOT app/pages) for two reasons: a literal containing
// "</script>" or a bare "<template>" inside docs.vue's own <script> block
// confuses the Vue SFC parser; and a .ts file under app/pages would be picked up
// as a route (/docs-snippets) and 500 when the crawler prerenders it.

export const nuxtConfigSnippet = `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@vue-dnd-kit/nuxt"],
})`

export const vueWrapperSnippet = `<script setup>
import { DnDProvider, DragPreview } from "@vue-dnd-kit/core"
import EventCalendar from "@/components/event-calendar/EventCalendar.vue"
</script>

<template>
  <DnDProvider>
    <EventCalendar :events="events" />
    <DragPreview />
  </DnDProvider>
</template>`

export const usageSnippet = `<EventCalendar
  :events="events"
  initial-view="month"
  @event-add="onAdd"
  @event-update="onUpdate"
  @event-delete="onDelete"
>
  <!-- optional: your own header control -->
  <template #header-actions><DarkModeToggle /></template>
</EventCalendar>`
