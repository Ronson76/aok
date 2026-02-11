import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  MapPin, Clock, CheckCircle, Phone, Loader2, Timer, History,
  XCircle, Navigation, Siren, Play, AlertTriangle, ChevronDown,
  ChevronUp, ShoppingCart, Footprints, Car, Calendar, Users,
  Dog, Dumbbell, Package, Lock, Shield, BatteryLow
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import type { ErrandSession, ErrandActivityType, Contact } from "@shared/schema";

let sharedAudioContext: AudioContext | null = null;

function playActivityAlarm() {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    const ctx = sharedAudioContext!;
    const startTime = ctx.currentTime;
    const playChime = (delay: number, frequency: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const t = startTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
      osc.start(t);
      osc.stop(t + duration);
    };
    playChime(0, 523, 0.4);
    playChime(0.15, 659, 0.4);
    playChime(0.30, 784, 0.6);
  } catch (e) {
    console.error('[Activity Audio] Failed to play alarm:', e);
  }
}

const ACTIVITY_ALARM_STORAGE_KEY = 'aok_activity_alarm_session';
const HOLD_DURATION_MS = 10000;

const ACTIVITY_TYPES: { value: ErrandActivityType; label: string; icon: any }[] = [
  { value: "walking", label: "Walking", icon: Footprints },
  { value: "shopping", label: "Shopping", icon: ShoppingCart },
  { value: "errands", label: "Errands", icon: Package },
  { value: "appointment", label: "Appointment", icon: Calendar },
  { value: "visiting", label: "Visiting", icon: Users },
  { value: "commute", label: "Commute", icon: Car },
  { value: "dog_walking", label: "Dog Walking", icon: Dog },
  { value: "exercise", label: "Exercise", icon: Dumbbell },
  { value: "other", label: "Other", icon: MapPin },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "360", label: "6 hours" },
  { value: "480", label: "8 hours" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return <Badge data-testid="badge-status-active" className="bg-green-600 text-white">Active</Badge>;
    case "grace": return <Badge data-testid="badge-status-grace" className="bg-yellow-600 text-white">Grace Period</Badge>;
    case "overdue": return <Badge data-testid="badge-status-overdue" className="bg-red-600 text-white">Overdue</Badge>;
    case "completed": return <Badge data-testid="badge-status-completed">Completed</Badge>;
    case "cancelled": return <Badge data-testid="badge-status-cancelled" className="bg-muted-foreground text-white">Cancelled</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function getActivityIcon(type: string) {
  const found = ACTIVITY_TYPES.find(a => a.value === type);
  return found ? found.icon : MapPin;
}

function getActivityLabel(type: string, customLabel?: string | null) {
  if (customLabel) return customLabel;
  const found = ACTIVITY_TYPES.find(a => a.value === type);
  return found ? found.label : type;
}

function useGeolocation() {
  const [position, setPosition] = useState<{ lat: string; lng: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission blocked. Please allow location access in your browser settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location unavailable. Please check your device's location services.");
        } else {
          setError(err.message);
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
        setError(null);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { stopWatching(); };
  }, [stopWatching]);

  return { position, error, loading, requestLocation, startWatching, stopWatching };
}

function CountdownTimer({ targetDate, label, onExpired }: { targetDate: Date; label: string; onExpired?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const diff = differenceInSeconds(new Date(targetDate), new Date());
      setSecondsLeft(Math.max(0, diff));
      if (diff <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [targetDate, onExpired]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 300;

  return (
    <div className={`text-center ${isUrgent ? "text-red-500" : ""}`} data-testid="countdown-timer">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-3xl font-mono font-bold tabular-nums">
        {hours > 0 && `${hours}:`}{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
    </div>
  );
}

function StartSessionForm({ onStarted }: { onStarted: () => void }) {
  const { toast } = useToast();
  const [activityType, setActivityType] = useState<ErrandActivityType>("walking");
  const [customLabel, setCustomLabel] = useState("");
  const [duration, setDuration] = useState("60");
  const geo = useGeolocation();

  const startMutation = useMutation({
    mutationFn: async (data: { activityType: ErrandActivityType; expectedDurationMins: number; customLabel?: string }) => {
      const res = await apiRequest("POST", "/api/errands/start", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/errands/history"] });
      toast({ title: "Activity started", description: "Your session is now being tracked." });
      onStarted();
    },
    onError: (error: any) => {
      toast({ title: "Could not start", description: error.message, variant: "destructive" });
    },
  });

  const handleStart = () => {
    geo.requestLocation();
    startMutation.mutate({
      activityType,
      expectedDurationMins: parseInt(duration),
      customLabel: customLabel.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Start Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Activity Type</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {ACTIVITY_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = activityType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setActivityType(type.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`activity-type-${type.value}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="custom-label">Custom Label (optional)</Label>
          <Input
            id="custom-label"
            placeholder={
              activityType === "walking" ? "e.g. Walking to the pharmacy" :
              activityType === "shopping" ? "e.g. Weekly food shop" :
              activityType === "errands" ? "e.g. Dropping off parcels" :
              activityType === "appointment" ? "e.g. Dentist at 2pm" :
              activityType === "visiting" ? "e.g. Visiting Mum" :
              "e.g. Describe your activity"
            }
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className="mt-1"
            data-testid="input-custom-label"
          />
        </div>

        <div>
          <Label>Expected Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="mt-1" data-testid="select-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            A 10-minute grace period applies after your expected duration before contacts are notified.
          </p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleStart}
          disabled={startMutation.isPending}
          data-testid="button-start-activity"
        >
          {startMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Start Activity
        </Button>
      </CardContent>
    </Card>
  );
}

function ActiveSessionView({ session, onEnded }: { session: ErrandSession; onEnded: () => void }) {
  const { toast } = useToast();
  const geo = useGeolocation();
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedInitialAlarm = useRef(false);
  const ActivityIcon = getActivityIcon(session.activityType);

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const primaryContact = contacts?.find(c => c.isPrimary && c.confirmed);

  useEffect(() => {
    geo.startWatching();
    return () => { geo.stopWatching(); };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const lowBatterySentRef = useRef(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const batteryHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    lowBatterySentRef.current = false;
  }, [session.id]);

  useEffect(() => {
    if (session.status === "completed" || session.status === "cancelled") return;
    let battery: any = null;

    const checkBattery = (batt: any) => {
      const level = Math.round(batt.level * 100);
      setBatteryLevel(level);
      if (level < 20 && !lowBatterySentRef.current) {
        lowBatterySentRef.current = true;
        apiRequest("POST", "/api/errands/low-battery", { batteryLevel: level })
          .then(() => {
            toast({
              title: "Low Battery Alert Sent",
              description: `Your primary contacts have been notified that your battery is at ${level}%.`,
            });
          })
          .catch(() => {});
      }
    };

    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        battery = batt;
        checkBattery(batt);
        const handler = () => checkBattery(batt);
        batteryHandlerRef.current = handler;
        batt.addEventListener("levelchange", handler);
      }).catch(() => {});
    }

    return () => {
      if (battery && batteryHandlerRef.current) {
        battery.removeEventListener("levelchange", batteryHandlerRef.current);
        batteryHandlerRef.current = null;
      }
    };
  }, [session.id, session.status]);

  useEffect(() => {
    if (geo.position && session.status !== "completed" && session.status !== "cancelled") {
      const isOverdueStatus = session.status === "overdue";
      const interval = isOverdueStatus ? 300000 : 60000;

      const sendGps = async () => {
        try {
          await apiRequest("POST", `/api/errands/${session.id}/gps`, {
            lat: geo.position!.lat,
            lng: geo.position!.lng,
          });
          if (isOverdueStatus && session.emergencyAlertId) {
            try {
              await apiRequest("POST", "/api/emergency/heartbeat", {
                latitude: parseFloat(geo.position!.lat),
                longitude: parseFloat(geo.position!.lng),
              });
            } catch {}
          }
        } catch {}
      };
      sendGps();

      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
      gpsIntervalRef.current = setInterval(sendGps, interval);
    }
    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
        gpsIntervalRef.current = null;
      }
    };
  }, [geo.position, session.id, session.status, session.emergencyAlertId]);

  useEffect(() => {
    const isGraceOrOverdue = session.status === "grace" || session.status === "overdue";

    if (isGraceOrOverdue) {
      const lastAlarmedSession = localStorage.getItem(ACTIVITY_ALARM_STORAGE_KEY);
      const alreadyAlarmed = lastAlarmedSession === session.id;

      if (!hasPlayedInitialAlarm.current && !alreadyAlarmed) {
        hasPlayedInitialAlarm.current = true;
        localStorage.setItem(ACTIVITY_ALARM_STORAGE_KEY, session.id);
        playActivityAlarm();
      } else if (alreadyAlarmed) {
        hasPlayedInitialAlarm.current = true;
      }

      alarmIntervalRef.current = setInterval(() => {
        playActivityAlarm();
      }, 5000);
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      hasPlayedInitialAlarm.current = false;
      if (session.status === "completed" || session.status === "cancelled") {
        localStorage.removeItem(ACTIVITY_ALARM_STORAGE_KEY);
      }
    }

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [session.status, session.id]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/errands/${session.id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      localStorage.removeItem(ACTIVITY_ALARM_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/errands/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/status"] });
      toast({ title: "Activity completed", description: "Well done! Your session has been recorded." });
      geo.stopWatching();
      onEnded();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/errands/${session.id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      localStorage.removeItem(ACTIVITY_ALARM_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/errands/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/status"] });
      toast({ title: "Activity cancelled" });
      geo.stopWatching();
      onEnded();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/errands/${session.id}/checkin`, {
        lat: geo.position?.lat,
        lng: geo.position?.lng,
      });
      return res.json();
    },
    onSuccess: () => {
      localStorage.removeItem(ACTIVITY_ALARM_STORAGE_KEY);
      hasPlayedInitialAlarm.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] });
      toast({ title: "Checked in", description: "Timer has been refreshed." });
    },
  });

  const holdDeactivateMutation = useMutation({
    mutationFn: async () => {
      let location: { latitude: number; longitude: number } | undefined;
      if (geo.position) {
        location = {
          latitude: parseFloat(geo.position.lat),
          longitude: parseFloat(geo.position.lng),
        };
      }
      const response = await apiRequest("POST", "/api/emergency/deactivate-hold", { location });
      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem(ACTIVITY_ALARM_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/status"] });
      toast({
        title: "Deactivation requested",
        description: "Your contacts have been asked to confirm you are safe. Alerts continue until a contact confirms.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Deactivation failed", description: error?.message || "Failed to deactivate", variant: "destructive" });
    },
  });

  const startHold = () => {
    setIsHolding(true);
    holdStartTimeRef.current = Date.now();
    setHoldProgress(0);
    holdIntervalRef.current = setInterval(() => {
      if (holdStartTimeRef.current) {
        const elapsed = Date.now() - holdStartTimeRef.current;
        const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
        setHoldProgress(progress);
        if (progress >= 1) {
          endHold(true);
        }
      }
    }, 50);
  };

  const endHold = (completed: boolean = false) => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartTimeRef.current = null;
    setIsHolding(false);
    if (completed) {
      holdDeactivateMutation.mutate();
    }
    setTimeout(() => setHoldProgress(0), 300);
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const isGrace = session.status === "grace";
  const isOverdue = session.status === "overdue";
  const isEnded = session.status === "completed" || session.status === "cancelled";

  return (
    <div className="space-y-4">
      {batteryLevel !== null && batteryLevel < 20 && (
        <Card className="border-amber-500 border-2 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <BatteryLow className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300" data-testid="text-low-battery">Battery Low ({batteryLevel}%)</span>
                <p className="text-xs text-muted-foreground">Your primary contacts have been alerted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {isOverdue && session.emergencyAlertId && (
        <Card className="border-red-500 border-2 bg-red-500/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">EMERGENCY ALERT ACTIVE</span>
                <p className="text-xs text-muted-foreground">Your contacts are being notified with location updates every 5 minutes</p>
              </div>
            </div>

            <Button
              className="w-full relative overflow-visible bg-red-600 text-white border-red-700"
              size="lg"
              onPointerDown={startHold}
              onPointerUp={() => endHold(false)}
              onPointerLeave={() => endHold(false)}
              disabled={holdDeactivateMutation.isPending}
              data-testid="button-deactivate-hold"
            >
              <div className="absolute inset-0 bg-green-600 rounded-md transition-all" style={{ width: `${holdProgress * 100}%` }} />
              <span className="relative z-10 flex items-center justify-center">
                {holdDeactivateMutation.isPending ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending...</>
                ) : holdProgress > 0 ? (
                  <><Lock className="h-5 w-5 mr-2" /> {Math.ceil((1 - holdProgress) * 10)}s - Keep Holding</>
                ) : (
                  <><Lock className="h-5 w-5 mr-2" /> Hold 10s - I'm Safe</>
                )}
              </span>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Alerts continue until a contact confirms they have spoken to you
            </p>
          </CardContent>
        </Card>
      )}

      <Card className={isOverdue ? "border-red-500 border-2" : isGrace ? "border-yellow-500 border-2" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              {getActivityLabel(session.activityType, session.customLabel)}
            </CardTitle>
            {getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isGrace || isOverdue) && (
            <div className={`p-3 rounded-md ${isOverdue ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isOverdue
                    ? "Your contacts have been notified. Hold the button above to request emergency end, or complete your activity."
                    : "Your expected duration has passed. Check in to extend or complete your activity."}
                </span>
              </div>
            </div>
          )}

          {!isEnded && (
            <div className="flex justify-center py-3">
              {isGrace ? (
                <CountdownTimer
                  targetDate={new Date(session.graceEndsAt)}
                  label="Grace period remaining"
                  onExpired={() => queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] })}
                />
              ) : (
                <CountdownTimer
                  targetDate={new Date(session.expectedEndAt)}
                  label="Time remaining"
                  onExpired={() => queryClient.invalidateQueries({ queryKey: ["/api/errands/active"] })}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Started {format(new Date(session.startedAt), "HH:mm")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span>{session.expectedDurationMins} min expected</span>
            </div>
            {geo.position && (
              <div className="flex items-center gap-2 col-span-2">
                <Navigation className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">
                  GPS tracking active{isOverdue ? " (updates every 5 min)" : ""}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isEnded && (
        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            data-testid="button-complete-activity"
          >
            {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            I'm Done - Complete Activity
          </Button>

          {(isGrace || isOverdue) && (
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending}
              data-testid="button-checkin-extend"
            >
              {checkinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Timer className="h-4 w-4 mr-2" />}
              I'm OK - Need More Time
            </Button>
          )}

          <div className="grid grid-cols-2 gap-3">
            {primaryContact && primaryContact.phone && (
              <Button
                variant="outline"
                size="lg"
                asChild
                data-testid="button-call-contact"
              >
                <a href={`tel:${primaryContact.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call {primaryContact.name.split(" ")[0]}
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              asChild
              data-testid="button-call-999"
            >
              <a href="tel:999" className="text-red-600">
                <Siren className="h-4 w-4 mr-2" />
                Call 999
              </a>
            </Button>
          </div>

          {!isOverdue && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-activity"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Activity
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SessionHistory() {
  const [collapsed, setCollapsed] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { data: sessions, isLoading } = useQuery<ErrandSession[]>({
    queryKey: ["/api/errands/history"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const completedSessions = sessions?.filter(s => s.status === "completed" || s.status === "cancelled" || s.status === "overdue") || [];

  if (completedSessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No activity history yet</p>
        </CardContent>
      </Card>
    );
  }

  const displaySessions = showAll ? completedSessions : completedSessions.slice(0, 5);

  return (
    <div className="space-y-2">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setCollapsed(!collapsed)}
        data-testid="button-collapse-history"
      >
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4" />
          Recent Activities
          <Badge variant="secondary" className="text-xs no-default-active-elevate">{completedSessions.length}</Badge>
        </h3>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>
      {!collapsed && (
        <>
          {displaySessions.map((session) => {
            const Icon = getActivityIcon(session.activityType);
            return (
              <Card key={session.id} data-testid={`history-item-${session.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {getActivityLabel(session.activityType, session.customLabel)}
                      </span>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{format(new Date(session.startedAt), "dd MMM yyyy HH:mm")}</span>
                    <span>{session.expectedDurationMins} min</span>
                    {session.completedAt && (
                      <span>Ended {format(new Date(session.completedAt), "HH:mm")}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {completedSessions.length > 5 && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)} data-testid="button-toggle-history">
              {showAll ? "Show less" : `Show all ${completedSessions.length} activities`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function Errands() {
  const { user } = useAuth();
  const [view, setView] = useState<"loading" | "start" | "active">("loading");

  const { data: activeSession, isLoading } = useQuery<ErrandSession | null>({
    queryKey: ["/api/errands/active"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!isLoading) {
      setView(activeSession ? "active" : "start");
    }
  }, [activeSession, isLoading]);

  if (isLoading || view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Activities</h1>
          <p className="text-sm text-muted-foreground">Track your daily activities and stay connected</p>
        </div>
      </div>

      {view === "active" && activeSession ? (
        <ActiveSessionView session={activeSession} onEnded={() => setView("start")} />
      ) : (
        <StartSessionForm onStarted={() => setView("active")} />
      )}

      <SessionHistory />
    </div>
  );
}
