import { randomBytes } from "node:crypto"
import { addDays } from "date-fns"
import { invites } from "../../db/schema"

// POST /api/invites — create an invite token (authenticated).
// Body: { email?: string, expiresInDays?: number }
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { email, expiresInDays } = await readBody<{ email?: string; expiresInDays?: number }>(event)

  const token = randomBytes(24).toString("base64url")
  const now = new Date()
  const days = typeof expiresInDays === "number" && expiresInDays > 0 ? expiresInDays : 14

  await useDb()
    .insert(invites)
    .values({
      token,
      email: email?.trim().toLowerCase() || null,
      createdBy: user.id,
      expiresAt: addDays(now, days).toISOString(),
      createdAt: now.toISOString(),
    })

  setResponseStatus(event, 201)
  return { token, email: email?.trim().toLowerCase() || null }
})
