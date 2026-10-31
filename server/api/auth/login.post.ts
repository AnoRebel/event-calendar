import { eq } from "drizzle-orm"
import { users } from "../../db/schema"
import { LoginSchema } from "#shared/schemas/auth"
import { createError, defineEventHandler } from "nuxt/server"

// POST /api/auth/login — verify credentials and start a session.
export default defineEventHandler(async (event) => {
  const { email: normalizedEmail, password } = await readValidated(event, LoginSchema)

  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

  // Same error whether the account is missing or the password is wrong — don't
  // reveal which accounts exist.
  const invalid = () => createError({ status: 401, message: "Invalid email or password" })
  if (!user) {
    // Still run a verify to reduce timing signal.
    await verifyPassword("$scrypt$placeholder", password).catch(() => false)
    throw invalid()
  }

  const ok = await verifyPassword(user.passwordHash, password)
  if (!ok) throw invalid()

  await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  return { user: { id: user.id, email: user.email, name: user.name } }
})
