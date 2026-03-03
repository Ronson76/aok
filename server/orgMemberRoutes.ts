import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { orgMemberStorage, adminStorage, storage, organizationStorage } from "./storage";
import { z } from "zod";
import { OrgMemberRole, OrgMemberProfile, homelessInteractions, organizationClients, organizationClientProfiles, registerOrgClientSchema } from "@shared/schema";
import { sendTeamMemberInviteEmail, sendAppInviteSMS } from "./notifications";
import { plantTreeForNewSubscriber } from "./ecologiService";
import { calculateAgeFromDOB, generateReferenceCode, parseScheduleTime } from "./organizationRoutes";
import { eq, and, desc, lt, sql, not } from "drizzle-orm";
import { ensureDb } from "./db";

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
  "data_capture:read": ["owner", "admin", "safeguarding_lead", "service_manager", "manager", "staff", "trustee", "viewer"],
  "data_capture:write": ["owner", "admin", "safeguarding_lead", "service_manager", "manager", "staff"],
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

      const orgUser = await storage.getUserById(member.organizationId);
      if (orgUser?.orgSubscriptionExpiresAt) {
        const expiresAt = new Date(orgUser.orgSubscriptionExpiresAt);
        const now = new Date();
        const daysSinceExpiry = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceExpiry > 7) {
          return res.status(403).json({ error: "Your organisation's subscription has expired. Please contact your organisation administrator." });
        }
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
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
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

  app.get("/api/org-member/interactions/clients-list", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const clients = await db.select({
        id: organizationClients.id,
        clientName: organizationClients.clientName,
        referenceCode: organizationClients.referenceCode,
        seatType: organizationClients.seatType,
        dateOfBirth: organizationClientProfiles.dateOfBirth,
      })
        .from(organizationClients)
        .leftJoin(organizationClientProfiles, eq(organizationClientProfiles.organizationClientId, organizationClients.id))
        .where(and(
          eq(organizationClients.organizationId, orgId),
          not(eq(organizationClients.status, "removed"))
        ))
        .orderBy(organizationClients.clientName);
      res.json({ clients });
    } catch (error) {
      console.error("[ORG_MEMBER] Data capture clients list error:", error);
      res.status(500).json({ error: "Failed to load clients" });
    }
  });

  app.post("/api/org-member/interactions/lookup", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const { clientName, dateOfBirth } = z.object({
        clientName: z.string().min(1),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).parse(req.body);

      const existingClients = await db.select({
        id: organizationClients.id,
        clientName: organizationClients.clientName,
        referenceCode: organizationClients.referenceCode,
        status: organizationClients.status,
        seatType: organizationClients.seatType,
      })
        .from(organizationClients)
        .innerJoin(organizationClientProfiles, eq(organizationClientProfiles.organizationClientId, organizationClients.id))
        .where(and(
          eq(organizationClients.organizationId, orgId),
          eq(organizationClientProfiles.dateOfBirth, dateOfBirth)
        ));

      const nameNorm = clientName.trim().toLowerCase();
      const matched = existingClients.find((c) => c.clientName?.trim().toLowerCase() === nameNorm);

      if (matched) {
        const [profile] = await db.select()
          .from(organizationClientProfiles)
          .where(eq(organizationClientProfiles.organizationClientId, matched.id))
          .limit(1);

        const interactions = await db.select({
          id: homelessInteractions.id,
          riskTier: homelessInteractions.riskTier,
          riskIndicators: homelessInteractions.riskIndicators,
          actionTaken: homelessInteractions.actionTaken,
          contactType: homelessInteractions.contactType,
          programme: homelessInteractions.programme,
          createdAt: homelessInteractions.createdAt,
          staffName: homelessInteractions.staffName,
          followUpRequired: homelessInteractions.followUpRequired,
          followUpDate: homelessInteractions.followUpDate,
          followUpCompleted: homelessInteractions.followUpCompleted,
        })
          .from(homelessInteractions)
          .where(and(
            eq(homelessInteractions.orgClientId, matched.id),
            eq(homelessInteractions.archived, false)
          ))
          .orderBy(desc(homelessInteractions.createdAt))
          .limit(10);

        return res.json({
          found: true,
          client: matched,
          profile: profile || null,
          recentInteractions: interactions,
        });
      }

      res.json({ found: false });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Name and date of birth are required" });
      }
      console.error("[ORG_MEMBER] Data capture lookup error:", error);
      res.status(500).json({ error: "Failed to look up client" });
    }
  });

  app.get("/api/org-member/interactions", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const clientId = req.query.clientId as string | undefined;

      let query = db.select({
        interaction: homelessInteractions,
        clientName: organizationClients.clientName,
        referenceCode: organizationClients.referenceCode,
      })
        .from(homelessInteractions)
        .innerJoin(organizationClients, eq(organizationClients.id, homelessInteractions.orgClientId))
        .where(and(
          eq(homelessInteractions.organizationId, orgId),
          eq(homelessInteractions.archived, false),
          ...(clientId ? [eq(homelessInteractions.orgClientId, clientId)] : [])
        ))
        .orderBy(desc(homelessInteractions.createdAt))
        .limit(limit);

      const interactions = await query;
      res.json({ interactions });
    } catch (error) {
      console.error("[ORG_MEMBER] Data capture list error:", error);
      res.status(500).json({ error: "Failed to load interactions" });
    }
  });

  app.get("/api/org-member/interactions/export", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;

      const interactions = await db.select({
        interaction: homelessInteractions,
        clientName: organizationClients.clientName,
        referenceCode: organizationClients.referenceCode,
      })
        .from(homelessInteractions)
        .innerJoin(organizationClients, eq(homelessInteractions.orgClientId, organizationClients.id))
        .where(and(
          eq(homelessInteractions.organizationId, orgId),
          eq(homelessInteractions.archived, false)
        ))
        .orderBy(desc(homelessInteractions.createdAt));

      const headers = [
        "Reference Code", "Client Name", "Staff Name", "Programme", "Contact Type",
        "Risk Tier", "Risk Indicators", "Action Taken", "Referral Agency",
        "No Action Rationale", "Escalation Triggered", "Follow-up Required",
        "Follow-up Date", "Follow-up Staff", "Follow-up Completed", "Follow-up Notes",
        "Latitude", "Longitude", "Notes", "Date"
      ];

      const escCsv = (val: any) => {
        if (val === null || val === undefined) return "";
        const s = String(val);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rows = interactions.map((row) => {
        const i = row.interaction;
        return [
          escCsv(row.referenceCode), escCsv(row.clientName), escCsv(i.staffName),
          escCsv(i.programme), escCsv(i.contactType), escCsv(i.riskTier),
          escCsv((i.riskIndicators || []).join("; ")), escCsv(i.actionTaken),
          escCsv(i.referralAgency), escCsv(i.noActionRationale),
          escCsv(i.escalationTriggered ? "Yes" : "No"),
          escCsv(i.followUpRequired ? "Yes" : "No"), escCsv(i.followUpDate),
          escCsv(i.followUpStaffName), escCsv(i.followUpCompleted ? "Yes" : "No"),
          escCsv(i.followUpNotes), escCsv(i.latitude), escCsv(i.longitude),
          escCsv(i.notes), escCsv(i.createdAt ? new Date(i.createdAt).toISOString() : ""),
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `data-capture-export-${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("[ORG_MEMBER] Export error:", error);
      res.status(500).json({ error: "Failed to export interactions" });
    }
  });

  app.post("/api/org-member/interactions/import", orgMemberAuthMiddleware, requirePermission("data_capture:write"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const { rows } = z.object({
        rows: z.array(z.object({
          referenceCode: z.string().min(1),
          staffName: z.string().min(1),
          programme: z.enum(["outreach", "hostel", "drop_in"]),
          contactType: z.enum(["outreach_visit", "shelter_checkin", "drop_in_meeting", "phone_contact", "multi_agency_discussion"]),
          riskTier: z.enum(["high", "medium", "low"]),
          riskIndicators: z.string().optional(),
          actionTaken: z.enum(["advice_provided", "referral_made", "emergency_accommodation", "dsl_informed", "safeguarding_referral", "no_action_required", "follow_up_planned"]),
          referralAgency: z.string().optional(),
          noActionRationale: z.string().optional(),
          followUpRequired: z.string().optional(),
          followUpDate: z.string().optional(),
          followUpStaffName: z.string().optional(),
          notes: z.string().optional(),
        }))
      }).parse(req.body);

      const results: Array<{ row: number; referenceCode: string; success: boolean; error?: string }> = [];

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        try {
          const [client] = await db.select({ id: organizationClients.id })
            .from(organizationClients)
            .where(and(
              eq(organizationClients.organizationId, orgId),
              eq(organizationClients.referenceCode, row.referenceCode),
              eq(organizationClients.status, "active")
            ))
            .limit(1);

          if (!client) {
            results.push({ row: idx + 1, referenceCode: row.referenceCode, success: false, error: "Client not found" });
            continue;
          }

          const indicators = row.riskIndicators
            ? row.riskIndicators.split(";").map((s: string) => s.trim()).filter(Boolean)
            : [];

          const followUp = row.followUpRequired?.toLowerCase() === "yes" || row.followUpRequired === "true";
          const isHighRisk = row.riskTier === "high";

          await db.insert(homelessInteractions).values({
            organizationId: orgId,
            orgClientId: client.id,
            staffName: row.staffName,
            programme: row.programme,
            contactType: row.contactType,
            riskTier: row.riskTier,
            riskIndicators: indicators,
            actionTaken: row.actionTaken,
            referralAgency: row.referralAgency || null,
            noActionRationale: row.noActionRationale || null,
            escalationTriggered: isHighRisk,
            followUpRequired: followUp,
            followUpDate: followUp && row.followUpDate ? row.followUpDate : null,
            followUpStaffName: followUp && row.followUpStaffName ? row.followUpStaffName : null,
            notes: row.notes || null,
            loggedByMemberId: req.memberId || null,
          });

          results.push({ row: idx + 1, referenceCode: row.referenceCode, success: true });
        } catch (err: any) {
          results.push({ row: idx + 1, referenceCode: row.referenceCode, success: false, error: err.message });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      console.log(`[ORG_MEMBER] Import: ${succeeded} succeeded, ${failed} failed`);
      res.json({ results, succeeded, failed });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid CSV data format", details: error.errors });
      }
      console.error("[ORG_MEMBER] Import error:", error);
      res.status(500).json({ error: "Failed to import interactions" });
    }
  });

  app.get("/api/org-member/interactions/stats", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(homelessInteractions)
        .where(and(eq(homelessInteractions.organizationId, orgId), eq(homelessInteractions.archived, false)));

      const [escalationResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(homelessInteractions)
        .where(and(eq(homelessInteractions.organizationId, orgId), eq(homelessInteractions.archived, false), eq(homelessInteractions.escalationTriggered, true)));

      const [overdueResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(homelessInteractions)
        .where(and(
          eq(homelessInteractions.organizationId, orgId),
          eq(homelessInteractions.archived, false),
          eq(homelessInteractions.followUpRequired, true),
          eq(homelessInteractions.followUpCompleted, false),
          lt(homelessInteractions.followUpDate, new Date().toISOString().split("T")[0])
        ));

      const [highRiskResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(homelessInteractions)
        .where(and(eq(homelessInteractions.organizationId, orgId), eq(homelessInteractions.archived, false), eq(homelessInteractions.riskTier, "high")));

      res.json({
        totalInteractions: totalResult?.count || 0,
        escalations: escalationResult?.count || 0,
        overdueFollowUps: overdueResult?.count || 0,
        highRiskInteractions: highRiskResult?.count || 0,
      });
    } catch (error) {
      console.error("[ORG_MEMBER] Data capture stats error:", error);
      res.status(500).json({ error: "Failed to load stats" });
    }
  });

  app.get("/api/org-member/interactions/overdue-followups", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const today = new Date().toISOString().split("T")[0];

      const overdue = await db.select({
        interaction: homelessInteractions,
        clientName: organizationClients.clientName,
        referenceCode: organizationClients.referenceCode,
      })
        .from(homelessInteractions)
        .innerJoin(organizationClients, eq(organizationClients.id, homelessInteractions.orgClientId))
        .where(and(
          eq(homelessInteractions.organizationId, orgId),
          eq(homelessInteractions.archived, false),
          eq(homelessInteractions.followUpRequired, true),
          eq(homelessInteractions.followUpCompleted, false),
          lt(homelessInteractions.followUpDate, today)
        ))
        .orderBy(homelessInteractions.followUpDate);

      res.json({ overdue });
    } catch (error) {
      console.error("[ORG_MEMBER] Overdue follow-ups error:", error);
      res.status(500).json({ error: "Failed to load overdue follow-ups" });
    }
  });

  app.get("/api/org-member/interactions/lost-contacts", orgMemberAuthMiddleware, requirePermission("data_capture:read"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;

      const result = await db.execute(sql`
        WITH latest_interactions AS (
          SELECT DISTINCT ON (org_client_id)
            org_client_id,
            risk_tier,
            created_at
          FROM homeless_interactions
          WHERE organization_id = ${orgId} AND archived = false
          ORDER BY org_client_id, created_at DESC
        )
        SELECT
          oc.id,
          oc.client_name AS "clientName",
          oc.reference_code AS "referenceCode",
          li.risk_tier AS "lastRiskTier",
          li.created_at AS "lastContactAt",
          EXTRACT(DAY FROM NOW() - li.created_at)::int AS "daysSinceContact",
          CASE li.risk_tier
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 7
            WHEN 'low' THEN 14
          END AS "expectedFrequencyDays"
        FROM organization_clients oc
        LEFT JOIN latest_interactions li ON li.org_client_id = oc.id
        WHERE oc.organization_id = ${orgId}
          AND oc.status NOT IN ('removed', 'paused')
          AND (
            li.created_at IS NULL
            OR (li.risk_tier = 'high' AND li.created_at < NOW() - INTERVAL '2 days')
            OR (li.risk_tier = 'medium' AND li.created_at < NOW() - INTERVAL '7 days')
            OR (li.risk_tier = 'low' AND li.created_at < NOW() - INTERVAL '14 days')
          )
        ORDER BY li.created_at ASC NULLS FIRST
      `);

      res.json({ lostContacts: result.rows || [] });
    } catch (error) {
      console.error("[ORG_MEMBER] Lost contacts error:", error);
      res.status(500).json({ error: "Failed to load lost contacts" });
    }
  });

  app.post("/api/org-member/interactions", orgMemberAuthMiddleware, requirePermission("data_capture:write"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const memberName = req.orgMember?.name || "Unknown";

      const body = z.object({
        orgClientId: z.string().min(1),
        staffName: z.string().min(1),
        programme: z.enum(["outreach", "hostel", "drop_in"]),
        contactType: z.enum(["outreach_visit", "shelter_checkin", "drop_in_meeting", "phone_contact", "multi_agency_discussion"]),
        riskTier: z.enum(["high", "medium", "low"]),
        riskIndicators: z.array(z.string()).default([]),
        actionTaken: z.enum(["advice_provided", "referral_made", "emergency_accommodation", "dsl_informed", "safeguarding_referral", "no_action_required", "follow_up_planned"]),
        referralAgency: z.string().optional(),
        noActionRationale: z.string().optional(),
        followUpRequired: z.boolean().default(false),
        followUpDate: z.string().optional(),
        followUpStaffName: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        notes: z.string().optional(),
      }).parse(req.body);

      const escalationTriggered = body.actionTaken === "safeguarding_referral" || body.actionTaken === "dsl_informed";

      const [interaction] = await db.insert(homelessInteractions).values({
        organizationId: orgId,
        orgClientId: body.orgClientId,
        staffName: body.staffName,
        loggedByMemberId: req.orgMember?.id || null,
        programme: body.programme,
        contactType: body.contactType,
        riskTier: body.riskTier,
        riskIndicators: body.riskIndicators,
        actionTaken: body.actionTaken,
        referralAgency: body.referralAgency || null,
        noActionRationale: body.noActionRationale || null,
        escalationTriggered,
        followUpRequired: body.followUpRequired,
        followUpDate: body.followUpDate || null,
        followUpStaffName: body.followUpStaffName || null,
        followUpCompleted: false,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        notes: body.notes || null,
      }).returning();

      console.log(`[DATA CAPTURE] Member "${memberName}" (${req.orgMember?.role}) logged interaction for client ${body.orgClientId}`);

      res.json({ interaction });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid interaction data" });
      }
      console.error("[ORG_MEMBER] Data capture submit error:", error);
      res.status(500).json({ error: "Failed to log interaction" });
    }
  });

  app.post("/api/org-member/interactions/:interactionId/complete-followup", orgMemberAuthMiddleware, requirePermission("data_capture:write"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const { interactionId } = req.params;
      const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);

      const [existing] = await db.select()
        .from(homelessInteractions)
        .where(and(eq(homelessInteractions.id, interactionId), eq(homelessInteractions.organizationId, orgId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Interaction not found" });
      }

      const [updated] = await db.update(homelessInteractions)
        .set({
          followUpCompleted: true,
          followUpCompletedAt: new Date(),
          followUpNotes: notes || null,
        })
        .where(eq(homelessInteractions.id, interactionId))
        .returning();

      res.json({ interaction: updated });
    } catch (error) {
      console.error("[ORG_MEMBER] Complete follow-up error:", error);
      res.status(500).json({ error: "Failed to complete follow-up" });
    }
  });

  app.post("/api/org-member/interactions/:interactionId/archive", orgMemberAuthMiddleware, requirePermission("data_capture:write"), async (req, res) => {
    try {
      const db = ensureDb();
      const orgId = req.orgId!;
      const { interactionId } = req.params;

      const [existing] = await db.select()
        .from(homelessInteractions)
        .where(and(eq(homelessInteractions.id, interactionId), eq(homelessInteractions.organizationId, orgId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Interaction not found" });
      }

      await db.update(homelessInteractions)
        .set({ archived: true })
        .where(eq(homelessInteractions.id, interactionId));

      res.json({ success: true });
    } catch (error) {
      console.error("[ORG_MEMBER] Archive interaction error:", error);
      res.status(500).json({ error: "Failed to archive interaction" });
    }
  });

  app.post("/api/org-member/clients/register", orgMemberAuthMiddleware, requirePermission("data_capture:write"), async (req, res) => {
    try {
      const parsed = registerOrgClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const orgId = req.orgId!;
      const { clientName, clientPhone, dateOfBirth, bundleId, scheduleStartTime, checkInIntervalHours, emergencyContacts, emergencyNotes, features, supervisorName, supervisorPhone, supervisorEmail } = parsed.data;

      const dobDate = new Date(dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }

      const age = calculateAgeFromDOB(dateOfBirth);
      const seatType = age >= 16 ? "check_in" : "safeguarding";

      if (seatType === "check_in" && (!clientPhone || clientPhone.length < 10)) {
        return res.status(400).json({ error: "Phone number is required for check-in clients (16+)" });
      }

      const org = await storage.getUserById(orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      let referenceCode = generateReferenceCode();
      let attempts = 0;
      while (await organizationStorage.getClientByReferenceCode(referenceCode) && attempts < 10) {
        referenceCode = generateReferenceCode();
        attempts++;
      }

      if (attempts >= 10) {
        return res.status(500).json({ error: "Failed to generate unique reference code" });
      }

      const orgClient = await organizationStorage.createPendingClient({
        organizationId: orgId,
        bundleId: bundleId || null,
        clientName,
        clientPhone: seatType === "check_in" ? clientPhone : null,
        referenceCode,
        seatType,
        scheduleStartTime: seatType === "check_in" && scheduleStartTime ? parseScheduleTime(scheduleStartTime) : null,
        checkInIntervalHours: seatType === "check_in" ? (checkInIntervalHours || 24) : null,
        supervisorName: supervisorName || null,
        supervisorPhone: supervisorPhone || null,
        supervisorEmail: supervisorEmail || null,
        emergencyNotes: emergencyNotes || null,
        features: features || {
          featureWellbeingAi: true,
          featureShakeToAlert: true,
          featureMoodTracking: true,
          featurePetProtection: true,
          featureDigitalWill: true,
        },
      });

      await organizationStorage.createOrUpdateClientProfile(orgClient.id, {
        organizationClientId: orgClient.id,
        dateOfBirth,
      });

      if (supervisorName && supervisorEmail) {
        await organizationStorage.addPendingClientContact(orgClient.id, {
          name: supervisorName,
          email: supervisorEmail,
          phone: supervisorPhone || undefined,
          phoneType: "mobile",
          relationship: "Supervisor",
          isPrimary: true,
        });
      }

      if (emergencyContacts && emergencyContacts.length > 0) {
        for (const contact of emergencyContacts) {
          await organizationStorage.addPendingClientContact(orgClient.id, {
            ...contact,
            isPrimary: false,
          });
        }
      }

      let smsSent = false;
      let smsError: string | undefined;

      if (seatType === "check_in" && clientPhone) {
        const smsResult = await sendAppInviteSMS(clientPhone, referenceCode, org.name, supervisorName);
        smsSent = smsResult.success;
        smsError = smsResult.error;

        if (smsResult.success) {
          await organizationStorage.updateClientRegistrationStatus(orgClient.id, "pending_registration");
        }

        plantTreeForNewSubscriber(clientPhone).catch(err => {
          console.error("[ECOLOGI] Failed to plant tree for new client:", err);
        });
      } else {
        await organizationStorage.updateClientRegistrationStatus(orgClient.id, "registered");
      }

      console.log(`[DATA CAPTURE] Member "${req.orgMember?.name}" (${req.orgMember?.role}) registered client "${clientName}" (${seatType} seat, ref: ${referenceCode})`);

      res.status(201).json({
        success: true,
        orgClientId: orgClient.id,
        orgClient: { id: orgClient.id, referenceCode },
        referenceCode,
        seatType,
        smsSent,
        smsError,
      });
    } catch (error: any) {
      console.error("[ORG_MEMBER] Client registration error:", error);
      res.status(500).json({ error: error.message || "Failed to register client" });
    }
  });
}
