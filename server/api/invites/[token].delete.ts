import { and, eq, isNull } from "drizzle-orm"
import { createError, defineEventHandler, getRouterParam, setResponseStatus } from "nuxt/server"
import { invites } from "../../db/schema"

// DELETE /api/invites/:token — revoke an unused invite you created.
export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const token = getRouterParam(event, "token") ?? ""
  const [deleted] = await useDb()
    .delete(invites)
    .where(and(eq(invites.token, token), eq(invites.createdBy, user.id), isNull(invites.usedBy)))
    .returning({ token: invites.token })
  if (!deleted) throw createError({ status: 404, message: "Invite not found or already used" })
  setResponseStatus(event, 204)
  return null
})
