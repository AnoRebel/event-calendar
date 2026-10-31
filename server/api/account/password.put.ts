import { eq } from "drizzle-orm"
import { createError, defineEventHandler } from "nuxt/server"
import { users } from "../../db/schema"
import { ChangePasswordSchema } from "#shared/schemas/auth"

// PUT /api/account/password — set a password (passkey-only accounts) or change it
// (the current password is required when one exists).
export default defineEventHandler(async event => {
  const { user: sessionUser } = await requireUserSession(event)
  const user = await requireAccount(sessionUser.id)
  if (isDemoAccount(user.email)) throw createError({ status: 403, message: "The shared demo account's password can't be changed" })

  const { currentPassword, newPassword } = await readValidated(event, ChangePasswordSchema)
  if (user.passwordHash) {
    const ok = currentPassword ? await verifyPassword(user.passwordHash, currentPassword) : false
    if (!ok) throw createError({ status: 400, message: "Your current password is incorrect" })
  }

  await useDb().update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, user.id))
  return { hasPassword: true }
})
