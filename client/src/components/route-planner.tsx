import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  MapPin, Navigation, Cloud, Thermometer, Droplets, Wind, Sun, Moon,
  Clock, Save, Repeat, Share2, ShieldAlert, Star, Check, ArrowLeft,
  Loader2, Trash2, AlertTriangle, Footprints, Bike, ChevronRight,
} from "lucide-react";
import { FaRunning } from "react-icons/fa";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlannedRoute, RoutePace } from "@shared/schema";

const PACE_SPEEDS: Record<string, Record<RoutePace, number>> = {
  walk: { easy: 4.0, moderate: 5.0, fast: 6.5 },
  run: { easy: 7.0, moderate: 9.5, fast: 12.0 },
  cycle: { easy: 15.0, moderate: 20.0, fast: 28.0 },
};

function getDistanceBand(distanceM: number): string {
  const km = distanceM / 1000;
  if (km <= 2) return "short";
  if (km <= 5) return "medium";
  return "long";
}

function getBandLabel(band: string): string {
  if (band === "short") return "Short (0-2 km)";
  if (band === "medium") return "Medium (2-5 km)";
  return "Long (5+ km)";
}

function getBandColor(band: string): string {
  if (band === "short") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (band === "medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function formatRouteTime(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

function getWeatherDesc(code: number | undefined): string {
  if (code === undefined) return "";
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "";
}

function RouteMap({
  startPoint,
  endPoint,
  routeCoords,
  onMapClick,
}: {
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  routeCoords: Array<[number, number]>;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const linkEl = document.getElementById("leaflet-css");
      if (!linkEl) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!mapInstance.current) {
        const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false });
        mapInstance.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!startPoint && !endPoint) {
                map.setView([pos.coords.latitude, pos.coords.longitude], 14);
              }
            },
            () => map.setView([51.505, -0.09], 13),
            { timeout: 5000 }
          );
        } else {
          map.setView([51.505, -0.09], 13);
        }

        map.on("click", (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    import("leaflet").then((L) => {
      const map = mapInstance.current;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      if (startPoint) {
        const startIcon = L.divIcon({
          html: '<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker(startPoint, { icon: startIcon }).addTo(map);
        markersRef.current.push(m);
      }

      if (endPoint) {
        const endIcon = L.divIcon({
          html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker(endPoint, { icon: endIcon }).addTo(map);
        markersRef.current.push(m);
      }

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      if (routeCoords.length > 1) {
        const latlngs = routeCoords.map((c) => [c[1], c[0]] as [number, number]);
        const polyline = L.polyline(latlngs, { color: "#3b82f6", weight: 4, opacity: 0.8 }).addTo(map);
        polylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      } else if (startPoint && endPoint) {
        map.fitBounds([startPoint, endPoint], { padding: [30, 30] });
      } else if (startPoint) {
        map.setView(startPoint, 15);
      }
    });
  }, [startPoint, endPoint, routeCoords]);

  return (
    <div
      ref={mapRef}
      className="h-64 rounded-lg overflow-hidden border border-border"
      data-testid="route-map"
    />
  );
}

const CHECKLIST_ITEMS = [
  { key: "phone", label: "Phone charged" },
  { key: "headphones", label: "Headphones on" },
  { key: "weather", label: "Weather checked" },
  { key: "keys", label: "Keys" },
];

function RoutePlannerView({ initialRoute, onClearRepeat }: { initialRoute?: PlannedRoute | null; onClearRepeat?: () => void }) {
  const { toast } = useToast();
  const [startPoint, setStartPoint] = useState<[number, number] | null>(
    initialRoute ? [initialRoute.startLat, initialRoute.startLng] : null
  );
  const [endPoint, setEndPoint] = useState<[number, number] | null>(
    initialRoute ? [initialRoute.endLat, initialRoute.endLng] : null
  );
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>(
    initialRoute?.routeGeometry as Array<[number, number]> || []
  );
  const [distance, setDistance] = useState(initialRoute?.distanceM || 0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [pace, setPace] = useState<RoutePace>("moderate");
  const [routeName, setRouteName] = useState(initialRoute?.name || "");
  const [isUsualRoute, setIsUsualRoute] = useState(initialRoute?.isUsualRoute || false);
  const [attachToEmergency, setAttachToEmergency] = useState(initialRoute?.attachToEmergency || false);
  const [settingPoint, setSettingPoint] = useState<"start" | "end">(initialRoute ? "end" : "start");
  const [isPlanning, setIsPlanning] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initialRoute && !initializedRef.current) {
      initializedRef.current = true;
      setStartPoint([initialRoute.startLat, initialRoute.startLng]);
      setEndPoint([initialRoute.endLat, initialRoute.endLng]);
      setRouteCoords(initialRoute.routeGeometry as Array<[number, number]> || []);
      setDistance(initialRoute.distanceM);
      setRouteName(initialRoute.name);
      setIsUsualRoute(initialRoute.isUsualRoute);
      setAttachToEmergency(initialRoute.attachToEmergency);
    }
  }, [initialRoute]);

  const midLat = startPoint ? startPoint[0] : null;
  const midLng = startPoint ? startPoint[1] : null;

  const { data: weather, isLoading: weatherLoading } = useQuery<{
    temperature: number;
    precipitationProbability: number;
    windSpeed: number;
    weatherCode: number;
    sunset: string;
  }>({
    queryKey: ["/api/routes/weather", { lat: midLat, lng: midLng }],
    queryFn: async () => {
      if (!midLat || !midLng) throw new Error("No location");
      const res = await apiRequest("GET", `/api/routes/weather?lat=${midLat}&lng=${midLng}`);
      return res.json();
    },
    enabled: !!midLat && !!midLng,
    staleTime: 10 * 60 * 1000,
  });

  const { data: contacts } = useQuery<Array<{ id: number; name: string; email: string }>>({
    queryKey: ["/api/contacts"],
  });

  const planMutation = useMutation({
    mutationFn: async ({ mode }: { mode: string }) => {
      const res = await apiRequest("POST", "/api/routes/plan", {
        startLat: startPoint![0],
        startLng: startPoint![1],
        endLat: endPoint![0],
        endLng: endPoint![1],
        mode,
      });
      return res.json();
    },
    onSuccess: (data: { distance: number; geometry: Array<[number, number]>; duration: number }) => {
      setRouteCoords(data.geometry);
      setDistance(data.distance);
      setRouteDuration(data.duration);
      setIsPlanning(false);
    },
    onError: () => {
      toast({ title: "Routing failed", description: "Could not calculate route. Try different points.", variant: "destructive" });
      setIsPlanning(false);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const band = getDistanceBand(distance);
      const res = await apiRequest("POST", "/api/routes", {
        name: routeName || "Unnamed Route",
        startLat: startPoint![0],
        startLng: startPoint![1],
        endLat: endPoint![0],
        endLng: endPoint![1],
        routeGeometry: routeCoords,
        distanceM: distance,
        distanceBand: band,
        isUsualRoute,
        attachToEmergency,
      });
      return res.json();
    },
    onSuccess: (data: PlannedRoute) => {
      setSavedRouteId(data.id);
      toast({ title: "Route saved", description: `"${data.name}" has been saved.` });
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save route.", variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (contactId: number) => {
      if (!savedRouteId) throw new Error("Save route first");
      const res = await apiRequest("POST", "/api/routes/share", { contactId, routeId: savedRouteId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Route shared", description: "Your route has been sent." });
      setShowShareDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to share route.", variant: "destructive" });
    },
  });

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (settingPoint === "start") {
        setStartPoint([lat, lng]);
        setSettingPoint("end");
        setRouteCoords([]);
        setDistance(0);
      } else {
        setEndPoint([lat, lng]);
      }
    },
    [settingPoint]
  );

  useEffect(() => {
    if (startPoint && endPoint) {
      setIsPlanning(true);
      planMutation.mutate({ mode: "foot" });
    }
  }, [startPoint, endPoint]);

  const distanceBand = distance > 0 ? getDistanceBand(distance) : null;
  const distanceKm = (distance / 1000).toFixed(2);

  const walkTime = distance > 0 ? (distance / 1000 / PACE_SPEEDS.walk[pace]) * 60 : 0;
  const runTime = distance > 0 ? (distance / 1000 / PACE_SPEEDS.run[pace]) * 60 : 0;
  const cycleTime = distance > 0 ? (distance / 1000 / PACE_SPEEDS.cycle[pace]) * 60 : 0;

  let safetyCue: string | null = null;
  if (weather?.sunset && distance > 0) {
    const now = new Date();
    const sunsetTime = new Date(weather.sunset);
    const longestTime = walkTime;
    const eta = new Date(now.getTime() + longestTime * 60 * 1000);
    if (eta > sunsetTime) {
      const diff = Math.round((eta.getTime() - sunsetTime.getTime()) / 60000);
      safetyCue = `Walking this route could finish about ${diff} min after sunset (${sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
    } else {
      const minsBeforeSunset = Math.round((sunsetTime.getTime() - eta.getTime()) / 60000);
      if (minsBeforeSunset < 30) {
        safetyCue = `Route finishes close to sunset (${sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) - plan accordingly`;
      }
    }
  }

  const handleReset = () => {
    setStartPoint(null);
    setEndPoint(null);
    setRouteCoords([]);
    setDistance(0);
    setRouteDuration(0);
    setRouteName("");
    setIsUsualRoute(false);
    setAttachToEmergency(false);
    setSavedRouteId(null);
    setSettingPoint("start");
    setShowChecklist(false);
    setCheckedItems({});
    initializedRef.current = false;
    onClearRepeat?.();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium" data-testid="text-tap-instruction">
              {!startPoint
                ? "Tap the map to set your start point"
                : !endPoint
                  ? "Now tap to set your end point"
                  : "Route planned"}
            </p>
            {(startPoint || endPoint) && (
              <Button variant="ghost" size="sm" onClick={handleReset} data-testid="button-reset-route">
                Clear
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={settingPoint === "start" ? "default" : "outline"}
              size="sm"
              onClick={() => setSettingPoint("start")}
              data-testid="button-set-start"
            >
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1" />
              Start
            </Button>
            <Button
              variant={settingPoint === "end" ? "default" : "outline"}
              size="sm"
              onClick={() => setSettingPoint("end")}
              data-testid="button-set-end"
            >
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1" />
              End
            </Button>
          </div>

          <RouteMap
            startPoint={startPoint}
            endPoint={endPoint}
            routeCoords={routeCoords}
            onMapClick={handleMapClick}
          />

          {(isPlanning || planMutation.isPending) && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Calculating route...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {distance > 0 && (
        <>
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-route-distance">{distanceKm} km</p>
                  <p className="text-xs text-muted-foreground">Route distance</p>
                </div>
                {distanceBand && (
                  <Badge className={getBandColor(distanceBand)} data-testid="badge-distance-band">
                    {getBandLabel(distanceBand)}
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Pace</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "moderate", "fast"] as const).map((p) => (
                    <Button
                      key={p}
                      variant={pace === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPace(p)}
                      data-testid={`button-pace-${p}`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Footprints className="h-4 w-4 mx-auto mb-1 text-green-600" />
                  <p className="font-semibold text-sm" data-testid="text-walk-time">{formatRouteTime(walkTime)}</p>
                  <p className="text-xs text-muted-foreground">Walk</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <FaRunning className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                  <p className="font-semibold text-sm" data-testid="text-run-time">{formatRouteTime(runTime)}</p>
                  <p className="text-xs text-muted-foreground">Run</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Bike className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                  <p className="font-semibold text-sm" data-testid="text-cycle-time">{formatRouteTime(cycleTime)}</p>
                  <p className="text-xs text-muted-foreground">Cycle</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {weather && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Weather Snapshot</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="font-semibold text-sm" data-testid="text-weather-temp">
                      {weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : "--"}
                    </p>
                    <p className="text-xs text-muted-foreground">Temp</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="font-semibold text-sm" data-testid="text-weather-rain">
                      {weather.precipitationProbability !== undefined ? `${weather.precipitationProbability}%` : "--"}
                    </p>
                    <p className="text-xs text-muted-foreground">Rain</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Wind className="h-4 w-4 mx-auto mb-1 text-teal-500" />
                    <p className="font-semibold text-sm" data-testid="text-weather-wind">
                      {weather.windSpeed !== undefined ? `${Math.round(weather.windSpeed)} km/h` : "--"}
                    </p>
                    <p className="text-xs text-muted-foreground">Wind</p>
                  </div>
                </div>
                {weather.weatherCode !== undefined && (
                  <p className="text-xs text-muted-foreground text-center" data-testid="text-weather-desc">
                    {getWeatherDesc(weather.weatherCode)}
                  </p>
                )}
                {weather.sunset && (
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Sun className="h-3 w-3" />
                    <span data-testid="text-sunset">Sunset: {new Date(weather.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {safetyCue && (
            <Card className="border-amber-500/50">
              <CardContent className="py-3 flex items-start gap-3">
                <Moon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground" data-testid="text-safety-cue">{safetyCue}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-4 space-y-3">
              <input
                type="text"
                placeholder="Route name"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                data-testid="input-route-name"
              />

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUsualRoute}
                    onChange={(e) => setIsUsualRoute(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-usual-route"
                  />
                  <Star className="h-4 w-4 text-amber-500" />
                  Mark as usual route
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachToEmergency}
                    onChange={(e) => setAttachToEmergency(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-attach-emergency"
                  />
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Attach to emergency if needed
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !!savedRouteId}
                  data-testid="button-save-route"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {savedRouteId ? "Saved" : "Save Route"}
                </Button>

                {savedRouteId && (
                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(true)}
                    data-testid="button-share-route"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {showShareDialog && contacts && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Share with a contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contacts added yet.</p>
                ) : (
                  contacts.map((c) => (
                    <Button
                      key={c.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => shareMutation.mutate(c.id)}
                      disabled={shareMutation.isPending}
                      data-testid={`button-share-contact-${c.id}`}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {c.name}
                    </Button>
                  ))
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowShareDialog(false)} data-testid="button-cancel-share">
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {!showChecklist ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowChecklist(true)}
              data-testid="button-show-checklist"
            >
              <Check className="h-4 w-4 mr-2" />
              Pre-start checklist
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Before you go</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 text-sm cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.key]}
                      onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="rounded"
                      data-testid={`checkbox-${item.key}`}
                    />
                    <span className={checkedItems[item.key] ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  {Object.values(checkedItems).filter(Boolean).length} of {CHECKLIST_ITEMS.length} checked
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SavedRoutesList({ onRepeat }: { onRepeat: (route: PlannedRoute) => void }) {
  const { toast } = useToast();

  const { data: routes, isLoading } = useQuery<PlannedRoute[]>({
    queryKey: ["/api/routes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/routes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Route deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground py-8">
          <Navigation className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No saved routes yet. Plan a route and save it.</p>
        </CardContent>
      </Card>
    );
  }

  const usualRoutes = routes.filter((r) => r.isUsualRoute);
  const otherRoutes = routes.filter((r) => !r.isUsualRoute);

  return (
    <div className="space-y-4">
      {usualRoutes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" /> Usual Routes
          </p>
          {usualRoutes.map((route) => (
            <RouteCard key={route.id} route={route} onRepeat={onRepeat} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
      {otherRoutes.length > 0 && (
        <div className="space-y-2">
          {usualRoutes.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other Routes</p>
          )}
          {otherRoutes.map((route) => (
            <RouteCard key={route.id} route={route} onRepeat={onRepeat} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RouteCard({
  route,
  onRepeat,
  onDelete,
}: {
  route: PlannedRoute;
  onRepeat: (route: PlannedRoute) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="hover-elevate" data-testid={`route-card-${route.id}`}>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
          <Navigation className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{route.name}</p>
            {route.isUsualRoute && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
            {route.attachToEmergency && <ShieldAlert className="h-3 w-3 text-red-500 shrink-0" />}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {(route.distanceM / 1000).toFixed(1)} km
            </span>
            {route.distanceBand && (
              <Badge variant="secondary" className="text-xs py-0 h-5">{route.distanceBand}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onRepeat(route)} data-testid={`button-repeat-${route.id}`}>
            <Repeat className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(route.id)} data-testid={`button-delete-${route.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RoutesTab() {
  const [view, setView] = useState<"planner" | "saved">("planner");
  const [repeatRoute, setRepeatRoute] = useState<PlannedRoute | null>(null);

  const handleRepeat = (route: PlannedRoute) => {
    setRepeatRoute(route);
    setView("planner");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={view === "planner" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("planner")}
          data-testid="button-view-planner"
        >
          <MapPin className="h-4 w-4 mr-1" />
          Plan
        </Button>
        <Button
          variant={view === "saved" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("saved")}
          data-testid="button-view-saved"
        >
          <Save className="h-4 w-4 mr-1" />
          Saved
        </Button>
      </div>

      {view === "planner" ? (
        <RoutePlannerView initialRoute={repeatRoute} onClearRepeat={() => setRepeatRoute(null)} />
      ) : (
        <SavedRoutesList onRepeat={handleRepeat} />
      )}
    </div>
  );
}
