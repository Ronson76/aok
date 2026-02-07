import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, UserPlus, Loader2, Shield, ShieldCheck,
  MoreHorizontal, Send, XCircle, Trash2, UserCog, Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdmin } from "@/contexts/admin-context";
import { format, formatDistanceToNow } from "date-fns";

interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "analyst";
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminInvite {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "analyst";
  inviteCode: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface AdminTeamData {
  admins: AdminProfile[];
  invites: AdminInvite[];
}

type AdminRole = "super_admin" | "analyst";

function getRoleBadge(role: AdminRole) {
  switch (role) {
    case "super_admin":
      return <Badge className="bg-red-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid={`badge-role-${role}`}>Super Admin</Badge>;
    case "analyst":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid={`badge-role-${role}`}>Analyst</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
}

function getInviteStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-orange-500 text-white no-default-hover-elevate no-default-active-elevate" data-testid="badge-invite-pending">Pending</Badge>;
    case "accepted":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid="badge-invite-accepted">Accepted</Badge>;
    case "expired":
      return <Badge variant="secondary" data-testid="badge-invite-expired">Expired</Badge>;
    case "revoked":
      return <Badge variant="destructive" data-testid="badge-invite-revoked">Revoked</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminTeam() {
  const { toast } = useToast();
  const { admin } = useAdmin();
  const [, setLocation] = useLocation();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("admins");

  const { data: teamData, isLoading } = useQuery<AdminTeamData>({
    queryKey: ["/api/admin/team"],
  });

  const admins = teamData?.admins ?? [];
  const invites = teamData?.invites ?? [];

  const totalAdmins = admins.length;
  const superAdmins = admins.filter(a => a.role === "super_admin").length;
  const pendingInvites = invites.filter(i => i.status === "pending").length;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/team/invite", {
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      setShowInviteDialog(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("");
      toast({
        title: "Invitation sent",
        description: "The admin invitation has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ adminId, role }: { adminId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/team/${adminId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({
        title: "Role updated",
        description: "The admin's role has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      await apiRequest("DELETE", `/api/admin/team/${adminId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({
        title: "Admin removed",
        description: "The admin has been removed from the team.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove admin",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("POST", `/api/admin/team/invite/${inviteId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({
        title: "Invitation revoked",
        description: "The invitation has been revoked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to revoke invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("POST", `/api/admin/team/invite/${inviteId}/resend`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "The invitation email has been resent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="text-admin-team-title">
            <Users className="h-6 w-6" /> Admin Team
          </h2>
          <p className="text-muted-foreground">Manage your admin team members and invitations</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} data-testid="button-invite-admin">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Admin
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Admins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-admins">{totalAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-super-admins">{superAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-admin-pending-invites">{pendingInvites}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="admins" data-testid="tab-admins">
            Admins ({totalAdmins})
          </TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-admin-invitations">
            Invitations ({invites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-3 mt-4">
          {admins.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No admin team members yet</p>
                <p className="text-sm mt-1">Invite admins to help manage the platform.</p>
              </CardContent>
            </Card>
          ) : (
            admins.map((adminMember) => {
              const isSelf = admin?.id?.toString() === adminMember.id?.toString();
              return (
                <Card key={adminMember.id} data-testid={`card-admin-${adminMember.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <UserCog className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-admin-name-${adminMember.id}`}>
                            {adminMember.name}
                            {isSelf && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground truncate" data-testid={`text-admin-email-${adminMember.id}`}>{adminMember.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoleBadge(adminMember.role)}
                        {adminMember.lastLoginAt && (
                          <span className="text-xs text-muted-foreground hidden sm:inline" data-testid={`text-admin-last-login-${adminMember.id}`}>
                            Last login: {formatDistanceToNow(new Date(adminMember.lastLoginAt), { addSuffix: true })}
                          </span>
                        )}
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-admin-actions-${adminMember.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ adminId: adminMember.id, role: "super_admin" })}
                                disabled={adminMember.role === "super_admin"}
                                data-testid={`button-set-role-super-admin-${adminMember.id}`}
                              >
                                <Shield className="h-4 w-4 mr-2 text-red-600" />
                                Set as Super Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ adminId: adminMember.id, role: "analyst" })}
                                disabled={adminMember.role === "analyst"}
                                data-testid={`button-set-role-analyst-${adminMember.id}`}
                              >
                                <UserCog className="h-4 w-4 mr-2 text-blue-600" />
                                Set as Analyst
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => removeAdminMutation.mutate(adminMember.id)}
                                className="text-destructive"
                                data-testid={`button-remove-admin-${adminMember.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {adminMember.lastLoginAt && (
                      <p className="text-xs text-muted-foreground mt-2 sm:hidden" data-testid={`text-admin-last-login-mobile-${adminMember.id}`}>
                        Last login: {formatDistanceToNow(new Date(adminMember.lastLoginAt), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-3 mt-4">
          {invites.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No invitations</p>
                <p className="text-sm mt-1">Send invitations to add new admins to the team.</p>
              </CardContent>
            </Card>
          ) : (
            invites.map((invite) => (
              <Card key={invite.id} data-testid={`card-admin-invite-${invite.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate" data-testid={`text-admin-invite-name-${invite.id}`}>{invite.name}</p>
                        <p className="text-sm text-muted-foreground truncate" data-testid={`text-admin-invite-email-${invite.id}`}>{invite.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getRoleBadge(invite.role)}
                      {getInviteStatusBadge(invite.status)}
                      <span className="text-xs text-muted-foreground hidden sm:inline" data-testid={`text-admin-invite-date-${invite.id}`}>
                        Sent {format(new Date(invite.createdAt), "d MMM yyyy")}
                      </span>
                      {invite.status === "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-admin-invite-actions-${invite.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => resendInviteMutation.mutate(invite.id)}
                              data-testid={`button-resend-admin-invite-${invite.id}`}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => revokeInviteMutation.mutate(invite.id)}
                              className="text-destructive"
                              data-testid={`button-revoke-admin-invite-${invite.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Revoke Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 sm:hidden" data-testid={`text-admin-invite-date-mobile-${invite.id}`}>
                    Sent {format(new Date(invite.createdAt), "d MMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Admin</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new admin to the team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-invite-name">Name</Label>
              <Input
                id="admin-invite-name"
                placeholder="Enter admin's name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                data-testid="input-admin-invite-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-invite-email">Email</Label>
              <Input
                id="admin-invite-email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-admin-invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-admin-invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin" data-testid="select-role-super-admin">Super Admin</SelectItem>
                  <SelectItem value="analyst" data-testid="select-role-analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)} data-testid="button-cancel-admin-invite">
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteName.trim() || !inviteEmail.trim() || !inviteRole || inviteMutation.isPending}
              data-testid="button-send-admin-invite"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}