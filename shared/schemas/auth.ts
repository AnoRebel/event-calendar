import * as v from "valibot"

// Shared valibot schemas for auth payloads.

const email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email("A valid email is required"))
const password = v.pipe(v.string(), v.minLength(8, "Password must be at least 8 characters"))

export const RegisterSchema = v.object({
  email,
  password,
  name: v.optional(v.pipe(v.string(), v.trim())),
  inviteToken: v.optional(v.string()),
})

export const LoginSchema = v.object({
  email,
  password: v.pipe(v.string(), v.minLength(1, "Password is required")),
})

export const CreateInviteSchema = v.object({
  email: v.optional(v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email())),
  expiresInDays: v.optional(v.pipe(v.number(), v.minValue(1))),
})

export type RegisterInput = v.InferOutput<typeof RegisterSchema>
export type LoginInput = v.InferOutput<typeof LoginSchema>
export type CreateInviteInput = v.InferOutput<typeof CreateInviteSchema>
