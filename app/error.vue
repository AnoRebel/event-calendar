<script setup lang="ts">
import type { NuxtError } from "#app"
import { computed } from "vue"
import { ArrowLeft, BookOpen, CalendarDays } from "@lucide/vue"
import { Button } from "@/components/ui/button"

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (notFound.value ? "Page not found" : "Something went wrong"))
const description = computed(() =>
  notFound.value
    ? "The page you asked for doesn't exist or has moved."
    : "An unexpected error stopped this page from loading. Try again in a moment.",
)

useHead({ title })

const goHome = () => clearError({ redirect: "/" })
const goBack = () => (window.history.length > 1 ? window.history.back() : goHome())
</script>

<template>
  <NuxtLayout>
    <div class="flex flex-1 items-center justify-center px-4 py-16">
      <div class="surface-panel w-full max-w-md p-8 text-center">
        <p class="mb-2 font-[family-name:var(--font-family-numeric)] text-5xl font-bold text-brand">{{ error.statusCode }}</p>
        <h1 class="mb-2 text-2xl font-bold tracking-tight">{{ title }}</h1>
        <p class="mb-6 text-content-secondary">{{ description }}</p>
        <div class="flex flex-wrap justify-center gap-2">
          <Button variant="outline" type="button" @click="goBack"><ArrowLeft /> Go back</Button>
          <Button type="button" @click="goHome"><CalendarDays /> Calendar</Button>
          <Button v-if="notFound" variant="ghost" type="button" @click="clearError({ redirect: '/docs' })"><BookOpen /> Docs</Button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
