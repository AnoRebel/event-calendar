import { and, eq, isNull, ne } from "drizzle-orm"
import { createError, useRuntimeConfig } from "nuxt/server"
import { invites, users } from "../db/schema"

// The registration policy, shared by password and passkey sign-up.
//
//   - open (NUXT_OPEN_REGISTRATION=true): anyone may register.
//   - invite-only (default): a valid, unused, unexpired invite is required —
//     except for the very first real account (bootstrap) on an empty database.
//
// Returns the invite to consume once the account exists (null when none is needed).
export async function assertRegistrationAllowed(email: string, inviteToken?: string | null): Promise<string | null> {
  const db = useDb()
  const { openRegistration, demo } = useRuntimeConfig()

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    // Deliberately vague: registration should not confirm which emails exist.
    throw createError({ status: 409, message: "Unable to register with those details" })
  }

  if (openRegistration) return null

  // The shared demo account never counts towards bootstrap.
  const demoEmail = demo?.email?.trim().toLowerCase() || ""
  const realUsers = await db.$count(users, ne(users.email, demoEmail))
  if (realUsers === 0) return null

  if (!inviteToken) throw createError({ status: 403, message: "Registration is invite-only" })

  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, inviteToken.trim()), isNull(invites.usedBy)))
    .limit(1)
  const now = new Date().toISOString()
  if (!invite || (invite.expiresAt && invite.expiresAt < now) || (invite.email && invite.email.toLowerCase() !== email)) {
    throw createError({ status: 403, message: "Invalid or expired invite" })
  }
  return invite.token
}

export async function consumeInvite(token: string | null, userId: string) {
  if (!token) return
  await useDb().update(invites).set({ usedBy: userId }).where(eq(invites.token, token))
}

/** Whether this account is the shared demo account (which cannot change credentials). */
export function isDemoAccount(email: string | null | undefined) {
  const { demo } = useRuntimeConfig()
  return !!demo?.enabled && !!email && email.toLowerCase() === demo.email.trim().toLowerCase()
}
