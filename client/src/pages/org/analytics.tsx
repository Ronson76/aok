import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { OrgHelpButton } from "@/components/org-help-center";
import { ArrowLeft, BarChart3, MapPin, AlertTriangle, Clock, Phone, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import "leaflet/dist/leaflet.css";

interface PeakTimesData {
  alertsByHour: { hour: number; count: number }[];
  alertsByDay: { day: string; count: number }[];
  missedByHour: { hour: number; count: number }[];
  missedByDay: { day: string; count: number }[];
}

interface HeatmapData {
  points: { lat: number; lng: number; count: number; what3words?: string }[];
}

interface ActiveSOSAlert {
  alertId: string;
  clientName: string;
  clientPhone: string;
  referenceCode: string;
  activatedAt: string;
  latitude: number;
  longitude: number;
  what3words: string;
  nickname: string;
}

function AlertHeatmap({ points }: { points: HeatmapData["points"] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default || mod;

      if (!mapInstance.current) {
        const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false });
        mapInstance.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        map.setView([52.48, -1.89], 12);
      }

      const map = mapInstance.current;

      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      if (points.length > 0) {
        points.forEach((point) => {
          const radius = Math.max(8, Math.min(30, point.count * 5));
          const marker = L.circleMarker([point.lat, point.lng], {
            radius,
            fillColor: "#ef4444",
            color: "#dc2626",
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.6,
          }).addTo(map);

          let popupContent = `<div style="font-size:13px;font-weight:600">${point.count} alert${point.count !== 1 ? "s" : ""}</div>`;
          if (point.what3words) {
            popupContent += `<div style="font-size:11px;color:#666;margin-top:4px">${point.what3words}</div>`;
          }
          marker.bindPopup(popupContent);
          markersRef.current.push(marker);
        });

        const lats = points.map((p) => p.lat);
        const lngs = points.map((p) => p.lng);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
          [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
        ];
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [points]);

  return (
    <div
      ref={mapRef}
      className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-border"
      data-testid="alert-heatmap"
    />
  );
}

function PeakTimesSection() {
  const { data, isLoading } = useQuery<PeakTimesData>({
    queryKey: ["/api/org/analytics/peak-times"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="peak-times-loading">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const alertHourData = data.alertsByHour.map((d) => ({
    name: String(d.hour),
    count: d.count,
  }));

  const alertDayData = data.alertsByDay.map((d) => ({
    name: d.day,
    count: d.count,
  }));

  const missedHourData = data.missedByHour.map((d) => ({
    name: String(d.hour),
    count: d.count,
  }));

  const missedDayData = data.missedByDay.map((d) => ({
    name: d.day,
    count: d.count,
  }));

  return (
    <div className="space-y-6" data-testid="peak-times-section">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-alerts-by-hour">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Emergency Alerts by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={alertHourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  formatter={(value: number) => [`${value} alerts`, "Count"]}
                />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-alerts-by-day">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Emergency Alerts by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={alertDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  formatter={(value: number) => [`${value} alerts`, "Count"]}
                />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-missed-by-hour">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Missed Check-ins by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={missedHourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  formatter={(value: number) => [`${value} missed`, "Count"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-missed-by-day">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Missed Check-ins by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={missedDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  formatter={(value: number) => [`${value} missed`, "Count"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HeatmapSection() {
  const { data, isLoading } = useQuery<HeatmapData>({
    queryKey: ["/api/org/analytics/alert-heatmap"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <Card data-testid="heatmap-loading">
        <CardContent className="pt-6">
          <Skeleton className="h-80 sm:h-96 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <Card data-testid="heatmap-empty">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MapPin className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No alert location data available</p>
            <p className="text-xs mt-1">Alert locations will appear here when emergency alerts are triggered</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="heatmap-section">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Emergency Alert Locations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AlertHeatmap points={data.points} />
      </CardContent>
    </Card>
  );
}

function ActiveSOSSection() {
  const { data, isLoading } = useQuery<ActiveSOSAlert[]>({
    queryKey: ["/api/org/alerts/active-sos"],
    refetchInterval: 15000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="active-sos-loading">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="active-sos-empty">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-3 text-primary" />
            <p className="text-sm font-medium">No active SOS alerts</p>
            <p className="text-xs mt-1">All clients are currently safe. Active alerts will appear here if triggered.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="active-sos-section">
      {data.map((alert) => (
        <Card key={alert.alertId} data-testid={`card-sos-alert-${alert.alertId}`}>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium" data-testid={`text-sos-client-${alert.alertId}`}>
                    {alert.nickname || alert.clientName}
                  </span>
                  <Badge
                    variant="destructive"
                    className="animate-pulse"
                    data-testid={`badge-sos-active-${alert.alertId}`}
                  >
                    Active
                  </Badge>
                </div>

                {alert.referenceCode && (
                  <div className="text-xs text-muted-foreground" data-testid={`text-sos-ref-${alert.alertId}`}>
                    Ref: {alert.referenceCode}
                  </div>
                )}

                {alert.clientPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span data-testid={`text-sos-phone-${alert.alertId}`}>{alert.clientPhone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span data-testid={`text-sos-time-${alert.alertId}`}>
                    {formatDistanceToNow(new Date(alert.activatedAt), { addSuffix: true })}
                  </span>
                </div>

                {(alert.latitude || alert.longitude) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span data-testid={`text-sos-coords-${alert.alertId}`}>
                      {Number(alert.latitude).toFixed(5)}, {Number(alert.longitude).toFixed(5)}
                    </span>
                  </div>
                )}

                {alert.what3words && (
                  <div className="text-sm">
                    <a
                      href={`https://what3words.com/${alert.what3words}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline text-xs"
                      data-testid={`link-sos-w3w-${alert.alertId}`}
                    >
                      ///{alert.what3words}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OrgAnalyticsPage() {
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("peak-times");

  useEffect(() => {
    if (authUser && (!authUser.orgFeatureDashboard || (authUser.orgFeatureDashboardExpiresAt && new Date(authUser.orgFeatureDashboardExpiresAt) < new Date()))) {
      setLocation("/org/dashboard");
    }
  }, [authUser, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/org/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold" data-testid="text-page-title">Analytics</h1>
            </div>
          </div>
          <OrgHelpButton />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="analytics-tabs">
          <TabsList className="w-full sm:w-auto" data-testid="analytics-tabs-list">
            <TabsTrigger value="peak-times" data-testid="tab-peak-times">Peak Times</TabsTrigger>
            <TabsTrigger value="alert-heatmap" data-testid="tab-alert-heatmap">Alert Heatmap</TabsTrigger>
            <TabsTrigger value="active-sos" data-testid="tab-active-sos">Active SOS Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="peak-times" className="mt-4">
            <PeakTimesSection />
          </TabsContent>

          <TabsContent value="alert-heatmap" className="mt-4">
            <HeatmapSection />
          </TabsContent>

          <TabsContent value="active-sos" className="mt-4">
            <ActiveSOSSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}