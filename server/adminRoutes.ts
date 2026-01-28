import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { adminStorage, organizationStorage, storage } from "./storage";
import { adminLoginSchema, AdminUserProfile, orgClientStatuses, updateUserFeaturesSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { z } from "zod";
import { sendPasswordResetEmail } from "./notifications";

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

  // Get all users
  app.get("/api/admin/users", adminAuthMiddleware, async (req, res) => {
    try {
      const users = await adminStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create organization (super admin only)
  const createOrganizationSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post("/api/admin/organizations", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const validation = createOrganizationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { name, email, password } = validation.data;

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        accountType: "organization",
        name,
      });

      await adminStorage.createAuditLog(
        req.admin!.id,
        "create",
        "organization",
        user.id,
        `Created organization: ${name} (${email})`
      );

      const { passwordHash: _, ...profile } = user;
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  // Delete user (super admin only)
  app.delete("/api/admin/users/:id", adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await adminStorage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      await adminStorage.createAuditLog(req.admin!.id, "delete", "user", id, `Deleted user ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
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

      const success = await organizationStorage.removeClient(organizationId, orgClient.clientId || clientId);
      
      if (!success) {
        return res.status(404).json({ error: "Failed to remove client" });
      }

      await adminStorage.createAuditLog(
        req.admin!.id,
        "delete",
        "organization_client",
        clientId,
        `Removed client from organization ${organizationId}`
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
        nextCheckInDue: nextDue,
        streak: 0,
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

  // Reset organisation password (super admin only)
  const resetOrgPasswordSchema = z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
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
        let baseUrl: string;
        
        if (process.env.REPL_SLUG || process.env.REPLIT_DEPLOYMENT) {
          // We're on Replit - use production domain
          baseUrl = 'https://aok.care';
        } else {
          // Development environment
          const host = req.get('host') || 'localhost:5000';
          baseUrl = `http://${host}`;
        }
        
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
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
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
}
