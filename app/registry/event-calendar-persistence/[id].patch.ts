import { eq } from "drizzle-orm"
import { events } from "../../db/schema"
import { dtoToRow, rowToDto, type EventDTO } from "../../utils/eventMapper"
import { validateEventInput } from "../../utils/eventValidation"

// PATCH /api/events/:id — update an event. 404 if it doesn't exist.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing event id" })
  }

  const body = await readBody<Partial<EventDTO>>(event)
  const errors = validateEventInput(body, { partial: true })
  if (errors.length) {
    throw createError({ statusCode: 400, statusMessage: "Invalid event", data: { errors } })
  }

  const db = useDb()
  const existing = await db.select().from(events).where(eq(events.id, id)).limit(1)
  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  // TODO(auth): require a session; verify the caller owns this event (403 otherwise)

  const updates = {
    ...dtoToRow(body),
    updatedAt: new Date().toISOString(),
  }
  // Never let id/ownerId/createdAt be overwritten via the update path.
  delete (updates as Record<string, unknown>).id
  delete (updates as Record<string, unknown>).ownerId
  delete (updates as Record<string, unknown>).createdAt

  const [updated] = await db.update(events).set(updates).where(eq(events.id, id)).returning()
  const dto = rowToDto(updated)

  await broadcastEventChange({ type: "updated", event: dto })

  return dto
})
