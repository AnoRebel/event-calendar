// Runtime-read feature flags. Values come from runtimeConfig.public.features,
// which is populated from NUXT_PUBLIC_FEATURE_* / FEATURE_* env at runtime.
// Every flag defaults to false (see nuxt.config); this composable is a typed,
// convenient accessor used by both components and server code.
export function useFeatureFlags() {
  const { features } = useRuntimeConfig().public
  return {
    recurringEvents: !!features?.recurringEvents,
    collaboration: !!features?.collaboration,
  }
}
