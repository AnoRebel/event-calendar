import { onMounted, readonly, ref } from "vue"
import { toast } from "vue-sonner"

// Registers public/sw.js (production builds only) and offers a reload when a new
// version has been installed. See public/sw.js for what is and isn't cached.
export function useServiceWorker() {
  const registration = ref<ServiceWorkerRegistration | null>(null)
  const updateAvailable = ref(false)

  const promptUpdate = (worker: ServiceWorker) => {
    updateAvailable.value = true
    toast("A new version is available", {
      description: "Reload to get the latest Event Calendar.",
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: "Reload",
        onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
      },
    })
  }

  onMounted(async () => {
    if (import.meta.dev || !("serviceWorker" in navigator)) return
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      registration.value = reg
      if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting)
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) promptUpdate(worker)
        })
      })
      // The new worker took over: load the page it serves.
      let reloading = false
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return
        reloading = true
        window.location.reload()
      })
    } catch (error) {
      console.warn("Service worker registration failed:", error)
    }
  })

  return { registration: readonly(registration), updateAvailable: readonly(updateAvailable) }
}
