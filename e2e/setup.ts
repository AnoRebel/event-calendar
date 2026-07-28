// Shared e2e harness for bunwright + bun:test.
//
// Responsibilities:
//   1. Ensure the app is reachable at E2E_BASE_URL — if not, build (when needed)
//      and start `.output/server/index.mjs`, then tear it down after the suite.
//   2. Own the bunwright browser lifecycle (single shared page).
//   3. Expose small helpers used across specs.
//
// Browser: bunwright drives Brave via Bun.WebView. Set BUN_CHROME_PATH to point
// at the binary (/usr/bin/brave here). On Linux we prefer the X11 GDK backend for
// stability. NOTE: Bun.WebView is known to orphan Chromium helper processes across
// many launches on Linux (oven-sh/bun#30475) — reapOrphans() cleans them up.
process.env.GDK_BACKEND ||= "x11"
delete process.env.WAYLAND_DISPLAY

import { browser, type Page } from "bunwright"
import { spawn, spawnSync, type Subprocess } from "bun"
import { existsSync } from "node:fs"

// bunwright auto-loads bunwright.config.ts from the project root (resolution order:
// built-in defaults ← config file ← defineConfig() call). We do NOT call
// browser.config() here — doing so alongside the auto-loaded file is what caused
// the WebView to hang on navigate. The Brave path comes from bunwright.config.ts,
// and BUN_CHROME_PATH (honored first in Bun.WebView's Chrome search order)
// overrides it. On this machine the binary is /usr/bin/brave (not brave-browser,
// which is the only Brave name Bun.WebView probes by default).

export const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3100"

// Directory for failure screenshots.
export const ARTIFACT_DIR = process.env.E2E_ARTIFACTS || "e2e/artifacts"

// bunwright's `browser` is a singleton with a single WebView. Open ONE page for
// the whole suite and re-navigate it per test rather than creating a page each
// time (concurrent pages collide with "navigation already pending").
let page: Page | null = null

export async function getPage(): Promise<Page> {
  if (!page) {
    page = await browser.newPage()
  }
  return page
}

// Navigate the shared page to `path`. Uses `domcontentloaded`, NOT `networkidle`:
// the app runs a service worker + monitoring that keep the network busy, so
// `networkidle` never settles.
export async function openApp(path = "/"): Promise<Page> {
  const p = await getPage()
  await p.navigate(`${BASE_URL}${path}`, { waitForLoadState: "domcontentloaded" })
  // Give client hydration a beat so interactive elements are live.
  await p.waitForTimeout(500)
  return p
}

// The app is auth-gated: register a fresh user through the AuthPanel UI so the
// calendar becomes reachable. Idempotent per suite (skips if already signed in).
let signedIn = false
const ADD_EVENT = 'css:[data-testid="add-event"]'

export async function ensureSignedIn(): Promise<Page> {
  const p = await openApp("/")
  if (signedIn) return p

  // If the calendar is already visible (returning session), we're done.
  if (await p.exists(ADD_EVENT)) {
    signedIn = true
    return p
  }

  // Otherwise drive the sign-up form. Switch to register mode first (the toggle
  // button says "Sign up" when currently in login mode).
  if (await p.exists("role:button[name='Sign up']")) {
    await p.click("role:button[name='Sign up']")
    await p.waitForTimeout(300)
  }

  const stamp = `${process.pid}${Math.floor(process.uptime() * 1000)}`
  await p.type('css:input[type="email"]', `e2e_${stamp}@test.com`)
  await p.type('css:input[type="password"]', "password12345")
  await p.click('css:button[type="submit"]')

  // Wait for the calendar to appear (poll via exists).
  await waitForSel(p, ADD_EVENT, 12_000)
  signedIn = true
  return p
}

// Poll until a selector exists, or throw after `timeout` ms. bunwright's own
// waitForSelector doesn't resolve text:/role: prefixes, so we poll exists().
export async function waitForSel(p: Page, sel: string, timeout = 8_000): Promise<void> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await p.exists(sel)) return
    await p.waitForTimeout(250)
  }
  throw new Error(`[e2e] timed out waiting for selector "${sel}"`)
}

export async function closeBrowser(): Promise<void> {
  if (page) {
    await browser.close()
    page = null
  }
  signedIn = false
  reapOrphans()
}

// --- App server lifecycle -------------------------------------------------

let serverProc: Subprocess | null = null

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// Ensure the app is serving at BASE_URL. If it already is, do nothing. Otherwise
// build (only if there's no .output) and start the Nitro node server, waiting
// until it responds. Returns whether this call started the server (so the caller
// knows to stop it).
export async function startServerIfNeeded(): Promise<void> {
  if (await isReachable(BASE_URL)) return

  const port = new URL(BASE_URL).port || "3100"

  if (!existsSync(".output/server/index.mjs")) {
    // eslint-disable-next-line no-console
    console.log("[e2e] no build found — running `bun run build`…")
    const build = spawnSync(["bun", "run", "build"], { stdout: "inherit", stderr: "inherit" })
    if (!build.success) throw new Error("[e2e] build failed")
  }

  // eslint-disable-next-line no-console
  console.log(`[e2e] starting app server on :${port}…`)
  // Default the spawned server to the local dev libSQL file if no URL is set, so
  // the e2e run has real persistence without extra configuration.
  const libsqlUrl = process.env.LIBSQL_URL || process.env.DATABASE_URL || `file:${process.cwd()}/.data/events.db`
  // The app is auth-gated — the session cookie needs a signing password.
  const sessionPassword = process.env.NUXT_SESSION_PASSWORD || "e2e-test-session-password-at-least-32chars"
  serverProc = spawn(["node", ".output/server/index.mjs"], {
    env: {
      ...process.env,
      PORT: port,
      NITRO_PORT: port,
      LIBSQL_URL: libsqlUrl,
      NUXT_SESSION_PASSWORD: sessionPassword,
      NODE_ENV: "development",
    },
    stdout: "ignore",
    stderr: "ignore",
  })

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await isReachable(BASE_URL)) return
    await Bun.sleep(500)
  }
  throw new Error(`[e2e] app server did not become reachable at ${BASE_URL}`)
}

export function stopServer(): void {
  if (serverProc) {
    serverProc.kill()
    serverProc = null
  }
}

// Kill orphaned Bun.WebView helper processes (oven-sh/bun#30475). Best-effort;
// scoped to the /tmp/bun-chrome-* profiles bunwright spawns so we don't touch a
// user's own Brave session.
function reapOrphans(): void {
  try {
    spawnSync(["pkill", "-9", "-f", "user-data-dir=/tmp/bun-chrome-"])
  } catch {
    // pkill absent or nothing to kill — ignore.
  }
}

// Capture a screenshot + page console for diagnosis. Call from a catch/finally so
// a failing assertion leaves visual evidence rather than a bare stack trace.
export async function captureFailure(page: Page, name: string): Promise<void> {
  try {
    const safe = name.replace(/[^a-z0-9-_]+/gi, "_")
    await page.screenshot(`${ARTIFACT_DIR}/${safe}.png`)
    // eslint-disable-next-line no-console
    console.error(`[e2e] captured failure screenshot: ${ARTIFACT_DIR}/${safe}.png`)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[e2e] failed to capture screenshot:", err)
  }
}
