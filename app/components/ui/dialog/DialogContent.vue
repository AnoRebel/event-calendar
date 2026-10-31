<script setup lang="ts">
import { cn } from '@/lib/utils'
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import DialogOverlay from './DialogOverlay.vue'

// The root is a portal, so pass attributes (data-testid, aria-*, id) through to
// the content element instead of losing them.
defineOptions({ inheritAttrs: false })

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          // Phones: a bottom sheet that scrolls internally and respects the home
          // indicator. Wider screens: a centred card. Both use the material's
          // overlay surface, radius and shadow.
          'fixed z-50 grid w-full gap-4 overflow-y-auto overscroll-contain border border-line-subtle bg-popover text-popover-foreground shadow-material-lg outline-none',
          'inset-x-0 bottom-0 max-h-[calc(100dvh-1.5rem)] rounded-t-2xl px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-4rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6',
          'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
          props.class,
        )"
    >
      <slot />

      <DialogClose
        class="cn-button cn-button--ghost cn-button--size-sm absolute top-3 right-3 aspect-square border-transparent px-0 text-content-secondary shadow-none hover:before:opacity-[0.07] sm:top-4 sm:right-4 [&_svg]:pointer-events-none [&_svg]:size-4"
      >
        <X />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
