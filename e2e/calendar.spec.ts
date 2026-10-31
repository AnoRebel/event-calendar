import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  captureFailure,
  clickText,
  closeBrowser,
  ensureSignedIn,
  getPage,
  openApp,
  resetSignedIn,
  startServerIfNeeded,
  stopServer,
  hasText,
  waitForSel,
  waitForText,
} from "./setup"

// Core journeys against a running app, in order (they share one browser page).
// Launching the browser and hydrating take a few seconds, hence the timeouts.
const T = 60_000
const sel = (testId: string) => `css:[data-testid="${testId}"]`

beforeAll(async () => {
  await startServerIfNeeded()
}, 180_000)

afterAll(async () => {
  await closeBrowser()
  stopServer()
})

/** Run a step and keep a screenshot when it fails. */
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (err) {
    await captureFailure(await getPage(), name)
    throw err
  }
}

describe("authentication", () => {
  test("signs up with a password, signs out and signs back in", async () => {
    await step("password-auth", async () => {
      const page = await openApp("/login")
      await page.evaluate(() => {
        // Unique credentials, remembered for the sign-in half of the test.
        sessionStorage.setItem("e2e-email", `pw-${Date.now()}@example.com`)
      })
      await page.click(sel("mode-register"))
      await page.click(sel("toggle-password-signup"))
      await page.type("css:#register-name", "Pat Password")
      const email = await page.evaluate(() => sessionStorage.getItem("e2e-email")!)
      await page.type("css:#register-email", email)
      await page.type("css:#register-password", "password12345")
      await page.click(sel("register-submit"))
      await waitForSel(page, sel("add-event"), 15_000)

      // Sign out from the account page, then sign in with the password.
      await openApp("/account")
      await waitForSel(page, sel("account-sign-out"))
      await page.click(sel("account-sign-out"))
      await waitForSel(page, sel("password-signin"), 10_000)
      await page.type("css:#signin-email", email)
      await page.type("css:#signin-password", "password12345")
      await page.click(sel("password-signin"))
      await waitForSel(page, sel("add-event"), 15_000)
    })
  }, T)

  test("creates an account with a passkey and signs in with it", async () => {
    await step("passkey-auth", async () => {
      const page = await openApp("/account")
      if (await page.exists(sel("account-sign-out"))) {
        await page.click(sel("account-sign-out"))
        await waitForSel(page, sel("mode-register"), 10_000)
      }
      resetSignedIn()

      // A virtual platform authenticator stands in for Touch ID / Windows Hello.
      await page.cdp("WebAuthn.enable", { enableUI: false })
      await page.cdp("WebAuthn.addVirtualAuthenticator", {
        options: {
          protocol: "ctap2",
          transport: "internal",
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      })

      await openApp("/login")
      await page.click(sel("mode-register"))
      await page.type("css:#register-name", "Pat Passkey")
      await page.evaluate(() => sessionStorage.setItem("e2e-pk", `pk-${Date.now()}@example.com`))
      await page.type("css:#register-email", await page.evaluate(() => sessionStorage.getItem("e2e-pk")!))
      await page.click(sel("register-submit"))
      await waitForSel(page, sel("add-event"), 20_000)

      await openApp("/account")
      await waitForSel(page, sel("passkey-list"), 10_000)
      await page.click(sel("account-sign-out"))
      // The sign-in page offers passkeys through autofill; the virtual
      // authenticator answers that request on its own, so the user may already
      // be signed back in. Otherwise use the button.
      await page.waitForTimeout(2500)
      if (!(await page.exists(sel("add-event")))) {
        await waitForSel(page, sel("passkey-signin"), 10_000)
        await page.click(sel("passkey-signin"))
      }
      await waitForSel(page, sel("add-event"), 20_000)

      const email = await page.evaluate(() =>
        fetch("/api/_auth/session").then(r => r.json()).then(s => s.user?.email as string),
      )
      expect(email).toStartWith("pk-")
    })
  }, T)
})

describe("calendar", () => {
  test("switches views with the keyboard and the view switcher", async () => {
    await step("views", async () => {
      const page = await ensureSignedIn()
      const view = () => page.evaluate(() => document.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute("data-view"))
      for (const [key, expected] of [["w", "week"], ["d", "day"], ["a", "agenda"], ["m", "month"]] as const) {
        await page.press(key)
        await page.waitForTimeout(250)
        expect(await view()).toBe(expected)
      }
      await page.click('css:[data-view="week"]')
      await page.waitForTimeout(250)
      expect(await page.evaluate(() => location.search)).toContain("view=week")
    })
  }, T)

  test("creates, edits and deletes an event, persisting across reloads", async () => {
    await step("event-lifecycle", async () => {
      const page = await ensureSignedIn()
      await page.click(sel("add-event"))
      await waitForSel(page, "css:#title")
      await page.type("css:#title", "E2E planning")
      await page.click('css:button[type="submit"]')
      await waitForText(page, "E2E planning", 10_000)

      await page.reload()
      await page.waitForTimeout(1500)
      await page.press("a") // agenda lists every event as a button
      await waitForText(page, "E2E planning", 10_000)

      // Edit the title.
      await clickText(page, "E2E planning")
      await waitForSel(page, "css:#title")
      await page.evaluate(() => {
        const input = document.querySelector<HTMLInputElement>("#title")!
        input.value = ""
        input.dispatchEvent(new Event("input", { bubbles: true }))
      })
      await page.type("css:#title", "E2E retro")
      await page.click('css:button[type="submit"]')
      await waitForText(page, "E2E retro", 10_000)

      // Delete (two-step confirmation).
      await clickText(page, "E2E retro")
      await waitForSel(page, "css:#title")
      await clickText(page, "Delete")
      await clickText(page, "Confirm delete")
      await page.waitForTimeout(800)
      await page.reload()
      await page.waitForTimeout(1500)
      await page.press("a")
      await page.waitForTimeout(500)
      expect(await hasText(page, "E2E retro")).toBe(false)
    })
  }, T)

  test("drags an event to another time with real mouse input", async () => {
    await step("drag", async () => {
      const page = await ensureSignedIn()
      // Seed an event at 09:00 today through the API.
      await page.evaluate(() => {
        const start = new Date()
        start.setHours(9, 0, 0, 0)
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        return fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "Drag me", startDate: start.toISOString(), endDate: end.toISOString() }),
        }).then(r => r.status)
      })
      await openApp("/?view=day")
      await waitForText(page, "Drag me", 10_000)

      const box = await page.evaluate(() => {
        const el = [...document.querySelectorAll<HTMLElement>("[data-event-id]")].find(e => e.textContent?.includes("Drag me"))!
        el.scrollIntoView({ block: "center" })
        const r = el.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })
      await page.waitForTimeout(200)
      const mouse = (type: string, y: number, buttons = 1) =>
        page.cdp("Input.dispatchMouseEvent", { type, x: box.x, y, button: "left", buttons, clickCount: 1 })
      await mouse("mousePressed", box.y)
      for (let i = 1; i <= 12; i++) await mouse("mouseMoved", box.y + i * 10) // 120px = two hours
      await mouse("mouseReleased", box.y + 120, 0)
      await page.waitForTimeout(1000)

      const hour = await page.evaluate(() =>
        fetch("/api/events?limit=500")
          .then(r => r.json())
          .then(({ data }) => new Date(data.find((e: { title: string }) => e.title === "Drag me").startDate).getHours()),
      )
      expect(hour).toBe(11)
    })
  }, T)
})

describe("appearance and layout", () => {
  test("switching material persists across reloads", async () => {
    await step("appearance", async () => {
      const page = await ensureSignedIn()
      await page.click(sel("appearance-button"))
      await waitForSel(page, sel("appearance-dialog"))
      await page.click('css:label[data-material="tactile"]')
      await page.press("Escape")
      expect(await page.evaluate(() => document.documentElement.dataset.material)).toBe("tactile")
      await page.reload()
      await page.waitForTimeout(800)
      expect(await page.evaluate(() => document.documentElement.dataset.material)).toBe("tactile")
      // Put the default back for later runs.
      await page.evaluate(() => localStorage.removeItem("crystal-neuo:material"))
    })
  }, T)

  test("phones get the tab bar and no horizontal scrolling", async () => {
    await step("phone-layout", async () => {
      const page = await ensureSignedIn()
      await page.resize(375, 812)
      for (const path of ["/", "/account", "/docs"]) {
        await openApp(path)
        await page.waitForTimeout(600)
        expect(await page.exists(sel("tab-bar"))).toBe(true)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      await page.resize(1280, 860)
    })
  }, T)
})
