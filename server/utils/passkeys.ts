import { addMinutes } from "date-fns"
import { eq, lt } from "drizzle-orm"
import { createError } from "nuxt/server"
import { credentials, webauthnChallenges } from "../db/schema"

const CHALLENGE_TTL_MINUTES = 5

// WebAuthn challenges are single use and short-lived. They live in the database
// so every server instance can verify them.
export async function storeChallenge(challenge: string, attemptId: string) {
  const db = useDb()
  const now = new Date()
  // Opportunistic cleanup of abandoned attempts.
  await db.delete(webauthnChallenges).where(lt(webauthnChallenges.expiresAt, now.toISOString()))
  await db.insert(webauthnChallenges).values({
    attemptId,
    challenge,
    expiresAt: addMinutes(now, CHALLENGE_TTL_MINUTES).toISOString(),
  })
}

export async function takeChallenge(attemptId: string): Promise<string> {
  const db = useDb()
  // Delete-and-return makes the challenge single use even under concurrent requests.
  const [row] = await db.delete(webauthnChallenges).where(eq(webauthnChallenges.attemptId, attemptId)).returning()
  if (!row || row.expiresAt < new Date().toISOString()) {
    throw createError({ status: 400, message: "This passkey request expired. Please try again." })
  }
  return row.challenge
}

/** A readable default name for a new passkey, from the browser's user agent. */
export function defaultPasskeyName(userAgent: string | null | undefined): string {
  const ua = userAgent || ""
  const platform = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone or iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "This device"
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : ""
  return browser ? `${platform} · ${browser}` : platform
}

export async function credentialsForUser(userId: string) {
  return useDb().select().from(credentials).where(eq(credentials.userId, userId))
}

export const parseTransports = (value: string | null) => {
  try {
    return value ? (JSON.parse(value) as string[]) : []
  } catch {
    return []
  }
}
