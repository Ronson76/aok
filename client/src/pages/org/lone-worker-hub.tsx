import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Users, ArrowLeft, Plus, Loader2, Send, XCircle, Clock, CheckCircle,
  Search, Phone, Mail, ShieldCheck, LogOut, UserPlus, Trash2, Shield,
  Radio, MapPin, AlertTriangle, Siren, Eye, History, Briefcase,
  FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import type { LoneWorkerSession } from "@shared/schema";

interface StaffInvite {
  id: string;
  organizationId: string;
  bundleId: string;
  staffName: string;
  staffPhone: string;
  staffEmail: string | null;
  inviteCode: string;
  status: "pending" | "accepted" | "revoked";
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

interface StaffStats {
  totalInvites: number;
  pendingInvites: number;
  acceptedInvites: number;
  revokedInvites: number;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  bundles: Array<{ id: string; name: string; seatLimit: number; seatsUsed: number; status: string }>;
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
  createdAt: string;
}

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

function getSessionStatusBadge(status: string) {
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

function getInviteStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "accepted": return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    case "revoked": return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getAuditActionBadge(action: string, entityType: string) {
  if (entityType === "lone_worker_session") {
    switch (action) {
      case "session_started": return <Badge variant="outline" className="text-xs"><Radio className="h-3 w-3 mr-1" />Shift Started</Badge>;
      case "check_in_ok": return <Badge variant="outline" className="text-xs text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Checked In</Badge>;
      case "check_in_help_needed": return <Badge variant="outline" className="text-xs text-orange-600 border-orange-600"><AlertTriangle className="h-3 w-3 mr-1" />Help Needed</Badge>;
      case "panic_triggered": return <Badge variant="outline" className="text-xs text-red-600 border-red-600"><Siren className="h-3 w-3 mr-1" />Panic</Badge>;
      case "session_resolved": return <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" />Resolved</Badge>;
      default: return <Badge variant="outline" className="text-xs capitalize">{action.replace(/_/g, " ")}</Badge>;
    }
  }
  switch (action) {
    case "created": return <Badge variant="outline" className="text-xs"><Plus className="h-3 w-3 mr-1" />Invited</Badge>;
    case "resent": return <Badge variant="outline" className="text-xs"><Send className="h-3 w-3 mr-1" />Resent</Badge>;
    case "revoked": return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    case "deleted": return <Badge variant="outline" className="text-xs text-red-600 border-red-600"><Trash2 className="h-3 w-3 mr-1" />Deleted</Badge>;
    default: return <Badge variant="outline" className="text-xs capitalize">{action.replace(/_/g, " ")}</Badge>;
  }
}

export default function OrgLoneWorkerHub() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mainTab, setMainTab] = useState("monitor");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffCountryCode, setStaffCountryCode] = useState("+44");
  const [staffEmail, setStaffEmail] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecCountryCode, setEcCountryCode] = useState("+44");
  const [ecEmail, setEcEmail] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [expandedAuditUsers, setExpandedAuditUsers] = useState<Set<string>>(new Set());
  const [expandedHistoryUsers, setExpandedHistoryUsers] = useState<Set<string>>(new Set());

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutRef = useRef(logout);
  const toastRef = useRef(toast);
  const setLocationRef = useRef(setLocation);

  useEffect(() => {
    logoutRef.current = logout;
    toastRef.current = toast;
    setLocationRef.current = setLocation;
  }, [logout, toast, setLocation]);

  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      toastRef.current({ title: "Session expired", description: "You have been logged out due to inactivity.", variant: "destructive" });
      try {
        await logoutRef.current();
      } catch (e) {
        // Session may already be expired on server - that's fine
      }
      queryClient.clear();
      setLocationRef.current("/org/login");
    }, 15 * 60 * 1000);
  }, []);

  useEffect(() => {
    resetInactivityTimer();
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetInactivityTimer]);

  const handleLogout = async () => {
    await logout();
    setLocation("/org/login");
  };

  const { data: stats, isLoading: statsLoading } = useQuery<StaffStats>({
    queryKey: ["/api/org/staff/stats"],
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<StaffInvite[]>({
    queryKey: ["/api/org/staff/invites"],
  });

  const { data: auditTrail } = useQuery<AuditEntry[]>({
    queryKey: ["/api/org/staff/audit-trail"],
  });

  const activeSessionsQuery = useQuery<SessionWithUser[]>({
    queryKey: ["/api/org/lone-worker/active"],
    refetchInterval: 10000,
  });

  const sessionHistoryQuery = useQuery<(LoneWorkerSession & { userName: string })[]>({
    queryKey: ["/api/org/lone-worker/history"],
  });

  const formatFullPhone = (countryCode: string, phone: string) => {
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digits}`;
  };

  const parsePhoneForForm = (fullPhone: string) => {
    const codes = ["+353", "+44", "+49", "+33", "+1"];
    for (const code of codes) {
      if (fullPhone.startsWith(code)) {
        return { countryCode: code, phone: fullPhone.slice(code.length) };
      }
    }
    return { countryCode: "+44", phone: fullPhone.replace(/^\+?\d{1,3}/, "") };
  };

  const createInviteMutation = useMutation({
    mutationFn: async (data: { staffName: string; staffPhone: string; staffEmail: string; bundleId: string; emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactEmail?: string; emergencyContactRelationship?: string }) => {
      const res = await apiRequest("POST", "/api/org/staff/invite", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowInviteDialog(false);
      resetInviteForm();
      toast({
        title: "Invite sent",
        description: data.smsSent
          ? "SMS sent with invite code."
          : "Invite created but SMS delivery failed. You can resend it later.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await apiRequest("POST", `/api/org/staff/invite/${inviteId}/revoke`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      toast({ title: "Invite revoked" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await apiRequest("DELETE", `/api/org/staff/invite/${inviteId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowDeleteConfirm(null);
      toast({ title: "Invite deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (data: { inviteId: string; staffName: string; staffPhone: string; staffEmail: string }) => {
      const res = await apiRequest("POST", `/api/org/staff/invite/${data.inviteId}/resend`, {
        staffName: data.staffName,
        staffPhone: data.staffPhone,
        staffEmail: data.staffEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowInviteDialog(false);
      setResendingInviteId(null);
      resetInviteForm();
      toast({ title: "Invite resent", description: "The invite SMS has been resent with updated details." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetInviteForm = () => {
    setStaffName("");
    setStaffPhone("");
    setStaffCountryCode("+44");
    setStaffEmail("");
    setSelectedBundleId("");
    setEcName("");
    setEcPhone("");
    setEcCountryCode("+44");
    setEcEmail("");
    setEcRelationship("");
    setResendingInviteId(null);
  };

  const openResendDialog = (invite: StaffInvite) => {
    const parsed = parsePhoneForForm(invite.staffPhone);
    setStaffName(invite.staffName);
    setStaffPhone(parsed.phone);
    setStaffCountryCode(parsed.countryCode);
    setStaffEmail(invite.staffEmail || "");
    setSelectedBundleId(invite.bundleId);
    setResendingInviteId(invite.id);
    setShowInviteDialog(true);
  };

  const handleSubmitInvite = () => {
    if (!staffName.trim() || !staffPhone.trim() || !staffEmail.trim()) {
      toast({ title: "Missing fields", description: "Please fill in name, mobile number, and email.", variant: "destructive" });
      return;
    }
    if (!ecName.trim() || !ecPhone.trim() || !ecEmail.trim() || !ecRelationship.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all emergency contact details including email.", variant: "destructive" });
      return;
    }
    if (!selectedBundleId && !resendingInviteId) {
      toast({ title: "Missing fields", description: "Please select a bundle.", variant: "destructive" });
      return;
    }
    const fullPhone = formatFullPhone(staffCountryCode, staffPhone);
    const fullEcPhone = formatFullPhone(ecCountryCode, ecPhone);
    if (resendingInviteId) {
      resendMutation.mutate({ inviteId: resendingInviteId, staffName: staffName.trim(), staffPhone: fullPhone, staffEmail: staffEmail.trim() });
    } else {
      createInviteMutation.mutate({
        staffName: staffName.trim(),
        staffPhone: fullPhone,
        staffEmail: staffEmail.trim(),
        bundleId: selectedBundleId,
        emergencyContactName: ecName.trim(),
        emergencyContactPhone: fullEcPhone,
        emergencyContactEmail: ecEmail.trim(),
        emergencyContactRelationship: ecRelationship.trim(),
      });
    }
  };

  const filteredInvites = invites?.filter(invite => {
    const matchesSearch = !searchQuery ||
      invite.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.staffPhone.includes(searchQuery) ||
      (invite.staffEmail && invite.staffEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = inviteFilter === "all" || invite.status === inviteFilter;
    return matchesSearch && matchesTab;
  }) || [];

  const filteredAudit = (auditTrail || []).filter(entry => {
    if (auditFilter === "all") return true;
    if (auditFilter === "lone_worker") return entry.entityType === "lone_worker_session";
    if (auditFilter === "invites") return entry.entityType === "staff_invite";
    return true;
  });

  const auditGroupedByUser = (() => {
    const groups: Record<string, AuditEntry[]> = {};
    for (const entry of filteredAudit) {
      const name = entry.newData?.staffName || entry.newData?.userName || entry.userEmail;
      if (!groups[name]) groups[name] = [];
      groups[name].push(entry);
    }
    return Object.entries(groups).sort((a, b) => {
      const latestA = new Date(a[1][0].createdAt).getTime();
      const latestB = new Date(b[1][0].createdAt).getTime();
      return latestB - latestA;
    });
  })();

  const historyGroupedByUser = (() => {
    const resolved = (sessionHistoryQuery.data || []).filter((s: any) => s.status === "resolved");
    const groups: Record<string, typeof resolved> = {};
    for (const s of resolved) {
      const name = (s as any).userName || "Unknown";
      if (!groups[name]) groups[name] = [];
      groups[name].push(s);
    }
    return Object.entries(groups).sort((a, b) => {
      const latestA = a[1][0]?.resolvedAt ? new Date(String(a[1][0].resolvedAt)).getTime() : 0;
      const latestB = b[1][0]?.resolvedAt ? new Date(String(b[1][0].resolvedAt)).getTime() : 0;
      return latestB - latestA;
    });
  })();

  const toggleAuditUser = (name: string) => {
    setExpandedAuditUsers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleHistoryUser = (name: string) => {
    setExpandedHistoryUsers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const activeSessions = (activeSessionsQuery.data || []).sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
  const panicCount = activeSessions.filter(s => s.status === "panic").length;
  const unresponsiveCount = activeSessions.filter(s => s.status === "unresponsive").length;
  const activeCount = activeSessions.filter(s => s.status === "active" || s.status === "check_in_due").length;

  const isMutating = createInviteMutation.isPending || resendMutation.isPending;
  const isLoading = statsLoading || invitesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            data-testid="link-home-logo"
            onClick={async () => { await logout(); setLocation("/"); }}
          >
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-hub-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/org/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-hub-title">
                <Shield className="h-6 w-6" /> Lone Worker Hub
              </h1>
              <p className="text-muted-foreground">Monitor active shifts, manage staff, and view audit trail</p>
            </div>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            disabled={!stats?.availableSeats || stats.availableSeats <= 0}
            data-testid="button-invite-staff"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Staff
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <Card className={panicCount > 0 ? "border-red-600 border-2" : ""}>
            <CardContent className="py-3 text-center">
              <p className={`text-2xl font-bold ${panicCount > 0 ? "text-red-600 animate-pulse" : "text-red-600"}`} data-testid="text-panic-count">{panicCount}</p>
              <p className="text-xs text-muted-foreground">Panic</p>
            </CardContent>
          </Card>
          <Card className={unresponsiveCount > 0 ? "border-orange-500" : ""}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-orange-500" data-testid="text-unresponsive-count">{unresponsiveCount}</p>
              <p className="text-xs text-muted-foreground">Unresponsive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-green-600" data-testid="text-active-count">{activeCount}</p>
              <p className="text-xs text-muted-foreground">On Shift</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold" data-testid="text-accepted-staff">{stats?.acceptedInvites || 0}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold" data-testid="text-pending-invites">{stats?.pendingInvites || 0}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold" data-testid="text-seats-available">{stats?.availableSeats || 0}</p>
              <p className="text-xs text-muted-foreground">Seats Free</p>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="monitor" data-testid="tab-monitor">
              <Radio className="h-4 w-4 mr-1" /> Live Monitor
              {panicCount > 0 && <span className="ml-1 w-2 h-2 bg-red-600 rounded-full animate-pulse inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff">
              <Users className="h-4 w-4 mr-1" /> Staff
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <FileText className="h-4 w-4 mr-1" /> Audit Trail
            </TabsTrigger>
          </TabsList>

          {/* ========== LIVE MONITOR TAB ========== */}
          <TabsContent value="monitor" className="space-y-4">
            {activeSessionsQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : activeSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active lone worker sessions</p>
                  <p className="text-sm text-muted-foreground">Staff sessions will appear here when they start a shift</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((s) => (
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
                        {getSessionStatusBadge(s.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Started: {s.startedAt ? format(new Date(s.startedAt), "HH:mm") : "—"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Radio className="w-3 h-3" /> Interval: {s.checkInIntervalMins}m
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Last: {s.lastCheckInAt ? formatDistanceToNow(new Date(s.lastCheckInAt), { addSuffix: true }) : "—"}
                        </div>
                        {s.userPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${s.userPhone}`} className="text-primary underline">{s.userPhone}</a>
                          </div>
                        )}
                      </div>
                      {s.status === "panic" && s.panicTriggeredAt && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-700 dark:text-red-300 flex items-center gap-2 flex-wrap">
                          <Siren className="w-4 h-4 flex-shrink-0" />
                          <span>Panic triggered {formatDistanceToNow(new Date(s.panicTriggeredAt), { addSuffix: true })}</span>
                          {s.lastLocationLat && s.lastLocationLng && (
                            <a
                              href={`https://maps.google.com/?q=${s.lastLocationLat},${s.lastLocationLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto underline flex items-center gap-1"
                              data-testid={`link-location-${s.id}`}
                            >
                              <MapPin className="w-3 h-3" /> View Location
                            </a>
                          )}
                        </div>
                      )}
                      {s.status === "unresponsive" && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2 flex-wrap">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>Missed check-in — staff member unresponsive</span>
                          {s.lastLocationLat && s.lastLocationLng && (
                            <a
                              href={`https://maps.google.com/?q=${s.lastLocationLat},${s.lastLocationLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto underline flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" /> Last Known Location
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {historyGroupedByUser.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground">Recently Resolved</h3>
                {historyGroupedByUser.map(([userName, sessions]) => (
                  <Card key={userName} className="opacity-75 overflow-visible">
                    <CardContent className="py-0">
                      <button
                        onClick={() => toggleHistoryUser(userName)}
                        className="w-full py-3 flex items-center justify-between gap-2 text-left"
                        data-testid={`button-history-user-${userName.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{userName}</span>
                          <Badge variant="secondary">{sessions.length}</Badge>
                        </div>
                        {expandedHistoryUsers.has(userName) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedHistoryUsers.has(userName) && (
                        <div className="space-y-2 pb-3 border-t pt-3">
                          {sessions.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between flex-wrap gap-2 p-2 rounded border text-sm">
                              <div>
                                <p className="text-sm">{JOB_LABELS[s.jobType] || s.jobType}</p>
                                {s.jobDescription && <p className="text-xs text-muted-foreground">{s.jobDescription}</p>}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{s.resolvedAt ? format(new Date(s.resolvedAt), "dd/MM/yyyy HH:mm") : "—"}</p>
                                {s.outcome && <p className="capitalize">{s.outcome.replace(/_/g, " ")}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== STAFF TAB ========== */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>Staff Members</CardTitle>
                  <CardDescription>
                    {invites && invites.length > 0
                      ? `${filteredInvites.length} of ${invites.length} staff invitations`
                      : "No staff invitations yet"}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-staff"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={inviteFilter} onValueChange={setInviteFilter}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                    <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted" data-testid="tab-accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="revoked" data-testid="tab-revoked">Revoked</TabsTrigger>
                  </TabsList>

                  <div className="space-y-3">
                    {filteredInvites.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No invitations match your search." : "No invitations in this category."}
                      </div>
                    ) : (
                      filteredInvites.map((invite) => (
                        <Card key={invite.id} className="overflow-visible" data-testid={`card-invite-${invite.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium" data-testid={`text-staff-name-${invite.id}`}>{invite.staffName}</span>
                                  {getInviteStatusBadge(invite.status)}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{invite.staffPhone}</span>
                                  {invite.staffEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{invite.staffEmail}</span>}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                  <span>Sent: {format(new Date(invite.createdAt), "dd/MM/yyyy HH:mm")}</span>
                                  {invite.acceptedAt && <span>Accepted: {format(new Date(invite.acceptedAt), "dd/MM/yyyy HH:mm")}</span>}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {invite.status === "pending" && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openResendDialog(invite)} data-testid={`button-resend-${invite.id}`}>
                                      <Send className="h-3 w-3 mr-1" /> Resend
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(invite.id)} disabled={revokeMutation.isPending} data-testid={`button-revoke-${invite.id}`}>
                                      <XCircle className="h-3 w-3 mr-1" /> Revoke
                                    </Button>
                                  </>
                                )}
                                <Button variant="outline" size="sm" className="text-destructive border-destructive/50" onClick={() => setShowDeleteConfirm(invite.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-${invite.id}`}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== AUDIT TRAIL TAB ========== */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Complete log of all lone worker and staff actions</CardDescription>
                  </div>
                  <Tabs value={auditFilter} onValueChange={setAuditFilter}>
                    <TabsList>
                      <TabsTrigger value="all" data-testid="tab-audit-all">All</TabsTrigger>
                      <TabsTrigger value="lone_worker" data-testid="tab-audit-sessions">Sessions</TabsTrigger>
                      <TabsTrigger value="invites" data-testid="tab-audit-invites">Invites</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {auditGroupedByUser.length > 0 ? (
                  <div className="space-y-2">
                    {auditGroupedByUser.map(([userName, entries]) => (
                      <div key={userName} className="rounded-lg border overflow-visible">
                        <button
                          onClick={() => toggleAuditUser(userName)}
                          className="w-full p-3 flex items-center justify-between gap-2 text-left hover-elevate rounded-lg"
                          data-testid={`button-audit-user-${userName.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{userName}</span>
                            <Badge variant="secondary">{entries.length}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Latest: {format(new Date(entries[0].createdAt), "dd/MM/yyyy HH:mm")}
                            </span>
                            {expandedAuditUsers.has(userName) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        {expandedAuditUsers.has(userName) && (
                          <div className="border-t px-3 pb-3 space-y-2 pt-2">
                            {entries.map((entry) => (
                              <div key={entry.id} className="p-2 rounded border flex items-start justify-between gap-4 flex-wrap" data-testid={`audit-entry-${entry.id}`}>
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getAuditActionBadge(entry.action, entry.entityType)}
                                    <span className="text-sm font-medium capitalize">{entry.entityType.replace(/_/g, " ")}</span>
                                  </div>
                                  {entry.entityType === "lone_worker_session" && entry.newData && (
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      {entry.newData.jobType && <span className="mr-3">Job: {JOB_LABELS[entry.newData.jobType] || entry.newData.jobType}</span>}
                                      {entry.newData.expectedDurationMins && <span className="mr-3">Duration: {entry.newData.expectedDurationMins}m</span>}
                                      {entry.newData.outcome && <span className="mr-3">Outcome: {entry.newData.outcome.replace(/_/g, " ")}</span>}
                                      {entry.newData.notes && <p className="mt-1">Notes: {entry.newData.notes}</p>}
                                      {entry.newData.lat && entry.newData.lng && (
                                        <a
                                          href={`https://maps.google.com/?q=${entry.newData.lat},${entry.newData.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary underline inline-flex items-center gap-1"
                                        >
                                          <MapPin className="w-3 h-3" /> Location
                                        </a>
                                      )}
                                      {entry.newData.what3words && <span className="ml-2">w3w: {entry.newData.what3words}</span>}
                                    </div>
                                  )}
                                  {entry.entityType === "staff_invite" && (
                                    <p className="text-xs text-muted-foreground">
                                      {(entry.newData?.staffName || entry.previousData?.staffName) && <span>Name: {entry.newData?.staffName || entry.previousData?.staffName}</span>}
                                      {(entry.newData?.staffPhone || entry.previousData?.staffPhone) && <span className="ml-3">Phone: {entry.newData?.staffPhone || entry.previousData?.staffPhone}</span>}
                                      {(entry.newData?.staffEmail || entry.previousData?.staffEmail) && <span className="ml-3">Email: {entry.newData?.staffEmail || entry.previousData?.staffEmail}</span>}
                                    </p>
                                  )}
                                  {entry.ipAddress && <p className="text-xs text-muted-foreground">IP: {entry.ipAddress}</p>}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No audit entries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => { setShowInviteDialog(open); if (!open) resetInviteForm(); }}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{resendingInviteId ? "Resend Invite" : "Invite Staff Member"}</DialogTitle>
            <DialogDescription>
              {resendingInviteId
                ? "Review and update details before resending the invite SMS."
                : "Send an SMS invitation to a staff member. They will go through the full onboarding process at no cost."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="staffName">Full Name *</Label>
              <Input id="staffName" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="e.g. Jane Smith" data-testid="input-staff-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email *</Label>
              <Input id="staffEmail" type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="e.g. jane@example.com" data-testid="input-staff-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffPhone">Mobile Number *</Label>
              <div className="flex gap-2">
                <Select value={staffCountryCode} onValueChange={setStaffCountryCode}>
                  <SelectTrigger className="w-28" data-testid="select-staff-country-code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+44">+44 UK</SelectItem>
                    <SelectItem value="+1">+1 US</SelectItem>
                    <SelectItem value="+353">+353 IE</SelectItem>
                    <SelectItem value="+33">+33 FR</SelectItem>
                    <SelectItem value="+49">+49 DE</SelectItem>
                  </SelectContent>
                </Select>
                <Input id="staffPhone" type="tel" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-staff-phone" />
              </div>
              <p className="text-xs text-muted-foreground">Leading zero will be removed automatically</p>
            </div>
            {!resendingInviteId && (
              <div className="space-y-2">
                <Label htmlFor="bundleId">Bundle *</Label>
                <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                  <SelectTrigger data-testid="select-bundle">
                    <SelectValue placeholder="Select a bundle" />
                  </SelectTrigger>
                  <SelectContent>
                    {stats?.bundles?.map((bundle) => (
                      <SelectItem key={bundle.id} value={bundle.id} data-testid={`option-bundle-${bundle.id}`}>
                        {bundle.name} ({bundle.seatLimit - bundle.seatsUsed} seats available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Emergency Contact *</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="ecName">Contact Name *</Label>
                  <Input id="ecName" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g. John Smith" data-testid="input-ec-name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecPhone">Contact Phone *</Label>
                  <div className="flex gap-2">
                    <Select value={ecCountryCode} onValueChange={setEcCountryCode}>
                      <SelectTrigger className="w-28" data-testid="select-ec-country-code">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+44">+44 UK</SelectItem>
                        <SelectItem value="+1">+1 US</SelectItem>
                        <SelectItem value="+353">+353 IE</SelectItem>
                        <SelectItem value="+33">+33 FR</SelectItem>
                        <SelectItem value="+49">+49 DE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input id="ecPhone" type="tel" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-ec-phone" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecEmail">Contact Email *</Label>
                  <Input id="ecEmail" type="email" value={ecEmail} onChange={(e) => setEcEmail(e.target.value)} placeholder="e.g. john@example.com" data-testid="input-ec-email" />
                  <p className="text-xs text-muted-foreground">A confirmation email will be sent to this address</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecRelationship">Relationship *</Label>
                  <Select value={ecRelationship} onValueChange={setEcRelationship}>
                    <SelectTrigger data-testid="select-ec-relationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); resetInviteForm(); }}>Cancel</Button>
            <Button onClick={handleSubmitInvite} disabled={isMutating} data-testid="button-send-invite">
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {resendingInviteId ? "Resend Invite" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invitation</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete this invitation? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (showDeleteConfirm) deleteMutation.mutate(showDeleteConfirm); }} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}