/* Event Calendar service worker.
 *
 * - Page navigations: network first; offline, a generic offline page. Pages are
 *   never cached because they are rendered for the signed-in user.
 * - /_nuxt/ build assets (content-hashed, immutable): cache first.
 * - Icons, manifest, offline page: precached.
 * - /api/ and the realtime socket: never touched, so no account's data is stored.
 */
const VERSION = "v3"
const STATIC_CACHE = `static-${VERSION}`
const ASSET_CACHE = `assets-${VERSION}`
const PRECACHE = ["/offline.html", "/icon.svg", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"]

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)))
})

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, ASSET_CACHE])
      for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name)
      await self.clients.claim()
    })(),
  )
})

// The page asks the waiting worker to take over when the user accepts an update.
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", event => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_ws")) return

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")))
    return
  }

  if (url.pathname.startsWith("/_nuxt/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async cache => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)))
  }
})
