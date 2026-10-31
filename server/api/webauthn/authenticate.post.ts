import { eq } from "drizzle-orm"
import { createError } from "nuxt/server"
import { credentials, users } from "../../db/schema"

// POST /api/webauthn/authenticate — sign in with any passkey on the account.
// Discoverable credentials: the browser offers the user's passkeys for this site,
// so no email is needed (and the conditional-UI autofill can be used).
export default defineWebAuthnAuthenticateEventHandler({
  async allowCredentials(_event, userName) {
    const [user] = await useDb().select({ id: users.id }).from(users).where(eq(users.email, userName)).limit(1)
    if (!user) return []
    return (await credentialsForUser(user.id)).map(c => ({ id: c.id, transports: parseTransports(c.transports) as never }))
  },

  async getCredential(_event, credentialId) {
    const [row] = await useDb().select().from(credentials).where(eq(credentials.id, credentialId)).limit(1)
    if (!row) throw createError({ status: 404, message: "No account uses this passkey. Try another, or sign in with your password." })
    return {
      id: row.id,
      publicKey: row.publicKey,
      counter: row.counter,
      backedUp: row.backedUp,
      transports: parseTransports(row.transports) as never,
      userId: row.userId,
    }
  },

  storeChallenge: (_event, challenge, attemptId) => storeChallenge(challenge, attemptId),
  getChallenge: (_event, attemptId) => takeChallenge(attemptId),

  async onSuccess(event, { credential, authenticationInfo }) {
    const db = useDb()
    const [user] = await db.select().from(users).where(eq(users.id, String(credential.userId))).limit(1)
    if (!user) throw createError({ status: 404, message: "No account uses this passkey" })

    await db
      .update(credentials)
      .set({
        counter: authenticationInfo.newCounter,
        backedUp: authenticationInfo.credentialBackedUp,
        lastUsedAt: new Date().toISOString(),
      })
      .where(eq(credentials.id, credential.id))

    await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  },
})
