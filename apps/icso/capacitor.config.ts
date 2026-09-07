import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ICSO native shell (Android + iOS) via Capacitor.
 *
 * Live-URL mode: the WebView loads production (or NEXT_PUBLIC_APP_URL).
 * Store binaries stay thin; web deploys update the in-app experience without a full resubmit.
 * `webDir` (`capacitor-web/`) is only a boot placeholder for `cap sync`.
 */
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://icso.op-sly.com';

const config: CapacitorConfig = {
  appId: 'com.intcloudsysops.icso',
  appName: 'ICSO',
  webDir: 'capacitor-web',
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: [
      'icso.op-sly.com',
      'intcloudsysops.com',
      '*.supabase.co',
      '*.op-sly.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0A0A0A',
      showSpinner: false,
    },
  },
  ios: {
    scheme: 'icso',
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