'use client';

import { useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

// FCM path: uses Firebase SDK to get token, registers firebase-messaging-sw.js
async function subscribeViaFCM(): Promise<void> {
  const { getFCMToken } = await import('@/lib/firebase-messaging');
  const token = await getFCMToken();
  if (!token) return;

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: `fcm-web:${token}`,
      keys: { p256dh: token, auth: 'fcm' },
      userAgent: navigator.userAgent,
      type: 'fcm-web',
    }),
  });
}

// VAPID path: legacy Web Push API (fallback when Firebase not configured)
async function subscribeViaVAPID(registration: ServiceWorkerRegistration): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return;

  const existingSub = await registration.pushManager.getSubscription();
  if (existingSub) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    }),
  });
}

export function SwRegister(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

    if (firebaseConfigured) {
      // Send Firebase config to SW before any push can arrive
      navigator.serviceWorker.register('/firebase-messaging-sw.js').then((reg) => {
        reg.active?.postMessage({
          type: 'FIREBASE_CONFIG',
          config: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
        });
        subscribeViaFCM().catch((err) => console.error('[sw-register] FCM subscribe failed', err));
      }).catch((err) => console.error('[sw-register] firebase SW registration failed', err));
    } else {
      // Fallback: VAPID Web Push
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        subscribeViaVAPID(registration).catch((err) =>
          console.error('[sw-register] VAPID subscribe failed', err)
        );
      }).catch((err) => console.error('[sw-register] SW registration failed', err));
    }
  }, []);

  return null;
}
