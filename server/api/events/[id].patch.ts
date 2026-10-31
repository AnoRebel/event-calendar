import { eq } from "drizzle-orm"
import { events } from "../../db/schema"
import { dtoToRow, rowToDto } from "../../utils/eventMapper"
import { UpdateEventSchema } from "#shared/schemas/event"
import { editEvent } from "#shared/utils/abilities"
import { createError, defineEventHandler, getRouterParam } from "nuxt/server"

// PATCH /api/events/:id — update an event. 401 unauthenticated, 403 non-owner,
// 404 if it doesn't exist.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ status: 400, message: "Missing event id" })
  }

  const body = await readValidated(event, UpdateEventSchema)

  if (body.isRecurring && !useServerFeatures().recurringEvents) {
    throw createError({ status: 403, message: "Recurring events are not enabled" })
  }

  const db = useDb()
  const [existing] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  if (!existing) {
    throw createError({ status: 404, message: "Event not found" })
  }

  // Ownership check (server-authoritative).
  await authorizeRequest(event, editEvent, { id, ownerId: existing.ownerId })

  const updates = {
    ...dtoToRow(body),
    updatedAt: new Date().toISOString(),
  }
  // Never let id/ownerId/createdAt be overwritten via the update path.
  delete (updates as Record<string, unknown>).id
  delete (updates as Record<string, unknown>).ownerId
  delete (updates as Record<string, unknown>).createdAt

  const [updated] = await db.update(events).set(updates).where(eq(events.id, id)).returning()
  if (!updated) throw createError({ status: 404, message: "Event not found" })
  const dto = rowToDto(updated)

  await broadcastEventChange({ type: "updated", event: dto })

  return dto
})
