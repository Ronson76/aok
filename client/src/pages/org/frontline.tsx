import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Home, Users, Zap, Clock, BarChart3, ArrowLeft, Search,
  Heart, MessageSquare, Shield, Pill, TrendingUp, Building,
  Phone, UserCheck, AlertTriangle, CheckCircle, CircleDot,
  ChevronRight, Download, AlertOctagon, Activity, User,
  Loader2, X, MapPin, FileText, HandHeart, Users2, Siren,
  ClipboardList
} from "lucide-react";
import type { FrontlineCategory } from "@shared/schema";

const CATEGORY_CONFIG: Record<FrontlineCategory, { label: string; icon: any; color: string }> = {
  wellbeing_check: { label: "Wellbeing Check", icon: Heart, color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
  support_conversation: { label: "Support Conversation", icon: MessageSquare, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
  safeguarding_concern: { label: "Safeguarding Concern", icon: Shield, color: "text-red-600 bg-red-50 dark:bg-red-900/30" },
  medication: { label: "Medication", icon: Pill, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30" },
  move_on_planning: { label: "Move-on Planning", icon: TrendingUp, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
  housing_support: { label: "Housing Support", icon: Building, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30" },
  general_contact: { label: "General Contact", icon: Phone, color: "text-gray-600 bg-gray-50 dark:bg-gray-900/30" },
  key_worker_session: { label: "Key Worker Session", icon: UserCheck, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
  crisis_intervention: { label: "Crisis Intervention", icon: Siren, color: "text-red-700 bg-red-100 dark:bg-red-900/40" },
  group_activity: { label: "Group Activity", icon: Users2, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
};

const STATUS_COLORS = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "No contact";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OrgFrontline() {
  useInactivityLogout();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [quickLogClient, setQuickLogClient] = useState<any>(null);
  const [quickLogNotes, setQuickLogNotes] = useState("");
  const [quickLogCategory, setQuickLogCategory] = useState<FrontlineCategory | null>(null);

  const orgMemberQuery = useQuery<any>({
    queryKey: ["/api/org-member/me"],
  });

  const orgMember = orgMemberQuery.data;
  const isManager = orgMember && ["owner", "admin", "safeguarding_lead", "service_manager", "manager"].includes(orgMember.role);

  const dashboardQuery = useQuery<any>({
    queryKey: ["/api/org-member/frontline/dashboard"],
    enabled: activeTab === "home",
  });

  const signalsQuery = useQuery<any[]>({
    queryKey: ["/api/org-member/frontline/signals", "active"],
    queryFn: () => apiRequest("GET", "/api/org-member/frontline/signals?status=active").then(r => r.json()),
    enabled: activeTab === "home",
    refetchInterval: 15000,
  });

  const clientsQuery = useQuery<any[]>({
    queryKey: ["/api/org-member/frontline/clients"],
    enabled: activeTab === "residents" || activeTab === "quicklog",
  });

  const timelineQuery = useQuery<any[]>({
    queryKey: ["/api/org-member/frontline/timeline", selectedClient?.id],
    queryFn: () => apiRequest("GET", `/api/org-member/frontline/timeline/${selectedClient.id}`).then(r => r.json()),
    enabled: !!selectedClient,
  });

  const managerQuery = useQuery<any>({
    queryKey: ["/api/org-member/frontline/manager-stats"],
    enabled: activeTab === "manager" && !!isManager,
  });

  const respondSignalMutation = useMutation({
    mutationFn: async (signalId: string) => {
      const res = await apiRequest("POST", `/api/org-member/frontline/signals/${signalId}/respond`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Responding", description: "You've acknowledged the signal" });
      queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/dashboard"] });
    },
  });

  const resolveSignalMutation = useMutation({
    mutationFn: async ({ signalId, notes }: { signalId: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/org-member/frontline/signals/${signalId}/resolve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Resolved", description: "Signal has been resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/dashboard"] });
    },
  });

  const quickLogMutation = useMutation({
    mutationFn: async (data: { orgClientId: string; category: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/org-member/frontline/quick-log", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Logged", description: "Interaction recorded successfully" });
      setQuickLogCategory(null);
      setQuickLogNotes("");
      setQuickLogClient(null);
      queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/dashboard"] });
      if (selectedClient) {
        queryClient.invalidateQueries({ queryKey: ["/api/org-member/frontline/timeline", selectedClient.id] });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log interaction", variant: "destructive" });
    },
  });

  const handleQuickLog = () => {
    if (!quickLogClient || !quickLogCategory) return;
    quickLogMutation.mutate({
      orgClientId: quickLogClient.id,
      category: quickLogCategory,
      notes: quickLogNotes || undefined,
    });
  };

  const filteredClients = useMemo(() => {
    if (!clientsQuery.data) return [];
    if (!searchTerm) return clientsQuery.data;
    const term = searchTerm.toLowerCase();
    return clientsQuery.data.filter((c: any) =>
      c.clientName?.toLowerCase().includes(term) || c.referenceCode?.toLowerCase().includes(term)
    );
  }, [clientsQuery.data, searchTerm]);

  return (
    <div className="min-h-screen bg-background" data-testid="frontline-page">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/org/dashboard")} data-testid="button-back-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-primary" />
                Frontline Support
              </h1>
              <p className="text-xs text-muted-foreground">Quick logging and resident support tracking</p>
            </div>
          </div>
          {orgMember && (
            <Badge variant="outline" className="text-xs" data-testid="badge-staff-name">
              {orgMember.name}
            </Badge>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-5 mb-4" data-testid="frontline-tabs">
            <TabsTrigger value="home" className="text-xs sm:text-sm" data-testid="tab-home">
              <Home className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Home</span>
            </TabsTrigger>
            <TabsTrigger value="residents" className="text-xs sm:text-sm" data-testid="tab-residents">
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Residents</span>
            </TabsTrigger>
            <TabsTrigger value="quicklog" className="text-xs sm:text-sm" data-testid="tab-quicklog">
              <Zap className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Quick Log</span>
            </TabsTrigger>
            {selectedClient && (
              <TabsTrigger value="timeline" className="text-xs sm:text-sm" data-testid="tab-timeline">
                <Clock className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="manager" className="text-xs sm:text-sm" data-testid="tab-manager">
                <BarChart3 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Manager</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="home">
            <HomeTab
              data={dashboardQuery.data}
              isLoading={dashboardQuery.isLoading}
              signals={signalsQuery.data || []}
              onSelectClient={(client: any) => {
                setSelectedClient(client);
                setActiveTab("timeline");
              }}
              onQuickLog={(client: any) => {
                setQuickLogClient(client);
                setActiveTab("quicklog");
              }}
              onRespondSignal={(id: string) => respondSignalMutation.mutate(id)}
              onResolveSignal={(id: string) => resolveSignalMutation.mutate({ signalId: id })}
            />
          </TabsContent>

          <TabsContent value="residents">
            <ResidentsTab
              clients={filteredClients}
              isLoading={clientsQuery.isLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelectClient={(client: any) => {
                setSelectedClient(client);
                setActiveTab("timeline");
              }}
              onQuickLog={(client: any) => {
                setQuickLogClient(client);
                setActiveTab("quicklog");
              }}
            />
          </TabsContent>

          <TabsContent value="quicklog">
            <QuickLogTab
              clients={filteredClients}
              isLoading={clientsQuery.isLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedClient={quickLogClient}
              onSelectClient={setQuickLogClient}
              selectedCategory={quickLogCategory}
              onSelectCategory={setQuickLogCategory}
              notes={quickLogNotes}
              onNotesChange={setQuickLogNotes}
              onSubmit={handleQuickLog}
              isPending={quickLogMutation.isPending}
            />
          </TabsContent>

          {selectedClient && (
            <TabsContent value="timeline">
              <TimelineTab
                client={selectedClient}
                timeline={timelineQuery.data || []}
                isLoading={timelineQuery.isLoading}
                onBack={() => {
                  setSelectedClient(null);
                  setActiveTab("residents");
                }}
                onQuickLog={() => {
                  setQuickLogClient(selectedClient);
                  setActiveTab("quicklog");
                }}
              />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="manager">
              <ManagerTab data={managerQuery.data} isLoading={managerQuery.isLoading} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function HomeTab({ data, isLoading, signals, onSelectClient, onQuickLog, onRespondSignal, onResolveSignal }: any) {
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message="No dashboard data available" />;

  const SIGNAL_LABELS: Record<string, { label: string; color: string }> = {
    need_support: { label: "Needs Support", color: "border-amber-400 bg-amber-50 dark:bg-amber-900/20" },
    urgent_help: { label: "URGENT HELP", color: "border-red-400 bg-red-50 dark:bg-red-900/20" },
  };

  return (
    <div className="space-y-6">
      {signals && signals.length > 0 && (
        <Card className="border-2 border-red-400 shadow-lg animate-in fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
              <Siren className="h-5 w-5 animate-pulse" />
              Active Support Signals ({signals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signals.map((signal: any) => {
                const config = SIGNAL_LABELS[signal.level] || SIGNAL_LABELS.need_support;
                return (
                  <div key={signal.id} className={`p-3 rounded-lg border ${config.color}`} data-testid={`signal-alert-${signal.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={signal.level === "urgent_help" ? "destructive" : "secondary"} className="text-xs">
                            {config.label}
                          </Badge>
                          {signal.escalationLevel > 0 && (
                            <Badge variant="outline" className="text-xs border-red-300">Escalation {signal.escalationLevel}</Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm">{signal.clientName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {signal.referenceCode} · {formatTime(signal.createdAt)}
                          {signal.preferStaffVisit && " · Prefers staff visit"}
                          {signal.requestLaterCheckin && " · Requests later check-in"}
                        </p>
                        {signal.notes && <p className="text-xs mt-1 italic">"{signal.notes}"</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="default" onClick={() => onRespondSignal(signal.id)} data-testid={`button-respond-signal-${signal.id}`}>
                          Responding
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onResolveSignal(signal.id)} data-testid={`button-resolve-signal-${signal.id}`}>
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Zap} label="Today" value={data.stats.todayInteractions} color="text-blue-600" />
        <StatCard icon={Activity} label="This Week" value={data.stats.weekInteractions} color="text-green-600" />
        <StatCard icon={AlertTriangle} label="Open Concerns" value={data.stats.openConcerns} color="text-red-600" />
        <StatCard icon={Users} label="Total Residents" value={data.stats.totalClients} color="text-purple-600" />
      </div>

      {data.needsContact?.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertOctagon className="h-4 w-4" />
              Needs Contact (No interaction in 7+ days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.needsContact.map((client: any) => (
                <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20" data-testid={`needs-contact-${client.id}`}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">{client.clientName || "Unknown"}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onQuickLog(client)} data-testid={`button-quicklog-${client.id}`}>
                    <Zap className="h-3 w-3 mr-1" /> Log
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.overdueFollowups?.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
              <Clock className="h-4 w-4" />
              Overdue Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.overdueFollowups.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20" data-testid={`overdue-${f.id}`}>
                  <div>
                    <span className="text-sm font-medium">{f.clientName || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground ml-2">Due: {f.followUpDate}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.recentActivity?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentActivity.map((a: any) => {
                const config = CATEGORY_CONFIG[a.category as FrontlineCategory];
                const Icon = config?.icon || CircleDot;
                return (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50" data-testid={`activity-${a.id}`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${config?.color || "bg-gray-100"}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{config?.label || a.category}</span>
                        <span className="text-xs text-muted-foreground ml-2">- {a.clientName}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(a.createdAt)} {a.staffName}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResidentsTab({ clients, isLoading, searchTerm, onSearchChange, onSelectClient, onQuickLog }: any) {
  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or reference..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          data-testid="input-search-residents"
        />
      </div>

      {clients.length === 0 ? (
        <EmptyState message="No residents found" />
      ) : (
        <div className="space-y-2">
          {clients.map((client: any) => (
            <Card key={client.id} className="hover:border-primary/50 transition-colors cursor-pointer" data-testid={`resident-card-${client.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onSelectClient(client)}>
                    <div className={`h-3 w-3 rounded-full flex-shrink-0 ${STATUS_COLORS[client.engagementStatus as keyof typeof STATUS_COLORS]}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{client.clientName || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{client.referenceCode}</span>
                        <span>·</span>
                        <span>{timeAgo(client.lastContact)}</span>
                        {client.openConcerns > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">{client.openConcerns} concern{client.openConcerns > 1 ? "s" : ""}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onQuickLog(client)} data-testid={`button-quicklog-resident-${client.id}`}>
                      <Zap className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" onClick={() => onSelectClient(client)} />
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

function QuickLogTab({ clients, isLoading, searchTerm, onSearchChange, selectedClient, onSelectClient, selectedCategory, onSelectCategory, notes, onNotesChange, onSubmit, isPending }: any) {
  if (!selectedClient) {
    return (
      <div className="space-y-4">
        <Card className="border-primary/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-semibold text-sm">Quick Interaction Log</p>
            <p className="text-xs text-muted-foreground">Select a resident to begin logging</p>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resident..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search-quicklog"
          />
        </div>

        {isLoading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(clients || []).map((client: any) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelectClient(client)}
                data-testid={`quicklog-select-${client.id}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[client.engagementStatus as keyof typeof STATUS_COLORS]}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{client.clientName || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{client.referenceCode} · {timeAgo(client.lastContact)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">{selectedClient.clientName || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{selectedClient.referenceCode}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { onSelectClient(null); onSelectCategory(null); }} data-testid="button-change-client">
            <X className="h-4 w-4 mr-1" /> Change
          </Button>
        </CardContent>
      </Card>

      {!selectedCategory ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Tap to log interaction:</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(CATEGORY_CONFIG) as [FrontlineCategory, typeof CATEGORY_CONFIG[FrontlineCategory]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  className={`p-3 rounded-xl border-2 border-transparent hover:border-primary/30 transition-all text-left ${config.color}`}
                  onClick={() => onSelectCategory(key)}
                  data-testid={`category-${key}`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <p className="text-sm font-medium">{config.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className={`${CATEGORY_CONFIG[selectedCategory]?.color || ""}`}>
            <CardContent className="p-3 flex items-center justify-between">
              {(() => {
                const config = CATEGORY_CONFIG[selectedCategory];
                const Icon = config?.icon || CircleDot;
                return (
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold text-sm">{config?.label}</span>
                  </div>
                );
              })()}
              <Button variant="ghost" size="sm" onClick={() => onSelectCategory(null)} data-testid="button-change-category">
                Change
              </Button>
            </CardContent>
          </Card>

          <div>
            <Textarea
              placeholder="Notes (optional) — add context if needed"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-quicklog-notes"
            />
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={onSubmit}
            disabled={isPending}
            data-testid="button-submit-quicklog"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Log Interaction
          </Button>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ client, timeline, isLoading, onBack, onQuickLog }: any) {
  const groupedTimeline = useMemo(() => {
    const groups: Record<string, any[]> = {};
    timeline.forEach((item: any) => {
      const dateKey = formatDate(item.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return Object.entries(groups);
  }, [timeline]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-timeline-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="font-semibold">{client.clientName || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{client.referenceCode}</p>
          </div>
        </div>
        <Button size="sm" onClick={onQuickLog} data-testid="button-timeline-quicklog">
          <Zap className="h-4 w-4 mr-1" /> Log
        </Button>
      </div>

      {isLoading ? <LoadingState /> : timeline.length === 0 ? (
        <EmptyState message="No interactions recorded yet" />
      ) : (
        <div className="space-y-6">
          {groupedTimeline.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">{dateLabel}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((item: any) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ item }: { item: any }) {
  const typeConfig: Record<string, { label: string; icon: any; bgColor: string }> = {
    quick_log: { label: "Quick Log", icon: Zap, bgColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    data_capture: { label: "Data Capture", icon: ClipboardList, bgColor: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
    safeguarding: { label: "Safeguarding", icon: Shield, bgColor: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
    kiosk_checkin: { label: "Kiosk Check-in", icon: CheckCircle, bgColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
    support_signal: { label: "Support Signal", icon: Heart, bgColor: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  };

  const config = typeConfig[item.type] || typeConfig.quick_log;
  const Icon = config.icon;

  const categoryConfig = item.type === "quick_log" ? CATEGORY_CONFIG[item.category as FrontlineCategory] : null;
  const CategoryIcon = categoryConfig?.icon;

  return (
    <Card className="overflow-hidden" data-testid={`timeline-item-${item.id}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${config.bgColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {item.type === "quick_log" ? (categoryConfig?.label || item.category) :
                   item.type === "data_capture" ? `${item.category || "Interaction"} (${item.riskTier || "N/A"} risk)` :
                   item.type === "safeguarding" ? `${item.category || "Concern"} — ${item.status}` :
                   item.type === "support_signal" ? `Support Signal: ${item.category === "urgent_help" ? "Urgent Help" : item.category === "need_support" ? "Needs Support" : "I'm OK"}${item.respondedByName ? ` — responded by ${item.respondedByName}` : ""}` :
                   "Kiosk Check-in"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(item.timestamp)}</span>
            </div>
            {(item.notes || item.description) && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.notes || item.description}</p>
            )}
            {item.staffName && (
              <p className="text-xs text-muted-foreground mt-1">by {item.staffName}</p>
            )}
            {item.followUpRequired && (
              <Badge variant="outline" className="text-xs mt-1 border-amber-300 text-amber-700">Follow-up required</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerTab({ data, isLoading }: any) {
  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message="No analytics data available" />;

  const handleExport = () => {
    window.open("/api/org-member/frontline/export", "_blank");
  };

  const categoryLabels: Record<string, string> = {
    wellbeing_check: "Wellbeing Check",
    support_conversation: "Support Conversation",
    safeguarding_concern: "Safeguarding Concern",
    medication: "Medication",
    move_on_planning: "Move-on Planning",
    housing_support: "Housing Support",
    general_contact: "General Contact",
    key_worker_session: "Key Worker Session",
    crisis_intervention: "Crisis Intervention",
    group_activity: "Group Activity",
  };

  const maxCategory = Math.max(...(data.categoryBreakdown || []).map((c: any) => c.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Manager Dashboard</h2>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-report">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Weekly Engagement Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-primary">{data.engagementRate?.rate || 0}%</div>
            <div className="text-xs text-muted-foreground">
              <p>{data.engagementRate?.contacted || 0} of {data.engagementRate?.total || 0} residents contacted this week</p>
            </div>
          </div>
          <Progress value={data.engagementRate?.rate || 0} className="mt-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Interaction Categories (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.categoryBreakdown || []).map((cat: any) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="text-xs w-32 truncate">{categoryLabels[cat.category] || cat.category}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(cat.count / maxCategory) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{cat.count}</span>
                </div>
              ))}
              {(data.categoryBreakdown || []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No interactions recorded yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Staff Activity (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.staffActivity || []).map((staff: any) => (
                <div key={staff.staffName} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{staff.staffName}</p>
                    <p className="text-xs text-muted-foreground">Last active: {timeAgo(staff.lastActive)}</p>
                  </div>
                  <Badge variant="secondary">{staff.count} logs</Badge>
                </div>
              ))}
              {(data.staffActivity || []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No staff activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(data.riskDistribution || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Distribution (Data Capture, 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {(data.riskDistribution || []).map((r: any) => (
                <div key={r.riskTier} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${r.riskTier === "high" ? "bg-red-500" : r.riskTier === "medium" ? "bg-amber-500" : "bg-green-500"}`} />
                  <span className="text-sm capitalize">{r.riskTier}: {r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
