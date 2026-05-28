'use client';

import { getFirebaseApp } from './firebase';

/**
 * Gets a Firebase Cloud Messaging token for web push.
 * Returns null if Firebase is not configured or permission denied.
 */
export async function getFCMToken(): Promise<string | null> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(firebaseApp);

    const swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      ?? await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    return token ?? null;
  } catch (err) {
    console.warn('[firebase-messaging] getToken failed:', err);
    return null;
  }
}

/**
 * Listen for foreground messages (app is open).
 */
export async function onForegroundMessage(
  handler: (payload: { title?: string; body?: string }) => void
): Promise<() => void> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return () => {};

  const { getMessaging, onMessage } = await import('firebase/messaging');
  const messaging = getMessaging(firebaseApp);
  const unsubscribe = onMessage(messaging, (payload) => {
    handler({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
  return unsubscribe;
}
