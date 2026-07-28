import { defineConfig } from "drizzle-kit"

// Dialect is "turso" for libSQL (Turso is a libSQL host; the driver/dialect are
// the same for self-hosted sqld). Credentials come from env at migration time.
// Run migrations with `bun --bun drizzle-kit ...` — drizzle-kit otherwise fails to
// detect Bun's driver.
export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.LIBSQL_URL || "file:./.data/events.db",
    authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
  },
})
