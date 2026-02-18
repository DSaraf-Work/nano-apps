const CACHE = 'nano-apps-v2';

// ── Install: precache only the app registry + manifests (not index.html)
// index.html is served via stale-while-revalidate on fetch — never pre-cached.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.add('./apps/index.json');
      try {
        const res  = await fetch('./apps/index.json');
        const apps = await res.json();
        await Promise.allSettled(
          apps.map(slug => cache.add(`./apps/${slug}/manifest.json`))
        );
      } catch { /* offline during first install — manifests cached on first fetch */ }
    })
  );
  self.skipWaiting();
});

// ── Activate: drop old caches, claim clients immediately ────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // ignore fonts/CDN

  // HTML navigation: stale-while-revalidate.
  // Serve cached shell instantly for fast load; fetch fresh in background.
  // On next load the updated content is served from cache.
  if (e.request.mode === 'navigate') {
    e.respondWith(swrNavigate(e.request));
    return;
  }

  // App registry: SWR so new apps appear quickly
  if (url.pathname === '/apps/index.json') {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // App manifests: cache-first (stable)
  if (url.pathname.endsWith('/manifest.json')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Everything else: network only (no cache pollution)
});

// SWR for HTML: serve cached instantly, refresh cache in background silently.
async function swrNavigate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
  return cached ?? fetch(req); // first visit: wait for network
}

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
  return cached ?? fetch(req);
}

async function cacheFirst(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
