import { useQueryClient } from "@tanstack/vue-query"
import { toast } from "vue-sonner"

// Ends the session everywhere it matters: server cookie, client session state and
// every cached query (so nothing from this account lingers for the next one).
export function useSignOut() {
  const { clear } = useUserSession()
  const queryClient = useQueryClient()
  return async () => {
    try {
      await $fetch("/api/auth/logout", { method: "POST" })
    } finally {
      await clear()
      queryClient.clear()
    }
    toast.success("Signed out")
    await navigateTo("/login")
  }
}
