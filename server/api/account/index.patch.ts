import { eq } from "drizzle-orm"
import { defineEventHandler } from "nuxt/server"
import { users } from "../../db/schema"
import { UpdateProfileSchema } from "#shared/schemas/auth"

// PATCH /api/account — update the display name (also refreshed in the session).
export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const { name } = await readValidated(event, UpdateProfileSchema)
  const value = name || null
  await useDb().update(users).set({ name: value }).where(eq(users.id, user.id))
  await setUserSession(event, { user: { ...user, name: value } })
  return { name: value }
})
