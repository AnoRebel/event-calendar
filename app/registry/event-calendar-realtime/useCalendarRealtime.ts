import { ref, onScopeDispose } from "vue"

// Wire-format event: dates are ISO strings over the socket.
interface EventDTO {
  id: string
  ownerId?: string | null
  title: string
  startDate: string
  endDate: string
  [key: string]: unknown
}

// A change broadcast over the WebSocket. Matches the server's EventChange.
export type RemoteEventChange =
  | { type: "created"; event: EventDTO }
  | { type: "updated"; event: EventDTO }
  | { type: "deleted"; id: string; ownerId?: string | null }

// Connects to the Nitro WebSocket and applies remote event changes. Real-time is
// an enhancement: if the socket is unavailable, CRUD over HTTP still works. The
// caller supplies `apply` (useCalendarData.applyRemote) and a set of ids the
// client itself just wrote, so echoes of its own changes aren't re-applied.
export function useCalendarRealtime(
  apply: (change: RemoteEventChange) => void,
  isOwnEcho: (change: RemoteEventChange) => boolean,
  onReconnect?: () => void,
) {
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  let hadConnected = false

  const url = () => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:"
    return `${proto}//${location.host}/_ws`
  }

  const connect = () => {
    if (stopped || !import.meta.client) return
    try {
      ws = new WebSocket(url())
    } catch {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected.value = true
      // On a RE-connect (not the first connect), resync so changes missed during
      // the outage are picked up.
      if (hadConnected) onReconnect?.()
      hadConnected = true
    }

    ws.onmessage = (ev) => {
      try {
        if (ev.data === "pong") return
        const change = JSON.parse(ev.data) as RemoteEventChange
        if (isOwnEcho(change)) return
        apply(change)
      } catch {
        // Ignore malformed frames.
      }
    }

    ws.onclose = () => {
      connected.value = false
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 3000)
  }

  const start = () => {
    stopped = false
    connect()
  }

  const stop = () => {
    stopped = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
    connected.value = false
  }

  onScopeDispose(stop)

  return { connected, start, stop }
}
