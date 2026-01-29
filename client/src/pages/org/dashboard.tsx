import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Users, UserPlus, CheckCircle, Clock, AlertTriangle, AlertOctagon, Loader2, Trash2, Eye, EyeOff, KeyRound, User, Phone, Mail, FileText, MapPin, Edit2, Pause, Play, XCircle, X, LogOut, Settings, TrendingUp, PawPrint, Scroll, ExternalLink, Smartphone, Shield, ShieldCheck, Plus, RotateCcw, Bell, BellOff, Search } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationDashboardStats, OrganizationClientWithDetails, OrganizationBundle, OrganizationClientProfile, AlertLog, OrgClientStatus, Contact } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

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
  const { logout } = useAuth();
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
      toastRef.current({
        title: "Session expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      await logoutRef.current();
      setLocationRef.current("/org/login");
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
  
  const handleLogout = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await logout();
    setLocation("/org/login");
  };
  
  // New client registration form state
  const [showRegisterClientDialog, setShowRegisterClientDialog] = useState(false);
  const [regClientName, setRegClientName] = useState("");
  const [regClientPhone, setRegClientPhone] = useState("");
  const [regCountryCode, setRegCountryCode] = useState("+44");
  const [regClientDOB, setRegClientDOB] = useState("");
  const [regBundleId, setRegBundleId] = useState("");
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
  });
  
  const [showResendPasswordDialog, setShowResendPasswordDialog] = useState(false);
  const [resendPasswordClientId, setResendPasswordClientId] = useState<string | null>(null);
  const [resendPasswordClientName, setResendPasswordClientName] = useState<string>("");
  
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
  });
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleClientId, setScheduleClientId] = useState<string | null>(null);
  const [scheduleClientName, setScheduleClientName] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("10:00");
  const [scheduleIntervalHours, setScheduleIntervalHours] = useState(24);

  // Interval slider values (5 mins to 48 hours)
  const INTERVAL_VALUES = [0.08, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 24, 36, 48];
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

  const { data: stats, isLoading: statsLoading } = useQuery<OrganizationDashboardStats>({
    queryKey: ["/api/org/dashboard"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<OrganizationClientWithDetails[]>({
    queryKey: ["/api/org/clients"],
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
    
    // Filter by reference number (clientOrdinal)
    if (searchRef.trim()) {
      result = result.filter(client => {
        const ordinal = String(client.clientOrdinal || "");
        return ordinal.includes(searchRef.trim());
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
      toast({
        title: "Client removed",
        description: "The client has been removed from your organisation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
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

  const deactivateAlertMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", `/api/org/clients/${clientId}/deactivate-alert`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      toast({
        title: "Emergency alert deactivated",
        description: "The client's emergency alert has been deactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to deactivate alert",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerClientMutation = useMutation({
    mutationFn: async () => {
      // Combine country code with phone number
      const fullPhone = regClientPhone ? `${regCountryCode}${regClientPhone.replace(/\D/g, "")}` : "";
      const response = await apiRequest("POST", "/api/org/clients/register", {
        clientName: regClientName,
        clientPhone: fullPhone,
        dateOfBirth: regClientDOB || undefined,
        bundleId: regBundleId || undefined,
        scheduleStartTime: regScheduleStart || undefined,
        checkInIntervalHours: regIntervalHours,
        emergencyContacts: regEmergencyContacts.length > 0 ? regEmergencyContacts : undefined,
        features: regFeatures,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setShowRegisterClientDialog(false);
      resetRegisterForm();
      toast({
        title: "Client registered",
        description: data.smsSent 
          ? `SMS sent to ${regClientPhone}. Reference code: ${data.referenceCode}`
          : `Client registered. Reference code: ${data.referenceCode}. SMS could not be sent.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to register client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetRegisterForm = () => {
    setRegClientName("");
    setRegClientPhone("");
    setRegCountryCode("+44");
    setRegClientDOB("");
    setRegBundleId("");
    setRegScheduleStart("");
    setRegIntervalHours(24);
    setRegEmergencyContacts([]);
    setRegFeatures({
      featureWellbeingAi: true,
      featureShakeToAlert: true,
      featureMoodTracking: true,
      featurePetProtection: true,
      featureDigitalWill: true,
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

  const resendPasswordMutation = useMutation({
    mutationFn: async ({ clientId }: { clientId: string }) => {
      const response = await apiRequest("POST", `/api/org/clients/${clientId}/send-reference-code`);
      return response.json();
    },
    onSuccess: () => {
      setShowResendPasswordDialog(false);
      setResendPasswordClientId(null);
      setResendPasswordClientName("");
      toast({
        title: "Reference code sent",
        description: "The client will receive an SMS with their reference code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reference code",
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
      const { phone, email, ...profile } = profileData;
      
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
    if (!client.clientId || !client.client) return;
    setResendPasswordClientId(client.clientId);
    setResendPasswordClientName(client.nickname || client.client.name);
    setShowResendPasswordDialog(true);
  };

  const handleResendPasswordSubmit = () => {
    if (resendPasswordClientId) {
      resendPasswordMutation.mutate({
        clientId: resendPasswordClientId,
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

  const activeBundles = stats?.bundles.filter(b => b.status === "active") || [];
  const hasSeatsAvailable = activeBundles.some(b => b.seatsUsed < b.seatLimit);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo and logout */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-org-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-org-dashboard-title">Organisation Dashboard</h1>
            <p className="text-muted-foreground">Monitor your clients' safety and check-in status</p>
          </div>
          <div className="flex gap-2">
            <Link href="/org/safeguarding">
              <Button variant="outline" data-testid="button-safeguarding-hub">
                <Shield className="h-4 w-4 mr-2" />
                Safeguarding Hub
              </Button>
            </Link>
            <Button 
              data-testid="button-register-client" 
              disabled={!hasSeatsAvailable}
              onClick={() => setShowRegisterClientDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Register Client
            </Button>
            <Button variant="outline" onClick={() => setShowChangePasswordDialog(true)} data-testid="button-org-change-password">
              <KeyRound className="h-4 w-4 mr-2" />
              Change Password
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
                Add a user to your organization to monitor their check-in status.
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
              Enter client details. They will receive an SMS with a link to download the app and their unique reference code.
            </DialogDescription>
          </DialogHeader>
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
                      placeholder="7700 900000"
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regClientDOB">Date of Birth</Label>
                <Input
                  id="regClientDOB"
                  type="date"
                  value={regClientDOB}
                  onChange={(e) => setRegClientDOB(e.target.value)}
                  data-testid="input-reg-client-dob"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            {/* Emergency Contacts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Emergency Contacts</Label>
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
                    <span className="text-sm">Digital Will</span>
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
              disabled={!regClientName || !regClientPhone || registerClientMutation.isPending}
              data-testid="button-confirm-register-client"
            >
              {registerClientMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
              ) : (
                "Register & Send SMS"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-clients">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.seatsUsed || 0} of {stats?.totalSeats || 0} seats used
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
              <Button variant="link" size="sm" className="px-0 h-auto text-xs" data-testid="link-view-missed-checkins">
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
            <Button variant="link" size="sm" className="px-0 h-auto text-xs" data-testid="link-view-emergency-alerts">
              View All
            </Button>
          </Link>
        </CardContent>
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
              <p className="text-sm">Add clients to start monitoring their safety</p>
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
                        {client.nickname || client.clientName || client.client?.name || "Pending"}
                        {client.nickname && client.client && (
                          <span className="text-muted-foreground text-sm">({client.client.name})</span>
                        )}
                        {getClientStatusBadge(client.clientStatus)}
                        {client.registrationStatus && client.registrationStatus !== "registered" && (
                          <Badge variant="outline" className="text-xs">
                            {client.registrationStatus === "pending_sms" ? "SMS Pending" : "Awaiting Registration"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {client.client?.email || client.clientPhone || "No contact info"}
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
                              <span title="Digital Will"><Scroll className="h-3 w-3 text-slate-500" /></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(client.status.status)}
                    {client.hasActiveEmergency && (
                      <>
                        <Badge variant="destructive" className="animate-pulse" data-testid={`badge-emergency-${client.clientId}`}>
                          <AlertOctagon className="h-3 w-3 mr-1" />
                          SOS Active
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateAlertMutation.mutate(client.clientId || client.id)}
                          disabled={deactivateAlertMutation.isPending}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                          data-testid={`button-deactivate-alert-${client.clientId}`}
                        >
                          {deactivateAlertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4 mr-1" />}
                          Deactivate Alert
                        </Button>
                      </>
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
                    {client.client && client.clientId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendPasswordClick(client)}
                          data-testid={`button-resend-password-${client.clientId}`}
                        >
                          Resend SMS
                        </Button>
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
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeClientMutation.mutate(client.clientId || client.id)}
                      disabled={removeClientMutation.isPending}
                      data-testid={`button-remove-client-${client.clientId || client.id}`}
                      title="Remove client"
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
                                placeholder="7700 900000"
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
                  <div className="flex items-center justify-between p-4 border border-destructive rounded-lg bg-destructive/10">
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
                    <Button
                      variant="destructive"
                      onClick={() => deactivateAlertMutation.mutate(selectedClient.id)}
                      disabled={deactivateAlertMutation.isPending}
                      data-testid="button-deactivate-alert"
                    >
                      {deactivateAlertMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deactivating...</>
                      ) : (
                        "Deactivate Alert"
                      )}
                    </Button>
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
                          <p className="font-medium">Digital Will</p>
                          <p className="text-sm text-muted-foreground">Store important documents securely</p>
                        </div>
                      </div>
                      <Switch
                        checked={clientFeatures.featureDigitalWill}
                        onCheckedChange={(checked) => updateClientFeature(selectedClient.id, "featureDigitalWill", checked)}
                        disabled={savingFeatures}
                        data-testid="switch-feature-digital-will"
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
                <span className="text-sm text-muted-foreground">5 mins</span>
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
                    placeholder="7700 900000"
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
                Primary contact (notified on every check-in)
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
                    placeholder="7700 900000"
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
      </div>
    </div>
  );
}
