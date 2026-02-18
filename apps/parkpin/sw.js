const CACHE = 'parkpin-v2';

// External CDN assets to precache (Leaflet — large, stable, pinned version)
const EXTERNAL = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// ── Install: precache CDN assets only — never cache index.html ──────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(EXTERNAL.map(u => c.add(u))))
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

  // Map tiles: network-first so users always see fresh map data; cache for offline
  if (url.hostname.includes('tile') || url.hostname.includes('openstreetmap')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML navigation: stale-while-revalidate.
  // Serve cached version instantly, fetch fresh in background.
  // Eliminates the old cache-first bug that showed stale UI forever.
  if (e.request.mode === 'navigate') {
    e.respondWith(swrNavigate(e.request));
    return;
  }

  // Static assets (manifest, icons, CDN libs): cache-first for speed
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});

// SWR for HTML: serve cache instantly; silently refresh cache in background.
async function swrNavigate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
  return cached ?? fetch(req); // first visit: wait for network
}
