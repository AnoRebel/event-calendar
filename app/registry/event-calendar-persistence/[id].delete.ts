import { eq } from "drizzle-orm"
import { events } from "../../db/schema"

// DELETE /api/events/:id — remove an event. 204 on success, 404 if missing.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing event id" })
  }

  const db = useDb()
  const [existing] = await db.select({ id: events.id, ownerId: events.ownerId }).from(events).where(eq(events.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  // TODO(auth): require a session; verify the caller owns this event (403 otherwise)

  const deleted = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id })
  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  await broadcastEventChange({ type: "deleted", id, ownerId: existing.ownerId ?? null })

  setResponseStatus(event, 204)
  return null
})
