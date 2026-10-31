import { eq } from "drizzle-orm"
import { events } from "../../db/schema"
import { deleteEvent as canDeleteEvent } from "#shared/utils/abilities"
import { createError, defineEventHandler, getRouterParam, setResponseStatus } from "nuxt/server"

// DELETE /api/events/:id — remove an event. 401 unauthenticated, 403 non-owner,
// 204 on success, 404 if missing.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ status: 400, message: "Missing event id" })
  }

  const db = useDb()
  const [existing] = await db.select({ id: events.id, ownerId: events.ownerId }).from(events).where(eq(events.id, id)).limit(1)
  if (!existing) {
    throw createError({ status: 404, message: "Event not found" })
  }

  await authorizeRequest(event, canDeleteEvent, { id: existing.id, ownerId: existing.ownerId })

  const deleted = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id })
  if (deleted.length === 0) {
    throw createError({ status: 404, message: "Event not found" })
  }

  await broadcastEventChange({ type: "deleted", id, ownerId: existing.ownerId })

  setResponseStatus(event, 204)
  return null
})
