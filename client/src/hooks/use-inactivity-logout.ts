import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { queryClient } from "@/lib/queryClient";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export function useInactivityLogout() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutRef = useRef(logout);
  const setLocationRef = useRef(setLocation);

  useEffect(() => {
    logoutRef.current = logout;
    setLocationRef.current = setLocation;
  }, [logout, setLocation]);

  const performLogout = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      await fetch("/api/org-member/logout", { method: "POST", credentials: "include" });
    } catch (e) {}
    try {
      await logoutRef.current();
    } catch (e) {}
    queryClient.clear();
    setLocationRef.current("/org/staff-login?sessionExpired=true");
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      performLogout();
    }, SESSION_TIMEOUT_MS);
  }, [performLogout]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetInactivityTimer]);

  return { performLogout, resetInactivityTimer };
}
