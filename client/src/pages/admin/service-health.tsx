import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Activity, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface ServiceInfo {
  name: string;
  healthy: boolean;
  circuitOpen: boolean;
  consecutiveFailures: number;
  totalSuccesses: number;
  totalFailures: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastError: string | null;
}

interface ServiceHealthResponse {
  overall: "healthy" | "warning" | "degraded";
  summary: {
    healthy: number;
    degraded: number;
    down: number;
    total: number;
  };
  services: ServiceInfo[];
  timestamp: string;
}

const SERVICE_LABELS: Record<string, { label: string; category: string }> = {
  resend: { label: "Resend", category: "Email" },
  sendgrid: { label: "SendGrid", category: "Email" },
  gmail: { label: "Gmail", category: "Email" },
  outlook: { label: "Outlook", category: "Email" },
  twilio_sms: { label: "Twilio SMS", category: "Messaging" },
  twilio_voice: { label: "Twilio Voice", category: "Messaging" },
  openai: { label: "OpenAI", category: "AI" },
  stripe: { label: "Stripe", category: "Payments" },
  ecologi: { label: "Ecologi", category: "Environmental" },
  osrm: { label: "OSRM Routing", category: "Mapping" },
  open_meteo: { label: "Open-Meteo", category: "Weather" },
  what3words: { label: "what3words", category: "Location" },
};

function getStatusIcon(service: ServiceInfo) {
  if (service.circuitOpen) return <XCircle className="h-5 w-5 text-destructive" />;
  if (!service.healthy) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  if (service.totalSuccesses > 0) return <CheckCircle className="h-5 w-5 text-green-500" />;
  return <Activity className="h-5 w-5 text-muted-foreground" />;
}

function getStatusBadge(service: ServiceInfo) {
  if (service.circuitOpen) return <Badge variant="destructive" data-testid={`badge-status-${service.name}`}>Down</Badge>;
  if (!service.healthy) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-status-${service.name}`}>Degraded</Badge>;
  if (service.totalSuccesses > 0) return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`badge-status-${service.name}`}>Healthy</Badge>;
  return <Badge variant="outline" data-testid={`badge-status-${service.name}`}>No Data</Badge>;
}

export default function ServiceHealth() {
  const [, setLocation] = useLocation();

  const { data, isLoading, refetch, isFetching } = useQuery<ServiceHealthResponse>({
    queryKey: ["/api/admin/service-health"],
    refetchInterval: 30000,
  });

  const categories = data ? Array.from(new Set(data.services.map(s => SERVICE_LABELS[s.name]?.category || "Other"))) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")} data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-page-title">Service Health Monitor</h1>
                <p className="text-sm text-muted-foreground">External service status and resilience</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {data && (
                <Badge 
                  variant={data.overall === "healthy" ? "secondary" : "destructive"}
                  className={data.overall === "healthy" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                  data-testid="badge-overall-status"
                >
                  {data.overall === "healthy" ? "All Systems Operational" : data.overall === "warning" ? "Some Issues Detected" : "Service Degradation"}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-health">
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600" data-testid="text-healthy-count">{data.summary.healthy}</div>
                    <p className="text-sm text-muted-foreground">Healthy</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600" data-testid="text-degraded-count">{data.summary.degraded}</div>
                    <p className="text-sm text-muted-foreground">Degraded</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-destructive" data-testid="text-down-count">{data.summary.down}</div>
                    <p className="text-sm text-muted-foreground">Down</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold" data-testid="text-total-count">{data.summary.total}</div>
                    <p className="text-sm text-muted-foreground">Total Services</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {categories.map(category => {
              const categoryServices = data.services.filter(s => (SERVICE_LABELS[s.name]?.category || "Other") === category);
              return (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-3" data-testid={`text-category-${category.toLowerCase()}`}>{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryServices.map(service => (
                      <Card key={service.name} data-testid={`card-service-${service.name}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(service)}
                              <CardTitle className="text-base">{SERVICE_LABELS[service.name]?.label || service.name}</CardTitle>
                            </div>
                            {getStatusBadge(service)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Successes</span>
                            <span className="font-medium text-green-600" data-testid={`text-successes-${service.name}`}>{service.totalSuccesses}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Failures</span>
                            <span className="font-medium text-destructive" data-testid={`text-failures-${service.name}`}>{service.totalFailures}</span>
                          </div>
                          {service.consecutiveFailures > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Consecutive Failures</span>
                              <span className="font-medium text-destructive">{service.consecutiveFailures}</span>
                            </div>
                          )}
                          {service.lastSuccess && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Last Success</span>
                              <span className="text-xs">{format(new Date(service.lastSuccess), "dd/MM HH:mm:ss")}</span>
                            </div>
                          )}
                          {service.lastFailure && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Last Failure</span>
                              <span className="text-xs text-destructive">{format(new Date(service.lastFailure), "dd/MM HH:mm:ss")}</span>
                            </div>
                          )}
                          {service.lastError && (
                            <CardDescription className="text-xs mt-2 p-2 bg-muted rounded-md break-words" data-testid={`text-error-${service.name}`}>
                              {service.lastError.substring(0, 120)}{service.lastError.length > 120 ? "..." : ""}
                            </CardDescription>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground text-center" data-testid="text-last-updated">
              Last updated: {format(new Date(data.timestamp), "dd/MM/yyyy HH:mm:ss")}
            </p>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Unable to load service health data</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
