import { eq } from "drizzle-orm"
import { events } from "../../db/schema"
import { ensureDemoUser, reseedDemoEvents } from "../../utils/demo"

// POST /api/auth/demo — one-click sign-in to the shared demo account. Creates the
// account on first use and seeds sample events if it has none, then starts a
// session. Only available when demo mode is enabled.
export default defineEventHandler(async (event) => {
  const { demo } = useRuntimeConfig()
  if (!demo?.enabled) {
    throw createError({ statusCode: 404, statusMessage: "Demo mode is not enabled" })
  }

  const user = await ensureDemoUser()

  // Seed sample events if the demo account is empty (e.g. right after a reset).
  const count = await useDb().$count(events, eq(events.ownerId, user.id))
  if (count === 0) {
    await reseedDemoEvents(user.id)
  }

  await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  return { user: { id: user.id, email: user.email, name: user.name } }
})
