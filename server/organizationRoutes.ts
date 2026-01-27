import { Express, Request, Response } from "express";
import { organizationStorage, storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import { updateOrganizationClientProfileSchema, orgClientStatuses, registerOrgClientSchema, updateClientFeaturesSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { sendAppInviteSMS, sendPasswordResetEmail } from "./notifications";

// Generate a unique 6-character reference code
function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Parse a time string (HH:MM) into a Date object for today
function parseScheduleTime(timeStr: string): Date | null {
  if (!timeStr) return null;
  
  // Handle HH:MM format
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    return now;
  }
  
  // Try parsing as full date/time
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

// Middleware to ensure user is an organization
function requireOrganization(req: Request, res: Response, next: () => void) {
  if (!req.user || (req.user as any).accountType !== "organization") {
    return res.status(403).json({ error: "Access denied. Organization account required." });
  }
  next();
}

// Schema for adding a client
const addClientSchema = z.object({
  clientEmail: z.string().email("Invalid email address"),
  bundleId: z.string().optional(),
  nickname: z.string().optional(),
});

export function registerOrganizationRoutes(app: Express) {
  // All organization routes require authentication (handled by main routes)
  // and organization account type
  
  // Get organization dashboard stats
  app.get("/api/org/dashboard", requireOrganization, async (req, res) => {
    try {
      const stats = await organizationStorage.getOrganizationDashboardStats(req.userId!);
      res.json(stats);
    } catch (error) {
      console.error("[ORG] Failed to get dashboard stats:", error);
      res.status(500).json({ error: "Failed to get dashboard statistics" });
    }
  });

  // Get all clients for the organization
  app.get("/api/org/clients", requireOrganization, async (req, res) => {
    try {
      const clients = await organizationStorage.getClientsWithDetails(req.userId!);
      res.json(clients);
    } catch (error) {
      console.error("[ORG] Failed to get clients:", error);
      res.status(500).json({ error: "Failed to get clients" });
    }
  });

  // Add a client to the organization
  app.post("/api/org/clients", requireOrganization, async (req, res) => {
    try {
      const parsed = addClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { clientEmail, bundleId, nickname } = parsed.data;

      // Find the user by email
      const clientUser = await storage.getUserByEmail(clientEmail);
      if (!clientUser) {
        return res.status(404).json({ error: "No user found with that email address" });
      }

      // Ensure the user is an individual, not an organization
      if (clientUser.accountType !== "individual") {
        return res.status(400).json({ error: "Can only add individual users as clients" });
      }

      // Add the client
      const client = await organizationStorage.addClient(
        req.userId!,
        clientUser.id,
        bundleId,
        nickname
      );

      res.status(201).json(client);
    } catch (error: any) {
      console.error("[ORG] Failed to add client:", error);
      res.status(400).json({ error: error.message || "Failed to add client" });
    }
  });

  // Register a new org-managed client (creates pending registration, sends SMS)
  app.post("/api/org/clients/register", requireOrganization, async (req, res) => {
    try {
      const parsed = registerOrgClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { clientName, clientPhone, dateOfBirth, bundleId, scheduleStartTime, checkInIntervalHours, emergencyContacts } = parsed.data;

      // Get the organization details
      const org = await storage.getUserById(req.userId!);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Generate unique reference code
      let referenceCode = generateReferenceCode();
      let attempts = 0;
      while (await organizationStorage.getClientByReferenceCode(referenceCode) && attempts < 10) {
        referenceCode = generateReferenceCode();
        attempts++;
      }

      if (attempts >= 10) {
        return res.status(500).json({ error: "Failed to generate unique reference code" });
      }

      // Create the pending org client record
      const orgClient = await organizationStorage.createPendingClient({
        organizationId: req.userId!,
        bundleId: bundleId || null,
        clientName,
        clientPhone,
        referenceCode,
        scheduleStartTime: scheduleStartTime ? parseScheduleTime(scheduleStartTime) : null,
        checkInIntervalHours: checkInIntervalHours || 24,
      });

      // Create the client profile with date of birth
      if (dateOfBirth) {
        await organizationStorage.createOrUpdateClientProfile(orgClient.id, {
          organizationClientId: orgClient.id,
          dateOfBirth: dateOfBirth,
        });
      }

      // Create emergency contacts for the pending client
      if (emergencyContacts && emergencyContacts.length > 0) {
        for (const contact of emergencyContacts) {
          await organizationStorage.addPendingClientContact(orgClient.id, contact);
        }
      }

      // Send SMS with app download link and reference code
      const smsResult = await sendAppInviteSMS(clientPhone, referenceCode, org.name);
      
      // Update registration status based on SMS result
      if (smsResult.success) {
        await organizationStorage.updateClientRegistrationStatus(orgClient.id, "pending_registration");
      }

      res.status(201).json({
        success: true,
        orgClientId: orgClient.id,
        referenceCode,
        smsSent: smsResult.success,
        smsError: smsResult.error,
      });
    } catch (error: any) {
      console.error("[ORG] Failed to register client:", error);
      res.status(400).json({ error: error.message || "Failed to register client" });
    }
  });

  // Resend SMS invite to a pending client
  app.post("/api/org/clients/:orgClientId/resend-invite", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!orgClient.clientPhone || !orgClient.referenceCode) {
        return res.status(400).json({ error: "Client does not have phone or reference code" });
      }

      const org = await storage.getUserById(req.userId!);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const smsResult = await sendAppInviteSMS(orgClient.clientPhone, orgClient.referenceCode, org.name);
      
      res.json({
        success: smsResult.success,
        error: smsResult.error,
      });
    } catch (error) {
      console.error("[ORG] Failed to resend invite:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  // Remove a client from the organization
  app.delete("/api/org/clients/:clientId", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      const success = await organizationStorage.removeClient(req.userId!, clientId);
      
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[ORG] Failed to remove client:", error);
      res.status(500).json({ error: "Failed to remove client" });
    }
  });

  // Get a specific client's status and details
  app.get("/api/org/clients/:clientId", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Verify the client belongs to this organization
      const isClient = await organizationStorage.isClientOfOrganization(req.userId!, clientId);
      if (!isClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      const status = await organizationStorage.getClientStatus(clientId);
      const alerts = await organizationStorage.getClientAlertLogs(clientId);
      const user = await storage.getUserById(clientId);

      if (!user) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json({
        client: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        status,
        alerts,
      });
    } catch (error) {
      console.error("[ORG] Failed to get client details:", error);
      res.status(500).json({ error: "Failed to get client details" });
    }
  });

  // Get client's check-in history
  app.get("/api/org/clients/:clientId/checkins", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Verify the client belongs to this organization
      const isClient = await organizationStorage.isClientOfOrganization(req.userId!, clientId);
      if (!isClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      const checkIns = await storage.getCheckIns(clientId);
      res.json(checkIns);
    } catch (error) {
      console.error("[ORG] Failed to get client check-ins:", error);
      res.status(500).json({ error: "Failed to get client check-ins" });
    }
  });

  // Reset a client's password (organization can set a new password for their client)
  const resetClientPasswordSchema = z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    orgPassword: z.string().min(1, "Your password is required"),
  });

  app.post("/api/org/clients/:clientId/reset-password", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      const parsed = resetClientPasswordSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { newPassword, orgPassword } = parsed.data;

      // Verify the client belongs to this organization
      const isClient = await organizationStorage.isClientOfOrganization(req.userId!, clientId);
      if (!isClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Verify organization's password
      const orgUser = await storage.getUserById(req.userId!);
      if (!orgUser) {
        return res.status(401).json({ error: "Organization not found" });
      }

      const isValidOrgPassword = await bcrypt.compare(orgPassword, orgUser.passwordHash);
      if (!isValidOrgPassword) {
        return res.status(401).json({ error: "Incorrect organization password" });
      }

      // Hash the new password and update the client's account
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(clientId, newPasswordHash);

      // Invalidate all of the client's sessions for security
      await storage.deleteAllUserSessions(clientId);

      res.json({ success: true, message: "Client password has been reset" });
    } catch (error) {
      console.error("[ORG] Failed to reset client password:", error);
      res.status(500).json({ error: "Failed to reset client password" });
    }
  });

  // Get client profile by organization client ID
  app.get("/api/org/clients/:orgClientId/profile", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      
      // Get the org client to verify ownership
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const profile = await organizationStorage.getClientProfile(orgClientId);
      res.json(profile || null);
    } catch (error) {
      console.error("[ORG] Failed to get client profile:", error);
      res.status(500).json({ error: "Failed to get client profile" });
    }
  });

  // Update client profile
  app.put("/api/org/clients/:orgClientId/profile", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      const parsed = updateOrganizationClientProfileSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }

      // Get the org client to verify ownership
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const profile = await organizationStorage.updateClientProfile(orgClientId, parsed.data);
      res.json(profile);
    } catch (error) {
      console.error("[ORG] Failed to update client profile:", error);
      res.status(500).json({ error: "Failed to update client profile" });
    }
  });

  // Get client alert history
  app.get("/api/org/clients/:clientId/alerts", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Verify the client belongs to this organization
      const isClient = await organizationStorage.isClientOfOrganization(req.userId!, clientId);
      if (!isClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      const alerts = await organizationStorage.getClientAlertLogs(clientId);
      const alertCounts = await organizationStorage.getClientAlertCounts(clientId);
      
      res.json({
        alerts,
        counts: alertCounts,
      });
    } catch (error) {
      console.error("[ORG] Failed to get client alerts:", error);
      res.status(500).json({ error: "Failed to get client alerts" });
    }
  });

  // Update client status (active/paused/terminated)
  const updateStatusSchema = z.object({
    status: z.enum(orgClientStatuses),
  });

  app.patch("/api/org/clients/:orgClientId/status", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      const parsed = updateStatusSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid status" });
      }

      // Get the org client to verify ownership
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const updated = await organizationStorage.updateClientStatus(orgClientId, parsed.data.status);
      res.json(updated);
    } catch (error) {
      console.error("[ORG] Failed to update client status:", error);
      res.status(500).json({ error: "Failed to update client status" });
    }
  });

  // Update client feature settings
  app.patch("/api/org/clients/:orgClientId/features", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const parsed = updateClientFeaturesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const updated = await organizationStorage.updateClientFeatures(orgClientId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("[ORG] Failed to update client features:", error);
      res.status(500).json({ error: "Failed to update client features" });
    }
  });

  // Get client feature settings
  app.get("/api/org/clients/:orgClientId/features", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json({
        featureWellbeingAi: orgClient.featureWellbeingAi,
        featureShakeToAlert: orgClient.featureShakeToAlert,
        featureMoodTracking: orgClient.featureMoodTracking,
        featurePetProtection: orgClient.featurePetProtection,
        featureDigitalWill: orgClient.featureDigitalWill,
      });
    } catch (error) {
      console.error("[ORG] Failed to get client features:", error);
      res.status(500).json({ error: "Failed to get client features" });
    }
  });

  // Get contacts for a client
  app.get("/api/org/clients/:orgClientId/contacts", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      
      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      // If client is registered (has a user account), get their actual contacts
      if (orgClient.clientId) {
        const contacts = await storage.getContacts(orgClient.clientId);
        res.json(contacts);
      } else {
        // Otherwise get pending contacts
        const pendingContacts = await organizationStorage.getPendingClientContacts(orgClientId);
        res.json(pendingContacts);
      }
    } catch (error) {
      console.error("[ORG] Failed to get client contacts:", error);
      res.status(500).json({ error: "Failed to get client contacts" });
    }
  });

  // Add a contact for a client
  const addContactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    phoneType: z.enum(["mobile", "landline"]).optional(),
    relationship: z.string().optional(),
    isPrimary: z.boolean().optional(),
  });

  app.post("/api/org/clients/:orgClientId/contacts", requireOrganization, async (req, res) => {
    try {
      const { orgClientId } = req.params;
      const parsed = addContactSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const { name, email, phone, phoneType, relationship, isPrimary } = parsed.data;

      // If client is registered (has a user account), add to their contacts
      if (orgClient.clientId) {
        const contact = await storage.createContact(orgClient.clientId, {
          name,
          email,
          phone: phone || undefined,
          phoneType: phoneType || undefined,
          relationship: relationship || "",
        });
        // Set as primary if requested
        if (isPrimary && contact) {
          await storage.setPrimaryContact(orgClient.clientId, contact.id);
        }
        res.status(201).json(contact);
      } else {
        // Otherwise add to pending contacts
        await organizationStorage.addPendingClientContact(orgClientId, {
          name,
          email,
          phone,
          phoneType,
          relationship,
          isPrimary,
        });
        res.status(201).json({ success: true });
      }
    } catch (error) {
      console.error("[ORG] Failed to add client contact:", error);
      res.status(500).json({ error: "Failed to add client contact" });
    }
  });

  // Update a contact for a client
  app.patch("/api/org/clients/:orgClientId/contacts/:contactId", requireOrganization, async (req, res) => {
    try {
      const { orgClientId, contactId } = req.params;
      const parsed = addContactSchema.partial().safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Only update contacts for registered clients
      if (!orgClient.clientId) {
        return res.status(400).json({ error: "Cannot update contacts for pending clients" });
      }

      const contact = await storage.updateContact(orgClient.clientId, contactId, parsed.data);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("[ORG] Failed to update client contact:", error);
      res.status(500).json({ error: "Failed to update client contact" });
    }
  });

  // Delete a contact for a client
  app.delete("/api/org/clients/:orgClientId/contacts/:contactId", requireOrganization, async (req, res) => {
    try {
      const { orgClientId, contactId } = req.params;

      const orgClient = await organizationStorage.getClientById(orgClientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Only delete contacts for registered clients
      if (!orgClient.clientId) {
        return res.status(400).json({ error: "Cannot delete contacts for pending clients" });
      }

      const success = await storage.deleteContact(orgClient.clientId, contactId);
      if (!success) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[ORG] Failed to delete client contact:", error);
      res.status(500).json({ error: "Failed to delete client contact" });
    }
  });

  // Organisation forgot password (public)
  app.post("/api/org/auth/forgot-password", async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid email" });
      }

      const { email } = parsed.data;
      const user = await storage.getUserByEmail(email.toLowerCase());

      if (user && user.accountType === "organization") {
        const rawToken = await storage.createPasswordResetToken(user.id);
        
        const baseUrl = process.env.NODE_ENV === "production" 
          ? `https://${req.get('host')}`
          : `http://${req.get('host')}`;
        const resetUrl = `${baseUrl}/org/reset-password?token=${rawToken}`;
        
        try {
          await sendPasswordResetEmail(user.email, resetUrl, user.name);
        } catch (error) {
          console.error("Failed to send organisation password reset email:", error);
          if (process.env.NODE_ENV !== "production") {
            console.log(`[DEV] Organisation password reset link for ${email}: ${resetUrl}`);
          }
        }
      }

      res.json({ success: true, message: "If an organisation account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Organisation forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Organisation reset password (public)
  app.post("/api/org/auth/reset-password", async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { token, password } = parsed.data;

      const tokenData = await storage.validatePasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
      }

      // Verify the user is an organisation
      const user = await storage.getUser(tokenData.userId);
      if (!user || user.accountType !== "organization") {
        return res.status(400).json({ error: "Invalid reset link." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(tokenData.userId, passwordHash);
      await storage.markPasswordResetTokenUsed(tokenData.tokenId);
      await storage.deleteAllUserSessions(tokenData.userId);

      res.json({ success: true, message: "Password reset successfully. Please log in with your new password." });
    } catch (error) {
      console.error("Organisation reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Organisation change password (authenticated)
  app.post("/api/org/auth/change-password", requireOrganization, async (req, res) => {
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
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ error: "Cannot change password for this account" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, passwordHash);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Organisation change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
}
