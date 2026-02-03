import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

interface HeartbeatContextType {
  isOnline: boolean;
  lastPingTime: Date | null;
  failedAttempts: number;
}

const HeartbeatContext = createContext<HeartbeatContextType | null>(null);

const PING_INTERVAL = 60 * 1000; // 60 seconds when online
const RETRY_INTERVAL = 5 * 1000; // 5 seconds when offline (faster retry)
const PING_TIMEOUT = 5 * 1000; // 5 second timeout for each ping

export function HeartbeatProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const ping = useCallback(async () => {
    // If browser says offline, immediately mark as offline
    if (!navigator.onLine) {
      setIsOnline(false);
      setFailedAttempts(1);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

    try {
      const response = await fetch("/api/heartbeat", {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setIsOnline(true);
        setLastPingTime(new Date());
        setFailedAttempts(0);
      } else {
        throw new Error("Server returned non-OK status");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Immediately go offline on first failure if browser also reports offline
      if (!navigator.onLine) {
        setIsOnline(false);
        setFailedAttempts(1);
      } else {
        // Otherwise wait for consecutive failures
        setFailedAttempts((prev) => {
          const newAttempts = prev + 1;
          if (newAttempts >= 2) {
            setIsOnline(false);
          }
          return newAttempts;
        });
      }
    }
  }, []);

  // Dynamic interval based on online status
  useEffect(() => {
    ping();

    const scheduleNextPing = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      const interval = isOnline ? PING_INTERVAL : RETRY_INTERVAL;
      intervalRef.current = setInterval(ping, interval);
    };

    scheduleNextPing();

    const handleOnline = () => {
      ping();
    };

    const handleOffline = () => {
      setFailedAttempts(1);
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [ping, isOnline]);

  return (
    <HeartbeatContext.Provider value={{ isOnline, lastPingTime, failedAttempts }}>
      {children}
    </HeartbeatContext.Provider>
  );
}

export function useHeartbeat() {
  const context = useContext(HeartbeatContext);
  if (!context) {
    throw new Error("useHeartbeat must be used within a HeartbeatProvider");
  }
  return context;
}
