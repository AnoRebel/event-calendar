<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { useVModel } from '@vueuse/core'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <!-- Crystal Neuo field: material borders, radius, height and focus ring. -->
  <input
    v-model="modelValue"
    data-slot="input"
    :class="cn(
      'cn-input w-full min-w-0 placeholder:text-content-tertiary file:me-3 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed aria-invalid:border-destructive',
      props.class,
    )"
  >
</template>
