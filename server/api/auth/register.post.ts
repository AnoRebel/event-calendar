import { randomUUID } from "node:crypto"
import { and, eq, isNull, ne } from "drizzle-orm"
import { invites, users } from "../../db/schema"
import { RegisterSchema } from "#shared/schemas/auth"

// POST /api/auth/register — create an account and start a session.
//
// Registration policy (runtimeConfig.openRegistration):
//   - open:   anyone may register.
//   - closed (default, invite/seed-only): requires a valid, unused, unexpired
//     invite token — EXCEPT the very first user (bootstrap) when there are no
//     users yet, so a fresh deployment can create its initial account.
export default defineEventHandler(async (event) => {
  // Schema trims + lowercases the email and enforces the password length.
  const { email: normalizedEmail, password, name, inviteToken } = await readValidated(event, RegisterSchema)

  const db = useDb()
  const { openRegistration, demo } = useRuntimeConfig()

  // Determine whether this registration is allowed and, if via an invite, which
  // one to consume.
  let inviteToConsume: string | null = null

  if (!openRegistration) {
    // The demo account does NOT count toward bootstrap, so the first REAL human
    // signup can still claim admin even after the demo user has been created.
    const demoEmail = demo?.email?.trim().toLowerCase() || ""
    const realUserCount = await db.$count(users, ne(users.email, demoEmail))
    const isBootstrap = realUserCount === 0

    if (!isBootstrap) {
      if (!inviteToken) {
        throw createError({ statusCode: 403, statusMessage: "Registration is invite-only" })
      }
      const now = new Date().toISOString()
      const [invite] = await db
        .select()
        .from(invites)
        .where(and(eq(invites.token, inviteToken), isNull(invites.usedBy)))
        .limit(1)

      const invalid = () => createError({ statusCode: 403, statusMessage: "Invalid or expired invite" })
      if (!invite) throw invalid()
      if (invite.expiresAt && invite.expiresAt < now) throw invalid()
      if (invite.email && invite.email.toLowerCase() !== normalizedEmail) throw invalid()

      inviteToConsume = invite.token
    }
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1)
  if (existing.length > 0) {
    // Avoid revealing that the account exists beyond what registration requires.
    throw createError({ statusCode: 409, statusMessage: "Unable to register with those details" })
  }

  const id = randomUUID()
  const passwordHash = await hashPassword(password)

  await db.insert(users).values({
    id,
    email: normalizedEmail,
    name: name?.trim() || null,
    passwordHash,
    createdAt: new Date().toISOString(),
  })

  // Consume the invite (best-effort; the user is already created).
  if (inviteToConsume) {
    await db.update(invites).set({ usedBy: id }).where(eq(invites.token, inviteToConsume))
  }

  await setUserSession(event, { user: { id, email: normalizedEmail, name: name?.trim() || null } })
  return { user: { id, email: normalizedEmail, name: name?.trim() || null } }
})
