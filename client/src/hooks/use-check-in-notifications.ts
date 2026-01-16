import { useEffect, useRef, useCallback } from "react";
import type { StatusData } from "@shared/schema";

const NOTIFICATION_SOUND_FREQUENCY = 800;
const NOTIFICATION_SOUND_DURATION = 200;

export function useCheckInNotifications(status: StatusData | undefined) {
  const lastNotifiedStatus = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = NOTIFICATION_SOUND_FREQUENCY;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + NOTIFICATION_SOUND_DURATION / 1000);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + NOTIFICATION_SOUND_DURATION / 1000);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = NOTIFICATION_SOUND_FREQUENCY * 1.25;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + NOTIFICATION_SOUND_DURATION / 1000);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + NOTIFICATION_SOUND_DURATION / 1000);
      }, NOTIFICATION_SOUND_DURATION + 50);
    } catch (error) {
      console.log('[Notification] Could not play sound:', error);
    }
  }, []);

  const updateAppBadge = useCallback((isDue: boolean) => {
    if ('setAppBadge' in navigator) {
      if (isDue) {
        (navigator as any).setAppBadge(1).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'checkin-reminder',
        requireInteraction: true,
      });
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  useEffect(() => {
    if (!status) return;

    const isDue = status.status === 'pending' || status.status === 'overdue';
    updateAppBadge(isDue);

    if (status.status === 'pending' && lastNotifiedStatus.current !== 'pending') {
      playNotificationSound();
      showNotification('Check-In Due Soon', 'Time to check in with aok to let your loved ones know you\'re safe.');
      lastNotifiedStatus.current = 'pending';
    } else if (status.status === 'overdue' && lastNotifiedStatus.current !== 'overdue') {
      playNotificationSound();
      showNotification('Check-In Overdue!', 'Your check-in is overdue. Check in now to avoid alerting your contacts.');
      lastNotifiedStatus.current = 'overdue';
    } else if (status.status === 'safe') {
      lastNotifiedStatus.current = null;
    }
  }, [status, playNotificationSound, showNotification, updateAppBadge]);

  return { requestNotificationPermission };
}
