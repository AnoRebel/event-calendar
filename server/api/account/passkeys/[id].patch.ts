import { and, eq } from "drizzle-orm"
import { createError, defineEventHandler, getRouterParam } from "nuxt/server"
import { credentials } from "../../../db/schema"
import { RenamePasskeySchema } from "#shared/schemas/auth"

// PATCH /api/account/passkeys/:id — rename one of your passkeys.
export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const id = decodeURIComponent(getRouterParam(event, "id") ?? "")
  const { name } = await readValidated(event, RenamePasskeySchema)
  const [updated] = await useDb()
    .update(credentials)
    .set({ name })
    .where(and(eq(credentials.id, id), eq(credentials.userId, user.id)))
    .returning({ id: credentials.id, name: credentials.name })
  if (!updated) throw createError({ status: 404, message: "Passkey not found" })
  return updated
})
