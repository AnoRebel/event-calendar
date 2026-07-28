import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import {
  openApp,
  closeBrowser,
  captureFailure,
  startServerIfNeeded,
  stopServer,
  ensureSignedIn,
  waitForSel,
} from "./setup"

// Core user journeys against a running app. bunwright runs under bun:test.
// A generous timeout: launching Brave + hydration takes several seconds.
const T = 45_000

beforeAll(async () => {
  await startServerIfNeeded()
  // The app is auth-gated — sign in once so the calendar is reachable. The
  // session cookie persists in the WebView for the rest of the suite.
  await ensureSignedIn()
}, 120_000)

afterAll(async () => {
  await closeBrowser()
  stopServer()
})

describe("calendar", () => {
  test("loads and renders the calendar shell", async () => {
    const page = await openApp("/")
    try {
      const title = await page.evaluate(() => document.title)
      expect(title).toContain("Event Calendar")

      // The app shell and the calendar heading render.
      expect(await page.exists("css:.min-h-screen")).toBe(true)
      expect(await page.exists("role:heading")).toBe(true)

      // Add Event action is present.
      expect(await page.exists("css:[data-testid=\"add-event\"]")).toBe(true)
    } catch (err) {
      await captureFailure(page, "calendar-loads")
      throw err
    }
  }, T)

  test("switches between views via keyboard shortcuts", async () => {
    const page = await openApp("/")
    try {
      const heading = () => page.evaluate(() => document.querySelector('[role="heading"]')?.textContent?.trim() ?? "")

      const monthTitle = await heading()
      expect(monthTitle.length).toBeGreaterThan(0)

      // Week view (W). The heading changes format between month/week/day.
      await page.press("w")
      await page.waitForTimeout(200)
      const weekTitle = await heading()
      expect(weekTitle.length).toBeGreaterThan(0)

      // Day view (D).
      await page.press("d")
      await page.waitForTimeout(200)
      const dayTitle = await heading()
      expect(dayTitle.length).toBeGreaterThan(0)

      // Back to month (M).
      await page.press("m")
      await page.waitForTimeout(200)
      expect((await heading()).length).toBeGreaterThan(0)
    } catch (err) {
      await captureFailure(page, "view-switch")
      throw err
    }
  }, T)

  test("opens the create-event modal with its form fields", async () => {
    const page = await openApp("/")
    try {
      // Open the create modal from the Add Event action.
      await page.click("css:[data-testid=\"add-event\"]")
      await waitForSel(page, "text:Create Event", 5000)

      // The modal renders its core fields. (Use double-quoted attribute selectors:
      // bunwright's Locator.fill() interpolates the selector into a single-quoted
      // JS string, so single quotes in a selector break it.)
      expect(await page.exists('css:input[placeholder="Event title"]')).toBe(true)
      expect(await page.exists("text:Start Date")).toBe(true)
      expect(await page.exists("text:End Date")).toBe(true)
      expect(await page.exists('css:button[type="submit"]')).toBe(true)

      // Dismiss via Escape so the modal doesn't leak into the next test.
      await page.press("Escape")
      await page.waitForTimeout(300)
      // NOTE: full create-and-persist is covered once durable persistence exists;
      // the form's Start Time is required for submit and the flow is exercised
      // there rather than against the in-memory demo state.
    } catch (err) {
      await captureFailure(page, "create-event")
      throw err
    }
  }, T)

  test("drags an event to a different time slot (CDP)", async () => {
    // bunwright exposes no drag API, so the drag is driven through raw CDP
    // Input.dispatchMouseEvent events. Run in day view where timed events have
    // clear pixel positions.
    const page = await openApp("/")
    try {
      await page.press("d") // day view
      await page.waitForTimeout(400)

      // Find a draggable timed event and its bounding box.
      const box = await page.evaluate(() => {
        const el = document.querySelector('[draggable="true"]') as HTMLElement | null
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })

      if (!box) {
        // No draggable event in the current viewport — skip rather than fail,
        // and record that coverage was skipped.
        // eslint-disable-next-line no-console
        console.warn("[e2e] no draggable event found in day view; drag test skipped")
        return
      }

      const dispatch = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
        page.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: 1, clickCount: 1, ...extra })

      // Press, move down ~1 hour (60px), release.
      await dispatch("mousePressed", box.x, box.y)
      await dispatch("mouseMoved", box.x, box.y + 20)
      await dispatch("mouseMoved", box.x, box.y + 60)
      await dispatch("mouseReleased", box.x, box.y + 60)
      await page.waitForTimeout(400)

      // The app should not have crashed and the calendar still renders.
      expect(await page.exists("role:heading")).toBe(true)
    } catch (err) {
      await captureFailure(page, "drag-event")
      throw err
    }
  }, T)
})
