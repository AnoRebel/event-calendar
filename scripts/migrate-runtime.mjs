// Runtime migration runner — applies the committed Drizzle SQL migrations against
// the configured libSQL database WITHOUT needing drizzle-kit at runtime. Used by
// the Docker entrypoint so a fresh (volume-backed) database self-initializes.
//
// Reads migrations from ./server/db/migrations (copied into the image) and tracks
// applied ones in a `__migrations` table so re-runs are idempotent.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@libsql/client"

const url = process.env.LIBSQL_URL || "file:./.data/events.db"
const authToken = process.env.LIBSQL_AUTH_TOKEN || undefined
const dir = process.env.MIGRATIONS_DIR || "./server/db/migrations"

const client = createClient(authToken ? { url, authToken } : { url })

await client.execute(
  "CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
)

const applied = new Set(
  (await client.execute("SELECT name FROM __migrations")).rows.map(r => String(r.name)),
)

const files = readdirSync(dir)
  .filter(f => f.endsWith(".sql"))
  .sort()

let count = 0
for (const file of files) {
  if (applied.has(file)) continue
  const sql = readFileSync(join(dir, file), "utf8")
  // drizzle separates statements with the `--> statement-breakpoint` marker.
  const statements = sql
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(Boolean)
  for (const stmt of statements) {
    await client.execute(stmt)
  }
  await client.execute({
    sql: "INSERT INTO __migrations (name, applied_at) VALUES (?, ?)",
    args: [file, new Date().toISOString()],
  })
  count++
  console.log(`[migrate] applied ${file}`)
}

console.log(count ? `[migrate] ${count} migration(s) applied.` : "[migrate] up to date.")
process.exit(0)
