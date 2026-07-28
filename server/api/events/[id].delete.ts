import { eq } from "drizzle-orm"
import { events } from "../../db/schema"
import { deleteEvent as canDeleteEvent } from "../../../shared/utils/abilities"

// DELETE /api/events/:id — remove an event. 401 unauthenticated, 403 non-owner,
// 204 on success, 404 if missing.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing event id" })
  }

  const db = useDb()
  const [existing] = await db.select({ id: events.id, ownerId: events.ownerId }).from(events).where(eq(events.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  await authorize(event, canDeleteEvent, { id: existing.id, ownerId: existing.ownerId })

  const deleted = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id })
  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  await broadcastEventChange({ type: "deleted", id, ownerId: existing.ownerId })

  setResponseStatus(event, 204)
  return null
})
