import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Peskids native shell (Android + iOS) via Capacitor.
 *
 * Live-URL mode: the WebView loads production (or NEXT_PUBLIC_APP_URL).
 * Store binaries stay thin; web deploys update the in-app experience without a full resubmit.
 * `webDir` (`capacitor-web/`) is only a boot placeholder for `cap sync`.
 */
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.peskids.com';

const config: CapacitorConfig = {
  appId: 'com.peskids.app',
  appName: 'Peskids',
  webDir: 'capacitor-web',
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: [
      'www.peskids.com',
      'peskids.op-sly.com',
      'peskids.com',
      '*.supabase.co',
      '*.op-sly.com',
    ],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#54BFB1',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  ios: {
    scheme: 'peskids',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.CAPACITOR_ANDROID_DEBUG === '1',
  },
};

export default config;
