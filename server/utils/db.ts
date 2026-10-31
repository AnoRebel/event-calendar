import { createClient, type Client } from "@libsql/client"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import * as schema from "../db/schema"
import { createError, useRuntimeConfig } from "nuxt/server"

// Single lazily-created libSQL client + Drizzle instance per server process.
// The connection URL/token come from runtimeConfig (runtime-configurable). For a
// self-hosted sqld with no auth, the token is empty and omitted.
let _client: Client | null = null
let _db: LibSQLDatabase | null = null

export function useDb(): LibSQLDatabase {
  if (_db) return _db

  const { libsql } = useRuntimeConfig()
  const url = libsql?.url
  if (!url) {
    throw createError({ status: 500, message: "libSQL URL is not configured" })
  }

  _client = createClient(
    libsql.authToken ? { url, authToken: libsql.authToken } : { url },
  )
  // drizzle-orm 1.x: the client is passed in the config object. Callers import
  // table objects directly (the relational `db.query` API is not used).
  _db = drizzle({ client: _client })
  return _db
}

// Raw client — used by the health check for a lightweight connectivity probe.
export function useDbClient(): Client {
  useDb()
  return _client as Client
}

export { schema }
