import { desc, eq } from "drizzle-orm"
import { defineEventHandler, useRuntimeConfig } from "nuxt/server"
import { invites } from "../../db/schema"

// GET /api/invites — invites created by the signed-in user, newest first.
export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const rows = await useDb().select().from(invites).where(eq(invites.createdBy, user.id)).orderBy(desc(invites.createdAt))
  const now = new Date().toISOString()
  return {
    openRegistration: !!useRuntimeConfig().openRegistration,
    invites: rows.map(r => ({
      token: r.token,
      email: r.email,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      status: r.usedBy ? "used" : r.expiresAt && r.expiresAt < now ? "expired" : "active",
    })),
  }
})
