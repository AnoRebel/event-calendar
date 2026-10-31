import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query"

// TanStack Query for server state (events, account, passkeys, invites). Queries
// that need the session run on the client only, so server and client render the
// same loading state.
export default defineNuxtPlugin(nuxtApp => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
  return { provide: { queryClient } }
})
