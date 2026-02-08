import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Building2, User, CheckCircle, XCircle, Package, 
  LogOut, ShieldCheck, TrendingUp, Calendar, AlertOctagon, Eye, Pause, Play, Trash2, Mail, Phone, Plus, Loader2, Eye as EyeIcon, EyeOff, KeyRound, ArrowLeft, RotateCcw, AlertTriangle, BellOff, Search, Settings, MessageSquare
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { DashboardStats, AdminOrganizationView, AdminOrganizationClientView, OrgClientStatus } from "@shared/schema";
import { allTierFeatureKeys, featureLabels } from "@shared/schema";
import AdminTeam from "@/pages/admin/team";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function getClientStatusBadge(status: OrgClientStatus) {
  switch (status) {
    case "active":
      return <Badge variant="outline" className="text-primary border-primary">Active</Badge>;
    case "paused":
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Paused</Badge>;
    case "terminated":
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground">Terminated</Badge>;
  }
}

function getCheckInStatusBadge(status: "safe" | "pending" | "overdue") {
  switch (status) {
    case "safe":
      return <Badge variant="default">Safe</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "overdue":
      return <Badge variant="destructive">Overdue</Badge>;
  }
}

export default function AdminDashboard() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Refs for inactivity timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastRef = useRef(toast);
  const logoutRef = useRef(logout);
  const setLocationRef = useRef(setLocation);
  
  // Keep refs updated
  useEffect(() => {
    toastRef.current = toast;
    logoutRef.current = logout;
    setLocationRef.current = setLocation;
  }, [toast, logout, setLocation]);
  
  // Inactivity timeout handler
  const resetActivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        await logoutRef.current();
      } catch (e) {
        // Session may already be expired on server - that's fine
      }
      queryClient.clear();
      setLocationRef.current("/admin/login?sessionExpired=true");
    }, SESSION_TIMEOUT_MS);
  }, []);
  
  // Set up inactivity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetActivityTimer();
    };
    
    // Start the timer
    resetActivityTimer();
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetActivityTimer]);
  
  
  // State for viewing organization clients
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizationView | null>(null);
  const [orgClients, setOrgClients] = useState<AdminOrganizationClientView[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [orgClientSearchRef, setOrgClientSearchRef] = useState("");
  const [orgClientSearchPhone, setOrgClientSearchPhone] = useState("");
  
  // State for creating organization
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgPassword, setNewOrgPassword] = useState("");
  const [showNewOrgPassword, setShowNewOrgPassword] = useState(false);
  const [showOrgFeatures, setShowOrgFeatures] = useState(false);
  const [orgFeatureDefaults, setOrgFeatureDefaults] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const key of allTierFeatureKeys) {
      const orgKey = "org" + key.charAt(0).toUpperCase() + key.slice(1);
      defaults[orgKey] = true;
    }
    defaults["orgFeatureEmergencyRecording"] = false;
    return defaults;
  });
  
  // State for changing own password
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // State for resetting organization password
  const [showResetOrgPasswordDialog, setShowResetOrgPasswordDialog] = useState(false);
  const [resetOrgPasswordTarget, setResetOrgPasswordTarget] = useState<AdminOrganizationView | null>(null);
  const [resetOrgNewPassword, setResetOrgNewPassword] = useState("");
  const [showResetOrgNewPassword, setShowResetOrgNewPassword] = useState(false);
  
  // State for editing client schedule
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingScheduleClient, setEditingScheduleClient] = useState<AdminOrganizationClientView | null>(null);
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [scheduleIntervalHours, setScheduleIntervalHours] = useState(24);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  
  // State for editing client feature toggles
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [editingFeaturesClient, setEditingFeaturesClient] = useState<AdminOrganizationClientView | null>(null);
  const [clientFeatures, setClientFeatures] = useState({
    featureWellbeingAi: true,
    featureShakeToAlert: true,
    featureMoodTracking: true,
    featurePetProtection: true,
    featureDigitalWill: true,
  });
  
  // Filter and sort org clients based on search
  const filteredOrgClients = useMemo(() => {
    let result = [...orgClients];
    
    // Sort alphabetically by reference code
    result.sort((a, b) => {
      const aRef = (a.referenceCode || "").toLowerCase();
      const bRef = (b.referenceCode || "").toLowerCase();
      return aRef.localeCompare(bRef);
    });
    
    // Filter by reference number
    if (orgClientSearchRef.trim()) {
      result = result.filter(client => {
        const ordinal = String(client.clientOrdinal || "");
        const refCode = client.referenceCode || "";
        return ordinal.includes(orgClientSearchRef.trim()) || refCode.toLowerCase().includes(orgClientSearchRef.toLowerCase());
      });
    }
    
    // Filter by phone
    if (orgClientSearchPhone.trim()) {
      const phoneLower = orgClientSearchPhone.toLowerCase().replace(/\s/g, "");
      result = result.filter(client => {
        const phone = (client.clientPhone || "").toLowerCase().replace(/\s/g, "");
        return phone.includes(phoneLower);
      });
    }
    
    return result;
  }, [orgClients, orgClientSearchRef, orgClientSearchPhone]);
  
  const isSuperAdmin = admin?.role === "super_admin";
  const [activeView, setActiveView] = useState<"dashboard" | "team">("dashboard");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });
  
  const { data: organizations, isLoading: orgsLoading } = useQuery<AdminOrganizationView[]>({
    queryKey: ["/api/admin/organizations"],
  });
  
  const updateClientStatusMutation = useMutation({
    mutationFn: async ({ organizationId, clientId, status }: { organizationId: string; clientId: string; status: OrgClientStatus }) => {
      const response = await apiRequest("PATCH", `/api/admin/organizations/${organizationId}/clients/${clientId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      if (selectedOrg) {
        fetchOrgClients(selectedOrg.id);
      }
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
  
  const removeClientMutation = useMutation({
    mutationFn: async ({ organizationId, clientId }: { organizationId: string; clientId: string }) => {
      await apiRequest("DELETE", `/api/admin/organizations/${organizationId}/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      if (selectedOrg) {
        fetchOrgClients(selectedOrg.id);
      }
      toast({
        title: "Client removed",
        description: "The client has been removed from the organisation.",
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
  
  const resetClientMutation = useMutation({
    mutationFn: async ({ organizationId, clientId }: { organizationId: string; clientId: string }) => {
      const response = await apiRequest("POST", `/api/admin/organizations/${organizationId}/clients/${clientId}/reset`);
      return response.json();
    },
    onSuccess: () => {
      if (selectedOrg) {
        fetchOrgClients(selectedOrg.id);
      }
      toast({
        title: "Client reset",
        description: "The client's app and check-in time have been reset.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ organizationId, clientId, scheduleStartTime, checkInIntervalHours }: { 
      organizationId: string; 
      clientId: string; 
      scheduleStartTime: string;
      checkInIntervalHours: number;
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/organizations/${organizationId}/clients/${clientId}/schedule`, { 
        scheduleStartTime, 
        checkInIntervalHours 
      });
      return response.json();
    },
    onSuccess: () => {
      if (selectedOrg) {
        fetchOrgClients(selectedOrg.id);
      }
      setShowScheduleDialog(false);
      setEditingScheduleClient(null);
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
  
  // Fetch client schedule when opening edit dialog
  const fetchClientSchedule = async (organizationId: string, clientId: string) => {
    setLoadingSchedule(true);
    try {
      const response = await apiRequest("GET", `/api/admin/organizations/${organizationId}/clients/${clientId}/schedule`);
      const data = await response.json();
      if (data.scheduleStartTime) {
        const time = new Date(data.scheduleStartTime).toTimeString().slice(0, 5);
        setScheduleStartTime(time);
      } else {
        setScheduleStartTime("09:00");
      }
      setScheduleIntervalHours(data.checkInIntervalHours || 24);
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
      setScheduleStartTime("09:00");
      setScheduleIntervalHours(24);
    } finally {
      setLoadingSchedule(false);
    }
  };
  
  // Mutation for updating client features
  const updateClientFeaturesMutation = useMutation({
    mutationFn: async ({ organizationId, clientId, features }: { 
      organizationId: string; 
      clientId: string; 
      features: typeof clientFeatures;
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/organizations/${organizationId}/clients/${clientId}/features`, features);
      return response.json();
    },
    onSuccess: () => {
      if (selectedOrg) {
        fetchOrgClients(selectedOrg.id);
      }
      setShowFeaturesDialog(false);
      setEditingFeaturesClient(null);
      toast({
        title: "Features updated",
        description: "The client's feature settings have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update features",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Org feature defaults state and mutation
  const [showOrgFeatureDefaults, setShowOrgFeatureDefaults] = useState(false);
  const [orgFeatureDefaultsEditing, setOrgFeatureDefaultsEditing] = useState<Record<string, boolean>>({});

  const { data: selectedOrgFeatureDefaults, refetch: refetchOrgFeatureDefaults, isLoading: isLoadingOrgDefaults } = useQuery<Record<string, boolean>>({
    queryKey: [`/api/admin/organizations/${selectedOrg?.id}/feature-defaults`],
    enabled: !!selectedOrg && showOrgFeatureDefaults,
  });

  useEffect(() => {
    if (selectedOrgFeatureDefaults) {
      setOrgFeatureDefaultsEditing(selectedOrgFeatureDefaults);
    }
  }, [selectedOrgFeatureDefaults]);

  const updateOrgFeatureDefaultsMutation = useMutation({
    mutationFn: async ({ orgId, updates }: { orgId: string; updates: Record<string, boolean> }) => {
      const response = await apiRequest("PUT", `/api/admin/organizations/${orgId}/feature-defaults`, updates);
      return response.json();
    },
    onSuccess: () => {
      if (selectedOrg) {
        refetchOrgFeatureDefaults();
      }
      toast({
        title: "Feature defaults updated",
        description: "Organisation feature defaults have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for sending reminder with reference number
  const sendReminderMutation = useMutation({
    mutationFn: async ({ organizationId, clientId }: { organizationId: string; clientId: string }) => {
      const response = await apiRequest("POST", `/api/admin/organizations/${organizationId}/clients/${clientId}/send-reminder`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "The reference number reminder has been sent via SMS.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reminder",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; featureDefaults?: Record<string, boolean> }) => {
      const response = await apiRequest("POST", "/api/admin/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setShowCreateOrgDialog(false);
      setNewOrgName("");
      setNewOrgEmail("");
      setNewOrgPassword("");
      setShowOrgFeatures(false);
      toast({
        title: "Organisation created",
        description: "The organisation account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create organisation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetOrgPasswordMutation = useMutation({
    mutationFn: async ({ organizationId, newPassword }: { organizationId: string; newPassword: string }) => {
      const response = await apiRequest("POST", `/api/admin/organizations/${organizationId}/reset-password`, { newPassword });
      return response.json();
    },
    onSuccess: () => {
      setShowResetOrgPasswordDialog(false);
      setResetOrgPasswordTarget(null);
      setResetOrgNewPassword("");
      setShowResetOrgNewPassword(false);
      toast({
        title: "Password reset",
        description: "The organisation password has been reset successfully.",
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

  const handleResetOrgPassword = () => {
    if (!resetOrgPasswordTarget || !resetOrgNewPassword.trim()) {
      toast({
        title: "Missing password",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }
    if (resetOrgNewPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    resetOrgPasswordMutation.mutate({
      organizationId: resetOrgPasswordTarget.id,
      newPassword: resetOrgNewPassword,
    });
  };
  
  const handleCreateOrganization = () => {
    if (!newOrgName.trim() || !newOrgEmail.trim() || !newOrgPassword.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    createOrgMutation.mutate({
      name: newOrgName.trim(),
      email: newOrgEmail.trim(),
      password: newOrgPassword,
      featureDefaults: orgFeatureDefaults,
    });
  };
  
  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/admin/auth/change-password", {
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

  const handleChangePassword = () => {
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
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };
  
  const fetchOrgClients = async (orgId: string) => {
    setLoadingClients(true);
    try {
      const response = await apiRequest("GET", `/api/admin/organizations/${orgId}/clients`);
      const data = await response.json();
      setOrgClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };
  
  const handleViewOrgClients = (org: AdminOrganizationView) => {
    setSelectedOrg(org);
    fetchOrgClients(org.id);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
              data-testid="link-home-logo"
              onClick={async () => {
                await logout();
                setLocation("/");
              }}
            >
              <ArrowLeft className="h-5 w-5 text-green-600" />
              <ShieldCheck className="h-9 w-9 text-green-600" />
              <span className="text-2xl font-bold text-green-600">aok</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {admin?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{admin?.role}</Badge>
            {isSuperAdmin && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowCreateOrgDialog(true)}
                data-testid="button-create-organization"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Organisation
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowChangePasswordDialog(true)} data-testid="button-admin-change-password">
              <KeyRound className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <div className="border-t">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }} data-testid="nav-admin-tabs">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/admin")}
                data-testid="nav-dashboard"
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/admin/users")}
                data-testid="nav-users"
              >
                Users
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/admin/bundles")}
                data-testid="nav-bundles"
              >
                Bundles
              </Button>
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveView(activeView === "team" ? "dashboard" : "team")}
                  data-testid="nav-team"
                  className={activeView === "team" ? "bg-accent" : ""}
                >
                  Team
                </Button>
              )}
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/admin/architecture")}
                  data-testid="nav-architecture"
                >
                  VPC
                </Button>
              )}
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/admin/workflows")}
                  data-testid="nav-workflows"
                >
                  Workflows
                </Button>
              )}
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/admin/licence-agreements")}
                  data-testid="nav-licence-agreements"
                >
                  Licences
                </Button>
              )}
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/admin/revenue")}
                  data-testid="nav-revenue"
                >
                  Revenue
                </Button>
              )}
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/admin/permissions")}
                  data-testid="nav-permissions"
                >
                  Permissions
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeView === "team" && isSuperAdmin ? (
          <AdminTeam />
        ) : (
        <>
        <h2 className="text-2xl font-semibold mb-6">Overview</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-users">
                    {stats.totalUsers}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Organisations</CardTitle>
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-organizations">
                    {stats.totalOrganizations}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Individuals</CardTitle>
                  <User className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-individuals">
                    {stats.totalIndividuals}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-checkins">
                    {stats.totalCheckIns}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Missed Check-ins</CardTitle>
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive" data-testid="stat-missed">
                    {stats.totalMissedCheckIns}
                  </div>
                  <Link href="/admin/missed-checkins-report">
                    <Button variant="link" size="sm" className="px-0 mt-2" data-testid="button-view-all-missed-checkins">
                      View All
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Active Bundles</CardTitle>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-bundles">
                    {stats.activeBundles}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Seats Allocated</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-seats-allocated">
                    {stats.totalSeatsAllocated}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Seats Used</CardTitle>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-seats-used">
                    {stats.totalSeatsUsed}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Emergency Alerts</CardTitle>
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500" data-testid="stat-emergency-alerts">
                    {stats.totalEmergencyAlerts}
                  </div>
                  <Link href="/admin/emergency-alerts-report">
                    <Button variant="link" size="sm" className="px-0 mt-2" data-testid="button-view-all-emergency-alerts">
                      View All
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Latest registered users</CardDescription>
                  </div>
                  <Link href="/admin/users-report">
                    <Button variant="outline" size="sm" data-testid="button-view-all-users">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {stats.recentUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No users yet</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentUsers.slice(0, 5).map((user: any) => (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          data-testid={`recent-user-${user.id}`}
                        >
                          <div>
                            <p className="font-medium">
                              {user.orgClientReferenceCode ? user.orgClientReferenceCode : user.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.accountType === "organization" ? "default" : user.organizationName ? "outline" : "secondary"}>
                              {user.organizationName ? "org client" : user.accountType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(user.createdAt?.toString() || "")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>Daily Registrations</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </div>
                  <Link href="/admin/registrations-report">
                    <Button variant="outline" size="sm" data-testid="button-view-all-registrations">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {stats.dailyRegistrations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No registration data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.dailyRegistrations.slice(-7).map((day) => (
                        <div 
                          key={day.date} 
                          className="flex items-center justify-between p-2 rounded bg-muted/30"
                        >
                          <span className="text-sm">{formatDate(day.date)}</span>
                          <Badge variant="secondary">{day.count} users</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-red-500" />
                      Recent Emergency Alerts
                    </CardTitle>
                    <CardDescription>Users who triggered emergency alerts</CardDescription>
                  </div>
                  <Link href="/admin/emergency-alerts-report">
                    <Button variant="outline" size="sm" data-testid="button-view-all-alerts">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {stats.recentEmergencyAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No emergency alerts</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentEmergencyAlerts.slice(0, 5).map((alert: any) => (
                        <div 
                          key={alert.id} 
                          className="flex items-start justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                          data-testid={`emergency-alert-${alert.id}`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">
                              {alert.orgClientReferenceCode ? alert.orgClientReferenceCode : alert.userName}
                            </p>
                            <p className="text-sm text-muted-foreground">{alert.userEmail}</p>
                            {alert.organizationName && (
                              <p className="text-xs text-muted-foreground italic">
                                Client of {alert.organizationName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Notified: {alert.contactsNotified.join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="bg-red-500">Emergency</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(alert.timestamp), "d MMM, HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Failed to load statistics</p>
        )}
        
        {/* Organisations Section */}
        <h2 className="text-2xl font-semibold mb-6 mt-10">Organisations & Clients</h2>
        
        {orgsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : organizations && organizations.length > 0 ? (
          <div className="space-y-4">
            {[...organizations].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((org) => (
              <Card key={org.id} className={org.disabled ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      {org.name}
                      {org.disabled && <Badge variant="destructive">Disabled</Badge>}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{org.email}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>Created {org.createdAt ? format(new Date(org.createdAt), "dd/MM/yyyy") : "N/A"}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetOrgPasswordTarget(org);
                          setShowResetOrgPasswordDialog(true);
                        }}
                        data-testid={`button-reset-org-password-${org.id}`}
                      >
                        <KeyRound className="h-4 w-4 mr-1" />
                        Reset Password
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrgClients(org)}
                      data-testid={`button-view-org-${org.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Clients ({org.totalClients})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Clients</p>
                      <p className="text-xl font-bold">{org.totalClients}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-xl font-bold text-primary">{org.activeClients}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paused</p>
                      <p className="text-xl font-bold text-yellow-600">{org.pausedClients}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Alerts</p>
                      <p className="text-xl font-bold text-destructive">{org.totalAlerts}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bundles</p>
                      <div className="flex flex-wrap gap-1">
                        {org.bundles.map((bundle) => (
                          <Badge 
                            key={bundle.id} 
                            variant={bundle.status === "active" ? "default" : "secondary"}
                          >
                            {bundle.name} ({bundle.seatsUsed}/{bundle.seatLimit})
                          </Badge>
                        ))}
                        {org.bundles.length === 0 && <span className="text-muted-foreground">None</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No organisations registered yet</p>
            </CardContent>
          </Card>
        )}
        
        {/* Organization Clients Dialog */}
        <Dialog open={!!selectedOrg} onOpenChange={() => { setSelectedOrg(null); setOrgClients([]); setOrgClientSearchRef(""); setOrgClientSearchPhone(""); setShowOrgFeatureDefaults(false); }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedOrg?.name} - Clients ({filteredOrgClients.length} of {orgClients.length})
              </DialogTitle>
              <DialogDescription>
                Privacy-protected view. Clients listed by reference number.
              </DialogDescription>
            </DialogHeader>
            
            {/* Organisation Feature Defaults */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => setShowOrgFeatureDefaults(!showOrgFeatureDefaults)}
                data-testid="button-toggle-org-defaults"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Feature Defaults
                </span>
                <span className="text-xs text-muted-foreground">{showOrgFeatureDefaults ? "Hide" : "Show"}</span>
              </Button>
              {showOrgFeatureDefaults && (
                <div className="border rounded-md p-3 space-y-1 max-h-64 overflow-y-auto">
                  {isLoadingOrgDefaults ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    allTierFeatureKeys.map((key) => {
                      const orgKey = "org" + key.charAt(0).toUpperCase() + key.slice(1);
                      const hasData = Object.keys(orgFeatureDefaultsEditing).length > 0;
                      return (
                        <div key={orgKey} className="flex items-center justify-between py-1.5 px-2 rounded-md" data-testid={`org-default-${key}`}>
                          <span className="text-sm">{featureLabels[key] || key}</span>
                          <Switch
                            checked={hasData ? (orgFeatureDefaultsEditing[orgKey] ?? false) : false}
                            onCheckedChange={(checked) => {
                              const updates = { ...orgFeatureDefaultsEditing, [orgKey]: checked };
                              setOrgFeatureDefaultsEditing(updates);
                              if (selectedOrg) {
                                updateOrgFeatureDefaultsMutation.mutate({ orgId: selectedOrg.id, updates: { [orgKey]: checked } });
                              }
                            }}
                            disabled={updateOrgFeatureDefaultsMutation.isPending || !hasData}
                            data-testid={`switch-org-default-${key}`}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Search Fields */}
            {orgClients.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ref # or code..."
                    value={orgClientSearchRef}
                    onChange={(e) => setOrgClientSearchRef(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-org-client-ref"
                  />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by phone..."
                    value={orgClientSearchPhone}
                    onChange={(e) => setOrgClientSearchPhone(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-org-client-phone"
                  />
                </div>
              </div>
            )}
            
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : orgClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No clients in this organisation</p>
              </div>
            ) : filteredOrgClients.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No clients match your search</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => { setOrgClientSearchRef(""); setOrgClientSearchPhone(""); }}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrgClients.map((client) => (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${client.clientStatus !== "active" ? "opacity-60" : ""} ${client.hasActiveAlert ? "border-destructive bg-destructive/5" : ""}`}
                    data-testid={`admin-client-${client.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Flashing alert icon or reference number */}
                      {client.hasActiveAlert ? (
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive animate-flash-alert">
                          <AlertOctagon className="h-6 w-6 text-white" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-bold">
                          {client.clientOrdinal}
                        </div>
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{client.referenceCode}</code>
                          {client.hasActiveAlert && (
                            <span className="text-sm font-medium text-muted-foreground">#{client.clientOrdinal}</span>
                          )}
                          {getClientStatusBadge(client.clientStatus)}
                          {!client.isActivated && (
                            <Badge variant="outline" className="text-xs">
                              {client.registrationStatus === "pending_sms" ? "SMS Pending" : "Not Activated"}
                            </Badge>
                          )}
                          {client.hasActiveAlert && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              EMERGENCY
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Added: {formatDistanceToNow(new Date(client.addedAt), { addSuffix: true })}
                          {client.clientPhone && (
                            <span className="ml-2">
                              <Phone className="h-3 w-3 inline mr-1" />
                              {client.clientPhone}
                            </span>
                          )}
                        </div>
                        {/* Emergency Alert Details */}
                        {client.hasActiveAlert && client.alertActivatedAt && (
                          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs space-y-1">
                            <div className="font-medium text-destructive">
                              Alert activated: {new Date(client.alertActivatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} at {new Date(client.alertActivatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {client.alertWhat3Words ? (
                              <div>
                                <a 
                                  href={`https://what3words.com/${client.alertWhat3Words}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-destructive underline font-medium"
                                >
                                  ///{client.alertWhat3Words}
                                </a>
                              </div>
                            ) : client.alertLatitude && client.alertLongitude ? (
                              <div>
                                <a 
                                  href={`https://www.google.com/maps?q=${client.alertLatitude},${client.alertLongitude}`}
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
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {admin?.role === "super_admin" && (
                        <>
                          {client.clientStatus === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateClientStatusMutation.mutate({ 
                                organizationId: selectedOrg!.id, 
                                clientId: client.id, 
                                status: "paused" 
                              })}
                              disabled={updateClientStatusMutation.isPending}
                              className="text-yellow-600 border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                              data-testid={`button-pause-${client.id}`}
                            >
                              Pause
                            </Button>
                          ) : client.clientStatus === "paused" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateClientStatusMutation.mutate({ 
                                organizationId: selectedOrg!.id, 
                                clientId: client.id, 
                                status: "active" 
                              })}
                              disabled={updateClientStatusMutation.isPending}
                              className="text-primary border-primary"
                              data-testid={`button-resume-${client.id}`}
                            >
                              Resume
                            </Button>
                          ) : null}
                          
                          
                          {client.isActivated && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingScheduleClient(client);
                                  setShowScheduleDialog(true);
                                  if (selectedOrg) {
                                    fetchClientSchedule(selectedOrg.id, client.id);
                                  }
                                }}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                data-testid={`button-edit-schedule-${client.id}`}
                              >
                                Edit Schedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetClientMutation.mutate({ 
                                  organizationId: selectedOrg!.id, 
                                  clientId: client.id 
                                })}
                                disabled={resetClientMutation.isPending}
                                className="text-cyan-600 border-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                                data-testid={`button-reset-${client.id}`}
                              >
                                {resetClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                                Reset
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingFeaturesClient(client);
                              setClientFeatures({
                                featureWellbeingAi: client.featureWellbeingAi ?? true,
                                featureShakeToAlert: client.featureShakeToAlert ?? true,
                                featureMoodTracking: client.featureMoodTracking ?? true,
                                featurePetProtection: client.featurePetProtection ?? true,
                                featureDigitalWill: client.featureDigitalWill ?? true,
                              });
                              setShowFeaturesDialog(true);
                            }}
                            className="text-purple-600 border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                            data-testid={`button-features-${client.id}`}
                          >
                            Features
                          </Button>
                          
                          {client.clientPhone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendReminderMutation.mutate({ 
                                organizationId: selectedOrg!.id, 
                                clientId: client.id 
                              })}
                              disabled={sendReminderMutation.isPending}
                              className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                              data-testid={`button-send-reminder-${client.id}`}
                            >
                              {sendReminderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Ref"}
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeClientMutation.mutate({ 
                              organizationId: selectedOrg!.id, 
                              clientId: client.id 
                            })}
                            disabled={removeClientMutation.isPending}
                            className="text-destructive border-destructive hover:bg-red-50 dark:hover:bg-red-950"
                            data-testid={`button-delete-${client.id}`}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Client Features Dialog */}
        <Dialog open={showFeaturesDialog} onOpenChange={(open) => { 
          setShowFeaturesDialog(open);
          if (!open) setEditingFeaturesClient(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Client Features - #{editingFeaturesClient?.clientOrdinal}
              </DialogTitle>
              <DialogDescription>
                Enable or disable features for this client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Wellbeing AI</Label>
                  <p className="text-xs text-muted-foreground">AI-powered wellness insights</p>
                </div>
                <Switch
                  checked={clientFeatures.featureWellbeingAi}
                  onCheckedChange={(checked) => setClientFeatures(prev => ({ ...prev, featureWellbeingAi: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Shake to Alert</Label>
                  <p className="text-xs text-muted-foreground">Emergency SOS by shaking device</p>
                </div>
                <Switch
                  checked={clientFeatures.featureShakeToAlert}
                  onCheckedChange={(checked) => setClientFeatures(prev => ({ ...prev, featureShakeToAlert: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mood Tracking</Label>
                  <p className="text-xs text-muted-foreground">Daily mood and wellness logging</p>
                </div>
                <Switch
                  checked={clientFeatures.featureMoodTracking}
                  onCheckedChange={(checked) => setClientFeatures(prev => ({ ...prev, featureMoodTracking: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Pet Protection</Label>
                  <p className="text-xs text-muted-foreground">Pet care profiles and instructions</p>
                </div>
                <Switch
                  checked={clientFeatures.featurePetProtection}
                  onCheckedChange={(checked) => setClientFeatures(prev => ({ ...prev, featurePetProtection: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Digital Will</Label>
                  <p className="text-xs text-muted-foreground">Secure document storage</p>
                </div>
                <Switch
                  checked={clientFeatures.featureDigitalWill}
                  onCheckedChange={(checked) => setClientFeatures(prev => ({ ...prev, featureDigitalWill: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeaturesDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingFeaturesClient && selectedOrg) {
                    updateClientFeaturesMutation.mutate({
                      organizationId: selectedOrg.id,
                      clientId: editingFeaturesClient.id,
                      features: clientFeatures,
                    });
                  }
                }}
                disabled={updateClientFeaturesMutation.isPending}
              >
                {updateClientFeaturesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Features
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Create Organisation Dialog */}
        <Dialog open={showCreateOrgDialog} onOpenChange={setShowCreateOrgDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Create Organisation
              </DialogTitle>
              <DialogDescription>
                Create a new organisation account. Once created, you can assign bundles to it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organisation Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g., Care Home ABC"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  data-testid="input-org-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">Email Address</Label>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="e.g., admin@organisation.com"
                  value={newOrgEmail}
                  onChange={(e) => setNewOrgEmail(e.target.value)}
                  data-testid="input-org-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-password">Password</Label>
                <div className="relative">
                  <Input
                    id="org-password"
                    type={showNewOrgPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newOrgPassword}
                    onChange={(e) => setNewOrgPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="off"
                    data-testid="input-org-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewOrgPassword(!showNewOrgPassword)}
                    data-testid="button-toggle-org-password"
                  >
                    {showNewOrgPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowOrgFeatures(!showOrgFeatures)}
                  data-testid="button-toggle-org-features"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Feature Defaults
                  </span>
                  <span className="text-xs text-muted-foreground">{showOrgFeatures ? "Hide" : "Show"}</span>
                </Button>
                {showOrgFeatures && (
                  <div className="border rounded-md p-3 space-y-1 max-h-64 overflow-y-auto">
                    {allTierFeatureKeys.map((key) => {
                      const orgKey = "org" + key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <div key={orgKey} className="flex items-center justify-between py-1.5 px-2 rounded-md" data-testid={`org-feature-${key}`}>
                          <span className="text-sm">{featureLabels[key] || key}</span>
                          <Switch
                            checked={orgFeatureDefaults[orgKey] ?? true}
                            onCheckedChange={(checked) => setOrgFeatureDefaults(prev => ({ ...prev, [orgKey]: checked }))}
                            data-testid={`switch-org-${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCreateOrgDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={createOrgMutation.isPending}
                data-testid="button-submit-organization"
              >
                {createOrgMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organisation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
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
                <Label htmlFor="admin-current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="admin-current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    data-testid="input-admin-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    data-testid="button-toggle-current-password"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="admin-new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    data-testid="input-admin-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    data-testid="button-toggle-new-password"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-confirm-new-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="admin-confirm-new-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-testid="input-admin-confirm-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)} data-testid="button-cancel-admin-change-password">
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                data-testid="button-submit-admin-change-password"
              >
                {changePasswordMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Changing...</>
                ) : (
                  "Change Password"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Organization Password Dialog */}
        <Dialog open={showResetOrgPasswordDialog} onOpenChange={(open) => {
          if (!open) {
            setShowResetOrgPasswordDialog(false);
            setResetOrgPasswordTarget(null);
            setResetOrgNewPassword("");
            setShowResetOrgNewPassword(false);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Organisation Password</DialogTitle>
              <DialogDescription>
                Enter a new password for {resetOrgPasswordTarget?.name || "this organisation"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reset-org-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="reset-org-password"
                    type={showResetOrgNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 8 characters)"
                    value={resetOrgNewPassword}
                    onChange={(e) => setResetOrgNewPassword(e.target.value)}
                    data-testid="input-reset-org-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowResetOrgNewPassword(!showResetOrgNewPassword)}
                    data-testid="button-toggle-reset-org-password"
                  >
                    {showResetOrgNewPassword ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will immediately change the organisation's password. They will need to use this new password to log in.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetOrgPasswordDialog(false)} data-testid="button-cancel-reset-org-password">
                Cancel
              </Button>
              <Button
                onClick={handleResetOrgPassword}
                disabled={resetOrgPasswordMutation.isPending}
                data-testid="button-submit-reset-org-password"
              >
                {resetOrgPasswordMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...</>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Schedule Dialog */}
        <Dialog open={showScheduleDialog} onOpenChange={(open) => {
          if (!open) {
            setShowScheduleDialog(false);
            setEditingScheduleClient(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Check-in Schedule</DialogTitle>
              <DialogDescription>
                Update the check-in schedule for client #{editingScheduleClient?.clientOrdinal} ({editingScheduleClient?.referenceCode}).
              </DialogDescription>
            </DialogHeader>
            {loadingSchedule ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-start-time">Daily Check-in Time</Label>
                  <Input
                    id="schedule-start-time"
                    type="time"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    data-testid="input-schedule-start-time"
                  />
                  <p className="text-xs text-muted-foreground">
                    The time each day when the check-in cycle begins.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schedule-interval">Check-in Interval (hours)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="schedule-interval"
                      type="number"
                      min={1}
                      max={48}
                      value={scheduleIntervalHours}
                      onChange={(e) => setScheduleIntervalHours(parseInt(e.target.value) || 24)}
                      className="w-24"
                      data-testid="input-schedule-interval"
                    />
                    <span className="text-sm text-muted-foreground">
                      {scheduleIntervalHours === 1 ? "hour" : "hours"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How often the client needs to check in (1-48 hours).
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleDialog(false);
                  setEditingScheduleClient(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrg && editingScheduleClient) {
                    updateScheduleMutation.mutate({
                      organizationId: selectedOrg.id,
                      clientId: editingScheduleClient.id,
                      scheduleStartTime,
                      checkInIntervalHours: scheduleIntervalHours,
                    });
                  }
                }}
                disabled={updateScheduleMutation.isPending || loadingSchedule}
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
        </>
        )}
      </main>
    </div>
  );
}
