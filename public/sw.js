// FitLog service worker: lets the home-screen app open with no signal.
// Pages: network first, then the last copy, then /offline.
// Built files (/_next/static, icons): saved after first use; their names change every deploy.
// Never touches /api, POSTs (server actions) or other sites, so saving sets works as before.
// Bump VERSION to throw away everything saved by older versions.
const VERSION = 'v1'
const PAGES = `fitlog-pages-${VERSION}`
const STATIC = `fitlog-static-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add('/offline')))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    event.respondWith(page(req))
  } else if (url.pathname.startsWith('/_next/static/') || /\.(png|ico|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(asset(req))
  }
})

async function page(req) {
  try {
    const res = await fetch(req)
    if (res.ok && !res.redirected) {
      const cache = await caches.open(PAGES)
      await cache.put(req, res.clone())
    }
    return res
  } catch {
    return (await caches.match(req)) || (await caches.match('/offline'))
  }
}

async function asset(req) {
  const saved = await caches.match(req)
  if (saved) return saved
  const res = await fetch(req)
  if (res.ok) {
    const cache = await caches.open(STATIC)
    await cache.put(req, res.clone())
  }
  return res
}
