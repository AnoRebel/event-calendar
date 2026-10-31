<script setup lang="ts">
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

interface SwitchProps {
  defaultChecked?: boolean
  checked?: boolean
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  value?: string
}

interface SwitchEmits {
  'update:checked': [checked: boolean]
}

const props = defineProps<SwitchProps>()
const emits = defineEmits<SwitchEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    :class="
      cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-[length:var(--border-width-default)] border-line p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-strong data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-raised-3',
        $attrs.class ?? ''
      )
    "
  >
    <SwitchThumb
      :class="
        cn(
          'pointer-events-none block size-[1.125rem] rounded-full bg-surface-raised-1 shadow-material-sm ring-0 transition-transform duration-200 ease-spring data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
        )
      "
    />
  </SwitchRoot>
</template>