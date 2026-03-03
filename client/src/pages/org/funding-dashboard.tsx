import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import {
  PoundSterling, ArrowLeft, Loader2, Plus, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, ShieldAlert, Download, Settings as SettingsIcon,
  Flag, RefreshCw, FileText, Activity, Ban
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DashboardOverview {
  totalIncoming: number;
  totalOutgoing: number;
  unallocatedFunds: number;
  safeguardingCoveragePercent: number;
  openIncidents: number;
  monthlyData?: { month: string; incoming: number; activities: number }[];
}

interface FundingSource {
  id: string;
  name: string;
  type: string;
  restricted: boolean;
  totalValue: number;
  startDate: string;
  endDate: string | null;
}

interface Transaction {
  id: string;
  transactionDate: string;
  reference: string;
  direction: "INCOMING" | "OUTGOING";
  amount: number;
  fundingSourceId: string | null;
  sourceName?: string;
  status: string;
  allocatedAmount?: number;
}

interface Allocation {
  id: string;
  allocatedToType: string;
  allocatedToId: string;
  allocatedAmount: number;
  allocationDate: string;
  notes: string | null;
}

interface FundingActivity {
  id: string;
  activityType: string;
  startTime: string;
  endTime: string | null;
  status: string;
  safeguardingCoverage: boolean;
  fundingAllocationId: string | null;
}

interface Incident {
  id: string;
  severity: string;
  description: string;
  occurredAt: string;
  status: string;
  resolvedAt: string | null;
}

interface RiskData {
  complianceScore: number;
  flags: { key: string; label: string; description: string; severity: string }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount / 100);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB");
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("en-GB");
}

export default function FundingDashboard() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  useInactivityLogout();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (authUser && (!authUser.orgFeatureDashboard || (authUser.orgFeatureDashboardExpiresAt && new Date(authUser.orgFeatureDashboardExpiresAt) < new Date()))) {
      setLocation("/org/dashboard");
    }
  }, [authUser, setLocation]);

  const [showAddSource, setShowAddSource] = useState(false);
  const [srcName, setSrcName] = useState("");
  const [srcType, setSrcType] = useState("");
  const [srcRestricted, setSrcRestricted] = useState(false);
  const [srcStartDate, setSrcStartDate] = useState("");
  const [srcEndDate, setSrcEndDate] = useState("");
  const [srcTotalValue, setSrcTotalValue] = useState("");

  const [showAddTx, setShowAddTx] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txDirection, setTxDirection] = useState("");
  const [txReference, setTxReference] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txSourceId, setTxSourceId] = useState("");
  const [txFilterDirection, setTxFilterDirection] = useState("ALL");
  const [txFilterSource, setTxFilterSource] = useState("ALL");

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [allocType, setAllocType] = useState("");
  const [allocToId, setAllocToId] = useState("");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocDate, setAllocDate] = useState("");
  const [allocNotes, setAllocNotes] = useState("");

  const [showAddActivity, setShowAddActivity] = useState(false);
  const [actType, setActType] = useState("");
  const [actStart, setActStart] = useState("");
  const [actEnd, setActEnd] = useState("");
  const [actStatus, setActStatus] = useState("");
  const [actSafeguarding, setActSafeguarding] = useState(true);
  const [actAllocId, setActAllocId] = useState("");

  const [showAddIncident, setShowAddIncident] = useState(false);
  const [incSeverity, setIncSeverity] = useState("");
  const [incDescription, setIncDescription] = useState("");
  const [incOccurredAt, setIncOccurredAt] = useState("");

  const [auditStart, setAuditStart] = useState("");
  const [auditEnd, setAuditEnd] = useState("");

  const { data: overview, isLoading: overviewLoading } = useQuery<DashboardOverview>({
    queryKey: ["/api/org/funding/dashboard"],
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<FundingSource[]>({
    queryKey: ["/api/org/funding/sources"],
    enabled: activeTab === "sources" || activeTab === "transactions",
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/org/funding/transactions"],
    enabled: activeTab === "transactions" || activeTab === "allocations",
  });

  const { data: allocations, isLoading: allocLoading } = useQuery<{ allocations: Allocation[]; remaining: number }>({
    queryKey: ["/api/org/funding/transactions", selectedTxId, "allocations"],
    enabled: activeTab === "allocations" && !!selectedTxId,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<FundingActivity[]>({
    queryKey: ["/api/org/funding/activities"],
    enabled: activeTab === "activities",
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/org/funding/incidents"],
    enabled: activeTab === "incidents",
  });

  const { data: riskData, isLoading: riskLoading } = useQuery<RiskData>({
    queryKey: ["/api/org/funding/risk"],
    enabled: activeTab === "risk",
  });

  const addSourceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/org/funding/sources", {
        name: srcName,
        type: srcType,
        restricted: srcRestricted,
        startDate: srcStartDate,
        endDate: srcEndDate || null,
        totalValue: Math.round(parseFloat(srcTotalValue) * 100),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      setShowAddSource(false);
      setSrcName(""); setSrcType(""); setSrcRestricted(false); setSrcStartDate(""); setSrcEndDate(""); setSrcTotalValue("");
      toast({ title: "Source Added", description: "Funding source created successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addTxMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/org/funding/transactions", {
        amount: Math.round(parseFloat(txAmount) * 100),
        direction: txDirection,
        reference: txReference,
        transactionDate: txDate,
        fundingSourceId: txSourceId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      setShowAddTx(false);
      setTxAmount(""); setTxDirection(""); setTxReference(""); setTxDate(""); setTxSourceId("");
      toast({ title: "Transaction Added", description: "Transaction recorded successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addAllocationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/org/funding/allocations", {
        transactionId: selectedTxId,
        allocatedToType: allocType,
        allocatedToId: allocToId,
        allocatedAmount: Math.round(parseFloat(allocAmount) * 100),
        allocationDate: allocDate,
        notes: allocNotes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/transactions", selectedTxId, "allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      setShowAddAllocation(false);
      setAllocType(""); setAllocToId(""); setAllocAmount(""); setAllocDate(""); setAllocNotes("");
      toast({ title: "Allocation Added", description: "Funds allocated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/org/funding/activities", {
        activityType: actType,
        startTime: actStart,
        endTime: actEnd || null,
        status: actStatus,
        safeguardingCoverage: actSafeguarding,
        fundingAllocationId: actAllocId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      setShowAddActivity(false);
      setActType(""); setActStart(""); setActEnd(""); setActStatus(""); setActSafeguarding(true); setActAllocId("");
      toast({ title: "Activity Logged", description: "Activity recorded successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addIncidentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/org/funding/incidents", {
        severity: incSeverity,
        description: incDescription,
        occurredAt: incOccurredAt,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      setShowAddIncident(false);
      setIncSeverity(""); setIncDescription(""); setIncOccurredAt("");
      toast({ title: "Incident Reported", description: "Incident has been logged." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/org/funding/incidents/${id}`, {
        status: "RESOLVED",
        resolvedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      toast({ title: "Incident Resolved", description: "The incident has been marked as resolved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const simulateImportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/org/funding/simulate-import", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/funding/dashboard"] });
      toast({ title: "Import Complete", description: "Demo transactions have been created." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAuditExport = () => {
    if (!auditStart || !auditEnd) {
      toast({ title: "Missing dates", description: "Please select both start and end dates.", variant: "destructive" });
      return;
    }
    window.open(`/api/org/funding/audit-export?startDate=${auditStart}&endDate=${auditEnd}`, "_blank");
  };

  const filteredTransactions = (transactions || []).filter((tx) => {
    if (txFilterDirection !== "ALL" && tx.direction !== txFilterDirection) return false;
    if (txFilterSource !== "ALL" && tx.fundingSourceId !== txFilterSource) return false;
    return true;
  });

  const selectedTx = (transactions || []).find((t) => t.id === selectedTxId);

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/org/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <PoundSterling className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-lg font-bold" data-testid="text-funding-title">Funding Assurance</h1>
              <p className="text-xs text-muted-foreground">GRC-grade funding audit trail</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="sources" data-testid="tab-sources">Sources</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
              <TabsTrigger value="allocations" data-testid="tab-allocations">Allocations</TabsTrigger>
              <TabsTrigger value="activities" data-testid="tab-activities">Activities</TabsTrigger>
              <TabsTrigger value="incidents" data-testid="tab-incidents">Incidents</TabsTrigger>
              <TabsTrigger value="risk" data-testid="tab-risk">Risk</TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">Audit Export</TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
              <Card>
                <CardContent className="pt-4 text-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold" data-testid="text-total-incoming">
                    {formatCurrency(overview?.totalIncoming ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Incoming</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <TrendingDown className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold" data-testid="text-total-outgoing">
                    {formatCurrency(overview?.totalOutgoing ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Outgoing</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <PoundSterling className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold" data-testid="text-unallocated">
                    {formatCurrency(overview?.unallocatedFunds ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Unallocated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold" data-testid="text-safeguarding-coverage">
                    {overview?.safeguardingCoveragePercent ?? 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Safeguarding Coverage</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold" data-testid="text-open-incidents">
                    {overview?.openIncidents ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Open Incidents</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funding vs Activities (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                {(overview?.monthlyData?.length ?? 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overview?.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="incoming" name="Incoming (pence)" fill="hsl(142, 76%, 36%)" />
                      <Bar yAxisId="right" dataKey="activities" name="Activities" fill="hsl(221, 83%, 53%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-chart-data">No data available yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Funding Sources</h2>
              <Button onClick={() => setShowAddSource(true)} data-testid="button-add-source">
                <Plus className="h-4 w-4 mr-2" /> Add Source
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                {sourcesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Restricted</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(sources || []).map((s) => (
                          <TableRow key={s.id} data-testid={`row-source-${s.id}`}>
                            <TableCell className="font-medium" data-testid={`text-source-name-${s.id}`}>{s.name}</TableCell>
                            <TableCell><Badge variant="secondary">{s.type}</Badge></TableCell>
                            <TableCell>{s.restricted ? "Yes" : "No"}</TableCell>
                            <TableCell>{formatCurrency(s.totalValue)}</TableCell>
                            <TableCell>{formatDate(s.startDate)}</TableCell>
                            <TableCell>{formatDate(s.endDate)}</TableCell>
                          </TableRow>
                        ))}
                        {(sources || []).length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No funding sources yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Transactions</h2>
              <Button onClick={() => setShowAddTx(true)} data-testid="button-add-transaction">
                <Plus className="h-4 w-4 mr-2" /> Add Transaction
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Direction:</Label>
                <Select value={txFilterDirection} onValueChange={setTxFilterDirection}>
                  <SelectTrigger className="w-36" data-testid="select-filter-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="INCOMING">Incoming</SelectItem>
                    <SelectItem value="OUTGOING">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Source:</Label>
                <Select value={txFilterSource} onValueChange={setTxFilterSource}>
                  <SelectTrigger className="w-40" data-testid="select-filter-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    {(sources || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card>
              <CardContent className="pt-4">
                {txLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx) => (
                          <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                            <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                            <TableCell className="font-medium" data-testid={`text-tx-ref-${tx.id}`}>{tx.reference}</TableCell>
                            <TableCell>
                              <Badge variant={tx.direction === "INCOMING" ? "default" : "secondary"}>
                                {tx.direction}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(tx.amount)}</TableCell>
                            <TableCell>{tx.sourceName || "-"}</TableCell>
                            <TableCell><Badge variant="outline">{tx.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                        {filteredTransactions.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transactions found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Allocations</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-sm whitespace-nowrap">Select Transaction:</Label>
              <Select value={selectedTxId ?? ""} onValueChange={setSelectedTxId}>
                <SelectTrigger className="w-64" data-testid="select-transaction">
                  <SelectValue placeholder="Choose a transaction..." />
                </SelectTrigger>
                <SelectContent>
                  {(transactions || []).map((tx) => (
                    <SelectItem key={tx.id} value={tx.id}>
                      {tx.reference} - {formatCurrency(tx.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTxId && selectedTx && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Transaction: <strong>{selectedTx.reference}</strong> | Total: <strong>{formatCurrency(selectedTx.amount)}</strong> | Remaining: <strong data-testid="text-remaining-amount">{formatCurrency(allocations?.remaining ?? selectedTx.amount)}</strong>
                    </p>
                  </div>
                  <Button onClick={() => setShowAddAllocation(true)} data-testid="button-add-allocation">
                    <Plus className="h-4 w-4 mr-2" /> Add Allocation
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-4">
                    {allocLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Allocated To Type</TableHead>
                              <TableHead>Allocated To ID</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(allocations?.allocations || []).map((a) => (
                              <TableRow key={a.id} data-testid={`row-alloc-${a.id}`}>
                                <TableCell><Badge variant="secondary">{a.allocatedToType}</Badge></TableCell>
                                <TableCell className="font-medium">{a.allocatedToId}</TableCell>
                                <TableCell>{formatCurrency(a.allocatedAmount)}</TableCell>
                                <TableCell>{formatDate(a.allocationDate)}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{a.notes || "-"}</TableCell>
                              </TableRow>
                            ))}
                            {(allocations?.allocations || []).length === 0 && (
                              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No allocations for this transaction.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
            {!selectedTxId && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground py-12">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Select a transaction above to view and manage its allocations.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activities" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Activities</h2>
              <Button onClick={() => setShowAddActivity(true)} data-testid="button-add-activity">
                <Plus className="h-4 w-4 mr-2" /> Log Activity
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                {activitiesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Safeguarding</TableHead>
                          <TableHead>Allocation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(activities || []).map((a) => (
                          <TableRow key={a.id} data-testid={`row-activity-${a.id}`}>
                            <TableCell className="font-medium">{a.activityType}</TableCell>
                            <TableCell>{formatDateTime(a.startTime)}</TableCell>
                            <TableCell>{formatDateTime(a.endTime)}</TableCell>
                            <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                            <TableCell>
                              {a.safeguardingCoverage ? (
                                <Badge variant="default">Covered</Badge>
                              ) : (
                                <Badge variant="destructive">Not Covered</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{a.fundingAllocationId || "-"}</TableCell>
                          </TableRow>
                        ))}
                        {(activities || []).length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No activities logged yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Incidents</h2>
              <Button onClick={() => setShowAddIncident(true)} data-testid="button-add-incident">
                <Plus className="h-4 w-4 mr-2" /> Report Incident
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                {incidentsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Occurred At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Resolved At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(incidents || []).map((inc) => (
                          <TableRow key={inc.id} data-testid={`row-incident-${inc.id}`}>
                            <TableCell>
                              <Badge
                                variant={inc.severity === "HIGH" || inc.severity === "CRITICAL" ? "destructive" : inc.severity === "MEDIUM" ? "secondary" : "outline"}
                              >
                                {inc.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate" data-testid={`text-incident-desc-${inc.id}`}>{inc.description}</TableCell>
                            <TableCell>{formatDateTime(inc.occurredAt)}</TableCell>
                            <TableCell>
                              <Badge variant={inc.status === "OPEN" ? "destructive" : "default"}>
                                {inc.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateTime(inc.resolvedAt)}</TableCell>
                            <TableCell>
                              {inc.status === "OPEN" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resolveIncidentMutation.mutate(inc.id)}
                                  disabled={resolveIncidentMutation.isPending}
                                  data-testid={`button-resolve-incident-${inc.id}`}
                                >
                                  Resolve
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(incidents || []).length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No incidents reported.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Risk & Compliance</h2>
            {riskLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Compliance Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center py-6">
                    <div
                      className={`text-6xl font-bold ${
                        (riskData?.complianceScore ?? 0) > 80
                          ? "text-green-600"
                          : (riskData?.complianceScore ?? 0) >= 50
                            ? "text-amber-500"
                            : "text-red-600"
                      }`}
                      data-testid="text-compliance-score"
                    >
                      {riskData?.complianceScore ?? 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flag className="h-5 w-5" /> Risk Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(riskData?.flags || []).length > 0 ? (
                      <div className="space-y-3">
                        {riskData!.flags.map((flag) => (
                          <div key={flag.key} className="flex items-start gap-3 p-3 border rounded-md" data-testid={`risk-flag-${flag.key}`}>
                            {flag.severity === "HIGH" || flag.severity === "CRITICAL" ? (
                              <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                            ) : flag.severity === "MEDIUM" ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                            ) : (
                              <Activity className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{flag.label}</p>
                              <p className="text-xs text-muted-foreground">{flag.description}</p>
                            </div>
                            <Badge
                              variant={flag.severity === "HIGH" || flag.severity === "CRITICAL" ? "destructive" : flag.severity === "MEDIUM" ? "secondary" : "outline"}
                              className="shrink-0 ml-auto"
                            >
                              {flag.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-6" data-testid="text-no-risk-flags">No risk flags detected.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Audit Export</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-5 w-5" /> Generate CSV Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audit-start">Start Date</Label>
                    <Input
                      id="audit-start"
                      type="date"
                      value={auditStart}
                      onChange={(e) => setAuditStart(e.target.value)}
                      data-testid="input-audit-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audit-end">End Date</Label>
                    <Input
                      id="audit-end"
                      type="date"
                      value={auditEnd}
                      onChange={(e) => setAuditEnd(e.target.value)}
                      data-testid="input-audit-end"
                    />
                  </div>
                </div>
                <Button onClick={handleAuditExport} data-testid="button-generate-csv">
                  <Download className="h-4 w-4 mr-2" /> Generate CSV Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" /> Bank Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>TrueLayer Client ID</Label>
                  <Input value={import.meta.env.VITE_TRUELAYER_CLIENT_ID || "Not configured"} readOnly data-testid="input-truelayer-client-id" />
                </div>
                <div className="space-y-2">
                  <Label>TrueLayer Environment</Label>
                  <Input value={import.meta.env.VITE_TRUELAYER_ENV || "sandbox"} readOnly data-testid="input-truelayer-env" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Simulate Data Import</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create demo funding sources and transactions for testing purposes.
                </p>
                <Button
                  onClick={() => simulateImportMutation.mutate()}
                  disabled={simulateImportMutation.isPending}
                  data-testid="button-simulate-import"
                >
                  {simulateImportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Simulate Import
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddSource} onOpenChange={setShowAddSource}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funding Source</DialogTitle>
            <DialogDescription>Create a new funding source to track incoming funds.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="src-name">Name</Label>
              <Input id="src-name" value={srcName} onChange={(e) => setSrcName(e.target.value)} data-testid="input-source-name" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={srcType} onValueChange={setSrcType}>
                <SelectTrigger data-testid="select-source-type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LA">Local Authority</SelectItem>
                  <SelectItem value="HOUSING_BENEFIT">Housing Benefit</SelectItem>
                  <SelectItem value="GRANT">Grant</SelectItem>
                  <SelectItem value="CHARITY">Charity</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="src-restricted" checked={srcRestricted} onCheckedChange={setSrcRestricted} data-testid="switch-source-restricted" />
              <Label htmlFor="src-restricted">Restricted Funding</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-start">Start Date</Label>
              <Input id="src-start" type="date" value={srcStartDate} onChange={(e) => setSrcStartDate(e.target.value)} data-testid="input-source-start" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-end">End Date</Label>
              <Input id="src-end" type="date" value={srcEndDate} onChange={(e) => setSrcEndDate(e.target.value)} data-testid="input-source-end" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-value">Total Value (GBP)</Label>
              <Input id="src-value" type="number" step="0.01" value={srcTotalValue} onChange={(e) => setSrcTotalValue(e.target.value)} data-testid="input-source-value" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSource(false)} data-testid="button-cancel-source">Cancel</Button>
            <Button onClick={() => addSourceMutation.mutate()} disabled={addSourceMutation.isPending || !srcName || !srcType || !srcStartDate || !srcTotalValue} data-testid="button-save-source">
              {addSourceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Record a new funding transaction.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount (GBP)</Label>
              <Input id="tx-amount" type="number" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} data-testid="input-tx-amount" />
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={txDirection} onValueChange={setTxDirection}>
                <SelectTrigger data-testid="select-tx-direction"><SelectValue placeholder="Select direction..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOMING">Incoming</SelectItem>
                  <SelectItem value="OUTGOING">Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-ref">Reference</Label>
              <Input id="tx-ref" value={txReference} onChange={(e) => setTxReference(e.target.value)} data-testid="input-tx-reference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Transaction Date</Label>
              <Input id="tx-date" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} data-testid="input-tx-date" />
            </div>
            <div className="space-y-2">
              <Label>Funding Source</Label>
              <Select value={txSourceId} onValueChange={setTxSourceId}>
                <SelectTrigger data-testid="select-tx-source"><SelectValue placeholder="Select source (optional)..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(sources || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTx(false)} data-testid="button-cancel-tx">Cancel</Button>
            <Button onClick={() => addTxMutation.mutate()} disabled={addTxMutation.isPending || !txAmount || !txDirection || !txReference || !txDate} data-testid="button-save-tx">
              {addTxMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAllocation} onOpenChange={setShowAddAllocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation</DialogTitle>
            <DialogDescription>
              Allocate funds from this transaction. Remaining: {formatCurrency(allocations?.remaining ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Allocated To Type</Label>
              <Select value={allocType} onValueChange={setAllocType}>
                <SelectTrigger data-testid="select-alloc-type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="ACTIVITY">Activity</SelectItem>
                  <SelectItem value="OVERHEAD">Overhead</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alloc-to-id">Allocated To ID</Label>
              <Input id="alloc-to-id" value={allocToId} onChange={(e) => setAllocToId(e.target.value)} data-testid="input-alloc-to-id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alloc-amount">Amount (GBP)</Label>
              <Input id="alloc-amount" type="number" step="0.01" value={allocAmount} onChange={(e) => setAllocAmount(e.target.value)} data-testid="input-alloc-amount" />
              {allocAmount && parseFloat(allocAmount) * 100 > (allocations?.remaining ?? 0) && (
                <p className="text-xs text-red-500" data-testid="text-alloc-exceeds">Amount exceeds remaining unallocated funds.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alloc-date">Allocation Date</Label>
              <Input id="alloc-date" type="date" value={allocDate} onChange={(e) => setAllocDate(e.target.value)} data-testid="input-alloc-date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alloc-notes">Notes</Label>
              <Textarea id="alloc-notes" value={allocNotes} onChange={(e) => setAllocNotes(e.target.value)} data-testid="input-alloc-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAllocation(false)} data-testid="button-cancel-alloc">Cancel</Button>
            <Button
              onClick={() => addAllocationMutation.mutate()}
              disabled={
                addAllocationMutation.isPending ||
                !allocType || !allocToId || !allocAmount || !allocDate ||
                parseFloat(allocAmount) * 100 > (allocations?.remaining ?? 0)
              }
              data-testid="button-save-alloc"
            >
              {addAllocationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>Record a new funded activity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={actType} onValueChange={setActType}>
                <SelectTrigger data-testid="select-activity-type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPORT_SESSION">Support Session</SelectItem>
                  <SelectItem value="KEY_WORK">Key Work</SelectItem>
                  <SelectItem value="GROUP_ACTIVITY">Group Activity</SelectItem>
                  <SelectItem value="OUTREACH">Outreach</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-start">Start Time</Label>
              <Input id="act-start" type="datetime-local" value={actStart} onChange={(e) => setActStart(e.target.value)} data-testid="input-activity-start" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-end">End Time</Label>
              <Input id="act-end" type="datetime-local" value={actEnd} onChange={(e) => setActEnd(e.target.value)} data-testid="input-activity-end" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={actStatus} onValueChange={setActStatus}>
                <SelectTrigger data-testid="select-activity-status"><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="act-safeguarding" checked={actSafeguarding} onCheckedChange={setActSafeguarding} data-testid="switch-activity-safeguarding" />
              <Label htmlFor="act-safeguarding">Safeguarding Coverage</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-alloc-id">Linked Allocation ID (optional)</Label>
              <Input id="act-alloc-id" value={actAllocId} onChange={(e) => setActAllocId(e.target.value)} data-testid="input-activity-alloc-id" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddActivity(false)} data-testid="button-cancel-activity">Cancel</Button>
            <Button onClick={() => addActivityMutation.mutate()} disabled={addActivityMutation.isPending || !actType || !actStart || !actStatus} data-testid="button-save-activity">
              {addActivityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddIncident} onOpenChange={setShowAddIncident}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
            <DialogDescription>Log a new funding or safeguarding incident.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={incSeverity} onValueChange={setIncSeverity}>
                <SelectTrigger data-testid="select-incident-severity"><SelectValue placeholder="Select severity..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-desc">Description</Label>
              <Textarea id="inc-desc" value={incDescription} onChange={(e) => setIncDescription(e.target.value)} data-testid="input-incident-description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-date">Occurred At</Label>
              <Input id="inc-date" type="datetime-local" value={incOccurredAt} onChange={(e) => setIncOccurredAt(e.target.value)} data-testid="input-incident-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIncident(false)} data-testid="button-cancel-incident">Cancel</Button>
            <Button onClick={() => addIncidentMutation.mutate()} disabled={addIncidentMutation.isPending || !incSeverity || !incDescription || !incOccurredAt} data-testid="button-save-incident">
              {addIncidentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
