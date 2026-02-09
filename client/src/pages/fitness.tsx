import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Clock, MapPin, TrendingUp, ArrowLeft, Lock, Bike, Footprints,
  Play, Pause, Square, ChevronRight, Activity, Navigation, Flame, Timer,
  Zap, Target, BarChart3, Camera, Image, Trash2, Edit3, X, Check, Plus,
  CalendarDays, HelpCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { FaRunning } from "react-icons/fa";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useEffect, useState, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDuration, formatDistance, formatPace, formatSpeed,
  haversineDistance, computeDistance, computePace, computeSpeed,
} from "@/lib/fitness-utils";
import { StepCounter, estimateCalories, estimateStepsFromDistance } from "@/lib/step-counter";
import type { FitnessActivity, ActivityType, PrivacyLevel, ActivityMemory } from "@shared/schema";
import RoutesTab from "@/components/route-planner";
import { useUpload } from "@/hooks/use-upload";

function getActivityIcon(type: string) {
  if (type === "cycle") return Bike;
  if (type === "walk") return Footprints;
  return Activity;
}

function getActivityColor(type: string) {
  if (type === "walk") return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600", accent: "emerald" };
  if (type === "cycle") return { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600", accent: "purple" };
  return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600", accent: "blue" };
}

function ActivityMap({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || points.length < 2) return;

    import("leaflet").then((mod) => {
      const L = mod.default || mod;
      if (mapInstance.current) {
        mapInstance.current.remove();
      }

      const map = L.map(mapRef.current!, { zoomControl: false, attributionControl: false });
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const latlngs = points.map(p => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latlngs, { color: "#3b82f6", weight: 4, opacity: 0.85 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

      L.circleMarker(latlngs[0], { radius: 7, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }).addTo(map);
      L.circleMarker(latlngs[latlngs.length - 1], { radius: 7, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1, weight: 2 }).addTo(map);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [points]);

  if (points.length < 2) return null;

  return <div ref={mapRef} className="h-48 rounded-xl overflow-hidden" data-testid="activity-map" />;
}

function Recorder({ onFinish }: { onFinish: () => void }) {
  const { toast } = useToast();
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("private");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [liveShare, setLiveShare] = useState(false);
  const watchId = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const stepCounterRef = useRef<StepCounter | null>(null);

  const { data: existing } = useQuery<FitnessActivity | null>({
    queryKey: ["/api/fitness/activities/recording"],
  });

  useEffect(() => {
    if (existing && existing.status === "recording") {
      setActivityId(existing.id);
      setActivityType(existing.type as ActivityType);
      setPrivacyLevel(existing.privacyLevel as PrivacyLevel);
      setIsRecording(true);
      setDuration(existing.durationSec);
      setDistance(existing.distanceM);
      setSteps(existing.stepCount || 0);
      setCalories(existing.caloriesEstimate || 0);
      setPoints((existing.gpsPoints || []) as any);
      setLiveShare(existing.liveShareEnabled);
      startTimeRef.current = Date.now() - existing.durationSec * 1000;
    } else if (existing && existing.status === "paused") {
      setActivityId(existing.id);
      setActivityType(existing.type as ActivityType);
      setPrivacyLevel(existing.privacyLevel as PrivacyLevel);
      setIsRecording(true);
      setIsPaused(true);
      setDuration(existing.durationSec);
      setDistance(existing.distanceM);
      setSteps(existing.stepCount || 0);
      setCalories(existing.caloriesEstimate || 0);
      setPoints((existing.gpsPoints || []) as any);
      setLiveShare(existing.liveShareEnabled);
      pausedDurationRef.current = existing.durationSec;
    }
  }, [existing]);

  const startStepCounter = useCallback((initialSteps = 0) => {
    if (stepCounterRef.current) {
      stepCounterRef.current.stop();
    }
    const counter = new StepCounter((totalSteps) => {
      setSteps(totalSteps);
    }, initialSteps);
    stepCounterRef.current = counter;
    counter.start().then((available) => {
      setMotionAvailable(available);
    });
  }, []);

  const stopStepCounter = useCallback(() => {
    if (stepCounterRef.current) {
      stepCounterRef.current.stop();
    }
  }, []);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "GPS unavailable", description: "Your device does not support location tracking.", variant: "destructive" });
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };
        setPoints(prev => {
          const newPoints = [...prev, point];
          if (newPoints.length >= 2) {
            const last = newPoints[newPoints.length - 2];
            const d = haversineDistance(last.lat, last.lng, point.lat, point.lng);
            if (d > 1) setDistance(computeDistance(newPoints));
          }
          return newPoints;
        });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }, [toast]);

  const stopGPS = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fitness/activities", { type: activityType, privacyLevel });
      return res.json();
    },
    onSuccess: (data: FitnessActivity) => {
      setActivityId(data.id);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setDistance(0);
      setSteps(0);
      setCalories(0);
      setPoints([]);
      pausedDurationRef.current = 0;
      startGPS();
      startTimer();
      if (activityType !== "cycle") startStepCounter(0);
      queryClient.invalidateQueries({ queryKey: ["/api/fitness/activities/recording"] });
    },
    onError: () => toast({ title: "Error", description: "Could not start activity.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest("PATCH", `/api/fitness/activities/${activityId}`, updates);
      return res.json();
    },
  });

  const handleStart = () => createMutation.mutate();

  const handlePause = () => {
    setIsPaused(true);
    stopGPS();
    stopTimer();
    stopStepCounter();
    pausedDurationRef.current = duration;
    const cal = estimateCalories(activityType, duration);
    setCalories(cal);
    const finalSteps = motionAvailable ? steps : (activityType !== "cycle" ? estimateStepsFromDistance(distance, activityType) : 0);
    updateMutation.mutate({ status: "paused", durationSec: duration, distanceM: distance, gpsPoints: points, stepCount: finalSteps, caloriesEstimate: cal });
  };

  const handleResume = () => {
    setIsPaused(false);
    startGPS();
    startTimer();
    if (activityType !== "cycle") startStepCounter(steps);
    updateMutation.mutate({ status: "recording" });
  };

  const handleStop = () => {
    stopGPS();
    stopTimer();
    stopStepCounter();
    const pace = activityType !== "cycle" ? computePace(distance, duration) : null;
    const speed = computeSpeed(distance, duration);
    const cal = estimateCalories(activityType, duration);
    const finalSteps = motionAvailable ? steps : (activityType !== "cycle" ? estimateStepsFromDistance(distance, activityType) : 0);
    const title = `${activityType === "run" ? "Run" : activityType === "walk" ? "Walk" : "Ride"} - ${formatDistance(distance)}`;
    updateMutation.mutate({
      status: "completed",
      endTime: new Date().toISOString(),
      durationSec: duration,
      distanceM: distance,
      avgPaceSecPerKm: pace,
      avgSpeedKph: speed,
      stepCount: finalSteps,
      caloriesEstimate: cal,
      gpsPoints: points,
      title,
      liveShareEnabled: liveShare,
    }, {
      onSuccess: () => {
        toast({ title: "Activity saved", description: `${title} recorded successfully.` });
        setIsRecording(false);
        setIsPaused(false);
        setActivityId(null);
        setDuration(0);
        setDistance(0);
        setSteps(0);
        setCalories(0);
        setPoints([]);
        queryClient.invalidateQueries({ queryKey: ["/api/fitness/activities"] });
        queryClient.invalidateQueries({ queryKey: ["/api/fitness/activities/recording"] });
        queryClient.invalidateQueries({ queryKey: ["/api/fitness/stats"] });
        onFinish();
      },
    });
  };

  useEffect(() => {
    return () => { stopGPS(); stopTimer(); stopStepCounter(); };
  }, [stopGPS, stopTimer, stopStepCounter]);

  const liveCalories = estimateCalories(activityType, duration);
  const liveSteps = motionAvailable ? steps : (activityType !== "cycle" ? estimateStepsFromDistance(distance, activityType) : 0);
  const currentPace = activityType !== "cycle" ? computePace(distance, duration) : null;
  const speed = computeSpeed(distance, duration);

  if (!isRecording) {
    const activityOptions: { type: ActivityType; label: string; icon: any; color: string; bgColor: string }[] = [
      { type: "run", label: "Run", icon: FaRunning, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
      { type: "walk", label: "Walk", icon: Footprints, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
      { type: "cycle", label: "Cycle", icon: Bike, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    ];

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold" data-testid="text-start-activity">Start an Activity</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose your activity and track your progress</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {activityOptions.map(opt => {
                const Icon = opt.icon;
                const isSelected = activityType === opt.type;
                return (
                  <button
                    key={opt.type}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setActivityType(opt.type)}
                    data-testid={`button-type-${opt.type}`}
                  >
                    <div className={`w-12 h-12 rounded-full ${opt.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${opt.color}`} />
                    </div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <Select value={privacyLevel} onValueChange={(v) => setPrivacyLevel(v as PrivacyLevel)}>
              <SelectTrigger data-testid="select-privacy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="w-full h-12 text-base font-semibold bg-emerald-600 border-emerald-600 text-white"
              onClick={handleStart}
              disabled={createMutation.isPending}
              data-testid="button-start-recording"
            >
              {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
              Start {activityType === "run" ? "Run" : activityType === "walk" ? "Walk" : "Ride"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actColor = getActivityColor(activityType);

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/30">
        <CardContent className="py-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <Badge className={isPaused ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"} data-testid="badge-recording">
              <div className={`w-2 h-2 rounded-full mr-1.5 ${isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
              {isPaused ? "Paused" : "Recording"}
            </Badge>
            <Badge variant="secondary" className="capitalize" data-testid="badge-type">
              {activityType}
            </Badge>
          </div>

          <div className="text-center py-2">
            <p className="text-5xl font-mono font-bold tabular-nums tracking-tight" data-testid="text-duration">{formatDuration(duration)}</p>
            <p className="text-xl font-semibold text-emerald-600 mt-2" data-testid="text-distance">{formatDistance(distance)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-0.5">{activityType === "cycle" ? "Speed" : "Pace"}</p>
              <p className="font-bold text-sm" data-testid="text-pace">
                {activityType === "cycle" ? formatSpeed(speed) : formatPace(currentPace)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <p className="text-xs text-muted-foreground mb-0.5">Calories</p>
              <p className="font-bold text-sm" data-testid="text-calories">{liveCalories} kcal</p>
            </div>
          </div>
          {activityType !== "cycle" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <Footprints className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-xs text-muted-foreground mb-0.5">Steps</p>
                <p className="font-bold text-sm" data-testid="text-steps">{liveSteps.toLocaleString()}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <MapPin className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <p className="text-xs text-muted-foreground mb-0.5">GPS Points</p>
                <p className="font-bold text-sm" data-testid="text-gps-count">{points.length}</p>
              </div>
            </div>
          )}

          {points.length >= 2 && <ActivityMap points={points} />}

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={liveShare}
                onChange={(e) => {
                  setLiveShare(e.target.checked);
                  updateMutation.mutate({ liveShareEnabled: e.target.checked });
                }}
                className="rounded"
                data-testid="checkbox-live-share"
              />
              Share live activity with contacts
            </label>
          </div>

          <div className="flex gap-2">
            {isPaused ? (
              <Button className="flex-1 h-11 bg-emerald-600 border-emerald-600 text-white" onClick={handleResume} data-testid="button-resume">
                <Play className="h-4 w-4 mr-2" /> Resume
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 h-11" onClick={handlePause} data-testid="button-pause">
                <Pause className="h-4 w-4 mr-2" /> Pause
              </Button>
            )}
            <Button variant="destructive" className="h-11" onClick={handleStop} data-testid="button-stop">
              <Square className="h-4 w-4 mr-2" /> Stop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: activity, isLoading } = useQuery<FitnessActivity & {
    ownerName: string;
  }>({
    queryKey: ["/api/fitness/activities", id],
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!activity) return <p className="text-center text-muted-foreground py-4">Activity not found</p>;

  const Icon = getActivityIcon(activity.type);
  const colors = getActivityColor(activity.type);
  const gps = (activity.gpsPoints || []) as Array<{ lat: number; lng: number }>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-detail">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${colors.bg}`}>
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg" data-testid="text-activity-title">{activity.title || "Untitled Activity"}</p>
              <p className="text-xs text-muted-foreground">
                by {activity.ownerName} {activity.startTime && <span>on {format(new Date(activity.startTime), "d MMM yyyy, h:mm a")}</span>}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">{activity.type}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <MapPin className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="font-bold text-sm" data-testid="text-detail-distance">{formatDistance(activity.distanceM)}</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-bold text-sm" data-testid="text-detail-duration">{formatDuration(activity.durationSec)}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-bold text-sm" data-testid="text-detail-pace">
                {activity.type === "cycle" ? formatSpeed(activity.avgSpeedKph) : formatPace(activity.avgPaceSecPerKm)}
              </p>
              <p className="text-xs text-muted-foreground">{activity.type === "cycle" ? "Speed" : "Pace"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {activity.type !== "cycle" && (activity.stepCount ?? 0) > 0 && (
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <Footprints className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="font-bold text-sm" data-testid="text-detail-steps">{(activity.stepCount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Steps</p>
              </div>
            )}
            {(activity.caloriesEstimate ?? 0) > 0 && (
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="font-bold text-sm" data-testid="text-detail-calories">{Math.round(activity.caloriesEstimate || 0)} kcal</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
            )}
          </div>

          {gps.length >= 2 && <ActivityMap points={gps} />}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: activities, isLoading } = useQuery<FitnessActivity[]>({
    queryKey: ["/api/fitness/activities", { type: typeFilter, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (typeFilter !== "all") params.set("type", typeFilter);
      return apiRequest("GET", `/api/fitness/activities?${params}`).then(r => r.json());
    },
  });

  const { data: stats } = useQuery<{
    totalActivities: number; totalDistanceM: number; totalDurationSec: number;
    totalSteps: number; totalCalories: number;
    byType: Record<string, { count: number; distanceM: number; durationSec: number; steps: number; calories: number }>;
  }>({
    queryKey: ["/api/fitness/stats"],
  });

  if (selectedId) return <ActivityDetail id={selectedId} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-4">
      {stats && stats.totalActivities > 0 && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Your Stats</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-xl font-bold" data-testid="stat-total-activities">{stats.totalActivities}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Activities</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-xl font-bold" data-testid="stat-total-distance">{formatDistance(stats.totalDistanceM)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Distance</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-xl font-bold" data-testid="stat-total-duration">{formatDuration(stats.totalDurationSec)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Time</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {stats.totalSteps > 0 && (
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <Footprints className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                  <p className="text-lg font-bold" data-testid="stat-total-steps">{stats.totalSteps.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Steps</p>
                </div>
              )}
              {stats.totalCalories > 0 && (
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                  <p className="text-lg font-bold" data-testid="stat-total-calories">{Math.round(stats.totalCalories).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
              )}
            </div>
            {Object.keys(stats.byType).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(stats.byType).map(([type, s]) => {
                  const Icon = getActivityIcon(type);
                  const colors = getActivityColor(type);
                  return (
                    <div key={type} className="flex items-center gap-3 p-2.5 bg-muted/20 rounded-xl" data-testid={`stat-type-${type}`}>
                      <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                      </div>
                      <span className="text-sm font-medium capitalize flex-1">{type}s</span>
                      <span className="text-xs text-muted-foreground">{s.count} | {formatDistance(s.distanceM)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="run">Runs</SelectItem>
            <SelectItem value="walk">Walks</SelectItem>
            <SelectItem value="cycle">Rides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 bg-muted animate-pulse rounded" />
                    <div className="w-48 h-3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activities && activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map(a => {
            const Icon = getActivityIcon(a.type);
            const colors = getActivityColor(a.type);
            return (
              <Card
                key={a.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedId(a.id)}
                data-testid={`activity-card-${a.id}`}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className={`p-2.5 rounded-xl ${colors.bg} shrink-0`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.title || "Untitled"}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDuration(a.durationSec)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {formatDistance(a.distanceM)}
                      </span>
                      {(a.caloriesEstimate ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Flame className="h-3 w-3" /> {Math.round(a.caloriesEstimate || 0)} kcal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.startTime && format(new Date(a.startTime), "d MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={(activities?.length || 0) < 20} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">Next</Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">No activities yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start your first activity to see it here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemoriesTab() {
  const { toast } = useToast();
  const [showCapture, setShowCapture] = useState(false);
  const [note, setNote] = useState("");
  const [locationName, setLocationName] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setUploadedPath(response.objectPath);
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not upload photo. Try again.", variant: "destructive" });
    },
  });

  const { data: memories, isLoading } = useQuery<ActivityMemory[]>({
    queryKey: ["/api/memories"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedPath) throw new Error("No photo");
      const res = await apiRequest("POST", "/api/memories", {
        photoPath: uploadedPath,
        note: note || null,
        lat: currentLocation?.lat || null,
        lng: currentLocation?.lng || null,
        locationName: locationName || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Memory saved", description: "Your moment has been captured." });
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      resetCapture();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save memory.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await apiRequest("PATCH", `/api/memories/${id}`, { note });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      setEditingId(null);
      setEditNote("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/memories/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Memory deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
    },
  });

  const resetCapture = () => {
    setShowCapture(false);
    setNote("");
    setLocationName("");
    setUploadedPath(null);
    setCurrentLocation(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    await uploadFile(file);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=16&addressdetails=1`)
            .then(r => r.json())
            .then(data => {
              if (data.display_name) {
                const parts = data.display_name.split(",");
                setLocationName(parts.slice(0, 3).join(",").trim());
              }
            })
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const groupedByDate = (memories || []).reduce<Record<string, ActivityMemory[]>>((acc, m) => {
    const key = format(new Date(m.createdAt), "MMMM yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {!showCapture ? (
        <Button className="w-full" onClick={() => setShowCapture(true)} data-testid="button-new-memory">
          <Camera className="h-4 w-4 mr-2" />
          Capture a Moment
        </Button>
      ) : (
        <Card>
          <CardContent className="py-4 px-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">New Memory</p>
              <Button variant="ghost" size="icon" onClick={resetCapture} data-testid="button-cancel-memory">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!uploadedPath ? (
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                data-testid="area-photo-upload"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-photo-file"
                />
                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Uploading... {progress}%</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Camera className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Take a photo or choose from gallery</p>
                    <p className="text-xs text-muted-foreground">Your location will be tagged automatically</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={uploadedPath}
                  alt="Memory preview"
                  className="w-full h-56 object-cover"
                  data-testid="img-memory-preview"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/40 text-white"
                  onClick={() => {
                    setUploadedPath(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="button-remove-photo"
                >
                  <X className="h-4 w-4" />
                </Button>
                {currentLocation && (
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {locationName || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
                  </div>
                )}
              </div>
            )}

            <textarea
              placeholder="Add a note... What were you doing? How did you feel?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              rows={3}
              data-testid="input-memory-note"
            />

            {currentLocation && !locationName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={!uploadedPath || createMutation.isPending}
              data-testid="button-save-memory"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Memory
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!memories || memories.length === 0) && !showCapture && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Image className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-muted-foreground">No memories yet</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px] mx-auto">Capture photos during your activities to build a visual journal</p>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedByDate).map(([month, items]) => (
        <div key={month} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{month}</p>
            <Badge variant="secondary">{items.length}</Badge>
          </div>

          {items.map((memory) => (
            <Card key={memory.id} data-testid={`memory-card-${memory.id}`}>
              <CardContent className="py-0 px-0">
                <div className="relative">
                  <img
                    src={memory.photoPath}
                    alt="Memory"
                    className="w-full h-56 sm:h-64 object-cover rounded-t-xl"
                    data-testid={`img-memory-${memory.id}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-12">
                    {memory.locationName && (
                      <div className="flex items-center gap-1.5 text-white/90 text-xs mb-1">
                        <MapPin className="h-3 w-3" />
                        <span>{memory.locationName}</span>
                      </div>
                    )}
                    <p className="text-white/70 text-xs">
                      {format(new Date(memory.createdAt), "EEEE d MMMM yyyy, h:mm a")}
                    </p>
                  </div>
                </div>

                {editingId === memory.id ? (
                  <div className="p-4 space-y-2">
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      rows={2}
                      data-testid={`input-edit-note-${memory.id}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: memory.id, note: editNote })}
                        disabled={updateMutation.isPending}
                        data-testid={`button-save-edit-${memory.id}`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-${memory.id}`}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {memory.note && (
                      <p className="text-sm mb-3" data-testid={`text-note-${memory.id}`}>{memory.note}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(memory.id);
                          setEditNote(memory.note || "");
                        }}
                        data-testid={`button-edit-${memory.id}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(memory.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-memory-${memory.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

const FITNESS_HELP_ITEMS = [
  { icon: Play, title: "Recording an Activity", desc: "Tap Record, choose your activity type (walk, run, or cycle), then tap Start. Your GPS position, distance, steps, and calories are tracked live. Tap Stop when finished." },
  { icon: Navigation, title: "Route Planning", desc: "In the Routes tab, search an address or drop a pin for start and finish points. OSRM calculates the route with walk, run, and cycle time estimates." },
  { icon: MapPin, title: "Stopovers", desc: "After planning a route, nearby Places of Interest appear along your path. Tap any place to add it as a stopover. You can add multiple stopovers and they will be included in your route." },
  { icon: Camera, title: "Activity Memories", desc: "In the Memories tab, upload photos from your activities. Add captions and dates to build a visual diary of your fitness journey." },
  { icon: BarChart3, title: "Activity History", desc: "The History tab shows all your recorded activities with distance, duration, pace, and calories. Tap any activity to view the full GPS track on a map." },
  { icon: Target, title: "Steps & Calories", desc: "Steps are estimated from your movement during recording. Calorie estimates factor in activity type, distance, and duration." },
  { icon: Zap, title: "Pace & Speed", desc: "Choose Easy, Moderate, or Fast pace when planning routes. Time estimates update automatically for walking, running, and cycling." },
];

function FitnessHelp() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="py-0 px-0">
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-3 rounded-xl"
          onClick={() => setOpen(!open)}
          data-testid="button-fitness-help-toggle"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            Fitness Help
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {open && (
          <div className="px-4 pb-4 space-y-3">
            {FITNESS_HELP_ITEMS.map((item) => (
              <div key={item.title} className="flex gap-3" data-testid={`help-item-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Fitness() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("record");

  const { data: features, isLoading: featuresLoading } = useQuery<{
    featureFitnessTracking: boolean;
    isOrgAccount: boolean;
    isOrgClient: boolean;
  }>({
    queryKey: ["/api/features"],
  });

  useEffect(() => {
    if (!featuresLoading && features) {
      if (features.isOrgAccount) {
        toast({ title: "Not available", description: "Fitness tracking is for individual users." });
        setLocation("/app");
      }
    }
  }, [features, featuresLoading]);

  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (features?.featureFitnessTracking === false) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/app">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Fitness Tracking</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-center">Fitness tracking has been disabled for your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/app">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-fitness-title">Fitness Tracking</h1>
          <p className="text-xs text-muted-foreground">Record, plan routes, and track your progress</p>
        </div>
      </div>

      <FitnessHelp />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 h-11">
          <TabsTrigger value="record" className="gap-1" data-testid="tab-record">
            <Play className="h-4 w-4" /> Record
          </TabsTrigger>
          <TabsTrigger value="routes" className="gap-1" data-testid="tab-routes">
            <Navigation className="h-4 w-4" /> Routes
          </TabsTrigger>
          <TabsTrigger value="memories" className="gap-1" data-testid="tab-memories">
            <Camera className="h-4 w-4" /> Memories
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1" data-testid="tab-history">
            <BarChart3 className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-4">
          <Recorder onFinish={() => setActiveTab("history")} />
        </TabsContent>

        <TabsContent value="routes" className="mt-4">
          <RoutesTab />
        </TabsContent>

        <TabsContent value="memories" className="mt-4">
          <MemoriesTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}