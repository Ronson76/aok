import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { OrgHelpButton } from "@/components/org-help-center";
import { Shield, ArrowLeft, AlertTriangle, FileWarning, Folder, Scale, Clock, ChevronDown, ChevronUp, ChevronRight, Plus, Eye, Check, X, Search, Filter, AlertCircle, FileText, Users, User, Activity, TrendingUp, Loader2, MessageSquare, Download, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface SafeguardingSummary {
  totalIncidents: number;
  openIncidents: number;
  totalConcerns: number;
  openConcerns: number;
  totalCaseFiles: number;
  openCases: number;
  pendingEscalations: number;
  unreviewedReports: number;
  highRiskCases: number;
  amberRiskCases: number;
  recentIncidents: Incident[];
  recentConcerns: WelfareConcern[];
}

interface Incident {
  id: string;
  organizationId?: string;
  clientId?: string;
  clientName?: string;
  referenceCode?: string;
  reportedById?: string;
  reportedByName?: string;
  incidentType: string;
  severity: string;
  description: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  what3words?: string;
  isAnonymous?: boolean;
  status: string;
  resolution?: string;
  resolvedById?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  isEmergencyAlert?: boolean;
}

interface WelfareConcern {
  id: string;
  organizationId: string;
  clientId?: string;
  reportedById?: string;
  reportedByName?: string;
  concernType: string;
  description: string;
  observedBehaviours?: string[];
  isAnonymous: boolean;
  status: string;
  followUpNotes?: string;
  resolvedById?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CaseFile {
  id: string;
  organizationId: string;
  clientId: string;
  riskLevel: string;
  status: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

interface CaseNote {
  id: string;
  caseFileId: string;
  authorId: string;
  noteType: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
}

interface EscalationRule {
  id: string;
  organizationId: string;
  name: string;
  triggerType: string;
  triggerThreshold: number;
  actions: string[];
  notifyEmails: string[];
  isActive: boolean;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  organizationId: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface RiskReport {
  id: string;
  organizationId: string;
  clientId: string;
  reportType: string;
  riskIndicators: string[];
  riskScore: number;
  summary: string;
  recommendations: string[];
  reviewedById?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

interface OrganizationClient {
  id: string;
  organizationId: string;
  clientId: string;
  nickname?: string;
  status: string;
  client?: {
    id: string;
    email?: string;
    name?: string;
  };
}

interface DeactivationConfirmation {
  id: string;
  clientName: string;
  clientEmail: string;
  referenceCode: string | null;
  alertId: string;
  lastKnownLatitude: string | null;
  lastKnownLongitude: string | null;
  lastKnownWhat3Words: string | null;
  confirmedAt: string;
  confirmedBy: { name: string; email: string; ip: string | null; userAgent: string | null }[];
}

export default function OrgSafeguardingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showConcernDialog, setShowConcernDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [selectedCaseFile, setSelectedCaseFile] = useState<CaseFile | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  
  const [incidentForm, setIncidentForm] = useState({
    clientId: "",
    incidentType: "other",
    severity: "medium",
    description: "",
    location: "",
    what3words: "",
    isAnonymous: false,
  });
  
  const [concernForm, setConcernForm] = useState({
    clientId: "",
    concernType: "welfare",
    description: "",
    observedBehaviours: "",
    isAnonymous: false,
    recipientEmail: "",
  });
  
  const [ruleForm, setRuleForm] = useState({
    name: "",
    triggerType: "missed_checkins",
    triggerThreshold: 3,
    notifyEmails: "",
    isActive: true,
  });
  
  const [noteForm, setNoteForm] = useState({
    noteType: "observation",
    content: "",
    isConfidential: false,
  });
  
  const [resolutionText, setResolutionText] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null);
  
  // Expanded client groups for recent incidents
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // PDF download state
  const [safeguardingAuditGroupBy, setSafeguardingAuditGroupBy] = useState<"none" | "date" | "user">("date");
  const [expandedSafeguardingAuditGroups, setExpandedSafeguardingAuditGroups] = useState<Set<string>>(new Set());
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfType, setPdfType] = useState<"incidents" | "concerns" | "audit" | "confirmations" | null>(null);
  const [pdfDateRange, setPdfDateRange] = useState<"all" | "month" | "year" | "custom">("all");
  const [pdfCustomStartDate, setPdfCustomStartDate] = useState("");
  const [pdfCustomEndDate, setPdfCustomEndDate] = useState("");

  const { data: summary, isLoading: summaryLoading } = useQuery<SafeguardingSummary>({
    queryKey: ["/api/org/safeguarding/summary"],
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/org/safeguarding/incidents"],
  });

  const { data: concerns, isLoading: concernsLoading } = useQuery<WelfareConcern[]>({
    queryKey: ["/api/org/safeguarding/welfare-concerns"],
  });

  const { data: caseFiles, isLoading: caseFilesLoading } = useQuery<CaseFile[]>({
    queryKey: ["/api/org/safeguarding/case-files"],
  });

  const { data: escalationRules } = useQuery<EscalationRule[]>({
    queryKey: ["/api/org/safeguarding/escalation-rules"],
  });

  const { data: auditTrail } = useQuery<AuditEntry[]>({
    queryKey: ["/api/org/safeguarding/audit-trail"],
  });

  const { data: riskReports } = useQuery<RiskReport[]>({
    queryKey: ["/api/org/safeguarding/risk-reports"],
  });

  const { data: clients } = useQuery<OrganizationClient[]>({
    queryKey: ["/api/org/clients"],
  });

  const { data: deactivationConfirmations, isLoading: confirmationsLoading } = useQuery<DeactivationConfirmation[]>({
    queryKey: ["/api/org/safeguarding/deactivation-confirmations"],
  });

  const { data: caseNotes } = useQuery<CaseNote[]>({
    queryKey: ["/api/org/safeguarding/case-files", selectedCaseFile?.id, "notes"],
    enabled: !!selectedCaseFile,
  });

  const { data: policyLeads, isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["/api/org/safeguarding/leads"],
  });

  const { data: policyDbsChecks, isLoading: dbsLoading } = useQuery<any[]>({
    queryKey: ["/api/org/safeguarding/dbs-checks"],
  });

  const { data: policyTraining, isLoading: trainingLoading } = useQuery<any[]>({
    queryKey: ["/api/org/safeguarding/training-records"],
  });

  const { data: policySummary } = useQuery<any>({
    queryKey: ["/api/org/safeguarding/policy-summary"],
  });

  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [showDbsDialog, setShowDbsDialog] = useState(false);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [editingDbs, setEditingDbs] = useState<any>(null);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [leadForm, setLeadForm] = useState({ name: "", role: "", email: "", phone: "", isPrimary: false });
  const [dbsForm, setDbsForm] = useState({ staffName: "", staffEmail: "", dbsType: "basic", certificateNumber: "", issueDate: "", expiryDate: "", status: "pending", notes: "" });
  const [trainingForm, setTrainingForm] = useState({ staffName: "", staffEmail: "", courseName: "", provider: "", completionDate: "", expiryDate: "", certificateRef: "", status: "pending", notes: "" });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: typeof incidentForm) => {
      const response = await apiRequest("POST", "/api/org/safeguarding/incidents", {
        ...data,
        clientId: data.clientId && data.clientId !== "__none__" ? data.clientId : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/welfare-concerns"] });
      setShowIncidentDialog(false);
      setIncidentForm({
        clientId: "",
        incidentType: "other",
        severity: "medium",
        description: "",
        location: "",
        what3words: "",
        isAnonymous: false,
      });
      toast({ title: "Incident reported", description: "The incident has been logged." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to report incident", description: error.message, variant: "destructive" });
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      const response = await apiRequest("PATCH", `/api/org/safeguarding/incidents/${id}/resolve`, { resolution });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/welfare-concerns"] });
      setSelectedIncidentId(null);
      setResolutionText("");
      toast({ title: "Incident resolved" });
    },
  });

  const createConcernMutation = useMutation({
    mutationFn: async (data: typeof concernForm) => {
      const behaviours = data.observedBehaviours ? data.observedBehaviours.split(",").map(b => b.trim()) : undefined;
      const response = await apiRequest("POST", "/api/org/safeguarding/welfare-concerns", {
        ...data,
        clientId: data.clientId && data.clientId !== "__none__" ? data.clientId : undefined,
        observedBehaviours: behaviours,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/welfare-concerns"] });
      setShowConcernDialog(false);
      setConcernForm({
        clientId: "",
        concernType: "welfare",
        description: "",
        observedBehaviours: "",
        isAnonymous: false,
        recipientEmail: "",
      });
      toast({ title: "Concern reported", description: "The welfare concern has been logged and notification sent." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to report concern", description: error.message, variant: "destructive" });
    },
  });

  const resolveConcernMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await apiRequest("PATCH", `/api/org/safeguarding/welfare-concerns/${id}/resolve`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/welfare-concerns"] });
      setSelectedConcernId(null);
      setResolutionText("");
      toast({ title: "Concern resolved" });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      const emails = data.notifyEmails.split(",").map(e => e.trim()).filter(e => e);
      const response = await apiRequest("POST", "/api/org/safeguarding/escalation-rules", {
        ...data,
        notifyEmails: emails,
        actions: ["email"],
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/escalation-rules"] });
      setShowRuleDialog(false);
      setRuleForm({
        name: "",
        triggerType: "missed_checkins",
        triggerThreshold: 3,
        notifyEmails: "",
        isActive: true,
      });
      toast({ title: "Rule created" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/org/safeguarding/escalation-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/escalation-rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  const createCaseFileMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", "/api/org/safeguarding/case-files", { clientId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/case-files"] });
      setShowCaseDialog(false);
      toast({ title: "Case file created" });
    },
  });

  const addCaseNoteMutation = useMutation({
    mutationFn: async (data: typeof noteForm) => {
      if (!selectedCaseFile) throw new Error("No case file selected");
      const response = await apiRequest("POST", `/api/org/safeguarding/case-files/${selectedCaseFile.id}/notes`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/case-files", selectedCaseFile?.id, "notes"] });
      setShowNoteDialog(false);
      setNoteForm({ noteType: "observation", content: "", isConfidential: false });
      toast({ title: "Note added" });
    },
  });

  const saveLeadMutation = useMutation({
    mutationFn: async (data: typeof leadForm) => {
      if (editingLead) {
        const response = await apiRequest("PATCH", `/api/org/safeguarding/leads/${editingLead.id}`, data);
        return response.json();
      }
      const response = await apiRequest("POST", "/api/org/safeguarding/leads", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/policy-summary"] });
      setShowLeadDialog(false);
      setEditingLead(null);
      setLeadForm({ name: "", role: "", email: "", phone: "", isPrimary: false });
      toast({ title: editingLead ? "Lead updated" : "Lead added" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/org/safeguarding/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/policy-summary"] });
      toast({ title: "Lead removed" });
    },
  });

  const saveDbsMutation = useMutation({
    mutationFn: async (data: typeof dbsForm) => {
      if (editingDbs) {
        const response = await apiRequest("PATCH", `/api/org/safeguarding/dbs-checks/${editingDbs.id}`, data);
        return response.json();
      }
      const response = await apiRequest("POST", "/api/org/safeguarding/dbs-checks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/dbs-checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/policy-summary"] });
      setShowDbsDialog(false);
      setEditingDbs(null);
      setDbsForm({ staffName: "", staffEmail: "", dbsType: "basic", certificateNumber: "", issueDate: "", expiryDate: "", status: "pending", notes: "" });
      toast({ title: editingDbs ? "DBS check updated" : "DBS check added" });
    },
  });

  const deleteDbsMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/org/safeguarding/dbs-checks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/dbs-checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/policy-summary"] });
      toast({ title: "DBS check removed" });
    },
  });

  const saveTrainingMutation = useMutation({
    mutationFn: async (data: typeof trainingForm) => {
      if (editingTraining) {
        const response = await apiRequest("PATCH", `/api/org/safeguarding/training-records/${editingTraining.id}`, data);
        return response.json();
      }
      const response = await apiRequest("POST", "/api/org/safeguarding/training-records", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/training-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/policy-summary"] });
      setShowTrainingDialog(false);
      setEditingTraining(null);
      setTrainingForm({ staffName: "", staffEmail: "", courseName: "", provider: "", completionDate: "", expiryDate: "", certificateRef: "", status: "pending", notes: "" });
      toast({ title: editingTraining ? "Training record updated" : "Training record added" });
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/org/safeguarding/training-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/training-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/safeguarding/policy-summary"] });
      toast({ title: "Training record removed" });
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive">Critical</Badge>;
      case "high": return <Badge className="bg-orange-500 text-white">High</Badge>;
      case "medium": return <Badge className="bg-yellow-500 text-black">Medium</Badge>;
      case "low": return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const toStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === "string" && val.trim()) return val.split(",").map(b => b.trim()).filter(Boolean);
    return [];
  };

  const formatIncidentType = (type: string) => {
    if (type === "emergency_alert") return "Emergency Alert";
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-blue-500 text-white">Open</Badge>;
      case "investigating": return <Badge className="bg-purple-500 text-white">Investigating</Badge>;
      case "monitoring": return <Badge className="bg-yellow-500 text-black">Monitoring</Badge>;
      case "closed": return <Badge variant="secondary">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "red": return <Badge variant="destructive">High Risk</Badge>;
      case "amber": return <Badge className="bg-amber-500 text-black">Amber</Badge>;
      case "green": return <Badge className="bg-green-500 text-white">Green</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "Unknown";
    const client = clients?.find(c => c.clientId === clientId);
    return client?.nickname || client?.client?.name || client?.client?.email || "Unknown Client";
  };

  // Date filtering helper
  const getDateRange = (): { start: Date | null; end: Date | null; label: string } => {
    const now = new Date();
    switch (pdfDateRange) {
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now, label: `${format(monthStart, "dd/MM/yyyy")} - ${format(now, "dd/MM/yyyy")}` };
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now, label: `${format(yearStart, "dd/MM/yyyy")} - ${format(now, "dd/MM/yyyy")}` };
      case "custom":
        const start = pdfCustomStartDate ? new Date(pdfCustomStartDate) : null;
        const end = pdfCustomEndDate ? new Date(pdfCustomEndDate) : null;
        if (start && end) {
          return { start, end, label: `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}` };
        }
        return { start: null, end: null, label: "All Time" };
      default:
        return { start: null, end: null, label: "All Time" };
    }
  };

  const filterByDateRange = <T extends { createdAt: string }>(items: T[]): T[] => {
    const { start, end } = getDateRange();
    if (!start || !end) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });
  };

  // Open PDF dialog
  const openPdfDialog = (type: "incidents" | "concerns" | "audit" | "confirmations") => {
    setPdfType(type);
    setPdfDateRange("all");
    setPdfCustomStartDate("");
    setPdfCustomEndDate("");
    setShowPdfDialog(true);
  };

  // PDF Generation Functions
  const downloadIncidentsPDF = () => {
    if (!incidents || incidents.length === 0) return;
    
    const filteredIncidents = filterByDateRange(incidents);
    if (filteredIncidents.length === 0) {
      toast({ title: "No data", description: "No incidents found for the selected date range.", variant: "destructive" });
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    // Branded header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Safeguarding Incidents Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    // Table data
    const tableData = filteredIncidents.map(incident => [
      format(new Date(incident.createdAt), "dd/MM/yyyy HH:mm"),
      incident.incidentType.replace(/_/g, " "),
      incident.severity,
      incident.status,
      incident.description.substring(0, 100) + (incident.description.length > 100 ? "..." : ""),
      getClientName(incident.clientId),
      incident.what3words || "-",
      incident.resolution || "-"
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [["Date", "Type", "Severity", "Status", "Description", "Client", "Location", "Resolution"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      columnStyles: {
        4: { cellWidth: 40 },
        7: { cellWidth: 30 }
      }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Personal wellbeing tools | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-safeguarding-incidents-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setShowPdfDialog(false);
  };

  const downloadConcernsPDF = () => {
    if (!concerns || concerns.length === 0) return;
    
    const filteredConcerns = filterByDateRange(concerns);
    if (filteredConcerns.length === 0) {
      toast({ title: "No data", description: "No concerns found for the selected date range.", variant: "destructive" });
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    // Branded header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Welfare Concerns Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    // Table data
    const tableData = filteredConcerns.map(concern => [
      format(new Date(concern.createdAt), "dd/MM/yyyy HH:mm"),
      concern.concernType || "General",
      concern.status,
      concern.description.substring(0, 100) + (concern.description.length > 100 ? "..." : ""),
      getClientName(concern.clientId),
      concern.isAnonymous ? "Yes" : "No",
      concern.followUpNotes || "-"
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [["Date", "Type", "Status", "Description", "Client", "Anonymous", "Follow-up Notes"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      columnStyles: {
        3: { cellWidth: 45 },
        6: { cellWidth: 35 }
      }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Personal wellbeing tools | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-welfare-concerns-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setShowPdfDialog(false);
  };

  const downloadAuditTrailPDF = () => {
    if (!auditTrail || auditTrail.length === 0) return;
    
    const filteredAudit = filterByDateRange(auditTrail);
    if (filteredAudit.length === 0) {
      toast({ title: "No data", description: "No audit entries found for the selected date range.", variant: "destructive" });
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    // Branded header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Safeguarding Audit Trail", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    // Table data
    const tableData = filteredAudit.map(entry => [
      format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm"),
      entry.action,
      entry.entityType.replace(/_/g, " "),
      entry.userEmail,
      entry.userRole,
      entry.ipAddress || "-"
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [["Date/Time", "Action", "Entity Type", "User Email", "User Role", "IP Address"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Personal wellbeing tools | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-audit-trail-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setShowPdfDialog(false);
  };

  const downloadConfirmationsPDF = () => {
    if (!deactivationConfirmations || deactivationConfirmations.length === 0) return;
    
    const filteredConfirmations = filterByDateRange(deactivationConfirmations.map(c => ({ ...c, createdAt: c.confirmedAt })));
    if (filteredConfirmations.length === 0) {
      toast({ title: "No data", description: "No confirmations found for the selected date range.", variant: "destructive" });
      return;
    }
    
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    // Branded header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Emergency Deactivation Confirmations Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    // Table data - one row per emergency event, with contacts listed
    const tableData = filteredConfirmations.map(conf => {
      const contacts = (conf as any).confirmedBy || [];
      const contactNames = contacts.map((c: any) => c.name).join(", ");
      const contactEmails = contacts.map((c: any) => c.email).join(", ");
      const contactIps = contacts.map((c: any) => c.ip || "Unknown").join(", ");
      
      return [
        (conf as any).clientName || "Unknown",
        (conf as any).referenceCode || "-",
        format(new Date((conf as any).confirmedAt), "dd/MM/yyyy HH:mm"),
        (conf as any).lastKnownWhat3Words ? `///${(conf as any).lastKnownWhat3Words}` : "-",
        contactNames || "-",
        contactEmails || "-",
        contactIps || "-"
      ];
    });
    
    autoTable(doc, {
      startY: 45,
      head: [["Client", "Ref #", "Confirmed", "Location (w3w)", "Confirmed By", "Contact Emails", "IP Addresses"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Personal wellbeing tools | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-emergency-confirmations-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setShowPdfDialog(false);
  };

  const handlePdfDownload = () => {
    switch (pdfType) {
      case "incidents":
        downloadIncidentsPDF();
        break;
      case "concerns":
        downloadConcernsPDF();
        break;
      case "audit":
        downloadAuditTrailPDF();
        break;
      case "confirmations":
        downloadConfirmationsPDF();
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/org/dashboard">
                <Button variant="ghost" size="icon" data-testid="button-back-to-dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Safeguarding Hub</h1>
                  <p className="text-sm text-muted-foreground">Incident reporting, welfare concerns & case management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <OrgHelpButton />
              <Button variant="outline" onClick={() => setShowConcernDialog(true)} data-testid="button-report-concern">
                <FileWarning className="h-4 w-4 mr-2" />
                Report Concern
              </Button>
              <Button onClick={() => setShowIncidentDialog(true)} data-testid="button-report-incident">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-8">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="incidents" data-testid="tab-incidents">Incidents</TabsTrigger>
              <TabsTrigger value="concerns" data-testid="tab-concerns">Concerns</TabsTrigger>
              <TabsTrigger value="cases" data-testid="tab-cases">Cases</TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
              <TabsTrigger value="confirmations" data-testid="tab-confirmations">Confirms</TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">Audit</TabsTrigger>
              <TabsTrigger value="policy" data-testid="tab-policy">Policy</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary?.openIncidents || 0}</div>
                      <p className="text-xs text-muted-foreground">of {summary?.totalIncidents || 0} total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Open Concerns</CardTitle>
                      <FileWarning className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary?.openConcerns || 0}</div>
                      <p className="text-xs text-muted-foreground">of {summary?.totalConcerns || 0} total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
                      <Folder className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary?.openCases || 0}</div>
                      <p className="text-xs text-muted-foreground">of {summary?.totalCaseFiles || 0} total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{summary?.highRiskCases || 0}</div>
                      <p className="text-xs text-muted-foreground">{summary?.amberRiskCases || 0} amber risk</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Recent Incidents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary?.recentIncidents && summary.recentIncidents.length > 0 ? (
                        (() => {
                          // Group incidents by client name
                          const groupedIncidents = summary.recentIncidents.reduce((acc, incident) => {
                            const clientKey = incident.clientName || (incident.clientId ? getClientName(incident.clientId) : "Unknown Client");
                            if (!acc[clientKey]) {
                              acc[clientKey] = [];
                            }
                            acc[clientKey].push(incident);
                            return acc;
                          }, {} as Record<string, Incident[]>);
                          
                          const toggleClient = (clientName: string) => {
                            setExpandedClients(prev => {
                              const next = new Set(prev);
                              if (next.has(clientName)) {
                                next.delete(clientName);
                              } else {
                                next.add(clientName);
                              }
                              return next;
                            });
                          };
                          
                          return (
                            <div className="space-y-2">
                              {Object.entries(groupedIncidents).map(([clientName, clientIncidents]) => {
                                const isExpanded = expandedClients.has(clientName);
                                const hasEmergency = clientIncidents.some(i => i.isEmergencyAlert);
                                const highestSeverity = clientIncidents.reduce((max, i) => {
                                  const severities = ["low", "medium", "high", "critical"];
                                  return severities.indexOf(i.severity) > severities.indexOf(max) ? i.severity : max;
                                }, "low");
                                
                                return (
                                  <div key={clientName} className={`rounded-lg border ${hasEmergency ? "border-destructive/50" : ""}`}>
                                    <button
                                      onClick={() => toggleClient(clientName)}
                                      className="w-full flex items-center justify-between p-3 hover-elevate rounded-lg text-left"
                                      data-testid={`btn-expand-client-${clientName.replace(/\s+/g, '-').toLowerCase()}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="font-medium">{clientName}</span>
                                        {hasEmergency && (
                                          <Badge variant="destructive" className="text-xs">SOS</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getSeverityBadge(highestSeverity)}
                                        <Badge variant="secondary" className="text-xs">{clientIncidents.length}</Badge>
                                      </div>
                                    </button>
                                    {isExpanded && (
                                      <div className="border-t px-3 pb-3 space-y-2">
                                        {clientIncidents.map((incident) => (
                                          <div key={incident.id} className={`flex items-start justify-between gap-2 p-2 mt-2 rounded-md ${incident.isEmergencyAlert ? "bg-destructive/5" : "bg-muted/30"}`}>
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                {getSeverityBadge(incident.severity)}
                                                <span className="text-sm font-medium">{formatIncidentType(incident.incidentType)}</span>
                                                {incident.isEmergencyAlert && (
                                                  <Badge variant="destructive" className="text-xs">SOS</Badge>
                                                )}
                                              </div>
                                              <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {format(new Date(incident.createdAt), "dd/MM/yyyy HH:mm")}
                                              </p>
                                            </div>
                                            {getStatusBadge(incident.status)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent incidents</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileWarning className="h-5 w-5" />
                        Recent Welfare Concerns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary?.recentConcerns && summary.recentConcerns.length > 0 ? (
                        <div className="space-y-3">
                          {summary.recentConcerns.map((concern) => (
                            <div key={concern.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium capitalize">{concern.concernType}</span>
                                  {concern.isAnonymous && <Badge variant="outline" className="text-xs">Anonymous</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{concern.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(concern.createdAt), "dd/MM/yyyy HH:mm")}
                                </p>
                              </div>
                              {getStatusBadge(concern.status)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent concerns</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>All Incidents</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => openPdfDialog("incidents")} 
                      disabled={!incidents || incidents.length === 0}
                      data-testid="button-download-incidents-pdf"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button onClick={() => setShowIncidentDialog(true)} data-testid="button-new-incident">
                      <Plus className="h-4 w-4 mr-2" />
                      New Incident
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : incidents && incidents.length > 0 ? (
                  (() => {
                    // Group incidents by client name
                    const groupedIncidents = incidents.reduce((acc, incident) => {
                      const clientKey = incident.clientName || (incident.clientId ? getClientName(incident.clientId) : "Unknown Client");
                      if (!acc[clientKey]) {
                        acc[clientKey] = [];
                      }
                      acc[clientKey].push(incident);
                      return acc;
                    }, {} as Record<string, Incident[]>);
                    
                    const toggleClient = (clientName: string) => {
                      setExpandedClients(prev => {
                        const next = new Set(prev);
                        if (next.has(clientName)) {
                          next.delete(clientName);
                        } else {
                          next.add(clientName);
                        }
                        return next;
                      });
                    };
                    
                    return (
                      <div className="space-y-3">
                        {Object.entries(groupedIncidents).map(([clientName, clientIncidents]) => {
                          const isExpanded = expandedClients.has(clientName);
                          const hasEmergency = clientIncidents.some(i => i.isEmergencyAlert);
                          const openCount = clientIncidents.filter(i => i.status === "open").length;
                          const highestSeverity = clientIncidents.reduce((max, i) => {
                            const severities = ["low", "medium", "high", "critical"];
                            return severities.indexOf(i.severity) > severities.indexOf(max) ? i.severity : max;
                          }, "low");
                          
                          return (
                            <div key={clientName} className={`rounded-lg border ${hasEmergency ? "border-destructive/50" : ""}`}>
                              <button
                                onClick={() => toggleClient(clientName)}
                                className="w-full flex items-center justify-between p-4 hover-elevate rounded-lg text-left"
                                data-testid={`btn-expand-incidents-${clientName.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="font-medium">{clientName}</span>
                                  {hasEmergency && (
                                    <Badge variant="destructive" className="text-xs">SOS</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {getSeverityBadge(highestSeverity)}
                                  {openCount > 0 && (
                                    <Badge variant="outline" className="text-xs">{openCount} open</Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs">{clientIncidents.length} total</Badge>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="border-t px-4 pb-4 space-y-3">
                                  {clientIncidents.map((incident) => (
                                    <div key={incident.id} className={`p-3 mt-3 rounded-lg space-y-2 ${incident.isEmergencyAlert ? "bg-destructive/5 border border-destructive/30" : "bg-muted/30"}`}>
                                      <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {getSeverityBadge(incident.severity)}
                                          <span className="font-medium">{formatIncidentType(incident.incidentType)}</span>
                                          {getStatusBadge(incident.status)}
                                          {incident.isEmergencyAlert && (
                                            <Badge variant="destructive" className="text-xs">SOS</Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {format(new Date(incident.createdAt), "dd/MM/yyyy HH:mm")}
                                        </p>
                                      </div>
                                      <p className="text-sm">{incident.description}</p>
                                      {incident.what3words && (
                                        <p className="text-sm text-muted-foreground">Location: ///{incident.what3words}</p>
                                      )}
                                      {incident.status === "open" && !incident.isEmergencyAlert && (
                                        <div className="flex items-center gap-2 pt-2">
                                          {selectedIncidentId === incident.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                              <Input
                                                placeholder="Resolution notes..."
                                                value={resolutionText}
                                                onChange={(e) => setResolutionText(e.target.value)}
                                                className="flex-1"
                                              />
                                              <Button
                                                size="sm"
                                                onClick={() => resolveIncidentMutation.mutate({ id: incident.id, resolution: resolutionText })}
                                                disabled={!resolutionText || resolveIncidentMutation.isPending}
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button size="sm" variant="ghost" onClick={() => setSelectedIncidentId(null)}>
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button size="sm" variant="outline" onClick={() => setSelectedIncidentId(incident.id)}>
                                              Resolve
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                      {incident.resolution && (
                                        <div className="pt-2 border-t mt-2">
                                          <p className="text-sm text-muted-foreground">
                                            <strong>Resolution:</strong> {incident.resolution}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-center text-muted-foreground py-8">No incidents reported yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="concerns" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Welfare Concerns</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => openPdfDialog("concerns")} 
                      disabled={!concerns || concerns.length === 0}
                      data-testid="button-download-concerns-pdf"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button onClick={() => setShowConcernDialog(true)} data-testid="button-new-concern">
                      <Plus className="h-4 w-4 mr-2" />
                      New Concern
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {concernsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : concerns && concerns.length > 0 ? (
                  <div className="space-y-3">
                    {concerns.map((concern) => (
                      <div key={concern.id} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium capitalize">{concern.concernType}</span>
                            {getStatusBadge(concern.status)}
                            {concern.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(concern.createdAt), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                        <p className="text-sm">{concern.description}</p>
                        {concern.clientId && (
                          <p className="text-sm text-muted-foreground">Client: {getClientName(concern.clientId)}</p>
                        )}
                        {concern.observedBehaviours && toStringArray(concern.observedBehaviours).length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm text-muted-foreground">Behaviours:</span>
                            {toStringArray(concern.observedBehaviours).map((b, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{b}</Badge>
                            ))}
                          </div>
                        )}
                        {concern.status === "open" && (
                          <div className="flex items-center gap-2 pt-2">
                            {selectedConcernId === concern.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  placeholder="Follow-up notes..."
                                  value={resolutionText}
                                  onChange={(e) => setResolutionText(e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => resolveConcernMutation.mutate({ id: concern.id, notes: resolutionText })}
                                  disabled={!resolutionText || resolveConcernMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedConcernId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setSelectedConcernId(concern.id)}>
                                Resolve
                              </Button>
                            )}
                          </div>
                        )}
                        {concern.followUpNotes && (
                          <div className="pt-2 border-t mt-2">
                            <p className="text-sm text-muted-foreground">
                              <strong>Follow-up:</strong> {concern.followUpNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No welfare concerns reported yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">Case Files</CardTitle>
                      <Button size="sm" onClick={() => setShowCaseDialog(true)} data-testid="button-new-case">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {caseFilesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : caseFiles && caseFiles.length > 0 ? (
                      <div className="space-y-2">
                        {caseFiles.map((caseFile) => (
                          <button
                            key={caseFile.id}
                            onClick={() => setSelectedCaseFile(caseFile)}
                            className={`w-full p-3 rounded-lg border text-left transition-colors hover-elevate ${
                              selectedCaseFile?.id === caseFile.id ? "border-primary bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{getClientName(caseFile.clientId)}</span>
                              {getRiskBadge(caseFile.riskLevel)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getStatusBadge(caseFile.status)}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4 text-sm">No case files</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2">
                {selectedCaseFile ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle>{getClientName(selectedCaseFile.clientId)}</CardTitle>
                          <CardDescription>
                            Case opened {format(new Date(selectedCaseFile.createdAt), "dd/MM/yyyy")}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRiskBadge(selectedCaseFile.riskLevel)}
                          {getStatusBadge(selectedCaseFile.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedCaseFile.summary && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Summary</h4>
                          <p className="text-sm text-muted-foreground">{selectedCaseFile.summary}</p>
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="text-sm font-medium">Case Notes</h4>
                          <Button size="sm" variant="outline" onClick={() => setShowNoteDialog(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Note
                          </Button>
                        </div>
                        {caseNotes && caseNotes.length > 0 ? (
                          <div className="space-y-2">
                            {caseNotes.map((note) => (
                              <div key={note.id} className="p-3 rounded-lg border space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge variant="outline" className="text-xs capitalize">{note.noteType}</Badge>
                                  {note.isConfidential && <Badge variant="secondary" className="text-xs">Confidential</Badge>}
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                                  </span>
                                </div>
                                <p className="text-sm">{note.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <p className="text-center text-muted-foreground">Select a case file to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Escalation Rules</CardTitle>
                    <CardDescription>Configure automatic escalation triggers</CardDescription>
                  </div>
                  <Button onClick={() => setShowRuleDialog(true)} data-testid="button-new-rule">
                    <Plus className="h-4 w-4 mr-2" />
                    New Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {escalationRules && escalationRules.length > 0 ? (
                  <div className="space-y-3">
                    {escalationRules.map((rule) => (
                      <div key={rule.id} className="p-4 rounded-lg border flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            {rule.isActive ? (
                              <Badge className="bg-green-500 text-white">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.triggerType.replace(/_/g, " ")} ({rule.triggerThreshold}x)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Notify: {toStringArray(rule.notifyEmails).join(", ") || "Safeguarding lead"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          disabled={deleteRuleMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No escalation rules configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Complete log of safeguarding actions</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => openPdfDialog("audit")} 
                    disabled={!auditTrail || auditTrail.length === 0}
                    data-testid="button-download-audit-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Group By selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={safeguardingAuditGroupBy} onValueChange={(v: "none" | "date" | "user") => { setSafeguardingAuditGroupBy(v); setExpandedSafeguardingAuditGroups(new Set()); }}>
                    <SelectTrigger className="w-44" data-testid="select-safeguarding-audit-group-by">
                      <SelectValue placeholder="Group by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">
                        <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Group by Date</span>
                      </SelectItem>
                      <SelectItem value="user">
                        <span className="flex items-center gap-2"><User className="h-4 w-4" /> Group by User</span>
                      </SelectItem>
                      <SelectItem value="none">No Grouping</SelectItem>
                    </SelectContent>
                  </Select>
                  {safeguardingAuditGroupBy !== "none" && auditTrail && auditTrail.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const keys = new Set<string>();
                          auditTrail.forEach(e => {
                            keys.add(safeguardingAuditGroupBy === "date" ? format(new Date(e.createdAt), "dd/MM/yyyy") : (e.userEmail || "System"));
                          });
                          setExpandedSafeguardingAuditGroups(keys);
                        }}
                        data-testid="button-safeguarding-audit-expand-all"
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedSafeguardingAuditGroups(new Set())}
                        data-testid="button-safeguarding-audit-collapse-all"
                      >
                        Collapse All
                      </Button>
                    </div>
                  )}
                </div>

                {auditTrail && auditTrail.length > 0 ? (
                  <div className="space-y-2">
                    {safeguardingAuditGroupBy === "none" ? (
                      auditTrail.map((entry) => (
                        <div key={entry.id} className="p-3 rounded-lg border flex items-start justify-between gap-4" data-testid={`safeguarding-audit-entry-${entry.id}`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize">{entry.action}</Badge>
                              <span className="text-sm font-medium capitalize">{entry.entityType.replace(/_/g, " ")}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              By: {entry.userEmail} ({entry.userRole})
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                      ))
                    ) : (
                      (() => {
                        const groups = new Map<string, AuditEntry[]>();
                        auditTrail.forEach(entry => {
                          const key = safeguardingAuditGroupBy === "date"
                            ? format(new Date(entry.createdAt), "dd/MM/yyyy")
                            : (entry.userEmail || "System");
                          if (!groups.has(key)) groups.set(key, []);
                          groups.get(key)!.push(entry);
                        });
                        const sorted = Array.from(groups.entries());
                        if (safeguardingAuditGroupBy === "date") {
                          sorted.sort((a, b) => {
                            const dA = new Date(a[1][0].createdAt);
                            const dB = new Date(b[1][0].createdAt);
                            return dB.getTime() - dA.getTime();
                          });
                        } else {
                          sorted.sort((a, b) => a[0].localeCompare(b[0]));
                        }
                        return sorted.map(([groupKey, groupEntries]) => {
                          const isGroupOpen = expandedSafeguardingAuditGroups.has(groupKey);
                          return (
                            <div key={groupKey} className="rounded-lg border">
                              <button
                                onClick={() => {
                                  setExpandedSafeguardingAuditGroups(prev => {
                                    const next = new Set(prev);
                                    if (next.has(groupKey)) next.delete(groupKey);
                                    else next.add(groupKey);
                                    return next;
                                  });
                                }}
                                className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover-elevate rounded-lg"
                                data-testid={`button-safeguarding-audit-group-${groupKey.replace(/[^a-zA-Z0-9]/g, '-')}`}
                              >
                                <div className="flex items-center gap-3">
                                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isGroupOpen ? "rotate-90" : ""}`} />
                                  {safeguardingAuditGroupBy === "date" ? (
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-sm font-medium">{groupKey}</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">{groupEntries.length} entr{groupEntries.length !== 1 ? "ies" : "y"}</Badge>
                              </button>
                              {isGroupOpen && (
                                <div className="px-4 pb-3 space-y-2 border-t pt-3">
                                  {groupEntries.map((entry) => (
                                    <div key={entry.id} className="p-3 rounded-lg border flex items-start justify-between gap-4" data-testid={`safeguarding-audit-entry-${entry.id}`}>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-xs capitalize">{entry.action}</Badge>
                                          <span className="text-sm font-medium capitalize">{entry.entityType.replace(/_/g, " ")}</span>
                                        </div>
                                        {safeguardingAuditGroupBy !== "user" && (
                                          <p className="text-sm text-muted-foreground">
                                            By: {entry.userEmail} ({entry.userRole})
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {safeguardingAuditGroupBy === "date"
                                          ? format(new Date(entry.createdAt), "HH:mm")
                                          : format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")
                                        }
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No audit entries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confirmations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Emergency Deactivation Confirmations
                    </CardTitle>
                    <CardDescription>
                      Audit trail of emergency alert deactivations confirmed by trusted contacts
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => openPdfDialog("confirmations")} 
                    disabled={!deactivationConfirmations || deactivationConfirmations.length === 0}
                    data-testid="button-download-confirmations-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {confirmationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : deactivationConfirmations && deactivationConfirmations.length > 0 ? (
                  <div className="space-y-3">
                    {deactivationConfirmations.map((conf) => (
                      <div key={conf.id} className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{conf.clientName}</span>
                              {conf.referenceCode && (
                                <Badge variant="outline" className="text-xs">{conf.referenceCode}</Badge>
                              )}
                              <Badge className="bg-green-500 hover:bg-green-600 text-xs">Confirmed</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{conf.clientEmail}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p className="text-green-600 dark:text-green-400">
                              Confirmed: {format(new Date(conf.confirmedAt), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Confirmed by ({(Array.isArray(conf.confirmedBy) ? conf.confirmedBy : []).length})</p>
                            <div className="space-y-1">
                              {(Array.isArray(conf.confirmedBy) ? conf.confirmedBy : []).map((contact, idx) => (
                                <div key={idx}>
                                  <p className="font-medium">{contact.name}</p>
                                  <p className="text-xs text-muted-foreground">{contact.email}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {conf.lastKnownWhat3Words && (
                            <div>
                              <p className="text-muted-foreground">Location (what3words)</p>
                              <a 
                                href={`https://what3words.com/${conf.lastKnownWhat3Words}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                ///{conf.lastKnownWhat3Words}
                              </a>
                              {conf.lastKnownLatitude && conf.lastKnownLongitude && (
                                <p className="text-xs text-muted-foreground">
                                  {conf.lastKnownLatitude}, {conf.lastKnownLongitude}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-2 border-t space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Confirmation Audit Trail</p>
                          <div className="space-y-2">
                            {(Array.isArray(conf.confirmedBy) ? conf.confirmedBy : []).map((contact, idx) => (
                              <div key={idx} className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Contact: </span>
                                  <span>{contact.name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">IP: </span>
                                  <span className="font-mono">{contact.ip || "Unknown"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Device: </span>
                                  <span className="truncate" title={contact.userAgent || undefined}>
                                    {contact.userAgent ? contact.userAgent.substring(0, 30) + (contact.userAgent.length > 30 ? "..." : "") : "Unknown"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No emergency confirmations recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy" className="space-y-6">
            {policySummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Overall Status</p>
                        <Badge className={policySummary.overallStatus === "green" ? "bg-green-500 text-white" : policySummary.overallStatus === "amber" ? "bg-amber-500 text-black" : "bg-red-500 text-white"} data-testid="badge-policy-status">
                          {policySummary.overallStatus === "green" ? "Compliant" : policySummary.overallStatus === "amber" ? "Needs Attention" : "Action Required"}
                        </Badge>
                      </div>
                      <Shield className={`h-8 w-8 ${policySummary.overallStatus === "green" ? "text-green-500" : policySummary.overallStatus === "amber" ? "text-amber-500" : "text-red-500"}`} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-muted-foreground">Designated Leads</p>
                    <p className="text-2xl font-bold" data-testid="text-leads-count">{policySummary.leads?.total || 0}</p>
                    {!policySummary.leads?.hasDesignatedLead && <p className="text-xs text-red-500">No primary lead assigned</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-muted-foreground">DBS Checks</p>
                    <p className="text-2xl font-bold" data-testid="text-dbs-count">{policySummary.dbs?.valid || 0}/{policySummary.dbs?.total || 0} Valid</p>
                    {policySummary.dbs?.expired > 0 && <p className="text-xs text-red-500">{policySummary.dbs.expired} expired</p>}
                    {policySummary.dbs?.renewalDue > 0 && <p className="text-xs text-amber-500">{policySummary.dbs.renewalDue} renewal due</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-muted-foreground">Training</p>
                    <p className="text-2xl font-bold" data-testid="text-training-count">{policySummary.training?.completed || 0}/{policySummary.training?.total || 0} Completed</p>
                    {policySummary.training?.expired > 0 && <p className="text-xs text-red-500">{policySummary.training.expired} expired</p>}
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Designated Safeguarding Leads</CardTitle>
                    <CardDescription>Staff responsible for safeguarding policy and escalation</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingLead(null); setLeadForm({ name: "", role: "", email: "", phone: "", isPrimary: false }); setShowLeadDialog(true); }} data-testid="button-add-lead">
                    <Plus className="h-4 w-4 mr-2" /> Add Lead
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : policyLeads && policyLeads.length > 0 ? (
                  <div className="space-y-3">
                    {policyLeads.map((lead: any) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`row-lead-${lead.id}`}>
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{lead.name} {lead.isPrimary && <Badge className="bg-green-500 text-white ml-2">Primary</Badge>}</p>
                            <p className="text-sm text-muted-foreground">{lead.role}</p>
                            {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                            {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingLead(lead); setLeadForm({ name: lead.name, role: lead.role, email: lead.email || "", phone: lead.phone || "", isPrimary: lead.isPrimary }); setShowLeadDialog(true); }} data-testid={`button-edit-lead-${lead.id}`}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteLeadMutation.mutate(lead.id)} data-testid={`button-delete-lead-${lead.id}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No safeguarding leads added yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> DBS Checks</CardTitle>
                    <CardDescription>Track Disclosure and Barring Service checks for staff</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingDbs(null); setDbsForm({ staffName: "", staffEmail: "", dbsType: "basic", certificateNumber: "", issueDate: "", expiryDate: "", status: "pending", notes: "" }); setShowDbsDialog(true); }} data-testid="button-add-dbs">
                    <Plus className="h-4 w-4 mr-2" /> Add DBS Check
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dbsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : policyDbsChecks && policyDbsChecks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Staff</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-left py-2 px-2">Certificate</th>
                          <th className="text-left py-2 px-2">Issue Date</th>
                          <th className="text-left py-2 px-2">Expiry</th>
                          <th className="text-left py-2 px-2">Status</th>
                          <th className="text-right py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policyDbsChecks.map((check: any) => (
                          <tr key={check.id} className="border-b" data-testid={`row-dbs-${check.id}`}>
                            <td className="py-2 px-2">
                              <p className="font-medium">{check.staffName}</p>
                              {check.staffEmail && <p className="text-xs text-muted-foreground">{check.staffEmail}</p>}
                            </td>
                            <td className="py-2 px-2">
                              <Badge variant="outline">{check.dbsType === "basic" ? "Basic" : check.dbsType === "standard" ? "Standard" : check.dbsType === "enhanced" ? "Enhanced" : "Enhanced+"}</Badge>
                            </td>
                            <td className="py-2 px-2 font-mono text-xs">{check.certificateNumber || " - "}</td>
                            <td className="py-2 px-2">{check.issueDate ? format(new Date(check.issueDate), "dd/MM/yyyy") : " - "}</td>
                            <td className="py-2 px-2">{check.expiryDate ? format(new Date(check.expiryDate), "dd/MM/yyyy") : " - "}</td>
                            <td className="py-2 px-2">
                              <Badge className={check.status === "valid" ? "bg-green-500 text-white" : check.status === "expired" ? "bg-red-500 text-white" : check.status === "renewal_due" ? "bg-amber-500 text-black" : "bg-gray-500 text-white"}>
                                {check.status === "valid" ? "Valid" : check.status === "expired" ? "Expired" : check.status === "renewal_due" ? "Renewal Due" : "Pending"}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingDbs(check); setDbsForm({ staffName: check.staffName, staffEmail: check.staffEmail || "", dbsType: check.dbsType, certificateNumber: check.certificateNumber || "", issueDate: check.issueDate ? check.issueDate.split("T")[0] : "", expiryDate: check.expiryDate ? check.expiryDate.split("T")[0] : "", status: check.status, notes: check.notes || "" }); setShowDbsDialog(true); }} data-testid={`button-edit-dbs-${check.id}`}>
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteDbsMutation.mutate(check.id)} data-testid={`button-delete-dbs-${check.id}`}>
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No DBS checks recorded yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Training Records</CardTitle>
                    <CardDescription>Track safeguarding training completion and renewal</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingTraining(null); setTrainingForm({ staffName: "", staffEmail: "", courseName: "", provider: "", completionDate: "", expiryDate: "", certificateRef: "", status: "pending", notes: "" }); setShowTrainingDialog(true); }} data-testid="button-add-training">
                    <Plus className="h-4 w-4 mr-2" /> Add Training Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {trainingLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : policyTraining && policyTraining.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Staff</th>
                          <th className="text-left py-2 px-2">Course</th>
                          <th className="text-left py-2 px-2">Provider</th>
                          <th className="text-left py-2 px-2">Completed</th>
                          <th className="text-left py-2 px-2">Expires</th>
                          <th className="text-left py-2 px-2">Status</th>
                          <th className="text-right py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policyTraining.map((record: any) => (
                          <tr key={record.id} className="border-b" data-testid={`row-training-${record.id}`}>
                            <td className="py-2 px-2">
                              <p className="font-medium">{record.staffName}</p>
                              {record.staffEmail && <p className="text-xs text-muted-foreground">{record.staffEmail}</p>}
                            </td>
                            <td className="py-2 px-2">{record.courseName}</td>
                            <td className="py-2 px-2">{record.provider || " - "}</td>
                            <td className="py-2 px-2">{record.completionDate ? format(new Date(record.completionDate), "dd/MM/yyyy") : " - "}</td>
                            <td className="py-2 px-2">{record.expiryDate ? format(new Date(record.expiryDate), "dd/MM/yyyy") : " - "}</td>
                            <td className="py-2 px-2">
                              <Badge className={record.status === "completed" ? "bg-green-500 text-white" : record.status === "expired" ? "bg-red-500 text-white" : record.status === "in_progress" ? "bg-blue-500 text-white" : "bg-gray-500 text-white"}>
                                {record.status === "completed" ? "Completed" : record.status === "expired" ? "Expired" : record.status === "in_progress" ? "In Progress" : "Pending"}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingTraining(record); setTrainingForm({ staffName: record.staffName, staffEmail: record.staffEmail || "", courseName: record.courseName, provider: record.provider || "", completionDate: record.completionDate ? record.completionDate.split("T")[0] : "", expiryDate: record.expiryDate ? record.expiryDate.split("T")[0] : "", certificateRef: record.certificateRef || "", status: record.status, notes: record.notes || "" }); setShowTrainingDialog(true); }} data-testid={`button-edit-training-${record.id}`}>
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteTrainingMutation.mutate(record.id)} data-testid={`button-delete-training-${record.id}`}>
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No training records added yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit" : "Add"} Safeguarding Lead</DialogTitle>
            <DialogDescription>Designate a staff member responsible for safeguarding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} placeholder="Full name" data-testid="input-lead-name" />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Input value={leadForm.role} onChange={(e) => setLeadForm({ ...leadForm, role: e.target.value })} placeholder="e.g. Designated Safeguarding Lead" data-testid="input-lead-role" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="Email address" data-testid="input-lead-email" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} placeholder="Phone number" data-testid="input-lead-phone" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={leadForm.isPrimary} onCheckedChange={(checked) => setLeadForm({ ...leadForm, isPrimary: checked })} data-testid="switch-lead-primary" />
              <Label>Primary Safeguarding Lead</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadDialog(false)}>Cancel</Button>
            <Button onClick={() => saveLeadMutation.mutate(leadForm)} disabled={!leadForm.name || !leadForm.role || saveLeadMutation.isPending} data-testid="button-save-lead">
              {saveLeadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingLead ? "Update" : "Add"} Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDbsDialog} onOpenChange={setShowDbsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDbs ? "Edit" : "Add"} DBS Check</DialogTitle>
            <DialogDescription>Record a Disclosure and Barring Service check</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Staff Name *</Label>
              <Input value={dbsForm.staffName} onChange={(e) => setDbsForm({ ...dbsForm, staffName: e.target.value })} placeholder="Full name" data-testid="input-dbs-staff-name" />
            </div>
            <div className="space-y-2">
              <Label>Staff Email</Label>
              <Input type="email" value={dbsForm.staffEmail} onChange={(e) => setDbsForm({ ...dbsForm, staffEmail: e.target.value })} placeholder="Email" data-testid="input-dbs-staff-email" />
            </div>
            <div className="space-y-2">
              <Label>DBS Type *</Label>
              <Select value={dbsForm.dbsType} onValueChange={(v) => setDbsForm({ ...dbsForm, dbsType: v })}>
                <SelectTrigger data-testid="select-dbs-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="enhanced">Enhanced</SelectItem>
                  <SelectItem value="enhanced_barred">Enhanced with Barred List</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Certificate Number</Label>
              <Input value={dbsForm.certificateNumber} onChange={(e) => setDbsForm({ ...dbsForm, certificateNumber: e.target.value })} placeholder="Certificate number" data-testid="input-dbs-certificate" />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input type="date" value={dbsForm.issueDate} onChange={(e) => setDbsForm({ ...dbsForm, issueDate: e.target.value })} data-testid="input-dbs-issue-date" />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={dbsForm.expiryDate} onChange={(e) => setDbsForm({ ...dbsForm, expiryDate: e.target.value })} data-testid="input-dbs-expiry-date" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={dbsForm.status} onValueChange={(v) => setDbsForm({ ...dbsForm, status: v })}>
                <SelectTrigger data-testid="select-dbs-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="renewal_due">Renewal Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea value={dbsForm.notes} onChange={(e) => setDbsForm({ ...dbsForm, notes: e.target.value })} placeholder="Additional notes" data-testid="input-dbs-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDbsDialog(false)}>Cancel</Button>
            <Button onClick={() => saveDbsMutation.mutate(dbsForm)} disabled={!dbsForm.staffName || !dbsForm.dbsType || saveDbsMutation.isPending} data-testid="button-save-dbs">
              {saveDbsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingDbs ? "Update" : "Add"} DBS Check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTraining ? "Edit" : "Add"} Training Record</DialogTitle>
            <DialogDescription>Record safeguarding training completion</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Staff Name *</Label>
              <Input value={trainingForm.staffName} onChange={(e) => setTrainingForm({ ...trainingForm, staffName: e.target.value })} placeholder="Full name" data-testid="input-training-staff-name" />
            </div>
            <div className="space-y-2">
              <Label>Staff Email</Label>
              <Input type="email" value={trainingForm.staffEmail} onChange={(e) => setTrainingForm({ ...trainingForm, staffEmail: e.target.value })} placeholder="Email" data-testid="input-training-staff-email" />
            </div>
            <div className="space-y-2">
              <Label>Course Name *</Label>
              <Input value={trainingForm.courseName} onChange={(e) => setTrainingForm({ ...trainingForm, courseName: e.target.value })} placeholder="Course name" data-testid="input-training-course" />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input value={trainingForm.provider} onChange={(e) => setTrainingForm({ ...trainingForm, provider: e.target.value })} placeholder="Training provider" data-testid="input-training-provider" />
            </div>
            <div className="space-y-2">
              <Label>Completion Date</Label>
              <Input type="date" value={trainingForm.completionDate} onChange={(e) => setTrainingForm({ ...trainingForm, completionDate: e.target.value })} data-testid="input-training-completion-date" />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={trainingForm.expiryDate} onChange={(e) => setTrainingForm({ ...trainingForm, expiryDate: e.target.value })} data-testid="input-training-expiry-date" />
            </div>
            <div className="space-y-2">
              <Label>Certificate Reference</Label>
              <Input value={trainingForm.certificateRef} onChange={(e) => setTrainingForm({ ...trainingForm, certificateRef: e.target.value })} placeholder="Cert reference" data-testid="input-training-cert-ref" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={trainingForm.status} onValueChange={(v) => setTrainingForm({ ...trainingForm, status: v })}>
                <SelectTrigger data-testid="select-training-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea value={trainingForm.notes} onChange={(e) => setTrainingForm({ ...trainingForm, notes: e.target.value })} placeholder="Additional notes" data-testid="input-training-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrainingDialog(false)}>Cancel</Button>
            <Button onClick={() => saveTrainingMutation.mutate(trainingForm)} disabled={!trainingForm.staffName || !trainingForm.courseName || saveTrainingMutation.isPending} data-testid="button-save-training">
              {saveTrainingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTraining ? "Update" : "Add"} Training Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
            <DialogDescription>Log a safety or safeguarding incident</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Type</Label>
                <Select
                  value={incidentForm.incidentType}
                  onValueChange={(v) => setIncidentForm({ ...incidentForm, incidentType: v })}
                >
                  <SelectTrigger data-testid="select-incident-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abuse">Abuse</SelectItem>
                    <SelectItem value="neglect">Neglect</SelectItem>
                    <SelectItem value="self_harm_risk">Self-Harm Risk</SelectItem>
                    <SelectItem value="medical_issue">Medical Issue</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="lone_worker_danger">Lone Worker Danger</SelectItem>
                    <SelectItem value="missing_person_concern">Missing Person Concern</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={incidentForm.severity}
                  onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}
                >
                  <SelectTrigger data-testid="select-incident-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="immediate_danger">Immediate Danger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select
                value={incidentForm.clientId}
                onValueChange={(v) => setIncidentForm({ ...incidentForm, clientId: v })}
              >
                <SelectTrigger data-testid="select-incident-client">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific client</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.clientId}>
                      {client.nickname || client.client?.name || client.client?.email || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={incidentForm.description}
                onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                placeholder="Describe what happened..."
                rows={4}
                data-testid="input-incident-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                  placeholder="Address or description"
                  data-testid="input-incident-location"
                />
              </div>
              <div className="space-y-2">
                <Label>what3words</Label>
                <Input
                  value={incidentForm.what3words}
                  onChange={(e) => setIncidentForm({ ...incidentForm, what3words: e.target.value })}
                  placeholder="word.word.word"
                  data-testid="input-incident-w3w"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={incidentForm.isAnonymous}
                onCheckedChange={(v) => setIncidentForm({ ...incidentForm, isAnonymous: v })}
                data-testid="switch-incident-anonymous"
              />
              <Label>Report anonymously</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createIncidentMutation.mutate(incidentForm)}
              disabled={!incidentForm.description || createIncidentMutation.isPending}
              data-testid="button-submit-incident"
            >
              {createIncidentMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                "Submit Incident"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConcernDialog} onOpenChange={setShowConcernDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Welfare Concern</DialogTitle>
            <DialogDescription>Log a concern about a client's welfare</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concern Type</Label>
              <Select
                value={concernForm.concernType}
                onValueChange={(v) => setConcernForm({ ...concernForm, concernType: v })}
              >
                <SelectTrigger data-testid="select-concern-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welfare">General Welfare</SelectItem>
                  <SelectItem value="mental_health">Mental Health</SelectItem>
                  <SelectItem value="physical_health">Physical Health</SelectItem>
                  <SelectItem value="isolation">Social Isolation</SelectItem>
                  <SelectItem value="financial">Financial Concerns</SelectItem>
                  <SelectItem value="housing">Housing Issues</SelectItem>
                  <SelectItem value="relationship">Relationship Concerns</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select
                value={concernForm.clientId}
                onValueChange={(v) => setConcernForm({ ...concernForm, clientId: v })}
              >
                <SelectTrigger data-testid="select-concern-client">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific client</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.clientId}>
                      {client.nickname || client.client?.name || client.client?.email || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={concernForm.description}
                onChange={(e) => setConcernForm({ ...concernForm, description: e.target.value })}
                placeholder="Describe your concern..."
                rows={4}
                data-testid="input-concern-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Observed Behaviours (comma-separated)</Label>
              <Input
                value={concernForm.observedBehaviours}
                onChange={(e) => setConcernForm({ ...concernForm, observedBehaviours: e.target.value })}
                placeholder="e.g., withdrawn, not eating, anxious"
                data-testid="input-concern-behaviours"
              />
            </div>

            <div className="space-y-2">
              <Label>Send Concern To (email address)</Label>
              <Input
                type="email"
                value={concernForm.recipientEmail}
                onChange={(e) => setConcernForm({ ...concernForm, recipientEmail: e.target.value })}
                placeholder="e.g., safeguarding@organisation.com"
                data-testid="input-concern-recipient-email"
              />
              <p className="text-xs text-muted-foreground">Optional: Enter an email address to send this concern to</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={concernForm.isAnonymous}
                onCheckedChange={(v) => setConcernForm({ ...concernForm, isAnonymous: v })}
                data-testid="switch-concern-anonymous"
              />
              <Label>Report anonymously</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConcernDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createConcernMutation.mutate(concernForm)}
              disabled={!concernForm.description || createConcernMutation.isPending}
              data-testid="button-submit-concern"
            >
              {createConcernMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                "Submit Concern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Escalation Rule</DialogTitle>
            <DialogDescription>Define automatic escalation triggers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g., High-risk client missed check-ins"
                data-testid="input-rule-name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={ruleForm.triggerType}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, triggerType: v })}
                >
                  <SelectTrigger data-testid="select-rule-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="missed_checkins">Missed Check-ins</SelectItem>
                    <SelectItem value="sos_alerts">SOS Alerts</SelectItem>
                    <SelectItem value="incident_count">Incident Count</SelectItem>
                    <SelectItem value="concern_count">Concern Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Threshold</Label>
                <Input
                  type="number"
                  min={1}
                  value={ruleForm.triggerThreshold}
                  onChange={(e) => setRuleForm({ ...ruleForm, triggerThreshold: parseInt(e.target.value) || 1 })}
                  data-testid="input-rule-threshold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notify Emails (comma-separated)</Label>
              <Input
                value={ruleForm.notifyEmails}
                onChange={(e) => setRuleForm({ ...ruleForm, notifyEmails: e.target.value })}
                placeholder="manager@org.com, safeguarding@org.com"
                data-testid="input-rule-emails"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={ruleForm.isActive}
                onCheckedChange={(v) => setRuleForm({ ...ruleForm, isActive: v })}
                data-testid="switch-rule-active"
              />
              <Label>Rule is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createRuleMutation.mutate(ruleForm)}
              disabled={!ruleForm.name || !ruleForm.notifyEmails || createRuleMutation.isPending}
              data-testid="button-submit-rule"
            >
              {createRuleMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                "Create Rule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Case File</DialogTitle>
            <DialogDescription>Create a safeguarding case file for a client</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select onValueChange={(v) => createCaseFileMutation.mutate(v)}>
                <SelectTrigger data-testid="select-case-client">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.filter(c => !caseFiles?.some(cf => cf.clientId === c.clientId)).map((client) => (
                    <SelectItem key={client.id} value={client.clientId}>
                      {client.nickname || client.client?.name || client.client?.email || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCaseDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Case Note</DialogTitle>
            <DialogDescription>Add a note to this case file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note Type</Label>
              <Select
                value={noteForm.noteType}
                onValueChange={(v) => setNoteForm({ ...noteForm, noteType: v })}
              >
                <SelectTrigger data-testid="select-note-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="observation">Observation</SelectItem>
                  <SelectItem value="action">Action Taken</SelectItem>
                  <SelectItem value="meeting">Meeting Notes</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Enter note content..."
                rows={4}
                data-testid="input-note-content"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={noteForm.isConfidential}
                onCheckedChange={(v) => setNoteForm({ ...noteForm, isConfidential: v })}
                data-testid="switch-note-confidential"
              />
              <Label>Mark as confidential</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addCaseNoteMutation.mutate(noteForm)}
              disabled={!noteForm.content || addCaseNoteMutation.isPending}
              data-testid="button-submit-note"
            >
              {addCaseNoteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                "Add Note"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Date Range Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download {pdfType === "incidents" ? "Incidents" : pdfType === "concerns" ? "Concerns" : "Audit Trail"} Report
            </DialogTitle>
            <DialogDescription>
              Select a date range for the PDF report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Date Range</Label>
              <Select value={pdfDateRange} onValueChange={(v: "all" | "month" | "year" | "custom") => setPdfDateRange(v)}>
                <SelectTrigger data-testid="select-pdf-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pdfDateRange === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={pdfCustomStartDate}
                    onChange={(e) => setPdfCustomStartDate(e.target.value)}
                    data-testid="input-pdf-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={pdfCustomEndDate}
                    onChange={(e) => setPdfCustomEndDate(e.target.value)}
                    data-testid="input-pdf-end-date"
                  />
                </div>
              </div>
            )}

            {pdfDateRange !== "all" && pdfDateRange !== "custom" && (
              <p className="text-sm text-muted-foreground">
                Period: {getDateRange().label}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePdfDownload}
              disabled={pdfDateRange === "custom" && (!pdfCustomStartDate || !pdfCustomEndDate)}
              data-testid="button-generate-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
