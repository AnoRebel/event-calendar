// A human-readable message from a failed $fetch or any thrown value.
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = err as { data?: { message?: string; statusMessage?: string }; message?: string; statusMessage?: string }
  const fromBody = e?.data?.message || e?.data?.statusMessage
  if (fromBody && fromBody !== "Validation failed") return fromBody
  if (e?.statusMessage && !/^\d/.test(e.statusMessage) && e.statusMessage !== "Validation failed") return e.statusMessage
  return fallback
}
