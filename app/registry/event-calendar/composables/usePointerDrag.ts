import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from "vue"
import type { CalendarEvent } from "../types"

interface PointerDragOptions {
  /** The events currently rendered, used to notice when the host has applied a change. */
  events: Ref<CalendarEvent[]>
  /** Where the event would land with the pointer at (x, y), or null when over no target. */
  resolve: (event: CalendarEvent, x: number, y: number) => CalendarEvent | null
  /** Called once, on release, when the event actually moved. */
  commit: (event: CalendarEvent) => void
}

const time = (d: Date | string) => new Date(d).getTime()
const changed = (a: CalendarEvent, b: CalendarEvent) =>
  time(a.startDate) !== time(b.startDate) || time(a.endDate) !== time(b.endDate) || !!a.allDay !== !!b.allDay

/**
 * Pointer-driven drag for calendar events: a mouse drag starts after 4px, a
 * touch/pen drag after a 250 ms hold (moving sooner scrolls instead). The event
 * follows the pointer as `preview` (updated once per animation frame) and a
 * single `commit` happens on release. Escape cancels.
 */
export function usePointerDrag(options: PointerDragOptions) {
  const dragging = shallowRef<CalendarEvent | null>(null)
  const preview = shallowRef<CalendarEvent | null>(null)
  /** The last committed result, shown until the host's events catch up. */
  const committed = shallowRef<CalendarEvent | null>(null)
  let pending: { event: CalendarEvent; id: number; x: number; y: number; type: string; timer?: ReturnType<typeof setTimeout> } | null = null
  let frame = 0
  let last: { x: number; y: number } | null = null
  let suppress = false
  let committedTimer: ReturnType<typeof setTimeout> | undefined

  const blockTouchScroll = (e: TouchEvent) => {
    if (dragging.value) e.preventDefault()
  }

  function start(event: CalendarEvent, e: PointerEvent) {
    if (e.button !== 0) return
    pending = { event, id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType }
    if (e.pointerType !== "mouse") pending.timer = setTimeout(begin, 250)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", cancel)
  }

  function begin() {
    if (!pending) return
    clearTimeout(pending.timer)
    dragging.value = pending.event
    preview.value = pending.event
    navigator.vibrate?.(10)
  }

  function onMove(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.id) return
    if (!dragging.value) {
      const moved = Math.hypot(e.clientX - pending.x, e.clientY - pending.y)
      if (pending.type === "mouse" && moved > 4) begin()
      else if (pending.type !== "mouse" && moved > 8) cancel()
      return
    }
    last = { x: e.clientX, y: e.clientY }
    if (!frame) frame = requestAnimationFrame(apply)
  }

  function apply() {
    frame = 0
    if (!dragging.value || !last) return
    // Outside every target the event snaps back, so releasing there cancels.
    preview.value = options.resolve(dragging.value, last.x, last.y) ?? dragging.value
  }

  function onUp(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.id) return
    if (dragging.value) {
      if (frame) {
        cancelAnimationFrame(frame)
        apply()
      }
      const next = preview.value
      if (next && changed(next, dragging.value)) {
        committed.value = next
        clearTimeout(committedTimer)
        committedTimer = setTimeout(() => (committed.value = null), 4000)
        options.commit(next)
      }
      suppress = true
      setTimeout(() => (suppress = false), 0)
    }
    cancel()
  }

  function cancel() {
    if (pending) clearTimeout(pending.timer)
    pending = null
    dragging.value = null
    preview.value = null
    last = null
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", cancel)
  }

  const onKey = (e: KeyboardEvent) => e.key === "Escape" && dragging.value && cancel()

  watch(options.events, events => {
    const c = committed.value
    const incoming = c && events.find(e => e.id === c.id)
    if (incoming && !changed(incoming, c)) committed.value = null
  })

  onMounted(() => {
    document.addEventListener("touchmove", blockTouchScroll, { passive: false })
    window.addEventListener("keydown", onKey)
  })
  onBeforeUnmount(() => {
    cancel()
    cancelAnimationFrame(frame)
    document.removeEventListener("touchmove", blockTouchScroll)
    window.removeEventListener("keydown", onKey)
  })

  return {
    /** The event being dragged (null when idle). */
    dragging,
    /** Where the dragged event is now, or the last commit awaiting the host. */
    current: () => preview.value ?? committed.value,
    start,
    /** True right after a drag, so the trailing click doesn't open the editor. */
    shouldSuppressClick: () => suppress,
  }
}
