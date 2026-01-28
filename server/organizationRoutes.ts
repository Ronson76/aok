import { Express, Request, Response } from "express";
import { organizationStorage, storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import { updateOrganizationClientProfileSchema, orgClientStatuses, registerOrgClientSchema, updateClientFeaturesSchema, forgotPasswordSchema, resetPasswordSchema, insertIncidentSchema, insertWelfareConcernSchema, insertCaseNoteSchema, insertEscalationRuleSchema } from "@shared/schema";
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
        const result = await storage.createContact(orgClient.clientId, {
          name,
          email,
          phone: phone || undefined,
          phoneType: phoneType || undefined,
          relationship: relationship || "",
        });
        // Set as primary if requested
        if (isPrimary && result.contact) {
          await storage.setPrimaryContact(orgClient.clientId, result.contact.id);
        }
        res.status(201).json(result.contact);
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
        
        const resetUrl = `${baseUrl}/org/reset-password?token=${rawToken}`;
        
        console.log(`[ORG PASSWORD RESET] baseUrl: ${baseUrl}`);
        
        try {
          await sendPasswordResetEmail(user.email, resetUrl, user.name, 'organisation');
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
      const user = await storage.getUserById(tokenData.userId);
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

      const user = await storage.getUserById(userId);
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

  // ==================== SAFEGUARDING ROUTES ====================

  // Get all incidents
  app.get("/api/org/safeguarding/incidents", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const incidents = await storage.getIncidents(orgId);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  // Create incident
  app.post("/api/org/safeguarding/incidents", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      
      // Validate request body
      const parseResult = insertIncidentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid incident data", details: parseResult.error.errors });
      }
      
      const incident = await storage.createIncident(orgId, parseResult.data);
      
      // Create audit entry
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "create",
        entityType: "incident",
        entityId: incident.id,
        newData: incident,
      });
      
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  // Resolve incident
  app.patch("/api/org/safeguarding/incidents/:id/resolve", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const { resolution } = req.body;
      const incident = await storage.resolveIncident(orgId, req.params.id, resolution, orgId);
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "update",
        entityType: "incident",
        entityId: incident.id,
        newData: { status: "closed", resolution },
      });
      
      res.json(incident);
    } catch (error) {
      console.error("Error resolving incident:", error);
      res.status(500).json({ error: "Failed to resolve incident" });
    }
  });

  // Get all welfare concerns
  app.get("/api/org/safeguarding/welfare-concerns", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const concerns = await storage.getWelfareConcerns(orgId);
      res.json(concerns);
    } catch (error) {
      console.error("Error fetching welfare concerns:", error);
      res.status(500).json({ error: "Failed to fetch welfare concerns" });
    }
  });

  // Create welfare concern
  app.post("/api/org/safeguarding/welfare-concerns", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      
      // Validate request body
      const parseResult = insertWelfareConcernSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid welfare concern data", details: parseResult.error.errors });
      }
      
      const concern = await storage.createWelfareConcern(orgId, parseResult.data);
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "create",
        entityType: "welfare_concern",
        entityId: concern.id,
        newData: concern,
      });
      
      res.status(201).json(concern);
    } catch (error) {
      console.error("Error creating welfare concern:", error);
      res.status(500).json({ error: "Failed to create welfare concern" });
    }
  });

  // Resolve welfare concern
  app.patch("/api/org/safeguarding/welfare-concerns/:id/resolve", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const { notes } = req.body;
      const concern = await storage.resolveWelfareConcern(orgId, req.params.id, notes, orgId);
      
      if (!concern) {
        return res.status(404).json({ error: "Welfare concern not found" });
      }
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "update",
        entityType: "welfare_concern",
        entityId: concern.id,
        newData: { status: "closed", notes },
      });
      
      res.json(concern);
    } catch (error) {
      console.error("Error resolving welfare concern:", error);
      res.status(500).json({ error: "Failed to resolve welfare concern" });
    }
  });

  // Get all case files
  app.get("/api/org/safeguarding/case-files", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const caseFiles = await storage.getCaseFiles(orgId);
      res.json(caseFiles);
    } catch (error) {
      console.error("Error fetching case files:", error);
      res.status(500).json({ error: "Failed to fetch case files" });
    }
  });

  // Get case file by ID
  app.get("/api/org/safeguarding/case-files/:id", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const caseFile = await storage.getCaseFile(orgId, req.params.id);
      
      if (!caseFile) {
        return res.status(404).json({ error: "Case file not found" });
      }
      
      res.json(caseFile);
    } catch (error) {
      console.error("Error fetching case file:", error);
      res.status(500).json({ error: "Failed to fetch case file" });
    }
  });

  // Create case file for a client
  app.post("/api/org/safeguarding/case-files", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const { clientId } = req.body;
      
      // Check if case file already exists for this client
      const existing = await storage.getCaseFileByClient(orgId, clientId);
      if (existing) {
        return res.json(existing);
      }
      
      const caseFile = await storage.createCaseFile(orgId, clientId);
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "create",
        entityType: "case_file",
        entityId: caseFile.id,
        newData: caseFile,
      });
      
      res.status(201).json(caseFile);
    } catch (error) {
      console.error("Error creating case file:", error);
      res.status(500).json({ error: "Failed to create case file" });
    }
  });

  // Update case file
  app.patch("/api/org/safeguarding/case-files/:id", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const caseFile = await storage.updateCaseFile(orgId, req.params.id, req.body);
      
      if (!caseFile) {
        return res.status(404).json({ error: "Case file not found" });
      }
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "update",
        entityType: "case_file",
        entityId: caseFile.id,
        newData: req.body,
      });
      
      res.json(caseFile);
    } catch (error) {
      console.error("Error updating case file:", error);
      res.status(500).json({ error: "Failed to update case file" });
    }
  });

  // Get case notes for a case file
  app.get("/api/org/safeguarding/case-files/:id/notes", requireOrganization, async (req, res) => {
    try {
      const notes = await storage.getCaseNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching case notes:", error);
      res.status(500).json({ error: "Failed to fetch case notes" });
    }
  });

  // Add case note
  app.post("/api/org/safeguarding/case-files/:id/notes", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      
      // Validate request body
      const parseResult = insertCaseNoteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid case note data", details: parseResult.error.errors });
      }
      
      const note = await storage.createCaseNote(req.params.id, orgId, parseResult.data);
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "create",
        entityType: "case_note",
        entityId: note.id,
      });
      
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating case note:", error);
      res.status(500).json({ error: "Failed to create case note" });
    }
  });

  // Get escalation rules
  app.get("/api/org/safeguarding/escalation-rules", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const rules = await storage.getEscalationRules(orgId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching escalation rules:", error);
      res.status(500).json({ error: "Failed to fetch escalation rules" });
    }
  });

  // Create escalation rule
  app.post("/api/org/safeguarding/escalation-rules", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      
      // Validate request body
      const parseResult = insertEscalationRuleSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid escalation rule data", details: parseResult.error.errors });
      }
      
      const rule = await storage.createEscalationRule(orgId, parseResult.data);
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "create",
        entityType: "escalation_rule",
        entityId: rule.id,
        newData: rule,
      });
      
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating escalation rule:", error);
      res.status(500).json({ error: "Failed to create escalation rule" });
    }
  });

  // Update escalation rule
  app.patch("/api/org/safeguarding/escalation-rules/:id", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const rule = await storage.updateEscalationRule(orgId, req.params.id, req.body);
      
      if (!rule) {
        return res.status(404).json({ error: "Escalation rule not found" });
      }
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "update",
        entityType: "escalation_rule",
        entityId: rule.id,
        newData: req.body,
      });
      
      res.json(rule);
    } catch (error) {
      console.error("Error updating escalation rule:", error);
      res.status(500).json({ error: "Failed to update escalation rule" });
    }
  });

  // Delete escalation rule
  app.delete("/api/org/safeguarding/escalation-rules/:id", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const deleted = await storage.deleteEscalationRule(orgId, req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Escalation rule not found" });
      }
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "delete",
        entityType: "escalation_rule",
        entityId: req.params.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting escalation rule:", error);
      res.status(500).json({ error: "Failed to delete escalation rule" });
    }
  });

  // Get missed check-in escalations
  app.get("/api/org/safeguarding/missed-checkin-escalations", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const escalations = await storage.getMissedCheckInEscalations(orgId);
      res.json(escalations);
    } catch (error) {
      console.error("Error fetching missed check-in escalations:", error);
      res.status(500).json({ error: "Failed to fetch missed check-in escalations" });
    }
  });

  // Get audit trail
  app.get("/api/org/safeguarding/audit-trail", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string) || 100;
      const trail = await storage.getAuditTrail(orgId, limit);
      res.json(trail);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  });

  // Get risk reports
  app.get("/api/org/safeguarding/risk-reports", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const reports = await storage.getRiskReports(orgId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching risk reports:", error);
      res.status(500).json({ error: "Failed to fetch risk reports" });
    }
  });

  // Review risk report
  app.patch("/api/org/safeguarding/risk-reports/:id/review", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const { notes } = req.body;
      const report = await storage.reviewRiskReport(orgId, req.params.id, orgId, notes);
      
      if (!report) {
        return res.status(404).json({ error: "Risk report not found" });
      }
      
      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "update",
        entityType: "risk_report",
        entityId: report.id,
        newData: { reviewed: true, notes },
      });
      
      res.json(report);
    } catch (error) {
      console.error("Error reviewing risk report:", error);
      res.status(500).json({ error: "Failed to review risk report" });
    }
  });

  // Get safeguarding summary/stats
  app.get("/api/org/safeguarding/summary", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      
      const [incidents, concerns, caseFiles, escalations, riskReports] = await Promise.all([
        storage.getIncidents(orgId),
        storage.getWelfareConcerns(orgId),
        storage.getCaseFiles(orgId),
        storage.getMissedCheckInEscalations(orgId),
        storage.getRiskReports(orgId),
      ]);
      
      const openIncidents = incidents.filter(i => i.status === "open").length;
      const openConcerns = concerns.filter(c => c.status === "open").length;
      const openCases = caseFiles.filter(c => c.status === "open" || c.status === "monitoring").length;
      const pendingEscalations = escalations.filter(e => e.status === "pending").length;
      const unreviewedReports = riskReports.filter(r => !r.reviewedAt).length;
      
      const highRiskCases = caseFiles.filter(c => c.riskLevel === "red").length;
      const amberRiskCases = caseFiles.filter(c => c.riskLevel === "amber").length;
      
      res.json({
        totalIncidents: incidents.length,
        openIncidents,
        totalConcerns: concerns.length,
        openConcerns,
        totalCaseFiles: caseFiles.length,
        openCases,
        pendingEscalations,
        unreviewedReports,
        highRiskCases,
        amberRiskCases,
        recentIncidents: incidents.slice(0, 5),
        recentConcerns: concerns.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching safeguarding summary:", error);
      res.status(500).json({ error: "Failed to fetch safeguarding summary" });
    }
  });
}
