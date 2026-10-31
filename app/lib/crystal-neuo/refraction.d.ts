/**
 * Live glass refraction: content behind a glass surface bends near its rim.
 *
 * Technique: an SVG filter applied through `backdrop-filter: url(#…)`, whose
 * displacement map is drawn on a canvas from the element's own size and corner
 * radius (neutral in the middle, a bevel near the rim that samples further
 * inward). An optional colour fringe displaces red, green, and blue by slightly
 * different amounts.
 *
 * Support: only Chromium renders SVG filters in `backdrop-filter`. Safari
 * parses `backdrop-filter: url(#f)` and renders nothing, so `@supports` cannot
 * detect it; Firefox does not support it. The engine is therefore enabled by
 * engine identification (User-Agent Client Hints, which only Chromium
 * implements). Everywhere else the frosted CSS glass stays as it is.
 *
 * The engine only supplies the filter. Whether a subtree refracts is decided
 * in CSS by the nearest ancestor's `data-refraction` ("on" or "off"), and accessibility
 * preferences (reduced motion or transparency, high contrast, forced colours)
 * switch it off there too.
 */
/** Glass surfaces the engine attaches to. */
export declare const GLASS_SELECTOR = ".cn-glass, .cn-nav--glass, .cn-card--glass, .cn-card--feature, .cn-tabbar, .cn-sheet, .cn-menu";
export interface RefractionOptions {
    /** How far light bends at the rim, 0–1. Default 0.5. */
    thickness?: number;
    /** Width of the bending band at the rim, in CSS pixels. Default 18. */
    bevel?: number;
    /** Split light into colour fringes at the rim. Default false. */
    fringe?: boolean;
    /** Elements to refract. Default: every Crystal Neuo glass surface. */
    selector?: string;
    /** Where to look for glass surfaces. Default: the document. */
    root?: ParentNode;
}
/** Whether this engine renders SVG filters in `backdrop-filter`. */
export declare function refractionSupported(): boolean;
/**
 * Start the refraction engine. Returns a function that stops it and removes
 * everything it added. Safe to call during SSR or in unsupported engines: it
 * then does nothing and returns a no-op.
 */
export declare function startRefraction(options?: RefractionOptions): () => void;
