import { readonly } from 'vue'
import { useDark, useToggle } from '@vueuse/core'

export const useDarkMode = () => {
  const isDark = useDark({
    selector: 'html',
    attribute: 'class',
    valueDark: 'dark',
    valueLight: 'light',
    storageKey: 'event-calendar-theme',
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  })
  
  const toggle = useToggle(isDark)
  
  return {
    isDark: readonly(isDark),
    toggle
  }
}