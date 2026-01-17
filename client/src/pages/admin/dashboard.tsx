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
  LogOut, Shield, TrendingUp, Calendar, AlertOctagon, Eye, Pause, Play, Trash2, Mail, Phone, Plus, Loader2, Eye as EyeIcon, EyeOff
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { DashboardStats, AdminOrganizationView, AdminOrganizationClientView, OrgClientStatus } from "@shared/schema";

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
  
  // State for viewing organization clients
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizationView | null>(null);
  const [orgClients, setOrgClients] = useState<AdminOrganizationClientView[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  
  // State for creating organization
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgPassword, setNewOrgPassword] = useState("");
  const [showNewOrgPassword, setShowNewOrgPassword] = useState(false);
  
  const isSuperAdmin = admin?.role === "super_admin";

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
        description: "The client has been removed from the organization.",
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
  
  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
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
      toast({
        title: "Organization created",
        description: "The organization account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create organization",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
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
    });
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex flex-col items-center cursor-pointer" data-testid="link-home-logo">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">&copy; Ghuman</span>
              </div>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {admin?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{admin?.role}</Badge>
            <nav className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin")}
                data-testid="nav-dashboard"
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/users")}
                data-testid="nav-users"
              >
                Users
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/bundles")}
                data-testid="nav-bundles"
              >
                Bundles
              </Button>
            </nav>
            {isSuperAdmin && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowCreateOrgDialog(true)}
                data-testid="button-create-organization"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
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
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No users yet</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentUsers.slice(0, 5).map((user) => (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          data-testid={`recent-user-${user.id}`}
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.accountType === "organization" ? "default" : "secondary"}>
                              {user.accountType}
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
                <CardHeader>
                  <CardTitle>Daily Registrations</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    Recent Emergency Alerts
                  </CardTitle>
                  <CardDescription>Users who triggered emergency alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentEmergencyAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No emergency alerts</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentEmergencyAlerts.slice(0, 5).map((alert) => (
                        <div 
                          key={alert.id} 
                          className="flex items-start justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                          data-testid={`emergency-alert-${alert.id}`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{alert.userName}</p>
                            <p className="text-sm text-muted-foreground">{alert.userEmail}</p>
                            <p className="text-xs text-muted-foreground">
                              Notified: {alert.contactsNotified.join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="bg-red-500">Emergency</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(alert.timestamp), "MMM d, h:mm a")}
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
        
        {/* Organizations Section */}
        <h2 className="text-2xl font-semibold mb-6 mt-10">Organizations & Clients</h2>
        
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
            {organizations.map((org) => (
              <Card key={org.id} className={org.disabled ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      {org.name}
                      {org.disabled && <Badge variant="destructive">Disabled</Badge>}
                    </CardTitle>
                    <CardDescription>{org.email}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
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
              <p>No organizations registered yet</p>
            </CardContent>
          </Card>
        )}
        
        {/* Organization Clients Dialog */}
        <Dialog open={!!selectedOrg} onOpenChange={() => { setSelectedOrg(null); setOrgClients([]); }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedOrg?.name} - Clients
              </DialogTitle>
              <DialogDescription>
                Privacy-limited view showing ordinal number, email, and mobile only.
              </DialogDescription>
            </DialogHeader>
            
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : orgClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No clients in this organization</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orgClients.map((client) => (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${client.clientStatus !== "active" ? "opacity-60" : ""}`}
                    data-testid={`admin-client-${client.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-medium">
                        {client.clientOrdinal}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          User {client.clientOrdinal}
                          {getClientStatusBadge(client.clientStatus)}
                          {client.userDisabled && <Badge variant="destructive">Account Disabled</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </span>
                          {client.mobileNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.mobileNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                          <span>Added: {formatDistanceToNow(new Date(client.addedAt), { addSuffix: true })}</span>
                          {client.alertCounts.total > 0 && (
                            <span className="text-destructive">
                              {client.alertCounts.total} alert{client.alertCounts.total !== 1 ? "s" : ""} 
                              ({client.alertCounts.emergencies} emergency)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCheckInStatusBadge(client.status.status)}
                      
                      {admin?.role === "super_admin" && (
                        <>
                          {client.clientStatus === "active" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateClientStatusMutation.mutate({ 
                                organizationId: selectedOrg!.id, 
                                clientId: client.id, 
                                status: "paused" 
                              })}
                              disabled={updateClientStatusMutation.isPending}
                              title="Pause monitoring"
                            >
                              <Pause className="h-4 w-4 text-yellow-600" />
                            </Button>
                          ) : client.clientStatus === "paused" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateClientStatusMutation.mutate({ 
                                organizationId: selectedOrg!.id, 
                                clientId: client.id, 
                                status: "active" 
                              })}
                              disabled={updateClientStatusMutation.isPending}
                              title="Resume monitoring"
                            >
                              <Play className="h-4 w-4 text-primary" />
                            </Button>
                          ) : null}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeClientMutation.mutate({ 
                              organizationId: selectedOrg!.id, 
                              clientId: client.id 
                            })}
                            disabled={removeClientMutation.isPending}
                            title="Remove from organization"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        
        {/* Create Organization Dialog */}
        <Dialog open={showCreateOrgDialog} onOpenChange={setShowCreateOrgDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Create Organization
              </DialogTitle>
              <DialogDescription>
                Create a new organization account. Once created, you can assign bundles to it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
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
                  placeholder="e.g., admin@organization.com"
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
                    placeholder="Minimum 6 characters"
                    value={newOrgPassword}
                    onChange={(e) => setNewOrgPassword(e.target.value)}
                    className="pr-10"
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
                    Create Organization
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
