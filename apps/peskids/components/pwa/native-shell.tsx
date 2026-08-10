'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/native-push';

/**
 * Native Capacitor shell behaviours: Android back button + deep links (peskids://).
 * Safe no-op on web / PWA.
 */
export function NativeShell(): null {
  useEffect(() => {
    if (!isNativeApp()) return;

    let removeBack: (() => void) | undefined;
    let removeUrl: (() => void) | undefined;

    void (async () => {
      const { App } = await import('@capacitor/app');
      const { SplashScreen } = await import('@capacitor/splash-screen');

      try {
        await SplashScreen.hide();
      } catch {
        /* splash plugin optional at runtime */
      }

      const backHandle = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.exitApp();
      });
      removeBack = () => {
        void backHandle.remove();
      };

      const urlHandle = await App.addListener('appUrlOpen', (event) => {
        try {
          const parsed = new URL(event.url);
          if (parsed.protocol === 'peskids:') {
            const path = parsed.pathname || parsed.host || '/familias';
            const normalized = path.startsWith('/') ? path : `/${path}`;
            window.location.href = normalized + parsed.search + parsed.hash;
            return;
          }
          if (parsed.hostname.endsWith('peskids.com') || parsed.hostname.endsWith('op-sly.com')) {
            window.location.href = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch (err) {
          console.warn('[native-shell] appUrlOpen parse failed:', err);
        }
      });
      removeUrl = () => {
        void urlHandle.remove();
      };
    })();

    return () => {
      removeBack?.();
      removeUrl?.();
    };
  }, []);

  return null;
}
