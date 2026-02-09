import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Navigation, Cloud, Thermometer, Droplets, Wind, Sun, Moon,
  Clock, Save, Repeat, Share2, ShieldAlert, Star, Check, ArrowLeft,
  Loader2, Trash2, AlertTriangle, Footprints, Bike, ChevronRight,
  Search, X, LocateFixed, Route as RouteIcon, MousePointerClick,
  Battery, Headphones, Key, CheckCircle2, Timer, Play, Plus,
  Smartphone, ChevronDown, ChevronUp, Zap,
  Store, Coffee, UtensilsCrossed, Beer, Fuel, ShoppingCart, Building2,
  Heart, Pill, Eye, EyeOff,
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
  if (band === "short") return "Short";
  if (band === "medium") return "Medium";
  return "Long";
}

function getBandRange(band: string): string {
  if (band === "short") return "0 – 2 km";
  if (band === "medium") return "2 – 5 km";
  return "5+ km";
}

function getBandColor(band: string): string {
  if (band === "short") return "bg-emerald-500";
  if (band === "medium") return "bg-amber-500";
  return "bg-rose-500";
}

function getBandTextColor(band: string): string {
  if (band === "short") return "text-emerald-600 dark:text-emerald-400";
  if (band === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
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

function getWeatherEmoji(code: number | undefined): string {
  if (code === undefined) return "";
  if (code === 0) return "";
  if (code <= 3) return "";
  if (code <= 48) return "";
  if (code <= 67) return "";
  if (code <= 77) return "";
  if (code <= 86) return "";
  if (code <= 99) return "";
  return "";
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface POI {
  id: number;
  lat: number;
  lng: number;
  name: string;
  category: string;
  type: string;
}

const POI_CATEGORIES: Record<string, { label: string; color: string; bgColor: string; darkBgColor: string; tags: string }> = {
  cafe: { label: "Cafes", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100", darkBgColor: "dark:bg-amber-900/30", tags: "amenity=cafe" },
  restaurant: { label: "Restaurants", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100", darkBgColor: "dark:bg-orange-900/30", tags: "amenity=restaurant" },
  pub: { label: "Pubs & Bars", color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100", darkBgColor: "dark:bg-yellow-900/30", tags: "amenity=pub|amenity=bar" },
  shop: { label: "Shops", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100", darkBgColor: "dark:bg-blue-900/30", tags: "shop=supermarket|shop=convenience|shop=general" },
  fuel: { label: "Fuel Stations", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100", darkBgColor: "dark:bg-red-900/30", tags: "amenity=fuel" },
  pharmacy: { label: "Pharmacies", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100", darkBgColor: "dark:bg-emerald-900/30", tags: "amenity=pharmacy" },
  attraction: { label: "Attractions", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100", darkBgColor: "dark:bg-purple-900/30", tags: "tourism=attraction|tourism=museum|tourism=viewpoint|historic=monument" },
};

function getCategoryIcon(category: string) {
  switch (category) {
    case "cafe": return Coffee;
    case "restaurant": return UtensilsCrossed;
    case "pub": return Beer;
    case "shop": return ShoppingCart;
    case "fuel": return Fuel;
    case "pharmacy": return Pill;
    case "attraction": return Building2;
    default: return Store;
  }
}

function getPoiMarkerColor(category: string): string {
  switch (category) {
    case "cafe": return "#d97706";
    case "restaurant": return "#ea580c";
    case "pub": return "#a16207";
    case "shop": return "#2563eb";
    case "fuel": return "#dc2626";
    case "pharmacy": return "#059669";
    case "attraction": return "#9333ea";
    default: return "#6b7280";
  }
}

async function fetchPOIsAlongRoute(routeCoords: Array<[number, number]>): Promise<POI[]> {
  if (routeCoords.length < 2) return [];

  const lats = routeCoords.map(c => c[1]);
  const lngs = routeCoords.map(c => c[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const pad = 0.003;
  const bbox = `${minLat - pad},${minLng - pad},${maxLat + pad},${maxLng + pad}`;

  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="cafe"](${bbox});
      node["amenity"="restaurant"](${bbox});
      node["amenity"="pub"](${bbox});
      node["amenity"="bar"](${bbox});
      node["shop"="supermarket"](${bbox});
      node["shop"="convenience"](${bbox});
      node["amenity"="fuel"](${bbox});
      node["amenity"="pharmacy"](${bbox});
      node["tourism"="attraction"](${bbox});
      node["tourism"="museum"](${bbox});
      node["tourism"="viewpoint"](${bbox});
      node["historic"="monument"](${bbox});
    );
    out body 100;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.elements || [])
      .filter((el: any) => el.tags?.name)
      .map((el: any) => {
        let category = "shop";
        const tags = el.tags || {};
        if (tags.amenity === "cafe") category = "cafe";
        else if (tags.amenity === "restaurant") category = "restaurant";
        else if (tags.amenity === "pub" || tags.amenity === "bar") category = "pub";
        else if (tags.shop) category = "shop";
        else if (tags.amenity === "fuel") category = "fuel";
        else if (tags.amenity === "pharmacy") category = "pharmacy";
        else if (tags.tourism || tags.historic) category = "attraction";

        return {
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          name: tags.name,
          category,
          type: tags.amenity || tags.shop || tags.tourism || tags.historic || "place",
        };
      });
  } catch {
    return [];
  }
}

function AddressSearch({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  accentColor,
  dotColor,
  testId,
}: {
  label: string;
  placeholder: string;
  value: [number, number] | null;
  onSelect: (lat: number, lng: number, name: string) => void;
  onClear: () => void;
  accentColor: string;
  dotColor: string;
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
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&countrycodes=gb`, {
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
      {selectedName ? (
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg ${accentColor} transition-all`}>
          <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0 ring-2 ring-white dark:ring-gray-800`} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60 mb-0.5">{label}</p>
            <p className="text-sm font-medium truncate">{selectedName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedName("");
              onClear();
            }}
            data-testid={`${testId}-clear`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${dotColor} ring-2 ring-white dark:ring-gray-800 z-10`} />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="w-full pl-9 pr-20 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/60"
            data-testid={testId}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUseMyLocation}
              title="Use my location"
              data-testid={`${testId}-locate`}
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {results.map((r) => (
            <Button
              key={r.place_id}
              variant="ghost"
              className="w-full justify-start rounded-none border-b border-border/50 last:border-0 flex items-start gap-2.5 font-normal text-left"
              onClick={() => handleSelect(r)}
              data-testid={`${testId}-result-${r.place_id}`}
            >
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="line-clamp-2 text-foreground/80">{r.display_name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
}

function RouteMap({
  startPoint,
  endPoint,
  routeCoords,
  waypoints,
  routePoints,
  onMapClick,
  onPoiStopover,
  mapMode,
  settingPoint,
  pois,
  showPois,
}: {
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  routeCoords: Array<[number, number]>;
  waypoints: Waypoint[];
  routePoints: Waypoint[];
  onMapClick: (lat: number, lng: number) => void;
  onPoiStopover: (poi: POI) => void;
  mapMode: "search" | "pin" | "waypoint";
  settingPoint: "start" | "end";
  pois: POI[];
  showPois: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const poiMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default || mod;

      if (!mapInstance.current) {
        const map = L.map(mapRef.current!, { zoomControl: false, attributionControl: false });
        mapInstance.current = map;

        L.control.zoom({ position: "bottomright" }).addTo(map);

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

    import("leaflet").then((mod) => {
      const L = mod.default || mod;
      const map = mapInstance.current;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      if (mapMode === "waypoint" && routePoints.length > 0) {
        routePoints.forEach((rp, i) => {
          const isFirst = i === 0;
          const isLast = i === routePoints.length - 1 && routePoints.length > 1;
          const bgColor = isFirst ? "#22c55e" : isLast ? "#ef4444" : "#3b82f6";
          const rpIcon = L.divIcon({
            html: `<div style="background:${bgColor};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white">${i + 1}</div>`,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          const label = isFirst ? "Start" : isLast ? "Finish" : `Waypoint ${i}`;
          const m = L.marker([rp.lat, rp.lng], { icon: rpIcon })
            .bindPopup(`<div style="font-size:12px;font-weight:600">${label}</div><div style="font-size:11px;color:#666">${rp.name}</div>`)
            .addTo(map);
          markersRef.current.push(m);
        });
      } else {
        if (startPoint) {
          const startIcon = L.divIcon({
            html: `<div style="background:#22c55e;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          const m = L.marker(startPoint, { icon: startIcon }).addTo(map);
          markersRef.current.push(m);
        }

        if (endPoint) {
          const endIcon = L.divIcon({
            html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          const m = L.marker(endPoint, { icon: endIcon }).addTo(map);
          markersRef.current.push(m);
        }

        waypoints.forEach((wp, i) => {
          const wpIcon = L.divIcon({
            html: `<div style="background:#8b5cf6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white">${i + 1}</div>`,
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const m = L.marker([wp.lat, wp.lng], { icon: wpIcon })
            .bindPopup(`<div style="font-size:12px;font-weight:600">Stopover ${i + 1}</div><div style="font-size:11px;color:#666">${wp.name}</div>`)
            .addTo(map);
          markersRef.current.push(m);
        });
      }

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      if (routeCoords.length > 1) {
        const latlngs = routeCoords.map((c) => [c[1], c[0]] as [number, number]);
        const polyline = L.polyline(latlngs, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        polylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      } else if (startPoint && endPoint) {
        map.fitBounds([startPoint, endPoint], { padding: [50, 50] });
      } else if (startPoint) {
        map.setView(startPoint, 15);
      }
    });
  }, [startPoint, endPoint, routeCoords, waypoints, routePoints, mapMode]);

  useEffect(() => {
    if (!mapInstance.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default || mod;
      const map = mapInstance.current;
      poiMarkersRef.current.forEach((m) => map.removeLayer(m));
      poiMarkersRef.current = [];

      if (!showPois || pois.length === 0) return;

      pois.forEach((poi) => {
        const color = getPoiMarkerColor(poi.category);
        const icon = L.divIcon({
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          className: "",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const popupContent = document.createElement("div");
        popupContent.innerHTML = `<div style="font-size:13px;font-weight:600">${poi.name}</div><div style="font-size:11px;color:#666;text-transform:capitalize;margin-bottom:6px">${poi.type}</div>`;
        const btn = document.createElement("button");
        btn.textContent = "Add as stopover";
        btn.setAttribute("data-testid", `button-stopover-poi-${poi.id}`);
        btn.style.cssText = "background:#8b5cf6;color:white;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;width:100%";
        btn.addEventListener("click", () => {
          onPoiStopover(poi);
          map.closePopup();
        });
        popupContent.appendChild(btn);
        const m = L.marker([poi.lat, poi.lng], { icon })
          .bindPopup(popupContent)
          .addTo(map);
        poiMarkersRef.current.push(m);
      });
    });
  }, [pois, showPois]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className={`w-full rounded-xl overflow-hidden border border-border shadow-sm transition-all ${
          routeCoords.length > 0 ? "h-80 sm:h-96" : "h-56 sm:h-64"
        }`}
        style={{ cursor: mapMode === "pin" || mapMode === "waypoint" ? "crosshair" : "grab" }}
        data-testid="route-map"
      />
      {mapMode === "pin" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-card/95 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium shadow-lg border border-border flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${settingPoint === "start" ? "bg-emerald-500" : "bg-rose-500"} animate-pulse`} />
            Tap to set {settingPoint === "start" ? "start" : "finish"}
          </div>
        </div>
      )}
      {mapMode === "waypoint" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-card/95 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium shadow-lg border border-border flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            {routePoints.length === 0 ? "Tap to place your first point" : `${routePoints.length} point${routePoints.length > 1 ? "s" : ""} — tap to add more`}
          </div>
        </div>
      )}
      {mapMode === "search" && !startPoint && !endPoint && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/80 backdrop-blur-sm px-5 py-3 rounded-xl text-sm text-muted-foreground border border-border/50 shadow-lg text-center">
            <Search className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/60" />
            <p className="font-medium">Search for a location above</p>
          </div>
        </div>
      )}
    </div>
  );
}

const CHECKLIST_ITEMS = [
  { key: "phone", label: "Phone charged", IconComp: Battery },
  { key: "headphones", label: "Headphones", IconComp: Headphones },
  { key: "weather", label: "Weather checked", IconComp: Cloud },
  { key: "keys", label: "Keys & ID", IconComp: Key },
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
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"search" | "pin" | "waypoint">("search");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [showPois, setShowPois] = useState(true);
  const [loadingPois, setLoadingPois] = useState(false);
  const [poisExpanded, setPoisExpanded] = useState(false);
  const [poiFilter, setPoiFilter] = useState<string | null>(null);
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
        waypoints: waypoints.length > 0 ? waypoints : undefined,
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

  const [routePoints, setRoutePoints] = useState<Waypoint[]>([]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mapMode === "waypoint") {
        setRoutePoints((prev) => [...prev, { lat, lng, name: `Point ${prev.length + 1}` }]);
        return;
      }
      if (mapMode !== "pin") return;
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
    [settingPoint, mapMode]
  );

  useEffect(() => {
    if (mapMode === "waypoint") return;
    if (startPoint && endPoint && startPoint[0] !== 0 && endPoint[0] !== 0) {
      setIsPlanning(true);
      planMutation.mutate({ mode: "foot" });
    }
  }, [startPoint, endPoint, waypoints]);

  useEffect(() => {
    if (mapMode !== "waypoint") return;
    if (routePoints.length < 2) {
      if (routePoints.length === 1) {
        setStartPoint([routePoints[0].lat, routePoints[0].lng]);
        setStartName(routePoints[0].name);
      }
      setEndPoint(null);
      setEndName("");
      setWaypoints([]);
      setRouteCoords([]);
      setDistance(0);
      setRouteDuration(0);
      return;
    }
    const first = routePoints[0];
    const last = routePoints[routePoints.length - 1];
    const middle = routePoints.slice(1, -1);
    setStartPoint([first.lat, first.lng]);
    setStartName(first.name);
    setEndPoint([last.lat, last.lng]);
    setEndName(last.name);
    setWaypoints(middle);
    setIsPlanning(true);
    planMutation.mutate({ mode: "foot" });
  }, [routePoints, mapMode]);

  useEffect(() => {
    if (routeCoords.length < 2) {
      setPois([]);
      return;
    }
    setLoadingPois(true);
    fetchPOIsAlongRoute(routeCoords).then((results) => {
      setPois(results);
      setLoadingPois(false);
    }).catch(() => setLoadingPois(false));
  }, [routeCoords]);

  const distanceBand = distance > 0 ? getDistanceBand(distance) : null;
  const distanceKm = (distance / 1000).toFixed(2);

  const walkTime = distance > 0 ? (distance / 1000 / PACE_SPEEDS.walk[pace]) * 60 : 0;
  const runTime = distance > 0 ? (distance / 1000 / PACE_SPEEDS.run[pace]) * 60 : 0;
  const cycleTime = distance > 0 ? (distance / 1000 / PACE_SPEEDS.cycle[pace]) * 60 : 0;

  const now = new Date();
  const startTimeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const walkFinish = distance > 0 ? new Date(now.getTime() + walkTime * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const runFinish = distance > 0 ? new Date(now.getTime() + runTime * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const cycleFinish = distance > 0 ? new Date(now.getTime() + cycleTime * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  let safetyCue: string | null = null;
  if (weather?.sunset && distance > 0) {
    const sunsetTime = new Date(weather.sunset);
    const longestTime = walkTime;
    const eta = new Date(now.getTime() + longestTime * 60 * 1000);
    if (eta > sunsetTime) {
      const diff = Math.round((eta.getTime() - sunsetTime.getTime()) / 60000);
      safetyCue = `Walking could finish ~${diff} min after sunset (${sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
    } else {
      const minsBeforeSunset = Math.round((sunsetTime.getTime() - eta.getTime()) / 60000);
      if (minsBeforeSunset < 30) {
        safetyCue = `Finishes close to sunset (${sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) — plan accordingly`;
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
    setCheckedItems({});
    setWaypoints([]);
    setRoutePoints([]);
    setPois([]);
    setPoiFilter(null);
    setPoisExpanded(false);
    initializedRef.current = false;
    onClearRepeat?.();
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant={mapMode === "search" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => { if (mapMode === "waypoint") { handleReset(); } setMapMode("search"); }}
          data-testid="button-mode-search"
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Address
        </Button>
        <Button
          variant={mapMode === "pin" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => { if (mapMode === "waypoint") { handleReset(); } setMapMode("pin"); }}
          data-testid="button-mode-pin"
        >
          <MousePointerClick className="h-3.5 w-3.5 mr-1.5" />
          Pin Drop
        </Button>
        <Button
          variant={mapMode === "waypoint" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => { setMapMode("waypoint"); handleReset(); }}
          data-testid="button-mode-waypoint"
        >
          <RouteIcon className="h-3.5 w-3.5 mr-1.5" />
          Waypoints
        </Button>
      </div>

      {mapMode === "search" && (
        <div className="space-y-2 relative z-30">
          <AddressSearch
            label="Start"
            placeholder="Search start address, postcode..."
            value={startPoint}
            onSelect={(lat, lng, name) => {
              setStartPoint([lat, lng]);
              setStartName(name);
              setSettingPoint("end");
            }}
            onClear={() => {
              setStartPoint(null);
              setStartName("");
              setRouteCoords([]);
              setDistance(0);
            }}
            accentColor="bg-emerald-50 dark:bg-emerald-950/40"
            dotColor="bg-emerald-500"
            testId="input-start-address"
          />
          <AddressSearch
            label="Finish"
            placeholder="Search destination, postcode..."
            value={endPoint}
            onSelect={(lat, lng, name) => {
              setEndPoint([lat, lng]);
              setEndName(name);
            }}
            onClear={() => {
              setEndPoint(null);
              setEndName("");
              setRouteCoords([]);
              setDistance(0);
            }}
            accentColor="bg-rose-50 dark:bg-rose-950/40"
            dotColor="bg-rose-500"
            testId="input-end-address"
          />
        </div>
      )}

      <RouteMap
        startPoint={startPoint}
        endPoint={endPoint}
        routeCoords={routeCoords}
        waypoints={waypoints}
        routePoints={routePoints}
        onMapClick={handleMapClick}
        onPoiStopover={(poi) => {
          if (mapMode === "waypoint") {
            setRoutePoints((prev) => [...prev, { lat: poi.lat, lng: poi.lng, name: poi.name }]);
          } else {
            if (waypoints.some(w => w.lat === poi.lat && w.lng === poi.lng)) return;
            setWaypoints((prev) => [...prev, { lat: poi.lat, lng: poi.lng, name: poi.name }]);
          }
        }}
        mapMode={mapMode}
        settingPoint={settingPoint}
        pois={poiFilter ? pois.filter(p => p.category === poiFilter) : pois}
        showPois={showPois}
      />

      {(isPlanning || planMutation.isPending) && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Calculating route...</span>
        </div>
      )}

      {(startPoint || endPoint || routePoints.length > 0) && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="w-full" data-testid="button-reset-route">
          <X className="h-3.5 w-3.5 mr-1" /> Clear route
        </Button>
      )}

      {mapMode === "waypoint" && routePoints.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <RouteIcon className="h-3.5 w-3.5 text-blue-500" />
                Route Points ({routePoints.length})
              </p>
              <div className="flex items-center gap-1">
                {routePoints.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRoutePoints((prev) => prev.slice(0, -1))}
                    data-testid="button-undo-waypoint"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" /> Undo
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRoutePoints([])}
                  data-testid="button-clear-route-points"
                >
                  <X className="h-3 w-3 mr-1" /> Clear all
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {routePoints.map((rp, i) => {
                const isFirst = i === 0;
                const isLast = i === routePoints.length - 1 && routePoints.length > 1;
                const bgColor = isFirst ? "bg-emerald-500" : isLast ? "bg-rose-500" : "bg-blue-500";
                const containerBg = isFirst ? "bg-emerald-50 dark:bg-emerald-950/30" : isLast ? "bg-rose-50 dark:bg-rose-950/30" : "bg-blue-50 dark:bg-blue-950/30";
                const label = isFirst ? "Start" : isLast ? "Finish" : `Waypoint ${i}`;
                return (
                  <div key={`rp-${i}`} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${containerBg}`}>
                    <div className={`w-5 h-5 rounded-full ${bgColor} flex items-center justify-center shrink-0`}>
                      <span className="text-[10px] font-bold text-white">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">
                        ({rp.lat.toFixed(4)}, {rp.lng.toFixed(4)})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRoutePoints((prev) => prev.filter((_, idx) => idx !== i))}
                      data-testid={`button-remove-route-point-${i}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {routePoints.length < 2 && (
              <p className="text-xs text-muted-foreground text-center mt-2 py-1">
                Add at least 2 points to calculate a route
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {mapMode !== "waypoint" && waypoints.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-violet-500" />
                Stopovers ({waypoints.length})
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWaypoints([])}
                data-testid="button-clear-waypoints"
              >
                <X className="h-3 w-3 mr-1" /> Clear all
              </Button>
            </div>
            <div className="space-y-1">
              {waypoints.map((wp, i) => (
                <div key={`${wp.lat}-${wp.lng}`} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-violet-50 dark:bg-violet-950/30">
                  <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">{i + 1}</span>
                  </div>
                  <span className="text-sm flex-1 truncate">{wp.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWaypoints((prev) => prev.filter((_, idx) => idx !== i))}
                    data-testid={`button-remove-waypoint-${i}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {distance > 0 && (
        <Card className="overflow-visible">
          <CardContent className="py-0 px-0">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-end justify-between gap-3 mb-1">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Distance</p>
                  <p className="text-4xl font-bold tracking-tight leading-none" data-testid="text-route-distance">{distanceKm}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">kilometres</p>
                </div>
                {distanceBand && (
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white ${getBandColor(distanceBand)}`} data-testid="badge-distance-band">
                      {getBandLabel(distanceBand)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{getBandRange(distanceBand)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border">
              <div className="px-5 py-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pace</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "moderate", "fast"] as const).map((p) => (
                    <Button
                      key={p}
                      variant={pace === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPace(p)}
                      data-testid={`button-pace-${p}`}
                    >
                      {p === "easy" ? "Easy" : p === "moderate" ? "Moderate" : "Fast"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-4 py-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                    <Footprints className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="font-bold text-base" data-testid="text-walk-time">{formatRouteTime(walkTime)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Walk</p>
                  {walkFinish && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Finish {walkFinish}</p>
                  )}
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                    <FaRunning className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="font-bold text-base" data-testid="text-run-time">{formatRouteTime(runTime)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Run</p>
                  {runFinish && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1">Finish {runFinish}</p>
                  )}
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
                    <Bike className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="font-bold text-base" data-testid="text-cycle-time">{formatRouteTime(cycleTime)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Cycle</p>
                  {cycleFinish && (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1">Finish {cycleFinish}</p>
                  )}
                </div>
              </div>
            </div>

            {distance > 0 && (
              <div className="border-t border-border px-5 py-3 flex items-center gap-3 bg-muted/20">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Start now at <span className="font-semibold text-foreground">{startTimeStr}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {weather && (
        <Card>
          <CardContent className="py-0 px-0">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weather Now</p>
                </div>
                {weather.weatherCode !== undefined && (
                  <Badge variant="secondary" className="text-xs" data-testid="text-weather-desc">
                    {getWeatherDesc(weather.weatherCode)}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 text-center">
                  <Thermometer className="h-4 w-4 mx-auto mb-1.5 text-orange-500" />
                  <p className="font-bold text-lg" data-testid="text-weather-temp">
                    {weather.temperature !== undefined ? `${Math.round(weather.temperature)}°` : "--"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Temp</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center">
                  <Droplets className="h-4 w-4 mx-auto mb-1.5 text-blue-500" />
                  <p className="font-bold text-lg" data-testid="text-weather-rain">
                    {weather.precipitationProbability !== undefined ? `${weather.precipitationProbability}%` : "--"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Rain</p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-950/30 rounded-xl p-3 text-center">
                  <Wind className="h-4 w-4 mx-auto mb-1.5 text-teal-500" />
                  <p className="font-bold text-lg" data-testid="text-weather-wind">
                    {weather.windSpeed !== undefined ? `${Math.round(weather.windSpeed)}` : "--"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">km/h</p>
                </div>
              </div>
            </div>
            {weather.sunset && (
              <div className="border-t border-border px-5 py-2.5 flex items-center gap-2 bg-amber-50/50 dark:bg-amber-950/20">
                <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-xs font-medium" data-testid="text-sunset">
                  Sunset at {new Date(weather.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {safetyCue && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200" data-testid="text-safety-cue">{safetyCue}</p>
        </div>
      )}

      {distance > 0 && (
        <Card>
          <CardContent className="py-0 px-0">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-indigo-500" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nearby Places</p>
                </div>
                <div className="flex items-center gap-2">
                  {loadingPois && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPois(!showPois)}
                    data-testid="button-toggle-pois"
                  >
                    {showPois ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {pois.length === 0 && !loadingPois && (
                <p className="text-sm text-muted-foreground text-center py-3">No places found along this route</p>
              )}

              {pois.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant={poiFilter === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPoiFilter(null)}
                      data-testid="button-poi-filter-all"
                    >
                      All ({pois.length})
                    </Button>
                    {Object.entries(POI_CATEGORIES).map(([key, cat]) => {
                      const count = pois.filter(p => p.category === key).length;
                      if (count === 0) return null;
                      const IconComp = getCategoryIcon(key);
                      return (
                        <Button
                          key={key}
                          variant={poiFilter === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPoiFilter(poiFilter === key ? null : key)}
                          data-testid={`button-poi-filter-${key}`}
                        >
                          <IconComp className="h-3.5 w-3.5 mr-1" />
                          {count}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setPoisExpanded(!poisExpanded)}
                    data-testid="button-pois-expand"
                  >
                    {poisExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                    {poisExpanded ? "Hide list" : `Show ${(poiFilter ? pois.filter(p => p.category === poiFilter) : pois).length} places`}
                  </Button>

                  {poisExpanded && (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {(poiFilter ? pois.filter(p => p.category === poiFilter) : pois).map((poi) => {
                        const IconComp = getCategoryIcon(poi.category);
                        const catInfo = POI_CATEGORIES[poi.category];
                        return (
                          <div key={poi.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors" data-testid={`poi-item-${poi.id}`}>
                            <div className={`w-8 h-8 rounded-full ${catInfo?.bgColor || "bg-muted"} ${catInfo?.darkBgColor || ""} flex items-center justify-center shrink-0`}>
                              <IconComp className={`h-4 w-4 ${catInfo?.color || "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{poi.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{poi.type}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-violet-600 dark:text-violet-400"
                              onClick={() => {
                                if (waypoints.some(w => w.lat === poi.lat && w.lng === poi.lng)) return;
                                setWaypoints((prev) => [...prev, { lat: poi.lat, lng: poi.lng, name: poi.name }]);
                              }}
                              disabled={waypoints.some(w => w.lat === poi.lat && w.lng === poi.lng)}
                              data-testid={`button-add-stopover-${poi.id}`}
                            >
                              {waypoints.some(w => w.lat === poi.lat && w.lng === poi.lng) ? (
                                <><Check className="h-3 w-3 mr-1" /> Added</>
                              ) : (
                                <><Plus className="h-3 w-3 mr-1" /> Stopover</>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-0 px-0">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Before You Go</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {checkedCount}/{CHECKLIST_ITEMS.length}
              </span>
            </div>
            <div className="space-y-0">
              {CHECKLIST_ITEMS.map((item) => {
                const checked = !!checkedItems[item.key];
                return (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                      checked
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-border"
                    }`}>
                      {checked && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="sr-only"
                      data-testid={`checkbox-${item.key}`}
                    />
                    <item.IconComp className={`h-4 w-4 shrink-0 ${checked ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <span className={`text-sm flex-1 ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          {checkedCount === CHECKLIST_ITEMS.length && (
            <div className="border-t border-emerald-200 dark:border-emerald-800/40 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-b-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Ready to go</span>
            </div>
          )}
        </CardContent>
      </Card>

      {distance > 0 && (
        <Card>
          <CardContent className="py-4 px-5 space-y-3">
            <input
              type="text"
              placeholder="Name your route..."
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              data-testid="input-route-name"
            />

            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm cursor-pointer py-2 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  isUsualRoute ? "bg-amber-500 border-amber-500" : "border-border"
                }`}>
                  {isUsualRoute && <Check className="h-3 w-3 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={isUsualRoute}
                  onChange={(e) => setIsUsualRoute(e.target.checked)}
                  className="sr-only"
                  data-testid="checkbox-usual-route"
                />
                <Star className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Mark as usual route</span>
              </label>

              <label className="flex items-center gap-3 text-sm cursor-pointer py-2 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  attachToEmergency ? "bg-rose-500 border-rose-500" : "border-border"
                }`}>
                  {attachToEmergency && <Check className="h-3 w-3 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={attachToEmergency}
                  onChange={(e) => setAttachToEmergency(e.target.checked)}
                  className="sr-only"
                  data-testid="checkbox-attach-emergency"
                />
                <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Attach to emergency alerts</span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !!savedRouteId}
                data-testid="button-save-route"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : savedRouteId ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
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
      )}

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
        <CardContent className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <RouteIcon className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground/80">No saved routes</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] mx-auto">Plan a route and save it to access it quickly later</p>
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
  const band = route.distanceBand || getDistanceBand(route.distanceM);
  return (
    <Card className="hover-elevate" data-testid={`route-card-${route.id}`}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          band === "short" ? "bg-emerald-100 dark:bg-emerald-900/30" :
          band === "medium" ? "bg-amber-100 dark:bg-amber-900/30" :
          "bg-rose-100 dark:bg-rose-900/30"
        }`}>
          <Navigation className={`h-4 w-4 ${
            band === "short" ? "text-emerald-600" :
            band === "medium" ? "text-amber-600" :
            "text-rose-600"
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{route.name}</p>
            {route.isUsualRoute && <Star className="h-3 w-3 text-amber-500 shrink-0 fill-amber-500" />}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {(route.distanceM / 1000).toFixed(1)} km
            </span>
            <span className={`text-xs font-medium ${getBandTextColor(band)}`}>
              {getBandLabel(band)}
            </span>
            {route.attachToEmergency && (
              <span className="text-xs text-rose-500 flex items-center gap-0.5">
                <ShieldAlert className="h-3 w-3" /> Emergency
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
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
  const [repeatKey, setRepeatKey] = useState(0);

  const handleRepeat = (route: PlannedRoute) => {
    setRepeatRoute(route);
    setRepeatKey((k) => k + 1);
    setView("planner");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={view === "planner" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setView("planner")}
          data-testid="button-view-planner"
        >
          <Navigation className="h-4 w-4 mr-1.5" />
          Plan Route
        </Button>
        <Button
          variant={view === "saved" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setView("saved")}
          data-testid="button-view-saved"
        >
          <Save className="h-4 w-4 mr-1.5" />
          Saved
        </Button>
      </div>

      {view === "planner" ? (
        <RoutePlannerView key={repeatKey} initialRoute={repeatRoute} onClearRepeat={() => setRepeatRoute(null)} />
      ) : (
        <SavedRoutesList onRepeat={handleRepeat} />
      )}
    </div>
  );
}
