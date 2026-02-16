import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { OrgHelpButton } from "@/components/org-help-center";
import {
  Users, ArrowLeft, UserPlus, Loader2, Shield, ShieldCheck, LogOut,
  MoreHorizontal, Send, XCircle, Trash2, UserCog, Eye, Mail
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
import { useAuth } from "@/contexts/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import type { OrgMemberProfile, OrgMemberInvite, OrgMemberRole } from "@shared/schema";

interface TeamData {
  members: OrgMemberProfile[];
  invites: OrgMemberInvite[];
}

function getRoleBadge(role: OrgMemberRole) {
  switch (role) {
    case "owner":
      return <Badge className="bg-purple-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid={`badge-role-${role}`}>Owner</Badge>;
    case "manager":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid={`badge-role-${role}`}>Manager</Badge>;
    case "staff":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid={`badge-role-${role}`}>Staff</Badge>;
    case "viewer":
      return <Badge variant="secondary" data-testid={`badge-role-${role}`}>Viewer</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid="badge-status-active">Active</Badge>;
    case "disabled":
      return <Badge variant="destructive" data-testid="badge-status-disabled">Disabled</Badge>;
    case "pending":
      return <Badge className="bg-orange-500 text-white no-default-hover-elevate no-default-active-elevate" data-testid="badge-status-pending">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
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

export default function OrgTeam() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("members");

  const handleLogout = async () => {
    try {
      await fetch("/api/org-member/logout", { method: "POST", credentials: "include" });
    } catch (e) {}
    try {
      await logout();
    } catch (e) {}
    queryClient.clear();
    window.location.href = "/";
  };

  const { data: teamData, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/org/team"],
  });

  const members = teamData?.members ?? [];
  const invites = teamData?.invites ?? [];

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === "active").length;
  const pendingInvites = invites.filter(i => i.status === "pending").length;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/org/team/invite", {
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/team"] });
      setShowInviteDialog(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("");
      toast({
        title: "Invitation sent",
        description: "The team member invitation has been sent successfully.",
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
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      await apiRequest("PATCH", `/api/org/team/${memberId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/team"] });
      toast({
        title: "Role updated",
        description: "The team member's role has been updated.",
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: string }) => {
      await apiRequest("PATCH", `/api/org/team/${memberId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/team"] });
      toast({
        title: "Status updated",
        description: "The team member's status has been updated.",
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

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/org/team/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/team"] });
      toast({
        title: "Member removed",
        description: "The team member has been removed from the organisation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove member",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("POST", `/api/org/team/invite/${inviteId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/team"] });
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
      await apiRequest("POST", `/api/org/team/invite/${inviteId}/resend`);
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
      <div className="flex items-center justify-center h-screen">
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
            onClick={async () => { await logout(); setLocation("/"); }}
          >
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </div>
          <div className="flex items-center gap-2">
            <OrgHelpButton />
            <Button variant="outline" onClick={handleLogout} data-testid="button-team-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
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
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-team-title">
                <Users className="h-6 w-6" /> Team Management
              </h1>
              <p className="text-muted-foreground">Manage your organisation's team members and invitations</p>
            </div>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} data-testid="button-invite-member">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-members">{totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-members">{activeMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
              <Mail className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-invites">{pendingInvites}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="members" data-testid="tab-members">
              Members ({totalMembers})
            </TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-invitations">
              Invitations ({invites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-3 mt-4">
            {members.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No team members yet</p>
                  <p className="text-sm mt-1">Invite team members to help manage your organisation.</p>
                </CardContent>
              </Card>
            ) : (
              members.map((member) => (
                <Card key={member.id} data-testid={`card-member-${member.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <UserCog className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-member-name-${member.id}`}>{member.name}</p>
                          <p className="text-sm text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                        {member.lastLoginAt && (
                          <span className="text-xs text-muted-foreground hidden sm:inline" data-testid={`text-member-last-login-${member.id}`}>
                            Last login: {formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true })}
                          </span>
                        )}
                        {member.role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-member-actions-${member.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: "manager" })}
                                disabled={member.role === "manager"}
                                data-testid={`button-set-role-manager-${member.id}`}
                              >
                                <Shield className="h-4 w-4 mr-2 text-blue-600" />
                                Set as Manager
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: "staff" })}
                                disabled={member.role === "staff"}
                                data-testid={`button-set-role-staff-${member.id}`}
                              >
                                <UserCog className="h-4 w-4 mr-2 text-green-600" />
                                Set as Staff
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: "viewer" })}
                                disabled={member.role === "viewer"}
                                data-testid={`button-set-role-viewer-${member.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Set as Viewer
                              </DropdownMenuItem>
                              {member.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ memberId: member.id, status: "disabled" })}
                                  data-testid={`button-disable-member-${member.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                  Disable Member
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ memberId: member.id, status: "active" })}
                                  data-testid={`button-enable-member-${member.id}`}
                                >
                                  <Shield className="h-4 w-4 mr-2 text-green-600" />
                                  Enable Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => removeMemberMutation.mutate(member.id)}
                                className="text-destructive"
                                data-testid={`button-remove-member-${member.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {member.lastLoginAt && (
                      <p className="text-xs text-muted-foreground mt-2 sm:hidden" data-testid={`text-member-last-login-mobile-${member.id}`}>
                        Last login: {formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-3 mt-4">
            {invites.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No invitations</p>
                  <p className="text-sm mt-1">Send invitations to add team members to your organisation.</p>
                </CardContent>
              </Card>
            ) : (
              invites.map((invite) => (
                <Card key={invite.id} data-testid={`card-invite-${invite.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-invite-name-${invite.id}`}>{invite.name}</p>
                          <p className="text-sm text-muted-foreground truncate" data-testid={`text-invite-email-${invite.id}`}>{invite.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoleBadge(invite.role)}
                        {getInviteStatusBadge(invite.status)}
                        <span className="text-xs text-muted-foreground hidden sm:inline" data-testid={`text-invite-date-${invite.id}`}>
                          Sent {format(new Date(invite.createdAt), "d MMM yyyy")}
                        </span>
                        {invite.status === "pending" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-invite-actions-${invite.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => resendInviteMutation.mutate(invite.id)}
                                data-testid={`button-resend-invite-${invite.id}`}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Resend Invitation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => revokeInviteMutation.mutate(invite.id)}
                                className="text-destructive"
                                data-testid={`button-revoke-invite-${invite.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Revoke Invitation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 sm:hidden" data-testid={`text-invite-date-mobile-${invite.id}`}>
                      Sent {format(new Date(invite.createdAt), "d MMM yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new team member to your organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                placeholder="Enter team member's name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                data-testid="input-invite-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteName.trim() || !inviteEmail.trim() || !inviteRole || inviteMutation.isPending}
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
