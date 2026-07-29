import * as v from "valibot"
import type { H3Event } from "h3"

// Validate an H3 request body against a valibot schema, throwing a 400 with the
// flattened issues on failure. Returns the parsed (and stripped) output.
export async function readValidated<TSchema extends v.GenericSchema>(
  event: H3Event,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  const body = await readBody(event)
  const result = v.safeParse(schema, body)
  if (!result.success) {
    const errors = result.issues.map(i => ({
      field: i.path?.map(p => p.key).join(".") || "",
      message: i.message,
    }))
    throw createError({
      statusCode: 400,
      statusMessage: errors[0]?.message || "Invalid request",
      data: { errors },
    })
  }
  return result.output
}
