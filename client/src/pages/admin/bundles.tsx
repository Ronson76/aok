import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Package, LogOut, ShieldCheck, Trash2, ArrowLeft, Plus, Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { OrganizationBundle, UserProfile } from "@shared/schema";

type BundleWithUser = OrganizationBundle & { userName: string };

export default function AdminBundles() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBundle, setNewBundle] = useState({
    userId: "",
    name: "",
    seatLimit: 10,
    expiresAt: "",
  });

  const { data: bundles, isLoading: bundlesLoading } = useQuery<BundleWithUser[]>({
    queryKey: ["/api/admin/bundles"],
  });

  const { data: users } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const organizationUsers = users?.filter(u => u.accountType === "organization") || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof newBundle) => {
      const response = await apiRequest("POST", "/api/admin/bundles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "Bundle created",
        description: "The subscription bundle has been created.",
      });
      setIsDialogOpen(false);
      setNewBundle({ userId: "", name: "", seatLimit: 10, expiresAt: "" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: error.message || "Could not create bundle",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/bundles/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "Bundle updated",
        description: "The bundle status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update bundle",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      await apiRequest("DELETE", `/api/admin/bundles/${bundleId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "Bundle deleted",
        description: "The bundle has been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message || "Could not delete bundle",
      });
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const handleCreateBundle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBundle.userId || !newBundle.name) {
      toast({
        variant: "destructive",
        title: "Invalid data",
        description: "Please fill in all required fields",
      });
      return;
    }
    if (newBundle.seatLimit < 1 || newBundle.seatLimit > 1000) {
      toast({
        variant: "destructive",
        title: "Invalid seat count",
        description: "Number of users must be between 1 and 1000",
      });
      return;
    }
    createMutation.mutate(newBundle);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isSuperAdmin = admin?.role === "super_admin";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "expired":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home-logo">
              <ArrowLeft className="h-5 w-5 text-green-600" />
              <ShieldCheck className="h-9 w-9 text-green-600" />
              <span className="text-2xl font-bold text-green-600">aok</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Bundle Management</h1>
              <p className="text-sm text-muted-foreground">Manage organisation subscriptions</p>
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
                variant="secondary" 
                onClick={() => setLocation("/admin/bundles")}
                data-testid="nav-bundles"
              >
                Bundles
              </Button>
            </nav>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {isSuperAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-bundle">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bundle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateBundle}>
                  <DialogHeader>
                    <DialogTitle>Create Subscription Bundle</DialogTitle>
                    <DialogDescription>
                      Allocate seats to an organisation for their monitored users.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organisation</Label>
                      <Select 
                        value={newBundle.userId} 
                        onValueChange={(value) => setNewBundle({ ...newBundle, userId: value })}
                      >
                        <SelectTrigger data-testid="select-organization">
                          <SelectValue placeholder="Select an organisation" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizationUsers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No organisation accounts found
                            </div>
                          ) : (
                            organizationUsers.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name} ({org.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bundleName">Bundle Name</Label>
                      <Input
                        id="bundleName"
                        placeholder="e.g., Enterprise Plan"
                        value={newBundle.name}
                        onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
                        data-testid="input-bundle-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seatLimit">Number of Users (1-1000)</Label>
                      <Input
                        id="seatLimit"
                        type="number"
                        min={1}
                        max={1000}
                        value={newBundle.seatLimit}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setNewBundle({ ...newBundle, seatLimit: Math.min(1000, Math.max(1, value)) });
                        }}
                        data-testid="input-seat-limit"
                      />
                      <p className="text-xs text-muted-foreground">Maximum 1000 users per bundle</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={newBundle.expiresAt}
                        onChange={(e) => setNewBundle({ ...newBundle, expiresAt: e.target.value })}
                        data-testid="input-expires-at"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-bundle">
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Bundle"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              All Bundles
            </CardTitle>
            <CardDescription>
              {bundles?.length || 0} subscription bundles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bundlesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : bundles && bundles.length > 0 ? (
              <div className="space-y-3">
                {bundles.map((bundle) => (
                  <div 
                    key={bundle.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`bundle-row-${bundle.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{bundle.name}</p>
                        <Badge variant={getStatusColor(bundle.status) as any}>
                          {bundle.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Organisation: {bundle.userName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>
                          Seats: <strong>{bundle.seatsUsed}</strong> / {bundle.seatLimit}
                        </span>
                        {bundle.expiresAt && (
                          <span className="text-muted-foreground">
                            Expires: {formatDate(bundle.expiresAt.toString())}
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (bundle.seatsUsed / bundle.seatLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-2 ml-4">
                        <Select 
                          value={bundle.status}
                          onValueChange={(status) => statusMutation.mutate({ id: bundle.id, status })}
                        >
                          <SelectTrigger className="w-28" data-testid={`select-status-${bundle.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-bundle-${bundle.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the bundle <strong>{bundle.name}</strong>? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteMutation.mutate(bundle.id)}
                                data-testid={`confirm-delete-bundle-${bundle.id}`}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No bundles created yet</p>
                {isSuperAdmin && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Bundle
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
