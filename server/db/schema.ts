import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// Events table. Kept dialect-portable: only text/integer columns and the Drizzle
// query builder are used elsewhere, so moving to Postgres is a config + import
// change (drizzle-orm/pg-core) rather than a query rewrite.
//
// Dates are stored as ISO-8601 strings (text) rather than a DB-specific datetime
// type — portable across SQLite/libSQL and Postgres, and matches the wire format
// the client (useEventAPI) already sends/receives.
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  // Owner is added in the auth section; nullable until then so existing rows and
  // the seed remain valid.
  ownerId: text("owner_id"),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(), // ISO string
  endDate: text("end_date").notNull(), // ISO string
  startTime: text("start_time"),
  endTime: text("end_time"),
  allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  color: text("color"),
  location: text("location"),
  status: text("status"),
  timezone: text("timezone"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurringPattern: text("recurring_pattern"), // JSON string when present
  recurringId: text("recurring_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// Users. Sessions are sealed cookies (nuxt-auth-utils) and need no table — this
// is the only auth table the app owns. Password auth stores only a scrypt hash.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
})

// Invites. When registration is invite-only (the default), a valid unused,
// unexpired invite token is required to register. Created by an existing user.
export const invites = sqliteTable("invites", {
  token: text("token").primaryKey(),
  email: text("email"), // optional: restrict the invite to a specific email
  createdBy: text("created_by").notNull(),
  usedBy: text("used_by"), // set to the new user's id once consumed
  expiresAt: text("expires_at"), // ISO string; null = no expiry
  createdAt: text("created_at").notNull(),
})

export type EventRow = typeof events.$inferSelect
export type NewEventRow = typeof events.$inferInsert
export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
export type InviteRow = typeof invites.$inferSelect
export type NewInviteRow = typeof invites.$inferInsert
