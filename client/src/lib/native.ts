import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Motion } from '@capacitor/motion';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNative = () => Capacitor.isNativePlatform();

export const isIOS = () => Capacitor.getPlatform() === 'ios';

export const isAndroid = () => Capacitor.getPlatform() === 'android';

export const isWeb = () => Capacitor.getPlatform() === 'web';

export const isMacCatalyst = () => {
  if (!isNative()) return false;
  return isIOS() && typeof navigator !== 'undefined' && /Macintosh/.test(navigator.userAgent);
};

export const isMacWeb = () => {
  if (isNative()) return false;
  return typeof navigator !== 'undefined' && /Macintosh/.test(navigator.userAgent);
};

export const haptics = {
  impact: async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch {
      // Haptics not available on this device
    }
  },
  
  notification: async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error
      };
      await Haptics.notification({ type: typeMap[type] });
    } catch {
      // Haptics not available on this device
    }
  },
  
  vibrate: async (duration = 300) => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      await Haptics.vibrate({ duration });
    } catch {
      // Vibration not available on this device
    }
  }
};

export const pushNotifications = {
  register: async () => {
    if (!isNative()) {
      console.log('[Native] Push notifications not available on web');
      return null;
    }
    
    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        return true;
      }
    } catch {
      console.log('[Native] Push notifications not supported on this platform');
    }
    return false;
  },
  
  addListener: (event: 'registration' | 'registrationError' | 'pushNotificationReceived' | 'pushNotificationActionPerformed', callback: (data: any) => void) => {
    if (!isNative()) return { remove: () => {} };
    try {
      return PushNotifications.addListener(event as any, callback);
    } catch {
      return { remove: () => {} };
    }
  },
  
  getDeliveredNotifications: async () => {
    if (!isNative()) return { notifications: [] };
    try {
      return await PushNotifications.getDeliveredNotifications();
    } catch {
      return { notifications: [] };
    }
  },
  
  removeAllDeliveredNotifications: async () => {
    if (!isNative()) return;
    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch {
      // Not available
    }
  }
};

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
    
    try {
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
    } catch {
      console.log('[Native] Failed to schedule notification');
    }
  },
  
  cancel: async (ids: number[]) => {
    if (!isNative()) return;
    try {
      await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
    } catch {
      // Not available
    }
  },
  
  cancelAll: async () => {
    if (!isNative()) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch {
      // Not available
    }
  },
  
  addListener: (event: 'localNotificationReceived' | 'localNotificationActionPerformed', callback: (data: any) => void) => {
    if (!isNative()) return { remove: () => {} };
    try {
      return LocalNotifications.addListener(event as any, callback);
    } catch {
      return { remove: () => {} };
    }
  }
};

export const motion = {
  startShakeDetection: async (onShake: () => void, sensitivity = 25) => {
    if (!isNative() || isMacCatalyst()) {
      console.log('[Native] Shake detection not available on this platform');
      return { stop: () => {} };
    }
    
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastUpdate = 0;
    
    try {
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
    } catch {
      console.log('[Native] Motion API not available');
      return { stop: () => {} };
    }
  }
};

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
  }
};

export const statusBar = {
  setStyle: async (style: 'dark' | 'light') => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
    } catch {
      // StatusBar not available
    }
  },
  
  setBackgroundColor: async (color: string) => {
    if (!isNative() || isIOS()) return;
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch {
      // StatusBar not available
    }
  },
  
  hide: async () => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      await StatusBar.hide();
    } catch {
      // StatusBar not available
    }
  },
  
  show: async () => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      await StatusBar.show();
    } catch {
      // StatusBar not available
    }
  }
};

export const splashScreen = {
  hide: async () => {
    if (!isNative()) return;
    try {
      await SplashScreen.hide();
    } catch {
      // SplashScreen not available
    }
  },
  
  show: async () => {
    if (!isNative()) return;
    try {
      await SplashScreen.show();
    } catch {
      // SplashScreen not available
    }
  }
};

export const appLifecycle = {
  addStateChangeListener: (callback: (state: { isActive: boolean }) => void) => {
    if (!isNative()) return { remove: () => {} };
    try {
      return App.addListener('appStateChange', callback);
    } catch {
      return { remove: () => {} };
    }
  },
  
  addBackButtonListener: (callback: () => void) => {
    if (!isNative() || isIOS()) return { remove: () => {} };
    try {
      return App.addListener('backButton', callback);
    } catch {
      return { remove: () => {} };
    }
  },
  
  exitApp: () => {
    if (!isNative() || isMacCatalyst()) return;
    try {
      App.exitApp();
    } catch {
      // Not available
    }
  }
};

export const initializeNativeApp = async () => {
  if (!isNative()) {
    console.log('[Native] Running in web mode');
    return;
  }
  
  const platform = Capacitor.getPlatform();
  const isMac = isMacCatalyst();
  console.log(`[Native] Initializing native app on ${platform}${isMac ? ' (Mac Catalyst)' : ''}`);
  
  await splashScreen.hide();
  
  if (!isMac) {
    if (isAndroid()) {
      await statusBar.setBackgroundColor('#16a34a');
    }
    await statusBar.setStyle('light');
  }
  
  console.log('[Native] Native app initialized');
};
