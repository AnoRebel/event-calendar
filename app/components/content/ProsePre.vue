<script setup lang="ts">
import { useClipboard } from "@vueuse/core"
import { Check, Copy } from "@lucide/vue"

// Code blocks in the docs: build-time Shiki highlighting (light + dark), with
// an optional filename and a copy button.
const props = withDefaults(
  defineProps<{
    code?: string
    language?: string | null
    filename?: string | null
    highlights?: number[]
    meta?: string | null
    class?: string | null
  }>(),
  { code: "", language: null, filename: null, highlights: () => [], meta: null, class: null },
)
const { copy, copied, isSupported } = useClipboard({ copiedDuring: 1500 })
</script>

<template>
  <div class="group/code relative my-5 overflow-hidden rounded-lg border border-line-subtle bg-surface-raised-1">
    <div v-if="filename" class="border-b border-line-subtle px-4 py-2 font-mono text-xs text-content-secondary">{{ filename }}</div>
    <pre :class="[props.class, 'm-0 overflow-x-auto rounded-none border-0 bg-transparent px-4 py-3.5']"><slot /></pre>
    <ClientOnly>
    <button
      v-if="isSupported && code"
      type="button"
      class="absolute top-2 right-2 grid size-8 place-items-center rounded-md bg-surface-raised-1/90 text-content-secondary opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-content-primary focus-visible:opacity-100 max-md:opacity-100"
      :class="filename && 'top-10'"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="copy(code)"
    >
      <Check v-if="copied" class="size-4 text-success-content" />
      <Copy v-else class="size-4" />
    </button>
    </ClientOnly>
  </div>
</template>
