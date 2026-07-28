import { ref, readonly } from 'vue'

interface BrowserCapabilities {
  hasNativeUUID: boolean
  hasResizeObserver: boolean
  hasIntersectionObserver: boolean
  supportsTouch: boolean
  supportsDragDrop: boolean
  supportsServiceWorker: boolean
  supportsLocalStorage: boolean
  supportsWebComponents: boolean
}

interface PolyfillConfig {
  autoLoad: boolean
  uuidFallback: boolean
  resizeObserverFallback: boolean
  touchEventsFallback: boolean
}

/**
 * Browser compatibility layer with polyfill management
 */
export function useCompatibility(
  config: PolyfillConfig = {
    autoLoad: true,
    uuidFallback: true,
    resizeObserverFallback: true,
    touchEventsFallback: true
  }
) {
  const capabilities = ref<BrowserCapabilities>({
    hasNativeUUID: false,
    hasResizeObserver: false,
    hasIntersectionObserver: false,
    supportsTouch: false,
    supportsDragDrop: false,
    supportsServiceWorker: false,
    supportsLocalStorage: false,
    supportsWebComponents: false
  })

  const isPolyfillsLoaded = ref(false)
  const polyfillErrors = ref<string[]>([])

  // Feature detection
  const detectCapabilities = (): void => {
    if (typeof window === 'undefined') return

    capabilities.value = {
      hasNativeUUID: typeof crypto?.randomUUID === 'function',
      hasResizeObserver: typeof ResizeObserver !== 'undefined',
      hasIntersectionObserver: typeof IntersectionObserver !== 'undefined',
      supportsTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      supportsDragDrop: 'draggable' in document.createElement('div'),
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsLocalStorage: typeof Storage !== 'undefined',
      supportsWebComponents: 'customElements' in window
    }
  }

  // UUID polyfill
  const ensureUUID = (): string => {
    if (capabilities.value.hasNativeUUID) {
      return crypto.randomUUID()
    }
    
    // Fallback UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // ResizeObserver polyfill
  const createResizeObserver = (callback: ResizeObserverCallback): ResizeObserver | null => {
    if (capabilities.value.hasResizeObserver) {
      return new ResizeObserver(callback)
    }
    
    // Simple fallback using window resize
    if (config.resizeObserverFallback) {
      return createResizeObserverFallback(callback)
    }
    
    return null
  }

  const createResizeObserverFallback = (callback: ResizeObserverCallback): ResizeObserver => {
    const observedElements = new Set<Element>()
    let rafId: number | null = null
    
    const observer = {
      observe: (element: Element) => {
        observedElements.add(element)
        if (rafId === null) {
          rafId = requestAnimationFrame(checkSizes)
        }
      },
      unobserve: (element: Element) => {
        observedElements.delete(element)
        if (observedElements.size === 0 && rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      },
      disconnect: () => {
        observedElements.clear()
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      }
    } as ResizeObserver
    
    const checkSizes = () => {
      const entries: ResizeObserverEntry[] = []
      
      observedElements.forEach(element => {
        const rect = element.getBoundingClientRect()
        entries.push({
          target: element,
          contentRect: rect,
          borderBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
          contentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
          devicePixelContentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }]
        } as ResizeObserverEntry)
      })
      
      if (entries.length > 0) {
        callback(entries, observer)
      }
      
      rafId = requestAnimationFrame(checkSizes)
    }
    
    return observer
  }

  // Touch event normalization
  const normalizePointerEvent = (event: MouseEvent | TouchEvent): {
    clientX: number
    clientY: number
    pageX: number
    pageY: number
  } => {
    if ('touches' in event && event.touches.length > 0) {
      const touch = event.touches[0]
      if (touch) {
        return {
          clientX: touch.clientX,
          clientY: touch.clientY,
          pageX: touch.pageX,
          pageY: touch.pageY
        }
      }
    }
    
    const mouseEvent = event as MouseEvent
    return {
      clientX: mouseEvent.clientX,
      clientY: mouseEvent.clientY,
      pageX: mouseEvent.pageX,
      pageY: mouseEvent.pageY
    }
  }

  // Safe localStorage wrapper
  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      if (!capabilities.value.supportsLocalStorage) return null
      
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    
    setItem: (key: string, value: string): boolean => {
      if (!capabilities.value.supportsLocalStorage) return false
      
      try {
        localStorage.setItem(key, value)
        return true
      } catch {
        return false
      }
    },
    
    removeItem: (key: string): boolean => {
      if (!capabilities.value.supportsLocalStorage) return false
      
      try {
        localStorage.removeItem(key)
        return true
      } catch {
        return false
      }
    }
  }

  // Feature-based CSS classes for styling
  const getFeatureClasses = (): string[] => {
    const classes: string[] = []
    const caps = capabilities.value
    
    if (caps.supportsTouch) classes.push('touch-device')
    if (!caps.supportsDragDrop) classes.push('no-native-drag')
    if (!caps.hasNativeUUID) classes.push('uuid-polyfill')
    if (!caps.hasResizeObserver) classes.push('resize-observer-polyfill')
    
    return classes
  }

  // Mobile-specific utilities
  const isMobileDevice = (): boolean => {
    return capabilities.value.supportsTouch && window.innerWidth <= 768
  }

  const preventZoom = (element: HTMLElement): void => {
    if (!capabilities.value.supportsTouch) return
    
    element.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }, { passive: false })
  }

  // Load polyfills dynamically
  const loadPolyfills = async (): Promise<void> => {
    if (isPolyfillsLoaded.value) return
    
    const polyfillsToLoad: Promise<void>[] = []
    
    // Load critical polyfills
    if (!capabilities.value.hasIntersectionObserver) {
      polyfillsToLoad.push(loadIntersectionObserverPolyfill())
    }
    
    if (!capabilities.value.hasResizeObserver && config.resizeObserverFallback) {
      // ResizeObserver polyfill is handled in createResizeObserver
    }
    
    try {
      await Promise.all(polyfillsToLoad)
      isPolyfillsLoaded.value = true
    } catch (error) {
      polyfillErrors.value.push(`Failed to load polyfills: ${error}`)
    }
  }

  const loadIntersectionObserverPolyfill = async (): Promise<void> => {
    // In a real implementation, you'd load this from CDN or bundle
    // For now, just mark as loaded
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Initialize
  const initialize = async (): Promise<void> => {
    detectCapabilities()
    
    if (config.autoLoad) {
      await loadPolyfills()
    }
    
    // Apply feature classes to document
    if (typeof document !== 'undefined') {
      const classes = getFeatureClasses()
      document.documentElement.classList.add(...classes)
    }
  }

  // Browser-specific optimizations
  const getBrowserOptimizations = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isWebKit = userAgent.includes('webkit')
    const isFirefox = userAgent.includes('firefox')
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome')
    
    return {
      useTransform3d: isWebKit, // Better performance on WebKit
      useWillChange: !isFirefox, // Firefox has issues with will-change
      useBackfaceVisibility: isWebKit,
      preventTouchAction: isSafari // Safari needs explicit touch-action
    }
  }

  return {
    // State
    capabilities: readonly(capabilities),
    isPolyfillsLoaded: readonly(isPolyfillsLoaded),
    polyfillErrors: readonly(polyfillErrors),
    
    // Utilities
    ensureUUID,
    createResizeObserver,
    normalizePointerEvent,
    safeLocalStorage,
    getFeatureClasses,
    isMobileDevice,
    preventZoom,
    getBrowserOptimizations,
    
    // Initialization
    initialize,
    detectCapabilities,
    loadPolyfills
  }
}