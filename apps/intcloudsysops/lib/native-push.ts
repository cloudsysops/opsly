'use client';

/**
 * Push notification abstraction.
 * Web (PWA): uses Web Push API + VAPID via sw-register.tsx
 * Native (Capacitor iOS/Android): uses FCM via @capacitor/push-notifications
 */

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches &&
    typeof (window as unknown as Record<string, unknown>).Capacitor !== 'undefined'
  );
}

export async function registerNativePush(userId: string): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `fcm:${token.value}`,
          keys: { p256dh: token.value, auth: userId },
          userAgent: navigator.userAgent,
          type: 'fcm',
        }),
      });
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[native-push] received in foreground:', notification.title);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url: string = (action.notification.data as Record<string, string>)?.url ?? '/familias/submissions';
      window.location.href = url;
    });
  } catch (err) {
    console.warn('[native-push] registration failed:', err);
  }
}
