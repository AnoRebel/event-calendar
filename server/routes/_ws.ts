import type { Peer } from "crossws"
import { registerBroadcaster, type EventChange } from "../utils/broadcast"

// Per-user topic so a peer only receives changes to events it's authorized to
// see (listing is owner-scoped). Events carry their ownerId; deletes carry the
// owner resolved before deletion.
const topicFor = (userId: string) => `events:${userId}`

// Track connected peers so the broadcaster can publish to them. crossws peers
// support pub/sub via peer.subscribe/publish, but we also keep a registry so a
// broadcast originating from an HTTP handler (no peer context) can reach them.
const peersByUser = new Map<string, Set<Peer>>()

function addPeer(userId: string, peer: Peer) {
  let set = peersByUser.get(userId)
  if (!set) {
    set = new Set()
    peersByUser.set(userId, set)
  }
  set.add(peer)
}

function removePeer(peer: Peer) {
  for (const [userId, set] of peersByUser) {
    if (set.delete(peer) && set.size === 0) peersByUser.delete(userId)
  }
}

// Register how broadcastEventChange (called by the API after a successful write)
// reaches connected clients. Publishes to the owning user's peers only.
registerBroadcaster((change: EventChange) => {
  const ownerId =
    change.type === "deleted" ? change.ownerId : change.event.ownerId
  if (!ownerId) return
  const set = peersByUser.get(ownerId)
  if (!set) return
  const payload = JSON.stringify(change)
  for (const peer of set) {
    try {
      peer.send(payload)
    } catch {
      // Drop unreachable peers silently.
    }
  }
})

export default defineWebSocketHandler({
  async open(peer) {
    // Collaboration is feature-flagged — when disabled, don't subscribe anyone.
    if (!useServerFeatures().collaboration) return

    // Resolve identity from the session cookie in the open hook — NOT from
    // context returned by upgrade (nuxt#33829: it isn't reliably propagated).
    //
    // getUserSession expects an H3Event; a crossws peer only exposes the upgrade
    // Request. Build a minimal event whose cookie header getUserSession/h3 can
    // read (h3 reads event.node.req.headers.cookie).
    try {
      const cookie = peer.request?.headers?.get("cookie") ?? ""
      const mockEvent = {
        node: { req: { headers: { cookie } }, res: { getHeader() {}, setHeader() {} } },
        context: {},
        headers: peer.request?.headers,
      } as unknown as Parameters<typeof getUserSession>[0]

      const session = await getUserSession(mockEvent)
      const userId = session?.user?.id
      if (!userId) {
        // Unauthenticated sockets are not subscribed to anything.
        return
      }
      ;(peer as unknown as { _userId?: string })._userId = userId
      addPeer(userId, peer)
      peer.subscribe(topicFor(userId))
    } catch {
      // No valid session — leave the peer unsubscribed.
    }
  },

  message(peer, message) {
    // Client → server messages are only used for a lightweight ping/keepalive.
    if (message.text() === "ping") peer.send("pong")
  },

  close(peer) {
    removePeer(peer)
  },

  error(peer) {
    removePeer(peer)
  },
})
