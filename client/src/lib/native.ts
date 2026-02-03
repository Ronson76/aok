import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Motion } from '@capacitor/motion';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Check if the app is running as a native mobile app
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Check if the app is running on iOS
 */
export const isIOS = () => Capacitor.getPlatform() === 'ios';

/**
 * Check if the app is running on Android
 */
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * Check if the app is running in a web browser
 */
export const isWeb = () => Capacitor.getPlatform() === 'web';

/**
 * Haptic feedback utilities
 */
export const haptics = {
  impact: async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNative()) return;
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };
    await Haptics.impact({ style: styleMap[style] });
  },
  
  notification: async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isNative()) return;
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error
    };
    await Haptics.notification({ type: typeMap[type] });
  },
  
  vibrate: async (duration = 300) => {
    if (!isNative()) return;
    await Haptics.vibrate({ duration });
  }
};

/**
 * Push notification utilities
 */
export const pushNotifications = {
  register: async () => {
    if (!isNative()) {
      console.log('[Native] Push notifications not available on web');
      return null;
    }
    
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    return false;
  },
  
  addListener: (event: 'registration' | 'registrationError' | 'pushNotificationReceived' | 'pushNotificationActionPerformed', callback: (data: any) => void) => {
    if (!isNative()) return { remove: () => {} };
    return PushNotifications.addListener(event as any, callback);
  },
  
  getDeliveredNotifications: async () => {
    if (!isNative()) return { notifications: [] };
    return await PushNotifications.getDeliveredNotifications();
  },
  
  removeAllDeliveredNotifications: async () => {
    if (!isNative()) return;
    await PushNotifications.removeAllDeliveredNotifications();
  }
};

/**
 * Local notification utilities (for alarms, check-in reminders)
 */
export const localNotifications = {
  schedule: async (options: {
    id: number;
    title: string;
    body: string;
    scheduleAt?: Date;
    sound?: string;
    ongoing?: boolean;
  }) => {
    if (!isNative()) {
      console.log('[Native] Local notifications not available on web');
      return;
    }
    
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return;
    
    await LocalNotifications.schedule({
      notifications: [{
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
        sound: options.sound || 'default',
        ongoing: options.ongoing
      }]
    });
  },
  
  cancel: async (ids: number[]) => {
    if (!isNative()) return;
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  },
  
  cancelAll: async () => {
    if (!isNative()) return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  },
  
  addListener: (event: 'localNotificationReceived' | 'localNotificationActionPerformed', callback: (data: any) => void) => {
    if (!isNative()) return { remove: () => {} };
    return LocalNotifications.addListener(event as any, callback);
  }
};

/**
 * Motion/shake detection utilities
 */
export const motion = {
  startShakeDetection: async (onShake: () => void, sensitivity = 25) => {
    if (!isNative()) {
      console.log('[Native] Shake detection not available on web');
      return { stop: () => {} };
    }
    
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastUpdate = 0;
    
    const listener = await Motion.addListener('accel', (event) => {
      const { x, y, z } = event.acceleration || { x: 0, y: 0, z: 0 };
      const currentTime = Date.now();
      const timeDiff = currentTime - lastUpdate;
      
      if (timeDiff > 100) {
        lastUpdate = currentTime;
        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / timeDiff * 10000;
        
        if (speed > sensitivity) {
          onShake();
          haptics.notification('warning');
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    });
    
    return {
      stop: () => listener.remove()
    };
  }
};

/**
 * Geolocation utilities
 */
export const geolocation = {
  getCurrentPosition: async () => {
    if (!isNative()) {
      if ('geolocation' in navigator) {
        return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null)
          );
        });
      }
      return null;
    }
    
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') return null;
      
      const position = await Geolocation.getCurrentPosition();
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch {
      return null;
    }
  }
};

/**
 * Status bar utilities (iOS/Android)
 */
export const statusBar = {
  setStyle: async (style: 'dark' | 'light') => {
    if (!isNative()) return;
    await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
  },
  
  setBackgroundColor: async (color: string) => {
    if (!isNative() || isIOS()) return;
    await StatusBar.setBackgroundColor({ color });
  },
  
  hide: async () => {
    if (!isNative()) return;
    await StatusBar.hide();
  },
  
  show: async () => {
    if (!isNative()) return;
    await StatusBar.show();
  }
};

/**
 * Splash screen utilities
 */
export const splashScreen = {
  hide: async () => {
    if (!isNative()) return;
    await SplashScreen.hide();
  },
  
  show: async () => {
    if (!isNative()) return;
    await SplashScreen.show();
  }
};

/**
 * App lifecycle utilities
 */
export const appLifecycle = {
  addStateChangeListener: (callback: (state: { isActive: boolean }) => void) => {
    if (!isNative()) return { remove: () => {} };
    return App.addListener('appStateChange', callback);
  },
  
  addBackButtonListener: (callback: () => void) => {
    if (!isNative() || isIOS()) return { remove: () => {} };
    return App.addListener('backButton', callback);
  },
  
  exitApp: () => {
    if (!isNative()) return;
    App.exitApp();
  }
};

/**
 * Initialize native app features
 */
export const initializeNativeApp = async () => {
  if (!isNative()) {
    console.log('[Native] Running in web mode');
    return;
  }
  
  console.log('[Native] Initializing native app on', Capacitor.getPlatform());
  
  await splashScreen.hide();
  
  if (isAndroid()) {
    await statusBar.setBackgroundColor('#16a34a');
  }
  await statusBar.setStyle('light');
  
  await pushNotifications.register();
  
  console.log('[Native] Native app initialized');
};
