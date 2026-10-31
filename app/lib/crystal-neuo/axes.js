// The axis positions and defaults. tokens.test.ts asserts these match
// src/tokens.json, so the runtime cannot drift from the emitted CSS.
export const THEMES = ["light", "dark", "high-contrast"];
export const DENSITIES = ["compact", "comfortable", "spacious"];
export const MATERIALS = ["refraction", "tactile", "signal", "folio", "bloom", "hybrid"];
export const PLATFORMS = ["web", "ios", "android", "windows", "macos"];
export const DEFAULT_THEME = "light";
export const DEFAULT_DENSITY = "comfortable";
export const DEFAULT_MATERIAL = "refraction";
export const DEFAULT_PLATFORM = "web";
/** Materials that render translucent glass, and so offer refraction controls. */
export const GLASS_MATERIALS = ["refraction", "bloom", "hybrid"];
