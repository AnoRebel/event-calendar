import { randomUUID } from "node:crypto"
import { events } from "../../db/schema"
import { dtoToRow, rowToDto } from "../../utils/eventMapper"
import { CreateEventSchema } from "#shared/schemas/event"

// POST /api/events — create an event. Returns 201 with the persisted event.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readValidated(event, CreateEventSchema)

  // Reject recurring events when the feature is disabled (don't rely on hidden UI).
  if (body.isRecurring && !useServerFeatures().recurringEvents) {
    throw createError({ statusCode: 403, statusMessage: "Recurring events are not enabled" })
  }

  const now = new Date().toISOString()
  const row = {
    ...dtoToRow(body),
    // Server assigns the id and owner; client-sent id/ownerId are ignored.
    id: randomUUID(),
    ownerId: user.id,
    isRecurring: !!body.isRecurring,
    allDay: !!body.allDay,
    createdAt: now,
    updatedAt: now,
  } as typeof events.$inferInsert

  const db = useDb()
  const [created] = await db.insert(events).values(row).returning()

  setResponseStatus(event, 201)
  const dto = rowToDto(created)

  // Broadcast to connected clients only after a successful write.
  await broadcastEventChange({ type: "created", event: dto })

  return dto
})
