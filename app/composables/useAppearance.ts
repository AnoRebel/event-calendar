import { computed, readonly, ref } from "vue"
import {
  DENSITIES,
  GLASS_MATERIALS,
  MATERIALS,
  PLATFORMS,
  detectPlatform,
  getDensity,
  getGlassFrost,
  getGlassRim,
  getMaterial,
  getPlatform,
  getRefraction,
  getThemePreference,
  getTransparency,
  refractionSupported,
  setDensity,
  setGlassFrost,
  setGlassRim,
  setMaterial,
  setPlatform,
  setRefraction,
  setTheme,
  setTransparency,
  startRefraction,
  systemTheme,
  watchSystemTheme,
  type Density,
  type Material,
  type Platform,
  type Theme,
  type ThemePreference,
} from "~/lib/crystal-neuo/index.js"

export type { Density, Material, Platform, Theme, ThemePreference }

/** Labels and one-line descriptions shown in the Appearance dialog. */
export const MATERIAL_OPTIONS: ReadonlyArray<{ value: Material; label: string; note: string }> = [
  { value: "refraction", label: "Refraction", note: "Frosted glass chrome" },
  { value: "tactile", label: "Tactile", note: "Ink borders, hard shadows" },
  { value: "signal", label: "Signal", note: "Extruded, dot-matrix" },
  { value: "folio", label: "Folio", note: "Flat and dense" },
  { value: "bloom", label: "Bloom", note: "Soft and rounded" },
  { value: "hybrid", label: "Hybrid", note: "Glass with ink controls" },
]

export const PLATFORM_OPTIONS: ReadonlyArray<{ value: Platform; label: string }> = [
  { value: "web", label: "Web" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
]

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "high-contrast", label: "High contrast" },
]

export const DENSITY_OPTIONS: ReadonlyArray<{ value: Density; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
]

// One shared state for the whole app. The DOM attributes on <html> are the
// source of truth (the pre-paint script set them from storage); these refs
// mirror them for the UI and are filled in by init() on the client.
const material = ref<Material>("refraction")
const platform = ref<Platform>("web")
const themePreference = ref<ThemePreference>("system")
const resolvedTheme = ref<Theme>("light")
const density = ref<Density>("comfortable")
const frost = ref(true)
const rim = ref(true)
const refraction = ref(false)
const reducedTransparency = ref(false)
const refractionAvailable = ref(false)
const ready = ref(false)

let stopRefraction: (() => void) | null = null
let stopSystemWatch: (() => void) | null = null

function syncResolvedTheme() {
  const attr = document.documentElement.dataset.theme
  resolvedTheme.value = attr === "dark" || attr === "high-contrast" ? attr : "light"
}

function updateRefractionEngine() {
  const wanted = refraction.value && refractionAvailable.value && GLASS_MATERIALS.includes(material.value)
  if (wanted && !stopRefraction) stopRefraction = startRefraction({ thickness: 0.5, bevel: 18 })
  if (!wanted && stopRefraction) {
    stopRefraction()
    stopRefraction = null
  }
}

/** Read stored settings and start watchers. Client only; safe to call twice. */
function init() {
  if (import.meta.server || ready.value) return
  material.value = getMaterial()
  platform.value = getPlatform()
  themePreference.value = getThemePreference()
  density.value = getDensity()
  frost.value = getGlassFrost() === "on"
  rim.value = getGlassRim() === "on"
  refraction.value = getRefraction() === "on"
  reducedTransparency.value = getTransparency() === "reduced"
  refractionAvailable.value = refractionSupported()

  // The pre-paint script resolved "system" already; keep following the OS.
  if (themePreference.value === "system") setTheme("system")
  syncResolvedTheme()
  stopSystemWatch = watchSystemTheme()
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", syncResolvedTheme)

  updateRefractionEngine()
  ready.value = true
}

function dispose() {
  stopSystemWatch?.()
  stopRefraction?.()
  stopSystemWatch = null
  stopRefraction = null
  ready.value = false
}

export function useAppearance() {
  return {
    ready: readonly(ready),
    material: readonly(material),
    platform: readonly(platform),
    themePreference: readonly(themePreference),
    /** The theme actually applied (system resolved to light or dark). */
    theme: readonly(resolvedTheme),
    isDark: computed(() => resolvedTheme.value !== "light"),
    density: readonly(density),
    frost: readonly(frost),
    rim: readonly(rim),
    refraction: readonly(refraction),
    reducedTransparency: readonly(reducedTransparency),
    refractionAvailable: readonly(refractionAvailable),
    /** Whether the current material renders glass (and so the glass options apply). */
    hasGlass: computed(() => GLASS_MATERIALS.includes(material.value)),

    init,
    dispose,

    setMaterial(value: Material) {
      if (!MATERIALS.includes(value)) return
      setMaterial(value)
      material.value = value
      updateRefractionEngine()
    },
    setPlatform(value: Platform) {
      if (!PLATFORMS.includes(value)) return
      setPlatform(value)
      platform.value = value
    },
    matchDevicePlatform() {
      const detected = detectPlatform()
      setPlatform(detected)
      platform.value = detected
      return detected
    },
    setTheme(value: ThemePreference) {
      setTheme(value)
      themePreference.value = value
      syncResolvedTheme()
    },
    /** Flip between light and dark (leaving "system" for an explicit choice). */
    toggleDark() {
      const next: Theme = resolvedTheme.value === "light" ? "dark" : "light"
      setTheme(next)
      themePreference.value = next
      syncResolvedTheme()
    },
    setDensity(value: Density) {
      if (!DENSITIES.includes(value)) return
      setDensity(value)
      density.value = value
    },
    setFrost(on: boolean) {
      setGlassFrost(on ? "on" : "off")
      frost.value = on
    },
    setRim(on: boolean) {
      setGlassRim(on ? "on" : "off")
      rim.value = on
    },
    setRefraction(on: boolean) {
      setRefraction(on ? "on" : "off")
      refraction.value = on
      updateRefractionEngine()
    },
    setReducedTransparency(on: boolean) {
      setTransparency(on ? "reduced" : "normal")
      reducedTransparency.value = on
    },
    /** The OS theme, for previews of the "system" option. */
    systemTheme: () => (import.meta.client ? systemTheme() : "light"),
  }
}
