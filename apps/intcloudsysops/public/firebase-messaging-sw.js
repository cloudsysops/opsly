// Firebase Messaging Service Worker
// Must be at /firebase-messaging-sw.js (root of app, not /sw.js)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config injected at runtime — self.FIREBASE_CONFIG is set by sw-register.tsx
// via postMessage before any push arrives
let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    if (!messaging) {
      firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();
    }
  }
});

// Background message handler (app is closed or in background)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { notification: {} }; }

  const notification = data.notification ?? {};
  const title = notification.title ?? 'Peskids';
  const body = notification.body ?? '';
  const url = data.data?.url ?? '/familias/submissions';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
      tag: 'peskids-notification',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/familias/submissions';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
