// Shared e2e harness for bunwright + bun:test.
//
// Responsibilities:
//   1. Ensure the app is reachable at E2E_BASE_URL — if not, build (when needed)
//      and start `.output/server/index.mjs`, then tear it down after the suite.
//   2. Own the bunwright browser lifecycle (single shared page).
//   3. Expose small helpers used across specs.
//
// Browser: bunwright drives a Chromium-family browser via Bun.WebView (see
// bunwright.config.ts; BUN_CHROME_PATH overrides the auto-detected binary). On Linux we prefer the X11 GDK backend for
// stability. NOTE: Bun.WebView is known to orphan Chromium helper processes across
// many launches on Linux (oven-sh/bun#30475) — reapOrphans() cleans them up.
import { browser, type Page } from "bunwright"
import { spawn, spawnSync, type Subprocess } from "bun"
import { existsSync } from "node:fs"

process.env.GDK_BACKEND ||= "x11"
delete process.env.WAYLAND_DISPLAY

// bunwright auto-loads bunwright.config.ts from the project root; we do NOT call
// browser.config() here (configuring twice made the WebView hang on navigate).

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

// Sign up a fresh password account through the API (registration is open in the
// e2e server) so tests that need a session start from the calendar. The session
// cookie lives in the shared WebView.
let signedIn = false
export async function ensureSignedIn(): Promise<Page> {
  const p = await openApp("/login")
  if (!signedIn) {
    await p.evaluate(() =>
      fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `e2e-${Date.now()}@example.com`, password: "password12345", name: "E2E" }),
      }).then(r => r.status),
    )
    signedIn = true
  }
  await openApp("/")
  await waitForSel(p, 'css:[data-testid="add-event"]', 15_000)
  return p
}

export function resetSignedIn() {
  signedIn = false
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
     
    console.log("[e2e] no build found — running `bun run build`…")
    const build = spawnSync(["bun", "run", "build"], { stdout: "inherit", stderr: "inherit" })
    if (!build.success) throw new Error("[e2e] build failed")
  }

   
  console.log(`[e2e] starting app server on :${port}…`)
  // Default the spawned server to the local dev libSQL file if no URL is set, so
  // the e2e run has real persistence without extra configuration.
  // A fresh database per run, migrated with the same runner the Docker image uses.
  const libsqlUrl = process.env.LIBSQL_URL || `file:${process.cwd()}/.data/e2e-${Date.now()}.db`
  const migrate = spawnSync(["node", "scripts/migrate-runtime.mjs"], {
    env: { ...process.env, LIBSQL_URL: libsqlUrl },
    stdout: "inherit",
    stderr: "inherit",
  })
  if (!migrate.success) throw new Error("[e2e] migrations failed")
  // The app is auth-gated — the session cookie is sealed with a key derived from
  // the app secret. Random by default: the built server's secrets guard rejects
  // known placeholder values.
  const appSecret = process.env.NUXT_APP_SECRET || crypto.randomUUID() + crypto.randomUUID()
  serverProc = spawn(["node", ".output/server/index.mjs"], {
    env: {
      ...process.env,
      PORT: port,
      NITRO_PORT: port,
      LIBSQL_URL: libsqlUrl,
      NUXT_APP_SECRET: appSecret,
      NUXT_OPEN_REGISTRATION: "true",
      NUXT_DEMO_ENABLED: "true",
      NUXT_PUBLIC_ENABLE_ANALYTICS: "false",
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
// scoped to the /tmp/bun-chrome-* profiles bunwright spawns so we don't touch the
// user's own browser.
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
     
    console.error(`[e2e] captured failure screenshot: ${ARTIFACT_DIR}/${safe}.png`)
  } catch (err) {
     
    console.error("[e2e] failed to capture screenshot:", err)
  }
}

// Evaluate an expression in the page via CDP. Unlike page.evaluate(), this can
// take values from the test (interpolate them as JSON).
export async function evalJS<T>(page: Page, expression: string): Promise<T> {
  const res = (await page.cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })) as {
    result?: { value?: T }
  }
  return res.result?.value as T
}

/** Whether visible text containing `text` is on the page. */
export function hasText(page: Page, text: string): Promise<boolean> {
  return evalJS(page, `document.body.innerText.includes(${JSON.stringify(text)})`)
}

export async function waitForText(page: Page, text: string, timeout = 8_000): Promise<void> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await hasText(page, text)) return
    await page.waitForTimeout(250)
  }
  throw new Error(`[e2e] timed out waiting for text "${text}"`)
}

/** Click the innermost button-like element whose text contains `text`. */
export async function clickText(page: Page, text: string): Promise<void> {
  const clicked = await evalJS<boolean>(
    page,
    `(() => {
      const t = ${JSON.stringify(text)}
      const candidates = [...document.querySelectorAll('button, [role="button"], a')]
        .filter(el => el.textContent.includes(t) && el.getClientRects().length)
      const el = candidates.sort((a, b) => a.textContent.length - b.textContent.length)[0]
      el?.click()
      return !!el
    })()`,
  )
  if (!clicked) throw new Error(`[e2e] nothing clickable with text "${text}"`)
}
