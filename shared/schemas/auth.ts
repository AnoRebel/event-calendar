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
  expiresInDays: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(90))),
})

export type RegisterInput = v.InferOutput<typeof RegisterSchema>
export type LoginInput = v.InferOutput<typeof LoginSchema>
export type CreateInviteInput = v.InferOutput<typeof CreateInviteSchema>

// Passkey sign-up / add-passkey payload (the `user` object sent with WebAuthn
// registration). `userName` is the account email.
export const PasskeyUserSchema = v.object({
  userName: email,
  displayName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  inviteToken: v.optional(v.pipe(v.string(), v.trim())),
})

export const UpdateProfileSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.maxLength(100, "Keep your name under 100 characters")),
})

export const ChangePasswordSchema = v.object({
  currentPassword: v.optional(v.string()),
  newPassword: password,
})

export const RenamePasskeySchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Give the passkey a name"), v.maxLength(60, "Keep the name under 60 characters")),
})

export type PasskeyUserInput = v.InferOutput<typeof PasskeyUserSchema>
