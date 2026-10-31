import { defineNitroPlugin } from "nitropack/runtime"

// Fails startup in production if the app secret is missing or too weak.
// NUXT_APP_SECRET is Nuxt's root secret: nuxt-auth-utils derives the key that
// seals the session cookie from it, so a weak value would let sessions be forged.
const PLACEHOLDERS = new Set(["change-me", "e2e-test-app-secret-at-least-32-characters"])

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== "production") return

  const problems: string[] = []
  const secret = process.env.NUXT_APP_SECRET || ""

  if (secret.length < 32) {
    problems.push("NUXT_APP_SECRET must be set to a random string of at least 32 characters (openssl rand -base64 32)")
  }
  if (PLACEHOLDERS.has(secret)) {
    problems.push("NUXT_APP_SECRET is a placeholder/test value — set a real secret")
  }
  if (process.env.NUXT_SESSION_PASSWORD && !secret) {
    problems.push("NUXT_SESSION_PASSWORD is no longer used — rename it to NUXT_APP_SECRET")
  }

  if (problems.length) {
    // Throwing here aborts server startup.
    throw new Error(`[secrets-guard] Refusing to start:\n  - ${problems.join("\n  - ")}`)
  }
})
