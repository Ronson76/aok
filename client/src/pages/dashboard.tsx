import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertTriangle, ShieldCheck, Loader2, AlertOctagon, Users, Moon, Sun, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/components/theme-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StatusData, Settings } from "@shared/schema";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { useState, useEffect, useRef, useCallback } from "react";

interface RedAlertStatus {
  isRedAlert: boolean;
  alertId: string | null;
  activatedAt: string | null;
  lastDispatchAt: string | null;
  latitude: string | null;
  longitude: string | null;
}

// Shared AudioContext that gets unlocked on user interaction
let sharedAudioContext: AudioContext | null = null;
let audioUnlocked = false;

// Unlock audio context on first user interaction
async function unlockAudio() {
  if (audioUnlocked) return;
  
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if suspended (happens on mobile) - await the promise
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }
    
    // Verify context is running before marking as unlocked
    if (sharedAudioContext.state !== 'running') {
      console.log('[Audio] Context not running after resume, state:', sharedAudioContext.state);
      return; // Don't mark as unlocked
    }
    
    // Play a silent sound to fully unlock
    const buffer = sharedAudioContext.createBuffer(1, 1, 22050);
    const source = sharedAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedAudioContext.destination);
    source.start(0);
    
    audioUnlocked = true;
    console.log('[Audio] Context unlocked successfully');
  } catch (e) {
    console.error('[Audio] Failed to unlock:', e);
    // Don't mark as unlocked on error
  }
}

// Set up unlock listeners
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  const handleUnlock = () => {
    unlockAudio();
    // Remove listeners after unlock
    unlockEvents.forEach(event => {
      document.removeEventListener(event, handleUnlock, true);
    });
  };
  unlockEvents.forEach(event => {
    document.addEventListener(event, handleUnlock, true);
  });
}

// Track which overdue period we've already alarmed for (persisted across page reloads)
// We use a normalized timestamp (just the ISO string date part) to avoid format mismatches
const ALARM_STORAGE_KEY = 'aok_last_alarm_due_time';
const ALARM_DEBOUNCE_KEY = 'aok_last_alarm_timestamp';
const ALARM_DEBOUNCE_MS = 60000; // Don't play initial alarm more than once per minute

function normalizeDueTime(dueTime: string | undefined | null): string | null {
  if (!dueTime) return null;
  try {
    // Normalize to timestamp to avoid string format differences
    return new Date(dueTime).getTime().toString();
  } catch {
    return dueTime;
  }
}

function getLastAlarmedDueTime(): string | null {
  try {
    return localStorage.getItem(ALARM_STORAGE_KEY);
  } catch {
    return null;
  }
}

function wasAlarmPlayedRecently(): boolean {
  try {
    const lastPlayed = localStorage.getItem(ALARM_DEBOUNCE_KEY);
    if (!lastPlayed) return false;
    const elapsed = Date.now() - parseInt(lastPlayed, 10);
    return elapsed < ALARM_DEBOUNCE_MS;
  } catch {
    return false;
  }
}

function markAlarmPlayed() {
  try {
    localStorage.setItem(ALARM_DEBOUNCE_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

function setLastAlarmedDueTime(dueTime: string | undefined | null) {
  const normalized = normalizeDueTime(dueTime);
  if (!normalized) return;
  try {
    localStorage.setItem(ALARM_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage errors
  }
}

function clearLastAlarmedDueTime() {
  try {
    localStorage.removeItem(ALARM_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Play a pleasant chime notification sound
function playAlarmBeep() {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Try to resume if suspended
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    
    const ctx = sharedAudioContext!;
    const startTime = ctx.currentTime;
    
    // Create a pleasant chime sound - like a doorbell or notification
    const playChime = (delay: number, frequency: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine'; // Smooth, pleasant tone
      osc.frequency.value = frequency;
      
      const t = startTime + delay;
      // Bell-like envelope: quick attack, gradual decay
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.01); // Quick attack
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration); // Gradual decay
      
      osc.start(t);
      osc.stop(t + duration);
    };
    
    // Play a pleasant 3-note ascending chime (C5 - E5 - G5)
    playChime(0, 523, 0.4);      // C5
    playChime(0.15, 659, 0.4);   // E5
    playChime(0.30, 784, 0.6);   // G5 (longer for a nice finish)
    
  } catch (e) {
    console.error('[Audio] Failed to play alarm:', e);
  }
}

// Update PWA badge on app icon
async function updateAppBadge(count: number) {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch (e) {
    console.error('Failed to update app badge:', e);
  }
}

function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diffInSeconds = differenceInSeconds(targetDate, now);
  
  if (diffInSeconds <= 0) {
    return "Due now";
  }
  
  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function getStatusIcon(status: StatusData["status"]) {
  switch (status) {
    case "safe":
      return <CheckCircle className="h-16 w-16 text-primary" />;
    case "pending":
      return <Clock className="h-16 w-16 text-yellow-500" />;
    case "overdue":
      return <AlertTriangle className="h-16 w-16 text-destructive" />;
  }
}

function getStatusLabel(status: StatusData["status"]) {
  switch (status) {
    case "safe":
      return { text: "You're aok", variant: "default" as const };
    case "pending":
      return { text: "Check-In Due Soon", variant: "secondary" as const };
    case "overdue":
      return { text: "Check-In Overdue", variant: "destructive" as const };
  }
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [cachedLocation, setCachedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [isLocallyOverdue, setIsLocallyOverdue] = useState(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedInitialAlarm = useRef(false);
  
  // Red alert mode state
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  

  // Check if user is org-managed (activated via reference code)
  const isOrgManagedClient = !!user?.referenceId;

  const { data: status, isLoading } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    refetchInterval: 30000,
  });
  
  // Query for red alert status
  const { data: redAlertStatus } = useQuery<RedAlertStatus>({
    queryKey: ["/api/emergency/status"],
    refetchInterval: 10000, // Check every 10 seconds
  });
  
  // Query for settings to check if Red Alert Mode is enabled
  const { data: userSettings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });
  
  const isRedAlertMode = redAlertStatus?.isRedAlert ?? false;
  const isRedAlertEnabled = userSettings?.redAlertEnabled ?? false;
  

  // Live countdown timer with auto-refresh when hitting zero
  useEffect(() => {
    if (!status?.nextCheckInDue) {
      setCountdown("");
      setIsLocallyOverdue(false);
      hasPlayedInitialAlarm.current = false;
      return;
    }

    const targetDate = new Date(status.nextCheckInDue);
    
    // When nextCheckInDue changes (e.g., user adjusted timer), immediately reset overdue state
    // if the new due time is in the future
    const now = new Date();
    const initialDiff = differenceInSeconds(targetDate, now);
    if (initialDiff > 0) {
      setIsLocallyOverdue(false);
      hasPlayedInitialAlarm.current = false;
    }
    
    const updateCountdown = () => {
      const currentTime = new Date();
      const diffInSeconds = differenceInSeconds(targetDate, currentTime);
      
      if (diffInSeconds <= 0) {
        setCountdown("Due now");
        
        // Immediately mark as locally overdue and refresh status
        // NOTE: Alarm playing is handled by the dedicated alarm useEffect below
        if (!isLocallyOverdue && status?.status !== "overdue") {
          setIsLocallyOverdue(true);
          // Refresh status from server to get official overdue state
          queryClient.invalidateQueries({ queryKey: ["/api/status"] });
        }
      } else {
        setCountdown(formatCountdown(targetDate));
        // Don't reset isLocallyOverdue here in the interval - only reset when nextCheckInDue actually changes
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [status?.nextCheckInDue, status?.status]);

  // Determine if we should show overdue state (server says overdue OR local countdown reached zero)
  const effectivelyOverdue = status?.status === "overdue" || isLocallyOverdue;

  // Alarm that repeats every 2 minutes while overdue
  // Uses localStorage to prevent replaying initial alarm on page reload for the same overdue period
  useEffect(() => {
    // Always clear existing interval first to prevent duplicates
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    
    const currentDueTime = status?.nextCheckInDue;
    const normalizedCurrentDueTime = normalizeDueTime(currentDueTime);
    
    if (effectivelyOverdue && normalizedCurrentDueTime) {
      // Check if we've already alarmed for this specific overdue period (persisted across page reloads)
      const lastAlarmedDueTime = getLastAlarmedDueTime();
      const alreadyAlarmedForThisPeriod = lastAlarmedDueTime === normalizedCurrentDueTime;
      
      // Play alarm immediately only if we haven't already for this overdue period
      // Also check debounce to prevent rapid replays during page reloads/hot updates
      const recentlyPlayed = wasAlarmPlayedRecently();
      
      if (!hasPlayedInitialAlarm.current && !alreadyAlarmedForThisPeriod && !recentlyPlayed) {
        hasPlayedInitialAlarm.current = true;
        setLastAlarmedDueTime(currentDueTime);
        markAlarmPlayed();
        playAlarmBeep();
      } else if (alreadyAlarmedForThisPeriod || recentlyPlayed) {
        // If we already alarmed for this period (from localStorage) or recently, sync the ref
        hasPlayedInitialAlarm.current = true;
      }
      
      // Set up repeating alarm every 5 seconds until user checks in
      alarmIntervalRef.current = setInterval(() => {
        playAlarmBeep();
      }, 5 * 1000); // 5 seconds
      
      // Update app badge to show "1"
      updateAppBadge(1);
    } else if (status && !effectivelyOverdue) {
      // Only clear when we have status data AND user is definitely not overdue
      // This prevents clearing localStorage during initial page load when status is undefined
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      hasPlayedInitialAlarm.current = false;
      
      // Clear the persisted alarm state when no longer overdue (new check-in period started)
      clearLastAlarmedDueTime();
      
      // Clear app badge
      updateAppBadge(0);
    }
    
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [effectivelyOverdue, status?.nextCheckInDue, status]);

  const checkInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/checkins"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      toast({
        title: "Check-in successful!",
        description: "Your loved ones know you're aok.",
      });
    },
    onError: () => {
      toast({
        title: "Check-in failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Emergency alert activation - activates Red Alert Mode if continuous tracking is enabled
  const emergencyMutation = useMutation({
    mutationFn: async (location?: { latitude: number; longitude: number }) => {
      // Send emergency notification (backend activates red alert mode if continuous tracking enabled)
      const response = await apiRequest("POST", "/api/emergency", { location });
      return response.json();
    },
    onSuccess: (data: any) => {
      setShowEmergencyDialog(false);
      // Refresh red alert status
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/status"] });
      
      if (data.isRedAlert) {
        toast({
          title: "Emergency Alert Sent",
          description: "Your location will be shared every 5 minutes until you enter your password to deactivate.",
        });
      } else {
        toast({
          title: "Emergency Alert Sent",
          description: "Your emergency contacts have been notified.",
        });
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to send emergency alert";
      toast({
        title: "Alert failed",
        description: message.includes("No emergency contacts") 
          ? "Please add emergency contacts first." 
          : message,
        variant: "destructive",
      });
    },
  });

  // Deactivate red alert mode
  const deactivateMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/emergency/deactivate", { password });
      return response.json();
    },
    onSuccess: () => {
      setShowDeactivateDialog(false);
      setDeactivatePassword("");
      setShowDeactivatePassword(false);
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/status"] });
      toast({
        title: "Red Alert Mode Deactivated",
        description: "Your emergency alert has been cancelled. Location sharing has stopped.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to deactivate";
      toast({
        title: "Deactivation failed",
        description: message.includes("Incorrect password") ? "Incorrect password. Please try again." : message,
        variant: "destructive",
      });
    },
  });

  // Start getting location when dialog opens
  const handleOpenEmergencyDialog = () => {
    setShowEmergencyDialog(true);
    setCachedLocation(null);
    
    if ("geolocation" in navigator) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGettingLocation(false);
          setCachedLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('[GPS] Location error:', error.message);
          setGettingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    }
  };

  // Send alert with cached location (or without if not available)
  const handleEmergencyAlert = () => {
    emergencyMutation.mutate(cachedLocation || undefined);
  };
  
  // Handle deactivation
  const handleDeactivate = () => {
    if (!deactivatePassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to deactivate Red Alert Mode.",
        variant: "destructive",
      });
      return;
    }
    deactivateMutation.mutate(deactivatePassword);
  };
  
  // Location heartbeat during Red Alert Mode - send location updates
  useEffect(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (isRedAlertMode && redAlertStatus?.alertId) {
      // Send location heartbeat every 30 seconds (server handles 5-min notification dispatch)
      const sendHeartbeat = async () => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await apiRequest("POST", "/api/emergency/heartbeat", {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
                console.log('[RedAlert] Heartbeat sent with location');
              } catch (e) {
                console.error('[RedAlert] Heartbeat failed:', e);
              }
            },
            (error) => {
              console.log('[RedAlert] Location unavailable for heartbeat:', error.message);
            },
            { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 }
          );
        }
      };
      
      // Send initial heartbeat
      sendHeartbeat();
      // Then send every 30 seconds
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
    }
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isRedAlertMode, redAlertStatus?.alertId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Use effectivelyOverdue for immediate UI updates (doesn't wait for server)
  const displayStatus = effectivelyOverdue ? "overdue" : status?.status;
  const statusInfo = displayStatus ? getStatusLabel(displayStatus) : { text: "Loading", variant: "secondary" as const };

  // Restricted view for org-managed clients (activated via reference code)
  if (isOrgManagedClient) {
    return (
      <div className={`flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto min-h-screen ${isRedAlertMode ? "bg-destructive/10" : ""}`}>
        {/* Status Card */}
        <Card className={`border-2 ${effectivelyOverdue ? "border-destructive bg-destructive/5" : ""}`}>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <div className={`rounded-full p-4 ${effectivelyOverdue ? "bg-destructive/10" : "bg-primary/10"}`}>
              <ShieldCheck className={`h-16 w-16 ${effectivelyOverdue ? "text-destructive" : "text-primary"}`} />
            </div>
            
            <div className="text-center space-y-2">
              <Badge variant={statusInfo.variant} className="text-sm px-4 py-1" data-testid="badge-status">
                {statusInfo.text}
              </Badge>
              
              {status?.streak !== undefined && status.streak > 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-streak">
                  {status.streak} day streak
                </p>
              )}
            </div>

            {/* Check-In Timer */}
            <div className="w-full max-w-xs text-center space-y-4">
              {countdown && (
                <div className={`text-3xl font-mono font-bold ${effectivelyOverdue ? "text-destructive" : "text-foreground"}`} data-testid="text-countdown">
                  {countdown}
                </div>
              )}
              
              {/* Check-In Button - only enabled when due or overdue */}
              <Button
                size="lg"
                className="w-full px-8 py-6 text-lg font-semibold"
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending || !effectivelyOverdue}
                data-testid="button-check-in"
              >
                {checkInMutation.isPending ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Checking In...</>
                ) : effectivelyOverdue ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    I'm OK
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Not Due Yet
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Emergency / Red Alert Section */}
        {isRedAlertMode ? (
          <Card className="border-destructive border-2 bg-destructive/20">
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-destructive animate-pulse">
                  <AlertOctagon className="h-8 w-8" />
                  <span className="text-xl font-bold">RED ALERT ACTIVE</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your location is being shared with your emergency contacts every 5 minutes.
                </p>
                {redAlertStatus?.activatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Started: {format(new Date(redAlertStatus.activatedAt), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full py-4 font-semibold border-2"
                  onClick={() => setShowDeactivateDialog(true)}
                  data-testid="button-deactivate-alert"
                >
                  <Lock className="h-5 w-5 mr-2" />
                  Deactivate Alert
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="py-4">
              <Button
                variant="destructive"
                size="lg"
                className="w-full py-6 text-lg font-semibold"
                onClick={handleOpenEmergencyDialog}
                data-testid="button-emergency"
              >
                <AlertOctagon className="h-6 w-6 mr-2" />
                Emergency Alert
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Sends immediate alert to all emergency contacts
              </p>
            </CardContent>
          </Card>
        )}

        {/* Theme Toggle */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
              >
                {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Reference Code Display */}
        <div className="text-center text-xs text-muted-foreground" data-testid="text-reference-code">
          Reference: {user?.referenceId}
        </div>

        {/* Emergency Dialog */}
        <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" />
                Emergency Alert
              </DialogTitle>
              <DialogDescription>
                This will immediately notify all your emergency contacts via email and phone call. 
                {gettingLocation && " Getting your location..."}
                {cachedLocation && " Your location will be shared."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleEmergencyAlert}
                disabled={emergencyMutation.isPending || gettingLocation}
                data-testid="button-confirm-emergency"
              >
                {gettingLocation ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Getting Location...</>
                ) : emergencyMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Alert...</>
                ) : (
                  "Send Emergency Alert"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Red Alert Dialog */}
        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Deactivate Red Alert
              </DialogTitle>
              <DialogDescription>
                Enter your password to confirm that you are safe and stop sharing your location.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deactivate-password">Password</Label>
                <div className="relative">
                  <Input
                    id="deactivate-password"
                    type={showDeactivatePassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={deactivatePassword}
                    onChange={(e) => setDeactivatePassword(e.target.value)}
                    autoComplete="off"
                    data-testid="input-deactivate-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                    data-testid="button-toggle-deactivate-password"
                  >
                    {showDeactivatePassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setShowDeactivateDialog(false); setDeactivatePassword(""); setShowDeactivatePassword(false); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
                data-testid="button-confirm-deactivate"
              >
                {deactivateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deactivating...</>
                ) : (
                  "Confirm Deactivation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto min-h-screen ${isRedAlertMode ? "bg-destructive/10" : ""}`}>
      <Card className={`border-2 ${effectivelyOverdue ? "border-destructive bg-destructive/5" : ""}`}>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className={`rounded-full p-4 ${effectivelyOverdue ? "bg-destructive/10" : "bg-primary/10"}`}>
            <ShieldCheck className={`h-16 w-16 ${effectivelyOverdue ? "text-destructive" : "text-primary"}`} />
          </div>
          
          <div className="text-center space-y-2">
            <Badge variant={statusInfo.variant} className="text-sm px-4 py-1">
              {statusInfo.text}
            </Badge>
            
            {status?.streak !== undefined && status.streak > 0 && (
              <p className="text-sm text-muted-foreground">
                {status.streak} day streak
              </p>
            )}
          </div>

          {status?.contactCount === 0 ? (
            <div className="text-center space-y-4 w-full max-w-xs">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <p className="text-sm">Add an emergency contact to check in</p>
              </div>
              <Link href="/app/contacts">
                <Button
                  size="lg"
                  className="w-full px-8 py-6 text-lg font-semibold"
                  data-testid="button-add-contacts"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Add Contact
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full max-w-xs px-8 py-6 text-lg font-semibold"
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending || !effectivelyOverdue}
              data-testid="button-check-in"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : effectivelyOverdue ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <Clock className="h-5 w-5 mr-2" />
              )}
              {effectivelyOverdue ? "Check In Now" : "Not Due Yet"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Last Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.lastCheckIn ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold" data-testid="text-last-checkin-date">
                  {format(new Date(status.lastCheckIn), "d MMMM yyyy")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No check-ins yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Next Check-In Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.nextCheckInDue ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold font-mono tracking-tight" data-testid="text-countdown">
                  {countdown || "Due now"}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-next-checkin-datetime">
                  {format(new Date(status.nextCheckInDue), "d MMMM yyyy 'at' h:mm a")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Check in to start tracking</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency / Red Alert Section */}
      {isRedAlertMode ? (
        <Card className="border-destructive border-2 bg-destructive/20">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-destructive animate-pulse">
                <AlertOctagon className="h-8 w-8" />
                <span className="text-xl font-bold">RED ALERT ACTIVE</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your location is being shared with your emergency contacts every 5 minutes.
              </p>
              {redAlertStatus?.activatedAt && (
                <p className="text-xs text-muted-foreground">
                  Started: {format(new Date(redAlertStatus.activatedAt), "dd/MM/yyyy HH:mm")}
                </p>
              )}
              <Button
                variant="outline"
                size="lg"
                className="w-full max-w-xs py-4 font-semibold border-2"
                onClick={() => setShowDeactivateDialog(true)}
                data-testid="button-deactivate-alert"
              >
                <Lock className="h-5 w-5 mr-2" />
                Deactivate Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertOctagon className="h-8 w-8 text-destructive" />
              <div className="space-y-1">
                <h3 className="font-semibold">Emergency Alert</h3>
                <p className="text-sm text-muted-foreground">
                  {isRedAlertEnabled 
                    ? "Notify contacts and share your location every 5 minutes"
                    : "Immediately notify all your contacts if you need help"
                  }
                </p>
              </div>
              {status?.contactCount === 0 ? (
                <Link href="/app/contacts">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full max-w-xs"
                    data-testid="button-emergency-add-contact"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Add Contact First
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full max-w-xs"
                  onClick={handleOpenEmergencyDialog}
                  data-testid="button-emergency"
                >
                  <AlertOctagon className="h-5 w-5 mr-2" />
                  Emergency Alert
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="h-5 w-5" />
              Send Emergency Alert?
            </DialogTitle>
            <DialogDescription>
              This will immediately send an urgent alert to ALL your emergency contacts. 
              They will be notified that you need immediate help and your last known location will be shared.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Only use this in a real emergency. Your contacts will receive an urgent email asking them to contact you immediately.
            </p>
            {isRedAlertEnabled && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  <strong>Continuous tracking enabled:</strong> Your location will be shared every 5 minutes until you enter your password to deactivate.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              {gettingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Getting your location...</span>
                </>
              ) : cachedLocation ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Location ready to send</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">Location unavailable - will send without</span>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmergencyDialog(false)}
              data-testid="button-cancel-emergency"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmergencyAlert}
              disabled={emergencyMutation.isPending}
              data-testid="button-confirm-emergency"
            >
              {emergencyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending Alert...
                </>
              ) : (
                <>
                  <AlertOctagon className="h-4 w-4 mr-2" />
                  Yes, Send Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Red Alert Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Deactivate Red Alert
            </DialogTitle>
            <DialogDescription>
              Enter your password to confirm that you are safe and stop sharing your location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deactivate-password-main">Password</Label>
              <div className="relative">
                <Input
                  id="deactivate-password-main"
                  type={showDeactivatePassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  autoComplete="off"
                  data-testid="input-deactivate-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                  data-testid="button-toggle-deactivate-password-main"
                >
                  {showDeactivatePassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowDeactivateDialog(false); setDeactivatePassword(""); setShowDeactivatePassword(false); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
              data-testid="button-confirm-deactivate"
            >
              {deactivateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deactivating...</>
              ) : (
                "Confirm Deactivation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
