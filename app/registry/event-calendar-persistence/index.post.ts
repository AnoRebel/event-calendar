import { randomUUID } from "node:crypto"
import { events } from "../../db/schema"
import { dtoToRow, rowToDto, type EventDTO } from "../../utils/eventMapper"
import { validateEventInput } from "../../utils/eventValidation"

// POST /api/events — create an event. Returns 201 with the persisted event.
export default defineEventHandler(async (event) => {
  // TODO(auth): require a session and set ownerId to the current user
  const body = await readBody<Partial<EventDTO>>(event)

  const errors = validateEventInput(body)
  if (errors.length) {
    throw createError({ statusCode: 400, statusMessage: "Invalid event", data: { errors } })
  }

  // TODO(features): gate recurring events if you flag them

  const now = new Date().toISOString()
  const row = {
    ...dtoToRow(body),
    // Server assigns the id; client-sent id/ownerId are ignored.
    id: randomUUID(),
    ownerId: null,
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
