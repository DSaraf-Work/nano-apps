const CACHE = 'nano-apps-v1';

// ── Install: precache shell + dynamically discover every app manifest ──────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Always cache the page shell and the registry
      await cache.addAll(['./', './index.html', './apps/index.json']);

      // Discover app manifests at install time so they're ready immediately
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

// ── Activate: drop any old cache versions ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // ignore fonts/CDN

  // Stale-while-revalidate for the shell and registry:
  // → serve from cache instantly, refresh in background.
  // New apps added to index.json will appear on the *next* visit.
  if (
    url.pathname === '/'          ||
    url.pathname === '/index.html'||
    url.pathname === '/apps/index.json'
  ) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // Cache-first for app manifests (stable; updated via the registry refresh above)
  if (url.pathname.endsWith('/manifest.json')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Everything else: network only (no pollution of the cache)
});

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  // Kick off a background refresh regardless
  const fresh  = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached ?? await fresh; // serve cache instantly if available
}

async function cacheFirst(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
