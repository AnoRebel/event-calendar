import type { Platform } from "./axes.js";
/**
 * The platform whose conventions best fit the current device, from
 * User-Agent Client Hints where the browser offers them and the user agent
 * string otherwise. Detection never applies itself: call
 * `setPlatform(detectPlatform())` to opt in.
 *
 * iPadOS reports a desktop Mac user agent; a Mac with touch points is treated
 * as iOS. Linux and ChromeOS map to `web`.
 */
export declare function detectPlatform(nav?: Navigator | undefined): Platform;
