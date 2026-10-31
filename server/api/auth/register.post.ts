import { randomUUID } from "node:crypto"
import { users } from "../../db/schema"
import { RegisterSchema } from "#shared/schemas/auth"
import { defineEventHandler } from "nuxt/server"

// POST /api/auth/register — create a password account and start a session.
// The registration policy (bootstrap / invite / open) is shared with passkey
// sign-up; see server/utils/registration.ts.
export default defineEventHandler(async (event) => {
  // Schema trims + lowercases the email and enforces the password length.
  const { email, password, name, inviteToken } = await readValidated(event, RegisterSchema)

  const invite = await assertRegistrationAllowed(email, inviteToken)

  const id = randomUUID()
  const displayName = name?.trim() || null
  await useDb()
    .insert(users)
    .values({ id, email, name: displayName, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() })
  await consumeInvite(invite, id)

  await setUserSession(event, { user: { id, email, name: displayName } })
  return { user: { id, email, name: displayName } }
})
