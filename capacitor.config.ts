import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'care.aok.app',
  appName: 'aok',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: 'https://aok.care'
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'desktop',
    scheme: 'aok',
    backgroundColor: '#0f172a',
    allowsLinkPreview: false
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#0f172a'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;
