import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ShieldCheck, ArrowLeft, Activity, AlertTriangle, CheckCircle2, Clock,
  Users, BarChart3, FileText, Download, TrendingUp, TrendingDown,
  ChevronRight, MapPin, Loader2, Shield, Eye, Gavel
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";

interface AssuranceOverview {
  controlScore: number;
  slaCompliance: number;
  openHighRiskAlerts: number;
  totalClients: number;
  activeCheckIns7d: number;
  totalAlerts30d: number;
  resolvedAlerts30d: number;
  avgResponseTimeMinutes: number;
  auditIntegrity: boolean;
  auditEntriesChecked: number;
}

interface ClientRisk {
  clientId: string;
  nickname: string;
  referenceCode: string;
  riskLevel: "low" | "medium" | "high";
  lastCheckIn: string | null;
  activeAlerts: number;
  checkInsThisWeek: number;
}

interface HeatmapData {
  clients: ClientRisk[];
  summary: { high: number; medium: number; low: number };
}

interface ManagerInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  lastLogin: string | null;
  status: string;
  daysSinceLogin: number | null;
}

interface Incident {
  id: number;
  type: string;
  activatedAt: string;
  resolvedAt: string | null;
  isActive: boolean;
  location: string | null;
  responseTimeMinutes: number | null;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-600";
  const bgColor = score >= 80 ? "bg-green-100 dark:bg-green-900/30" : score >= 50 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30";

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-xl ${bgColor}`} data-testid={`gauge-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className={`text-5xl font-bold ${color}`}>{score}%</div>
      <div className="text-sm font-medium text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    high: "bg-red-600 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-green-600 text-white",
  };
  return (
    <Badge className={`${styles[level]} no-default-hover-elevate no-default-active-elevate`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </Badge>
  );
}

export default function AssuranceDashboard() {
  const [activeScreen, setActiveScreen] = useState("overview");

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<AssuranceOverview>({
    queryKey: ["/api/org/assurance/overview"],
    retry: false,
  });

  const { data: heatmap, isLoading: heatmapLoading } = useQuery<HeatmapData>({
    queryKey: ["/api/org/assurance/service-heatmap"],
    enabled: activeScreen === "heatmap" || activeScreen === "overview",
    retry: false,
  });

  const { data: managers, isLoading: managersLoading } = useQuery<{ managers: ManagerInfo[] }>({
    queryKey: ["/api/org/assurance/manager-oversight"],
    enabled: activeScreen === "oversight",
    retry: false,
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<{ incidents: Incident[] }>({
    queryKey: ["/api/org/assurance/incident-timeline"],
    enabled: activeScreen === "timeline" || activeScreen === "overview",
    retry: false,
  });

  const screens = [
    { id: "overview", label: "Live Position", icon: Activity },
    { id: "heatmap", label: "Service Risk", icon: BarChart3 },
    { id: "chronology", label: "Alert Drill-Down", icon: Clock },
    { id: "oversight", label: "Manager Oversight", icon: Users },
    { id: "timeline", label: "Incident Timeline", icon: AlertTriangle },
    { id: "export", label: "Board Report", icon: FileText },
  ];

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (overviewError) {
    const is403 = (overviewError as any)?.message?.includes("403") || (overviewError as any)?.message?.includes("permission");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold">{is403 ? "Access Restricted" : "Unable to Load Dashboard"}</h2>
            <p className="text-sm text-muted-foreground">
              {is403
                ? "You do not have permission to view the Assurance Dashboard. Please contact your organisation owner or admin to request access."
                : "Something went wrong loading the dashboard. Please try again."}
            </p>
            <Link href="/org/dashboard">
              <Button variant="outline" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/org/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-lg font-bold" data-testid="text-assurance-title">Assurance Dashboard</h1>
              <p className="text-xs text-muted-foreground">Operational Safeguarding Assurance</p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Shield className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        <div className="overflow-x-auto -mx-4 px-4">
          <Tabs value={activeScreen} onValueChange={setActiveScreen}>
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              {screens.map(s => (
                <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-1.5 whitespace-nowrap" data-testid={`tab-${s.id}`}>
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <ScoreGauge score={overview?.controlScore ?? 0} label="Control Effectiveness" />
                <ScoreGauge score={overview?.slaCompliance ?? 0} label="SLA Compliance" />
                <div className={`flex flex-col items-center justify-center p-6 rounded-xl ${(overview?.openHighRiskAlerts ?? 0) > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  <div className={`text-5xl font-bold ${(overview?.openHighRiskAlerts ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-open-alerts">
                    {overview?.openHighRiskAlerts ?? 0}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mt-2">Open High-Risk Alerts</div>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <div className="text-2xl font-bold" data-testid="text-total-clients">{overview?.totalClients ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Active Clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold" data-testid="text-checkins-7d">{overview?.activeCheckIns7d ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Check-ins (7 days)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold" data-testid="text-avg-response">{overview?.avgResponseTimeMinutes ?? 0}m</div>
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Shield className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <div className="flex items-center justify-center gap-1">
                      {overview?.auditIntegrity ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm font-bold" data-testid="text-audit-integrity">
                        {overview?.auditIntegrity ? "Verified" : "Alert"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Audit Chain ({overview?.auditEntriesChecked ?? 0} entries)</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What This Dashboard Shows</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>This is your live safeguarding position right now. Every metric is calculated from real operational data:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Control Effectiveness</strong> measures active monitoring, response times, audit integrity, and SLA compliance</li>
                    <li><strong>SLA Compliance</strong> tracks the percentage of alerts resolved within the required timeframe</li>
                    <li><strong>Audit Chain</strong> cryptographically verifies that no safeguarding records have been tampered with</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="heatmap" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Service Risk Heatmap
                  </CardTitle>
                  <CardDescription>Which services are at risk right now?</CardDescription>
                </CardHeader>
                <CardContent>
                  {heatmapLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <div className="text-2xl font-bold text-red-600" data-testid="text-high-risk">{heatmap?.summary.high ?? 0}</div>
                          <div className="text-xs text-muted-foreground">High Risk</div>
                        </div>
                        <div className="text-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                          <div className="text-2xl font-bold text-amber-600" data-testid="text-medium-risk">{heatmap?.summary.medium ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Medium Risk</div>
                        </div>
                        <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <div className="text-2xl font-bold text-green-600" data-testid="text-low-risk">{heatmap?.summary.low ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Low Risk</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {heatmap?.clients.map(client => (
                          <div key={client.clientId} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`client-risk-${client.clientId}`}>
                            <div>
                              <p className="font-medium">{client.nickname || client.referenceCode}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.lastCheckIn
                                  ? `Last check-in: ${formatDistanceToNow(new Date(client.lastCheckIn), { addSuffix: true })}`
                                  : "No recent check-ins"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{client.checkInsThisWeek} this week</span>
                              <RiskBadge level={client.riskLevel} />
                            </div>
                          </div>
                        ))}
                        {(heatmap?.clients.length ?? 0) === 0 && (
                          <p className="text-center text-muted-foreground py-4">No clients to display</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chronology" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Alert Chronology
                  </CardTitle>
                  <CardDescription>
                    Select an alert from the Incident Timeline tab to see the full escalation chronology: time, escalation, response, and outcome.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Select an incident to view the full chronology</p>
                    <p className="text-sm mt-1">Go to the Incident Timeline tab to pick an alert, then return here for the step-by-step escalation trail.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveScreen("timeline")} data-testid="button-go-timeline">
                      View Incident Timeline
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="oversight" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Manager Oversight
                  </CardTitle>
                  <CardDescription>How do leaders monitor practice?</CardDescription>
                </CardHeader>
                <CardContent>
                  {managersLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    <div className="space-y-3">
                      {managers?.managers.map(mgr => (
                        <div key={mgr.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`manager-${mgr.id}`}>
                          <div>
                            <p className="font-medium">{mgr.name}</p>
                            <p className="text-xs text-muted-foreground">{mgr.roleLabel}</p>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {mgr.lastLogin
                                  ? `Last active: ${formatDistanceToNow(new Date(mgr.lastLogin), { addSuffix: true })}`
                                  : "Never logged in"}
                              </p>
                              {mgr.daysSinceLogin !== null && mgr.daysSinceLogin > 7 && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Overdue review
                                </Badge>
                              )}
                            </div>
                            <Badge variant={mgr.status === "active" ? "default" : "secondary"}>
                              {mgr.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {(managers?.managers.length ?? 0) === 0 && (
                        <p className="text-center text-muted-foreground py-4">No managers or leads configured</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Incident Timeline (90 days)
                  </CardTitle>
                  <CardDescription>Serious incident defensibility evidence</CardDescription>
                </CardHeader>
                <CardContent>
                  {incidentsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    <div className="space-y-3">
                      {incidents?.incidents.map(incident => (
                        <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`incident-${incident.id}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${incident.isActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                            <div>
                              <p className="font-medium text-sm">
                                {incident.type === "emergency" ? "Emergency Alert" : incident.type === "missed_checkin" ? "Missed Check-in" : incident.type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(incident.activatedAt), "dd MMM yyyy HH:mm")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            {incident.responseTimeMinutes !== null && (
                              <span className="text-xs text-muted-foreground">
                                {incident.responseTimeMinutes}m response
                              </span>
                            )}
                            {incident.location && (
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <Badge variant={incident.isActive ? "destructive" : "secondary"} className="no-default-hover-elevate no-default-active-elevate">
                              {incident.isActive ? "Active" : "Resolved"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {(incidents?.incidents.length ?? 0) === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40 text-green-600" />
                          <p className="font-medium">No incidents in the last 90 days</p>
                          <p className="text-sm mt-1">This is positive evidence of safeguarding effectiveness.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Board Governance Report
                  </CardTitle>
                  <CardDescription>Generate a PDF report for your board, trustees, or commissioners</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="font-semibold">Report Contents</h3>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Control effectiveness score: <strong className="text-foreground">{overview?.controlScore ?? 0}%</strong></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> SLA compliance rate: <strong className="text-foreground">{overview?.slaCompliance ?? 0}%</strong></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Open high-risk alerts: <strong className="text-foreground">{overview?.openHighRiskAlerts ?? 0}</strong></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Active clients monitored: <strong className="text-foreground">{overview?.totalClients ?? 0}</strong></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Average response time: <strong className="text-foreground">{overview?.avgResponseTimeMinutes ?? 0} minutes</strong></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Audit chain integrity: <strong className="text-foreground">{overview?.auditIntegrity ? "Verified" : "Needs attention"}</strong></li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Service risk heatmap summary</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Manager oversight activity</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> 90-day incident timeline</li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        const reportData = {
                          generatedAt: new Date().toISOString(),
                          overview,
                          serviceRisk: heatmap?.summary,
                          incidents: incidents?.incidents?.length ?? 0,
                        };
                        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `aok-board-report-${format(new Date(), "yyyy-MM-dd")}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="button-export-json"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Board Report (JSON)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const lines = [
                          "AOK Safeguarding Assurance Board Report",
                          `Generated: ${format(new Date(), "dd MMMM yyyy HH:mm")}`,
                          "",
                          "EXECUTIVE SUMMARY",
                          `Control Effectiveness Score: ${overview?.controlScore ?? 0}%`,
                          `SLA Compliance: ${overview?.slaCompliance ?? 0}%`,
                          `Open High-Risk Alerts: ${overview?.openHighRiskAlerts ?? 0}`,
                          `Active Clients Monitored: ${overview?.totalClients ?? 0}`,
                          `Average Response Time: ${overview?.avgResponseTimeMinutes ?? 0} minutes`,
                          `Audit Chain Integrity: ${overview?.auditIntegrity ? "Verified" : "Needs Attention"}`,
                          `Audit Entries Verified: ${overview?.auditEntriesChecked ?? 0}`,
                          "",
                          "SERVICE RISK SUMMARY",
                          `High Risk: ${heatmap?.summary.high ?? 0}`,
                          `Medium Risk: ${heatmap?.summary.medium ?? 0}`,
                          `Low Risk: ${heatmap?.summary.low ?? 0}`,
                          "",
                          "INCIDENT SUMMARY (90 DAYS)",
                          `Total Incidents: ${incidents?.incidents?.length ?? 0}`,
                          `Active Incidents: ${incidents?.incidents?.filter(i => i.isActive).length ?? 0}`,
                          `Resolved Incidents: ${incidents?.incidents?.filter(i => !i.isActive).length ?? 0}`,
                          "",
                          "---",
                          "This report was generated by aok.care - Operational Safeguarding Assurance",
                          "ISO 27001-compliant infrastructure | Tamper-evident audit trails | UK GDPR compliant",
                        ];
                        const blob = new Blob([lines.join("\n")], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `aok-board-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="button-export-csv"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Summary (CSV)
                    </Button>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Gavel className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">Governance Evidence</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          This report provides evidence of governance oversight for Ofsted, CQC, and commissioner reviews.
                          All data is sourced from tamper-evident audit trails with cryptographic integrity verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
