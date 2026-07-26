import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.peskids.app',
  appName: 'Peskids',
  // Live app mode: loads from production URL, no static export needed.
  // Updates deploy automatically without App Store review.
  server: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://www.peskids.com',
    cleartext: false,
  },
  webDir: 'out',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  ios: {
    scheme: 'peskids',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
