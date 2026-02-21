import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

const BATTERY_THRESHOLD = 0.20;
const CHECK_INTERVAL_MS = 60 * 1000;

export function useBatteryMonitor(enabled: boolean) {
  const hasSentRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !("getBattery" in navigator)) return;

    async function checkBattery() {
      try {
        const battery = await (navigator as any).getBattery();
        const level = battery.level;

        if (level <= BATTERY_THRESHOLD && !battery.charging && !hasSentRef.current) {
          hasSentRef.current = true;
          const batteryPercent = Math.round(level * 100);
          await apiRequest("POST", "/api/battery-alert", { batteryLevel: batteryPercent });
          console.log(`[Battery Monitor] Alert sent at ${batteryPercent}%`);
        }

        if (level > BATTERY_THRESHOLD || battery.charging) {
          hasSentRef.current = false;
        }
      } catch (err) {
        // Battery API not supported or failed silently
      }
    }

    checkBattery();
    intervalRef.current = setInterval(checkBattery, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);
}
