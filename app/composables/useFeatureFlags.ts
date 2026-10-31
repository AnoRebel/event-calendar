// Runtime-read feature flags. Values come from runtimeConfig.public.features,
// built from FEATURE_* and overridable at runtime with NUXT_PUBLIC_FEATURES_*.
// Every flag defaults to false (see nuxt.config); this composable is a typed,
// convenient accessor used by both components and server code.
export function useFeatureFlags() {
  const { features } = useRuntimeConfig().public
  return {
    recurringEvents: !!features?.recurringEvents,
    collaboration: !!features?.collaboration,
  }
}
