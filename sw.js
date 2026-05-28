// Weekly Scheduler — Service Worker
const CACHE = 'ws-v1';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

// ── Push handler — this fires even when app is closed ────
self.addEventListener('push', e => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: '⏰ Task Reminder', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      tag:     data.tag  || 'ws-task',
      icon:    '/icon.png',
      badge:   '/icon.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
      actions: [{ action: 'open', title: 'Open App' }],
    })
  );
});

// ── Notification tap — open or focus the app ─────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';

  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const open = clients.find(c => c.url.includes(self.location.origin));
        if (open) return open.focus();
        return self.clients.openWindow(target);
      })
  );
});
