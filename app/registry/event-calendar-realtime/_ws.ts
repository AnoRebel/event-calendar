import type { Peer } from "crossws"
import { registerBroadcaster, type EventChange } from "../utils/broadcast"

// Single broadcast channel: every connected peer subscribes to "events" and
// receives all changes. This is the single-user template — there is no
// owner-scoping.
const CHANNEL = "events"

// Track connected peers so the broadcaster can publish to them. A broadcast
// originating from an HTTP handler (no peer context) reaches peers via this
// registry.
const peers = new Set<Peer>()

// Register how broadcastEventChange (called by the API after a successful write)
// reaches connected clients. Publishes every change to all peers.
registerBroadcaster((change: EventChange) => {
  const payload = JSON.stringify(change)
  for (const peer of peers) {
    try {
      peer.send(payload)
    } catch {
      // Drop unreachable peers silently.
    }
  }
})

export default defineWebSocketHandler({
  async open(peer) {
    // TODO(auth): authenticate the peer in open() and subscribe it to a per-user topic; scope broadcasts to the owner.
    peers.add(peer)
    peer.subscribe(CHANNEL)
  },

  message(peer, message) {
    // Client → server messages are only used for a lightweight ping/keepalive.
    if (message.text() === "ping") peer.send("pong")
  },

  close(peer) {
    peers.delete(peer)
  },

  error(peer) {
    peers.delete(peer)
  },
})
