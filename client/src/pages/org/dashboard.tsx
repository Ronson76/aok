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
import { Users, UserPlus, CheckCircle, Clock, AlertTriangle, AlertOctagon, Loader2, Trash2, Eye, KeyRound, User, Phone, Mail, FileText, MapPin, Edit2, Pause, Play, XCircle, X, LogOut, Settings, TrendingUp, PawPrint, Scroll, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationDashboardStats, OrganizationClientWithDetails, OrganizationBundle, OrganizationClientProfile, AlertLog, OrgClientStatus, Contact } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useEffect, useRef, useCallback } from "react";
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
  const [regClientDOB, setRegClientDOB] = useState("");
  const [regBundleId, setRegBundleId] = useState("");
  const [regScheduleStart, setRegScheduleStart] = useState("");
  const [regIntervalHours, setRegIntervalHours] = useState(24);
  const [regEmergencyContacts, setRegEmergencyContacts] = useState<Array<{
    name: string;
    email: string;
    phone: string;
    phoneType: "mobile" | "landline";
    relationship: string;
    isPrimary: boolean;
  }>>([]);
  
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordClientId, setResetPasswordClientId] = useState<string | null>(null);
  const [resetPasswordClientName, setResetPasswordClientName] = useState<string>("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [confirmClientPassword, setConfirmClientPassword] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  
  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<Partial<OrganizationClientProfile>>({});
  
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
    phoneType: "mobile" as "mobile" | "landline",
    relationship: "",
    isPrimary: false,
  });

  // Client feature settings state
  const [clientFeatures, setClientFeatures] = useState({
    featureWellbeingAi: false,
    featureMoodTracking: false,
    featurePetProtection: false,
    featureDigitalWill: false,
  });
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<OrganizationDashboardStats>({
    queryKey: ["/api/org/dashboard"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<OrganizationClientWithDetails[]>({
    queryKey: ["/api/org/clients"],
  });

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
        description: "The client has been added to your organization.",
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
        description: "The client has been removed from your organization.",
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

  const registerClientMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/org/clients/register", {
        clientName: regClientName,
        clientPhone: regClientPhone,
        dateOfBirth: regClientDOB || undefined,
        bundleId: regBundleId || undefined,
        scheduleStartTime: regScheduleStart || undefined,
        checkInIntervalHours: regIntervalHours,
        emergencyContacts: regEmergencyContacts.length > 0 ? regEmergencyContacts : undefined,
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
    setRegClientDOB("");
    setRegBundleId("");
    setRegScheduleStart("");
    setRegIntervalHours(24);
    setRegEmergencyContacts([]);
  };

  const addEmergencyContact = () => {
    setRegEmergencyContacts([...regEmergencyContacts, {
      name: "",
      email: "",
      phone: "",
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

  const resetClientPasswordMutation = useMutation({
    mutationFn: async ({ clientId, newPassword, orgPassword }: { clientId: string; newPassword: string; orgPassword: string }) => {
      const response = await apiRequest("POST", `/api/org/clients/${clientId}/reset-password`, {
        newPassword,
        orgPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowResetPasswordDialog(false);
      setResetPasswordClientId(null);
      setResetPasswordClientName("");
      setNewClientPassword("");
      setConfirmClientPassword("");
      setOrgPassword("");
      toast({
        title: "Password reset",
        description: "The client's password has been successfully reset.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setEditingProfile(false);
      toast({
        title: "Profile saved",
        description: "Client profile has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save profile",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

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
        featureWellbeingAi: false,
        featureMoodTracking: false,
        featurePetProtection: false,
        featureDigitalWill: false,
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
      phoneType: "mobile",
      relationship: "",
      isPrimary: false,
    });
    setEditingContactId(null);
  };

  const addContactMutation = useMutation({
    mutationFn: async (orgClientId: string) => {
      const response = await apiRequest("POST", `/api/org/clients/${orgClientId}/contacts`, contactFormData);
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
      const response = await apiRequest("PATCH", `/api/org/clients/${orgClientId}/contacts/${contactId}`, contactFormData);
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
    setContactFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || "",
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

  const handleResetPasswordClick = (client: OrganizationClientWithDetails) => {
    if (!client.clientId || !client.client) return;
    setResetPasswordClientId(client.clientId);
    setResetPasswordClientName(client.nickname || client.client.name);
    setShowResetPasswordDialog(true);
  };

  const handleResetPasswordSubmit = () => {
    if (!newClientPassword || newClientPassword.length < 8) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newClientPassword !== confirmClientPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }
    if (!orgPassword) {
      toast({
        title: "Organization password required",
        description: "Please enter your organization password to confirm.",
        variant: "destructive",
      });
      return;
    }
    if (resetPasswordClientId) {
      resetClientPasswordMutation.mutate({
        clientId: resetPasswordClientId,
        newPassword: newClientPassword,
        orgPassword,
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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-org-dashboard-title">Organization Dashboard</h1>
          <p className="text-muted-foreground">Monitor your clients' safety and check-in status</p>
        </div>
        <div className="flex gap-2">
          <Button 
            data-testid="button-register-client" 
            disabled={!hasSeatsAvailable}
            onClick={() => setShowRegisterClientDialog(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Register Client
          </Button>
          <Button variant="outline" onClick={handleLogout} data-testid="button-org-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
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
                <Input
                  id="regClientPhone"
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={regClientPhone}
                  onChange={(e) => setRegClientPhone(e.target.value)}
                  data-testid="input-reg-client-phone"
                />
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
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Phone"
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                        data-testid={`input-contact-phone-${index}`}
                      />
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-clients-pending">{stats?.clientsPending || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting check-in</p>
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
          </CardContent>
        </Card>
      </div>

      {stats?.totalEmergencyAlerts && stats.totalEmergencyAlerts > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertOctagon className="h-5 w-5 text-destructive" />
            <CardTitle className="text-sm font-medium text-destructive">Emergency Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-emergency-alerts">
              {stats.totalEmergencyAlerts}
            </div>
            <p className="text-xs text-muted-foreground">Total emergency alerts from your clients</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
          <CardDescription>Monitor the check-in status of all your clients</CardDescription>
        </CardHeader>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clients yet</p>
              <p className="text-sm">Add clients to start monitoring their safety</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
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
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(client.status.status)}
                    {client.lastAlert && client.lastAlert.message.includes("EMERGENCY") && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertOctagon className="h-3 w-3 mr-1" />
                        Alert
                      </Badge>
                    )}
                    {client.clientStatus === "active" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateClientStatusMutation.mutate({ orgClientId: client.id, status: "paused" })}
                        disabled={updateClientStatusMutation.isPending}
                        data-testid={`button-pause-client-${client.clientId}`}
                        title="Pause monitoring"
                      >
                        <Pause className="h-4 w-4 text-yellow-600" />
                      </Button>
                    ) : client.clientStatus === "paused" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateClientStatusMutation.mutate({ orgClientId: client.id, status: "active" })}
                        disabled={updateClientStatusMutation.isPending}
                        data-testid={`button-resume-client-${client.clientId}`}
                        title="Resume monitoring"
                      >
                        <Play className="h-4 w-4 text-primary" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewClientDetails(client)}
                      data-testid={`button-view-client-${client.clientId}`}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {client.client && client.clientId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResetPasswordClick(client)}
                        data-testid={`button-reset-password-${client.clientId}`}
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => client.clientId && removeClientMutation.mutate(client.clientId)}
                      disabled={removeClientMutation.isPending || !client.clientId}
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
                        ? format(new Date(selectedClient.status.lastCheckIn), "MMM d, yyyy h:mm a")
                        : "Never"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Due</p>
                    <p className="font-medium">
                      {selectedClient.status.nextCheckInDue 
                        ? format(new Date(selectedClient.status.nextCheckInDue), "MMM d, yyyy h:mm a")
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
                      {format(new Date(selectedClient.addedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {selectedClient.lastAlert && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Last Alert</p>
                    <div className={`p-3 rounded-lg ${selectedClient.lastAlert.message.includes("EMERGENCY") ? "bg-destructive/10" : "bg-muted"}`}>
                      <p className="text-sm">{selectedClient.lastAlert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(selectedClient.lastAlert.timestamp), "MMM d, yyyy h:mm a")}
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
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)} data-testid="button-edit-profile">
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {editingProfile ? (
                  <div className="space-y-4">
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
                          setProfileData(selectedClient.profile || {});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updateProfileMutation.mutate({ orgClientId: selectedClient.id, profile: profileData })}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                              {format(new Date(alert.timestamp), "MMM d, yyyy h:mm a")}
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
                        <div className="rounded-full bg-blue-500/10 p-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Mood Tracking</p>
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

      <Dialog open={showResetPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowResetPasswordDialog(false);
          setResetPasswordClientId(null);
          setResetPasswordClientName("");
          setNewClientPassword("");
          setConfirmClientPassword("");
          setOrgPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Client Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordClientName}. The client will be signed out of all devices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newClientPassword}
                onChange={(e) => setNewClientPassword(e.target.value)}
                autoComplete="off"
                data-testid="input-new-client-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmClientPassword}
                onChange={(e) => setConfirmClientPassword(e.target.value)}
                autoComplete="off"
                data-testid="input-confirm-client-password"
              />
            </div>
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="org-password">Your Organization Password</Label>
              <Input
                id="org-password"
                type="password"
                placeholder="Enter your password to confirm"
                value={orgPassword}
                onChange={(e) => setOrgPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleResetPasswordSubmit();
                }}
                autoComplete="off"
                data-testid="input-org-password"
              />
              <p className="text-xs text-muted-foreground">
                Your password is required to authorize this change.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPasswordDialog(false);
                setResetPasswordClientId(null);
                setResetPasswordClientName("");
                setNewClientPassword("");
                setConfirmClientPassword("");
                setOrgPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPasswordSubmit}
              disabled={resetClientPasswordMutation.isPending}
              data-testid="button-confirm-reset-password"
            >
              {resetClientPasswordMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...</>
              ) : (
                "Reset Password"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  placeholder="+44..."
                  data-testid="input-contact-phone"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone-type">Phone Type</Label>
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
    </div>
  );
}
