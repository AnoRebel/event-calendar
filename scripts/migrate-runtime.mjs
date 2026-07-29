// Runtime migration runner — applies the committed Drizzle SQL migrations against
// the configured libSQL database WITHOUT needing drizzle-kit at runtime. Used by
// the Docker entrypoint so a fresh (volume-backed) database self-initializes.
//
// Reads migrations from ./server/db/migrations (copied into the image) and tracks
// applied ones in a `__migrations` table so re-runs are idempotent.
import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

// @libsql/client is bundled by Nitro under .output/server/node_modules (which is
// /app/server/node_modules in the container), NOT the top-level node_modules that
// a bare `import "@libsql/client"` would resolve. Resolve it explicitly so this
// script works whether run from a full checkout or the built server bundle.
async function loadLibsql() {
  const candidates = [
    "@libsql/client", // dev / full node_modules
    join(process.cwd(), "server/node_modules/@libsql/client/index.node.mjs"),
    join(process.cwd(), "server/node_modules/@libsql/client/lib-esm/node.js"),
    join(process.cwd(), "node_modules/@libsql/client/index.node.mjs"),
  ]
  for (const c of candidates) {
    try {
      if (c.startsWith("@")) return await import(c)
      if (existsSync(c)) return await import(pathToFileURL(c).href)
    } catch {
      // try next
    }
  }
  // Last resort: resolve the package dir and import its "main".
  const dir = join(process.cwd(), "server/node_modules/@libsql/client")
  if (existsSync(join(dir, "package.json"))) {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
    const entry = pkg.exports?.["."]?.import?.default || pkg.exports?.["."]?.import || pkg.module || pkg.main
    if (entry) return await import(pathToFileURL(join(dir, entry)).href)
  }
  throw new Error("[migrate] could not locate @libsql/client")
}

const { createClient } = await loadLibsql()

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
