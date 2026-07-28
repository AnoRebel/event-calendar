import { and, gte, lte } from "drizzle-orm"
import { events } from "../../db/schema"
import { rowToDto } from "../../utils/eventMapper"

// GET /api/events?start=&end=&page=&limit=
// Returns a paginated envelope: { data, total, page, limit, hasMore }.
// A row overlaps [start, end] when its start <= end AND its end >= start.
//
// AUTH: this template returns ALL events (single-user). To scope events per user,
// resolve the user here (e.g. `const { user } = await requireUserSession(event)`)
// and add `eq(events.ownerId, user.id)` to the conditions below.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(q.page ?? "1"), 10) || 1)
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(q.limit ?? "100"), 10) || 100))
  const start = typeof q.start === "string" ? q.start : undefined
  const end = typeof q.end === "string" ? q.end : undefined

  const db = useDb()

  const conditions = []
  // TODO(auth): scope to the current user — conditions.push(eq(events.ownerId, user.id))
  if (end) conditions.push(lte(events.startDate, end))
  if (start) conditions.push(gte(events.endDate, start))

  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(events)
    .where(where)
    .limit(limit)
    .offset((page - 1) * limit)

  const total = await db.$count(events, where)

  return {
    data: rows.map(rowToDto),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  }
})
