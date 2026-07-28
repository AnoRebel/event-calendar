import { and, eq, gte, lte } from "drizzle-orm"
import { events } from "../../db/schema"
import { rowToDto } from "../../utils/eventMapper"

// GET /api/events?start=&end=&page=&limit=
// Returns a paginated envelope matching useEventAPI's PaginatedResponse shape.
// A row overlaps [start, end] when its start <= end AND its end >= start.
// Listing is scoped to the authenticated user.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const q = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(q.page ?? "1"), 10) || 1)
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(q.limit ?? "100"), 10) || 100))
  const start = typeof q.start === "string" ? q.start : undefined
  const end = typeof q.end === "string" ? q.end : undefined

  const db = useDb()

  const conditions = [eq(events.ownerId, user.id)]
  // Overlap filter (dates are ISO strings; lexical compare works for ISO-8601).
  if (end) conditions.push(lte(events.startDate, end))
  if (start) conditions.push(gte(events.endDate, start))

  const where = and(...conditions)

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
