import { randomBytes } from "node:crypto"
import { addDays } from "date-fns"
import { invites } from "../../db/schema"
import { CreateInviteSchema } from "#shared/schemas/auth"

// POST /api/invites — create an invite token (authenticated).
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { email, expiresInDays } = await readValidated(event, CreateInviteSchema)

  const token = randomBytes(24).toString("base64url")
  const now = new Date()
  const days = expiresInDays ?? 14

  await useDb()
    .insert(invites)
    .values({
      token,
      email: email || null,
      createdBy: user.id,
      expiresAt: addDays(now, days).toISOString(),
      createdAt: now.toISOString(),
    })

  setResponseStatus(event, 201)
  return { token, email: email || null }
})
