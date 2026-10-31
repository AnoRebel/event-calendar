<script setup lang="ts">
import { computed } from "vue"
import { Info, Lightbulb, TriangleAlert } from "@lucide/vue"

// `::callout{type="warning"}` blocks in the docs.
const props = withDefaults(defineProps<{ type?: "note" | "tip" | "warning" }>(), { type: "note" })
const icon = computed(() => ({ note: Info, tip: Lightbulb, warning: TriangleAlert })[props.type])
const tone = computed(
  () =>
    ({
      note: "border-brand/40 bg-brand-soft",
      tip: "border-success/40 bg-success/10",
      warning: "border-warning/50 bg-warning/12",
    })[props.type],
)
</script>

<template>
  <aside class="my-5 flex gap-3 rounded-lg border px-4 py-3 text-[0.95em]" :class="tone" :role="type === 'warning' ? 'note' : undefined">
    <component :is="icon" class="mt-1 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 [&>*:last-child]:mb-0"><slot /></div>
  </aside>
</template>
