import { useState, useEffect, useCallback } from "react";
import ShakeDetector, { shakeDetector, ShakeEvent } from "@/lib/shake-detector";

interface UseShakeDetectorOptions {
  enabled: boolean;
  onShakeDetected?: () => void;
}

export function useShakeDetector({ enabled, onShakeDetected }: UseShakeDetectorOptions) {
  const [isSupported] = useState(() => ShakeDetector.isSupported());
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'not_required'>('unknown');
  const [isActive, setIsActive] = useState(false);

  // Check permission status on mount
  useEffect(() => {
    if (!isSupported) {
      setPermissionStatus('denied');
      return;
    }

    if (!ShakeDetector.requiresPermission()) {
      setPermissionStatus('not_required');
    } else {
      // Check if we previously stored permission
      const stored = localStorage.getItem('motionPermission');
      if (stored === 'granted') {
        setPermissionStatus('granted');
      }
    }
  }, [isSupported]);

  // Request permission (must be called from user gesture)
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    const result = await ShakeDetector.requestPermission();
    if (result === 'granted' || result === 'not_required') {
      setPermissionStatus(result);
      localStorage.setItem('motionPermission', 'granted');
      return true;
    } else {
      setPermissionStatus('denied');
      localStorage.setItem('motionPermission', 'denied');
      return false;
    }
  }, [isSupported]);

  // Enable/disable detection based on props
  useEffect(() => {
    if (!isSupported) return;

    const canEnable = enabled && (permissionStatus === 'granted' || permissionStatus === 'not_required');

    if (canEnable) {
      const success = shakeDetector.enable();
      setIsActive(success);
    } else {
      shakeDetector.disable();
      setIsActive(false);
    }

    return () => {
      shakeDetector.disable();
    };
  }, [enabled, permissionStatus, isSupported]);

  // Subscribe to shake events
  useEffect(() => {
    if (!onShakeDetected) return;

    const unsubscribe = shakeDetector.subscribe((event: ShakeEvent) => {
      if (event.type === 'shake_detected') {
        onShakeDetected();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onShakeDetected]);

  return {
    isSupported,
    isActive,
    permissionStatus,
    requiresPermission: ShakeDetector.requiresPermission(),
    requestPermission,
    recordCancellation: () => shakeDetector.recordCancellation(),
    recordConfirmed: () => shakeDetector.recordConfirmed(),
    recordAutoSent: () => shakeDetector.recordAutoSent(),
  };
}
