import { existsSync } from "node:fs"
import { defineConfig } from "bunwright"

// bunwright drives a locally installed Chromium-family browser via Bun.WebView —
// no browser download. BUN_CHROME_PATH wins; otherwise the first browser found
// below is used. bunwright auto-loads this file (the harness does not call
// browser.config(), which would configure it twice).
const candidates = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/brave",
  "/usr/bin/brave-browser",
  "/usr/bin/helium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

// Chromium refuses to run as root with its sandbox (CI containers); only then
// is it disabled.
const runningAsRoot = process.getuid?.() === 0

export default defineConfig({
  backend: {
    type: "chrome",
    path: process.env.BUN_CHROME_PATH || candidates.find(existsSync) || "/usr/bin/chromium",
    argv: runningAsRoot ? ["--no-sandbox"] : [],
  },
  headless: true,
})
