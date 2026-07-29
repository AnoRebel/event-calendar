import { randomUUID } from "node:crypto"
import { addDays, setHours, setMinutes, subDays, startOfDay } from "date-fns"
import { eq } from "drizzle-orm"
import { events, users } from "../db/schema"

// The demo account and its sample data. ensureDemoUser() creates the user if
// needed; reseedDemoEvents() wipes and repopulates its events (used on login and
// by the scheduled reset task) so the demo always looks fresh.

export async function ensureDemoUser(): Promise<{ id: string; email: string; name: string }> {
  const { demo } = useRuntimeConfig()
  const db = useDb()
  const email = demo.email.trim().toLowerCase()

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return { id: existing.id, email: existing.email, name: existing.name || "Demo" }
  }

  const id = randomUUID()
  await db.insert(users).values({
    id,
    email,
    name: "Demo",
    passwordHash: await hashPassword(demo.password),
    createdAt: new Date().toISOString(),
  })
  return { id, email, name: "Demo" }
}

// Replace the demo user's events with a fresh set of dummy data anchored to today.
export async function reseedDemoEvents(ownerId: string): Promise<number> {
  const db = useDb()
  await db.delete(events).where(eq(events.ownerId, ownerId))

  const now = new Date()
  const iso = (d: Date) => d.toISOString()
  const nowIso = now.toISOString()

  const samples: Array<Partial<typeof events.$inferInsert> & { title: string; startDate: string; endDate: string }> = [
    { title: "Team Standup", startDate: iso(setMinutes(setHours(now, 9), 0)), endDate: iso(setMinutes(setHours(now, 9), 30)), color: "sky", location: "Conference Room A", description: "Daily sync" },
    { title: "Design Review", startDate: iso(setMinutes(setHours(now, 11), 0)), endDate: iso(setMinutes(setHours(now, 12), 0)), color: "violet", location: "Studio" },
    { title: "Lunch & Learn", startDate: iso(setMinutes(setHours(now, 13), 0)), endDate: iso(setMinutes(setHours(now, 14), 0)), color: "amber", location: "Kitchen" },
    { title: "1:1 with Manager", startDate: iso(setMinutes(setHours(now, 15), 30)), endDate: iso(setMinutes(setHours(now, 16), 0)), color: "emerald", status: "tentative" },
    { title: "Client Call", startDate: iso(setMinutes(setHours(addDays(now, 1), 10), 0)), endDate: iso(setMinutes(setHours(addDays(now, 1), 11), 0)), color: "rose", location: "Zoom" },
    { title: "Sprint Planning", startDate: iso(setMinutes(setHours(addDays(now, 1), 14), 0)), endDate: iso(setMinutes(setHours(addDays(now, 1), 15), 30)), color: "sky" },
    { title: "Product Launch", startDate: iso(startOfDay(addDays(now, 3))), endDate: iso(startOfDay(addDays(now, 5))), allDay: true, color: "violet", location: "Everywhere" },
    { title: "Retro", startDate: iso(setMinutes(setHours(subDays(now, 2), 16), 0)), endDate: iso(setMinutes(setHours(subDays(now, 2), 17), 0)), color: "orange" },
    { title: "Conference", startDate: iso(startOfDay(addDays(now, 7))), endDate: iso(startOfDay(addDays(now, 9))), allDay: true, color: "emerald", location: "Convention Center" },
    { title: "Focus Time", startDate: iso(setMinutes(setHours(now, 16), 30)), endDate: iso(setMinutes(setHours(now, 18), 0)), color: "amber", description: "Deep work" },
  ]

  for (const s of samples) {
    await db.insert(events).values({
      id: randomUUID(),
      ownerId,
      title: s.title,
      description: s.description,
      startDate: s.startDate,
      endDate: s.endDate,
      allDay: s.allDay ?? false,
      color: s.color,
      location: s.location,
      status: s.status,
      isRecurring: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  }

  return samples.length
}
