import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OrgHelpButton } from "@/components/org-help-center";
import { OrgGuidedTour } from "@/components/org-guided-tour";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, CheckCircle, Clock, AlertTriangle, AlertOctagon, Loader2, Trash2, Eye, EyeOff, Key, KeyRound, User, Phone, Mail, FileText, MapPin, Edit2, Pause, Play, XCircle, X, LogOut, Settings, TrendingUp, PawPrint, Scroll, ExternalLink, Smartphone, Shield, ShieldCheck, Plus, RotateCcw, Bell, BellOff, Search, Archive, Upload, Download, FileSpreadsheet, CheckCircle2, XOctagon, Video, Scale, PenLine, Share2, Copy, ClipboardList, ChevronDown, ChevronUp, ChevronRight, Filter, ArrowLeft, ArrowRight, BarChart3, Calendar, MessageSquare, Camera } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationDashboardStats, OrganizationClientWithDetails, OrganizationBundle, OrganizationClientProfile, AlertLog, OrgClientStatus, Contact, AuditTrailEntry } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { ActiveSOSPanel } from "@/components/active-sos-panel";

function getStatusIcon(status: "safe" | "pending" | "overdue", size: "sm" | "md" = "sm") {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  switch (status) {
    case "safe":
      return <CheckCircle className={`${iconClass} text-primary`} />;
    case "pending":
      return <Clock className={`${iconClass} text-yellow-500`} />;
    case "overdue":
      return <AlertTriangle className={`${iconClass} text-destructive`} />;
  }
}

function getStatusBadge(status: "safe" | "pending" | "overdue") {
  switch (status) {
    case "safe":
      return <Badge variant="default" data-testid="badge-status-safe">Safe</Badge>;
    case "pending":
      return <Badge variant="secondary" data-testid="badge-status-pending">Pending</Badge>;
    case "overdue":
      return <Badge variant="destructive" data-testid="badge-status-overdue">Overdue</Badge>;
  }
}

function getClientStatusBadge(status: OrgClientStatus) {
  switch (status) {
    case "active":
      return <Badge variant="outline" className="text-primary border-primary" data-testid="badge-client-active">Active</Badge>;
    case "paused":
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600" data-testid="badge-client-paused">Paused</Badge>;
    case "terminated":
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground" data-testid="badge-client-terminated">Terminated</Badge>;
  }
}

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function OrganizationDashboard() {
  const { toast } = useToast();
  const { logout, user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<OrganizationClientWithDetails | null>(null);
  
  // Edit client dialog state
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<OrganizationClientWithDetails | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("+44");
  
  // Permanent delete confirmation state
  const [permanentDeleteClient, setPermanentDeleteClient] = useState<any>(null);
  
  // Emergency contacts state
  const [showEmergencyContactsDialog, setShowEmergencyContactsDialog] = useState(false);
  const [emergencyContactsClient, setEmergencyContactsClient] = useState<OrganizationClientWithDetails | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; email: string; phone: string; relationship?: string }[]>([]);
  
  // Inactivity timeout for security
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutRef = useRef(logout);
  const toastRef = useRef(toast);
  const setLocationRef = useRef(setLocation);
  
  // Keep refs updated
  useEffect(() => {
    logoutRef.current = logout;
    toastRef.current = toast;
    setLocationRef.current = setLocation;
  }, [logout, toast, setLocation]);
  
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/org-member/logout", { method: "POST", credentials: "include" });
      } catch (e) {}
      try {
        await logoutRef.current();
      } catch (e) {}
      queryClient.clear();
      setLocationRef.current("/org/staff-login?sessionExpired=true");
    }, SESSION_TIMEOUT_MS);
  }, []);
  
  useEffect(() => {
    // Only track low-frequency user interaction events
    const events = ["mousedown", "keydown", "touchstart"];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });
    
    resetInactivityTimer();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetInactivityTimer]);
  
  // Auto-logout when navigating away from org pages entirely
  useEffect(() => {
    return () => {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/org/")) {
        logoutRef.current();
      }
    };
  }, []);
  
  const handleLogout = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    try {
      await fetch("/api/org-member/logout", { method: "POST", credentials: "include" });
    } catch (e) {}
    try {
      await logout();
    } catch (e) {}
    queryClient.clear();
    window.location.href = "/";
  };
  
  // New client registration form state
  const [showRegisterClientDialog, setShowRegisterClientDialog] = useState(false);
  const [regClientName, setRegClientName] = useState("");
  const [regClientPhone, setRegClientPhone] = useState("");
  const [regCountryCode, setRegCountryCode] = useState("+44");
  const [regClientDOB, setRegClientDOB] = useState("");
  const [regBundleId, setRegBundleId] = useState("");
  const [regSupervisorName, setRegSupervisorName] = useState("");
  const [regSupervisorPhone, setRegSupervisorPhone] = useState("");
  const [regSupervisorEmail, setRegSupervisorEmail] = useState("");
  const [regSupervisorCountryCode, setRegSupervisorCountryCode] = useState("+44");
  const [supervisorSmsVerified, setSupervisorSmsVerified] = useState(false);
  const [supervisorSmsCode, setSupervisorSmsCode] = useState("");
  const [supervisorSmsSending, setSupervisorSmsSending] = useState(false);
  const [supervisorSmsVerifying, setSupervisorSmsVerifying] = useState(false);
  const [supervisorSmsSent, setSupervisorSmsSent] = useState(false);
  const [regEmergencyNotes, setRegEmergencyNotes] = useState("");
  const [regScheduleStart, setRegScheduleStart] = useState("");
  const [regIntervalHours, setRegIntervalHours] = useState(24);
  const [regEmergencyContacts, setRegEmergencyContacts] = useState<Array<{
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    phoneType: "mobile" | "landline";
    relationship: string;
    isPrimary: boolean;
  }>>([]);
  
  // Feature toggles for new client registration (all ON by default)
  const [regFeatures, setRegFeatures] = useState({
    featureWellbeingAi: true,
    featureShakeToAlert: true,
    featureMoodTracking: true,
    featurePetProtection: true,
    featureDigitalWill: true,
    featureEmergencyRecording: false,
  });
  
  // Excel import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "results">("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<Array<{
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    dateOfBirth: string;
    specialNeeds: string;
    medicalNotes: string;
    emergencyInstructions: string;
    checkInIntervalHours: number;
    emergencyContacts: Array<{ name: string; email: string; phone: string; relationship: string }>;
  }>>([]);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; errors: string[] }>>([]);
  const [importResults, setImportResults] = useState<Array<{ row: number; clientName: string; success: boolean; referenceCode?: string; error?: string }>>([]);
  const [importBundleId, setImportBundleId] = useState("");

  const [showResendPasswordDialog, setShowResendPasswordDialog] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);

  const [showSendDataCaptureDialog, setShowSendDataCaptureDialog] = useState(false);
  const [dataCaptureMethod, setDataCaptureMethod] = useState<"sms" | "email">("sms");
  const [dataCaptureRecipient, setDataCaptureRecipient] = useState("");
  const [dataCaptureCountryCode, setDataCaptureCountryCode] = useState("+44");
  const [dataCapturePassword, setDataCapturePassword] = useState("");

  // Birthday upgrade transition state
  const [showBirthdayUpgradeDialog, setShowBirthdayUpgradeDialog] = useState(false);
  const [birthdayUpgradeClient, setBirthdayUpgradeClient] = useState<{ orgClientId: string; clientName: string | null; dateOfBirth: string | null } | null>(null);
  const [birthdayUpgradePhone, setBirthdayUpgradePhone] = useState("");
  const [birthdayUpgradeCountryCode, setBirthdayUpgradeCountryCode] = useState("+44");

  const [resendPasswordClientId, setResendPasswordClientId] = useState<string | null>(null);
  const [resendPasswordClientName, setResendPasswordClientName] = useState<string>("");
  const [resendPasswordIsRegistered, setResendPasswordIsRegistered] = useState(true);
  
  // Change own password dialog state
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<Partial<OrganizationClientProfile> & { phone?: string; email?: string }>({});
  
  // Client search state
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchRef, setSearchRef] = useState("");
  
  // Alert view state
  const [clientAlerts, setClientAlerts] = useState<{ alerts: AlertLog[]; counts: { total: number; emails: number; calls: number; emergencies: number } } | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  
  // Client contacts state
  const [clientContacts, setClientContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "+44",
    phoneType: "mobile" as "mobile" | "landline",
    relationship: "",
    isPrimary: false,
  });
  const [profileCountryCode, setProfileCountryCode] = useState("+44");

  // Client feature settings state (all ON by default)
  const [clientFeatures, setClientFeatures] = useState({
    featureWellbeingAi: true,
    featureShakeToAlert: true,
    featureMoodTracking: true,
    featurePetProtection: true,
    featureDigitalWill: true,
    featureEmergencyRecording: false,
  });
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleClientId, setScheduleClientId] = useState<string | null>(null);
  const [scheduleClientName, setScheduleClientName] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("10:00");
  const [scheduleIntervalHours, setScheduleIntervalHours] = useState(24);

  // Interval slider values (1 hour to 48 hours)
  const INTERVAL_VALUES = [1, 2, 3, 4, 6, 8, 12, 24, 36, 48];
  const hoursToIndex = (hours: number) => {
    const idx = INTERVAL_VALUES.findIndex(v => v >= hours);
    return idx >= 0 ? idx : INTERVAL_VALUES.length - 1;
  };
  const formatInterval = (hours: number) => {
    if (hours < 1) {
      const mins = Math.round(hours * 60);
      return `${mins} min${mins !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj } = useQuery<OrganizationDashboardStats>({
    queryKey: ["/api/org/dashboard"],
    retry: false,
    refetchInterval: 5000,
  });

  const { data: clients, isLoading: clientsLoading, isError: clientsError } = useQuery<OrganizationClientWithDetails[]>({
    queryKey: ["/api/org/clients"],
    retry: false,
    refetchInterval: 5000,
  });

  const { data: archivedClients } = useQuery<any[]>({
    queryKey: ["/api/org/clients/archived"],
    refetchInterval: 5000,
  });

  const { data: birthdayTransitions } = useQuery<{ transitions: Array<{ orgClientId: string; clientName: string | null; dateOfBirth: string | null }> }>({
    queryKey: ["/api/org/clients/birthday-transitions"],
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (birthdayTransitions?.transitions?.length && !showBirthdayUpgradeDialog && !birthdayUpgradeClient) {
      const first = birthdayTransitions.transitions[0];
      setBirthdayUpgradeClient(first);
      setShowBirthdayUpgradeDialog(true);
    }
  }, [birthdayTransitions]);

  const { data: myRoleData } = useQuery<{ role: string }>({
    queryKey: ["/api/org/my-role"],
  });
  const isSenior = myRoleData?.role === "owner" || myRoleData?.role === "manager";

  // Audit trail state
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("all");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditPage, setAuditPage] = useState(0);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [expandedAuditEntry, setExpandedAuditEntry] = useState<string | null>(null);
  const [auditGroupBy, setAuditGroupBy] = useState<"none" | "date" | "user">("date");
  const [expandedAuditGroups, setExpandedAuditGroups] = useState<Set<string>>(new Set());
  const [showRetentionSettings, setShowRetentionSettings] = useState(false);
  const [retentionDays, setRetentionDays] = useState(2190);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionLoaded, setRetentionLoaded] = useState(false);
  const AUDIT_PAGE_SIZE = 20;

  useEffect(() => {
    if (showRetentionSettings && !retentionLoaded) {
      fetch("/api/org/settings/retention", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data.retentionPolicyDays) setRetentionDays(data.retentionPolicyDays);
          setRetentionLoaded(true);
        })
        .catch(() => {});
    }
  }, [showRetentionSettings, retentionLoaded]);

  const auditQueryParams = new URLSearchParams();
  if (auditEntityFilter !== "all") auditQueryParams.set("entityType", auditEntityFilter);
  if (auditActionFilter !== "all") auditQueryParams.set("action", auditActionFilter);
  if (auditSearch.trim()) auditQueryParams.set("search", auditSearch.trim());
  auditQueryParams.set("limit", String(AUDIT_PAGE_SIZE));
  auditQueryParams.set("offset", String(auditPage * AUDIT_PAGE_SIZE));

  const { data: auditData, isLoading: auditLoading } = useQuery<{ entries: AuditTrailEntry[]; total: number }>({
    queryKey: ["/api/org/audit-trail", auditEntityFilter, auditActionFilter, auditSearch, auditPage],
    queryFn: async () => {
      const res = await fetch(`/api/org/audit-trail?${auditQueryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit trail");
      return res.json();
    },
    enabled: showAuditTrail,
  });

  const { data: expirationWarning } = useQuery<{
    warning: boolean;
    monthsRemaining?: number;
    daysRemaining?: number;
    expirationDate?: string;
    oldestEntryDate?: string;
    totalEntries?: number;
    expired?: boolean;
  }>({
    queryKey: ["/api/org/audit-trail/expiration-warning"],
    queryFn: async () => {
      const res = await fetch("/api/org/audit-trail/expiration-warning", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check audit expiration");
      return res.json();
    },
    refetchInterval: 1000 * 60 * 60,
  });

  const { data: legalDocsData, refetch: refetchLegalDocs } = useQuery<{
    assignedDocuments: Array<{ id: string; organisationId: string; organisationName: string; documentId: string; assignedAt: string; signedAt?: string; signatureId?: string }>;
    signatures: Array<{ id: string; documentId: string; signerName: string; signerEmail: string; signerRole: string; signedAt: string }>;
    isValid: boolean;
    totalRequired: number;
    totalSigned: number;
  }>({
    queryKey: ["/api/org/legal-documents"],
  });

  const [showLegalSignDialog, setShowLegalSignDialog] = useState(false);
  const [legalSignDocId, setLegalSignDocId] = useState("");
  const [legalSignDocTitle, setLegalSignDocTitle] = useState("");
  const [legalSignerName, setLegalSignerName] = useState("");
  const [legalSignerEmail, setLegalSignerEmail] = useState("");
  const [legalSignerRole, setLegalSignerRole] = useState("");
  const [legalSignConsent, setLegalSignConsent] = useState(false);
  const [legalSignTypedSig, setLegalSignTypedSig] = useState("");

  const docIdToTitle: Record<string, string> = {
    eula: "EULA", privacy: "Privacy Policy", terms: "Terms and Conditions",
    "enterprise-licence": "Enterprise Licence", "data-processing-addendum": "Data Processing Addendum",
    sla: "SLA", "lone-worker-addendum": "Lone Worker Addendum",
    "ip-ownership": "IP Ownership Agreement", nda: "NDA",
  };

  const legalSignMutation = useMutation({
    mutationFn: async (data: { documentId: string; signerName: string; signerEmail: string; signerRole: string }) => {
      const res = await apiRequest("POST", "/api/org/legal-documents/sign", data);
      return res.json();
    },
    onSuccess: () => {
      refetchLegalDocs();
      setShowLegalSignDialog(false);
      setLegalSignDocId("");
      setLegalSignDocTitle("");
      setLegalSignerName("");
      setLegalSignerEmail("");
      setLegalSignerRole("");
      setLegalSignConsent(false);
      setLegalSignTypedSig("");
      toast({ title: "Document Signed", description: "The document has been signed successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Filter and sort clients based on search terms
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    let result = [...clients];
    
    // Default sort: alphabetically by name
    result.sort((a, b) => {
      const aName = (a.nickname || a.clientName || a.client?.name || "").toLowerCase();
      const bName = (b.nickname || b.clientName || b.client?.name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
    
    // Filter by name (nickname or client name)
    if (searchName.trim()) {
      const nameLower = searchName.toLowerCase();
      result = result.filter(client => {
        const displayName = client.nickname || client.clientName || client.client?.name || "";
        return displayName.toLowerCase().includes(nameLower);
      });
      // Sort by match relevance - names starting with search term first
      result.sort((a, b) => {
        const aName = (a.nickname || a.clientName || a.client?.name || "").toLowerCase();
        const bName = (b.nickname || b.clientName || b.client?.name || "").toLowerCase();
        const aStarts = aName.startsWith(nameLower) ? 0 : 1;
        const bStarts = bName.startsWith(nameLower) ? 0 : 1;
        return aStarts - bStarts;
      });
    }
    
    // Filter by email
    if (searchEmail.trim()) {
      const emailLower = searchEmail.toLowerCase();
      result = result.filter(client => {
        const email = client.client?.email || "";
        return email.toLowerCase().includes(emailLower);
      });
      // Sort by match relevance
      result.sort((a, b) => {
        const aEmail = (a.client?.email || "").toLowerCase();
        const bEmail = (b.client?.email || "").toLowerCase();
        const aStarts = aEmail.startsWith(emailLower) ? 0 : 1;
        const bStarts = bEmail.startsWith(emailLower) ? 0 : 1;
        return aStarts - bStarts;
      });
    }
    
    // Filter by reference code, bundle ID, or client ordinal
    if (searchRef.trim()) {
      const refLower = searchRef.trim().toLowerCase();
      result = result.filter(client => {
        const refCode = (client.referenceCode || "").toLowerCase();
        const bundle = (client.bundleId || "").toLowerCase();
        const ordinal = String(client.clientOrdinal || "");
        return refCode.includes(refLower) || bundle.includes(refLower) || ordinal.includes(refLower);
      });
    }
    
    return result;
  }, [clients, searchName, searchEmail, searchRef]);

  const addClientMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/org/clients", {
        clientEmail,
        bundleId: selectedBundleId || undefined,
        nickname: nickname || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setShowAddClientDialog(false);
      setClientEmail("");
      setNickname("");
      setSelectedBundleId("");
      toast({
        title: "Client added",
        description: "The client has been added to your organisation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/org/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients/archived"] });
      toast({
        title: "Client archived",
        description: "The client has been moved to the archive.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to archive client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const restoreClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("POST", `/api/org/clients/${clientId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients/archived"] });
      toast({ title: "Client restored", description: "The client has been restored from the archive." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Restore failed", description: error.message || "Could not restore client" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/org/clients/${clientId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients/archived"] });
      setPermanentDeleteClient(null);
      toast({ title: "Client permanently deleted", description: "The client record has been permanently removed." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Delete failed", description: error.message || "Could not permanently delete client" });
    },
  });

  const updateClientDetailsMutation = useMutation({
    mutationFn: async ({ clientId, details }: { clientId: string; details: { nickname?: string; clientName?: string; clientPhone?: string; clientEmail?: string; alertsEnabled?: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/org/clients/${clientId}/details`, details);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setShowEditClientDialog(false);
      setEditingClient(null);
      toast({
        title: "Client updated",
        description: "Client details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmergencyContactsMutation = useMutation({
    mutationFn: async ({ clientId, emergencyContacts }: { clientId: string; emergencyContacts: { name: string; email: string; phone: string; relationship?: string }[] }) => {
      const response = await apiRequest("PATCH", `/api/org/clients/${clientId}/emergency-contacts`, { emergencyContacts });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setShowEmergencyContactsDialog(false);
      setEmergencyContactsClient(null);
      toast({
        title: "Emergency contacts updated",
        description: "Emergency contacts have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update emergency contacts",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const regClientAge = regClientDOB ? (() => {
    const dob = new Date(regClientDOB);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  })() : null;
  const regSeatType = regClientAge !== null && regClientAge < 16 ? "safeguarding" : "check_in";

  const registerClientMutation = useMutation({
    mutationFn: async () => {
      const fullPhone = regClientPhone ? `${regCountryCode}${regClientPhone.replace(/\D/g, "")}` : "";
      const response = await apiRequest("POST", "/api/org/clients/register", {
        clientName: regClientName,
        clientPhone: regSeatType === "check_in" ? fullPhone : undefined,
        dateOfBirth: regClientDOB,
        bundleId: regBundleId || undefined,
        scheduleStartTime: regSeatType === "check_in" ? (regScheduleStart || undefined) : undefined,
        checkInIntervalHours: regSeatType === "check_in" ? regIntervalHours : 24,
        supervisorName: regSupervisorName || undefined,
        supervisorPhone: regSupervisorPhone ? `${regSupervisorCountryCode}${regSupervisorPhone.replace(/\D/g, "")}` : undefined,
        supervisorEmail: regSupervisorEmail || undefined,
        emergencyContacts: regEmergencyContacts.length > 0 ? regEmergencyContacts : undefined,
        emergencyNotes: regEmergencyNotes || undefined,
        features: regFeatures,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients/birthday-transitions"] });
      setShowRegisterClientDialog(false);
      resetRegisterForm();
      if (data.seatType === "safeguarding") {
        toast({
          title: "Safeguarding seat registered",
          description: `${regClientName} has been added as a safeguarding seat (under 16). No SMS sent.`,
        });
      } else {
        toast({
          title: "Client registered",
          description: data.smsSent 
            ? `SMS sent to ${regClientPhone}. Reference code: ${data.referenceCode}`
            : `Client registered. Reference code: ${data.referenceCode}. SMS could not be sent.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to register client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const upgradeToChekinMutation = useMutation({
    mutationFn: async ({ orgClientId, clientPhone }: { orgClientId: string; clientPhone: string }) => {
      const response = await apiRequest("POST", `/api/org/clients/${orgClientId}/upgrade-to-checkin`, { clientPhone });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients/birthday-transitions"] });
      setShowBirthdayUpgradeDialog(false);
      setBirthdayUpgradeClient(null);
      setBirthdayUpgradePhone("");
      toast({
        title: "Client upgraded to check-in seat",
        description: data.smsSent ? "SMS link sent to their phone." : "Upgraded but SMS could not be sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upgrade client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const dismissBirthdayUpgradeMutation = useMutation({
    mutationFn: async (orgClientId: string) => {
      const response = await apiRequest("POST", `/api/org/clients/${orgClientId}/dismiss-birthday-upgrade`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients/birthday-transitions"] });
    },
  });

  const sendDataCaptureLinkMutation = useMutation({
    mutationFn: async () => {
      const recipient = dataCaptureMethod === "sms"
        ? `${dataCaptureCountryCode}${dataCaptureRecipient}`
        : dataCaptureRecipient;
      const response = await apiRequest("POST", "/api/org/send-data-capture-link", {
        method: dataCaptureMethod,
        recipient,
        password: dataCapturePassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Link Sent",
        description: `Data Capture link sent via ${dataCaptureMethod === "sms" ? "SMS" : "email"}. Share the password separately.`,
      });
      setShowSendDataCaptureDialog(false);
      setDataCaptureRecipient("");
      setDataCapturePassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send the link",
        variant: "destructive",
      });
    },
  });

  const importClientsMutation = useMutation({
    mutationFn: async ({ clients, bundleId }: { clients: typeof importData; bundleId?: string }) => {
      const response = await apiRequest("POST", "/api/org/clients/bulk-import", {
        clients,
        bundleId: bundleId && bundleId !== "none" ? bundleId : undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setImportResults(data.results || []);
      setImportStep("results");
      toast({
        title: "Import complete",
        description: `${data.successCount} of ${data.totalProcessed} clients imported successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setImportStep("preview");
    },
  });

  const resetImportForm = () => {
    setImportFile(null);
    setImportData([]);
    setImportErrors([]);
    setImportResults([]);
    setImportStep("upload");
    setImportBundleId("");
  };

  const handleFileUpload = async (file: File) => {
    setImportFile(file);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const data = await file.arrayBuffer();
      await workbook.xlsx.load(data);
      const worksheet = workbook.worksheets[0];
      const headers: string[] = [];
      const jsonData: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          (row.values as any[]).slice(1).forEach((v: any) => headers.push(String(v ?? "")));
        } else {
          const obj: any = {};
          const vals = row.values as any[];
          headers.forEach((h, i) => { obj[h] = vals[i + 1] ?? ""; });
          jsonData.push(obj);
        }
      });

      if (jsonData.length === 0) {
        toast({ title: "Empty spreadsheet", description: "The spreadsheet contains no data rows.", variant: "destructive" });
        return;
      }

      const parsedClients: typeof importData = [];
      const errors: typeof importErrors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowErrors: string[] = [];

        const clientName = String(row["Client Name"] || row["client_name"] || row["Name"] || row["name"] || "").trim();
        const clientPhone = String(row["Mobile Number"] || row["client_phone"] || row["Phone"] || row["phone"] || row["Mobile"] || row["mobile"] || "").trim();
        const clientEmail = String(row["Email"] || row["client_email"] || row["email"] || "").trim();
        const dateOfBirth = String(row["Date of Birth"] || row["date_of_birth"] || row["DOB"] || row["dob"] || "").trim();
        const specialNeeds = String(row["Special Needs"] || row["special_needs"] || row["Vulnerabilities"] || row["vulnerabilities"] || "").trim();
        const medicalNotes = String(row["Medical Notes"] || row["medical_notes"] || "").trim();
        const emergencyInstructions = String(row["Emergency Instructions"] || row["emergency_instructions"] || "").trim();
        const intervalStr = String(row["Check-in Interval (Hours)"] || row["check_in_interval_hours"] || row["Interval"] || "24").trim();
        const checkInIntervalHours = parseInt(intervalStr) || 24;

        if (!clientName) rowErrors.push("Client name is required");
        if (!clientPhone) rowErrors.push("Mobile number is required");
        else if (clientPhone.replace(/\D/g, "").length < 10) rowErrors.push("Mobile number must be at least 10 digits");

        const emergencyContacts: Array<{ name: string; email: string; phone: string; relationship: string }> = [];
        for (let c = 1; c <= 3; c++) {
          const ecName = String(row[`Emergency Contact ${c} Name`] || row[`ec${c}_name`] || "").trim();
          const ecEmail = String(row[`Emergency Contact ${c} Email`] || row[`ec${c}_email`] || "").trim();
          const ecPhone = String(row[`Emergency Contact ${c} Phone`] || row[`ec${c}_phone`] || "").trim();
          const ecRelationship = String(row[`Emergency Contact ${c} Relationship`] || row[`ec${c}_relationship`] || "").trim();
          if (ecName && ecEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(ecEmail)) {
              rowErrors.push(`Emergency Contact ${c} email is invalid`);
            }
            emergencyContacts.push({ name: ecName, email: ecEmail, phone: ecPhone, relationship: ecRelationship });
          } else if (ecName && !ecEmail) {
            rowErrors.push(`Emergency Contact ${c} has a name but no email`);
          }
        }

        if (emergencyContacts.length === 0) {
          rowErrors.push("At least one emergency contact (name + email) is required");
        }

        if (rowErrors.length > 0) {
          errors.push({ row: i + 2, errors: rowErrors });
        }

        parsedClients.push({
          clientName,
          clientPhone: clientPhone.replace(/\D/g, "").length >= 10 ? clientPhone : "",
          clientEmail,
          dateOfBirth,
          specialNeeds,
          medicalNotes,
          emergencyInstructions,
          checkInIntervalHours: Math.max(1, Math.min(48, checkInIntervalHours)),
          emergencyContacts,
        });
      }

      setImportData(parsedClients);
      setImportErrors(errors);
      setImportStep("preview");
    } catch (err: any) {
      toast({ title: "Failed to read file", description: err.message || "Please check the file format.", variant: "destructive" });
    }
  };

  const downloadTemplate = () => {
    import("exceljs").then(async (ExcelJS) => {
      const templateData = [
        {
          "Client Name": "Jane Smith",
          "Mobile Number": "+447700900123",
          "Email": "jane@example.com",
          "Date of Birth": "1990-01-15",
          "Special Needs": "Mobility assistance required",
          "Medical Notes": "Asthma, uses inhaler",
          "Emergency Instructions": "Call GP first, then emergency services",
          "Check-in Interval (Hours)": 24,
          "Emergency Contact 1 Name": "John Smith",
          "Emergency Contact 1 Email": "john@example.com",
          "Emergency Contact 1 Phone": "+447700900456",
          "Emergency Contact 1 Relationship": "Spouse",
          "Emergency Contact 2 Name": "Mary Smith",
          "Emergency Contact 2 Email": "mary@example.com",
          "Emergency Contact 2 Phone": "+447700900789",
          "Emergency Contact 2 Relationship": "Parent",
          "Emergency Contact 3 Name": "",
          "Emergency Contact 3 Email": "",
          "Emergency Contact 3 Phone": "",
          "Emergency Contact 3 Relationship": "",
        },
      ];
      const colWidths = [
        20, 18, 25, 14, 30, 30, 35, 24,
        25, 25, 18, 20, 25, 25, 18, 20,
        25, 25, 18, 20,
      ];
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Clients");
      sheet.columns = Object.keys(templateData[0]).map((key, i) => ({
        header: key,
        key,
        width: colWidths[i] ?? 15,
      }));
      templateData.forEach((row) => sheet.addRow(row));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aok-client-import-template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const resetRegisterForm = () => {
    setRegClientName("");
    setRegClientPhone("");
    setRegCountryCode("+44");
    setRegClientDOB("");
    setRegBundleId("");
    setRegSupervisorName("");
    setRegSupervisorPhone("");
    setRegSupervisorEmail("");
    setRegSupervisorCountryCode("+44");
    setSupervisorSmsVerified(false);
    setSupervisorSmsCode("");
    setSupervisorSmsSent(false);
    setRegEmergencyNotes("");
    setRegScheduleStart("");
    setRegIntervalHours(24);
    setRegEmergencyContacts([]);
    setRegFeatures({
      featureWellbeingAi: true,
      featureShakeToAlert: true,
      featureMoodTracking: true,
      featurePetProtection: true,
      featureDigitalWill: true,
      featureEmergencyRecording: false,
    });
  };

  const addEmergencyContact = () => {
    setRegEmergencyContacts([...regEmergencyContacts, {
      name: "",
      email: "",
      phone: "",
      countryCode: "+44",
      phoneType: "mobile",
      relationship: "",
      isPrimary: regEmergencyContacts.length === 0,
    }]);
  };

  const updateEmergencyContact = (index: number, field: string, value: any) => {
    const updated = [...regEmergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setRegEmergencyContacts(updated);
  };

  const removeEmergencyContact = (index: number) => {
    setRegEmergencyContacts(regEmergencyContacts.filter((_, i) => i !== index));
  };

  // Check if at least one valid emergency contact exists
  const hasValidEmergencyContact = regEmergencyContacts.some(
    contact => contact.name && contact.email && contact.phone
  );

  const resendPasswordMutation = useMutation({
    mutationFn: async ({ clientId, isRegistered }: { clientId: string; isRegistered: boolean }) => {
      const endpoint = isRegistered
        ? `/api/org/clients/${clientId}/send-reference-code`
        : `/api/org/clients/${clientId}/resend-invite`;
      const response = await apiRequest("POST", endpoint);
      return response.json();
    },
    onSuccess: () => {
      setShowResendPasswordDialog(false);
      setResendPasswordClientId(null);
      setResendPasswordClientName("");
      toast({
        title: "SMS sent",
        description: "The client will receive an SMS with their reference code and login link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ clientId, scheduleStartTime, checkInIntervalHours }: { clientId: string; scheduleStartTime: string; checkInIntervalHours: number }) => {
      const response = await apiRequest("PATCH", `/api/org/clients/${clientId}/schedule`, {
        scheduleStartTime,
        checkInIntervalHours,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setShowScheduleDialog(false);
      setScheduleClientId(null);
      toast({
        title: "Schedule updated",
        description: "The client's check-in schedule has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const changeOwnPasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/org/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowChangePasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change password",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChangeOwnPassword = () => {
    if (!currentPassword.trim()) {
      toast({ title: "Error", description: "Please enter your current password.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    changeOwnPasswordMutation.mutate({ currentPassword, newPassword });
  };

  const updateClientStatusMutation = useMutation({
    mutationFn: async ({ orgClientId, status }: { orgClientId: string; status: OrgClientStatus }) => {
      const response = await apiRequest("PATCH", `/api/org/clients/${orgClientId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      toast({
        title: "Status updated",
        description: "Client status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ orgClientId, profile }: { orgClientId: string; profile: Partial<OrganizationClientProfile> }) => {
      const response = await apiRequest("PUT", `/api/org/clients/${orgClientId}/profile`, profile);
      return response.json();
    },
  });
  
  // Combined handler for saving profile (profile + phone/email)
  const [savingProfile, setSavingProfile] = useState(false);
  
  const handleSaveFullProfile = async () => {
    if (!selectedClient) return;
    
    setSavingProfile(true);
    try {
      const { phone, email, id, organizationClientId, updatedAt, ...profile } = profileData as any;
      
      // First save the profile data
      await updateProfileMutation.mutateAsync({ orgClientId: selectedClient.id, profile });
      
      // Then save the phone/email if changed
      const fullPhone = phone ? `${profileCountryCode}${phone.replace(/\D/g, "")}` : "";
      const phoneChanged = fullPhone !== (selectedClient.clientPhone || "");
      const emailChanged = email !== (selectedClient.clientEmail || "");
      
      if (phoneChanged || emailChanged) {
        await apiRequest("PATCH", `/api/org/clients/${selectedClient.id}/details`, {
          clientPhone: fullPhone,
          clientEmail: email,
        });
      }
      
      // Invalidate queries and show success
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      setEditingProfile(false);
      toast({
        title: "Profile saved",
        description: "Client profile has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save profile",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchClientAlerts = async (clientId: string) => {
    setLoadingAlerts(true);
    try {
      const response = await apiRequest("GET", `/api/org/clients/${clientId}/alerts`);
      const data = await response.json();
      setClientAlerts(data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchClientContacts = async (orgClientId: string) => {
    setLoadingContacts(true);
    try {
      const response = await apiRequest("GET", `/api/org/clients/${orgClientId}/contacts`);
      const data = await response.json();
      setClientContacts(data);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      setClientContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchClientFeatures = async (orgClientId: string) => {
    setLoadingFeatures(true);
    try {
      const response = await apiRequest("GET", `/api/org/clients/${orgClientId}/features`);
      const data = await response.json();
      setClientFeatures(data);
    } catch (error) {
      console.error("Failed to fetch features:", error);
      setClientFeatures({
        featureWellbeingAi: true,
        featureShakeToAlert: true,
        featureMoodTracking: true,
        featurePetProtection: true,
        featureDigitalWill: true,
        featureEmergencyRecording: false,
      });
    } finally {
      setLoadingFeatures(false);
    }
  };

  const updateClientFeature = async (orgClientId: string, featureKey: string, enabled: boolean) => {
    setSavingFeatures(true);
    try {
      await apiRequest("PATCH", `/api/org/clients/${orgClientId}/features`, {
        [featureKey]: enabled,
      });
      setClientFeatures(prev => ({ ...prev, [featureKey]: enabled }));
      toast({
        title: "Feature updated",
        description: `Feature ${enabled ? "enabled" : "disabled"} successfully.`,
      });
    } catch (error) {
      console.error("Failed to update feature:", error);
      toast({
        title: "Error",
        description: "Failed to update feature setting.",
        variant: "destructive",
      });
    } finally {
      setSavingFeatures(false);
    }
  };

  const resetContactForm = () => {
    setContactFormData({
      name: "",
      email: "",
      phone: "",
      countryCode: "+44",
      phoneType: "mobile",
      relationship: "",
      isPrimary: false,
    });
    setEditingContactId(null);
  };

  const addContactMutation = useMutation({
    mutationFn: async (orgClientId: string) => {
      // Combine country code with phone number
      const fullPhone = contactFormData.phone ? `${contactFormData.countryCode}${contactFormData.phone.replace(/\D/g, "")}` : "";
      const payload = {
        ...contactFormData,
        phone: fullPhone,
      };
      const response = await apiRequest("POST", `/api/org/clients/${orgClientId}/contacts`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      if (selectedClient) {
        fetchClientContacts(selectedClient.id);
      }
      setShowAddContactDialog(false);
      resetContactForm();
      toast({
        title: "Contact added",
        description: "Emergency contact has been added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add contact",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ orgClientId, contactId }: { orgClientId: string; contactId: string }) => {
      // Combine country code with phone number
      const fullPhone = contactFormData.phone ? `${contactFormData.countryCode}${contactFormData.phone.replace(/\D/g, "")}` : "";
      const payload = {
        ...contactFormData,
        phone: fullPhone,
      };
      const response = await apiRequest("PATCH", `/api/org/clients/${orgClientId}/contacts/${contactId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      if (selectedClient) {
        fetchClientContacts(selectedClient.id);
      }
      setShowAddContactDialog(false);
      resetContactForm();
      toast({
        title: "Contact updated",
        description: "Emergency contact has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update contact",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async ({ orgClientId, contactId }: { orgClientId: string; contactId: string }) => {
      await apiRequest("DELETE", `/api/org/clients/${orgClientId}/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      if (selectedClient) {
        fetchClientContacts(selectedClient.id);
      }
      toast({
        title: "Contact deleted",
        description: "Emergency contact has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete contact",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditContact = (contact: Contact) => {
    // Parse existing phone to extract country code
    const existingPhone = contact.phone || "";
    let countryCode = "+44";
    let phoneNumber = existingPhone;
    if (existingPhone.startsWith("+44")) {
      countryCode = "+44";
      phoneNumber = existingPhone.slice(3);
    } else if (existingPhone.startsWith("+1")) {
      countryCode = "+1";
      phoneNumber = existingPhone.slice(2);
    } else if (existingPhone.startsWith("+353")) {
      countryCode = "+353";
      phoneNumber = existingPhone.slice(4);
    } else if (existingPhone.startsWith("+33")) {
      countryCode = "+33";
      phoneNumber = existingPhone.slice(3);
    } else if (existingPhone.startsWith("+49")) {
      countryCode = "+49";
      phoneNumber = existingPhone.slice(3);
    }
    setContactFormData({
      name: contact.name,
      email: contact.email,
      phone: phoneNumber,
      countryCode: countryCode,
      phoneType: contact.phoneType || "mobile",
      relationship: contact.relationship || "",
      isPrimary: contact.isPrimary || false,
    });
    setEditingContactId(contact.id);
    setShowAddContactDialog(true);
  };

  const handleViewClientDetails = (client: OrganizationClientWithDetails) => {
    setSelectedClient(client);
    setProfileData(client.profile || {});
    setEditingProfile(false);
    setClientContacts([]);
    if (client.clientId) {
      fetchClientAlerts(client.clientId);
    }
    fetchClientContacts(client.id);
  };

  const handleEditClient = (client: OrganizationClientWithDetails) => {
    setEditingClient(client);
    setEditNickname(client.nickname || "");
    setEditClientName(client.clientName || client.client?.name || "");
    
    // Parse existing phone number to extract country code and local number
    const existingPhone = client.clientPhone || client.client?.mobileNumber || "";
    if (existingPhone.startsWith("+44")) {
      setEditCountryCode("+44");
      setEditClientPhone(existingPhone.slice(3));
    } else if (existingPhone.startsWith("0044")) {
      setEditCountryCode("+44");
      setEditClientPhone(existingPhone.slice(4));
    } else if (existingPhone.startsWith("44")) {
      setEditCountryCode("+44");
      setEditClientPhone(existingPhone.slice(2));
    } else if (existingPhone.startsWith("0")) {
      setEditCountryCode("+44");
      setEditClientPhone(existingPhone.slice(1)); // Remove leading zero
    } else {
      setEditCountryCode("+44");
      setEditClientPhone(existingPhone);
    }
    setShowEditClientDialog(true);
  };

  // Validate UK phone number (should be 10 digits after country code)
  const isValidUKPhone = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const handleSaveClientDetails = () => {
    if (!editingClient) return;
    
    // Combine country code with phone number
    const fullPhone = editClientPhone ? `${editCountryCode}${editClientPhone.replace(/\D/g, "")}` : undefined;
    
    updateClientDetailsMutation.mutate({
      clientId: editingClient.id,
      details: {
        nickname: editNickname || undefined,
        clientName: editClientName || undefined,
        clientPhone: fullPhone,
      },
    });
  };

  const handleManageEmergencyContacts = (client: OrganizationClientWithDetails) => {
    setEmergencyContactsClient(client);
    setEmergencyContacts(client.emergencyContacts || []);
    setShowEmergencyContactsDialog(true);
  };

  const handleAddEmergencyContact = () => {
    if (emergencyContacts.length >= 3) return;
    setEmergencyContacts([...emergencyContacts, { name: "", email: "", phone: "", relationship: "" }]);
  };

  const handleRemoveEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  const handleSaveEmergencyContacts = () => {
    if (!emergencyContactsClient) return;
    // Filter out empty contacts
    const validContacts = emergencyContacts.filter(c => c.name && c.email && c.phone);
    updateEmergencyContactsMutation.mutate({
      clientId: emergencyContactsClient.id,
      emergencyContacts: validContacts,
    });
  };

  const handleResendPasswordClick = (client: OrganizationClientWithDetails) => {
    const isRegistered = !!(client.clientId && client.client);
    const id = isRegistered ? client.clientId! : client.id;
    setResendPasswordClientId(id);
    setResendPasswordIsRegistered(isRegistered);
    setResendPasswordClientName(client.nickname || client.clientName || client.client?.name || "Client");
    setShowResendPasswordDialog(true);
  };

  const handleResendPasswordSubmit = () => {
    if (resendPasswordClientId) {
      resendPasswordMutation.mutate({
        clientId: resendPasswordClientId,
        isRegistered: resendPasswordIsRegistered,
      });
    }
  };

  if (statsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }


  if (statsError || clientsError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-background dark:from-indigo-950 dark:to-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">Session Expired</CardTitle>
            <CardDescription>
              Your session has timed out for security. Please sign in again to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              data-testid="button-login-again"
              onClick={() => setLocation("/org/staff-login?sessionExpired=true")}
            >
              Sign In Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getAuditDescription = (entry: AuditTrailEntry): { text: string; icon: React.ReactNode; actionVariant: string } => {
    const data = (entry.newData || {}) as Record<string, any>;
    const clientRef = data.clientEmail || data.nickname || data.clientName || data.email || "";
    const entityLabel = entry.entityType.replace(/_/g, " ");

    const iconMap: Record<string, React.ReactNode> = {
      client: <User className="h-4 w-4 text-blue-500" />,
      client_emergency_contacts: <Phone className="h-4 w-4 text-orange-500" />,
      client_schedule: <Clock className="h-4 w-4 text-purple-500" />,
      client_status: <Settings className="h-4 w-4 text-yellow-600" />,
      client_features: <Settings className="h-4 w-4 text-indigo-500" />,
      emergency_alert: <AlertOctagon className="h-4 w-4 text-destructive" />,
      incident: <AlertTriangle className="h-4 w-4 text-destructive" />,
      welfare_concern: <Shield className="h-4 w-4 text-amber-600" />,
      case_file: <FileText className="h-4 w-4 text-blue-600" />,
      case_note: <PenLine className="h-4 w-4 text-green-600" />,
      escalation_rule: <Bell className="h-4 w-4 text-red-500" />,
      risk_report: <TrendingUp className="h-4 w-4 text-orange-600" />,
      staff_invite: <Mail className="h-4 w-4 text-indigo-500" />,
      team_invite: <UserPlus className="h-4 w-4 text-blue-500" />,
      team_member_role: <Shield className="h-4 w-4 text-purple-500" />,
      team_member_status: <CheckCircle className="h-4 w-4 text-green-500" />,
      team_member: <Users className="h-4 w-4 text-blue-600" />,
    };

    const actionVariantMap: Record<string, string> = {
      create: "default",
      update: "secondary",
      delete: "destructive",
      archive: "destructive",
      restore: "default",
      pause: "secondary",
      resume: "default",
      reset_password: "secondary",
      acknowledge: "default",
      export: "outline",
    };

    const icon = iconMap[entry.entityType] || <ClipboardList className="h-4 w-4 text-muted-foreground" />;
    const actionVariant = actionVariantMap[entry.action] || "outline";

    let text = "";
    switch (entry.entityType) {
      case "client":
        if (entry.action === "create") text = `Added client${clientRef ? ` "${clientRef}"` : ""}`;
        else if (entry.action === "archive") text = `Archived client${clientRef ? ` "${clientRef}"` : ""}`;
        else if (entry.action === "restore") text = `Restored client${clientRef ? ` "${clientRef}"` : ""}`;
        else if (entry.action === "update") text = `Updated client details${clientRef ? ` for "${clientRef}"` : ""}`;
        else if (entry.action === "reset_password") text = `Reset password${clientRef ? ` for "${clientRef}"` : ""}`;
        else if (entry.action === "pause") text = `Paused client${clientRef ? ` "${clientRef}"` : ""}`;
        else if (entry.action === "resume") text = `Resumed client${clientRef ? ` "${clientRef}"` : ""}`;
        else if (entry.action === "reset_scheduler") text = `Reset check-in scheduler${clientRef ? ` for "${clientRef}"` : ""}`;
        else if (entry.action === "delete") text = `Permanently deleted client${clientRef ? ` "${clientRef}"` : ""}`;
        else text = `${entry.action} ${entityLabel}${clientRef ? ` "${clientRef}"` : ""}`;
        break;
      case "client_emergency_contacts":
        text = `Updated emergency contacts${clientRef ? ` for "${clientRef}"` : ""}`;
        break;
      case "client_schedule":
        text = `Changed check-in schedule${data.scheduleStartTime ? ` (start: ${data.scheduleStartTime}, every ${data.checkInIntervalHours}h)` : ""}`;
        break;
      case "client_status":
        text = `Changed client status to "${data.status || data.newStatus || "unknown"}"${clientRef ? ` for "${clientRef}"` : ""}`;
        break;
      case "client_features":
        text = `Updated feature settings${clientRef ? ` for "${clientRef}"` : ""}`;
        break;
      case "emergency_alert":
        text = `Emergency alert ${entry.action === "acknowledge" ? "acknowledged" : entry.action}${data.alertType ? ` (${data.alertType})` : ""}`;
        break;
      case "incident":
        text = entry.action === "create"
          ? `Reported new incident${data.title ? `: "${data.title}"` : ""}${data.severity ? ` [${data.severity}]` : ""}`
          : `Updated incident${data.title ? ` "${data.title}"` : ""}`;
        break;
      case "welfare_concern":
        text = entry.action === "create"
          ? `Raised welfare concern${data.type ? ` (${data.type})` : ""}${data.urgency ? ` [${data.urgency}]` : ""}`
          : `Updated welfare concern${data.status ? ` -  ${data.status}` : ""}`;
        break;
      case "case_file":
        text = entry.action === "create"
          ? `Created case file${data.title ? `: "${data.title}"` : ""}`
          : `Updated case file${data.title ? ` "${data.title}"` : ""}`;
        break;
      case "case_note":
        text = `Added note to case file`;
        break;
      case "escalation_rule":
        if (entry.action === "create") text = `Created escalation rule${data.name ? ` "${data.name}"` : ""}`;
        else if (entry.action === "update") text = `Updated escalation rule${data.name ? ` "${data.name}"` : ""}`;
        else if (entry.action === "delete") text = `Deleted escalation rule`;
        else text = `${entry.action} escalation rule`;
        break;
      case "risk_report":
        text = `Generated risk report${data.reportType ? ` (${data.reportType})` : ""}${data.riskLevel ? ` [${data.riskLevel}]` : ""}`;
        break;
      case "staff_invite":
        if (entry.action === "create") text = `Invited staff member${data.email ? ` "${data.email}"` : ""}${data.role ? ` as ${data.role}` : ""}`;
        else if (entry.action === "delete") text = `Revoked staff invitation${data.email ? ` for "${data.email}"` : ""}`;
        else if (entry.action === "update") text = `Updated staff invitation${data.email ? ` for "${data.email}"` : ""}`;
        else text = `${entry.action} staff invitation`;
        break;
      case "team_invite":
        text = `${entry.action === "create" ? "Sent" : entry.action} team invitation${data.email ? ` to "${data.email}"` : ""}`;
        break;
      case "team_member_role":
        text = `Changed team member role${data.newRole ? ` to "${data.newRole}"` : ""}`;
        break;
      case "team_member_status":
        text = `Changed team member status${data.newStatus ? ` to "${data.newStatus}"` : ""}`;
        break;
      case "team_member":
        text = `Removed team member${data.email ? ` "${data.email}"` : ""}`;
        break;
      default:
        text = `${entry.action.replace(/_/g, " ")} ${entityLabel}${clientRef ? ` "${clientRef}"` : ""}`;
    }

    return { text, icon, actionVariant };
  };

  const activeBundles = stats?.bundles.filter(b => b.status === "active") || [];
  const hasSeatsAvailable = activeBundles.some(b => b.seatsUsed < b.seatLimit);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo and logout */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
            data-testid="link-home-logo"
            onClick={handleLogout}
          >
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowGuidedTour(true)} data-testid="button-guided-tour">
              <Play className="h-4 w-4 mr-1" />
              Tour
            </Button>
            <OrgHelpButton />
            <Button variant="outline" onClick={handleLogout} data-testid="button-org-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      {authUser?.orgSubscriptionExpiresAt && (() => {
        const expiresAt = new Date(authUser.orgSubscriptionExpiresAt);
        const now = new Date();
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) {
          const daysOverdue = Math.abs(daysLeft);
          const daysUntilLockout = Math.max(0, 7 - daysOverdue);
          return (
            <div className="bg-red-600 text-white px-4 py-3" data-testid="banner-subscription-expired">
              <div className="container mx-auto flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  Your subscription has expired. {daysUntilLockout > 0
                    ? `You have ${daysUntilLockout} day${daysUntilLockout !== 1 ? "s" : ""} remaining before access is disabled.`
                    : "Your access will be disabled imminently."
                  } Please contact AOK to renew your subscription.
                </p>
              </div>
            </div>
          );
        }
        if (daysLeft <= 28) {
          return (
            <div className="bg-amber-500 text-white px-4 py-3" data-testid="banner-subscription-expiring">
              <div className="container mx-auto flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  Your subscription expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""} (on {expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}). Please contact AOK to renew.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="container mx-auto p-4 space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-org-dashboard-title">Organisation Dashboard</h1>
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400" data-testid="badge-live-indicator">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                LIVE
              </span>
            </div>
            <p className="text-sm text-muted-foreground">View your clients' check-in status and wellbeing</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const shareUrl = "https://aok.care/org/login";
                const shareData = {
                  title: "aok - Organisation Portal",
                  text: "Access the aok Organisation Portal to manage safety check-ins for your team.",
                  url: shareUrl,
                };
                try {
                  if (navigator.share && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Link copied", description: "The organisation portal link has been copied to your clipboard." });
                  }
                } catch (err: any) {
                  if (err.name !== "AbortError") {
                    await navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Link copied", description: "The organisation portal link has been copied to your clipboard." });
                  }
                }
              }}
              data-testid="button-share-portal"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {authUser?.orgFeatureLoneWorker && !(authUser.orgFeatureLoneWorkerExpiresAt && new Date(authUser.orgFeatureLoneWorkerExpiresAt) < new Date()) && (
              <Link href="/org/lone-worker">
                <Button variant="outline" size="sm" data-testid="button-lone-worker-hub">
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Lone Worker </span>Hub
                </Button>
              </Link>
            )}
            {authUser?.orgFeatureSafeguarding && !(authUser.orgFeatureSafeguardingExpiresAt && new Date(authUser.orgFeatureSafeguardingExpiresAt) < new Date()) && (
              <Link href="/org/safeguarding">
                <Button variant="outline" size="sm" data-testid="button-safeguarding-hub">
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Safeguarding </span>Hub
                </Button>
              </Link>
            )}
            <Link href="/org/team">
              <Button variant="outline" size="sm" data-testid="button-team-management">
                <Users className="h-4 w-4 mr-2" />
                Team
              </Button>
            </Link>
            {authUser?.orgFeatureDashboard && !(authUser.orgFeatureDashboardExpiresAt && new Date(authUser.orgFeatureDashboardExpiresAt) < new Date()) && (
              <Link href="/org/analytics">
                <Button variant="outline" size="sm" data-testid="button-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            )}
            {authUser?.orgFeatureAssurance && !(authUser.orgFeatureAssuranceExpiresAt && new Date(authUser.orgFeatureAssuranceExpiresAt) < new Date()) && (
              <Link href="/org/assurance">
                <Button variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-50" data-testid="button-assurance">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Assurance
                </Button>
              </Link>
            )}
            {authUser?.orgFeatureApiAccess && !(authUser.orgFeatureApiAccessExpiresAt && new Date(authUser.orgFeatureApiAccessExpiresAt) < new Date()) && (
              <Link href="/org/api-access">
                <Button variant="outline" size="sm" className="border-indigo-600 text-indigo-600" data-testid="button-api-access">
                  <Key className="h-4 w-4 mr-2" />
                  API
                </Button>
              </Link>
            )}
            {authUser?.orgFeatureDashboard && !(authUser.orgFeatureDashboardExpiresAt && new Date(authUser.orgFeatureDashboardExpiresAt) < new Date()) && (
              <Link href="/org/funding">
                <Button variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50" data-testid="button-funding">
                  <Scale className="h-4 w-4 mr-2" />
                  Funding
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSendDataCaptureDialog(true)}
              data-testid="button-data-capture"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Data Capture
            </Button>
            <Link href="/org/kiosk">
              <Button variant="outline" size="sm" data-testid="button-kiosk-mode">
                <Camera className="h-4 w-4 mr-2" />
                Kiosk
              </Button>
            </Link>
            <Button 
              size="sm"
              data-testid="button-register-client" 
              disabled={!hasSeatsAvailable}
              onClick={() => setShowRegisterClientDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Register
            </Button>
            <Button 
              variant="outline"
              size="sm"
              data-testid="button-import-clients"
              disabled={!hasSeatsAvailable}
              onClick={() => { resetImportForm(); setShowImportDialog(true); }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChangePasswordDialog(true)} data-testid="button-org-change-password">
              <KeyRound className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Change </span>Password
            </Button>
          <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-client" disabled={!hasSeatsAvailable}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Existing
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Client</DialogTitle>
              <DialogDescription>
                Add a user to your organisation to monitor their check-in status.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  data-testid="input-client-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname (optional)</Label>
                <Input
                  id="nickname"
                  placeholder="e.g., Room 101"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  data-testid="input-client-nickname"
                />
              </div>
              {activeBundles.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="bundle">Assign to Bundle</Label>
                  <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                    <SelectTrigger data-testid="select-bundle">
                      <SelectValue placeholder="Select a bundle" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBundles.map((bundle) => (
                        <SelectItem 
                          key={bundle.id} 
                          value={bundle.id}
                          disabled={bundle.seatsUsed >= bundle.seatLimit}
                        >
                          {bundle.name} ({bundle.seatsUsed}/{bundle.seatLimit} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => addClientMutation.mutate()}
                disabled={!clientEmail || addClientMutation.isPending}
                data-testid="button-confirm-add-client"
              >
                {addClientMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
                ) : (
                  "Add Client"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Register Client Dialog */}
      <Dialog open={showRegisterClientDialog} onOpenChange={(open) => {
        setShowRegisterClientDialog(open);
        if (!open) resetRegisterForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Client</DialogTitle>
            <DialogDescription>
              {regSeatType === "safeguarding"
                ? "This person is under 16 and will be registered as a safeguarding seat. No SMS will be sent - they will be managed through the dashboard only."
                : "Enter client details. They will receive an SMS with a link to download the app and their unique reference code."}
            </DialogDescription>
          </DialogHeader>
          {regClientDOB && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              regSeatType === "safeguarding"
                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                : "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
            }`} data-testid="badge-seat-type">
              {regSeatType === "safeguarding" ? (
                <>
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>Safeguarding Seat (under 16) - dashboard only, no app access</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Check-in Seat (16+) - SMS link will be sent</span>
                </>
              )}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regClientName">Full Name *</Label>
                <Input
                  id="regClientName"
                  placeholder="John Smith"
                  value={regClientName}
                  onChange={(e) => setRegClientName(e.target.value)}
                  data-testid="input-reg-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regClientDOB">Date of Birth *</Label>
                <Input
                  id="regClientDOB"
                  type="date"
                  value={regClientDOB}
                  onChange={(e) => setRegClientDOB(e.target.value)}
                  data-testid="input-reg-client-dob"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            {regSeatType === "check_in" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regClientPhone">Mobile Number *</Label>
                <div className="flex gap-2">
                  <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                    <SelectTrigger className="w-24" data-testid="select-reg-country-code">
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
                  <div className="flex-1 relative">
                    <Input
                      id="regClientPhone"
                      type="tel"
                      placeholder="7XXX XXXXXX"
                      value={regClientPhone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d\s]/g, "");
                        if (value.startsWith("0")) value = value.slice(1);
                        setRegClientPhone(value);
                      }}
                      className={regClientPhone && !isValidUKPhone(regClientPhone) ? "border-yellow-500" : ""}
                      data-testid="input-reg-client-phone"
                    />
                    {regClientPhone && !isValidUKPhone(regClientPhone) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>
                {regClientPhone && !isValidUKPhone(regClientPhone) && (
                  <p className="text-xs text-yellow-600">UK mobile numbers should be 10 digits</p>
                )}
              </div>
            </div>
            )}

            {regSeatType === "check_in" && (
            <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regScheduleStart">Schedule Start Time</Label>
                <Input
                  id="regScheduleStart"
                  type="time"
                  value={regScheduleStart}
                  onChange={(e) => setRegScheduleStart(e.target.value)}
                  data-testid="input-reg-schedule-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regIntervalHours">Check-in Interval (hours)</Label>
                <Select 
                  value={regIntervalHours.toString()} 
                  onValueChange={(v) => setRegIntervalHours(parseInt(v))}
                >
                  <SelectTrigger data-testid="select-reg-interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every 1 hour</SelectItem>
                    <SelectItem value="2">Every 2 hours</SelectItem>
                    <SelectItem value="4">Every 4 hours</SelectItem>
                    <SelectItem value="6">Every 6 hours</SelectItem>
                    <SelectItem value="8">Every 8 hours</SelectItem>
                    <SelectItem value="12">Every 12 hours</SelectItem>
                    <SelectItem value="24">Every 24 hours</SelectItem>
                    <SelectItem value="48">Every 48 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </>
            )}

            <div className="grid grid-cols-2 gap-4">
              {activeBundles.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="regBundleId">Bundle</Label>
                  <Select value={regBundleId} onValueChange={setRegBundleId}>
                    <SelectTrigger data-testid="select-reg-bundle">
                      <SelectValue placeholder="Select a bundle" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBundles.map((bundle) => (
                        <SelectItem 
                          key={bundle.id} 
                          value={bundle.id}
                          disabled={bundle.seatsUsed >= bundle.seatLimit}
                        >
                          {bundle.name} ({bundle.seatsUsed}/{bundle.seatLimit} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Supervisor Details (Primary Contact/Carer) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Supervisor (Primary Contact/Carer) <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">The supervisor is the primary contact/carer and will be notified of missed check-ins. They can also be called directly from the client's dashboard.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="regSupervisorName" className="text-xs">Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="regSupervisorName"
                    placeholder="Jane Doe"
                    value={regSupervisorName}
                    onChange={(e) => setRegSupervisorName(e.target.value)}
                    required
                    data-testid="input-reg-supervisor-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regSupervisorEmail" className="text-xs">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="regSupervisorEmail"
                    type="email"
                    placeholder="supervisor@example.com"
                    value={regSupervisorEmail}
                    onChange={(e) => setRegSupervisorEmail(e.target.value)}
                    required
                    data-testid="input-reg-supervisor-email"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="regSupervisorPhone" className="text-xs">Mobile <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Select value={regSupervisorCountryCode} onValueChange={(v) => { setRegSupervisorCountryCode(v); setSupervisorSmsVerified(false); setSupervisorSmsSent(false); }}>
                    <SelectTrigger className="w-24" data-testid="select-supervisor-country-code">
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
                  <div className="flex-1 relative">
                    <Input
                      id="regSupervisorPhone"
                      type="tel"
                      placeholder="7XXX XXXXXX"
                      value={regSupervisorPhone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d\s]/g, "");
                        if (value.startsWith("0")) value = value.slice(1);
                        setRegSupervisorPhone(value);
                        setSupervisorSmsVerified(false);
                        setSupervisorSmsSent(false);
                      }}
                      className={regSupervisorPhone && !isValidUKPhone(regSupervisorPhone) ? "border-yellow-500" : ""}
                      required
                      data-testid="input-reg-supervisor-phone"
                    />
                    {regSupervisorPhone && !isValidUKPhone(regSupervisorPhone) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>
                {regSupervisorPhone && !isValidUKPhone(regSupervisorPhone) && (
                  <p className="text-xs text-yellow-600">Mobile numbers should be 10 digits (without leading zero)</p>
                )}
              </div>

              {/* SMS Verification */}
              <div className="space-y-2">
                {!supervisorSmsVerified ? (
                  <div className="space-y-2">
                    {!supervisorSmsSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!regSupervisorPhone || !isValidUKPhone(regSupervisorPhone) || supervisorSmsSending}
                        onClick={async () => {
                          setSupervisorSmsSending(true);
                          try {
                            const fullPhone = `${regSupervisorCountryCode}${regSupervisorPhone.replace(/\D/g, "")}`;
                            const res = await apiRequest("POST", "/api/org/supervisor/send-verification", {
                              phone: fullPhone,
                              supervisorName: regSupervisorName,
                            });
                            const data = await res.json();
                            if (data.success) {
                              setSupervisorSmsSent(true);
                              toast({ title: "Verification SMS sent", description: "A 6-digit code has been sent to the supervisor's mobile." });
                            } else {
                              toast({ title: "Failed to send SMS", description: data.error || "Please try again.", variant: "destructive" });
                            }
                          } catch (err: any) {
                            toast({ title: "Failed to send SMS", description: err.message || "Please try again.", variant: "destructive" });
                          } finally {
                            setSupervisorSmsSending(false);
                          }
                        }}
                        data-testid="button-send-supervisor-sms"
                      >
                        {supervisorSmsSending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...</> : <><MessageSquare className="h-4 w-4 mr-1" /> Send Verification SMS</>}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to the supervisor's mobile:</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="000000"
                            maxLength={6}
                            value={supervisorSmsCode}
                            onChange={(e) => setSupervisorSmsCode(e.target.value.replace(/\D/g, ""))}
                            className="w-28"
                            data-testid="input-supervisor-sms-code"
                          />
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            disabled={supervisorSmsCode.length !== 6 || supervisorSmsVerifying}
                            onClick={async () => {
                              setSupervisorSmsVerifying(true);
                              try {
                                const fullPhone = `${regSupervisorCountryCode}${regSupervisorPhone.replace(/\D/g, "")}`;
                                const res = await apiRequest("POST", "/api/org/supervisor/verify-sms", {
                                  phone: fullPhone,
                                  code: supervisorSmsCode,
                                });
                                const data = await res.json();
                                if (data.verified) {
                                  setSupervisorSmsVerified(true);
                                  toast({ title: "Phone verified", description: "Supervisor's mobile number has been confirmed." });
                                } else {
                                  toast({ title: "Incorrect code", description: "The code entered does not match. Please try again.", variant: "destructive" });
                                }
                              } catch (err: any) {
                                toast({ title: "Verification failed", description: err.message || "Please try again.", variant: "destructive" });
                              } finally {
                                setSupervisorSmsVerifying(false);
                              }
                            }}
                            data-testid="button-verify-supervisor-sms"
                          >
                            {supervisorSmsVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSupervisorSmsSent(false); setSupervisorSmsCode(""); }}
                            data-testid="button-resend-supervisor-sms"
                          >
                            Resend
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Supervisor mobile verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Notes Section */}
            <div className="space-y-2">
              <Label htmlFor="regEmergencyNotes" className="text-xs">Emergency Notes</Label>
              <p className="text-xs text-muted-foreground">These notes will be included in all alert messages sent to contacts (e.g. medical conditions, access instructions, key safe codes).</p>
              <Textarea
                id="regEmergencyNotes"
                data-testid="input-emergency-notes"
                placeholder="e.g. Client has diabetes and uses insulin. Key safe code: 1234. Lives alone on the second floor."
                value={regEmergencyNotes}
                onChange={(e) => setRegEmergencyNotes(e.target.value)}
                maxLength={1000}
                className="text-sm resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{regEmergencyNotes.length}/1000</p>
            </div>

            {/* Emergency Contacts Section (Secondary) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Emergency Contacts (Secondary)</Label>
                  <p className="text-xs text-muted-foreground mt-1">Secondary contacts are only notified when an emergency alert is triggered.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmergencyContact}
                  data-testid="button-add-emergency-contact"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>
              
              {regEmergencyContacts.map((contact, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Contact {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmergencyContact(index)}
                        data-testid={`button-remove-contact-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                        data-testid={`input-contact-name-${index}`}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                        data-testid={`input-contact-email-${index}`}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={contact.countryCode || "+44"} onValueChange={(v) => updateEmergencyContact(index, 'countryCode', v)}>
                        <SelectTrigger className="w-full" data-testid={`select-contact-country-${index}`}>
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
                      <div className="relative">
                        <Input
                          placeholder="Phone"
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^\d\s]/g, "");
                            if (value.startsWith("0")) value = value.slice(1);
                            updateEmergencyContact(index, 'phone', value);
                          }}
                          className={contact.phone && !isValidUKPhone(contact.phone) ? "border-yellow-500" : ""}
                          data-testid={`input-contact-phone-${index}`}
                        />
                        {contact.phone && !isValidUKPhone(contact.phone) && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          </div>
                        )}
                      </div>
                      <Select 
                        value={contact.phoneType} 
                        onValueChange={(v) => updateEmergencyContact(index, 'phoneType', v)}
                      >
                        <SelectTrigger data-testid={`select-contact-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="landline">Landline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Relationship (e.g., Spouse, Parent)"
                      value={contact.relationship}
                      onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                      data-testid={`input-contact-relationship-${index}`}
                    />
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Feature Toggles */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Features</Label>
              <p className="text-xs text-muted-foreground">Choose which features this client can access</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Wellness Tracking</span>
                  </div>
                  <Switch
                    checked={regFeatures.featureMoodTracking}
                    onCheckedChange={(checked) => setRegFeatures({...regFeatures, featureMoodTracking: checked})}
                    data-testid="switch-reg-feature-mood"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-rose-500" />
                    <span className="text-sm">Pet Protection</span>
                  </div>
                  <Switch
                    checked={regFeatures.featurePetProtection}
                    onCheckedChange={(checked) => setRegFeatures({...regFeatures, featurePetProtection: checked})}
                    data-testid="switch-reg-feature-pet"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scroll className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">Documents</span>
                  </div>
                  <Switch
                    checked={regFeatures.featureDigitalWill}
                    onCheckedChange={(checked) => setRegFeatures({...regFeatures, featureDigitalWill: checked})}
                    data-testid="switch-reg-feature-will"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm">Wellbeing AI</span>
                  </div>
                  <Switch
                    checked={regFeatures.featureWellbeingAi}
                    onCheckedChange={(checked) => setRegFeatures({...regFeatures, featureWellbeingAi: checked})}
                    data-testid="switch-reg-feature-ai"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Emergency Recording</span>
                  </div>
                  <Switch
                    checked={regFeatures.featureEmergencyRecording}
                    onCheckedChange={(checked) => setRegFeatures({...regFeatures, featureEmergencyRecording: checked})}
                    data-testid="switch-reg-feature-recording"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Shake to Alert</span>
                  </div>
                  <Switch
                    checked={regFeatures.featureShakeToAlert}
                    onCheckedChange={(checked) => setRegFeatures({...regFeatures, featureShakeToAlert: checked})}
                    data-testid="switch-reg-feature-shake"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterClientDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => registerClientMutation.mutate()}
              disabled={
                !regClientName || !regClientDOB || !regSupervisorName || !regSupervisorEmail || !regSupervisorPhone || !supervisorSmsVerified || registerClientMutation.isPending ||
                (regSeatType === "check_in" && !regClientPhone)
              }
              data-testid="button-confirm-register-client"
            >
              {registerClientMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
              ) : !hasValidEmergencyContact ? (
                "Add Emergency Contact First"
              ) : regSeatType === "safeguarding" ? (
                "Register Safeguarding Seat"
              ) : (
                "Register & Send SMS"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Birthday Upgrade Dialog */}
      <Dialog open={showSendDataCaptureDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSendDataCaptureDialog(false);
          setDataCaptureRecipient("");
          setDataCapturePassword("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Data Capture
            </DialogTitle>
            <DialogDescription>
              Send the Data Capture link to a team member via SMS or email, or open it directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                variant={dataCaptureMethod === "sms" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setDataCaptureMethod("sms")}
                data-testid="button-dc-method-sms"
              >
                <Phone className="h-4 w-4 mr-1" /> SMS
              </Button>
              <Button
                variant={dataCaptureMethod === "email" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setDataCaptureMethod("email")}
                data-testid="button-dc-method-email"
              >
                <Mail className="h-4 w-4 mr-1" /> Email
              </Button>
            </div>

            {dataCaptureMethod === "sms" ? (
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <Select value={dataCaptureCountryCode} onValueChange={setDataCaptureCountryCode}>
                    <SelectTrigger className="w-24" data-testid="select-dc-country-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+44">+44 UK</SelectItem>
                      <SelectItem value="+353">+353 IE</SelectItem>
                      <SelectItem value="+1">+1 US</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="7XXX XXXXXX"
                    value={dataCaptureRecipient}
                    onChange={(e) => setDataCaptureRecipient(e.target.value.replace(/[^0-9]/g, ""))}
                    data-testid="input-dc-phone"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="staff@example.com"
                  value={dataCaptureRecipient}
                  onChange={(e) => setDataCaptureRecipient(e.target.value)}
                  data-testid="input-dc-email"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Access Password</Label>
              <p className="text-xs text-muted-foreground">The recipient will need this password to open the Data Capture page. Share it separately from the link for security.</p>
              <Input
                type="text"
                placeholder="Enter a password (min 4 characters)"
                value={dataCapturePassword}
                onChange={(e) => setDataCapturePassword(e.target.value)}
                data-testid="input-dc-password"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              disabled={!dataCaptureRecipient || dataCapturePassword.length < 4 || (dataCaptureMethod === "sms" && dataCaptureRecipient.length < 7) || sendDataCaptureLinkMutation.isPending}
              onClick={() => sendDataCaptureLinkMutation.mutate()}
              data-testid="button-send-dc-link"
            >
              {sendDataCaptureLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Send Link
            </Button>
            <Link href="/org/data-capture" className="w-full">
              <Button variant="outline" className="w-full" data-testid="button-open-dc-direct">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Data Capture
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBirthdayUpgradeDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBirthdayUpgradeDialog(false);
          setBirthdayUpgradeClient(null);
          setBirthdayUpgradePhone("");
          setBirthdayUpgradeCountryCode("+44");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Client Turned 16
            </DialogTitle>
            <DialogDescription>
              {birthdayUpgradeClient?.clientName} has turned 16 and can now be upgraded from a safeguarding seat to a check-in seat with app access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="upgradePhone">Mobile Number</Label>
              <div className="flex gap-2">
                <Select value={birthdayUpgradeCountryCode} onValueChange={setBirthdayUpgradeCountryCode}>
                  <SelectTrigger className="w-24" data-testid="select-upgrade-country-code">
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
                <div className="flex-1">
                  <Input
                    id="upgradePhone"
                    type="tel"
                    placeholder="7XXX XXXXXX"
                    value={birthdayUpgradePhone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d\s]/g, "");
                      if (value.startsWith("0")) value = value.slice(1);
                      setBirthdayUpgradePhone(value);
                    }}
                    data-testid="input-upgrade-phone"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                An SMS will be sent with a link to download the AOK app and their reference code.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (birthdayUpgradeClient) {
                  dismissBirthdayUpgradeMutation.mutate(birthdayUpgradeClient.orgClientId);
                }
                setShowBirthdayUpgradeDialog(false);
                setBirthdayUpgradeClient(null);
                setBirthdayUpgradePhone("");
              }}
              data-testid="button-dismiss-birthday-upgrade"
            >
              Not Now
            </Button>
            <Button
              onClick={() => {
                if (birthdayUpgradeClient && birthdayUpgradePhone) {
                  upgradeToChekinMutation.mutate({
                    orgClientId: birthdayUpgradeClient.orgClientId,
                    clientPhone: `${birthdayUpgradeCountryCode}${birthdayUpgradePhone.replace(/\s/g, "")}`,
                  });
                }
              }}
              disabled={!birthdayUpgradePhone || upgradeToChekinMutation.isPending}
              data-testid="button-confirm-upgrade"
            >
              {upgradeToChekinMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Upgrading...</>
              ) : (
                "Upgrade & Send SMS"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Clients Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        if (!open && importStep !== "importing") {
          setShowImportDialog(false);
          resetImportForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Clients from Spreadsheet
            </DialogTitle>
            <DialogDescription>
              Upload an Excel spreadsheet (.xlsx, .xls) to register multiple clients at once.
            </DialogDescription>
          </DialogHeader>

          {importStep === "upload" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <p className="text-xs text-muted-foreground">Use our template for best results</p>
              </div>

              <div
                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => document.getElementById("import-file-input")?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                data-testid="dropzone-import"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files (max 100 clients)</p>
                <input
                  id="import-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                  data-testid="input-import-file"
                />
              </div>

              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-2">Required Columns</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Client Name</span>
                  <span>Mobile Number</span>
                  <span>Emergency Contact 1 Name</span>
                  <span>Emergency Contact 1 Email</span>
                </div>
                <h4 className="text-sm font-semibold mt-3 mb-2">Optional Columns</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Email</span>
                  <span>Date of Birth</span>
                  <span>Special Needs</span>
                  <span>Medical Notes</span>
                  <span>Emergency Instructions</span>
                  <span>Check-in Interval (Hours)</span>
                  <span>Emergency Contact 1 Phone</span>
                  <span>Emergency Contact 1 Relationship</span>
                  <span>Emergency Contact 2 (Name/Email/Phone/Relationship)</span>
                  <span>Emergency Contact 3 (Name/Email/Phone/Relationship)</span>
                </div>
              </Card>
            </div>
          )}

          {importStep === "preview" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{importData.length} client{importData.length !== 1 ? "s" : ""} found</Badge>
                  {importErrors.length > 0 && (
                    <Badge variant="destructive">{importErrors.length} row{importErrors.length !== 1 ? "s" : ""} with errors</Badge>
                  )}
                  {importErrors.length === 0 && (
                    <Badge className="bg-green-600 text-white">All rows valid</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setImportStep("upload"); setImportFile(null); setImportData([]); setImportErrors([]); }}>
                  Choose Different File
                </Button>
              </div>

              {importFile && (
                <p className="text-xs text-muted-foreground">File: {importFile.name}</p>
              )}

              {importErrors.length > 0 && (
                <Card className="p-3 border-destructive">
                  <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Errors
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.map((err, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium">Row {err.row}:</span>{" "}
                        <span className="text-muted-foreground">{err.errors.join("; ")}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {activeBundles.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to Bundle</Label>
                  <Select value={importBundleId} onValueChange={setImportBundleId}>
                    <SelectTrigger data-testid="select-import-bundle">
                      <SelectValue placeholder="Select a bundle (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No bundle</SelectItem>
                      {activeBundles.map((bundle) => (
                        <SelectItem 
                          key={bundle.id} 
                          value={bundle.id}
                          disabled={bundle.seatsUsed >= bundle.seatLimit}
                        >
                          {bundle.name} ({bundle.seatsUsed}/{bundle.seatLimit} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      <th className="px-2 py-1.5 text-left font-medium">Name</th>
                      <th className="px-2 py-1.5 text-left font-medium">Mobile</th>
                      <th className="px-2 py-1.5 text-left font-medium">Email</th>
                      <th className="px-2 py-1.5 text-left font-medium">DOB</th>
                      <th className="px-2 py-1.5 text-left font-medium">Special Needs</th>
                      <th className="px-2 py-1.5 text-left font-medium">Emergency Contacts</th>
                      <th className="px-2 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((client, idx) => {
                      const rowError = importErrors.find(e => e.row === idx + 2);
                      return (
                        <tr key={idx} className={rowError ? "bg-destructive/5" : ""} data-testid={`row-import-client-${idx}`}>
                          <td className="px-2 py-1.5">{idx + 1}</td>
                          <td className="px-2 py-1.5 font-medium">{client.clientName || "-"}</td>
                          <td className="px-2 py-1.5">{client.clientPhone || "-"}</td>
                          <td className="px-2 py-1.5">{client.clientEmail || "-"}</td>
                          <td className="px-2 py-1.5">{client.dateOfBirth || "-"}</td>
                          <td className="px-2 py-1.5 max-w-[120px] truncate">{client.specialNeeds || "-"}</td>
                          <td className="px-2 py-1.5">
                            {client.emergencyContacts.length > 0
                              ? client.emergencyContacts.map(ec => ec.name).join(", ")
                              : "-"
                            }
                          </td>
                          <td className="px-2 py-1.5">
                            {rowError ? (
                              <XOctagon className="h-3.5 w-3.5 text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importStep === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Importing {importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2)).length} clients...</p>
              <p className="text-xs text-muted-foreground">Each client will receive an SMS with their reference code</p>
            </div>
          )}

          {importStep === "results" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600 text-white">
                  {importResults.filter(r => r.success).length} imported
                </Badge>
                {importResults.filter(r => !r.success).length > 0 && (
                  <Badge variant="destructive">
                    {importResults.filter(r => !r.success).length} failed
                  </Badge>
                )}
              </div>

              <div className="border rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      <th className="px-2 py-1.5 text-left font-medium">Client Name</th>
                      <th className="px-2 py-1.5 text-left font-medium">Reference Code</th>
                      <th className="px-2 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.map((result, idx) => (
                      <tr key={idx} className={result.success ? "" : "bg-destructive/5"} data-testid={`row-import-result-${idx}`}>
                        <td className="px-2 py-1.5">{result.row}</td>
                        <td className="px-2 py-1.5 font-medium">{result.clientName}</td>
                        <td className="px-2 py-1.5">
                          {result.referenceCode ? (
                            <Badge variant="secondary">{result.referenceCode}</Badge>
                          ) : "-"}
                        </td>
                        <td className="px-2 py-1.5">
                          {result.success ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Imported
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <XOctagon className="h-3.5 w-3.5" /> {result.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            {importStep === "upload" && (
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
            )}
            {importStep === "preview" && (
              <>
                <Button variant="outline" onClick={() => { setShowImportDialog(false); resetImportForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const validClients = importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2));
                    if (validClients.length === 0) {
                      toast({ title: "No valid rows", description: "Please fix all errors before importing.", variant: "destructive" });
                      return;
                    }
                    setImportData(validClients);
                    setImportStep("importing");
                    importClientsMutation.mutate({ clients: validClients, bundleId: importBundleId || undefined });
                  }}
                  disabled={importClientsMutation.isPending}
                  data-testid="button-confirm-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import {importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2)).length} Client{importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2)).length !== 1 ? "s" : ""}
                </Button>
              </>
            )}
            {importStep === "results" && (
              <Button onClick={() => { setShowImportDialog(false); resetImportForm(); }} data-testid="button-close-import-results">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {legalDocsData && legalDocsData.totalRequired > 0 && !legalDocsData.isValid && (
          <Card className="border-amber-300 dark:border-amber-700" data-testid="card-legal-docs-warning">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Legal Documents Pending</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your organisation has {legalDocsData.totalRequired - legalDocsData.totalSigned} document{legalDocsData.totalRequired - legalDocsData.totalSigned !== 1 ? "s" : ""} awaiting signature. Please review and sign to activate your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {legalDocsData && legalDocsData.assignedDocuments.length > 0 && (
          <Card data-testid="card-legal-documents">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base">Legal Documents</CardTitle>
              </div>
              {legalDocsData.isValid ? (
                <Badge variant="default" data-testid="badge-all-signed">All Signed</Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-docs-pending">{legalDocsData.totalSigned}/{legalDocsData.totalRequired} Signed</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {legalDocsData.assignedDocuments.map((doc) => {
                  const sig = legalDocsData.signatures.find(s => s.documentId === doc.documentId);
                  return (
                    <div key={doc.id} className="flex items-center justify-between gap-3 py-2 px-3 border rounded-md" data-testid={`legal-doc-${doc.documentId}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium">{docIdToTitle[doc.documentId] || doc.documentId}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {doc.signedAt ? (
                          <>
                            <Badge variant="default" className="text-xs" data-testid={`badge-doc-signed-${doc.documentId}`}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Signed
                            </Badge>
                            {sig && (
                              <span className="text-xs text-muted-foreground">
                                by {sig.signerName} on {new Date(sig.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-doc-pending-${doc.documentId}`}>Awaiting Signature</Badge>
                            <Link href={`/${doc.documentId}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-doc-${doc.documentId}`}>
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="default"
                              size="sm"
                              data-testid={`button-sign-doc-${doc.documentId}`}
                              onClick={() => {
                                setLegalSignDocId(doc.documentId);
                                setLegalSignDocTitle(docIdToTitle[doc.documentId] || doc.documentId);
                                setLegalSignerName("");
                                setLegalSignerEmail("");
                                setLegalSignerRole("");
                                setLegalSignConsent(false);
                                setLegalSignTypedSig("");
                                setShowLegalSignDialog(true);
                              }}
                            >
                              <PenLine className="w-3 h-3 mr-1" />
                              Sign
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-clients">{stats?.seatsUsed || 0} / {stats?.totalSeats || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalClients || 0} client{(stats?.totalClients || 0) !== 1 ? 's' : ''}, {stats?.totalStaff || 0} staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safe</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-clients-safe">{stats?.clientsSafe || 0}</div>
            <p className="text-xs text-muted-foreground">Clients checked in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-clients-pending">{stats?.clientsPending || 0}</div>
            <p className="text-xs text-muted-foreground">Check-in due soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-clients-overdue">{stats?.clientsOverdue || 0}</div>
            <p className="text-xs text-muted-foreground">Missed check-in</p>
            <Link href="/org/missed-checkins">
              <Button variant="ghost" size="sm" className="px-0 h-auto text-xs underline" data-testid="link-view-missed-checkins">
                View All
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        {(stats?.clientsAwaitingActivation || 0) > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Activated</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground" data-testid="text-clients-awaiting">{stats?.clientsAwaitingActivation || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting SMS activation</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className={stats?.totalEmergencyAlerts && stats.totalEmergencyAlerts > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <AlertOctagon className={`h-5 w-5 ${stats?.totalEmergencyAlerts && stats.totalEmergencyAlerts > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          <CardTitle className={`text-sm font-medium ${stats?.totalEmergencyAlerts && stats.totalEmergencyAlerts > 0 ? "text-destructive" : ""}`}>Emergency Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats?.totalEmergencyAlerts && stats.totalEmergencyAlerts > 0 ? "text-destructive" : "text-muted-foreground"}`} data-testid="text-emergency-alerts">
            {stats?.totalEmergencyAlerts || 0}
          </div>
          <p className="text-xs text-muted-foreground">Total emergency alerts from your clients</p>
          <Link href="/org/emergency-alerts">
            <Button variant="ghost" size="sm" className="px-0 h-auto text-xs underline" data-testid="link-view-emergency-alerts">
              View All
            </Button>
          </Link>
        </CardContent>
      </Card>

      <ActiveSOSPanel apiEndpoint="/api/org/alerts/active-sos" testIdPrefix="org-dash" />

      {/* Comprehensive Audit Trail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Activity Log</CardTitle>
              <CardDescription>Complete record of all actions taken in your organisation</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAuditTrail(!showAuditTrail)}
            data-testid="button-toggle-audit-trail"
          >
            {showAuditTrail ? (
              <><ChevronUp className="h-4 w-4 mr-1" /> Hide</>
            ) : (
              <><ChevronDown className="h-4 w-4 mr-1" /> Show</>
            )}
          </Button>
        </CardHeader>
        {showAuditTrail && (
          <CardContent className="space-y-4">
            {expirationWarning?.warning && (
              <div
                className={`flex items-start gap-3 p-4 rounded-md border ${
                  expirationWarning.expired
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200"
                }`}
                role="alert"
                data-testid="audit-expiration-warning"
              >
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  {expirationWarning.expired ? (
                    <p>
                      <strong>Audit data has expired.</strong> Some records have exceeded the retention period and are due for deletion. Run a cleanup to remove expired entries.
                    </p>
                  ) : (
                    <p>
                      <strong>Audit data expiring soon.</strong>{" "}
                      {expirationWarning.daysRemaining! <= 30
                        ? `Your oldest audit records will expire in ${expirationWarning.daysRemaining} days.`
                        : `Your oldest audit records will expire in approximately ${expirationWarning.monthsRemaining} month${expirationWarning.monthsRemaining! > 1 ? "s" : ""}.`}{" "}
                      Please export any records you need to keep before they are automatically removed under your retention policy.
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activity..."
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(0); }}
                  className="pl-9"
                  data-testid="input-audit-search"
                />
              </div>
              <Select value={auditEntityFilter} onValueChange={(v) => { setAuditEntityFilter(v); setAuditPage(0); }}>
                <SelectTrigger className="sm:w-48" data-testid="select-audit-entity-filter">
                  <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="client">Client Management</SelectItem>
                  <SelectItem value="client_emergency_contacts">Emergency Contacts</SelectItem>
                  <SelectItem value="client_schedule">Check-in Schedule</SelectItem>
                  <SelectItem value="client_status">Client Status</SelectItem>
                  <SelectItem value="client_features">Feature Settings</SelectItem>
                  <SelectItem value="emergency_alert">Emergency Alerts</SelectItem>
                  <SelectItem value="incident">Incidents</SelectItem>
                  <SelectItem value="welfare_concern">Welfare Concerns</SelectItem>
                  <SelectItem value="case_file">Case Files</SelectItem>
                  <SelectItem value="case_note">Case Notes</SelectItem>
                  <SelectItem value="escalation_rule">Escalation Rules</SelectItem>
                  <SelectItem value="risk_report">Risk Reports</SelectItem>
                  <SelectItem value="staff_invite">Staff Invitations</SelectItem>
                  <SelectItem value="team_invite">Team Invitations</SelectItem>
                  <SelectItem value="team_member_role">Team Roles</SelectItem>
                  <SelectItem value="team_member_status">Team Status</SelectItem>
                  <SelectItem value="team_member">Team Members</SelectItem>
                </SelectContent>
              </Select>
              <Select value={auditActionFilter} onValueChange={(v) => { setAuditActionFilter(v); setAuditPage(0); }}>
                <SelectTrigger className="sm:w-40" data-testid="select-audit-action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Created</SelectItem>
                  <SelectItem value="update">Updated</SelectItem>
                  <SelectItem value="delete">Deleted</SelectItem>
                  <SelectItem value="archive">Archived</SelectItem>
                  <SelectItem value="restore">Restored</SelectItem>
                  <SelectItem value="pause">Paused</SelectItem>
                  <SelectItem value="resume">Resumed</SelectItem>
                  <SelectItem value="reset_password">Password Reset</SelectItem>
                  <SelectItem value="export">Exported</SelectItem>
                  <SelectItem value="acknowledge">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export & Integrity Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (auditEntityFilter !== "all") params.set("entityType", auditEntityFilter);
                  if (auditActionFilter !== "all") params.set("action", auditActionFilter);
                  window.open(`/api/org/reports/audit/csv?${params.toString()}`, "_blank");
                }}
                data-testid="button-export-audit-csv"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/org/reports/summary/pdf", "_blank")}
                data-testid="button-export-summary-pdf"
              >
                <FileText className="h-4 w-4 mr-1" /> Summary PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/org/audit-trail/verify", { credentials: "include" });
                    const result = await res.json();
                    if (result.valid) {
                      toast({ title: "Integrity Verified", description: `All ${result.totalChecked} entries verified. No tampering detected.` });
                    } else {
                      toast({ title: "Integrity Alert", description: `Chain broken at entry ${result.firstBrokenId}. Possible tampering detected.`, variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Error", description: "Failed to verify audit chain.", variant: "destructive" });
                  }
                }}
                data-testid="button-verify-audit-chain"
              >
                <ShieldCheck className="h-4 w-4 mr-1" /> Verify Integrity
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRetentionSettings(!showRetentionSettings)}
                data-testid="button-toggle-retention-settings"
              >
                <Settings className="h-4 w-4 mr-1" /> Retention Policy
              </Button>
            </div>

            {showRetentionSettings && (
              <div className="p-4 rounded-md border space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Audit Data Retention Policy</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set how long audit trail records are kept before automatic deletion. Minimum 1 year, maximum 10 years. Default is 6 years.
                </p>
                <div className="flex items-center gap-3">
                  <Select
                    value={String(retentionDays)}
                    onValueChange={(v) => setRetentionDays(Number(v))}
                  >
                    <SelectTrigger className="w-48" data-testid="select-retention-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                      <SelectItem value="1095">3 years</SelectItem>
                      <SelectItem value="1825">5 years</SelectItem>
                      <SelectItem value="2190">6 years (default)</SelectItem>
                      <SelectItem value="2555">7 years</SelectItem>
                      <SelectItem value="3650">10 years</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={retentionSaving}
                    onClick={async () => {
                      setRetentionSaving(true);
                      try {
                        const res = await fetch("/api/org/settings/retention", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ retentionPolicyDays: retentionDays }),
                        });
                        if (!res.ok) throw new Error("Failed to save");
                        toast({ title: "Saved", description: `Retention policy updated to ${Math.round(retentionDays / 365)} year(s).` });
                      } catch {
                        toast({ title: "Error", description: "Failed to save retention policy.", variant: "destructive" });
                      } finally {
                        setRetentionSaving(false);
                      }
                    }}
                    data-testid="button-save-retention"
                  >
                    {retentionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            )}

            {/* Group By selector */}
            <div className="flex items-center gap-2">
              <Select value={auditGroupBy} onValueChange={(v: "none" | "date" | "user") => { setAuditGroupBy(v); setExpandedAuditGroups(new Set()); }}>
                <SelectTrigger className="w-44" data-testid="select-audit-group-by">
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
              {auditGroupBy !== "none" && auditData && auditData.entries.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const keys = new Set<string>();
                      auditData.entries.forEach(e => {
                        keys.add(auditGroupBy === "date" ? format(new Date(e.createdAt), "dd/MM/yyyy") : (e.userEmail || "System"));
                      });
                      setExpandedAuditGroups(keys);
                    }}
                    data-testid="button-audit-expand-all"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedAuditGroups(new Set())}
                    data-testid="button-audit-collapse-all"
                  >
                    Collapse All
                  </Button>
                </div>
              )}
            </div>

            {/* Results */}
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : auditData && auditData.entries.length > 0 ? (
              <div className="space-y-2">
                {auditGroupBy === "none" ? (
                  auditData.entries.map((entry) => {
                    const desc = getAuditDescription(entry);
                    const isExpanded = expandedAuditEntry === entry.id;
                    const hasDetails = entry.newData || entry.previousData;
                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg border space-y-2"
                        data-testid={`audit-entry-${entry.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5">{desc.icon}</div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-medium" data-testid={`audit-description-${entry.id}`}>{desc.text}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={desc.actionVariant as any} className="text-xs capitalize">{entry.action.replace(/_/g, " ")}</Badge>
                                <Badge variant="outline" className="text-xs capitalize">{entry.entityType.replace(/_/g, " ")}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {entry.userEmail || "System"}{entry.userRole ? ` (${entry.userRole})` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                            </span>
                            {hasDetails && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedAuditEntry(isExpanded ? null : entry.id)}
                                data-testid={`button-expand-audit-${entry.id}`}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isExpanded && hasDetails && (
                          <div className="ml-8 p-3 rounded-md bg-muted/50 space-y-2 text-xs">
                            {entry.newData && (
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Details:</p>
                                <div className="space-y-1">
                                  {Object.entries(entry.newData as Record<string, any>).map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:</span>
                                      <span className="font-medium">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.previousData && (
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Previous values:</p>
                                <div className="space-y-1">
                                  {Object.entries(entry.previousData as Record<string, any>).map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:</span>
                                      <span className="font-medium line-through">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  (() => {
                    const groups = new Map<string, typeof auditData.entries>();
                    auditData.entries.forEach(entry => {
                      const key = auditGroupBy === "date"
                        ? format(new Date(entry.createdAt), "dd/MM/yyyy")
                        : (entry.userEmail || "System");
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(entry);
                    });
                    const sorted = Array.from(groups.entries());
                    if (auditGroupBy === "date") {
                      sorted.sort((a, b) => {
                        const dA = new Date(a[1][0].createdAt);
                        const dB = new Date(b[1][0].createdAt);
                        return dB.getTime() - dA.getTime();
                      });
                    } else {
                      sorted.sort((a, b) => a[0].localeCompare(b[0]));
                    }
                    return sorted.map(([groupKey, groupEntries]) => {
                      const isGroupOpen = expandedAuditGroups.has(groupKey);
                      return (
                        <div key={groupKey} className="rounded-lg border">
                          <button
                            onClick={() => {
                              setExpandedAuditGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(groupKey)) next.delete(groupKey);
                                else next.add(groupKey);
                                return next;
                              });
                            }}
                            className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover-elevate rounded-lg"
                            data-testid={`button-audit-group-${groupKey.replace(/[^a-zA-Z0-9]/g, '-')}`}
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isGroupOpen ? "rotate-90" : ""}`} />
                              {auditGroupBy === "date" ? (
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
                              {groupEntries.map((entry) => {
                                const desc = getAuditDescription(entry);
                                const isExpanded = expandedAuditEntry === entry.id;
                                const hasDetails = entry.newData || entry.previousData;
                                return (
                                  <div
                                    key={entry.id}
                                    className="p-3 rounded-lg border space-y-2"
                                    data-testid={`audit-entry-${entry.id}`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 min-w-0">
                                        <div className="mt-0.5">{desc.icon}</div>
                                        <div className="min-w-0 space-y-0.5">
                                          <p className="text-sm font-medium" data-testid={`audit-description-${entry.id}`}>{desc.text}</p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={desc.actionVariant as any} className="text-xs capitalize">{entry.action.replace(/_/g, " ")}</Badge>
                                            <Badge variant="outline" className="text-xs capitalize">{entry.entityType.replace(/_/g, " ")}</Badge>
                                          </div>
                                          {auditGroupBy !== "user" && (
                                            <p className="text-xs text-muted-foreground">
                                              {entry.userEmail || "System"}{entry.userRole ? ` (${entry.userRole})` : ""}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          {auditGroupBy === "date" 
                                            ? format(new Date(entry.createdAt), "HH:mm")
                                            : format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")
                                          }
                                        </span>
                                        {hasDetails && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setExpandedAuditEntry(isExpanded ? null : entry.id)}
                                            data-testid={`button-expand-audit-${entry.id}`}
                                          >
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    {isExpanded && hasDetails && (
                                      <div className="ml-8 p-3 rounded-md bg-muted/50 space-y-2 text-xs">
                                        {entry.newData && (
                                          <div>
                                            <p className="font-medium text-muted-foreground mb-1">Details:</p>
                                            <div className="space-y-1">
                                              {Object.entries(entry.newData as Record<string, any>).map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:</span>
                                                  <span className="font-medium">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {entry.previousData && (
                                          <div>
                                            <p className="font-medium text-muted-foreground mb-1">Previous values:</p>
                                            <div className="space-y-1">
                                              {Object.entries(entry.previousData as Record<string, any>).map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:</span>
                                                  <span className="font-medium line-through">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}

                {/* Pagination */}
                {auditData.total > AUDIT_PAGE_SIZE && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Showing {auditPage * AUDIT_PAGE_SIZE + 1}-{Math.min((auditPage + 1) * AUDIT_PAGE_SIZE, auditData.total)} of {auditData.total}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={auditPage === 0}
                        onClick={() => setAuditPage(p => p - 1)}
                        data-testid="button-audit-prev"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={(auditPage + 1) * AUDIT_PAGE_SIZE >= auditData.total}
                        onClick={() => setAuditPage(p => p + 1)}
                        data-testid="button-audit-next"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity records found</p>
                {(auditEntityFilter !== "all" || auditActionFilter !== "all" || auditSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => { setAuditEntityFilter("all"); setAuditActionFilter("all"); setAuditSearch(""); setAuditPage(0); }}
                    data-testid="button-clear-audit-filters"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Your Clients</CardTitle>
            <CardDescription>
              {clients && clients.length > 0 
                ? `${filteredClients.length} of ${clients.length} clients`
                : "Monitor the check-in status of all your clients"}
            </CardDescription>
          </div>
          
          {/* Search Fields */}
          {clients && clients.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-client-name"
                />
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-client-email"
                />
              </div>
              <div className="sm:w-32 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ref #..."
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-client-ref"
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clients yet</p>
              <p className="text-sm">Add clients to view their check-in status</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No clients match your search</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => { setSearchName(""); setSearchEmail(""); setSearchRef(""); }}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div 
                  key={client.id} 
                  className={`flex items-center justify-between p-4 border rounded-lg hover-elevate ${client.clientStatus !== "active" ? "opacity-60" : ""}`}
                  data-testid={`card-client-${client.clientId}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-medium text-sm">
                      {client.clientOrdinal}
                    </div>
                    {getStatusIcon(client.status.status, "md")}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {client.hasActiveEmergency && (
                          <Bell className="h-4 w-4 text-destructive animate-pulse" data-testid={`icon-emergency-bell-${client.id}`} />
                        )}
                        {client.nickname || client.clientName || client.client?.name || "Pending"}
                        {client.nickname && client.client && (
                          <span className="text-muted-foreground text-sm">({client.client.name})</span>
                        )}
                        {getClientStatusBadge(client.clientStatus)}
                        {(client as any).seatType === "safeguarding" && (
                          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                            <Shield className="h-3 w-3 mr-1" />Safeguarding
                          </Badge>
                        )}
                        {client.registrationStatus && client.registrationStatus !== "registered" && (
                          <Badge variant="outline" className="text-xs">
                            {client.registrationStatus === "pending_sms" ? "SMS Pending" : "Awaiting Registration"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{client.client?.email || client.clientPhone || "No contact info"}</span>
                        {client.referenceCode && (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded" title="Reference code">
                            {client.referenceCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        {client.status.lastCheckIn && (
                          <span>Last check-in: {formatDistanceToNow(new Date(client.status.lastCheckIn), { addSuffix: true })}</span>
                        )}
                        {client.alertCounts && client.alertCounts.total > 0 && (
                          <span className="text-destructive">
                            {client.alertCounts.total} alert{client.alertCounts.total !== 1 ? "s" : ""}
                          </span>
                        )}
                        {client.features && (
                          <div className="flex items-center gap-1" title="Enabled features">
                            {client.features.featureWellbeingAi && (
                              <span title="Wellbeing AI"><ExternalLink className="h-3 w-3 text-emerald-500" /></span>
                            )}
                            {client.features.featureMoodTracking && (
                              <span title="Mood Tracking"><TrendingUp className="h-3 w-3 text-blue-500" /></span>
                            )}
                            {client.features.featurePetProtection && (
                              <span title="Pet Protection"><PawPrint className="h-3 w-3 text-rose-500" /></span>
                            )}
                            {client.features.featureDigitalWill && (
                              <span title="Documents"><Scroll className="h-3 w-3 text-slate-500" /></span>
                            )}
                            {client.features.featureEmergencyRecording && (
                              <span title="Emergency Recording"><Video className="h-3 w-3 text-red-500" /></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(client.status.status)}
                    {client.hasActiveEmergency && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="animate-pulse" data-testid={`badge-emergency-${client.clientId}`}>
                            <AlertOctagon className="h-3 w-3 mr-1" />
                            SOS Active
                          </Badge>
                        </div>
                        {/* Alert details - time and location */}
                        <div className="text-xs text-destructive">
                          {client.emergencyAlertActivatedAt && (
                            <span>
                              {new Date(client.emergencyAlertActivatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(client.emergencyAlertActivatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {client.emergencyAlertWhat3Words && (
                            <a 
                              href={`https://what3words.com/${client.emergencyAlertWhat3Words}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 underline font-medium"
                            >
                              ///{client.emergencyAlertWhat3Words}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {client.clientStatus === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateClientStatusMutation.mutate({ orgClientId: client.id, status: "paused" })}
                        disabled={updateClientStatusMutation.isPending}
                        data-testid={`button-pause-client-${client.clientId}`}
                      >
                        Pause
                      </Button>
                    ) : client.clientStatus === "paused" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateClientStatusMutation.mutate({ orgClientId: client.id, status: "active" })}
                        disabled={updateClientStatusMutation.isPending}
                        data-testid={`button-resume-client-${client.clientId}`}
                      >
                        Resume
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClientDetails(client)}
                      data-testid={`button-view-client-${client.clientId}`}
                    >
                      View Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                      data-testid={`button-edit-client-${client.clientId || client.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageEmergencyContacts(client)}
                      data-testid={`button-emergency-contacts-${client.clientId || client.id}`}
                    >
                      Emergency Contacts
                    </Button>
                    {client.referenceCode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendPasswordClick(client)}
                        data-testid={`button-resend-password-${client.clientId || client.id}`}
                      >
                        Resend SMS
                      </Button>
                    )}
                    {client.client && client.clientId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScheduleClientId(client.id);
                          setScheduleClientName(client.nickname || client.clientName || client.client?.name || "Client");
                          setScheduleStartTime(client.scheduleStartTime ? new Date(client.scheduleStartTime).toTimeString().slice(0, 5) : "10:00");
                          setScheduleIntervalHours(client.checkInIntervalHours || 24);
                          setShowScheduleDialog(true);
                        }}
                        data-testid={`button-schedule-${client.clientId}`}
                      >
                        Adjust Check-in Time
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeClientMutation.mutate(client.clientId || client.id)}
                      disabled={removeClientMutation.isPending}
                      data-testid={`button-remove-client-${client.clientId || client.id}`}
                      title="Archive client"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {archivedClients && archivedClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archived Clients ({archivedClients.length})
            </CardTitle>
            <CardDescription>Previously removed clients. You can restore them to make them active again.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {archivedClients.map((client: any) => (
                <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`archived-client-${client.id}`}>
                  <div>
                    <p className="font-medium">{client.clientName || client.nickname || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{client.clientEmail || client.clientPhone || ""}</p>
                    <p className="text-xs text-muted-foreground">
                      Archived: {client.archivedAt ? new Date(client.archivedAt).toLocaleDateString("en-GB") : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">Archived</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreClientMutation.mutate(client.id)}
                      disabled={restoreClientMutation.isPending}
                      data-testid={`button-restore-client-${client.id}`}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                    {isSenior && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPermanentDeleteClient(client)}
                        disabled={permanentDeleteMutation.isPending}
                        data-testid={`button-permanent-delete-client-${client.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedClient} onOpenChange={() => { setSelectedClient(null); setEditingProfile(false); setClientAlerts(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium text-sm">
                {selectedClient?.clientOrdinal}
              </span>
              {selectedClient?.nickname || selectedClient?.clientName || selectedClient?.client?.name || "Client"}
              {selectedClient && getClientStatusBadge(selectedClient.clientStatus)}
              {selectedClient?.registrationStatus && selectedClient.registrationStatus !== "registered" && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {selectedClient.registrationStatus === "pending_sms" ? "SMS Pending" : "Awaiting Registration"}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              <Mail className="h-3 w-3" />
              {selectedClient?.client?.email || selectedClient?.clientPhone || "No contact info"}
              {(selectedClient?.client?.mobileNumber || selectedClient?.clientPhone) && (
                <>
                  <Phone className="h-3 w-3 ml-2" />
                  {selectedClient?.client?.mobileNumber || selectedClient?.clientPhone}
                </>
              )}
              {selectedClient?.referenceCode && (
                <>
                  <KeyRound className="h-3 w-3 ml-2" />
                  <span className="font-mono font-medium">{selectedClient.referenceCode}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
                <TabsTrigger value="contacts" data-testid="tab-contacts">
                  Contacts {clientContacts.length > 0 ? `(${clientContacts.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="alerts" data-testid="tab-alerts">
                  Alerts {clientAlerts?.counts?.total ? `(${clientAlerts.counts.total})` : ""}
                </TabsTrigger>
                <TabsTrigger value="features" data-testid="tab-features" onClick={() => fetchClientFeatures(selectedClient.id)}>
                  Features
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                {selectedClient.referenceCode && (
                  <div className="p-4 bg-muted rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Reference Code</p>
                        <p className="text-2xl font-mono font-bold tracking-wider" data-testid="text-client-reference-code">
                          {selectedClient.referenceCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Client uses this code to sign in to the app
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedClient.referenceCode!);
                          toast({
                            title: "Copied",
                            description: "Reference code copied to clipboard",
                          });
                        }}
                        data-testid="button-copy-reference-code"
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendPasswordClick(selectedClient)}
                        disabled={resendPasswordMutation.isPending}
                        data-testid="button-resend-reference-sms"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Resend SMS
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  {getStatusIcon(selectedClient.status.status, "md")}
                  <div>
                    <div className="font-medium">Check-in Status</div>
                    <div className="text-sm text-muted-foreground">{getStatusBadge(selectedClient.status.status)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Check-in</p>
                    <p className="font-medium">
                      {selectedClient.status.lastCheckIn 
                        ? format(new Date(selectedClient.status.lastCheckIn), "d MMM yyyy HH:mm")
                        : "Never"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Due</p>
                    <p className="font-medium">
                      {selectedClient.status.nextCheckInDue 
                        ? format(new Date(selectedClient.status.nextCheckInDue), "d MMM yyyy HH:mm")
                        : "Not set"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Streak</p>
                    <p className="font-medium">{selectedClient.status.streak} check-ins</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Added</p>
                    <p className="font-medium">
                      {format(new Date(selectedClient.addedAt), "d MMM yyyy")}
                    </p>
                  </div>
                </div>

                {selectedClient.lastAlert && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Last Alert</p>
                    <div className={`p-3 rounded-lg ${selectedClient.lastAlert.message.includes("EMERGENCY") ? "bg-destructive/10" : "bg-muted"}`}>
                      <p className="text-sm">{selectedClient.lastAlert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(selectedClient.lastAlert.timestamp), "d MMM yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </h4>
                  {!editingProfile && (
                    <Button variant="outline" size="sm" onClick={() => {
                      // Parse country code from existing phone
                      const existingPhone = selectedClient.clientPhone || "";
                      let code = "+44";
                      let phoneNum = existingPhone;
                      if (existingPhone.startsWith("+44")) {
                        code = "+44"; phoneNum = existingPhone.slice(3);
                      } else if (existingPhone.startsWith("+1")) {
                        code = "+1"; phoneNum = existingPhone.slice(2);
                      } else if (existingPhone.startsWith("+353")) {
                        code = "+353"; phoneNum = existingPhone.slice(4);
                      } else if (existingPhone.startsWith("+33")) {
                        code = "+33"; phoneNum = existingPhone.slice(3);
                      } else if (existingPhone.startsWith("+49")) {
                        code = "+49"; phoneNum = existingPhone.slice(3);
                      }
                      setProfileCountryCode(code);
                      setProfileData({
                        ...(selectedClient.profile || {}),
                        phone: phoneNum,
                        email: selectedClient.clientEmail || "",
                      });
                      setEditingProfile(true);
                    }} data-testid="button-edit-profile">
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {editingProfile ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contact Information
                      </Label>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Phone Number</Label>
                          <div className="flex gap-2">
                            <Select value={profileCountryCode} onValueChange={setProfileCountryCode}>
                              <SelectTrigger className="w-24" data-testid="select-profile-country-code">
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
                            <div className="flex-1 relative">
                              <Input
                                type="tel"
                                placeholder="7XXX XXXXXX"
                                value={profileData.phone ?? ""}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/[^\d\s]/g, "");
                                  if (value.startsWith("0")) value = value.slice(1);
                                  setProfileData({ ...profileData, phone: value });
                                }}
                                className={profileData.phone && !isValidUKPhone(profileData.phone) ? "border-yellow-500" : ""}
                                data-testid="input-client-phone"
                              />
                              {profileData.phone && !isValidUKPhone(profileData.phone) && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                </div>
                              )}
                            </div>
                          </div>
                          {profileData.phone && !isValidUKPhone(profileData.phone) && (
                            <p className="text-xs text-yellow-600">UK mobile numbers should be 10 digits</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Email Address</Label>
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={profileData.email ?? ""}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            data-testid="input-client-email"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input
                          type="date"
                          value={profileData.dateOfBirth || ""}
                          onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                          data-testid="input-dob"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address
                      </Label>
                      <Input
                        placeholder="Address Line 1"
                        value={profileData.addressLine1 || ""}
                        onChange={(e) => setProfileData({ ...profileData, addressLine1: e.target.value })}
                        data-testid="input-address1"
                      />
                      <Input
                        placeholder="Address Line 2"
                        value={profileData.addressLine2 || ""}
                        onChange={(e) => setProfileData({ ...profileData, addressLine2: e.target.value })}
                        data-testid="input-address2"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="City"
                          value={profileData.city || ""}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          data-testid="input-city"
                        />
                        <Input
                          placeholder="Postal Code"
                          value={profileData.postalCode || ""}
                          onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                          data-testid="input-postal"
                        />
                        <Input
                          placeholder="Country"
                          value={profileData.country || ""}
                          onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                          data-testid="input-country"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Vulnerabilities / Special Needs
                      </Label>
                      <Textarea
                        placeholder="Any vulnerabilities, medical conditions, or special needs to be aware of..."
                        value={profileData.vulnerabilities || ""}
                        onChange={(e) => setProfileData({ ...profileData, vulnerabilities: e.target.value })}
                        rows={3}
                        data-testid="input-vulnerabilities"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Medical Notes</Label>
                      <Textarea
                        placeholder="Medical conditions, medications, allergies..."
                        value={profileData.medicalNotes || ""}
                        onChange={(e) => setProfileData({ ...profileData, medicalNotes: e.target.value })}
                        rows={3}
                        data-testid="input-medical"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Emergency Instructions</Label>
                      <Textarea
                        placeholder="Special instructions for emergency situations..."
                        value={profileData.emergencyInstructions || ""}
                        onChange={(e) => setProfileData({ ...profileData, emergencyInstructions: e.target.value })}
                        rows={3}
                        data-testid="input-emergency-instructions"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProfile(false);
                          // Parse country code from existing phone
                          const existingPhone = selectedClient.clientPhone || "";
                          let code = "+44";
                          let phoneNum = existingPhone;
                          if (existingPhone.startsWith("+44")) {
                            code = "+44"; phoneNum = existingPhone.slice(3);
                          } else if (existingPhone.startsWith("+1")) {
                            code = "+1"; phoneNum = existingPhone.slice(2);
                          } else if (existingPhone.startsWith("+353")) {
                            code = "+353"; phoneNum = existingPhone.slice(4);
                          } else if (existingPhone.startsWith("+33")) {
                            code = "+33"; phoneNum = existingPhone.slice(3);
                          } else if (existingPhone.startsWith("+49")) {
                            code = "+49"; phoneNum = existingPhone.slice(3);
                          }
                          setProfileCountryCode(code);
                          setProfileData({
                            ...(selectedClient.profile || {}),
                            phone: phoneNum,
                            email: selectedClient.clientEmail || "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveFullProfile}
                        disabled={savingProfile}
                        data-testid="button-save-profile"
                      >
                        {savingProfile ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(selectedClient.clientPhone || selectedClient.clientEmail) && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Contact Information
                        </p>
                        <div className="font-medium space-y-1">
                          {selectedClient.clientPhone && <p>{selectedClient.clientPhone}</p>}
                          {selectedClient.clientEmail && <p>{selectedClient.clientEmail}</p>}
                        </div>
                      </div>
                    )}
                    
                    {selectedClient.profile ? (
                      <>
                        {selectedClient.profile.dateOfBirth && (
                          <div>
                            <p className="text-sm text-muted-foreground">Date of Birth</p>
                            <p className="font-medium">{selectedClient.profile.dateOfBirth}</p>
                          </div>
                        )}
                        
                        {(selectedClient.profile.addressLine1 || selectedClient.profile.city) && (
                          <div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Address
                            </p>
                            <p className="font-medium">
                              {[
                                selectedClient.profile.addressLine1,
                                selectedClient.profile.addressLine2,
                                selectedClient.profile.city,
                                selectedClient.profile.postalCode,
                                selectedClient.profile.country
                              ].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        )}
                        
                        {selectedClient.profile.vulnerabilities && (
                          <div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Vulnerabilities / Special Needs
                            </p>
                            <p className="font-medium whitespace-pre-wrap">{selectedClient.profile.vulnerabilities}</p>
                          </div>
                        )}
                        
                        {selectedClient.profile.medicalNotes && (
                          <div>
                            <p className="text-sm text-muted-foreground">Medical Notes</p>
                            <p className="font-medium whitespace-pre-wrap">{selectedClient.profile.medicalNotes}</p>
                          </div>
                        )}
                        
                        {selectedClient.profile.emergencyInstructions && (
                          <div>
                            <p className="text-sm text-muted-foreground">Emergency Instructions</p>
                            <p className="font-medium whitespace-pre-wrap">{selectedClient.profile.emergencyInstructions}</p>
                          </div>
                        )}
                        
                        {!selectedClient.profile.dateOfBirth && !selectedClient.profile.addressLine1 && !selectedClient.profile.vulnerabilities && !selectedClient.profile.medicalNotes && (
                          <p className="text-muted-foreground text-center py-4">No profile information recorded yet.</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No profile information recorded yet. Click Edit to add details.</p>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="contacts" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Emergency Contacts
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resetContactForm();
                      setShowAddContactDialog(true);
                    }}
                    data-testid="button-add-contact"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Contact
                  </Button>
                </div>
                
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : clientContacts.length > 0 ? (
                  <div className="space-y-3">
                    {clientContacts.map((contact) => (
                      <div key={contact.id} className="p-3 rounded-lg bg-muted">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{contact.name}</span>
                              {contact.isPrimary && (
                                <Badge variant="default" className="text-xs" data-testid={`badge-primary-${contact.id}`}>Primary</Badge>
                              )}
                              {contact.relationship && (
                                <Badge variant="outline" className="text-xs">{contact.relationship}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                                {contact.phoneType && (
                                  <span className="text-xs">({contact.phoneType})</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditContact(contact)}
                              data-testid={`button-edit-contact-${contact.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Remove ${contact.name} from emergency contacts?`)) {
                                  deleteContactMutation.mutate({ orgClientId: selectedClient.id, contactId: contact.id });
                                }
                              }}
                              data-testid={`button-delete-contact-${contact.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No emergency contacts added yet.</p>
                    <p className="text-sm">Add contacts who should be notified if the client misses a check-in.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="alerts" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Alerts Enabled</p>
                      <p className="text-sm text-muted-foreground">
                        Send notifications when this client misses check-ins
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={selectedClient.alertsEnabled !== false}
                    onCheckedChange={(checked) => {
                      updateClientDetailsMutation.mutate({
                        clientId: selectedClient.id,
                        details: { alertsEnabled: checked }
                      });
                    }}
                    disabled={updateClientDetailsMutation.isPending}
                    data-testid="switch-alerts-enabled"
                  />
                </div>
                
                {selectedClient.hasActiveEmergency && (
                  <div className="p-4 border border-destructive rounded-lg bg-destructive/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-destructive/20 p-2">
                          <AlertOctagon className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-destructive">Active Emergency Alert</p>
                          <p className="text-sm text-muted-foreground">
                            This client has an active SOS alert
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Emergency Alert Details */}
                    <div className="bg-white dark:bg-background rounded p-3 text-sm space-y-2">
                      {selectedClient.emergencyAlertActivatedAt && (
                        <div>
                          <span className="font-medium text-destructive">Alert activated: </span>
                          {new Date(selectedClient.emergencyAlertActivatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} at {new Date(selectedClient.emergencyAlertActivatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {selectedClient.emergencyAlertWhat3Words ? (
                        <div>
                          <span className="font-medium text-destructive">Location: </span>
                          <a 
                            href={`https://what3words.com/${selectedClient.emergencyAlertWhat3Words}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-destructive underline font-medium"
                          >
                            ///{selectedClient.emergencyAlertWhat3Words}
                          </a>
                        </div>
                      ) : selectedClient.emergencyAlertLatitude && selectedClient.emergencyAlertLongitude ? (
                        <div>
                          <span className="font-medium text-destructive">Location: </span>
                          <a 
                            href={`https://www.google.com/maps?q=${selectedClient.emergencyAlertLatitude},${selectedClient.emergencyAlertLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-destructive underline"
                          >
                            View on map
                          </a>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Location unavailable</div>
                      )}
                    </div>
                  </div>
                )}
                
                {loadingAlerts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : clientAlerts ? (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xl font-bold">{clientAlerts.counts.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xl font-bold">{clientAlerts.counts.emails}</div>
                        <div className="text-xs text-muted-foreground">Emails</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xl font-bold">{clientAlerts.counts.calls}</div>
                        <div className="text-xs text-muted-foreground">Calls</div>
                      </div>
                      <div className="p-3 bg-destructive/10 rounded-lg text-center">
                        <div className="text-xl font-bold text-destructive">{clientAlerts.counts.emergencies}</div>
                        <div className="text-xs text-muted-foreground">Emergencies</div>
                      </div>
                    </div>
                    
                    {clientAlerts.alerts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No alerts recorded.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {clientAlerts.alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`p-3 rounded-lg ${alert.message.includes("EMERGENCY") ? "bg-destructive/10" : "bg-muted"}`}
                          >
                            <p className="text-sm">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(alert.timestamp), "d MMM yyyy HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Click to load alert history.</p>
                )}
              </TabsContent>

              <TabsContent value="features" className="space-y-4 mt-4">
                <div className="space-y-1 mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    App Features
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable features for this client. Disabled features will appear greyed out in their app.
                  </p>
                </div>

                {loadingFeatures ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-500/10 p-2">
                          <ExternalLink className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium">Wellbeing AI</p>
                          <p className="text-sm text-muted-foreground">Access to Health Insight AI for healthcare advice</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featureWellbeingAi}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featureWellbeingAi", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-wellbeing-ai"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-500/10 p-2">
                          <Smartphone className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">Shake to Alert</p>
                          <p className="text-sm text-muted-foreground">Emergency SOS via phone shake gesture</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featureShakeToAlert}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featureShakeToAlert", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-shake-to-alert"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-500/10 p-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Wellness</p>
                          <p className="text-sm text-muted-foreground">Track wellness and mood patterns over time</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featureMoodTracking}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featureMoodTracking", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-mood-tracking"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-rose-500/10 p-2">
                          <PawPrint className="h-5 w-5 text-rose-500" />
                        </div>
                        <div>
                          <p className="font-medium">Pet Protection</p>
                          <p className="text-sm text-muted-foreground">Store pet profiles with care instructions</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featurePetProtection}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featurePetProtection", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-pet-protection"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-slate-500/10 p-2">
                          <Scroll className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium">Documents</p>
                          <p className="text-sm text-muted-foreground">Store important documents like travel insurance, wills, and more</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featureDigitalWill}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featureDigitalWill", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-digital-will"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-500/10 p-2">
                          <Video className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">Emergency Recording</p>
                          <p className="text-sm text-muted-foreground">Activate camera and microphone during emergencies</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featureEmergencyRecording}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featureEmergencyRecording", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-emergency-recording"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showResendPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowResendPasswordDialog(false);
          setResendPasswordClientId(null);
          setResendPasswordClientName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Resend Password
            </DialogTitle>
            <DialogDescription>
              Send an SMS to {resendPasswordClientName} with their reference code so they can log back in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will send a text message to the client's registered mobile number with their unique reference code. 
              They can use this code to log back into the aok app if they've been logged out.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResendPasswordDialog(false);
                setResendPasswordClientId(null);
                setResendPasswordClientName("");
              }}
              data-testid="button-cancel-resend-password"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResendPasswordSubmit}
              disabled={resendPasswordMutation.isPending}
              data-testid="button-confirm-resend-password"
            >
              {resendPasswordMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                "Send SMS"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={(open) => {
        if (!open) {
          setShowScheduleDialog(false);
          setScheduleClientId(null);
          setScheduleClientName("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Check-In Schedule
            </DialogTitle>
            <DialogDescription>
              Set the check-in schedule for {scheduleClientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="schedule-start-time" className="font-medium">
                  Schedule Start Time
                </Label>
                <p className="text-xs text-muted-foreground">
                  Set the time of day their check-in schedule starts from.
                </p>
              </div>
              <Input
                id="schedule-start-time"
                type="time"
                value={scheduleStartTime}
                onChange={(e) => setScheduleStartTime(e.target.value)}
                data-testid="input-schedule-start-time"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="font-medium">Check-In Interval</Label>
                <p className="text-xs text-muted-foreground">
                  How long between check-ins before an alert is sent?
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">1 hour</span>
                <span className="text-lg font-semibold text-primary">
                  {formatInterval(scheduleIntervalHours)}
                </span>
                <span className="text-sm text-muted-foreground">48 hours</span>
              </div>
              <Slider
                value={[hoursToIndex(scheduleIntervalHours)]}
                onValueChange={(value) => setScheduleIntervalHours(INTERVAL_VALUES[value[0]])}
                min={0}
                max={INTERVAL_VALUES.length - 1}
                step={1}
                className="w-full"
                data-testid="slider-schedule-interval"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScheduleDialog(false);
                setScheduleClientId(null);
                setScheduleClientName("");
              }}
              data-testid="button-cancel-schedule"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (scheduleClientId) {
                  updateScheduleMutation.mutate({
                    clientId: scheduleClientId,
                    scheduleStartTime,
                    checkInIntervalHours: scheduleIntervalHours,
                  });
                }
              }}
              disabled={updateScheduleMutation.isPending}
              data-testid="button-save-schedule"
            >
              {updateScheduleMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Schedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={showAddContactDialog} onOpenChange={(open) => { if (!open) { setShowAddContactDialog(false); resetContactForm(); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingContactId ? "Edit Contact" : "Add Emergency Contact"}</DialogTitle>
            <DialogDescription>
              {editingContactId ? "Update the emergency contact details." : "Add a new emergency contact for this client."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                value={contactFormData.name}
                onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                placeholder="Contact name"
                data-testid="input-contact-name"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email *</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactFormData.email}
                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                placeholder="contact@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={contactFormData.countryCode || "+44"} onValueChange={(v) => setContactFormData({ ...contactFormData, countryCode: v })}>
                  <SelectTrigger data-testid="select-contact-country-code">
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
                <div className="relative">
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={contactFormData.phone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d\s]/g, "");
                      if (value.startsWith("0")) value = value.slice(1);
                      setContactFormData({ ...contactFormData, phone: value });
                    }}
                    placeholder="7XXX XXXXXX"
                    className={contactFormData.phone && !isValidUKPhone(contactFormData.phone) ? "border-yellow-500" : ""}
                    data-testid="input-contact-phone"
                  />
                  {contactFormData.phone && !isValidUKPhone(contactFormData.phone) && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                </div>
                <Select
                  value={contactFormData.phoneType}
                  onValueChange={(value: "mobile" | "landline") => setContactFormData({ ...contactFormData, phoneType: value })}
                >
                  <SelectTrigger id="contact-phone-type" data-testid="select-contact-phone-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="landline">Landline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {contactFormData.phone && !isValidUKPhone(contactFormData.phone) && (
                <p className="text-xs text-yellow-600">UK mobile numbers should be 10 digits</p>
              )}
            </div>
            <div>
              <Label htmlFor="contact-relationship">Relationship</Label>
              <Input
                id="contact-relationship"
                value={contactFormData.relationship}
                onChange={(e) => setContactFormData({ ...contactFormData, relationship: e.target.value })}
                placeholder="e.g., Family, Friend, Carer"
                data-testid="input-contact-relationship"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="contact-primary"
                checked={contactFormData.isPrimary}
                onCheckedChange={(checked) => setContactFormData({ ...contactFormData, isPrimary: checked === true })}
                data-testid="checkbox-contact-primary"
              />
              <Label htmlFor="contact-primary" className="font-normal cursor-pointer">
                Primary contact/carer (notified on every check-in)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddContactDialog(false); resetContactForm(); }} data-testid="button-cancel-contact">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedClient) return;
                if (editingContactId) {
                  updateContactMutation.mutate({ orgClientId: selectedClient.id, contactId: editingContactId });
                } else {
                  addContactMutation.mutate(selectedClient.id);
                }
              }}
              disabled={!contactFormData.name || !contactFormData.email || addContactMutation.isPending || updateContactMutation.isPending}
              data-testid="button-save-contact"
            >
              {(addContactMutation.isPending || updateContactMutation.isPending) ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                editingContactId ? "Update Contact" : "Add Contact"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Own Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowChangePasswordDialog(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  data-testid="button-toggle-current-password"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  data-testid="input-confirm-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)} data-testid="button-cancel-change-password">
              Cancel
            </Button>
            <Button
              onClick={handleChangeOwnPassword}
              disabled={changeOwnPasswordMutation.isPending}
              data-testid="button-submit-change-password"
            >
              {changeOwnPasswordMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Changing...</>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Details Dialog */}
      <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Details</DialogTitle>
            <DialogDescription>
              Update the client's nickname, name, or phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editNickname">Nickname (optional)</Label>
              <Input
                id="editNickname"
                placeholder="e.g., Room 101"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                data-testid="input-edit-nickname"
              />
              <p className="text-xs text-muted-foreground">
                An internal name to help you identify this client
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editClientName">Client Name</Label>
              <Input
                id="editClientName"
                placeholder="Full name"
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                data-testid="input-edit-client-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editClientPhone">Phone Number</Label>
              <div className="flex gap-2">
                <Select value={editCountryCode} onValueChange={setEditCountryCode}>
                  <SelectTrigger className="w-24" data-testid="select-country-code">
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
                <div className="flex-1 relative">
                  <Input
                    id="editClientPhone"
                    placeholder="7XXX XXXXXX"
                    value={editClientPhone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d\s]/g, "");
                      // Auto-remove leading zero
                      if (value.startsWith("0")) {
                        value = value.slice(1);
                      }
                      setEditClientPhone(value);
                    }}
                    className={editClientPhone && !isValidUKPhone(editClientPhone) ? "border-yellow-500" : ""}
                    data-testid="input-edit-client-phone"
                  />
                  {editClientPhone && !isValidUKPhone(editClientPhone) && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                </div>
              </div>
              {editClientPhone && !isValidUKPhone(editClientPhone) && (
                <p className="text-xs text-yellow-600">
                  UK mobile numbers should be 10 digits (e.g., 7700 900000)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditClientDialog(false)} data-testid="button-cancel-edit-client">
              Cancel
            </Button>
            <Button
              onClick={handleSaveClientDetails}
              disabled={updateClientDetailsMutation.isPending}
              data-testid="button-save-client-details"
            >
              {updateClientDetailsMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Contacts Dialog */}
      <Dialog open={showEmergencyContactsDialog} onOpenChange={setShowEmergencyContactsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emergency Contacts</DialogTitle>
            <DialogDescription>
              Manage emergency contacts for {emergencyContactsClient?.nickname || emergencyContactsClient?.clientName || `Client #${emergencyContactsClient?.clientOrdinal}`}. 
              You can add up to 3 contacts who will be notified in emergencies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
            {emergencyContacts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No emergency contacts added yet</p>
              </div>
            ) : (
              emergencyContacts.map((contact, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Contact {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEmergencyContact(index)}
                      data-testid={`button-remove-contact-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input
                        placeholder="Full name"
                        value={contact.name}
                        onChange={(e) => handleEmergencyContactChange(index, "name", e.target.value)}
                        data-testid={`input-contact-name-${index}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Input
                        placeholder="e.g. Parent, Carer"
                        value={contact.relationship || ""}
                        onChange={(e) => handleEmergencyContactChange(index, "relationship", e.target.value)}
                        data-testid={`input-contact-relationship-${index}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Email *</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={contact.email}
                        onChange={(e) => handleEmergencyContactChange(index, "email", e.target.value)}
                        data-testid={`input-contact-email-${index}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone *</Label>
                      <Input
                        placeholder="+44 7700 900000"
                        value={contact.phone}
                        onChange={(e) => handleEmergencyContactChange(index, "phone", e.target.value)}
                        data-testid={`input-contact-phone-${index}`}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {emergencyContacts.length < 3 && (
              <Button
                variant="outline"
                onClick={handleAddEmergencyContact}
                className="w-full"
                data-testid="button-add-emergency-contact"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Emergency Contact
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyContactsDialog(false)} data-testid="button-cancel-emergency-contacts">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmergencyContacts}
              disabled={updateEmergencyContactsMutation.isPending}
              data-testid="button-save-emergency-contacts"
            >
              {updateEmergencyContactsMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Contacts"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLegalSignDialog} onOpenChange={setShowLegalSignDialog}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-legal-sign">
          <DialogHeader>
            <DialogTitle data-testid="text-legal-sign-title">Sign Document</DialogTitle>
            <DialogDescription>{legalSignDocTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="legal-signer-name">Full Name</Label>
              <Input id="legal-signer-name" data-testid="input-legal-signer-name" placeholder="Enter your full name" value={legalSignerName} onChange={(e) => setLegalSignerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal-signer-email">Email</Label>
              <Input id="legal-signer-email" data-testid="input-legal-signer-email" type="email" placeholder="Enter your email" value={legalSignerEmail} onChange={(e) => setLegalSignerEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal-signer-role">Role / Title</Label>
              <Input id="legal-signer-role" data-testid="input-legal-signer-role" placeholder="e.g. Director, CEO, Manager" value={legalSignerRole} onChange={(e) => setLegalSignerRole(e.target.value)} />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="legal-consent" data-testid="checkbox-legal-consent" checked={legalSignConsent} onCheckedChange={(v) => setLegalSignConsent(v === true)} />
              <Label htmlFor="legal-consent" className="text-sm leading-relaxed cursor-pointer">I confirm that I have read and understood this document and agree to be bound by its terms.</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal-typed-sig">Signature</Label>
              <Input id="legal-typed-sig" data-testid="input-legal-typed-sig" placeholder="Type your full name as signature" value={legalSignTypedSig} onChange={(e) => setLegalSignTypedSig(e.target.value)} className="text-lg italic border-b-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} />
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-legal-sign-date">
              Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLegalSignDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!legalSignerName || !legalSignerEmail || !legalSignerRole || !legalSignConsent || !legalSignTypedSig) return;
                legalSignMutation.mutate({
                  documentId: legalSignDocId,
                  signerName: legalSignerName,
                  signerEmail: legalSignerEmail,
                  signerRole: legalSignerRole,
                });
              }}
              disabled={!legalSignerName.trim() || !legalSignerEmail.trim() || !legalSignerRole.trim() || !legalSignConsent || !legalSignTypedSig.trim() || legalSignMutation.isPending}
              data-testid="button-submit-legal-sign"
            >
              <PenLine className="w-4 h-4 mr-1" />
              {legalSignMutation.isPending ? "Signing..." : "Sign Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permanentDeleteClient} onOpenChange={(open) => { if (!open) setPermanentDeleteClient(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Client
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{permanentDeleteClient?.clientName || permanentDeleteClient?.nickname || "this client"}</strong>?
              This action cannot be undone and all associated data will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPermanentDeleteClient(null)}
              data-testid="button-cancel-permanent-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => permanentDeleteMutation.mutate(permanentDeleteClient?.id)}
              disabled={permanentDeleteMutation.isPending}
              data-testid="button-confirm-permanent-delete"
            >
              {permanentDeleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Yes, Delete Permanently</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      <OrgGuidedTour isOpen={showGuidedTour} onClose={() => setShowGuidedTour(false)} />
    </div>
  );
}
