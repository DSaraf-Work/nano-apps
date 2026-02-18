const CACHE_NAME = 'remindly-v6';
// Only precache the manifest. index.html is served via SWR — never pre-cached.
const ASSETS = ['/manifest.json'];

// ─── Install & Cache ───────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // HTML navigation: stale-while-revalidate.
  // Serve cached version instantly (fast load on repeat visits),
  // fetch fresh in background and update cache silently.
  // First visit (no cache) waits for network — same as before.
  if (e.request.mode === 'navigate') {
    e.respondWith(swrNavigate(e.request));
    return;
  }

  // Static assets (manifest, icons): cache-first for speed.
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request)).catch(() => {})
  );
});

async function swrNavigate(req) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
  return cached ?? fetch(req); // first visit: wait for network
}

// ─── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('remindly', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('reminders')) {
        const store = db.createObjectStore('reminders', { keyPath: 'id' });
        store.createIndex('nextFireAt', 'nextFireAt', { unique: false });
      }
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
}

function getAllReminders(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction('reminders', 'readonly');
    const req = tx.objectStore('reminders').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function putReminder(db, reminder) {
  return new Promise((res, rej) => {
    const tx = db.transaction('reminders', 'readwrite');
    const req = tx.objectStore('reminders').put(reminder);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function deleteReminder(db, id) {
  return new Promise((res, rej) => {
    const tx = db.transaction('reminders', 'readwrite');
    const req = tx.objectStore('reminders').delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

// ─── Check & Fire Due Reminders ───────────────────────────────────────────────
async function checkAndFireReminders() {
  const db = await openDB();
  const reminders = await getAllReminders(db);
  const now = Date.now();

  for (const r of reminders) {
    if (!r.enabled || !r.nextFireAt) continue;
    if (r.nextFireAt <= now) {
      await showReminderNotification(r);
      // Update next fire time or disable
      const updated = computeNextFire(r, now);
      if (updated) {
        await putReminder(db, updated);
      } else {
        // One-time: mark as fired
        await putReminder(db, { ...r, enabled: false, fired: true });
      }
    }
  }
}

function computeNextFire(r, fromTime) {
  if (r.repeat === 'none') return null;
  let interval = 0;
  if (r.repeat === 'interval') {
    interval = r.intervalMs;
  } else if (r.repeat === 'daily') {
    interval = 86400000;
  } else if (r.repeat === 'weekly') {
    interval = 604800000;
  } else if (r.repeat === 'hourly') {
    interval = 3600000;
  }
  if (interval <= 0) return null;
  const next = { ...r, nextFireAt: fromTime + interval };
  return next;
}

async function showReminderNotification(r) {
  const actions = [
    { action: 'done', title: '✅ Done' },
    { action: 'snooze5', title: '⏰ 5 min' },
    { action: 'snooze15', title: '⏰ 15 min' },
    { action: 'snooze60', title: '⏰ 1 hour' },
  ];

  const followUpActions = r.followUps && r.followUps.length > 0
    ? r.followUps.slice(0, 2).map(f => ({ action: `followup_${f.id}`, title: f.label }))
    : [];

  await self.registration.showNotification(r.title, {
    body: r.description || 'Tap to view reminder',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: `reminder-${r.id}`,
    renotify: true,
    requireInteraction: true,
    data: { reminderId: r.id, followUps: r.followUps || [] },
    actions: [...followUpActions, ...actions].slice(0, 4),
    vibrate: [200, 100, 200, 100, 400],
  });
}

// ─── Periodic Background Sync ─────────────────────────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-reminders') {
    e.waitUntil(checkAndFireReminders());
  }
});

// ─── Message from Client ──────────────────────────────────────────────────────
self.addEventListener('message', async e => {
  if (e.data.type === 'CHECK_REMINDERS') {
    await checkAndFireReminders();
    e.ports[0]?.postMessage({ type: 'CHECKED' });
  }
  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Push Event (for real server-side push) ───────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  try {
    const data = e.data.json();
    e.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: data,
        actions: [
          { action: 'done', title: '✅ Done' },
          { action: 'snooze15', title: '⏰ 15 min' },
        ],
        requireInteraction: true,
      })
    );
  } catch {}
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', async e => {
  const { action, notification } = e;
  const { reminderId, followUps } = notification.data || {};
  notification.close();

  e.waitUntil((async () => {
    const db = await openDB();

    if (action === 'done') {
      const tx = db.transaction('reminders', 'readwrite');
      const store = tx.objectStore('reminders');
      const getReq = store.get(reminderId);
      await new Promise(r => { getReq.onsuccess = r; });
      if (getReq.result) {
        await putReminder(db, { ...getReq.result, enabled: false, completedAt: Date.now() });
      }
      broadcastToClients({ type: 'REMINDER_DONE', reminderId });
      return;
    }

    // Snooze actions
    const snoozeMap = { snooze5: 5, snooze15: 15, snooze60: 60 };
    if (snoozeMap[action] !== undefined) {
      const snoozeMs = snoozeMap[action] * 60000;
      const tx = db.transaction('reminders', 'readwrite');
      const store = tx.objectStore('reminders');
      const getReq = store.get(reminderId);
      await new Promise(r => { getReq.onsuccess = r; });
      if (getReq.result) {
        await putReminder(db, {
          ...getReq.result,
          nextFireAt: Date.now() + snoozeMs,
          snoozed: true,
          repeat: 'none',
        });
      }
      broadcastToClients({ type: 'REMINDER_SNOOZED', reminderId, snoozeMin: snoozeMap[action] });
      return;
    }

    // Follow-up actions
    if (action && action.startsWith('followup_')) {
      const followUpId = action.replace('followup_', '');
      const fu = (followUps || []).find(f => String(f.id) === String(followUpId));
      if (fu) {
        await self.registration.showNotification(`Follow-up: ${fu.label}`, {
          body: fu.description || 'Follow-up action triggered',
          icon: '/icon-192.png',
          tag: `followup-${reminderId}-${followUpId}`,
          data: { isFollowUp: true },
          actions: [{ action: 'done', title: '✅ Done' }],
        });
      }
      broadcastToClients({ type: 'FOLLOWUP_TRIGGERED', reminderId, followUpId });
      return;
    }

    // Default: open app
    const allClients = await clients.matchAll({ type: 'window' });
    if (allClients.length > 0) {
      allClients[0].focus();
    } else {
      clients.openWindow('/');
    }
  })());
});

async function broadcastToClients(msg) {
  const allClients = await clients.matchAll({ type: 'window' });
  allClients.forEach(c => c.postMessage(msg));
}
