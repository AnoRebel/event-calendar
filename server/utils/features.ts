// Server-side feature flags, read from runtimeConfig.public.features (same values
// the client sees). Endpoints use these to reject requests for disabled features
// rather than relying on the UI being hidden.
export function useServerFeatures() {
  const { features } = useRuntimeConfig().public
  return {
    recurringEvents: !!features?.recurringEvents,
    collaboration: !!features?.collaboration,
  }
}
