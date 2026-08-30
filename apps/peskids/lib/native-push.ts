'use client';

/**
 * Push notification abstraction.
 * Web (PWA): Web Push + VAPID via `components/pwa/sw-register.tsx`
 * Native (Capacitor): FCM / APNs via `@capacitor/push-notifications`
 */

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as CapacitorWindow).Capacitor;
  if (typeof cap?.isNativePlatform === 'function') {
    return cap.isNativePlatform();
  }
  return false;
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
      console.info('[native-push] foreground:', notification.title);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data as Record<string, string> | undefined;
      const url = data?.url ?? '/familias';
      window.location.href = url;
    });
  } catch (err) {
    console.warn('[native-push] registration failed:', err);
  }
}
