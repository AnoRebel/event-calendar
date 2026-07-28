import { eq } from "drizzle-orm"
import { users } from "../../db/schema"

// POST /api/auth/login — verify credentials and start a session.
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<{ email?: string; password?: string }>(event)
  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: "Email and password are required" })
  }

  const db = useDb()
  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

  // Same error whether the account is missing or the password is wrong — don't
  // reveal which accounts exist.
  const invalid = () => createError({ statusCode: 401, statusMessage: "Invalid email or password" })
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
