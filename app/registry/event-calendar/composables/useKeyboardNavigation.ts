import { ref, type Ref } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import type { ViewMode } from '../types'

/**
 * Enhanced keyboard navigation for calendar
 */
export function useKeyboardNavigation(
  currentView: Ref<ViewMode>,
  currentDate: Ref<Date>,
  isModalOpen: Ref<boolean>,
  navigate: (direction: 'prev' | 'next' | 'today') => void,
  openAddModal: () => void
) {
  const isNavigationEnabled = ref(true)

  // Disable navigation when typing in inputs or when modal is open
  const shouldSkipNavigation = (e: KeyboardEvent): boolean => {
    return (
      !isNavigationEnabled.value ||
      isModalOpen.value ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable) ||
      e.target instanceof HTMLSelectElement ||
      (e.target as HTMLElement)?.getAttribute('role') === 'combobox'
    )
  }

  // View switching shortcuts
  onKeyStroke(['m', 'M'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    currentView.value = 'month'
  })

  onKeyStroke(['w', 'W'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    currentView.value = 'week'
  })

  onKeyStroke(['d', 'D'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    currentView.value = 'day'
  })

  onKeyStroke(['a', 'A'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    currentView.value = 'agenda'
  })

  // Navigation shortcuts
  onKeyStroke(['ArrowLeft'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    navigate('prev')
  })

  onKeyStroke(['ArrowRight'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    navigate('next')
  })

  onKeyStroke(['t', 'T'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    navigate('today')
  })

  // Quick add event
  onKeyStroke(['n', 'N'], (e) => {
    if (shouldSkipNavigation(e)) return
    e.preventDefault()
    openAddModal()
  })

  // Escape to close modals (handled by individual components)
  onKeyStroke(['Escape'], (e) => {
    if (isModalOpen.value) {
      e.preventDefault()
      // This will be handled by the modal component
    }
  })

  const enableNavigation = () => {
    isNavigationEnabled.value = true
  }

  const disableNavigation = () => {
    isNavigationEnabled.value = false
  }

  return {
    isNavigationEnabled,
    enableNavigation,
    disableNavigation
  }
}