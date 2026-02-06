import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Users, ArrowLeft, Plus, Loader2, Send, XCircle, Clock, CheckCircle, Search, Phone, Mail, ShieldCheck, LogOut, UserPlus, Trash2, FileText, Download } from "lucide-react";
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

export default function OrgStaffHub() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffCountryCode, setStaffCountryCode] = useState("+44");
  const [staffEmail, setStaffEmail] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [mainTab, setMainTab] = useState("invites");

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

  const { data: auditTrail } = useQuery<AuditEntry[]>({
    queryKey: ["/api/org/staff/audit-trail"],
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
    mutationFn: async (data: { staffName: string; staffPhone: string; staffEmail: string; bundleId: string }) => {
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
    if (!selectedBundleId && !resendingInviteId) {
      toast({ title: "Missing fields", description: "Please select a bundle.", variant: "destructive" });
      return;
    }
    const fullPhone = formatFullPhone(staffCountryCode, staffPhone);
    if (resendingInviteId) {
      resendMutation.mutate({
        inviteId: resendingInviteId,
        staffName: staffName.trim(),
        staffPhone: fullPhone,
        staffEmail: staffEmail.trim(),
      });
    } else {
      createInviteMutation.mutate({
        staffName: staffName.trim(),
        staffPhone: fullPhone,
        staffEmail: staffEmail.trim(),
        bundleId: selectedBundleId,
      });
    }
  };

  const filteredInvites = invites?.filter(invite => {
    const matchesSearch = !searchQuery || 
      invite.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.staffPhone.includes(searchQuery) ||
      (invite.staffEmail && invite.staffEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
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

  const getAuditActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return <Badge variant="outline" className="text-xs capitalize"><Plus className="h-3 w-3 mr-1" />Created</Badge>;
      case "resent":
        return <Badge variant="outline" className="text-xs capitalize"><Send className="h-3 w-3 mr-1" />Resent</Badge>;
      case "revoked":
        return <Badge variant="outline" className="text-xs capitalize text-yellow-600 border-yellow-600"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      case "deleted":
        return <Badge variant="outline" className="text-xs capitalize text-red-600 border-red-600"><Trash2 className="h-3 w-3 mr-1" />Deleted</Badge>;
      default:
        return <Badge variant="outline" className="text-xs capitalize">{action}</Badge>;
    }
  };

  const isLoading = statsLoading || invitesLoading;
  const isMutating = createInviteMutation.isPending || resendMutation.isPending;

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

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="invites" data-testid="tab-invites">Invitations</TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-staff-audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="space-y-4">
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
                                      onClick={() => openResendDialog(invite)}
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive border-destructive/50"
                                  onClick={() => setShowDeleteConfirm(invite.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${invite.id}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
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

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Complete log of staff invitation actions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {auditTrail && auditTrail.length > 0 ? (
                  <div className="space-y-3">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg border flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getAuditActionBadge(entry.action)}
                            <span className="text-sm font-medium capitalize">{entry.entityType.replace(/_/g, " ")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            By: {entry.userEmail} ({entry.userRole})
                          </p>
                          {entry.newData && (
                            <p className="text-xs text-muted-foreground">
                              {entry.newData.staffName && <span>Name: {entry.newData.staffName}</span>}
                              {entry.newData.staffPhone && <span className="ml-3">Phone: {entry.newData.staffPhone}</span>}
                              {entry.newData.staffEmail && <span className="ml-3">Email: {entry.newData.staffEmail}</span>}
                            </p>
                          )}
                          {entry.previousData && !entry.newData && (
                            <p className="text-xs text-muted-foreground">
                              {entry.previousData.staffName && <span>Name: {entry.previousData.staffName}</span>}
                              {entry.previousData.staffPhone && <span className="ml-3">Phone: {entry.previousData.staffPhone}</span>}
                            </p>
                          )}
                          {entry.ipAddress && (
                            <p className="text-xs text-muted-foreground">IP: {entry.ipAddress}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                        </span>
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

      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) resetInviteForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resendingInviteId ? "Resend Invite" : "Invite Staff Member"}</DialogTitle>
            <DialogDescription>
              {resendingInviteId
                ? "Review and update details before resending the invite SMS."
                : "Send an SMS invitation to a staff member. They will go through the full onboarding process at no cost."}
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
              <Label htmlFor="staffEmail">Email *</Label>
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
                <Input
                  id="staffPhone"
                  type="tel"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="7700 900000"
                  className="flex-1"
                  data-testid="input-staff-phone"
                />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); resetInviteForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitInvite} 
              disabled={isMutating}
              data-testid="button-send-invite"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {resendingInviteId ? "Resend Invite" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this invitation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => { if (showDeleteConfirm) deleteMutation.mutate(showDeleteConfirm); }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
