import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { useCompatibility } from './useCompatibility'

interface TouchGesture {
  type: 'tap' | 'longpress' | 'swipe' | 'pinch' | 'pan'
  startPoint: { x: number; y: number }
  currentPoint: { x: number; y: number }
  deltaX: number
  deltaY: number
  scale?: number
  duration: number
}

interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down'
  velocity: number
  distance: number
}

interface MobileConfig {
  longPressDelay: number
  swipeThreshold: number
  tapTimeout: number
  preventZoom: boolean
  enableSwipeNavigation: boolean
}

/**
 * Mobile touch enhancement for calendar interactions
 */
export function useMobileEnhancement(
  config: MobileConfig = {
    longPressDelay: 500,
    swipeThreshold: 50,
    tapTimeout: 300,
    preventZoom: true,
    enableSwipeNavigation: true
  }
) {
  const compatibility = useCompatibility()
  
  const isTouchDevice = ref(false)
  const currentGesture = ref<TouchGesture | null>(null)
  const lastTap = ref<{ time: number; x: number; y: number } | null>(null)
  
  let touchStartTime = 0
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let touchMoveCount = 0

  // Gesture detection
  const handleTouchStart = (event: TouchEvent): void => {
    if (!isTouchDevice.value) return
    
    const touch = event.touches[0]
    if (!touch) return
    
    touchStartTime = Date.now()
    touchMoveCount = 0
    
    currentGesture.value = {
      type: 'tap',
      startPoint: { x: touch.clientX, y: touch.clientY },
      currentPoint: { x: touch.clientX, y: touch.clientY },
      deltaX: 0,
      deltaY: 0,
      duration: 0
    }
    
    // Set up long press detection
    longPressTimer = setTimeout(() => {
      if (currentGesture.value && touchMoveCount < 5) {
        currentGesture.value.type = 'longpress'
        triggerGestureEvent('longpress', currentGesture.value)
      }
    }, config.longPressDelay)
    
    // Prevent zoom if configured
    if (config.preventZoom && event.touches.length > 1) {
      event.preventDefault()
    }
  }

  const handleTouchMove = (event: TouchEvent): void => {
    if (!isTouchDevice.value || !currentGesture.value) return
    
    const touch = event.touches[0]
    if (!touch) return
    
    touchMoveCount++
    
    const deltaX = touch.clientX - currentGesture.value.startPoint.x
    const deltaY = touch.clientY - currentGesture.value.startPoint.y
    
    currentGesture.value.currentPoint = { x: touch.clientX, y: touch.clientY }
    currentGesture.value.deltaX = deltaX
    currentGesture.value.deltaY = deltaY
    currentGesture.value.duration = Date.now() - touchStartTime
    
    // Determine gesture type based on movement
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance > config.swipeThreshold) {
      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        currentGesture.value.type = 'swipe'
      } else {
        currentGesture.value.type = 'pan'
      }
    }
    
    // Handle multi-touch for pinch
    if (event.touches.length === 2) {
      currentGesture.value.type = 'pinch'
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      if (touch1 && touch2) {
        const distance1 = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        // Store initial distance and calculate scale (simplified)
        currentGesture.value.scale = distance1 / 100 // Normalize to initial distance
      }
    }
    
    triggerGestureEvent('move', currentGesture.value)
  }

  const handleTouchEnd = (_event: TouchEvent): void => {
    if (!isTouchDevice.value || !currentGesture.value) return
    
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    
    currentGesture.value.duration = Date.now() - touchStartTime
    
    // Handle tap vs swipe
    if (currentGesture.value.type === 'tap') {
      handleTapGesture(currentGesture.value)
    } else if (currentGesture.value.type === 'swipe') {
      handleSwipeGesture(currentGesture.value)
    }
    
    triggerGestureEvent('end', currentGesture.value)
    currentGesture.value = null
    touchMoveCount = 0
  }

  const handleTapGesture = (gesture: TouchGesture): void => {
    const now = Date.now()
    const currentTap = {
      time: now,
      x: gesture.startPoint.x,
      y: gesture.startPoint.y
    }
    
    // Check for double tap
    if (lastTap.value) {
      const timeDiff = now - lastTap.value.time
      const distance = Math.sqrt(
        Math.pow(currentTap.x - lastTap.value.x, 2) +
        Math.pow(currentTap.y - lastTap.value.y, 2)
      )
      
      if (timeDiff < config.tapTimeout && distance < 50) {
        triggerGestureEvent('doubletap', gesture)
        lastTap.value = null
        return
      }
    }
    
    lastTap.value = currentTap
    setTimeout(() => {
      if (lastTap.value?.time === currentTap.time) {
        triggerGestureEvent('tap', gesture)
        lastTap.value = null
      }
    }, config.tapTimeout)
  }

  const handleSwipeGesture = (gesture: TouchGesture): void => {
    const { deltaX, deltaY, duration } = gesture
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / duration
    
    let direction: SwipeDirection['direction']
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }
    
    const swipeData: SwipeDirection = {
      direction,
      velocity,
      distance
    }
    
    triggerGestureEvent('swipe', gesture)
    
    // Handle navigation swipes
    if (config.enableSwipeNavigation) {
      handleNavigationSwipe(swipeData)
    }
  }

  const handleNavigationSwipe = (swipe: SwipeDirection): void => {
    // Emit navigation events that the calendar can listen to
    const event = new CustomEvent('calendar-swipe-navigation', {
      detail: swipe
    })
    document.dispatchEvent(event)
  }

  const triggerGestureEvent = (type: string, gesture: TouchGesture): void => {
    const event = new CustomEvent(`calendar-gesture-${type}`, {
      detail: gesture
    })
    document.dispatchEvent(event)
  }

  // Touch-friendly event helpers
  const makeTouchFriendly = (element: HTMLElement): void => {
    if (!isTouchDevice.value) return
    
    // Increase touch targets
    element.style.minHeight = '44px'
    element.style.minWidth = '44px'
    
    // Improve touch response
    element.style.touchAction = 'manipulation'
    element.style.userSelect = 'none'
    ;(element.style as any).webkitUserSelect = 'none'
    ;(element.style as any).webkitTouchCallout = 'none'
    
    // Add touch feedback
    element.addEventListener('touchstart', () => {
      element.style.opacity = '0.7'
    }, { passive: true })
    
    element.addEventListener('touchend', () => {
      element.style.opacity = '1'
    }, { passive: true })
    
    element.addEventListener('touchcancel', () => {
      element.style.opacity = '1'
    }, { passive: true })
  }

  // Haptic feedback (if supported)
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }

  // Virtual keyboard handling
  const handleVirtualKeyboard = (): (() => void) | void => {
    if (!isTouchDevice.value) return
    
    let initialViewportHeight = window.innerHeight
    
    const handleResize = () => {
      const currentHeight = window.innerHeight
      const keyboardHeight = initialViewportHeight - currentHeight
      
      if (keyboardHeight > 150) { // Keyboard is likely open
        document.body.style.paddingBottom = `${keyboardHeight}px`
        document.dispatchEvent(new CustomEvent('virtual-keyboard-open', {
          detail: { height: keyboardHeight }
        }))
      } else {
        document.body.style.paddingBottom = '0'
        document.dispatchEvent(new CustomEvent('virtual-keyboard-close'))
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.paddingBottom = '0'
    }
  }

  // Safe area handling for notched devices
  const handleSafeArea = (): void => {
    if (!isTouchDevice.value) return
    
    const safeAreaSupported = CSS.supports('padding-top', 'env(safe-area-inset-top)')
    
    if (safeAreaSupported) {
      document.documentElement.style.setProperty(
        '--safe-area-top', 
        'env(safe-area-inset-top)'
      )
      document.documentElement.style.setProperty(
        '--safe-area-bottom', 
        'env(safe-area-inset-bottom)'
      )
      document.documentElement.classList.add('has-safe-area')
    }
  }

  // Initialize touch enhancements
  const initialize = (): void => {
    compatibility.initialize()
    isTouchDevice.value = compatibility.capabilities.value.supportsTouch
    
    if (isTouchDevice.value) {
      // Add global touch event listeners
      document.addEventListener('touchstart', handleTouchStart, { passive: false })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
      
      // Handle virtual keyboard and safe area
      handleVirtualKeyboard()
      handleSafeArea()
      
      // Add mobile-specific CSS classes
      document.documentElement.classList.add('touch-device')
    }
  }

  const cleanup = (): void => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }
    
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }

  onMounted(initialize)
  onUnmounted(cleanup)

  return {
    // State
    isTouchDevice: readonly(isTouchDevice),
    currentGesture: readonly(currentGesture),
    
    // Utilities
    makeTouchFriendly,
    triggerHapticFeedback,
    
    // Manual initialization
    initialize,
    cleanup
  }
}