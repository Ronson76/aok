import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Phone, User, MapPin, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  userName?: string;
  userEmail?: string;
  organizationName?: string;
}

interface ActiveSOSPanelProps {
  apiEndpoint: string;
  testIdPrefix: string;
}

export function ActiveSOSPanel({ apiEndpoint, testIdPrefix }: ActiveSOSPanelProps) {
  const { data, isLoading } = useQuery<ActiveSOSAlert[]>({
    queryKey: [apiEndpoint],
    refetchInterval: 15000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const hasAlerts = data && data.length > 0;

  return (
    <Card
      className={hasAlerts ? "border-destructive/50 bg-destructive/5" : ""}
      data-testid={`${testIdPrefix}-active-sos-panel`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className={`h-5 w-5 ${hasAlerts ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
          <span className={hasAlerts ? "text-destructive" : ""}>
            Active SOS Alerts
          </span>
          {hasAlerts && (
            <Badge variant="destructive" className="animate-pulse" data-testid={`${testIdPrefix}-sos-count`}>
              {data.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" data-testid={`${testIdPrefix}-sos-loading`}>
            {[1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
            ))}
          </div>
        ) : !hasAlerts ? (
          <div className="flex items-center gap-3 py-4 text-muted-foreground" data-testid={`${testIdPrefix}-sos-empty`}>
            <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">No active SOS alerts right now. This updates automatically every 15 seconds.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid={`${testIdPrefix}-sos-list`}>
            {data.map((alert) => (
              <div
                key={alert.alertId}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                data-testid={`${testIdPrefix}-sos-alert-${alert.alertId}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium" data-testid={`${testIdPrefix}-sos-name-${alert.alertId}`}>
                        {alert.nickname || alert.clientName || alert.userName || "Unknown"}
                      </span>
                      <Badge variant="destructive" className="animate-pulse">
                        SOS
                      </Badge>
                    </div>

                    {alert.referenceCode && (
                      <p className="text-xs text-muted-foreground" data-testid={`${testIdPrefix}-sos-ref-${alert.alertId}`}>
                        Ref: {alert.referenceCode}
                      </p>
                    )}

                    {alert.organizationName && (
                      <p className="text-xs text-muted-foreground italic">
                        {alert.organizationName}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {alert.clientPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span data-testid={`${testIdPrefix}-sos-phone-${alert.alertId}`}>{alert.clientPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span data-testid={`${testIdPrefix}-sos-time-${alert.alertId}`}>
                          {formatDistanceToNow(new Date(alert.activatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {(alert.latitude || alert.longitude) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span data-testid={`${testIdPrefix}-sos-coords-${alert.alertId}`}>
                            {Number(alert.latitude).toFixed(5)}, {Number(alert.longitude).toFixed(5)}
                          </span>
                        </div>
                        {alert.what3words && (
                          <a
                            href={`https://what3words.com/${alert.what3words}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline text-xs"
                            data-testid={`${testIdPrefix}-sos-w3w-${alert.alertId}`}
                          >
                            ///{alert.what3words}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
