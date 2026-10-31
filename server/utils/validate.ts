import type * as v from "valibot"
import type { RequestEvent } from "nuxt/server"
import { readValidatedBody } from "nuxt/server"

// Read the request body validated against a valibot schema (valibot implements
// Standard Schema, which `nuxt/server` validates natively). A failure is a 400
// whose `message` is the first issue, so clients can show it directly.
export function readValidated<TSchema extends v.GenericSchema>(
  event: RequestEvent,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  return readValidatedBody(event, schema, {
    onError: ({ issues }) => ({ status: 400, message: issues[0]?.message || "Invalid request" }),
  }) as Promise<v.InferOutput<TSchema>>
}
