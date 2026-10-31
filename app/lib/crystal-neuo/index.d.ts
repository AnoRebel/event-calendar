/**
 * Crystal Neuo runtime: read and set every configuration axis on the page.
 *
 * Each setting is an attribute on the root element (or any ancestor, for a
 * scoped subtree) and is persisted to localStorage. Setting one never touches
 * another. Framework-free and safe to import during SSR: nothing touches the
 * DOM until a function is called.
 *
 *   data-theme         light | dark | high-contrast   (preference may be "system")
 *   data-density       compact | comfortable | spacious
 *   data-material      refraction | tactile | signal | folio | bloom | hybrid
 *   data-platform      web | ios | android | windows | macos
 *   data-transparency  reduced (absent = normal)
 *   data-refraction    on | off            (glass bends light at the rim)
 *   data-glass-frost   off (absent = on)   (glass blurs what is behind it)
 *   data-glass-rim     off (absent = on)   (specular rim light)
 */
import { type Density, type Material, type Platform, type Theme, type ThemePreference, type Transparency } from "./axes.js";
export * from "./axes.js";
export { detectPlatform } from "./platform.js";
export { GLASS_SELECTOR, refractionSupported, startRefraction, type RefractionOptions, } from "./refraction.js";
/** localStorage keys, shared with the pre-paint script. */
export declare const STORAGE_KEYS: {
    readonly theme: "crystal-neuo:theme";
    readonly density: "crystal-neuo:density";
    readonly material: "crystal-neuo:material";
    readonly platform: "crystal-neuo:platform";
    readonly transparency: "crystal-neuo:transparency";
    readonly refraction: "crystal-neuo:refraction";
    readonly frost: "crystal-neuo:glass-frost";
    readonly rim: "crystal-neuo:glass-rim";
};
export type Toggle = "on" | "off";
/** The OS colour scheme, for the "system" theme preference. */
export declare function systemTheme(): Theme;
export declare function getThemePreference(): ThemePreference;
export declare function setTheme(pref: ThemePreference, root?: HTMLElement): void;
export declare function getDensity(): Density;
export declare function setDensity(density: Density, root?: HTMLElement): void;
export declare function getMaterial(): Material;
export declare function setMaterial(material: Material, root?: HTMLElement): void;
export declare function getPlatform(): Platform;
export declare function setPlatform(platform: Platform, root?: HTMLElement): void;
export declare function getTransparency(): Transparency;
/** Explicit reduced transparency, for browsers (Safari) that never report the OS setting. */
export declare function setTransparency(value: Transparency, root?: HTMLElement): void;
export declare function getRefraction(): Toggle;
/** Turn live refraction on or off. It renders only where `startRefraction()` found a capable engine. */
export declare function setRefraction(value: Toggle, root?: HTMLElement): void;
export declare function getGlassFrost(): Toggle;
export declare function setGlassFrost(value: Toggle, root?: HTMLElement): void;
export declare function getGlassRim(): Toggle;
export declare function setGlassRim(value: Toggle, root?: HTMLElement): void;
/** Re-apply the "system" theme whenever the OS scheme changes. Returns an unsubscribe function. */
export declare function watchSystemTheme(root?: HTMLElement): () => void;
/**
 * An inline script for `<head>` that applies stored settings before first
 * paint, validating every value so a stale or hand-edited entry can never
 * produce an attribute nothing styles. Values outside the allowed lists fall
 * back to the defaults already on the element.
 */
export declare const prePaintScript: string;
