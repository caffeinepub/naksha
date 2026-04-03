/* Naksha Service Worker — v5 */
const CACHE_NAME = 'naksha-v5';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];

let timerInterval = null;
let notificationInterval = null;
let timerData = null;
let scheduledAlarms = {};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

/**
 * Format milliseconds as MM:SS with NaN guard
 */
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

async function updateNotification() {
  if (!timerData) return;

  const remaining = getRemaining();
  const elapsed = getElapsed();
  const total = timerData.totalDuration || 0;

  // NaN guards on all displayed values
  const safeRemaining = isNaN(remaining) ? 0 : Math.max(0, remaining);
  const safeElapsed = isNaN(elapsed) ? 0 : Math.max(0, elapsed);
  const safeTotal = isNaN(total) || total <= 0 ? 1 : total;
  const pct = Math.round(Math.min(100, Math.max(0, (safeElapsed / safeTotal) * 100)));

  const progressBar = buildProgressBar(safeElapsed, safeTotal);
  const timeStr = formatTime(safeRemaining);
  const topic = timerData.topic || 'Study Session';

  const body = timerData.isPaused
    ? `\u23f8 Paused \u2014 ${timeStr} remaining`
    : `${progressBar} ${pct}% \u2014 ${timeStr} remaining`;

  // Pause/Resume actions based on timer state
  const actions = timerData.isPaused
    ? [{ action: 'resume', title: '\u25b6 Resume' }, { action: 'stop', title: '\u23f9 Stop' }]
    : [{ action: 'pause', title: '\u23f8 Pause' }, { action: 'stop', title: '\u23f9 Stop' }];

  const notifications = await self.registration.getNotifications({ tag: 'naksha-timer' });
  notifications.forEach((n) => n.close());

  await self.registration.showNotification(`Naksha \u23f1 ${topic}`, {
    body,
    tag: 'naksha-timer',
    renotify: false,
    silent: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions,
    data: { type: 'timer' },
  });
}

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'TIMER_START') {
    timerData = { ...payload, isPaused: false };
    clearInterval(notificationInterval);
    clearInterval(timerInterval);

    updateNotification();
    // Update notification every 60 seconds
    notificationInterval = setInterval(updateNotification, 60000);

    // 10-minute milestone beeps
    let minuteCount = 0;
    timerInterval = setInterval(() => {
      minuteCount++;
      if (minuteCount % 10 === 0) {
        self.registration.showNotification('Naksha \u2014 10 min milestone! \ud83d\udd14', {
          body: `${minuteCount} minutes into your session.`,
          tag: 'naksha-milestone',
          silent: false,
          vibrate: [200, 100, 200],
        });
      }
    }, 60000);
  }

  if (type === 'TIMER_PAUSE') {
    if (timerData) {
      timerData.isPaused = true;
      timerData.elapsed = payload?.elapsed || timerData.elapsed || 0;
    }
    updateNotification();
  }

  if (type === 'TIMER_RESUME') {
    if (timerData) {
      timerData.isPaused = false;
      timerData.startTime = payload?.startTime || Date.now();
    }
    updateNotification();
  }

  if (type === 'TIMER_STOP') {
    timerData = null;
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    self.registration.getNotifications({ tag: 'naksha-timer' }).then((ns) => ns.forEach((n) => n.close()));
  }

  if (type === 'TIMER_UPDATE') {
    if (timerData) {
      timerData = { ...timerData, ...payload };
    }
  }

  if (type === 'TIMER_COMPLETE') {
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    timerData = null;
    // Close existing timer notifications
    self.registration.getNotifications({ tag: 'naksha-timer' }).then((ns) => ns.forEach((n) => n.close()));

    await self.registration.showNotification('Naksha \u23f1 Session Complete! \ud83c\udf89', {
      body: 'Great work! Your study session is done.',
      tag: 'timer-done',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { type: 'timer-complete' },
    });
  }

  if (type === 'TEST_NOTIFICATION') {
    await self.registration.showNotification('Naksha \ud83d\udd14 Test Notification', {
      body: 'Notifications are working correctly! Your timer will appear here.',
      tag: 'naksha-test',
      renotify: true,
      vibrate: [200, 100, 200],
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

  // Pause action
  if (event.action === 'pause') {
    if (timerData) {
      timerData.isPaused = true;
      timerData.elapsed = getElapsed();
    }
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'PAUSE_FROM_SW' }));
    });
    updateNotification();
    return;
  }

  // Resume action
  if (event.action === 'resume') {
    if (timerData) {
      timerData.isPaused = false;
      timerData.startTime = Date.now();
    }
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'RESUME_FROM_SW' }));
    });
    updateNotification();
    return;
  }

  // Stop action
  if (event.action === 'stop') {
    timerData = null;
    clearInterval(notificationInterval);
    clearInterval(timerInterval);
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'FORCE_STOP' }));
    });
    return;
  }

  // Tap on notification body — focus/open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

// Re-show notification 15s after user swipes it away while timer is running
self.addEventListener('notificationclose', (event) => {
  if (event.notification.tag === 'naksha-timer' && timerData) {
    setTimeout(() => {
      if (timerData) updateNotification();
    }, 15000);
  }
});
