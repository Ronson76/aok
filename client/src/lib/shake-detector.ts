// Shake-to-SOS Detection Service
// Uses DeviceMotionEvent to detect intentional phone shakes

// Tunable constants
export const SHAKE_CONSTANTS = {
  thresholdMagnitude: 18,      // m/s² threshold for a "peak"
  requiredPeaks: 3,            // number of peaks needed to trigger
  windowMs: 1200,              // sliding window for detecting peaks
  minPeakGapMs: 120,           // minimum gap between peaks
  cooldownMs: 10000,           // lockout after a trigger (10s)
  debounceMs: 500,             // ignore rapid repeats
  countdownSeconds: 5,         // countdown before auto-send
  longPressCancelMs: 3000,     // hold duration to cancel
};

export type ShakeEvent = {
  type: 'shake_detected' | 'countdown_started' | 'alert_confirmed' | 'alert_auto_sent' | 'alert_cancelled';
  timestamp: number;
  falseTriggerCount?: number;
};

type ShakeCallback = (event: ShakeEvent) => void;

interface Peak {
  timestamp: number;
  magnitude: number;
}

class ShakeDetector {
  private isEnabled = false;
  private isListening = false;
  private lastTriggerTime = 0;
  private lastDebounceTime = 0;
  private peaks: Peak[] = [];
  private lastPeakTime = 0;
  private falseTriggerCount = 0;
  private callbacks: Set<ShakeCallback> = new Set();
  
  // High-pass filter state
  private lastAccel = { x: 0, y: 0, z: 0 };
  private filteredAccel = { x: 0, y: 0, z: 0 };
  private readonly filterAlpha = 0.8; // High-pass filter coefficient

  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.isEnabled || document.visibilityState !== 'visible') {
      return;
    }

    const accel = event.accelerationIncludingGravity;
    if (!accel || accel.x === null || accel.y === null || accel.z === null) {
      return;
    }

    // Apply high-pass filter to remove gravity
    this.filteredAccel.x = this.filterAlpha * (this.filteredAccel.x + accel.x - this.lastAccel.x);
    this.filteredAccel.y = this.filterAlpha * (this.filteredAccel.y + accel.y - this.lastAccel.y);
    this.filteredAccel.z = this.filterAlpha * (this.filteredAccel.z + accel.z - this.lastAccel.z);
    
    this.lastAccel.x = accel.x;
    this.lastAccel.y = accel.y;
    this.lastAccel.z = accel.z;

    // Calculate magnitude of filtered acceleration
    const magnitude = Math.sqrt(
      this.filteredAccel.x ** 2 +
      this.filteredAccel.y ** 2 +
      this.filteredAccel.z ** 2
    );

    const now = Date.now();

    // Check if this is a peak
    if (magnitude >= SHAKE_CONSTANTS.thresholdMagnitude) {
      // Ensure minimum gap between peaks
      if (now - this.lastPeakTime >= SHAKE_CONSTANTS.minPeakGapMs) {
        this.peaks.push({ timestamp: now, magnitude });
        this.lastPeakTime = now;
      }
    }

    // Remove old peaks outside the window
    this.peaks = this.peaks.filter(
      peak => now - peak.timestamp <= SHAKE_CONSTANTS.windowMs
    );

    // Check for trigger condition
    if (this.peaks.length >= SHAKE_CONSTANTS.requiredPeaks) {
      // Check cooldown and debounce
      const cooldownOk = now - this.lastTriggerTime >= SHAKE_CONSTANTS.cooldownMs;
      const debounceOk = now - this.lastDebounceTime >= SHAKE_CONSTANTS.debounceMs;
      
      if (cooldownOk && debounceOk) {
        this.lastDebounceTime = now;
        this.triggerShake(now);
      }
    }
  };

  private handleVisibilityChange = () => {
    // Reset filter state when coming back to foreground
    if (document.visibilityState === 'visible') {
      this.resetFilterState();
    }
  };

  private resetFilterState() {
    this.lastAccel = { x: 0, y: 0, z: 0 };
    this.filteredAccel = { x: 0, y: 0, z: 0 };
    this.peaks = [];
    this.lastPeakTime = 0;
  }

  private triggerShake(timestamp: number) {
    this.lastTriggerTime = timestamp;
    this.peaks = []; // Clear peaks
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    this.emit({
      type: 'shake_detected',
      timestamp,
    });
  }

  private emit(event: ShakeEvent) {
    this.callbacks.forEach(callback => callback(event));
  }

  // Check if device motion is supported
  static isSupported(): boolean {
    return 'DeviceMotionEvent' in window;
  }

  // Check if iOS permission is required
  static requiresPermission(): boolean {
    return typeof (DeviceMotionEvent as any).requestPermission === 'function';
  }

  // Request iOS permission (must be called from user gesture)
  static async requestPermission(): Promise<'granted' | 'denied' | 'not_required'> {
    if (!ShakeDetector.requiresPermission()) {
      return 'not_required';
    }

    try {
      const permission = await (DeviceMotionEvent as any).requestPermission();
      return permission as 'granted' | 'denied';
    } catch (error) {
      console.error('Failed to request motion permission:', error);
      return 'denied';
    }
  }

  subscribe(callback: ShakeCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  enable() {
    if (!ShakeDetector.isSupported()) {
      console.warn('DeviceMotionEvent not supported');
      return false;
    }

    this.isEnabled = true;
    // Reset filter state when enabling to avoid false positives from stale data
    this.resetFilterState();
    
    if (!this.isListening) {
      window.addEventListener('devicemotion', this.handleMotion);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.isListening = true;
    }

    return true;
  }

  disable() {
    this.isEnabled = false;
  }

  destroy() {
    this.isEnabled = false;
    if (this.isListening) {
      window.removeEventListener('devicemotion', this.handleMotion);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.isListening = false;
    }
    this.callbacks.clear();
  }

  // For logging cancelled alerts (false triggers)
  recordCancellation() {
    this.falseTriggerCount++;
    this.emit({
      type: 'alert_cancelled',
      timestamp: Date.now(),
      falseTriggerCount: this.falseTriggerCount,
    });
  }

  recordConfirmed() {
    this.emit({
      type: 'alert_confirmed',
      timestamp: Date.now(),
    });
  }

  recordAutoSent() {
    this.emit({
      type: 'alert_auto_sent',
      timestamp: Date.now(),
    });
  }

  getFalseTriggerCount() {
    return this.falseTriggerCount;
  }
}

// Singleton instance
export const shakeDetector = new ShakeDetector();
export default ShakeDetector;
