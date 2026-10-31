import { desc, eq } from "drizzle-orm"
import { defineEventHandler } from "nuxt/server"
import { credentials } from "../../db/schema"

// GET /api/account — the signed-in user's profile and passkeys.
export default defineEventHandler(async event => {
  const { user: sessionUser } = await requireUserSession(event)
  const user = await requireAccount(sessionUser.id)
  const passkeys = await useDb()
    .select({
      id: credentials.id,
      name: credentials.name,
      backedUp: credentials.backedUp,
      createdAt: credentials.createdAt,
      lastUsedAt: credentials.lastUsedAt,
    })
    .from(credentials)
    .where(eq(credentials.userId, user.id))
    .orderBy(desc(credentials.createdAt))

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    hasPassword: !!user.passwordHash,
    isDemo: isDemoAccount(user.email),
    passkeys,
  }
})
