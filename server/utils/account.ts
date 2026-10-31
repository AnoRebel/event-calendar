import { eq } from "drizzle-orm"
import { createError } from "nuxt/server"
import { users } from "../db/schema"

/** The signed-in user's row, or a 401 when the session points at nothing. */
export async function requireAccount(userId: string) {
  const [user] = await useDb().select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw createError({ status: 401, message: "Your account no longer exists" })
  return user
}
