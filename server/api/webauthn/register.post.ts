import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import * as v from "valibot"
import { createError, getRequestHeader } from "nuxt/server"
import { credentials, users } from "../../db/schema"
import { PasskeyUserSchema, type PasskeyUserInput } from "#shared/schemas/auth"

// POST /api/webauthn/register — two uses, one endpoint:
//   - signed out: create an account with a passkey (registration policy applies);
//   - signed in: add a passkey to the current account.
export default defineWebAuthnRegisterEventHandler<PasskeyUserInput & { userName: string }>({
  async validateUser(body, event) {
    const result = v.safeParse(PasskeyUserSchema, body)
    if (!result.success) throw createError({ status: 400, message: result.issues[0]?.message ?? "Invalid details" })
    const user = result.output

    const session = await getUserSession(event)
    if (session.user) {
      if (session.user.email !== user.userName) {
        throw createError({ status: 400, message: "Passkeys can only be added to the signed-in account" })
      }
      if (isDemoAccount(session.user.email)) {
        throw createError({ status: 403, message: "The shared demo account cannot add passkeys" })
      }
    } else {
      await assertRegistrationAllowed(user.userName, user.inviteToken)
    }
    return { ...user, displayName: user.displayName || user.userName }
  },

  // Stop the authenticator from creating a second passkey for the same account.
  async excludeCredentials(_event, userName) {
    const [user] = await useDb().select({ id: users.id }).from(users).where(eq(users.email, userName)).limit(1)
    if (!user) return []
    const existing = await credentialsForUser(user.id)
    return existing.map(c => ({ id: c.id, transports: parseTransports(c.transports) as never }))
  },

  getOptions() {
    // Discoverable credentials so sign-in needs no email; prefer user verification.
    return {
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
      attestationType: "none",
    }
  },

  storeChallenge: (_event, challenge, attemptId) => storeChallenge(challenge, attemptId),
  getChallenge: (_event, attemptId) => takeChallenge(attemptId),

  async onSuccess(event, { credential, user }) {
    const db = useDb()
    const now = new Date().toISOString()
    const session = await getUserSession(event)
    const passkey = {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      backedUp: credential.backedUp,
      transports: JSON.stringify(credential.transports ?? []),
      aaguid: credential.aaguid ?? null,
      name: defaultPasskeyName(getRequestHeader(event, "user-agent")),
      createdAt: now,
      lastUsedAt: now,
    }

    if (session.user) {
      await db.insert(credentials).values({ ...passkey, userId: session.user.id })
      return { added: true }
    }

    // New account. Re-check the policy: the account may have been created (or the
    // invite used) between the two halves of the ceremony.
    const invite = await assertRegistrationAllowed(user.userName, user.inviteToken)
    const id = randomUUID()
    const name = user.displayName && user.displayName !== user.userName ? user.displayName : null
    await db.insert(users).values({ id, email: user.userName, name, passwordHash: null, createdAt: now })
    await db.insert(credentials).values({ ...passkey, userId: id })
    await consumeInvite(invite, id)
    await setUserSession(event, { user: { id, email: user.userName, name } })
    return { created: true }
  },
})
