import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { orgMemberStorage, adminStorage } from "./storage";
import { z } from "zod";
import { OrgMemberRole, OrgMemberProfile } from "@shared/schema";
import { sendTeamMemberInviteEmail } from "./notifications";

const ORG_MEMBER_SESSION_COOKIE = "org_member_session";

declare global {
  namespace Express {
    interface Request {
      orgMember?: OrgMemberProfile;
      orgId?: string;
      orgRole?: OrgMemberRole | "owner";
    }
  }
}

export async function orgMemberAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[ORG_MEMBER_SESSION_COOKIE];
  
  if (!sessionId) {
    return res.status(401).json({ error: "Team member authentication required" });
  }

  const session = await orgMemberStorage.getMemberSession(sessionId);
  if (!session) {
    res.clearCookie(ORG_MEMBER_SESSION_COOKIE);
    return res.status(401).json({ error: "Session expired" });
  }

  const member = await orgMemberStorage.getMemberById(session.memberId);
  if (!member || member.status !== "active") {
    res.clearCookie(ORG_MEMBER_SESSION_COOKIE);
    return res.status(401).json({ error: "Account disabled or not found" });
  }

  const { passwordHash, ...profile } = member;
  req.orgMember = profile;
  req.orgId = member.organizationId;
  req.orgRole = member.role;
  next();
}

export function requireOrgRole(...allowedRoles: (OrgMemberRole | "owner")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.orgRole;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

const orgMemberPermissions: Record<string, (OrgMemberRole | "owner")[]> = {
  "dashboard:read": ["owner", "manager", "staff", "viewer"],
  "clients:read": ["owner", "manager", "staff", "viewer"],
  "clients:write": ["owner", "manager"],
  "clients:manage": ["owner", "manager"],
  "safeguarding:read": ["owner", "manager", "viewer"],
  "safeguarding:write": ["owner", "manager"],
  "reports:read": ["owner", "manager", "viewer"],
  "reports:export": ["owner", "manager"],
  "team:read": ["owner", "manager"],
  "team:manage": ["owner"],
  "billing:read": ["owner"],
  "billing:manage": ["owner"],
  "settings:read": ["owner", "manager"],
  "settings:manage": ["owner"],
  "staff_invites:read": ["owner", "manager"],
  "staff_invites:manage": ["owner", "manager"],
  "lone_worker:read": ["owner", "manager", "staff", "viewer"],
  "lone_worker:manage": ["owner", "manager"],
};

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.orgRole;
    const allowedRoles = orgMemberPermissions[permission];
    if (!role || !allowedRoles || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function registerOrgMemberRoutes(app: Express) {
  app.post("/api/org-member/login", async (req, res) => {
    try {
      const { email, password, organizationId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      let member;
      if (organizationId) {
        const m = await orgMemberStorage.getMemberByEmail(organizationId, email);
        if (m) member = m;
      } else {
        const results = await orgMemberStorage.getMembersByEmail(email);
        if (results.length === 1) {
          member = results[0];
        } else if (results.length > 1) {
          return res.status(400).json({ error: "Multiple organisations found. Please specify which organisation you belong to.", multipleOrgs: true });
        }
      }

      if (!member) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (member.status !== "active") {
        return res.status(403).json({ error: "Your account has been disabled. Please contact your organisation administrator." });
      }

      if (!member.passwordHash) {
        return res.status(401).json({ error: "Please set up your password first using the invite link sent to your email." });
      }

      const isMatch = await bcrypt.compare(password, member.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const session = await orgMemberStorage.createMemberSession(member.id);
      await orgMemberStorage.updateMemberLastLogin(member.id);

      res.cookie(ORG_MEMBER_SESSION_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 12 * 60 * 60 * 1000,
      });

      const { passwordHash, ...profile } = member;
      res.json({ member: profile });
    } catch (error) {
      console.error("[ORG_MEMBER] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/org-member/logout", async (req, res) => {
    const sessionId = req.cookies?.[ORG_MEMBER_SESSION_COOKIE];
    if (sessionId) {
      await orgMemberStorage.deleteMemberSession(sessionId);
    }
    res.clearCookie(ORG_MEMBER_SESSION_COOKIE);
    res.json({ success: true });
  });

  app.get("/api/org-member/me", orgMemberAuthMiddleware, async (req, res) => {
    const member = req.orgMember!;
    const permissions: Record<string, boolean> = {};
    for (const [perm, roles] of Object.entries(orgMemberPermissions)) {
      permissions[perm] = roles.includes(member.role);
    }
    res.json({ member, permissions });
  });

  app.get("/api/org-member/invite/:code", async (req, res) => {
    try {
      const invite = await orgMemberStorage.getInviteByCode(req.params.code);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      if (invite.status !== "pending") {
        return res.status(400).json({ error: `This invite has already been ${invite.status}` });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite has expired" });
      }
      res.json({ invite: { email: invite.email, name: invite.name, role: invite.role, organizationId: invite.organizationId } });
    } catch (error) {
      console.error("[ORG_MEMBER] Invite verify error:", error);
      res.status(500).json({ error: "Failed to verify invite" });
    }
  });

  app.post("/api/org-member/invite/:code/accept", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8 || !/^[a-zA-Z0-9]+$/.test(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters and contain only letters and numbers" });
      }

      const invite = await orgMemberStorage.getInviteByCode(req.params.code);
      if (!invite || invite.status !== "pending") {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite has expired" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      let member = await orgMemberStorage.getMemberByEmail(invite.organizationId, invite.email);
      if (member) {
        await orgMemberStorage.setMemberPassword(member.id, passwordHash);
      } else {
        member = await orgMemberStorage.createMember({
          organizationId: invite.organizationId,
          email: invite.email,
          name: invite.name,
          role: invite.role,
          passwordHash,
          status: "active",
        });
      }

      await orgMemberStorage.acceptInvite(invite.id);

      const session = await orgMemberStorage.createMemberSession(member.id);
      await orgMemberStorage.updateMemberLastLogin(member.id);

      res.cookie(ORG_MEMBER_SESSION_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 12 * 60 * 60 * 1000,
      });

      const { passwordHash: _, ...profile } = member;
      res.json({ member: { ...profile, status: "active" } });
    } catch (error) {
      console.error("[ORG_MEMBER] Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.get("/api/org-member/team", orgMemberAuthMiddleware, requirePermission("team:read"), async (req, res) => {
    try {
      const members = await orgMemberStorage.getMembersByOrganization(req.orgId!);
      const invites = await orgMemberStorage.getInvitesByOrganization(req.orgId!);
      res.json({ members, invites });
    } catch (error) {
      console.error("[ORG_MEMBER] Get team error:", error);
      res.status(500).json({ error: "Failed to get team members" });
    }
  });

  app.post("/api/org-member/team/invite", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(["manager", "staff", "viewer"]),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const existing = await orgMemberStorage.getMemberByEmail(req.orgId!, parsed.data.email);
      if (existing) {
        return res.status(400).json({ error: "A team member with this email already exists" });
      }

      const invite = await orgMemberStorage.createInvite({
        organizationId: req.orgId!,
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        invitedById: req.orgMember?.id || req.userId,
        invitedByType: req.orgMember ? "member" : "owner",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      try {
        await sendTeamMemberInviteEmail(parsed.data.email, parsed.data.name, invite.inviteCode);
      } catch (emailError) {
        console.error("[ORG_MEMBER] Failed to send invite email:", emailError);
      }

      res.json({ invite });
    } catch (error) {
      console.error("[ORG_MEMBER] Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.patch("/api/org-member/team/:memberId/role", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !["manager", "staff", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const member = await orgMemberStorage.getMemberById(req.params.memberId);
      if (!member || member.organizationId !== req.orgId) {
        return res.status(404).json({ error: "Member not found" });
      }

      const updated = await orgMemberStorage.updateMemberRole(req.params.memberId, role);
      res.json({ member: updated });
    } catch (error) {
      console.error("[ORG_MEMBER] Update role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.patch("/api/org-member/team/:memberId/status", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["active", "disabled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const member = await orgMemberStorage.getMemberById(req.params.memberId);
      if (!member || member.organizationId !== req.orgId) {
        return res.status(404).json({ error: "Member not found" });
      }

      const updated = await orgMemberStorage.updateMemberStatus(req.params.memberId, status);
      res.json({ member: updated });
    } catch (error) {
      console.error("[ORG_MEMBER] Update status error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/org-member/team/:memberId", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const member = await orgMemberStorage.getMemberById(req.params.memberId);
      if (!member || member.organizationId !== req.orgId) {
        return res.status(404).json({ error: "Member not found" });
      }

      await orgMemberStorage.deleteMember(req.params.memberId);
      res.json({ success: true });
    } catch (error) {
      console.error("[ORG_MEMBER] Delete member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.post("/api/org-member/team/invite/:inviteId/revoke", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const invite = await orgMemberStorage.updateInviteStatus(req.params.inviteId, "revoked");
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json({ invite });
    } catch (error) {
      console.error("[ORG_MEMBER] Revoke invite error:", error);
      res.status(500).json({ error: "Failed to revoke invite" });
    }
  });

  app.post("/api/org-member/team/invite/:inviteId/resend", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const invites = await orgMemberStorage.getInvitesByOrganization(req.orgId!);
      const invite = invites.find(i => i.id === req.params.inviteId);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      try {
        await sendTeamMemberInviteEmail(invite.email, invite.name, invite.inviteCode);
      } catch (emailError) {
        console.error("[ORG_MEMBER] Failed to resend invite email:", emailError);
        return res.status(500).json({ error: "Failed to send email" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[ORG_MEMBER] Resend invite error:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  app.get("/api/org-member/clients/:clientId/assignments", orgMemberAuthMiddleware, requirePermission("team:read"), async (req, res) => {
    try {
      const assignments = await orgMemberStorage.getMemberAssignmentsForClient(req.params.clientId);
      res.json(assignments);
    } catch (error) {
      console.error("[ORG_MEMBER] Get client assignments error:", error);
      res.status(500).json({ error: "Failed to get assignments" });
    }
  });

  app.post("/api/org-member/team/:memberId/assign-client", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const { clientId } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }

      const member = await orgMemberStorage.getMemberById(req.params.memberId);
      if (!member || member.organizationId !== req.orgId) {
        return res.status(404).json({ error: "Member not found" });
      }

      const assignment = await orgMemberStorage.assignClientToMember(req.params.memberId, clientId);
      res.json({ assignment });
    } catch (error) {
      console.error("[ORG_MEMBER] Assign client error:", error);
      res.status(500).json({ error: "Failed to assign client" });
    }
  });

  app.delete("/api/org-member/team/:memberId/assign-client/:clientId", orgMemberAuthMiddleware, requirePermission("team:manage"), async (req, res) => {
    try {
      const member = await orgMemberStorage.getMemberById(req.params.memberId);
      if (!member || member.organizationId !== req.orgId) {
        return res.status(404).json({ error: "Member not found" });
      }

      await orgMemberStorage.removeClientAssignment(req.params.memberId, req.params.clientId);
      res.json({ success: true });
    } catch (error) {
      console.error("[ORG_MEMBER] Remove client assignment error:", error);
      res.status(500).json({ error: "Failed to remove assignment" });
    }
  });

  app.get("/api/org-member/team/:memberId/assignments", orgMemberAuthMiddleware, requirePermission("team:read"), async (req, res) => {
    try {
      const assignments = await orgMemberStorage.getClientAssignments(req.params.memberId);
      res.json(assignments);
    } catch (error) {
      console.error("[ORG_MEMBER] Get member assignments error:", error);
      res.status(500).json({ error: "Failed to get assignments" });
    }
  });
}
