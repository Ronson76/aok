import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Shield, Play, MapPin, Clock, AlertTriangle, CheckCircle, Phone, 
  Loader2, Timer, Radio, History, XCircle, Navigation, Siren,
  Briefcase, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import type { LoneWorkerSession } from "@shared/schema";

const JOB_TYPES: { value: string; label: string }[] = [
  { value: "visit", label: "Home Visit" },
  { value: "inspection", label: "Site Inspection" },
  { value: "outreach", label: "Outreach" },
  { value: "delivery", label: "Delivery" },
  { value: "patrol", label: "Patrol" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String((i + 1) * 60),
  label: i === 0 ? "1 hour" : `${i + 1} hours`,
}));

const CHECKIN_INTERVALS = [
  { value: "15", label: "Every 15 mins" },
  { value: "30", label: "Every 30 mins" },
  { value: "60", label: "Every hour" },
  { value: "90", label: "Every 90 mins" },
  { value: "120", label: "Every 2 hours" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return <Badge data-testid="badge-status-active" className="bg-green-600 text-white">Active</Badge>;
    case "check_in_due": return <Badge data-testid="badge-status-due" className="bg-yellow-600 text-white">Check-in Due</Badge>;
    case "unresponsive": return <Badge data-testid="badge-status-unresponsive" className="bg-orange-600 text-white">Unresponsive</Badge>;
    case "panic": return <Badge data-testid="badge-status-panic" className="bg-red-600 text-white">PANIC</Badge>;
    case "resolved": return <Badge data-testid="badge-status-resolved">Resolved</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function useGeolocation() {
  const [position, setPosition] = useState<{ lat: string; lng: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          setError("Location permission blocked. Please allow location access in your browser settings to share your position during shifts.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location unavailable. Please check your device's location services are turned on.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Please try again.");
        } else {
          setError(err.message);
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, error, loading, requestLocation };
}

function CountdownTimer({ targetDate, onExpired }: { targetDate: Date; onExpired?: () => void }) {
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
    return () => clearInterval(interval);
  }, [targetDate, onExpired]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 120;

  return (
    <span data-testid="text-countdown" className={isUrgent ? "text-destructive font-bold" : ""}>
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

function PreShiftSetup({ onStart }: { onStart: () => void }) {
  const { toast } = useToast();
  const geo = useGeolocation();
  const [jobType, setJobType] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [checkInInterval, setCheckInInterval] = useState("30");

  useEffect(() => { geo.requestLocation(); }, []);

  const startMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        jobType,
        jobDescription: jobDescription || undefined,
        expectedDurationMins: parseInt(duration),
        checkInIntervalMins: parseInt(checkInInterval),
        graceWindowSecs: 120,
      };
      if (geo.position) {
        body.locationLat = geo.position.lat;
        body.locationLng = geo.position.lng;
      }
      return apiRequest("POST", "/api/lone-worker/start", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lone-worker/active"] });
      toast({ title: "Session started", description: "Your lone worker session is now active." });
      onStart();
    },
    onError: (err: any) => {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="text-center space-y-2 mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold" data-testid="text-title">Lone Worker Protection</h1>
        <p className="text-sm text-muted-foreground">Set up your shift before heading out. We'll monitor you and alert your organisation if anything goes wrong.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" /> Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Job Type</Label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger data-testid="select-job-type">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(jt => (
                  <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              data-testid="input-job-description"
              placeholder="e.g. Visiting Mrs Smith at 42 Oak Lane"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Timer className="w-4 h-4" /> Timing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Expected Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Check-in Interval</Label>
            <Select value={checkInInterval} onValueChange={setCheckInInterval}>
              <SelectTrigger data-testid="select-checkin-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKIN_INTERVALS.map(ci => (
                  <SelectItem key={ci.value} value={ci.value}>{ci.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How often you'll be prompted to check in</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</CardTitle>
        </CardHeader>
        <CardContent>
          {geo.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Getting your location...
            </div>
          ) : geo.position ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Navigation className="w-4 h-4" /> Location captured
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{geo.error || "Location not available"}</p>
              <Button variant="outline" size="sm" onClick={geo.requestLocation} data-testid="button-retry-location">
                <MapPin className="w-4 h-4 mr-1" /> Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        data-testid="button-start-session"
        className="w-full"
        size="lg"
        disabled={!jobType || startMutation.isPending}
        onClick={() => startMutation.mutate()}
      >
        {startMutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
        ) : (
          <><Play className="w-4 h-4 mr-2" /> Start Shift</>
        )}
      </Button>
    </div>
  );
}

function LiveLocationCard({ session, position }: { session: LoneWorkerSession; position: { lat: string; lng: string } | null }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [showMap, setShowMap] = useState(false);

  const lat = position?.lat ? parseFloat(position.lat) : (session.lastLocationLat ? parseFloat(session.lastLocationLat) : null);
  const lng = position?.lng ? parseFloat(position.lng) : (session.lastLocationLng ? parseFloat(session.lastLocationLng) : null);
  const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  useEffect(() => {
    if (!showMap || !hasLocation || !mapContainerRef.current) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        markerRef.current?.setLatLng([lat!, lng!]);
        mapInstanceRef.current.panTo([lat!, lng!], { animate: true });
        return;
      }
      const map = L.default.map(mapContainerRef.current!, {
        center: [lat!, lng!],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      const statusColor = session.status === "panic" ? "#dc2626" : session.status === "unresponsive" ? "#ea580c" : "#16a34a";
      const icon = L.default.divIcon({
        className: "live-location-marker",
        html: `<div style="position:relative;background:${statusColor};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.3)"><div style="position:absolute;top:-6px;left:-6px;width:28px;height:28px;border-radius:50%;border:2px solid ${statusColor};opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.default.marker([lat!, lng!], { icon }).addTo(map);
      marker.bindPopup(`<b>Your Location</b>`);
      mapInstanceRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap, lat, lng, hasLocation]);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && hasLocation) {
      markerRef.current.setLatLng([lat!, lng!]);
      mapInstanceRef.current.panTo([lat!, lng!], { animate: true });
    }
  }, [lat, lng]);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${hasLocation ? "text-green-600" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium">Live Location</p>
              <p className="text-xs text-muted-foreground">
                {hasLocation
                  ? session.lastLocationAt
                    ? `Updated ${formatDistanceToNow(new Date(session.lastLocationAt), { addSuffix: true })}`
                    : "Location captured"
                  : "Waiting for location..."}
              </p>
            </div>
          </div>
          {hasLocation && (
            <Button
              variant={showMap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMap(!showMap)}
              data-testid="button-toggle-live-location"
            >
              <Navigation className="w-4 h-4 mr-1" />
              {showMap ? "Hide Map" : "View Map"}
            </Button>
          )}
        </div>
        {showMap && hasLocation && (
          <div className="mt-3 space-y-2">
            <div
              ref={mapContainerRef}
              style={{ height: "250px", width: "100%", borderRadius: "8px" }}
              data-testid="map-live-location"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{lat!.toFixed(6)}, {lng!.toFixed(6)}</span>
              <a
                href={`https://maps.google.com/?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline ml-auto"
                data-testid="link-google-maps"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveSession({ session, onRefresh }: { session: LoneWorkerSession; onRefresh: () => void }) {
  const { toast } = useToast();
  const geo = useGeolocation();
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [showCancelPanicConfirm, setShowCancelPanicConfirm] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveOutcome, setResolveOutcome] = useState("safe");
  const [resolveNotes, setResolveNotes] = useState("");
  const [checkInDue, setCheckInDue] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShiftDetails, setShowShiftDetails] = useState(false);

  const isPanic = session.status === "panic";
  const isUnresponsive = session.status === "unresponsive";
  const isDue = session.status === "check_in_due" || checkInDue;

  const locationInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    geo.requestLocation();
    const sendLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          geo.requestLocation();
          apiRequest("POST", `/api/lone-worker/${session.id}/location`, {
            lat: pos.coords.latitude.toString(),
            lng: pos.coords.longitude.toString(),
          }).catch(() => {});
        }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
      }
    };
    sendLocation();
    locationInterval.current = setInterval(sendLocation, 60000);
    return () => clearInterval(locationInterval.current);
  }, [session.id]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      geo.requestLocation();
      const body: any = { status: "ok" };
      if (geo.position) {
        body.lat = geo.position.lat;
        body.lng = geo.position.lng;
      }
      return apiRequest("POST", `/api/lone-worker/${session.id}/check-in`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lone-worker/active"] });
      setCheckInDue(false);
      toast({ title: "Checked in", description: "You're safe. Next check-in scheduled." });
      onRefresh();
    },
    onError: (err: any) => {
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    },
  });

  const panicMutation = useMutation({
    mutationFn: async () => {
      let lat, lng;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
          });
          lat = pos.coords.latitude.toString();
          lng = pos.coords.longitude.toString();
        } catch {}
      }
      return apiRequest("POST", `/api/lone-worker/${session.id}/panic`, { lat, lng });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lone-worker/active"] });
      setShowPanicConfirm(false);
      toast({ title: "PANIC ALERT SENT", description: "Your organisation has been alerted. Help is on the way.", variant: "destructive" });
      onRefresh();
    },
    onError: (err: any) => {
      toast({ title: "Alert failed", description: err.message, variant: "destructive" });
    },
  });

  const cancelPanicMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/lone-worker/${session.id}/cancel-panic`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lone-worker/active"] });
      setShowCancelPanicConfirm(false);
      toast({ title: "Panic cancelled", description: "Your session is back to active monitoring." });
      onRefresh();
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel panic", description: err.message, variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/lone-worker/${session.id}/resolve`, { outcome: resolveOutcome, notes: resolveNotes }),
    onSuccess: () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      queryClient.invalidateQueries({ queryKey: ["/api/lone-worker/active"] });
      setShowResolveDialog(false);
      toast({ title: "Session ended", description: "Your shift has been logged and resolved." });
      onRefresh();
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const checkInsQuery = useQuery({
    queryKey: ["/api/lone-worker", session.id, "check-ins"],
    queryFn: () => fetch(`/api/lone-worker/${session.id}/check-ins`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const escalationsQuery = useQuery({
    queryKey: ["/api/lone-worker", session.id, "escalations"],
    queryFn: () => fetch(`/api/lone-worker/${session.id}/escalations`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const panicBgClass = isPanic ? "bg-red-600" : isUnresponsive ? "bg-orange-500" : "";

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {isPanic && (
        <Card className="border-red-600 border-2">
          <CardContent className="py-4 text-center">
            <Siren className="w-10 h-10 text-red-600 mx-auto mb-2 animate-pulse" />
            <h2 className="text-lg font-bold text-red-600" data-testid="text-panic-title">PANIC ALERT ACTIVE</h2>
            <p className="text-sm text-muted-foreground">Your organisation has been alerted. Stay where you are if safe to do so.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Triggered {session.panicTriggeredAt ? formatDistanceToNow(new Date(session.panicTriggeredAt), { addSuffix: true }) : ""}
            </p>
            <Button
              data-testid="button-cancel-panic-alert"
              variant="outline"
              className="mt-3"
              onClick={() => setShowCancelPanicConfirm(true)}
            >
              <XCircle className="w-4 h-4 mr-1" /> Cancel Panic
            </Button>
          </CardContent>
        </Card>
      )}

      {isUnresponsive && (
        <Card className="border-orange-500 border-2">
          <CardContent className="py-4 text-center">
            <AlertTriangle className="w-10 h-10 text-orange-500 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-orange-500" data-testid="text-unresponsive">MISSED CHECK-IN</h2>
            <p className="text-sm text-muted-foreground">Your organisation has been alerted. Please check in now.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">{JOB_TYPES.find(j => j.value === session.jobType)?.label || session.jobType}</p>
                <p className="text-xs text-muted-foreground">Started {session.startedAt ? format(new Date(session.startedAt), "HH:mm") : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(session.status)}
              <Button variant="outline" size="sm" onClick={() => setShowShiftDetails(true)} data-testid="button-shift-details">
                <Eye className="w-4 h-4 mr-1" /> Shift Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <LiveLocationCard session={session} position={geo.position} />

      {session.nextCheckInDue && !isPanic && (
        <Card className={isDue ? "border-yellow-500 border-2" : ""}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${isDue ? "text-yellow-500" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">{isDue ? "Check-in NOW" : "Next Check-in"}</p>
                  <p className="text-xs text-muted-foreground">
                    <CountdownTimer
                      targetDate={new Date(session.nextCheckInDue)}
                      onExpired={() => setCheckInDue(true)}
                    />
                  </p>
                </div>
              </div>
              <Button
                data-testid="button-check-in"
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending || !isDue}
                className={isDue ? "bg-yellow-600 hover-elevate" : ""}
              >
                {checkInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> {isDue ? "I'm OK" : "Not Yet Due"}</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPanic && (
        <Button
          data-testid="button-panic"
          variant="destructive"
          className="w-full"
          size="lg"
          onClick={() => setShowPanicConfirm(true)}
        >
          <Siren className="w-5 h-5 mr-2" /> PANIC BUTTON
        </Button>
      )}

      <Button
        data-testid="button-end-shift"
        variant="outline"
        size="lg"
        className="w-full mt-2"
        onClick={() => setShowResolveDialog(true)}
      >
        <XCircle className="w-4 h-4 mr-2" /> End Shift
      </Button>

      <div>
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowHistory(!showHistory)}
          data-testid="button-toggle-history"
        >
          <span className="flex items-center gap-2"><History className="w-4 h-4" /> Session Activity</span>
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {showHistory && (
          <Card className="mt-2">
            <CardContent className="py-3 space-y-2">
              {checkInsQuery.data?.length > 0 ? (
                checkInsQuery.data.map((ci: any) => (
                  <div key={ci.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      Check-in ({ci.status})
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {ci.createdAt ? format(new Date(ci.createdAt), "HH:mm") : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No check-ins yet</p>
              )}
              {escalationsQuery.data?.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground pt-2">Escalations</p>
                  {escalationsQuery.data.map((esc: any) => (
                    <div key={esc.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                        {esc.level.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {esc.createdAt ? format(new Date(esc.createdAt), "HH:mm") : ""}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showPanicConfirm} onOpenChange={setShowPanicConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm PANIC Alert</DialogTitle>
            <DialogDescription>
              This will immediately alert your organisation that you need help. Your current location will be shared.
              Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPanicConfirm(false)} data-testid="button-cancel-panic">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => panicMutation.mutate()}
              disabled={panicMutation.isPending}
              data-testid="button-confirm-panic"
            >
              {panicMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "YES, SEND ALERT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelPanicConfirm} onOpenChange={setShowCancelPanicConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Panic Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the panic alert? This will return your session to active monitoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelPanicConfirm(false)}>Go Back</Button>
            <Button
              onClick={() => cancelPanicMutation.mutate()}
              disabled={cancelPanicMutation.isPending}
              data-testid="button-confirm-cancel-panic"
            >
              {cancelPanicMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Cancel Panic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Shift</DialogTitle>
            <DialogDescription>Record the outcome of your shift for audit purposes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={resolveOutcome} onValueChange={setResolveOutcome}>
                <SelectTrigger data-testid="select-outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">Safe - No Issues</SelectItem>
                  <SelectItem value="assistance_required">Assistance Was Required</SelectItem>
                  <SelectItem value="emergency_attended">Emergency Attended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                data-testid="input-resolve-notes"
                placeholder="Any notes about the shift..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancel</Button>
            <Button
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              {resolveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "End Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShiftDetails} onOpenChange={setShowShiftDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>Full details of your current shift.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(session.status)}</div>
              </div>
              <div>
                <p className="text-muted-foreground">Job Type</p>
                <p className="font-medium" data-testid="text-detail-job-type">{JOB_TYPES.find(j => j.value === session.jobType)?.label || session.jobType}</p>
              </div>
              {session.jobDescription && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium" data-testid="text-detail-description">{session.jobDescription}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium" data-testid="text-detail-started">{session.startedAt ? format(new Date(session.startedAt), "dd/MM/yyyy HH:mm") : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected Duration</p>
                <p className="font-medium">{session.expectedDurationMins} mins</p>
              </div>
              {session.expectedEndAt && (
                <div>
                  <p className="text-muted-foreground">Expected End</p>
                  <p className="font-medium">{format(new Date(session.expectedEndAt), "HH:mm")}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Check-in Interval</p>
                <p className="font-medium">Every {session.checkInIntervalMins} mins</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grace Window</p>
                <p className="font-medium">{session.graceWindowSecs ? `${Math.floor(session.graceWindowSecs / 60)} mins` : "2 mins"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Check-in</p>
                <p className="font-medium">{session.lastCheckInAt ? format(new Date(session.lastCheckInAt), "HH:mm") : "None yet"}</p>
              </div>
              {session.nextCheckInDue && (
                <div>
                  <p className="text-muted-foreground">Next Check-in Due</p>
                  <p className="font-medium">{format(new Date(session.nextCheckInDue), "HH:mm")}</p>
                </div>
              )}
              {session.lastLocationLat && session.lastLocationLng && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Last Known Location</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-xs">{parseFloat(session.lastLocationLat).toFixed(6)}, {parseFloat(session.lastLocationLng).toFixed(6)}</span>
                    <a
                      href={`https://maps.google.com/?q=${session.lastLocationLat},${session.lastLocationLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline text-xs ml-auto"
                      data-testid="link-detail-google-maps"
                    >
                      View on Map
                    </a>
                  </div>
                  {session.lastLocationAt && (
                    <p className="text-xs text-muted-foreground mt-1">Updated {formatDistanceToNow(new Date(session.lastLocationAt), { addSuffix: true })}</p>
                  )}
                </div>
              )}
              {session.locationAddress && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Start Address</p>
                  <p className="font-medium">{session.locationAddress}</p>
                </div>
              )}
              {session.what3words && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">what3words</p>
                  <p className="font-medium">
                    <a href={`https://what3words.com/${session.what3words}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      ///{session.what3words}
                    </a>
                  </p>
                </div>
              )}
              {isPanic && session.panicTriggeredAt && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-red-600">Panic Triggered</p>
                  <p className="font-medium text-red-600">{format(new Date(session.panicTriggeredAt), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDetails(false)} data-testid="button-close-shift-details">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionHistory() {
  const historyQuery = useQuery<LoneWorkerSession[]>({
    queryKey: ["/api/lone-worker/history"],
  });

  if (historyQuery.isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const sessions = historyQuery.data || [];
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No previous sessions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-md mx-auto">
      <h2 className="text-lg font-semibold flex items-center gap-2"><History className="w-5 h-5" /> Shift History</h2>
      {sessions.map((s: LoneWorkerSession) => (
        <Card key={s.id} data-testid={`card-session-${s.id}`}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span className="text-sm font-medium">{JOB_TYPES.find(j => j.value === s.jobType)?.label || s.jobType}</span>
              {getStatusBadge(s.status)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Started: {s.startedAt ? format(new Date(s.startedAt), "dd/MM/yyyy HH:mm") : "—"}</div>
              <div>Resolved: {s.resolvedAt ? format(new Date(s.resolvedAt), "dd/MM/yyyy HH:mm") : "—"}</div>
              {s.outcome && <div className="col-span-2">Outcome: {s.outcome.replace(/_/g, " ")}</div>}
              {s.outcomeNotes && <div className="col-span-2">Notes: {s.outcomeNotes}</div>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LoneWorker() {
  const { user } = useAuth();
  const [view, setView] = useState<"session" | "history">("session");

  const activeQuery = useQuery<{ session: LoneWorkerSession | null }>({
    queryKey: ["/api/lone-worker/active"],
    refetchInterval: 15000,
  });

  const activeSession = activeQuery.data?.session;

  if (activeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Button
          variant={view === "session" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("session")}
          data-testid="button-view-session"
        >
          <Shield className="w-4 h-4 mr-1" /> Current
        </Button>
        <Button
          variant={view === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("history")}
          data-testid="button-view-history"
        >
          <History className="w-4 h-4 mr-1" /> History
        </Button>
      </div>

      {view === "history" ? (
        <SessionHistory />
      ) : activeSession ? (
        <ActiveSession session={activeSession} onRefresh={() => activeQuery.refetch()} />
      ) : (
        <PreShiftSetup onStart={() => activeQuery.refetch()} />
      )}
    </div>
  );
}