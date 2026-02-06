import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Users, ArrowLeft, Plus, Loader2, Send, XCircle, Clock, CheckCircle, Search, Phone, Mail, ShieldCheck, LogOut, UserPlus } from "lucide-react";
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
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

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

export default function OrgStaffHub() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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
      await logoutRef.current();
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

  const createInviteMutation = useMutation({
    mutationFn: async (data: { staffName: string; staffPhone: string; staffEmail?: string; bundleId: string }) => {
      const res = await apiRequest("POST", "/api/org/staff/invite", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      setShowInviteDialog(false);
      resetInviteForm();
      toast({
        title: "Invite sent",
        description: data.smsSent
          ? `SMS sent to ${staffPhone} with invite code.`
          : `Invite created but SMS delivery failed. You can resend it later.`,
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
      toast({ title: "Invite revoked" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await apiRequest("POST", `/api/org/staff/invite/${inviteId}/resend`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SMS resent", description: "The invite SMS has been resent." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetInviteForm = () => {
    setStaffName("");
    setStaffPhone("");
    setStaffEmail("");
    setSelectedBundleId("");
  };

  const handleCreateInvite = () => {
    if (!staffName.trim() || !staffPhone.trim() || !selectedBundleId) {
      toast({ title: "Missing fields", description: "Please fill in name, phone, and select a bundle.", variant: "destructive" });
      return;
    }
    createInviteMutation.mutate({
      staffName: staffName.trim(),
      staffPhone: staffPhone.trim(),
      staffEmail: staffEmail.trim() || undefined,
      bundleId: selectedBundleId,
    });
  };

  const filteredInvites = invites?.filter(invite => {
    const matchesSearch = !searchQuery || 
      invite.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.staffPhone.includes(searchQuery) ||
      invite.inviteCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === "all" || invite.status === activeTab;
    
    return matchesSearch && matchesTab;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "revoked":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            onClick={async () => {
              await logout();
              setLocation("/");
            }}
          >
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-staff-hub-logout">
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
              <h1 className="text-2xl font-bold" data-testid="text-staff-hub-title">Staff Hub</h1>
              <p className="text-muted-foreground">Invite and manage staff members</p>
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-invites">{stats?.totalInvites || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-invites">{stats?.pendingInvites || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-accepted-invites">{stats?.acceptedInvites || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seats Available</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-available-seats">{stats?.availableSeats || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.usedSeats || 0} of {stats?.totalSeats || 0} used
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Staff Invitations</CardTitle>
              <CardDescription>
                {invites && invites.length > 0
                  ? `${filteredInvites.length} of ${invites.length} invitations`
                  : "No staff invitations yet"}
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-staff"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                              {getStatusBadge(invite.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {invite.staffPhone}
                              </span>
                              {invite.staffEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {invite.staffEmail}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span>Code: <strong>{invite.inviteCode}</strong></span>
                              <span>Sent: {format(new Date(invite.createdAt), "dd/MM/yyyy HH:mm")}</span>
                              {invite.acceptedAt && (
                                <span>Accepted: {format(new Date(invite.acceptedAt), "dd/MM/yyyy HH:mm")}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {invite.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendMutation.mutate(invite.id)}
                                  disabled={resendMutation.isPending}
                                  data-testid={`button-resend-${invite.id}`}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Resend
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => revokeMutation.mutate(invite.id)}
                                  disabled={revokeMutation.isPending}
                                  data-testid={`button-revoke-${invite.id}`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Revoke
                                </Button>
                              </>
                            )}
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
      </div>

      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) resetInviteForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>
              Send an SMS invitation to a staff member. They will receive a link to register for aok at no cost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffName">Full Name *</Label>
              <Input
                id="staffName"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g. Jane Smith"
                data-testid="input-staff-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffPhone">Mobile Number *</Label>
              <Input
                id="staffPhone"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                placeholder="e.g. +447700900000"
                data-testid="input-staff-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email (optional)</Label>
              <Input
                id="staffEmail"
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="e.g. jane@example.com"
                data-testid="input-staff-email"
              />
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); resetInviteForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateInvite} 
              disabled={createInviteMutation.isPending}
              data-testid="button-send-invite"
            >
              {createInviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
