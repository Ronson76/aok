import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Clock, Flame, MapPin, TrendingUp, Unlink, ArrowLeft, Lock, Bike, Footprints, Waves, Mountain, Dumbbell, Timer, Zap, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function getActivityIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("ride") || t.includes("cycle") || t.includes("bike")) return Bike;
  if (t.includes("run") || t.includes("walk") || t.includes("hike")) return Footprints;
  if (t.includes("swim")) return Waves;
  if (t.includes("climb") || t.includes("alpine")) return Mountain;
  if (t.includes("weight") || t.includes("crossfit") || t.includes("workout")) return Dumbbell;
  return Activity;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond === 0) return "---";
  const minPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  kilojoules?: number;
  calories?: number;
  suffer_score?: number;
}

interface StravaStats {
  all_ride_totals: { count: number; distance: number; moving_time: number; elapsed_time: number; elevation_gain: number };
  all_run_totals: { count: number; distance: number; moving_time: number; elapsed_time: number; elevation_gain: number };
  all_swim_totals: { count: number; distance: number; moving_time: number; elapsed_time: number; elevation_gain: number };
  recent_ride_totals: { count: number; distance: number; moving_time: number; elapsed_time: number; elevation_gain: number };
  recent_run_totals: { count: number; distance: number; moving_time: number; elapsed_time: number; elevation_gain: number };
  recent_swim_totals: { count: number; distance: number; moving_time: number; elapsed_time: number; elevation_gain: number };
}

export default function Fitness() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);

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
      } else if (features.featureFitnessTracking === false) {
        return;
      }
    }
  }, [features, featuresLoading]);

  const { data: status, isLoading: statusLoading } = useQuery<{
    connected: boolean;
    athleteId?: string;
    athleteFirstName?: string;
    athleteLastName?: string;
    athleteProfileImage?: string;
    connectedAt?: string;
  }>({
    queryKey: ["/api/strava/status"],
    enabled: features?.featureFitnessTracking !== false,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<StravaActivity[]>({
    queryKey: ["/api/strava/activities", page],
    queryFn: () => apiRequest("GET", `/api/strava/activities?page=${page}&per_page=20`).then(r => r.json()),
    enabled: status?.connected === true,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StravaStats>({
    queryKey: ["/api/strava/stats"],
    enabled: status?.connected === true,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/strava/auth-url", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start Strava connection");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      const msg = error.message === "Not authenticated"
        ? "Please log in to connect Strava."
        : error.message === "Strava integration not configured"
        ? "Strava integration is not configured. Please contact support."
        : "Could not start Strava connection. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/strava/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strava/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strava/stats"] });
      toast({ title: "Disconnected", description: "Strava has been disconnected from your account." });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast({ title: "Connected", description: "Strava connected successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status"] });
      window.history.replaceState({}, "", "/fitness");
    }
    const errorParam = params.get("error");
    if (errorParam) {
      const messages: Record<string, string> = {
        denied: "You declined the Strava connection.",
        not_configured: "Strava is not configured. Please contact support.",
        token_exchange: "Could not complete Strava authorisation.",
        server_error: "A server error occurred. Please try again.",
      };
      toast({ title: "Connection failed", description: messages[errorParam] || "An error occurred.", variant: "destructive" });
      window.history.replaceState({}, "", "/fitness");
    }
  }, []);

  if (featuresLoading || statusLoading) {
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

  const recentTotals = stats ? [
    { label: "Rides", icon: Bike, count: stats.recent_ride_totals?.count || 0, distance: stats.recent_ride_totals?.distance || 0, time: stats.recent_ride_totals?.moving_time || 0 },
    { label: "Runs", icon: Footprints, count: stats.recent_run_totals?.count || 0, distance: stats.recent_run_totals?.distance || 0, time: stats.recent_run_totals?.moving_time || 0 },
    { label: "Swims", icon: Waves, count: stats.recent_swim_totals?.count || 0, distance: stats.recent_swim_totals?.distance || 0, time: stats.recent_swim_totals?.moving_time || 0 },
  ] : [];

  const allTimeTotals = stats ? [
    { label: "Rides", icon: Bike, count: stats.all_ride_totals?.count || 0, distance: stats.all_ride_totals?.distance || 0, elevation: stats.all_ride_totals?.elevation_gain || 0 },
    { label: "Runs", icon: Footprints, count: stats.all_run_totals?.count || 0, distance: stats.all_run_totals?.distance || 0, elevation: stats.all_run_totals?.elevation_gain || 0 },
    { label: "Swims", icon: Waves, count: stats.all_swim_totals?.count || 0, distance: stats.all_swim_totals?.distance || 0, elevation: stats.all_swim_totals?.elevation_gain || 0 },
  ] : [];

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

      {!status?.connected ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-4">
            <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Activity className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-center">Connect Strava</h2>
            <p className="text-muted-foreground text-center text-sm max-w-xs">
              Link your Strava account to see your activities, stats, and fitness data right here in aok.
            </p>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="bg-[#FC4C02] hover:bg-[#e04400] text-white border-[#FC4C02]"
              data-testid="button-connect-strava"
            >
              {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Connect with Strava
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We only read your activity data. We never post to Strava.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              {status.athleteProfileImage ? (
                <img
                  src={status.athleteProfileImage}
                  alt="Strava profile"
                  className="w-10 h-10 rounded-full object-cover"
                  data-testid="img-strava-profile"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-orange-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" data-testid="text-strava-athlete">
                  {status.athleteFirstName} {status.athleteLastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected {status.connectedAt ? formatDistanceToNow(new Date(status.connectedAt), { addSuffix: true }) : ""}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-disconnect-strava">
                    <Unlink className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Strava?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the connection to your Strava account. You can reconnect at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => disconnectMutation.mutate()}
                      data-testid="button-confirm-disconnect"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {statsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : stats && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-lg">Last 4 Weeks</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTotals.filter(t => t.count > 0).map((total) => {
                      const Icon = total.icon;
                      return (
                        <div key={total.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg" data-testid={`stat-recent-${total.label.toLowerCase()}`}>
                          <Icon className="h-5 w-5 text-orange-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{total.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {total.count} activities
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDistance(total.distance)}</p>
                            <p className="text-xs text-muted-foreground">{formatDuration(total.time)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {recentTotals.every(t => t.count === 0) && (
                      <p className="text-muted-foreground text-sm text-center py-2">No activities in the last 4 weeks</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-lg">All-Time Stats</CardTitle>
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {allTimeTotals.filter(t => t.count > 0).map((total) => {
                      const Icon = total.icon;
                      return (
                        <div key={total.label} className="text-center p-3 bg-muted/50 rounded-lg" data-testid={`stat-alltime-${total.label.toLowerCase()}`}>
                          <Icon className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                          <p className="text-lg font-bold">{total.count}</p>
                          <p className="text-xs text-muted-foreground">{total.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDistance(total.distance)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-lg">Recent Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                        data-testid={`activity-${activity.id}`}
                      >
                        <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
                          <Icon className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{activity.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(activity.moving_time)}
                            </span>
                            {activity.distance > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {formatDistance(activity.distance)}
                              </span>
                            )}
                            {activity.total_elevation_gain > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mountain className="h-3 w-3" />
                                {Math.round(activity.total_elevation_gain)}m
                              </span>
                            )}
                            {activity.average_heartrate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                {Math.round(activity.average_heartrate)} bpm
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.start_date_local), "d MMM yyyy, h:mm a")}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {activity.sport_type || activity.type}
                        </Badge>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activities.length < 20}
                      onClick={() => setPage(p => p + 1)}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No activities found</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
