export type Theme = "light" | "dark" | "high-contrast";
export type ThemePreference = Theme | "system";
export type Density = "compact" | "comfortable" | "spacious";
export type Material = "refraction" | "tactile" | "signal" | "folio" | "bloom" | "hybrid";
export type Platform = "web" | "ios" | "android" | "windows" | "macos";
export type Transparency = "normal" | "reduced";
export declare const THEMES: readonly Theme[];
export declare const DENSITIES: readonly Density[];
export declare const MATERIALS: readonly Material[];
export declare const PLATFORMS: readonly Platform[];
export declare const DEFAULT_THEME: Theme;
export declare const DEFAULT_DENSITY: Density;
export declare const DEFAULT_MATERIAL: Material;
export declare const DEFAULT_PLATFORM: Platform;
/** Materials that render translucent glass, and so offer refraction controls. */
export declare const GLASS_MATERIALS: readonly Material[];
