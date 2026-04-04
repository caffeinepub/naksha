/* Naksha Service Worker — v22 (Full PWA offline + background notifications + live timer) */

const CACHE_VERSION = 'v22';
const CACHE_NAME = `naksha-${CACHE_VERSION}`;
const RUNTIME_CACHE = `naksha-runtime-${CACHE_VERSION}`;

// App shell — always pre-cached on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/fonts/Satoshi.woff2',
];

// ────────────────────────────────────────────────
// INSTALL — precache app shell
// ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

// ────────────────────────────────────────────────
// ACTIVATE — purge old caches and take control
// ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ────────────────────────────────────────────────
// FETCH — Workbox-style routing
//
//  Navigation (HTML)          → Network-first, cache fallback → offline shell
//  Static assets (JS/CSS/img) → Cache-first, network fallback (instant loads)
//  API calls (/api/*)         → Network-only (pass through)
//  Cross-origin               → Pass through
// ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (ICP API, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip ICP canister API paths — always network
  if (url.pathname.startsWith('/api/')) return;

  const isNavigation = request.mode === 'navigate';
  const isStaticAsset = /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|json)$/i.test(url.pathname);

  if (isNavigation) {
    // Network-first: always try fresh HTML, fall back to cached shell
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  if (isStaticAsset) {
    // Cache-first: instant offline loads for all static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});


// ────────────────────────────────────────────────
// TIMER STATE + BACKGROUND NOTIFICATIONS
// ────────────────────────────────────────────────

let timerInterval = null;
let notificationInterval = null;
let timerData = null;
let scheduledAlarms = {};

function formatTime(ms) {
  if (!ms || isNaN(ms) || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildProgressBar(elapsed, total) {
  if (!total || isNaN(total) || total <= 0) return '\u2591'.repeat(10);
  if (isNaN(elapsed) || elapsed < 0) elapsed = 0;
  const ratio = Math.min(Math.max(elapsed / total, 0), 1);
  const filled = Math.round(ratio * 10);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
}

function getRemaining() {
  if (!timerData) return 0;
  if (timerData.isPaused) {
    const rem = (timerData.totalDuration || 0) - (timerData.elapsed || 0);
    return Math.max(0, isNaN(rem) ? 0 : rem);
  }
  const now = Date.now();
  const elapsed = (timerData.elapsed || 0) + (now - (timerData.startTime || now));
  const rem = (timerData.totalDuration || 0) - elapsed;
  return Math.max(0, isNaN(rem) ? 0 : rem);
}

function getElapsed() {
  if (!timerData) return 0;
  if (timerData.isPaused) {
    const e = timerData.elapsed || 0;
    return isNaN(e) ? 0 : e;
  }
  const e = (timerData.elapsed || 0) + (Date.now() - (timerData.startTime || Date.now()));
  return isNaN(e) ? 0 : e;
}

// ─── Legacy fallback (60s interval) — kept as backup, superseded by TIMER_TICK ───
async function updateNotification() {
  if (!timerData) return;

  const remaining = getRemaining();
  const elapsed = getElapsed();
  const total = timerData.totalDuration || 0;

  const safeRemaining = isNaN(remaining) ? 0 : Math.max(0, remaining);
  const safeElapsed = isNaN(elapsed) ? 0 : Math.max(0, elapsed);
  const safeTotal = isNaN(total) || total <= 0 ? 1 : total;

  const timeStr = formatTime(safeRemaining);
  const topic = timerData.topic || 'Study Session';

  const body = timerData.isPaused
    ? `\u23f8 Paused \u2014 ${timeStr} remaining`
    : `\u23f1 ${timeStr} remaining`;

  const actions = timerData.isPaused
    ? [{ action: 'resume', title: '\u25b6 Resume' }, { action: 'stop', title: '\u23f9 Stop' }]
    : [{ action: 'pause', title: '\u23f8 Pause' }, { action: 'stop', title: '\u23f9 Stop' }];

  self.registration.getNotifications({ tag: 'naksha-timer-live' }).then((ns) => ns.forEach((n) => n.close()));

  self.registration.showNotification(`Naksha \u23f1 ${topic}`, {
    body,
    tag: 'naksha-timer-live',
    renotify: false,
    silent: true,
    requireInteraction: true,
    actions,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { type: 'timer-live' },
  }).catch(() => {});
}

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  // ─── TIMER_START: initialise state, fire first notification, set 10-min milestone interval ───
  if (type === 'TIMER_START') {
    timerData = { ...payload, isPaused: false };
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    // First notification via legacy path (main thread now drives per-second updates via TIMER_TICK)
    updateNotification();
    // 60-second fallback interval (in case tab is backgrounded and TIMER_TICK messages stop)
    notificationInterval = setInterval(updateNotification, 60000);
    let minuteCount = 0;
    timerInterval = setInterval(() => {
      minuteCount++;
      if (minuteCount % 10 === 0) {
        self.registration.showNotification('Naksha \u2014 10 min milestone! \ud83d\udd14', {
          body: `${minuteCount} minutes into your session.`,
          tag: 'naksha-milestone',
          silent: false,
          vibrate: [200, 100, 200],
          icon: '/icon-192.png',
        });
      }
    }, 60000);
  }

  // ─── TIMER_TICK: per-second update from main thread — replaces notification silently ───
  if (type === 'TIMER_TICK') {
    if (timerData && !timerData.isPaused) {
      const remainingMs = (payload && payload.remainingMs != null) ? payload.remainingMs : getRemaining();
      const topic = (timerData && timerData.topic) ? timerData.topic : 'Study Session';
      const timeStr = formatTime(remainingMs);
      const body = `\u23f1 ${timeStr} remaining`;

      // Close existing then re-show — renotify:false means no sound/vibration
      self.registration.getNotifications({ tag: 'naksha-timer-live' }).then((ns) => ns.forEach((n) => n.close()));
      self.registration.showNotification('Naksha Timer Running', {
        body,
        tag: 'naksha-timer-live',
        renotify: false,
        silent: true,
        requireInteraction: true,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        actions: [
          { action: 'pause', title: '\u23f8 Pause' },
          { action: 'stop', title: '\u23f9 Stop' },
        ],
        data: { type: 'timer-live' },
      }).catch(() => {});
    }
  }

  // ─── TIMER_PAUSE ───
  if (type === 'TIMER_PAUSE') {
    if (timerData) {
      timerData.isPaused = true;
      timerData.elapsed = payload?.elapsed || timerData.elapsed || 0;
    }
    updateNotification();
  }

  // ─── TIMER_RESUME ───
  if (type === 'TIMER_RESUME') {
    if (timerData) {
      timerData.isPaused = false;
      timerData.startTime = payload?.startTime || Date.now();
    }
    updateNotification();
  }

  // ─── TIMER_STOP (legacy) ───
  if (type === 'TIMER_STOP') {
    timerData = null;
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    self.registration.getNotifications({ tag: 'naksha-timer-live' }).then((ns) => ns.forEach((n) => n.close()));
    self.registration.getNotifications({ tag: 'naksha-timer-done' }).then((ns) => ns.forEach((n) => n.close()));
    self.registration.getNotifications({ tag: 'naksha-timer' }).then((ns) => ns.forEach((n) => n.close()));
  }

  // ─── TIMER_CANCEL: user reset/cancelled — remove all timer notifications ───
  if (type === 'TIMER_CANCEL') {
    timerData = null;
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    self.registration.getNotifications({ tag: 'naksha-timer-live' }).then((ns) => ns.forEach((n) => n.close()));
    self.registration.getNotifications({ tag: 'naksha-timer-done' }).then((ns) => ns.forEach((n) => n.close()));
    self.registration.getNotifications({ tag: 'naksha-timer' }).then((ns) => ns.forEach((n) => n.close()));
  }

  if (type === 'TIMER_UPDATE') {
    if (timerData) timerData = { ...timerData, ...payload };
  }

  // ─── TIMER_COMPLETE (legacy) ───
  if (type === 'TIMER_COMPLETE') {
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    timerData = null;
    self.registration.getNotifications({ tag: 'naksha-timer-live' }).then((ns) => ns.forEach((n) => n.close()));
    self.registration.getNotifications({ tag: 'naksha-timer' }).then((ns) => ns.forEach((n) => n.close()));
    await self.registration.showNotification('Naksha \u23f1 Session Complete! \ud83c\udf89', {
      body: 'Great work! Your study session is done.',
      tag: 'naksha-timer-done',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { type: 'timer-complete' },
    });
  }

  // ─── TIMER_COMPLETE_LIVE: fired by main thread after timer hits zero ───
  if (type === 'TIMER_COMPLETE_LIVE') {
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    timerData = null;
    // Cancel live ongoing
    self.registration.getNotifications({ tag: 'naksha-timer-live' }).then((ns) => ns.forEach((n) => n.close()));
    self.registration.getNotifications({ tag: 'naksha-timer' }).then((ns) => ns.forEach((n) => n.close()));
    // Post completion notification (dismissable, vibrates)
    self.registration.showNotification('Naksha Timer Done! \ud83c\udf89', {
      body: 'Your timer has finished. Tap to open.',
      tag: 'naksha-timer-done',
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { type: 'timer-complete' },
    }).catch(() => {});
  }

  if (type === 'TEST_NOTIFICATION') {
    await self.registration.showNotification('Naksha \ud83d\udd14 Test Notification', {
      body: 'Notifications are working! Your timer will appear here.',
      tag: 'naksha-test',
      renotify: true,
      vibrate: [200, 100, 200],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  }

  if (type === 'SCHEDULE_ALARM') {
    const { id, title, deadline } = payload;
    const delay = new Date(deadline).getTime() - Date.now();
    if (delay > 0) {
      if (scheduledAlarms[id]) clearTimeout(scheduledAlarms[id]);
      scheduledAlarms[id] = setTimeout(() => {
        self.registration.showNotification('Naksha \u2014 Task Due! \u2705', {
          body: title,
          tag: `alarm-${id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          icon: '/icon-192.png',
          data: { type: 'alarm', id },
        });
        delete scheduledAlarms[id];
      }, delay);
    }
  }

  if (type === 'CANCEL_ALARM') {
    const { id } = payload;
    if (scheduledAlarms[id]) {
      clearTimeout(scheduledAlarms[id]);
      delete scheduledAlarms[id];
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'pause') {
    if (timerData) { timerData.isPaused = true; timerData.elapsed = getElapsed(); }
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'PAUSE_FROM_SW' }));
    });
    updateNotification();
    return;
  }

  if (event.action === 'resume') {
    if (timerData) { timerData.isPaused = false; timerData.startTime = Date.now(); }
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'RESUME_FROM_SW' }));
    });
    updateNotification();
    return;
  }

  if (event.action === 'stop') {
    timerData = null;
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'FORCE_STOP' }));
    });
    return;
  }

  // Focus or open the app on any tap
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) { clients[0].focus(); }
      else { self.clients.openWindow('/'); }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // If user manages to close the live notification, re-show after 15s if still running
  if (event.notification.tag === 'naksha-timer-live' && timerData && !timerData.isPaused) {
    setTimeout(() => { if (timerData) updateNotification(); }, 15000);
  }
});
