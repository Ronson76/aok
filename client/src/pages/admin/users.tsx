import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, LogOut, Shield, ShieldCheck, Trash2, ArrowLeft, Building2, User, Ban, CheckCircle, Plus, Loader2, Eye, EyeOff, Settings2, Search, RotateCcw, Archive, ChevronDown, ChevronRight, AlertTriangle, Siren, BarChart3, LayoutDashboard, Pencil
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, UserFeatureSettings, AdminOrganizationView, AdminOrganizationClientView } from "@shared/schema";
import { useState, useMemo } from "react";

export default function AdminUsers() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"active" | "organisations" | "archived">("active");
  
  // Search state
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [showOrgPassword, setShowOrgPassword] = useState(false);
  const [orgSafeguardingEnabled, setOrgSafeguardingEnabled] = useState(false);
  const [orgSafeguardingExpiry, setOrgSafeguardingExpiry] = useState("");
  const [orgRegisterEnabled, setOrgRegisterEnabled] = useState(false);
  const [orgRegisterExpiry, setOrgRegisterExpiry] = useState("");
  const [orgAssuranceEnabled, setOrgAssuranceEnabled] = useState(false);
  const [orgAssuranceExpiry, setOrgAssuranceExpiry] = useState("");
  const [orgApiAccessEnabled, setOrgApiAccessEnabled] = useState(false);
  const [orgApiAccessExpiry, setOrgApiAccessExpiry] = useState("");
  const [orgDashboardEnabled, setOrgDashboardEnabled] = useState(false);
  const [orgDashboardExpiry, setOrgDashboardExpiry] = useState("");

  const [showEditOrgDialog, setShowEditOrgDialog] = useState(false);
  const [editOrgId, setEditOrgId] = useState<string | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgEmail, setEditOrgEmail] = useState("");
  const [editOrgDisabled, setEditOrgDisabled] = useState(false);
  
  // Feature management
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userFeatures, setUserFeatures] = useState<UserFeatureSettings>({
    featureWellbeingAi: true,
    featureShakeToAlert: true,
    featureWellness: true,
    featurePetProtection: true,
    featureDigitalWill: true,
  });

  const { data: users, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: archivedUsers, isLoading: isArchivedLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users/archived"],
    enabled: activeTab === "archived",
  });

  const { data: organizations, isLoading: isOrgsLoading } = useQuery<AdminOrganizationView[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: activeTab === "organisations",
  });

  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  const { data: expandedOrgClients, isLoading: isOrgClientsLoading } = useQuery<AdminOrganizationClientView[]>({
    queryKey: ["/api/admin/organizations", expandedOrgId, "clients"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${expandedOrgId}/clients`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!expandedOrgId,
  });

  const { data: expandedOrgFeatures } = useQuery<any>({
    queryKey: ["/api/admin/organizations", expandedOrgId, "feature-defaults"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${expandedOrgId}/feature-defaults`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
    enabled: !!expandedOrgId,
  });

  const updateOrgFeatureMutation = useMutation({
    mutationFn: async ({ orgId, updates }: { orgId: string; updates: Record<string, any> }) => {
      await apiRequest("PUT", `/api/admin/organizations/${orgId}/feature-defaults`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", variables.orgId, "feature-defaults"] });
      toast({ title: "Feature updated", description: "Organisation feature settings saved." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    },
  });

  // Filter and sort users based on search terms (individual users only - orgs have their own tab)
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = users.filter(u => u.accountType !== "organization");
    
    // Default sort: alphabetically by name
    result.sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
    
    // Filter by name
    if (searchName.trim()) {
      const nameLower = searchName.toLowerCase();
      result = result.filter(user => 
        user.name?.toLowerCase().includes(nameLower)
      );
      // Sort by match relevance - names starting with search term first
      result.sort((a, b) => {
        const aStarts = a.name?.toLowerCase().startsWith(nameLower) ? 0 : 1;
        const bStarts = b.name?.toLowerCase().startsWith(nameLower) ? 0 : 1;
        return aStarts - bStarts;
      });
    }
    
    // Filter by email
    if (searchEmail.trim()) {
      const emailLower = searchEmail.toLowerCase();
      result = result.filter(user => 
        user.email?.toLowerCase().includes(emailLower)
      );
      // Sort by match relevance - emails starting with search term first
      result.sort((a, b) => {
        const aStarts = a.email?.toLowerCase().startsWith(emailLower) ? 0 : 1;
        const bStarts = b.email?.toLowerCase().startsWith(emailLower) ? 0 : 1;
        return aStarts - bStarts;
      });
    }
    
    return result;
  }, [users, searchName, searchEmail]);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "User archived",
        description: "The user has been moved to the archive.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message || "Could not delete user",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({ title: "User restored", description: "The user has been restored from the archive." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Restore failed", description: error.message || "Could not restore user. The email may already be in use." });
    },
  });

  const [permanentDeleteUserId, setPermanentDeleteUserId] = useState<string | null>(null);
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("");
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [bulkArchiveConfirmText, setBulkArchiveConfirmText] = useState("");
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");

  const permanentDeleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setPermanentDeleteUserId(null);
      setPermanentDeleteConfirmText("");
      toast({
        title: "User permanently deleted",
        description: "The user and all their data have been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Permanent delete failed",
        description: error.message || "Could not permanently delete user",
      });
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/users/archive-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setShowBulkArchiveDialog(false);
      setBulkArchiveConfirmText("");
      toast({
        title: "All users archived",
        description: "All active users have been moved to the archive.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Bulk archive failed",
        description: error.message || "Could not archive all users",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/users/archived/permanent-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setShowBulkDeleteDialog(false);
      setBulkDeleteConfirmText("");
      toast({
        title: "All archived users deleted",
        description: "All archived users and their data have been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Bulk delete failed",
        description: error.message || "Could not delete all archived users",
      });
    },
  });

  const toggleDisabledMutation = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/disabled`, { disabled });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: variables.disabled ? "User disabled" : "User enabled",
        description: variables.disabled 
          ? "The user can no longer log in." 
          : "The user can now log in again.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update user status",
      });
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: async ({ userId, features }: { userId: string; features: Partial<UserFeatureSettings> }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/features`, features);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Features updated",
        description: "User feature settings have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update feature settings",
      });
    },
  });

  const openFeaturesDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setUserFeatures({
      featureWellbeingAi: user.featureWellbeingAi ?? true,
      featureShakeToAlert: user.featureShakeToAlert ?? true,
      featureWellness: user.featureWellness ?? true,
      featurePetProtection: user.featurePetProtection ?? true,
      featureDigitalWill: user.featureDigitalWill ?? true,
    });
    setShowFeaturesDialog(true);
  };

  const handleFeatureToggle = (feature: keyof UserFeatureSettings, value: boolean) => {
    const newFeatures = { ...userFeatures, [feature]: value };
    setUserFeatures(newFeatures);
    if (selectedUser) {
      updateFeaturesMutation.mutate({ 
        userId: selectedUser.id, 
        features: { [feature]: value } 
      });
    }
  };

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const featureDefaults: Record<string, any> = {};
      featureDefaults.orgFeatureSafeguarding = orgSafeguardingEnabled;
      featureDefaults.orgFeatureSafeguardingExpiresAt = orgSafeguardingExpiry || null;
      featureDefaults.orgFeatureRegister = orgRegisterEnabled;
      featureDefaults.orgFeatureRegisterExpiresAt = orgRegisterExpiry || null;
      featureDefaults.orgFeatureAssurance = orgAssuranceEnabled;
      featureDefaults.orgFeatureAssuranceExpiresAt = orgAssuranceExpiry || null;
      featureDefaults.orgFeatureApiAccess = orgApiAccessEnabled;
      featureDefaults.orgFeatureApiAccessExpiresAt = orgApiAccessExpiry || null;
      featureDefaults.orgFeatureDashboard = orgDashboardEnabled;
      featureDefaults.orgFeatureDashboardExpiresAt = orgDashboardExpiry || null;

      await apiRequest("POST", "/api/admin/organizations", {
        name: orgName,
        email: orgEmail,
        password: orgPassword,
        featureDefaults,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setShowCreateOrgDialog(false);
      setOrgName("");
      setOrgEmail("");
      setOrgPassword("");
      setOrgAssuranceEnabled(false);
      setOrgAssuranceExpiry("");
      setOrgApiAccessEnabled(false);
      setOrgApiAccessExpiry("");
      toast({
        title: "Organisation created",
        description: `${orgName} has been created. They can now log in.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create organisation",
        description: error.message || "Could not create organisation",
      });
    },
  });

  const editOrgMutation = useMutation({
    mutationFn: async () => {
      if (!editOrgId) return;
      await apiRequest("PATCH", `/api/admin/organizations/${editOrgId}`, {
        name: editOrgName,
        email: editOrgEmail,
        disabled: editOrgDisabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setShowEditOrgDialog(false);
      toast({
        title: "Organisation updated",
        description: `${editOrgName} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update organisation",
        description: error.message || "Could not update organisation",
      });
    },
  });

  const openEditOrgDialog = (org: AdminOrganizationView) => {
    setEditOrgId(org.id);
    setEditOrgName(org.name);
    setEditOrgEmail(org.email);
    setEditOrgDisabled(org.disabled);
    setShowEditOrgDialog(true);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isSuperAdmin = admin?.role === "super_admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home-logo">
              <ArrowLeft className="h-5 w-5 text-green-600" />
              <ShieldCheck className="h-9 w-9 text-green-600" />
              <span className="text-2xl font-bold text-green-600">aok</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage all registered users</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{admin?.role}</Badge>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <div className="border-t">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide" data-testid="nav-admin-tabs">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} data-testid="nav-dashboard">
                Dashboard
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setLocation("/admin/users")} data-testid="nav-users">
                Users
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/bundles")} data-testid="nav-bundles">
                Bundles
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeTab === "organisations" ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  {activeTab === "organisations" ? "Organisations" : "Users"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "organisations" 
                    ? `${organizations?.length || 0} registered organisations`
                    : activeTab === "archived"
                      ? `${archivedUsers?.length || 0} archived accounts`
                      : `${filteredUsers.length} individual users`
                  }
                </CardDescription>
              </div>
              {isSuperAdmin && activeTab === "organisations" && (
                <Button onClick={() => setShowCreateOrgDialog(true)} data-testid="button-create-org">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organisation
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button 
                  variant={activeTab === "active" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("active")}
                  data-testid="tab-active-users"
                >
                  Users ({users?.filter(u => u.accountType !== "organization").length || 0})
                </Button>
                <Button 
                  variant={activeTab === "organisations" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("organisations")}
                  data-testid="tab-organisations"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Organisations
                </Button>
                <Button 
                  variant={activeTab === "archived" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveTab("archived")}
                  data-testid="tab-archived-users"
                >
                  Archived ({archivedUsers?.length || 0})
                </Button>
              </div>
              {isSuperAdmin && activeTab === "active" && filteredUsers.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setShowBulkArchiveDialog(true);
                    setBulkArchiveConfirmText("");
                  }}
                  data-testid="button-archive-all-users"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive All
                </Button>
              )}
              {isSuperAdmin && activeTab === "archived" && archivedUsers && archivedUsers.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setShowBulkDeleteDialog(true);
                    setBulkDeleteConfirmText("");
                  }}
                  data-testid="button-delete-all-archived"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Forever
                </Button>
              )}
            </div>

            {activeTab === "active" && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-name"
                  />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-email"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {activeTab === "active" ? (
              <>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                        data-testid={`user-row-${user.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.mobileNumber && (
                              <p className="text-xs text-muted-foreground">{user.mobileNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {user.disabled && (
                            <Badge variant="destructive">Disabled</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(user.createdAt?.toString() || "")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openFeaturesDialog(user)}
                            title="Manage features"
                            data-testid={`button-features-user-${user.id}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleDisabledMutation.mutate({ 
                                userId: user.id, 
                                disabled: !user.disabled 
                              })}
                              disabled={toggleDisabledMutation.isPending}
                              title={user.disabled ? "Enable user" : "Disable user"}
                              data-testid={`button-toggle-user-${user.id}`}
                            >
                              {user.disabled ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Ban className="w-4 h-4 text-amber-600" />
                              )}
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to archive <strong>{user.name}</strong>? 
                                    Their data will be moved to the archive. You can restore them later if needed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(user.id)}
                                    data-testid={`confirm-delete-user-${user.id}`}
                                  >
                                    Archive
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (searchName || searchEmail) ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No users match your search</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => { setSearchName(""); setSearchEmail(""); }}
                    >
                      Clear search
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                )}
              </>
            ) : activeTab === "organisations" ? (
              <>
                {isOrgsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : organizations && organizations.length > 0 ? (
                  <div className="space-y-3">
                    {organizations.map((org) => (
                      <div key={org.id} className="border rounded-lg" data-testid={`org-row-${org.id}`}>
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover-elevate rounded-lg"
                          onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                          data-testid={`button-expand-org-${org.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-sm text-muted-foreground">{org.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{org.totalClients} clients</Badge>
                            <Badge variant="default">{org.activeClients} active</Badge>
                            {org.pausedClients > 0 && (
                              <Badge variant="outline">{org.pausedClients} paused</Badge>
                            )}
                            {org.disabled && (
                              <Badge variant="destructive">Disabled</Badge>
                            )}
                            {expandedOrgId === org.id ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {expandedOrgId === org.id && (
                          <div className="border-t px-4 py-4 space-y-4" data-testid={`org-details-${org.id}`}>
                            <div className="flex items-center justify-between">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                                  <p className="text-sm">{formatDate(org.createdAt?.toString() || "")}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Alerts</p>
                                  <p className="text-sm">{org.totalAlerts}</p>
                                </div>
                              </div>
                              {isSuperAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openEditOrgDialog(org); }}
                                  data-testid={`button-edit-org-${org.id}`}
                                >
                                  <Pencil className="w-4 h-4 mr-1.5" />
                                  Edit
                                </Button>
                              )}
                            </div>

                            {org.bundles.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Bundles</p>
                                <div className="flex flex-wrap gap-2">
                                  {org.bundles.map((bundle) => (
                                    <div key={bundle.id} className="text-xs border rounded-md px-3 py-1.5">
                                      <span className="font-medium">{bundle.name}</span>
                                      <span className="text-muted-foreground ml-2">
                                        {bundle.seatsUsed}/{bundle.seatLimit} seats
                                      </span>
                                      {bundle.status !== "active" && (
                                        <Badge variant="outline" className="ml-2">{bundle.status}</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Enterprise Features</p>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-medium">Safeguarding</span>
                                    {expandedOrgFeatures?.orgFeatureSafeguardingExpiresAt && (
                                      <span className="text-xs text-muted-foreground">
                                        (expires {new Date(expandedOrgFeatures.orgFeatureSafeguardingExpiresAt).toLocaleDateString("en-GB")})
                                      </span>
                                    )}
                                  </div>
                                  <Switch
                                    checked={expandedOrgFeatures?.orgFeatureSafeguarding ?? false}
                                    onCheckedChange={(checked) => {
                                      if (expandedOrgId) {
                                        updateOrgFeatureMutation.mutate({
                                          orgId: expandedOrgId,
                                          updates: { orgFeatureSafeguarding: checked },
                                        });
                                      }
                                    }}
                                    data-testid={`switch-safeguarding-${org.id}`}
                                  />
                                </div>
                                {expandedOrgFeatures?.orgFeatureSafeguarding && (
                                  <div className="ml-6 flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Expiry:</Label>
                                    <Input
                                      type="date"
                                      value={expandedOrgFeatures?.orgFeatureSafeguardingExpiresAt ? new Date(expandedOrgFeatures.orgFeatureSafeguardingExpiresAt).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        if (expandedOrgId) {
                                          updateOrgFeatureMutation.mutate({
                                            orgId: expandedOrgId,
                                            updates: { orgFeatureSafeguardingExpiresAt: e.target.value || null },
                                          });
                                        }
                                      }}
                                      className="h-7 text-xs w-40"
                                      data-testid={`input-safeguarding-expiry-${org.id}`}
                                    />
                                  </div>
                                )}
                                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Archive className="h-4 w-4 text-teal-500" />
                                    <span className="text-sm font-medium">Register</span>
                                    {expandedOrgFeatures?.orgFeatureRegisterExpiresAt && (
                                      <span className="text-xs text-muted-foreground">
                                        (expires {new Date(expandedOrgFeatures.orgFeatureRegisterExpiresAt).toLocaleDateString("en-GB")})
                                      </span>
                                    )}
                                  </div>
                                  <Switch
                                    checked={expandedOrgFeatures?.orgFeatureRegister ?? false}
                                    onCheckedChange={(checked) => {
                                      if (expandedOrgId) {
                                        updateOrgFeatureMutation.mutate({
                                          orgId: expandedOrgId,
                                          updates: { orgFeatureRegister: checked },
                                        });
                                      }
                                    }}
                                    data-testid={`switch-register-${org.id}`}
                                  />
                                </div>
                                {expandedOrgFeatures?.orgFeatureRegister && (
                                  <div className="ml-6 flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Expiry:</Label>
                                    <Input
                                      type="date"
                                      value={expandedOrgFeatures?.orgFeatureRegisterExpiresAt ? new Date(expandedOrgFeatures.orgFeatureRegisterExpiresAt).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        if (expandedOrgId) {
                                          updateOrgFeatureMutation.mutate({
                                            orgId: expandedOrgId,
                                            updates: { orgFeatureRegisterExpiresAt: e.target.value || null },
                                          });
                                        }
                                      }}
                                      className="h-7 text-xs w-40"
                                      data-testid={`input-register-expiry-${org.id}`}
                                    />
                                  </div>
                                )}
                                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-indigo-500" />
                                    <span className="text-sm font-medium">Assurance Dashboard</span>
                                    {expandedOrgFeatures?.orgFeatureAssuranceExpiresAt && (
                                      <span className="text-xs text-muted-foreground">
                                        (expires {new Date(expandedOrgFeatures.orgFeatureAssuranceExpiresAt).toLocaleDateString("en-GB")})
                                      </span>
                                    )}
                                  </div>
                                  <Switch
                                    checked={expandedOrgFeatures?.orgFeatureAssurance ?? false}
                                    onCheckedChange={(checked) => {
                                      if (expandedOrgId) {
                                        updateOrgFeatureMutation.mutate({
                                          orgId: expandedOrgId,
                                          updates: { orgFeatureAssurance: checked },
                                        });
                                      }
                                    }}
                                    data-testid={`switch-assurance-${org.id}`}
                                  />
                                </div>
                                {expandedOrgFeatures?.orgFeatureAssurance && (
                                  <div className="ml-6 flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Expiry:</Label>
                                    <Input
                                      type="date"
                                      value={expandedOrgFeatures?.orgFeatureAssuranceExpiresAt ? new Date(expandedOrgFeatures.orgFeatureAssuranceExpiresAt).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        if (expandedOrgId) {
                                          updateOrgFeatureMutation.mutate({
                                            orgId: expandedOrgId,
                                            updates: { orgFeatureAssuranceExpiresAt: e.target.value || null },
                                          });
                                        }
                                      }}
                                      className="h-7 text-xs w-40"
                                      data-testid={`input-assurance-expiry-${org.id}`}
                                    />
                                  </div>
                                )}
                                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Settings2 className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium">API Access</span>
                                    {expandedOrgFeatures?.orgFeatureApiAccessExpiresAt && (
                                      <span className="text-xs text-muted-foreground">
                                        (expires {new Date(expandedOrgFeatures.orgFeatureApiAccessExpiresAt).toLocaleDateString("en-GB")})
                                      </span>
                                    )}
                                  </div>
                                  <Switch
                                    checked={expandedOrgFeatures?.orgFeatureApiAccess ?? false}
                                    onCheckedChange={(checked) => {
                                      if (expandedOrgId) {
                                        updateOrgFeatureMutation.mutate({
                                          orgId: expandedOrgId,
                                          updates: { orgFeatureApiAccess: checked },
                                        });
                                      }
                                    }}
                                    data-testid={`switch-api-access-${org.id}`}
                                  />
                                </div>
                                {expandedOrgFeatures?.orgFeatureApiAccess && (
                                  <div className="ml-6 flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Expiry:</Label>
                                    <Input
                                      type="date"
                                      value={expandedOrgFeatures?.orgFeatureApiAccessExpiresAt ? new Date(expandedOrgFeatures.orgFeatureApiAccessExpiresAt).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        if (expandedOrgId) {
                                          updateOrgFeatureMutation.mutate({
                                            orgId: expandedOrgId,
                                            updates: { orgFeatureApiAccessExpiresAt: e.target.value || null },
                                          });
                                        }
                                      }}
                                      className="h-7 text-xs w-40"
                                      data-testid={`input-api-expiry-${org.id}`}
                                    />
                                  </div>
                                )}
                                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <LayoutDashboard className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">Organisation Dashboard</span>
                                    {expandedOrgFeatures?.orgFeatureDashboardExpiresAt && (
                                      <span className="text-xs text-muted-foreground">
                                        (expires {new Date(expandedOrgFeatures.orgFeatureDashboardExpiresAt).toLocaleDateString("en-GB")})
                                      </span>
                                    )}
                                  </div>
                                  <Switch
                                    checked={expandedOrgFeatures?.orgFeatureDashboard ?? false}
                                    onCheckedChange={(checked) => {
                                      if (expandedOrgId) {
                                        updateOrgFeatureMutation.mutate({
                                          orgId: expandedOrgId,
                                          updates: { orgFeatureDashboard: checked },
                                        });
                                      }
                                    }}
                                    data-testid={`switch-dashboard-${org.id}`}
                                  />
                                </div>
                                {expandedOrgFeatures?.orgFeatureDashboard && (
                                  <div className="ml-6 flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Expiry:</Label>
                                    <Input
                                      type="date"
                                      value={expandedOrgFeatures?.orgFeatureDashboardExpiresAt ? new Date(expandedOrgFeatures.orgFeatureDashboardExpiresAt).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        if (expandedOrgId) {
                                          updateOrgFeatureMutation.mutate({
                                            orgId: expandedOrgId,
                                            updates: { orgFeatureDashboardExpiresAt: e.target.value || null },
                                          });
                                        }
                                      }}
                                      className="h-7 text-xs w-40"
                                      data-testid={`input-dashboard-expiry-${org.id}`}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Client Reference Numbers
                              </p>
                              {isOrgClientsLoading ? (
                                <div className="space-y-2">
                                  {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-full" />
                                  ))}
                                </div>
                              ) : expandedOrgClients && expandedOrgClients.length > 0 ? (
                                <div className="space-y-1.5">
                                  {expandedOrgClients.map((client) => (
                                    <div 
                                      key={client.id} 
                                      className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md text-sm"
                                      data-testid={`org-client-ref-${client.id}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono font-medium">{client.referenceCode}</span>
                                        <Badge variant={
                                          client.clientStatus === "active" ? "default" : 
                                          client.clientStatus === "paused" ? "outline" : "secondary"
                                        }>
                                          {client.clientStatus}
                                        </Badge>
                                        {!client.isActivated && (
                                          <Badge variant="outline">Not activated</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {client.hasActiveAlert && (
                                          <Badge variant="destructive" className="flex items-center gap-1">
                                            <Siren className="w-3 h-3" />
                                            Active Alert
                                          </Badge>
                                        )}
                                        <div className="flex gap-1">
                                          {client.featureWellbeingAi && <Badge variant="secondary">AI</Badge>}
                                          {client.featureShakeToAlert && <Badge variant="secondary">Shake</Badge>}
                                          {client.featureMoodTracking && <Badge variant="secondary">Mood</Badge>}
                                          {client.featurePetProtection && <Badge variant="secondary">Pet</Badge>}
                                          {client.featureDigitalWill && <Badge variant="secondary">Docs</Badge>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No clients registered</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No organisations found</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {isArchivedLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : archivedUsers && archivedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {archivedUsers.map((user: any) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`archived-user-row-${user.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            {user.accountType === "organization" ? (
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.archivedEmail || user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={user.accountType === "organization" ? "default" : "secondary"}>
                            {user.accountType}
                          </Badge>
                          <Badge variant="secondary">Archived</Badge>
                          <span className="text-xs text-muted-foreground">
                            {user.archivedAt ? new Date(user.archivedAt).toLocaleDateString("en-GB") : ""}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreMutation.mutate(user.id)}
                            disabled={restoreMutation.isPending}
                            data-testid={`button-restore-user-${user.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </Button>
                          {admin?.role === "super_admin" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setPermanentDeleteUserId(user.id);
                                setPermanentDeleteConfirmText("");
                              }}
                              data-testid={`button-permanent-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Forever
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No archived users</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Organisation Dialog */}
      <Dialog open={showCreateOrgDialog} onOpenChange={setShowCreateOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Create Organisation
            </DialogTitle>
            <DialogDescription>
              Create a new organisation account. They can log in at the Organisation portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organisation Name</Label>
              <Input
                id="org-name"
                placeholder="Naiya Care Services"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Email</Label>
              <Input
                id="org-email"
                type="email"
                placeholder="admin@aok.care"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                data-testid="input-org-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-password">Password</Label>
              <div className="relative">
                <Input
                  id="org-password"
                  type={showOrgPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={orgPassword}
                  onChange={(e) => setOrgPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="off"
                  data-testid="input-org-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowOrgPassword(!showOrgPassword)}
                  data-testid="button-toggle-org-password"
                >
                  {showOrgPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Enterprise Features</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="org-safeguarding" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-red-500" />
                      Safeguarding
                    </Label>
                    <Switch
                      id="org-safeguarding"
                      checked={orgSafeguardingEnabled}
                      onCheckedChange={setOrgSafeguardingEnabled}
                      data-testid="switch-org-safeguarding"
                    />
                  </div>
                  {orgSafeguardingEnabled && (
                    <div className="ml-6">
                      <Label htmlFor="org-safeguarding-expiry" className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input
                        id="org-safeguarding-expiry"
                        type="date"
                        value={orgSafeguardingExpiry}
                        onChange={(e) => setOrgSafeguardingExpiry(e.target.value)}
                        className="mt-1"
                        data-testid="input-org-safeguarding-expiry"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="org-register" className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-teal-500" />
                      Register
                    </Label>
                    <Switch
                      id="org-register"
                      checked={orgRegisterEnabled}
                      onCheckedChange={setOrgRegisterEnabled}
                      data-testid="switch-org-register"
                    />
                  </div>
                  {orgRegisterEnabled && (
                    <div className="ml-6">
                      <Label htmlFor="org-register-expiry" className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input
                        id="org-register-expiry"
                        type="date"
                        value={orgRegisterExpiry}
                        onChange={(e) => setOrgRegisterExpiry(e.target.value)}
                        className="mt-1"
                        data-testid="input-org-register-expiry"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="org-assurance" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-500" />
                      Assurance Dashboard
                    </Label>
                    <Switch
                      id="org-assurance"
                      checked={orgAssuranceEnabled}
                      onCheckedChange={setOrgAssuranceEnabled}
                      data-testid="switch-org-assurance"
                    />
                  </div>
                  {orgAssuranceEnabled && (
                    <div className="ml-6">
                      <Label htmlFor="org-assurance-expiry" className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input
                        id="org-assurance-expiry"
                        type="date"
                        value={orgAssuranceExpiry}
                        onChange={(e) => setOrgAssuranceExpiry(e.target.value)}
                        className="mt-1"
                        data-testid="input-org-assurance-expiry"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="org-api-access" className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-orange-500" />
                      API Access
                    </Label>
                    <Switch
                      id="org-api-access"
                      checked={orgApiAccessEnabled}
                      onCheckedChange={setOrgApiAccessEnabled}
                      data-testid="switch-org-api-access"
                    />
                  </div>
                  {orgApiAccessEnabled && (
                    <div className="ml-6">
                      <Label htmlFor="org-api-expiry" className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input
                        id="org-api-expiry"
                        type="date"
                        value={orgApiAccessExpiry}
                        onChange={(e) => setOrgApiAccessExpiry(e.target.value)}
                        className="mt-1"
                        data-testid="input-org-api-expiry"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="org-dashboard" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Organisation Dashboard
                    </Label>
                    <Switch
                      id="org-dashboard"
                      checked={orgDashboardEnabled}
                      onCheckedChange={setOrgDashboardEnabled}
                      data-testid="switch-org-dashboard"
                    />
                  </div>
                  {orgDashboardEnabled && (
                    <div className="ml-6">
                      <Label htmlFor="org-dashboard-expiry" className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input
                        id="org-dashboard-expiry"
                        type="date"
                        value={orgDashboardExpiry}
                        onChange={(e) => setOrgDashboardExpiry(e.target.value)}
                        className="mt-1"
                        data-testid="input-org-dashboard-expiry"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateOrgDialog(false)}
              data-testid="button-cancel-org"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createOrgMutation.mutate()}
              disabled={!orgName || !orgEmail || !orgPassword || orgPassword.length < 6 || createOrgMutation.isPending}
              data-testid="button-submit-org"
            >
              {createOrgMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organisation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organisation Dialog */}
      <Dialog open={showEditOrgDialog} onOpenChange={setShowEditOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Organisation
            </DialogTitle>
            <DialogDescription>
              Update organisation details. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Organisation Name</Label>
              <Input
                id="edit-org-name"
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                data-testid="input-edit-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-email">Email</Label>
              <Input
                id="edit-org-email"
                type="email"
                value={editOrgEmail}
                onChange={(e) => setEditOrgEmail(e.target.value)}
                data-testid="input-edit-org-email"
              />
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label htmlFor="edit-org-disabled" className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-destructive" />
                  Disable Organisation
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Disabled organisations cannot log in or access their dashboard.
                </p>
              </div>
              <Switch
                id="edit-org-disabled"
                checked={editOrgDisabled}
                onCheckedChange={setEditOrgDisabled}
                data-testid="switch-edit-org-disabled"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditOrgDialog(false)}
              data-testid="button-cancel-edit-org"
            >
              Cancel
            </Button>
            <Button
              onClick={() => editOrgMutation.mutate()}
              disabled={!editOrgName || !editOrgEmail || editOrgMutation.isPending}
              data-testid="button-submit-edit-org"
            >
              {editOrgMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Features Management Dialog */}
      <Dialog open={showFeaturesDialog} onOpenChange={setShowFeaturesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Features</DialogTitle>
            <DialogDescription>
              Toggle features for {selectedUser?.name}. Changes are saved automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="feature-wellbeing-ai" className="font-medium">Wellbeing AI</Label>
                <p className="text-xs text-muted-foreground">Health Insight integration</p>
              </div>
              <Switch
                id="feature-wellbeing-ai"
                checked={userFeatures.featureWellbeingAi}
                onCheckedChange={(checked) => handleFeatureToggle("featureWellbeingAi", checked)}
                disabled={updateFeaturesMutation.isPending}
                data-testid="switch-wellbeing-ai"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="feature-shake-to-alert" className="font-medium">Shake to Alert</Label>
                <p className="text-xs text-muted-foreground">Emergency SOS via phone shake</p>
              </div>
              <Switch
                id="feature-shake-to-alert"
                checked={userFeatures.featureShakeToAlert}
                onCheckedChange={(checked) => handleFeatureToggle("featureShakeToAlert", checked)}
                disabled={updateFeaturesMutation.isPending}
                data-testid="switch-shake-to-alert"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="feature-wellness" className="font-medium">Wellness</Label>
                <p className="text-xs text-muted-foreground">Mood and wellbeing tracking</p>
              </div>
              <Switch
                id="feature-wellness"
                checked={userFeatures.featureWellness}
                onCheckedChange={(checked) => handleFeatureToggle("featureWellness", checked)}
                disabled={updateFeaturesMutation.isPending}
                data-testid="switch-wellness"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="feature-pet-protection" className="font-medium">Pet Protection</Label>
                <p className="text-xs text-muted-foreground">Pet care profiles and alerts</p>
              </div>
              <Switch
                id="feature-pet-protection"
                checked={userFeatures.featurePetProtection}
                onCheckedChange={(checked) => handleFeatureToggle("featurePetProtection", checked)}
                disabled={updateFeaturesMutation.isPending}
                data-testid="switch-pet-protection"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="feature-digital-will" className="font-medium">Documents</Label>
                <p className="text-xs text-muted-foreground">Important document storage (travel insurance, wills, etc.)</p>
              </div>
              <Switch
                id="feature-digital-will"
                checked={userFeatures.featureDigitalWill}
                onCheckedChange={(checked) => handleFeatureToggle("featureDigitalWill", checked)}
                disabled={updateFeaturesMutation.isPending}
                data-testid="switch-digital-will"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowFeaturesDialog(false)} data-testid="button-close-features">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={!!permanentDeleteUserId} onOpenChange={(open) => {
        if (!open) {
          setPermanentDeleteUserId(null);
          setPermanentDeleteConfirmText("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Permanently Delete User
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. The user account and all associated data (check-ins, contacts, emergency alerts, mood entries, documents, and settings) will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive">
                Type "DELETE" to confirm permanent deletion
              </p>
            </div>
            <Input
              placeholder="Type DELETE to confirm"
              value={permanentDeleteConfirmText}
              onChange={(e) => setPermanentDeleteConfirmText(e.target.value)}
              data-testid="input-permanent-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPermanentDeleteUserId(null);
                setPermanentDeleteConfirmText("");
              }}
              data-testid="button-cancel-permanent-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={permanentDeleteConfirmText !== "DELETE" || permanentDeleteMutation.isPending}
              onClick={() => {
                if (permanentDeleteUserId) {
                  permanentDeleteMutation.mutate(permanentDeleteUserId);
                }
              }}
              data-testid="button-confirm-permanent-delete"
            >
              {permanentDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Forever"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Archive All Users Dialog */}
      <Dialog open={showBulkArchiveDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBulkArchiveDialog(false);
          setBulkArchiveConfirmText("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Archive className="w-5 h-5" />
              Archive All Users
            </DialogTitle>
            <DialogDescription>
              This will archive all {users?.length || 0} active users. They can be restored individually later. No data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive">
                Type "ARCHIVE ALL" to confirm
              </p>
            </div>
            <Input
              placeholder='Type ARCHIVE ALL to confirm'
              value={bulkArchiveConfirmText}
              onChange={(e) => setBulkArchiveConfirmText(e.target.value)}
              data-testid="input-bulk-archive-confirm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkArchiveDialog(false);
                setBulkArchiveConfirmText("");
              }}
              data-testid="button-cancel-bulk-archive"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkArchiveConfirmText !== "ARCHIVE ALL" || bulkArchiveMutation.isPending}
              onClick={() => bulkArchiveMutation.mutate()}
              data-testid="button-confirm-bulk-archive"
            >
              {bulkArchiveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete All Archived Users Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBulkDeleteDialog(false);
          setBulkDeleteConfirmText("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete All Archived Users Forever
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. All {archivedUsers?.length || 0} archived users and their data (check-ins, contacts, alerts, documents, settings) will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive">
                Type "DELETE ALL" to confirm permanent deletion
              </p>
            </div>
            <Input
              placeholder='Type DELETE ALL to confirm'
              value={bulkDeleteConfirmText}
              onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
              data-testid="input-bulk-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDeleteDialog(false);
                setBulkDeleteConfirmText("");
              }}
              data-testid="button-cancel-bulk-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteConfirmText !== "DELETE ALL" || bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate()}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Forever"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
