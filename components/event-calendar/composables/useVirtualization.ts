import { ref, computed, readonly, type Ref } from 'vue'
import type { CalendarEvent } from '../types'

interface VirtualizationConfig {
  itemHeight: number
  containerHeight: number
  overscan: number
  enabled: boolean
}

interface VirtualItem {
  index: number
  start: number
  end: number
  event: CalendarEvent
}

/**
 * Virtual scrolling for large event lists
 * Improves performance with thousands of events
 */
export function useVirtualization(
  events: Ref<CalendarEvent[]>,
  config: VirtualizationConfig = {
    itemHeight: 60,
    containerHeight: 400,
    overscan: 5,
    enabled: true
  }
) {
  const scrollTop = ref(0)
  const isScrolling = ref(false)
  let scrollTimeout: ReturnType<typeof setTimeout>

  const totalHeight = computed(() => events.value.length * config.itemHeight)
  
  const visibleRange = computed(() => {
    if (!config.enabled || events.value.length === 0) {
      return { start: 0, end: events.value.length }
    }

    const viewportHeight = config.containerHeight
    const scrollTopValue = scrollTop.value
    
    const start = Math.floor(scrollTopValue / config.itemHeight)
    const end = Math.min(
      events.value.length,
      Math.ceil((scrollTopValue + viewportHeight) / config.itemHeight)
    )
    
    return {
      start: Math.max(0, start - config.overscan),
      end: Math.min(events.value.length, end + config.overscan)
    }
  })

  const visibleEvents = computed((): VirtualItem[] => {
    const range = visibleRange.value
    const items: VirtualItem[] = []
    
    for (let i = range.start; i < range.end; i++) {
      const event = events.value[i]
      if (event) {
        items.push({
          index: i,
          start: i * config.itemHeight,
          end: (i + 1) * config.itemHeight,
          event
        })
      }
    }
    
    return items
  })

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
    
    isScrolling.value = true
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }

  const scrollToIndex = (index: number) => {
    const targetScrollTop = index * config.itemHeight
    scrollTop.value = targetScrollTop
  }

  const getItemProps = (item: VirtualItem) => ({
    key: item.event.id,
    style: {
      position: 'absolute' as const,
      top: `${item.start}px`,
      height: `${config.itemHeight}px`,
      width: '100%',
      transform: isScrolling.value ? 'translateZ(0)' : undefined // GPU acceleration during scroll
    }
  })

  return {
    totalHeight,
    visibleEvents,
    isScrolling,
    handleScroll,
    scrollToIndex,
    getItemProps,
    scrollTop: readonly(scrollTop)
  }
}