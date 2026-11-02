// FitLog service worker: lets the home-screen app open with no signal.
// Pages: network first, then the last copy, then /offline.
// Built files (/_next/static, icons): saved after first use; their names change every deploy.
// Never touches /api, POSTs (server actions) or other sites, so saving sets works as before.
// The app also asks it to save Home and Log in the background each time it opens
// (sw-register.tsx), because moving between tabs never fully loads a page.
// Bump VERSION to throw away everything saved by older versions.
const VERSION = 'v2'
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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'save-pages' && Array.isArray(event.data.paths)) {
    event.waitUntil(Promise.all(event.data.paths.map(savePage)))
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
    return (await caches.match(req, { ignoreVary: true })) || (await caches.match('/offline'))
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

// Saves one page plus the built files it needs, so its buttons work offline too.
// Signed-out phones get redirected to /login, which is not saved.
async function savePage(path) {
  try {
    const res = await fetch(path)
    if (!res.ok || res.redirected) return
    const html = await res.clone().text()
    await (await caches.open(PAGES)).put(path, res)
    const files = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || [])]
    const statics = await caches.open(STATIC)
    await Promise.all(
      files.map(async (f) => {
        if (await statics.match(f)) return
        const r = await fetch(f)
        if (r.ok) await statics.put(f, r)
      })
    )
  } catch {
    // No signal or a failed file: try again next time the app opens.
  }
}
