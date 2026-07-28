// Dev seed: inserts a handful of sample events so a fresh local database isn't
// empty. Mirrors the demo events that used to be hardcoded in app.vue. Safe to
// re-run — it upserts by id.
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { addDays, setHours, setMinutes, subDays } from "date-fns"
import * as schema from "../server/db/schema"

const url = process.env.LIBSQL_URL || "file:./.data/events.db"
const authToken = process.env.LIBSQL_AUTH_TOKEN || undefined
const client = createClient(authToken ? { url, authToken } : { url })
const db = drizzle(client, { schema })

const now = new Date()
const iso = (d: Date) => d.toISOString()
const nowIso = now.toISOString()

const samples = [
  {
    id: "seed-1",
    title: "Team Standup",
    description: "Daily team synchronization meeting",
    startDate: iso(setMinutes(setHours(now, 9), 0)),
    endDate: iso(setMinutes(setHours(now, 9), 30)),
    color: "sky",
    location: "Conference Room A",
  },
  {
    id: "seed-2",
    title: "Client Presentation",
    description: "Present project proposal to potential client",
    startDate: iso(setMinutes(setHours(now, 14), 0)),
    endDate: iso(setMinutes(setHours(now, 15), 30)),
    color: "emerald",
    location: "Client Office Downtown",
  },
  {
    id: "seed-3",
    title: "Annual Planning",
    description: "Strategic planning session for next year",
    startDate: iso(subDays(now, 2)),
    endDate: iso(subDays(now, 2)),
    allDay: true,
    color: "sky",
    location: "Main Conference Hall",
  },
  {
    id: "seed-4",
    title: "Lunch with Client",
    description: "Discuss new project requirements",
    startDate: iso(setMinutes(setHours(addDays(now, 1), 12), 0)),
    endDate: iso(setMinutes(setHours(addDays(now, 1), 13), 15)),
    color: "emerald",
    location: "Downtown Cafe",
    status: "tentative",
  },
  {
    id: "seed-5",
    title: "Product Launch Campaign",
    description: "Comprehensive product launch",
    startDate: iso(addDays(now, 3)),
    endDate: iso(addDays(now, 6)),
    allDay: true,
    color: "violet",
    location: "Multiple Locations",
  },
]

for (const s of samples) {
  await db
    .insert(schema.events)
    .values({
      id: s.id,
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
    .onConflictDoNothing()
}

const count = await db.$count(schema.events)
console.log(`Seeded. events table now has ${count} rows.`)
process.exit(0)
