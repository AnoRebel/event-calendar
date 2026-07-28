import type { EventDTO } from "./eventMapper"

export type EventChange =
  | { type: "created"; event: EventDTO }
  | { type: "updated"; event: EventDTO }
  | { type: "deleted"; id: string; ownerId: string | null }

// Publishes an event change to connected WebSocket peers. The actual crossws
// publish is wired in the WebSocket handler (section 8); this indirection keeps
// the API handlers decoupled from the transport and lets them broadcast only
// AFTER a successful write. No-op until a publisher registers.
let publisher: ((change: EventChange) => void) | null = null

export function registerBroadcaster(fn: (change: EventChange) => void): void {
  publisher = fn
}

export async function broadcastEventChange(change: EventChange): Promise<void> {
  try {
    publisher?.(change)
  } catch {
    // Broadcasting must never break the API response.
  }
}
