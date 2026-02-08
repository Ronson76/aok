import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, MapPin, TrendingUp, ArrowLeft, Lock, Bike, Footprints, Play, Pause, Square, ChevronRight, ChevronDown, Activity } from "lucide-react";
import { FaRunning } from "react-icons/fa";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useEffect, useState, useRef, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDuration, formatDistance, formatPace, formatSpeed,
  haversineDistance, computeDistance, computePace, computeSpeed,
} from "@/lib/fitness-utils";
import { StepCounter, estimateCalories, estimateStepsFromDistance } from "@/lib/step-counter";
import type { FitnessActivity, ActivityType, PrivacyLevel } from "@shared/schema";

function getActivityIcon(type: string) {
  if (type === "cycle") return Bike;
  if (type === "walk") return Footprints;
  return Activity;
}

function ActivityMap({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || points.length < 2) return;

    import("leaflet").then((L) => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }

      const linkEl = document.getElementById("leaflet-css");
      if (!linkEl) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current!, { zoomControl: false, attributionControl: false });
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const latlngs = points.map(p => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latlngs, { color: "#22c55e", weight: 4 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

      L.circleMarker(latlngs[0], { radius: 6, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 }).addTo(map);
      L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1 }).addTo(map);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [points]);

  if (points.length < 2) return null;

  return <div ref={mapRef} className="h-48 rounded-lg overflow-hidden" data-testid="activity-map" />;
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
  const pace = activityType !== "cycle" ? computePace(distance, duration) : null;
  const speed = computeSpeed(distance, duration);

  if (!isRecording) {
    return (
      <Card>
        <CardContent className="py-6 space-y-4">
          <h2 className="text-lg font-semibold text-center" data-testid="text-start-activity">Start an Activity</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["run", "walk", "cycle"] as const).map(t => {
              const Icon = getActivityIcon(t);
              return (
                <Button
                  key={t}
                  variant={activityType === t ? "default" : "outline"}
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => setActivityType(t)}
                  data-testid={`button-type-${t}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs capitalize">{t}</span>
                </Button>
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
            className="w-full bg-green-600 hover:bg-green-700 text-white border-green-600"
            onClick={handleStart}
            disabled={createMutation.isPending}
            data-testid="button-start-recording"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Start {activityType === "run" ? "Run" : activityType === "walk" ? "Walk" : "Ride"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-500/50">
      <CardContent className="py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="default" className="bg-green-600" data-testid="badge-recording">
            {isPaused ? "Paused" : "Recording"}
          </Badge>
          <Badge variant="secondary" className="capitalize" data-testid="badge-type">{activityType}</Badge>
        </div>

        <div className="text-center space-y-1">
          <p className="text-4xl font-mono font-bold tabular-nums" data-testid="text-duration">{formatDuration(duration)}</p>
          <p className="text-lg font-semibold text-green-600" data-testid="text-distance">{formatDistance(distance)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{activityType === "cycle" ? "Speed" : "Pace"}</p>
            <p className="font-semibold text-sm" data-testid="text-pace">
              {activityType === "cycle" ? formatSpeed(speed) : formatPace(pace)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Calories</p>
            <p className="font-semibold text-sm" data-testid="text-calories">{liveCalories} kcal</p>
          </div>
        </div>
        {activityType !== "cycle" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Steps</p>
              <p className="font-semibold text-sm" data-testid="text-steps">{liveSteps.toLocaleString()}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">GPS Points</p>
              <p className="font-semibold text-sm" data-testid="text-gps-count">{points.length}</p>
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
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600" onClick={handleResume} data-testid="button-resume">
              <Play className="h-4 w-4 mr-2" /> Resume
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={handlePause} data-testid="button-pause">
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
          )}
          <Button variant="destructive" onClick={handleStop} data-testid="button-stop">
            <Square className="h-4 w-4 mr-2" /> Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: activity, isLoading } = useQuery<FitnessActivity & {
    ownerName: string;
  }>({
    queryKey: ["/api/fitness/activities", id],
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!activity) return <p className="text-center text-muted-foreground py-4">Activity not found</p>;

  const Icon = getActivityIcon(activity.type);
  const gps = (activity.gpsPoints || []) as Array<{ lat: number; lng: number }>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-detail">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <Icon className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" data-testid="text-activity-title">{activity.title || "Untitled Activity"}</p>
              <p className="text-xs text-muted-foreground">
                by {activity.ownerName} {activity.startTime && <span>on {format(new Date(activity.startTime), "d MMM yyyy, h:mm a")}</span>}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">{activity.type}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Distance</p>
              <p className="font-semibold text-sm" data-testid="text-detail-distance">{formatDistance(activity.distanceM)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-semibold text-sm" data-testid="text-detail-duration">{formatDuration(activity.durationSec)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{activity.type === "cycle" ? "Speed" : "Pace"}</p>
              <p className="font-semibold text-sm" data-testid="text-detail-pace">
                {activity.type === "cycle" ? formatSpeed(activity.avgSpeedKph) : formatPace(activity.avgPaceSecPerKm)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {activity.type !== "cycle" && (activity.stepCount ?? 0) > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Steps</p>
                <p className="font-semibold text-sm" data-testid="text-detail-steps">{(activity.stepCount || 0).toLocaleString()}</p>
              </div>
            )}
            {(activity.caloriesEstimate ?? 0) > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Calories</p>
                <p className="font-semibold text-sm" data-testid="text-detail-calories">{Math.round(activity.caloriesEstimate || 0)} kcal</p>
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
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-lg">Your Stats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold" data-testid="stat-total-activities">{stats.totalActivities}</p>
                <p className="text-xs text-muted-foreground">Activities</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold" data-testid="stat-total-distance">{formatDistance(stats.totalDistanceM)}</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold" data-testid="stat-total-duration">{formatDuration(stats.totalDurationSec)}</p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {stats.totalSteps > 0 && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold" data-testid="stat-total-steps">{stats.totalSteps.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Steps</p>
                </div>
              )}
              {stats.totalCalories > 0 && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold" data-testid="stat-total-calories">{Math.round(stats.totalCalories).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
              )}
            </div>
            {Object.keys(stats.byType).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(stats.byType).map(([type, s]) => {
                  const Icon = getActivityIcon(type);
                  return (
                    <div key={type} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg" data-testid={`stat-type-${type}`}>
                      <Icon className="h-4 w-4 text-green-600 shrink-0" />
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
        <Card>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : activities && activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map(a => {
            const Icon = getActivityIcon(a.type);
            return (
              <Card
                key={a.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedId(a.id)}
                data-testid={`activity-card-${a.id}`}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                    <Icon className="h-4 w-4 text-green-600" />
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
          <CardContent className="text-center text-muted-foreground py-8">
            <FaRunning className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activities yet. Start your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
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
          <CardContent className="flex flex-col items-center py-10 gap-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">Fitness tracking has been disabled for your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/app">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold" data-testid="text-fitness-title">Fitness Tracking</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="record" data-testid="tab-record">
            <Play className="h-4 w-4 mr-1" /> Record
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="h-4 w-4 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <Recorder onFinish={() => setActiveTab("history")} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
