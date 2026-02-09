import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { adminStorage, organizationStorage, storage, adminInviteStorage } from "./storage";
import { adminLoginSchema, AdminUserProfile, orgClientStatuses, updateUserFeaturesSchema, forgotPasswordSchema, resetPasswordSchema, adminRoles, passwordSchema, updateTierPermissionsSchema, subscriptionTiers, orgFeatureDefaultsSchema, SubscriptionTier } from "@shared/schema";
import { z } from "zod";
import { sendPasswordResetEmail, sendAdminInviteEmail, sendOrgSetupInviteEmail } from "./notifications";
import { randomBytes } from "crypto";
import { getAllServiceStatuses } from "./serviceResilience";

const ADMIN_SESSION_COOKIE = "admin_session";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminUserProfile;
    }
  }
}

async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[ADMIN_SESSION_COOKIE];
  
  if (!sessionId) {
    return res.status(401).json({ error: "Admin authentication required" });
  }

  const session = await adminStorage.getAdminSession(sessionId);
  if (!session) {
    res.clearCookie(ADMIN_SESSION_COOKIE);
    return res.status(401).json({ error: "Admin session expired" });
  }

  const admin = await adminStorage.getAdminById(session.adminId);
  if (!admin) {
    res.clearCookie(ADMIN_SESSION_COOKIE);
    return res.status(401).json({ error: "Admin not found" });
  }

  const { passwordHash, ...profile } = admin;
  req.admin = profile;
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin || req.admin.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }
  next();
}

export function registerAdminRoutes(app: Express) {
  // Check if admin exists (public endpoint for setup flow)
  app.get("/api/admin/status", async (req, res) => {
    try {
      const hasAdmin = await adminStorage.hasAnyAdmin();
      res.json({ hasAdmin });
    } catch (error) {
      console.error("Admin status check error:", error);
      res.status(500).json({ error: "Failed to check admin status" });
    }
  });

  // Admin login
  app.post("/api/admin/auth/login", async (req, res) => {
    try {
      const parsed = adminLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      }

      const { email, password } = parsed.data;
      const admin = await adminStorage.getAdminByEmail(email);
      
      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const session = await adminStorage.createAdminSession(admin.id);
      await adminStorage.updateAdminLastLogin(admin.id);

      res.cookie(ADMIN_SESSION_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
      });

      const { passwordHash, ...profile } = admin;
      await adminStorage.createAuditLog(admin.id, "login", "admin", admin.id, "Admin logged in");
      
      res.json({ admin: profile });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/auth/logout", adminAuthMiddleware, async (req, res) => {
    const sessionId = req.cookies?.[ADMIN_SESSION_COOKIE];
    if (sessionId) {
      await adminStorage.deleteAdminSession(sessionId);
      await adminStorage.createAuditLog(req.admin!.id, "logout", "admin", req.admin!.id, "Admin logged out");
    }
    res.clearCookie(ADMIN_SESSION_COOKIE);
    res.json({ success: true });
  });

  // Get current admin
  app.get("/api/admin/auth/me", adminAuthMiddleware, (req, res) => {
    res.json({ admin: req.admin });
  });

  // Dashboard stats
  app.get("/api/admin/dashboard/stats", adminAuthMiddleware, async (req, res) => {
    try {
      const stats = await adminStorage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Get archived users (must be before /api/admin/users/:id)
  app.get("/api/admin/users/archived", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const archivedUsers = await adminStorage.listArchivedUsers();
      const profiles = archivedUsers.map(({ passwordHash, ...profile }: any) => profile);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching archived users:", error);
      res.status(500).json({ error: "Failed to fetch archived users" });
    }
  });

  // Get all users (basic)
  app.get("/api/admin/users", adminAuthMiddleware, async (req, res) => {
    try {
      const users = await adminStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all users with organization info (for reports)
  app.get("/api/admin/users/all", adminAuthMiddleware, async (req, res) => {
    try {
      const users = await adminStorage.getAllUsersWithOrgInfo();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all emergency alerts (for reports)
  app.get("/api/admin/emergency-alerts", adminAuthMiddleware, async (req, res) => {
    try {
      const alerts = await adminStorage.getAllEmergencyAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching emergency alerts:", error);
      res.status(500).json({ error: "Failed to fetch emergency alerts" });
    }
  });

  // Get all missed check-ins (for reports)
  app.get("/api/admin/missed-checkins", adminAuthMiddleware, async (req, res) => {
    try {
      const missedCheckIns = await adminStorage.getAllMissedCheckIns();
      res.json(missedCheckIns);
    } catch (error) {
      console.error("Error fetching missed check-ins:", error);
      res.status(500).json({ error: "Failed to fetch missed check-ins" });
    }
  });

  // Get all registrations (for reports)
  app.get("/api/admin/registrations", adminAuthMiddleware, async (req, res) => {
    try {
      const registrations = await adminStorage.getAllRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  });

  // Create organization (super admin only)
  const createOrganizationSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    featureDefaults: orgFeatureDefaultsSchema.optional(),
    requiredDocuments: z.array(z.string()).optional(),
  });

  app.post("/api/admin/organizations", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const validation = createOrganizationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { name, email, featureDefaults, requiredDocuments } = validation.data;

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      const tempPassword = randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        accountType: "organization",
        name,
      });

      if (featureDefaults) {
        await storage.updateOrgFeatureDefaults(user.id, featureDefaults);
      }

      if (requiredDocuments && requiredDocuments.length > 0) {
        await storage.assignDocumentsToOrg(user.id, name, requiredDocuments);
      }

      const inviteToken = await storage.createPasswordResetToken(user.id);

      sendOrgSetupInviteEmail(email.toLowerCase(), name, inviteToken).catch(err => {
        console.error(`[ORG INVITE] Background email send failed for ${email}:`, err);
      });

      await adminStorage.createAuditLog(
        req.admin!.id,
        "create",
        "organization",
        user.id,
        `Created organization: ${name} (${email})${requiredDocuments?.length ? ` with ${requiredDocuments.length} required documents` : ""} - setup invite sent`
      );

      const { passwordHash: _, ...profile } = user;
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  // Restore archived user (super admin only)
  app.post("/api/admin/users/:id/restore", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const success = await adminStorage.restoreUser(req.params.id);
      if (!success) {
        return res.status(400).json({ error: "Cannot restore user. The email may already be in use by another account." });
      }
      await adminStorage.createAuditLog(req.admin!.id, "restore", "user", req.params.id, "Restored archived user");
      res.json({ success: true });
    } catch (error) {
      console.error("Error restoring user:", error);
      res.status(500).json({ error: "Failed to restore user" });
    }
  });

  // Archive user (super admin only)
  app.delete("/api/admin/users/:id", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const archived = await adminStorage.archiveUser(id, req.admin!.id);
      
      if (!archived) {
        return res.status(404).json({ error: "User not found" });
      }

      await adminStorage.createAuditLog(req.admin!.id, "archive", "user", id, `Archived user ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({ error: "Failed to archive user" });
    }
  });

  // Toggle user disabled status (super admin only)
  app.patch("/api/admin/users/:id/disabled", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { disabled } = req.body;

      if (typeof disabled !== "boolean") {
        return res.status(400).json({ error: "disabled must be a boolean" });
      }

      const user = await adminStorage.setUserDisabled(id, disabled);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        disabled ? "disable" : "enable",
        "user",
        id,
        `${disabled ? "Disabled" : "Enabled"} user ${user.email}`
      );

      res.json(user);
    } catch (error) {
      console.error("Error updating user disabled status:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Get all bundles
  app.get("/api/admin/bundles", adminAuthMiddleware, async (req, res) => {
    try {
      const bundles = await adminStorage.getAllBundles();
      res.json(bundles);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ error: "Failed to fetch bundles" });
    }
  });

  // Create bundle (super admin only)
  app.post("/api/admin/bundles", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { userId, name, seatLimit, expiresAt } = req.body;

      if (!userId || !name || !seatLimit) {
        return res.status(400).json({ error: "userId, name, and seatLimit are required" });
      }

      if (seatLimit < 1 || seatLimit > 1000) {
        return res.status(400).json({ error: "seatLimit must be between 1 and 1000" });
      }

      const bundle = await adminStorage.createBundle(
        userId,
        name,
        seatLimit,
        req.admin!.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      await adminStorage.createAuditLog(
        req.admin!.id,
        "create",
        "bundle",
        bundle.id,
        `Created bundle "${name}" with ${seatLimit} seats for user ${userId}`
      );

      res.status(201).json(bundle);
    } catch (error) {
      console.error("Error creating bundle:", error);
      res.status(500).json({ error: "Failed to create bundle" });
    }
  });

  // Update bundle status (super admin only)
  app.patch("/api/admin/bundles/:id/status", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "expired", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const bundle = await adminStorage.updateBundleStatus(id, status);
      
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "bundle",
        id,
        `Updated bundle status to ${status}`
      );

      res.json(bundle);
    } catch (error) {
      console.error("Error updating bundle:", error);
      res.status(500).json({ error: "Failed to update bundle" });
    }
  });

  // Delete bundle (super admin only)
  app.delete("/api/admin/bundles/:id", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await adminStorage.deleteBundle(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Bundle not found" });
      }

      await adminStorage.createAuditLog(req.admin!.id, "delete", "bundle", id, `Deleted bundle ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bundle:", error);
      res.status(500).json({ error: "Failed to delete bundle" });
    }
  });

  // Get audit logs (super admin only)
  app.get("/api/admin/audit-logs", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await adminStorage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Create initial admin (only works if no admins exist)
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "email, password, and name are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const existingAdmin = await adminStorage.getAdminByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ error: "Admin already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const admin = await adminStorage.createAdminUser({
        email,
        passwordHash,
        name,
        role: "super_admin",
      });

      const { passwordHash: _, ...profile } = admin;
      res.status(201).json({ admin: profile });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ error: "Failed to create admin" });
    }
  });

  // Get all organizations with client summaries (privacy-conscious view)
  app.get("/api/admin/organizations", adminAuthMiddleware, async (req, res) => {
    try {
      const organizations = await organizationStorage.getOrganizationsWithClientSummary();
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  // Get organization clients with privacy-limited details (ordinal, email, mobile only)
  app.get("/api/admin/organizations/:organizationId/clients", adminAuthMiddleware, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const clients = await organizationStorage.getOrganizationClientsForAdmin(organizationId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching organization clients:", error);
      res.status(500).json({ error: "Failed to fetch organization clients" });
    }
  });

  // Update organization client status (super admin only)
  const updateClientStatusSchema = z.object({
    status: z.enum(orgClientStatuses),
  });

  app.patch("/api/admin/organizations/:organizationId/clients/:clientId/status", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      const parsed = updateClientStatusSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid status" });
      }

      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      const updated = await organizationStorage.updateClientStatus(clientId, parsed.data.status);
      
      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization_client",
        clientId,
        `Updated client status to ${parsed.data.status} in organization ${organizationId}`
      );

      res.json(updated);
    } catch (error) {
      console.error("Error updating client status:", error);
      res.status(500).json({ error: "Failed to update client status" });
    }
  });

  // Remove client from organization (super admin only)
  app.delete("/api/admin/organizations/:organizationId/clients/:clientId", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      const success = await organizationStorage.archiveClient(organizationId, orgClient.clientId || clientId, req.admin!.id);
      
      if (!success) {
        return res.status(404).json({ error: "Failed to remove client" });
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        "archive",
        "organization_client",
        clientId,
        `Archived client from organization ${organizationId}`
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing client:", error);
      res.status(500).json({ error: "Failed to remove client" });
    }
  });

  // Deactivate client's active emergency alert (super admin only)
  app.post("/api/admin/organizations/:organizationId/clients/:clientId/deactivate-alert", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      if (!orgClient.clientId) {
        return res.status(400).json({ error: "Client has not activated their account yet" });
      }

      // Deactivate the emergency alert
      const deactivated = await storage.deactivateEmergencyAlertByUserId(orgClient.clientId);
      
      if (!deactivated) {
        return res.status(404).json({ error: "No active emergency alert found" });
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "emergency_alert",
        clientId,
        `Deactivated emergency alert for client in organization ${organizationId}`
      );

      res.json({ success: true, message: "Emergency alert deactivated" });
    } catch (error) {
      console.error("Error deactivating alert:", error);
      res.status(500).json({ error: "Failed to deactivate alert" });
    }
  });

  // Get client schedule (super admin only)
  app.get("/api/admin/organizations/:organizationId/clients/:clientId/schedule", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      res.json({
        scheduleStartTime: orgClient.scheduleStartTime,
        checkInIntervalHours: orgClient.checkInIntervalHours || 24,
      });
    } catch (error) {
      console.error("Error fetching client schedule:", error);
      res.status(500).json({ error: "Failed to fetch client schedule" });
    }
  });

  // Update client schedule (super admin only)
  app.patch("/api/admin/organizations/:organizationId/clients/:clientId/schedule", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      const { scheduleStartTime, checkInIntervalHours } = req.body;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      // Validate interval
      const interval = parseInt(checkInIntervalHours);
      if (isNaN(interval) || interval < 1 || interval > 48) {
        return res.status(400).json({ error: "Check-in interval must be between 1 and 48 hours" });
      }

      // Parse the schedule start time
      let startTime: Date;
      if (scheduleStartTime) {
        const [hours, minutes] = scheduleStartTime.split(':').map(Number);
        startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
      } else {
        startTime = new Date();
        startTime.setHours(9, 0, 0, 0);
      }

      // Update the schedule on the org client record
      const updated = await organizationStorage.updateClientSchedule(clientId, startTime, interval);

      // If the client has an activated user account, update their settings too
      if (orgClient.clientId) {
        const nextDue = new Date(startTime.getTime() + interval * 60 * 60 * 1000);
        await storage.updateSettings(orgClient.clientId, {
          intervalHours: interval,
          scheduleStartTime: startTime.toISOString(),
          nextCheckInDue: nextDue.toISOString(),
        });
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "client_schedule",
        clientId,
        `Updated schedule for client in organization ${organizationId}: interval=${interval}h, start=${scheduleStartTime}`
      );

      res.json({ success: true, schedule: updated });
    } catch (error) {
      console.error("Error updating client schedule:", error);
      res.status(500).json({ error: "Failed to update client schedule" });
    }
  });

  // Reset client's app and check-in time (super admin only)
  app.post("/api/admin/organizations/:organizationId/clients/:clientId/reset", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      // Only reset if the client has an activated user account
      if (!orgClient.clientId) {
        return res.status(400).json({ error: "Client has not activated their account yet" });
      }

      // Reset the user's check-in data by updating their settings
      const now = new Date();
      const intervalHours = orgClient.checkInIntervalHours || 24;
      const nextDue = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
      
      await storage.updateSettings(orgClient.clientId, {
        nextCheckInDue: nextDue.toISOString(),
      });

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization_client",
        clientId,
        `Reset client app and check-in time in organization ${organizationId}`
      );

      res.json({ success: true, message: "Client reset successfully" });
    } catch (error) {
      console.error("Error resetting client:", error);
      res.status(500).json({ error: "Failed to reset client" });
    }
  });

  // Update client feature toggles (super admin only)
  app.patch("/api/admin/organizations/:organizationId/clients/:clientId/features", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      const { featureWellbeingAi, featureShakeToAlert, featureMoodTracking, featurePetProtection, featureDigitalWill } = req.body;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      // Update the org client feature toggles
      await organizationStorage.updateClientFeatures(clientId, {
        featureWellbeingAi,
        featureShakeToAlert,
        featureMoodTracking,
        featurePetProtection,
        featureDigitalWill,
      });

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization_client",
        clientId,
        `Updated feature toggles for client in organization ${organizationId}`
      );

      res.json({ success: true, message: "Client features updated" });
    } catch (error) {
      console.error("Error updating client features:", error);
      res.status(500).json({ error: "Failed to update client features" });
    }
  });

  // Send reminder with reference number (super admin only)
  app.post("/api/admin/organizations/:organizationId/clients/:clientId/send-reminder", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, clientId } = req.params;
      
      // Get the org client to verify it belongs to this organization
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== organizationId) {
        return res.status(404).json({ error: "Client not found in this organization" });
      }

      if (!orgClient.clientPhone) {
        return res.status(400).json({ error: "Client has no phone number" });
      }

      // Get organization name from the users table
      const orgUser = await storage.getUserById(organizationId);
      const orgName = orgUser?.name || "Your organisation";

      // Send SMS with reference number using notifications module
      const { sendReferenceCodeSMS } = await import("./notifications");
      await sendReferenceCodeSMS(orgClient.clientPhone, orgClient.referenceCode, orgName);

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization_client",
        clientId,
        `Sent reference number reminder to client phone`
      );

      res.json({ success: true, message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });

  // ==================== USER FEATURE CONTROLS ====================

  // Update user feature settings
  app.patch("/api/admin/users/:userId/features", adminAuthMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const parsed = updateUserFeaturesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      }

      const user = await storage.updateUserFeatures(userId, parsed.data);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "user_features",
        userId,
        `Updated user features: ${JSON.stringify(parsed.data)}`
      );

      res.json(user);
    } catch (error) {
      console.error("Error updating user features:", error);
      res.status(500).json({ error: "Failed to update user features" });
    }
  });

  // Get user feature settings
  app.get("/api/admin/users/:userId/features", adminAuthMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        featureWellbeingAi: user.featureWellbeingAi,
        featureShakeToAlert: user.featureShakeToAlert,
        featureWellness: user.featureWellness,
        featurePetProtection: user.featurePetProtection,
        featureDigitalWill: user.featureDigitalWill,
      });
    } catch (error) {
      console.error("Error fetching user features:", error);
      res.status(500).json({ error: "Failed to fetch user features" });
    }
  });

  app.post("/api/admin/organizations/:organizationId/resend-invite", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const org = await storage.getUserById(organizationId);
      if (!org || org.accountType !== "organization") {
        return res.status(404).json({ error: "Organisation not found" });
      }

      const inviteToken = await storage.createPasswordResetToken(org.id);
      
      sendOrgSetupInviteEmail(org.email, org.name || org.email, inviteToken).catch(err => {
        console.error(`[ORG INVITE] Background resend failed for ${org.email}:`, err);
      });

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization",
        organizationId,
        `Resent setup invitation to ${org.name || org.email} (${org.email})`
      );

      res.json({ success: true, message: "Setup invitation has been resent" });
    } catch (error) {
      console.error("Error resending org invite:", error);
      res.status(500).json({ error: "Failed to resend invitation" });
    }
  });

  // Reset organisation password (super admin only)
  const resetOrgPasswordSchema = z.object({
    newPassword: passwordSchema,
  });

  app.post("/api/admin/organizations/:organizationId/reset-password", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const parsed = resetOrgPasswordSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid password" });
      }

      // Get the organization
      const org = await storage.getUserById(organizationId);
      if (!org || org.accountType !== "organization") {
        return res.status(404).json({ error: "Organisation not found" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
      
      // Update the password
      await storage.updateUserPassword(organizationId, passwordHash);

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization",
        organizationId,
        `Reset password for organisation ${org.name || org.email}`
      );

      res.json({ success: true, message: "Organisation password has been reset" });
    } catch (error) {
      console.error("Error resetting organisation password:", error);
      res.status(500).json({ error: "Failed to reset organisation password" });
    }
  });

  // Admin forgot password (public)
  app.post("/api/admin/auth/forgot-password", async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid email" });
      }

      const { email } = parsed.data;
      const admin = await adminStorage.getAdminByEmail(email.toLowerCase());

      if (admin) {
        const rawToken = await adminStorage.createAdminPasswordResetToken(admin.id);
        
        // Use production domain directly when in production, otherwise use request headers
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        
        const resetUrl = `${baseUrl}/admin/reset-password?token=${rawToken}`;
        
        try {
          await sendPasswordResetEmail(admin.email, resetUrl, admin.name, 'admin');
        } catch (error) {
          console.error("Failed to send admin password reset email:", error);
          if (process.env.NODE_ENV !== "production") {
            console.log(`[DEV] Admin password reset link for ${email}: ${resetUrl}`);
          }
        }
      }

      res.json({ success: true, message: "If an admin account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Admin forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Admin reset password (public)
  app.post("/api/admin/auth/reset-password", async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { token, password } = parsed.data;

      const tokenData = await adminStorage.validateAdminPasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await adminStorage.updateAdminPassword(tokenData.adminId, passwordHash);
      await adminStorage.markAdminPasswordResetTokenUsed(tokenData.tokenId);
      await adminStorage.deleteAllAdminSessions(tokenData.adminId);

      res.json({ success: true, message: "Password reset successfully. Please log in with your new password." });
    } catch (error) {
      console.error("Admin reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Admin change password (authenticated)
  app.post("/api/admin/auth/change-password", adminAuthMiddleware, async (req, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { currentPassword, newPassword } = parsed.data;
      const adminId = req.admin?.id;

      if (!adminId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const admin = await adminStorage.getAdminById(adminId);
      if (!admin) {
        return res.status(400).json({ error: "Admin not found" });
      }

      const validPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!validPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await adminStorage.updateAdminPassword(adminId, passwordHash);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Admin change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // ===== ADMIN TEAM MANAGEMENT (IAM) =====

  app.get("/api/admin/team", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const admins = await adminInviteStorage.getAllAdmins();
      const invites = await adminInviteStorage.getAllInvites();
      res.json({ admins, invites });
    } catch (error) {
      console.error("[ADMIN_TEAM] Get team error:", error);
      res.status(500).json({ error: "Failed to get admin team" });
    }
  });

  app.post("/api/admin/team/invite", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(adminRoles),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const existing = await adminStorage.getAdminByEmail(parsed.data.email);
      if (existing) {
        return res.status(400).json({ error: "An admin with this email already exists" });
      }

      const invite = await adminInviteStorage.createInvite({
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        invitedById: req.admin!.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      try {
        await sendAdminInviteEmail(parsed.data.email, parsed.data.name, invite.inviteCode);
      } catch (emailError) {
        console.error("[ADMIN_TEAM] Failed to send invite email:", emailError);
      }

      await adminStorage.createAuditLog(req.admin!.id, "invite", "admin", invite.id, `Invited ${parsed.data.email} as ${parsed.data.role}`);
      res.json({ invite });
    } catch (error) {
      console.error("[ADMIN_TEAM] Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/admin/invite/:code", async (req, res) => {
    try {
      const invite = await adminInviteStorage.getInviteByCode(req.params.code);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      if (invite.status !== "pending") {
        return res.status(400).json({ error: `This invite has already been ${invite.status}` });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite has expired" });
      }
      res.json({ invite: { email: invite.email, name: invite.name, role: invite.role } });
    } catch (error) {
      console.error("[ADMIN_TEAM] Verify invite error:", error);
      res.status(500).json({ error: "Failed to verify invite" });
    }
  });

  app.post("/api/admin/invite/:code/accept", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const invite = await adminInviteStorage.getInviteByCode(req.params.code);
      if (!invite || invite.status !== "pending") {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite has expired" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const admin = await adminStorage.createAdminUser({
        email: invite.email,
        passwordHash,
        name: invite.name,
        role: invite.role,
      });

      await adminInviteStorage.acceptInvite(invite.id);

      const session = await adminStorage.createAdminSession(admin.id);
      await adminStorage.updateAdminLastLogin(admin.id);

      res.cookie(ADMIN_SESSION_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 12 * 60 * 60 * 1000,
      });

      const { passwordHash: _, ...profile } = admin;
      res.json({ admin: profile });
    } catch (error) {
      console.error("[ADMIN_TEAM] Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.patch("/api/admin/team/:adminId/role", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !adminRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (req.params.adminId === req.admin!.id) {
        return res.status(400).json({ error: "You cannot change your own role" });
      }
      const updated = await adminInviteStorage.updateAdminRole(req.params.adminId, role);
      if (!updated) {
        return res.status(404).json({ error: "Admin not found" });
      }
      await adminStorage.createAuditLog(req.admin!.id, "update_role", "admin", req.params.adminId, `Changed role to ${role}`);
      res.json({ admin: updated });
    } catch (error) {
      console.error("[ADMIN_TEAM] Update role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/admin/team/:adminId", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      if (req.params.adminId === req.admin!.id) {
        return res.status(400).json({ error: "You cannot remove yourself" });
      }
      const deleted = await adminInviteStorage.deleteAdmin(req.params.adminId);
      if (!deleted) {
        return res.status(404).json({ error: "Admin not found" });
      }
      await adminStorage.createAuditLog(req.admin!.id, "delete", "admin", req.params.adminId, "Removed admin user");
      res.json({ success: true });
    } catch (error) {
      console.error("[ADMIN_TEAM] Delete admin error:", error);
      res.status(500).json({ error: "Failed to remove admin" });
    }
  });

  app.post("/api/admin/team/invite/:inviteId/revoke", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const invite = await adminInviteStorage.updateInviteStatus(req.params.inviteId, "revoked");
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      await adminStorage.createAuditLog(req.admin!.id, "revoke_invite", "admin", req.params.inviteId, "Revoked admin invite");
      res.json({ invite });
    } catch (error) {
      console.error("[ADMIN_TEAM] Revoke invite error:", error);
      res.status(500).json({ error: "Failed to revoke invite" });
    }
  });

  app.post("/api/admin/team/invite/:inviteId/resend", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const invites = await adminInviteStorage.getAllInvites();
      const invite = invites.find(i => i.id === req.params.inviteId);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      try {
        await sendAdminInviteEmail(invite.email, invite.name, invite.inviteCode);
      } catch (emailError) {
        console.error("[ADMIN_TEAM] Failed to resend invite email:", emailError);
        return res.status(500).json({ error: "Failed to send email" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[ADMIN_TEAM] Resend invite error:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  // ==================== TIER PERMISSIONS ====================

  app.get("/api/admin/tier-permissions", adminAuthMiddleware, async (req, res) => {
    try {
      let permissions = await storage.getAllTierPermissions();
      if (permissions.length === 0) {
        const tier1 = await storage.upsertTierPermissions("tier1", {
          featureCheckIn: true,
          featureShakeToAlert: true,
          featureEmergencyAlert: true,
          featureGpsLocation: true,
          featurePushNotifications: true,
          featurePrimaryContact: true,
          featureSmsBackup: true,
          featureEmergencyRecording: false,
          featureMoodTracking: false,
          featurePetProtection: false,
          featureDigitalWill: false,
          featureWellbeingAi: false,
          featureFitnessTracking: false,
          featureActivitiesTracker: false,
        });
        const tier2 = await storage.upsertTierPermissions("tier2", {
          featureCheckIn: true,
          featureShakeToAlert: true,
          featureEmergencyAlert: true,
          featureGpsLocation: true,
          featurePushNotifications: true,
          featurePrimaryContact: true,
          featureSmsBackup: true,
          featureEmergencyRecording: true,
          featureMoodTracking: true,
          featurePetProtection: true,
          featureDigitalWill: true,
          featureWellbeingAi: true,
          featureFitnessTracking: true,
          featureActivitiesTracker: true,
        });
        permissions = [tier1, tier2];
      }
      res.json(permissions);
    } catch (error) {
      console.error("[TIER PERMISSIONS] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch tier permissions" });
    }
  });

  app.put("/api/admin/tier-permissions/:tier", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const tier = req.params.tier as SubscriptionTier;
      if (!subscriptionTiers.includes(tier)) {
        return res.status(400).json({ error: "Invalid tier. Must be 'tier1' or 'tier2'" });
      }
      const validation = updateTierPermissionsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      const updated = await storage.upsertTierPermissions(tier, validation.data);
      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "tier_permissions",
        tier,
        `Updated ${tier === "tier1" ? "Essential" : "Complete Wellbeing"} tier permissions`
      );
      res.json(updated);
    } catch (error) {
      console.error("[TIER PERMISSIONS] Error updating:", error);
      res.status(500).json({ error: "Failed to update tier permissions" });
    }
  });

  // ==================== ORGANISATION FEATURE DEFAULTS ====================

  app.get("/api/admin/organizations/:orgId/feature-defaults", adminAuthMiddleware, async (req, res) => {
    try {
      const defaults = await storage.getOrgFeatureDefaults(req.params.orgId);
      if (!defaults) {
        return res.status(404).json({ error: "Organisation not found" });
      }
      res.json(defaults);
    } catch (error) {
      console.error("[ORG FEATURES] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch organisation feature defaults" });
    }
  });

  app.put("/api/admin/organizations/:orgId/feature-defaults", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const validation = orgFeatureDefaultsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      await storage.updateOrgFeatureDefaults(req.params.orgId, validation.data);
      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization_features",
        req.params.orgId,
        `Updated organisation feature defaults`
      );
      const updated = await storage.getOrgFeatureDefaults(req.params.orgId);
      res.json(updated);
    } catch (error) {
      console.error("[ORG FEATURES] Error updating:", error);
      res.status(500).json({ error: "Failed to update organisation feature defaults" });
    }
  });

  app.post("/api/admin/document-signatures", adminAuthMiddleware, async (req, res) => {
    const { documentId, signerName, signerEmail, signerRole, organisationId, organisationName } = req.body;
    if (!documentId || !signerName || !signerEmail || !signerRole) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const signature = await storage.createDocumentSignature({
      documentId,
      signerName,
      signerEmail,
      signerRole,
      signedAt: new Date(),
      ipAddress: req.ip,
      organisationId,
      organisationName,
    });
    if (organisationId) {
      await storage.markAssignedDocumentSigned(organisationId, documentId, signature.id);
    }
    res.json(signature);
  });

  app.get("/api/admin/document-signatures", adminAuthMiddleware, async (req, res) => {
    const { documentId, organisationId } = req.query;
    if (organisationId) {
      const sigs = await storage.getDocumentSignaturesByOrg(organisationId as string);
      return res.json(sigs);
    }
    if (documentId) {
      const sigs = await storage.getDocumentSignatures(documentId as string);
      return res.json(sigs);
    }
    const sigs = await storage.getAllDocumentSignatures();
    res.json(sigs);
  });

  // Assigned documents routes
  app.get("/api/admin/organizations/:orgId/assigned-documents", adminAuthMiddleware, async (req, res) => {
    try {
      const docs = await storage.getAssignedDocuments(req.params.orgId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assigned documents" });
    }
  });

  app.post("/api/admin/organizations/:orgId/assigned-documents", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { documentIds } = req.body;
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: "documentIds array required" });
      }
      const org = await storage.getUserById(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organisation not found" });
      }
      await storage.assignDocumentsToOrg(req.params.orgId, org.name || "Unknown", documentIds);
      await adminStorage.createAuditLog(
        req.admin!.id,
        "update",
        "organization",
        req.params.orgId,
        `Assigned ${documentIds.length} documents to ${org.name}`
      );
      const docs = await storage.getAssignedDocuments(req.params.orgId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign documents" });
    }
  });

  app.get("/api/admin/organizations/:orgId/validation-status", adminAuthMiddleware, async (req, res) => {
    try {
      const assigned = await storage.getAssignedDocuments(req.params.orgId);
      const fullySigned = await storage.isOrgFullySigned(req.params.orgId);
      res.json({ 
        totalRequired: assigned.length, 
        totalSigned: assigned.filter(d => !!d.signedAt).length, 
        isValid: fullySigned,
        documents: assigned 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch validation status" });
    }
  });

  app.get("/api/admin/service-health", adminAuthMiddleware, requireSuperAdmin, async (_req, res) => {
    try {
      const statuses = getAllServiceStatuses();
      const services = statuses.map(s => ({
        name: s.name,
        healthy: s.healthy,
        circuitOpen: s.circuitOpen,
        consecutiveFailures: s.consecutiveFailures,
        totalSuccesses: s.totalSuccesses,
        totalFailures: s.totalFailures,
        lastSuccess: s.lastSuccess?.toISOString() || null,
        lastFailure: s.lastFailure?.toISOString() || null,
        lastError: s.lastError,
      }));
      
      const healthyCount = services.filter(s => s.healthy).length;
      const degradedCount = services.filter(s => !s.healthy && !s.circuitOpen).length;
      const downCount = services.filter(s => s.circuitOpen).length;

      res.json({
        overall: downCount > 0 ? "degraded" : healthyCount === services.length ? "healthy" : "warning",
        summary: { healthy: healthyCount, degraded: degradedCount, down: downCount, total: services.length },
        services,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching service health:", error);
      res.status(500).json({ error: "Failed to fetch service health" });
    }
  });

  // Pricing config - GET (super_admin only)
  app.get("/api/admin/pricing", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      await adminStorage.seedDefaultPricing();
      const config = await adminStorage.getPricingConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching pricing config:", error);
      res.status(500).json({ error: "Failed to fetch pricing config" });
    }
  });

  // Pricing config - PUT (super_admin only)
  app.put("/api/admin/pricing", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const schema = z.object({
        updates: z.array(z.object({
          key: z.string(),
          value: z.number().min(0),
        })),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      }

      const results = [];
      for (const { key, value } of parsed.data.updates) {
        const updated = await adminStorage.updatePricingValue(key, value);
        if (updated) results.push(updated);
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        "update_pricing",
        "system",
        "pricing_config",
        `Updated ${results.length} pricing values`
      );

      const config = await adminStorage.getPricingConfig();
      res.json(config);
    } catch (error) {
      console.error("Error updating pricing config:", error);
      res.status(500).json({ error: "Failed to update pricing config" });
    }
  });
}
