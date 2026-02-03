import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface HeartbeatContextType {
  isOnline: boolean;
  lastPingTime: Date | null;
  failedAttempts: number;
}

const HeartbeatContext = createContext<HeartbeatContextType | null>(null);

const PING_INTERVAL = 60 * 1000; // 60 seconds
const MAX_FAILED_ATTEMPTS = 2; // Show offline after 2 consecutive failures
const PING_TIMEOUT = 10 * 1000; // 10 second timeout for each ping

export function HeartbeatProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const ping = useCallback(async () => {
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
      
      setFailedAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          setIsOnline(false);
        }
        return newAttempts;
      });
    }
  }, []);

  useEffect(() => {
    ping();

    const intervalId = setInterval(ping, PING_INTERVAL);

    const handleOnline = () => {
      ping();
    };

    const handleOffline = () => {
      setFailedAttempts(MAX_FAILED_ATTEMPTS);
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [ping]);

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
