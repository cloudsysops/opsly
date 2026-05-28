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

async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('[sw-register] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured — skipping push subscription');
    return;
  }

  try {
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      console.warn('[sw-register] Incomplete push subscription — skipping POST');
      return;
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        userAgent: navigator.userAgent,
      }),
    });
  } catch (err) {
    console.error('[sw-register] Push subscription error', err);
  }
}

export function SwRegister(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        subscribeToPush(registration).catch((err) => {
          console.error('[sw-register] subscribeToPush failed', err);
        });
      })
      .catch((err) => {
        console.error('[sw-register] SW registration failed', err);
      });
  }, []);

  return null;
}
