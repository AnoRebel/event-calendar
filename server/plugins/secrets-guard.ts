// Fails startup in production if the session secret is missing or too weak.
// NUXT_SESSION_PASSWORD seals the auth session cookie; a weak value would let
// sessions be forged.
export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== "production") return

  const problems: string[] = []

  const sessionPw = process.env.NUXT_SESSION_PASSWORD || ""
  if (sessionPw.length < 32) {
    problems.push("NUXT_SESSION_PASSWORD must be set to a random string of at least 32 characters")
  }

  // Guard against known placeholder session secrets.
  const PLACEHOLDER_SESSION = new Set(["change-me", "e2e-test-session-password-at-least-32chars"])
  if (PLACEHOLDER_SESSION.has(sessionPw)) {
    problems.push("NUXT_SESSION_PASSWORD is a placeholder/test value — set a real secret")
  }

  if (problems.length) {
    // Throwing here aborts server startup.
    throw new Error(`[secrets-guard] Refusing to start:\n  - ${problems.join("\n  - ")}`)
  }
})
