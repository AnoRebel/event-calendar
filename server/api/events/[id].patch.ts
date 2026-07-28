import { eq } from "drizzle-orm"
import { events } from "../../db/schema"
import { dtoToRow, rowToDto, type EventDTO } from "../../utils/eventMapper"
import { validateEventInput } from "../../utils/eventValidation"
import { editEvent } from "../../../shared/utils/abilities"

// PATCH /api/events/:id — update an event. 401 unauthenticated, 403 non-owner,
// 404 if it doesn't exist.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing event id" })
  }

  const body = await readBody<Partial<EventDTO>>(event)
  const errors = validateEventInput(body, { partial: true })
  if (errors.length) {
    throw createError({ statusCode: 400, statusMessage: "Invalid event", data: { errors } })
  }

  if (body.isRecurring && !useServerFeatures().recurringEvents) {
    throw createError({ statusCode: 403, statusMessage: "Recurring events are not enabled" })
  }

  const db = useDb()
  const existing = await db.select().from(events).where(eq(events.id, id)).limit(1)
  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  // Ownership check (server-authoritative).
  await authorize(event, editEvent, { id, ownerId: existing[0].ownerId })

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
