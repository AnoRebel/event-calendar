import { eq } from "drizzle-orm"
import { users } from "../db/schema"
import { ensureDemoUser, reseedDemoEvents } from "../utils/demo"

// Scheduled task: reset the demo account's events back to the sample set so the
// public demo always looks tidy regardless of what visitors did. Scheduled in
// nuxt.config (nitro.scheduledTasks); no-op when demo mode is off.
export default defineTask({
  meta: {
    name: "demo:reset",
    description: "Reset the demo account's events to the sample data",
  },
  async run() {
    const { demo } = useRuntimeConfig()
    if (!demo?.enabled) return { result: "skipped: demo mode off" }

    const db = useDb()
    const email = demo.email.trim().toLowerCase()
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    const user = existing ?? (await ensureDemoUser())

    const n = await reseedDemoEvents(user.id)
    return { result: `demo events reset (${n})` }
  },
})
