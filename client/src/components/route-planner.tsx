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
  Search, X, LocateFixed, Route as RouteIcon,
} from "lucide-react";
import { FaRunning } from "react-icons/fa";
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
  if (band === "short") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (band === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
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

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function AddressSearch({
  label,
  placeholder,
  value,
  onSelect,
  accentColor,
  testId,
}: {
  label: string;
  placeholder: string;
  value: [number, number] | null;
  onSelect: (lat: number, lng: number, name: string) => void;
  accentColor: string;
  testId: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setSelectedName("");
      setQuery("");
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = useCallback((q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`, {
      headers: { "User-Agent": "aok-app/1.0" },
    })
      .then(r => r.json())
      .then((data: NominatimResult[]) => {
        setResults(data);
        setShowResults(true);
      })
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false));
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setSelectedName("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 500);
  };

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const shortName = result.display_name.split(",").slice(0, 2).join(",").trim();
    setSelectedName(shortName);
    setQuery("");
    setShowResults(false);
    setResults([]);
    onSelect(lat, lng, shortName);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedName("My Location");
        setQuery("");
        setShowResults(false);
        onSelect(lat, lng, "My Location");
      },
      () => {},
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${accentColor}`} />
        {label}
      </label>
      {selectedName ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm flex-1 truncate">{selectedName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => {
              setSelectedName("");
              onSelect(0, 0, "");
            }}
            data-testid={`${testId}-clear`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="w-full pl-9 pr-10 py-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            data-testid={testId}
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleUseMyLocation}
              title="Use my location"
              data-testid={`${testId}-locate`}
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.place_id}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-0 flex items-start gap-2"
              onClick={() => handleSelect(r)}
              data-testid={`${testId}-result-${r.place_id}`}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
          html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const m = L.marker(startPoint, { icon: startIcon }).addTo(map);
        markersRef.current.push(m);
      }

      if (endPoint) {
        const endIcon = L.divIcon({
          html: '<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
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
        const polyline = L.polyline(latlngs, { color: "#3b82f6", weight: 5, opacity: 0.85 }).addTo(map);
        polylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      } else if (startPoint && endPoint) {
        map.fitBounds([startPoint, endPoint], { padding: [40, 40] });
      } else if (startPoint) {
        map.setView(startPoint, 15);
      }
    });
  }, [startPoint, endPoint, routeCoords]);

  return (
    <div
      ref={mapRef}
      className="h-72 sm:h-80 rounded-xl overflow-hidden border border-border shadow-sm"
      data-testid="route-map"
    />
  );
}

const CHECKLIST_ITEMS = [
  { key: "phone", label: "Phone charged", icon: "battery" },
  { key: "headphones", label: "Headphones on", icon: "headphones" },
  { key: "weather", label: "Weather checked", icon: "cloud" },
  { key: "keys", label: "Keys", icon: "key" },
];

function RoutePlannerView({ initialRoute, onClearRepeat }: { initialRoute?: PlannedRoute | null; onClearRepeat?: () => void }) {
  const { toast } = useToast();
  const [startPoint, setStartPoint] = useState<[number, number] | null>(
    initialRoute ? [initialRoute.startLat, initialRoute.startLng] : null
  );
  const [endPoint, setEndPoint] = useState<[number, number] | null>(
    initialRoute ? [initialRoute.endLat, initialRoute.endLng] : null
  );
  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
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
      setStartName(initialRoute.name ? "Saved start" : "Start point");
      setEndName(initialRoute.name ? "Saved end" : "End point");
    }
  }, [initialRoute]);

  const midLat = startPoint ? startPoint[0] : null;
  const midLng = startPoint ? startPoint[1] : null;

  const { data: weather } = useQuery<{
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
        setStartName("Dropped pin");
        setSettingPoint("end");
        setRouteCoords([]);
        setDistance(0);
      } else {
        setEndPoint([lat, lng]);
        setEndName("Dropped pin");
      }
    },
    [settingPoint]
  );

  useEffect(() => {
    if (startPoint && endPoint && startPoint[0] !== 0 && endPoint[0] !== 0) {
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
    setStartName("");
    setEndName("");
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
          <div className="space-y-3">
            <AddressSearch
              label="Starting point"
              placeholder="Search address or use location..."
              value={startPoint}
              onSelect={(lat, lng, name) => {
                if (lat === 0 && lng === 0) {
                  setStartPoint(null);
                  setStartName("");
                  setRouteCoords([]);
                  setDistance(0);
                  return;
                }
                setStartPoint([lat, lng]);
                setStartName(name);
                setSettingPoint("end");
              }}
              accentColor="bg-emerald-500"
              testId="input-start-address"
            />
            <AddressSearch
              label="Destination"
              placeholder="Search address or use location..."
              value={endPoint}
              onSelect={(lat, lng, name) => {
                if (lat === 0 && lng === 0) {
                  setEndPoint(null);
                  setEndName("");
                  setRouteCoords([]);
                  setDistance(0);
                  return;
                }
                setEndPoint([lat, lng]);
                setEndName(name);
              }}
              accentColor="bg-rose-500"
              testId="input-end-address"
            />
          </div>

          <div className="relative">
            <RouteMap
              startPoint={startPoint}
              endPoint={endPoint}
              routeCoords={routeCoords}
              onMapClick={handleMapClick}
            />
            {!startPoint && !endPoint && (
              <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-border shadow-sm">
                  You can also tap the map to set points
                </div>
              </div>
            )}
          </div>

          {(isPlanning || planMutation.isPending) && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Calculating your route...</span>
            </div>
          )}

          {(startPoint || endPoint) && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="w-full" data-testid="button-reset-route">
              <X className="h-4 w-4 mr-1" /> Clear route
            </Button>
          )}
        </CardContent>
      </Card>

      {distance > 0 && (
        <>
          <Card>
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-3xl font-bold tracking-tight" data-testid="text-route-distance">{distanceKm} km</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Route distance</p>
                </div>
                {distanceBand && (
                  <Badge className={getBandColor(distanceBand)} data-testid="badge-distance-band">
                    {getBandLabel(distanceBand)}
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Pace</p>
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
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                  <Footprints className="h-5 w-5 mx-auto mb-1.5 text-emerald-600" />
                  <p className="font-bold text-sm" data-testid="text-walk-time">{formatRouteTime(walkTime)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Walk</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <FaRunning className="h-5 w-5 mx-auto mb-1.5 text-blue-600" />
                  <p className="font-bold text-sm" data-testid="text-run-time">{formatRouteTime(runTime)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Run</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                  <Bike className="h-5 w-5 mx-auto mb-1.5 text-purple-600" />
                  <p className="font-bold text-sm" data-testid="text-cycle-time">{formatRouteTime(cycleTime)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cycle</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {weather && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-semibold">Weather Snapshot</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                    <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="font-bold text-sm" data-testid="text-weather-temp">
                      {weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : "--"}
                    </p>
                    <p className="text-xs text-muted-foreground">Temp</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="font-bold text-sm" data-testid="text-weather-rain">
                      {weather.precipitationProbability !== undefined ? `${weather.precipitationProbability}%` : "--"}
                    </p>
                    <p className="text-xs text-muted-foreground">Rain</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 text-center">
                    <Wind className="h-4 w-4 mx-auto mb-1 text-teal-500" />
                    <p className="font-bold text-sm" data-testid="text-weather-wind">
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
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg py-1.5 px-3">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span data-testid="text-sunset">Sunset: {new Date(weather.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {safetyCue && (
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="py-3 flex items-start gap-3">
                <Moon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm" data-testid="text-safety-cue">{safetyCue}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-4 space-y-3">
              <input
                type="text"
                placeholder="Give your route a name..."
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                data-testid="input-route-name"
              />

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer py-1">
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

                <label className="flex items-center gap-2.5 text-sm cursor-pointer py-1">
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
            <Card className="border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10">
              <CardContent className="py-4 space-y-1">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Before you go
                </p>
                {CHECKLIST_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 text-sm cursor-pointer py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.key]}
                      onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="rounded"
                      data-testid={`checkbox-${item.key}`}
                    />
                    <span className={checkedItems[item.key] ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                    {checkedItems[item.key] && <Check className="h-3.5 w-3.5 text-emerald-500 ml-auto" />}
                  </label>
                ))}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {Object.values(checkedItems).filter(Boolean).length} of {CHECKLIST_ITEMS.length} checked
                  </p>
                  {Object.values(checkedItems).filter(Boolean).length === CHECKLIST_ITEMS.length && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Ready to go</Badge>
                  )}
                </div>
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
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <RouteIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-muted-foreground">No saved routes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Plan a route and save it to see it here</p>
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Other Routes</p>
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
        <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
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