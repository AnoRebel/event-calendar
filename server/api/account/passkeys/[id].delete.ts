import { and, eq } from "drizzle-orm"
import { createError, defineEventHandler, getRouterParam, setResponseStatus } from "nuxt/server"
import { credentials } from "../../../db/schema"

// DELETE /api/account/passkeys/:id — remove a passkey, unless it is the account's
// last way to sign in (no password and no other passkey).
export default defineEventHandler(async event => {
  const { user: sessionUser } = await requireUserSession(event)
  const user = await requireAccount(sessionUser.id)
  const id = decodeURIComponent(getRouterParam(event, "id") ?? "")

  const mine = await credentialsForUser(user.id)
  if (!mine.some(c => c.id === id)) throw createError({ status: 404, message: "Passkey not found" })
  if (!user.passwordHash && mine.length <= 1) {
    throw createError({
      status: 409,
      message: "This is your only way to sign in. Add another passkey or set a password first.",
    })
  }

  await useDb().delete(credentials).where(and(eq(credentials.id, id), eq(credentials.userId, user.id)))
  setResponseStatus(event, 204)
  return null
})
