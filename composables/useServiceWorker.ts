import { ref, readonly, onMounted } from "vue"

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isUpdating: boolean
  hasUpdate: boolean
  error: string | null
}

/**
 * Service Worker registration and management
 */
export function useServiceWorker() {
  const state = ref<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    hasUpdate: false,
    error: null,
  })

  const registration = ref<ServiceWorkerRegistration | null>(null)

  const register = async (): Promise<void> => {
    TODO: Get the service worker to work properly
    return
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      state.value.error = "Service Worker not supported"
      return
    }

    state.value.isSupported = true

    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      })

      registration.value = reg
      state.value.isRegistered = true

      // Listen for updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing
        if (!newWorker) return

        state.value.isUpdating = true

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            state.value.hasUpdate = true
            state.value.isUpdating = false
          }
        })
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", event => {
        handleServiceWorkerMessage(event.data)
      })

      console.log("Service Worker registered successfully")
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : "Registration failed"
      console.error("Service Worker registration failed:", error)
    }
  }

  const update = async (): Promise<void> => {
    if (!registration.value) return

    try {
      await registration.value.update()
    } catch (error) {
      console.error("Service Worker update failed:", error)
    }
  }

  const skipWaiting = (): void => {
    if (!registration.value?.waiting) return

    registration.value.waiting.postMessage({ type: "SKIP_WAITING" })
    window.location.reload()
  }

  const handleServiceWorkerMessage = (data: any): void => {
    switch (data.type) {
      case "SYNC_SUCCESS":
        console.log("Background sync successful:", data.eventId)
        break
      case "CACHED_EVENTS":
        console.log("Cached events received:", data.data)
        break
      default:
        console.log("Service Worker message:", data)
    }
  }

  const sendMessage = (message: any): void => {
    if (!registration.value?.active) return

    registration.value.active.postMessage(message)
  }

  const getCachedEvents = (): Promise<any[]> => {
    return new Promise(resolve => {
      if (!registration.value?.active) {
        resolve([])
        return
      }

      const channel = new MessageChannel()
      channel.port1.onmessage = event => {
        if (event.data.type === "CACHED_EVENTS") {
          resolve(event.data.data)
        }
      }

      registration.value.active.postMessage({ type: "GET_CACHED_EVENTS" }, [channel.port2])
    })
  }

  const cacheEvent = (eventData: any): void => {
    sendMessage({
      type: "CACHE_EVENT",
      data: eventData,
    })
  }

  onMounted(() => {
    register()
  })

  return {
    state: readonly(state),
    registration: readonly(registration),
    register,
    update,
    skipWaiting,
    sendMessage,
    getCachedEvents,
    cacheEvent,
  }
}
