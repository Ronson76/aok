import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Radio, MapPin, Clock, AlertTriangle, CheckCircle,
  Loader2, Siren, Users, ArrowLeft, Eye
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import type { LoneWorkerSession } from "@shared/schema";

type SessionWithUser = LoneWorkerSession & { userName: string; userPhone: string | null };

const JOB_LABELS: Record<string, string> = {
  visit: "Home Visit",
  inspection: "Site Inspection",
  outreach: "Outreach",
  delivery: "Delivery",
  patrol: "Patrol",
  maintenance: "Maintenance",
  other: "Other",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return <Badge className="bg-green-600 text-white">Active</Badge>;
    case "check_in_due": return <Badge className="bg-yellow-600 text-white">Check-in Due</Badge>;
    case "unresponsive": return <Badge className="bg-orange-600 text-white">Unresponsive</Badge>;
    case "panic": return <Badge className="bg-red-600 text-white animate-pulse">PANIC</Badge>;
    case "resolved": return <Badge>Resolved</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function statusPriority(status: string): number {
  switch (status) {
    case "panic": return 0;
    case "unresponsive": return 1;
    case "check_in_due": return 2;
    case "active": return 3;
    default: return 4;
  }
}

export default function OrgLoneWorkerMonitor() {
  const { user } = useAuth();

  const activeQuery = useQuery<SessionWithUser[]>({
    queryKey: ["/api/org/lone-worker/active"],
    refetchInterval: 10000,
  });

  const historyQuery = useQuery<(LoneWorkerSession & { userName: string })[]>({
    queryKey: ["/api/org/lone-worker/history"],
  });

  const sessions = (activeQuery.data || []).sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
  const panicCount = sessions.filter(s => s.status === "panic").length;
  const unresponsiveCount = sessions.filter(s => s.status === "unresponsive").length;
  const activeCount = sessions.filter(s => s.status === "active" || s.status === "check_in_due").length;

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/org/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> Lone Worker Monitor</h1>
            <p className="text-sm text-muted-foreground">Real-time monitoring of staff on active shifts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-600" data-testid="text-active-count">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className={unresponsiveCount > 0 ? "border-orange-500" : ""}>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-orange-500" data-testid="text-unresponsive-count">{unresponsiveCount}</p>
            <p className="text-xs text-muted-foreground">Unresponsive</p>
          </CardContent>
        </Card>
        <Card className={panicCount > 0 ? "border-red-600 border-2" : ""}>
          <CardContent className="py-3 text-center">
            <p className={`text-2xl font-bold ${panicCount > 0 ? "text-red-600 animate-pulse" : "text-red-600"}`} data-testid="text-panic-count">{panicCount}</p>
            <p className="text-xs text-muted-foreground">PANIC</p>
          </CardContent>
        </Card>
      </div>

      {activeQuery.isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No active lone worker sessions</p>
            <p className="text-sm text-muted-foreground">Staff sessions will appear here when they start a shift</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Active Sessions ({sessions.length})</h2>
          {sessions.map((s) => (
            <Card
              key={s.id}
              data-testid={`card-session-${s.id}`}
              className={s.status === "panic" ? "border-red-600 border-2" : s.status === "unresponsive" ? "border-orange-500 border-2" : ""}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <p className="font-medium" data-testid={`text-user-${s.id}`}>{s.userName}</p>
                    <p className="text-sm text-muted-foreground">{JOB_LABELS[s.jobType] || s.jobType}</p>
                    {s.jobDescription && <p className="text-xs text-muted-foreground mt-1">{s.jobDescription}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(s.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Started: {s.startedAt ? format(new Date(s.startedAt), "HH:mm") : "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    Check-in: {s.checkInIntervalMins}m
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Last: {s.lastCheckInAt ? formatDistanceToNow(new Date(s.lastCheckInAt), { addSuffix: true }) : "—"}
                  </div>
                  {s.userPhone && (
                    <div className="flex items-center gap-1">
                      <a href={`tel:${s.userPhone}`} className="text-primary underline">{s.userPhone}</a>
                    </div>
                  )}
                </div>

                {s.status === "panic" && s.panicTriggeredAt && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <Siren className="w-4 h-4" />
                    Panic triggered {formatDistanceToNow(new Date(s.panicTriggeredAt), { addSuffix: true })}
                    {s.lastLocationLat && s.lastLocationLng && (
                      <a
                        href={`https://maps.google.com/?q=${s.lastLocationLat},${s.lastLocationLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto underline flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" /> View Location
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {historyQuery.data && historyQuery.data.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent History</h2>
          {historyQuery.data.filter((s: any) => s.status === "resolved").slice(0, 10).map((s: any) => (
            <Card key={s.id} className="opacity-75">
              <CardContent className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium">{s.userName}</p>
                    <p className="text-xs text-muted-foreground">{JOB_LABELS[s.jobType] || s.jobType}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{s.resolvedAt ? format(new Date(s.resolvedAt), "dd/MM/yyyy HH:mm") : "—"}</p>
                    {s.outcome && <p>{s.outcome.replace(/_/g, " ")}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}