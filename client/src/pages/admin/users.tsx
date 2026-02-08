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
  Users, LogOut, Shield, ShieldCheck, Trash2, ArrowLeft, Building2, User, Ban, CheckCircle, Plus, Loader2, Eye, EyeOff, Settings2, Search, RotateCcw, Archive
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, UserFeatureSettings } from "@shared/schema";
import { useState, useMemo } from "react";

export default function AdminUsers() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  
  // Search state
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [showOrgPassword, setShowOrgPassword] = useState(false);
  
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

  // Filter and sort users based on search terms
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = [...users];
    
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
      await apiRequest("POST", "/api/admin/organizations", {
        name: orgName,
        email: orgEmail,
        password: orgPassword,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setShowCreateOrgDialog(false);
      setOrgName("");
      setOrgEmail("");
      setOrgPassword("");
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
                  <Users className="w-5 h-5" />
                  All Users
                </CardTitle>
                <CardDescription>
                  {filteredUsers.length} of {users?.length || 0} registered users
                </CardDescription>
              </div>
              {isSuperAdmin && (
                <Button onClick={() => setShowCreateOrgDialog(true)} data-testid="button-create-org">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organisation
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={activeTab === "active" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setActiveTab("active")}
                data-testid="tab-active-users"
              >
                Active ({users?.length || 0})
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
                            {user.accountType === "organization" ? (
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
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
                          <Badge variant={user.accountType === "organization" ? "default" : "secondary"}>
                            {user.accountType}
                          </Badge>
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
                placeholder="admin@naiyacare.com"
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
                <Label htmlFor="feature-digital-will" className="font-medium">Digital Will</Label>
                <p className="text-xs text-muted-foreground">Secure document storage</p>
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
    </div>
  );
}
