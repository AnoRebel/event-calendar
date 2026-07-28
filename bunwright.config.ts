import { defineConfig } from "bunwright"

// bunwright drives a locally-installed Chromium-family browser via Bun.WebView —
// no browser download. This machine has Brave at /usr/bin/brave (Helium at
// /usr/bin/helium-browser is an alternative). Override with BUN_CHROME_PATH, which
// Bun.WebView honors first in its executable search order.
//
// Config is auto-loaded from this file by bunwright; the e2e harness does NOT call
// browser.config() (that would double-configure).
export default defineConfig({
  backend: {
    type: "chrome",
    path: process.env.BUN_CHROME_PATH || "/usr/bin/brave",
  },
  headless: true,
})
