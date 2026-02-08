import { Express, Request, Response, NextFunction } from "express";
import { organizationStorage, storage, orgMemberStorage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import { updateOrganizationClientProfileSchema, orgClientStatuses, registerOrgClientSchema, updateClientFeaturesSchema, forgotPasswordSchema, resetPasswordSchema, insertIncidentSchema, insertWelfareConcernSchema, insertCaseNoteSchema, insertEscalationRuleSchema, passwordSchema } from "@shared/schema";
import { sendAppInviteSMS, sendPasswordResetEmail, sendReferenceCodeSMS, sendContactConfirmationEmail, sendStaffInviteSMS, sendEmergencyContactConfirmationForStaffInvite } from "./notifications";
import { plantTreeForNewSubscriber } from "./ecologiService";

function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function parseScheduleTime(timeStr: string): Date | null {
  if (!timeStr) return null;
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    return now;
  }
  
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

async function requireOrganization(req: Request, res: Response, next: NextFunction) {
  const orgMemberSessionId = req.cookies?.org_member_session;
  if (orgMemberSessionId) {
    const session = await orgMemberStorage.getMemberSession(orgMemberSessionId);
    if (session) {
      const member = await orgMemberStorage.getMemberById(session.memberId);
      if (member && member.status === "active") {
        req.userId = member.organizationId;
        req.orgId = member.organizationId;
        req.orgMember = (() => { const { passwordHash, ...p } = member; return p; })();
        req.orgRole = member.role;
        return next();
      }
    }
  }

  if (!req.user || (req.user as any).accountType !== "organization") {
    return res.status(403).json({ error: "Access denied. Organisation account required." });
  }
  
  req.orgId = req.userId;
  req.orgRole = "owner";
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

  // Get archived clients (must be before /api/org/clients/:clientId)
  app.get("/api/org/clients/archived", requireOrganization, async (req, res) => {
    try {
      const archivedClients = await organizationStorage.listArchivedClients(req.userId!);
      res.json(archivedClients);
    } catch (error) {
      console.error("[ORG] Error fetching archived clients:", error);
      res.status(500).json({ error: "Failed to fetch archived clients" });
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

      const { clientName, clientPhone, dateOfBirth, bundleId, scheduleStartTime, checkInIntervalHours, emergencyContacts, features } = parsed.data;

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
        features: features || {
          featureWellbeingAi: true,
          featureShakeToAlert: true,
          featureMoodTracking: true,
          featurePetProtection: true,
          featureDigitalWill: true,
        },
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

      // Plant a tree for every person we onboard
      plantTreeForNewSubscriber(clientPhone).catch(err => {
        console.error("[ECOLOGI] Failed to plant tree for new client:", err);
      });

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

  // Bulk import clients from spreadsheet data (parsed on frontend)
  const bulkImportClientSchema = z.object({
    clients: z.array(z.object({
      clientName: z.string().min(1, "Client name is required"),
      clientPhone: z.string().min(10, "Valid phone number is required"),
      clientEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
      dateOfBirth: z.string().optional().or(z.literal("")),
      specialNeeds: z.string().optional().or(z.literal("")),
      medicalNotes: z.string().optional().or(z.literal("")),
      emergencyInstructions: z.string().optional().or(z.literal("")),
      checkInIntervalHours: z.number().min(1).max(48).default(24),
      emergencyContacts: z.array(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional().or(z.literal("")),
        relationship: z.string().optional().or(z.literal("")),
      })).min(1, "At least one emergency contact is required"),
    })).min(1, "At least one client is required").max(100, "Maximum 100 clients per import"),
    bundleId: z.string().optional(),
  });

  app.post("/api/org/clients/bulk-import", requireOrganization, async (req, res) => {
    try {
      const parsed = bulkImportClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid import data" });
      }

      const { clients, bundleId } = parsed.data;
      const org = await storage.getUserById(req.userId!);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const results: Array<{ row: number; clientName: string; success: boolean; referenceCode?: string; error?: string }> = [];

      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        try {
          let referenceCode = generateReferenceCode();
          let attempts = 0;
          while (await organizationStorage.getClientByReferenceCode(referenceCode) && attempts < 10) {
            referenceCode = generateReferenceCode();
            attempts++;
          }

          if (attempts >= 10) {
            results.push({ row: i + 1, clientName: client.clientName, success: false, error: "Failed to generate unique reference code" });
            continue;
          }

          const orgClient = await organizationStorage.createPendingClient({
            organizationId: req.userId!,
            bundleId: bundleId || null,
            clientName: client.clientName,
            clientPhone: client.clientPhone,
            referenceCode,
            scheduleStartTime: null,
            checkInIntervalHours: client.checkInIntervalHours || 24,
            features: {
              featureWellbeingAi: true,
              featureShakeToAlert: true,
              featureMoodTracking: true,
              featurePetProtection: true,
              featureDigitalWill: true,
              featureEmergencyRecording: false,
            },
          });

          if (client.dateOfBirth || client.specialNeeds || client.medicalNotes || client.emergencyInstructions) {
            await organizationStorage.createOrUpdateClientProfile(orgClient.id, {
              organizationClientId: orgClient.id,
              dateOfBirth: client.dateOfBirth || undefined,
            });
            if (client.specialNeeds || client.medicalNotes || client.emergencyInstructions) {
              await organizationStorage.updateClientProfile(orgClient.id, {
                vulnerabilities: client.specialNeeds || null,
                medicalNotes: client.medicalNotes || null,
                emergencyInstructions: client.emergencyInstructions || null,
              });
            }
          }

          if (client.emergencyContacts && client.emergencyContacts.length > 0) {
            for (const contact of client.emergencyContacts) {
              if (contact.name && contact.email) {
                await organizationStorage.addPendingClientContact(orgClient.id, {
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone || undefined,
                  relationship: contact.relationship || undefined,
                });
              }
            }
          }

          const smsResult = await sendAppInviteSMS(client.clientPhone, referenceCode, org.name);
          if (smsResult.success) {
            await organizationStorage.updateClientRegistrationStatus(orgClient.id, "pending_registration");
          }

          plantTreeForNewSubscriber(client.clientPhone).catch(err => {
            console.error("[ECOLOGI] Failed to plant tree for imported client:", err);
          });

          results.push({ row: i + 1, clientName: client.clientName, success: true, referenceCode });
        } catch (err: any) {
          results.push({ row: i + 1, clientName: client.clientName, success: false, error: err.message || "Unknown error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      res.status(201).json({
        success: true,
        totalProcessed: clients.length,
        successCount,
        failCount,
        results,
      });
    } catch (error: any) {
      console.error("[ORG] Bulk import failed:", error);
      res.status(400).json({ error: error.message || "Bulk import failed" });
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

  // Restore an archived client
  app.post("/api/org/clients/:clientId/restore", requireOrganization, async (req, res) => {
    try {
      const success = await organizationStorage.restoreClient(req.userId!, req.params.clientId);
      if (!success) {
        return res.status(400).json({ error: "Cannot restore client. Check bundle seat availability." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[ORG] Error restoring client:", error);
      res.status(500).json({ error: "Failed to restore client" });
    }
  });

  // Archive a client from the organization (soft-delete)
  app.delete("/api/org/clients/:clientId", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      const success = await organizationStorage.archiveClient(req.userId!, clientId, req.userId!);
      
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[ORG] Failed to archive client:", error);
      res.status(500).json({ error: "Failed to archive client" });
    }
  });

  // Update client basic details (nickname, name, phone)
  const updateClientDetailsSchema = z.object({
    nickname: z.string().optional(),
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    clientEmail: z.string().email().optional().or(z.literal("")),
    alertsEnabled: z.boolean().optional(),
  });

  app.patch("/api/org/clients/:clientId/details", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const parsed = updateClientDetailsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      // Get the org client to verify ownership
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const updated = await organizationStorage.updateClientDetails(clientId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("[ORG] Failed to update client details:", error);
      res.status(500).json({ error: "Failed to update client details" });
    }
  });

  // Update client emergency contacts (up to 3)
  const updateEmergencyContactsSchema = z.object({
    emergencyContacts: z.array(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Valid email is required"),
      phone: z.string().min(1, "Phone number is required"),
      relationship: z.string().optional(),
    })).max(3, "Maximum 3 emergency contacts allowed"),
  });

  app.patch("/api/org/clients/:clientId/emergency-contacts", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const parsed = updateEmergencyContactsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      // Get the org client to verify ownership
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const updated = await organizationStorage.updateClientEmergencyContacts(clientId, parsed.data.emergencyContacts);
      res.json(updated);
    } catch (error) {
      console.error("[ORG] Failed to update client emergency contacts:", error);
      res.status(500).json({ error: "Failed to update client emergency contacts" });
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
    newPassword: passwordSchema,
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

  // Send reference code SMS to client (for login recovery)
  app.post("/api/org/clients/:clientId/send-reference-code", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;

      // Verify the client belongs to this organization
      const isClient = await organizationStorage.isClientOfOrganization(req.userId!, clientId);
      if (!isClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get the org client record to get the reference code
      const orgClient = await organizationStorage.getOrganizationClientByClientId(req.userId!, clientId);
      if (!orgClient) {
        return res.status(404).json({ error: "Client record not found" });
      }

      if (!orgClient.referenceCode) {
        return res.status(400).json({ error: "Client does not have a reference code" });
      }

      // Get the client's phone number from the organization client record
      if (!orgClient.clientPhone) {
        return res.status(400).json({ error: "Client does not have a mobile number registered" });
      }

      // Get organization name
      const orgUser = await storage.getUserById(req.userId!);
      const orgName = orgUser?.name || "aok";

      // Send the SMS
      const result = await sendReferenceCodeSMS(
        orgClient.clientPhone,
        orgClient.referenceCode,
        orgName
      );

      if (!result.success) {
        console.error("[ORG] Failed to send reference code SMS:", result.error);
        return res.status(500).json({ error: "Failed to send SMS. Please try again." });
      }

      res.json({ success: true, message: "Reference code sent via SMS" });
    } catch (error) {
      console.error("[ORG] Failed to send reference code SMS:", error);
      res.status(500).json({ error: "Failed to send reference code SMS" });
    }
  });

  // Reset client's check-in scheduler
  app.post("/api/org/clients/:clientId/reset-scheduler", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;

      // Verify the client belongs to this organization
      const isClient = await organizationStorage.isClientOfOrganization(req.userId!, clientId);
      if (!isClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get the org client record to get the check-in interval
      const orgClient = await organizationStorage.getOrganizationClientByClientId(req.userId!, clientId);
      if (!orgClient) {
        return res.status(404).json({ error: "Client record not found" });
      }

      // Reset the user's check-in data
      const now = new Date();
      const intervalHours = orgClient.checkInIntervalHours || 24;
      const nextDue = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
      
      await storage.updateSettings(clientId, {
        nextCheckInDue: nextDue.toISOString(),
      });

      console.log(`[ORG] Reset scheduler for client ${clientId}: next due ${nextDue.toISOString()}`);
      res.json({ success: true, message: "Client scheduler has been reset", nextCheckInDue: nextDue });
    } catch (error) {
      console.error("[ORG] Failed to reset client scheduler:", error);
      res.status(500).json({ error: "Failed to reset client scheduler" });
    }
  });

  // Update client's check-in schedule (time and interval)
  const updateScheduleSchema = z.object({
    scheduleStartTime: z.string().min(1, "Schedule start time is required"),
    checkInIntervalHours: z.number().min(0.08).max(48),
  });

  app.patch("/api/org/clients/:clientId/schedule", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;

      const parsed = updateScheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      // Get the org client to verify ownership (clientId is the org client record ID, not the user ID)
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      const { scheduleStartTime, checkInIntervalHours } = parsed.data;

      // Parse the time string (HH:mm) and create a Date for today at that time
      const [hours, minutes] = scheduleStartTime.split(':').map(Number);
      const now = new Date();
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);
      
      // If the schedule time has already passed today, set for tomorrow
      if (scheduleDate <= now) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      // Update the org client record with the new schedule using storage method
      await organizationStorage.updateClientSchedule(clientId, scheduleDate, checkInIntervalHours);

      // If the client has a linked user account, update their settings too
      if (orgClient.clientId) {
        await storage.updateSettings(orgClient.clientId, {
          scheduleStartTime: scheduleDate.toISOString(),
          intervalHours: checkInIntervalHours,
          nextCheckInDue: scheduleDate.toISOString(),
        });
      }

      console.log(`[ORG] Updated schedule for client ${clientId}: start ${scheduleDate.toISOString()}, interval ${checkInIntervalHours}h`);
      res.json({ success: true, message: "Client schedule has been updated", scheduleStartTime: scheduleDate, checkInIntervalHours });
    } catch (error) {
      console.error("[ORG] Failed to update client schedule:", error);
      res.status(500).json({ error: "Failed to update client schedule" });
    }
  });

  // Deactivate client's active emergency alert
  app.post("/api/org/clients/:clientId/deactivate-alert", requireOrganization, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Get the org client to verify ownership
      const orgClient = await organizationStorage.getClientById(clientId);
      if (!orgClient || orgClient.organizationId !== req.userId) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!orgClient.clientId) {
        return res.status(400).json({ error: "Client has not activated their account yet" });
      }

      // Deactivate the emergency alert
      const deactivated = await storage.deactivateEmergencyAlertByUserId(orgClient.clientId);
      
      if (!deactivated) {
        return res.status(404).json({ error: "No active emergency alert found" });
      }

      console.log(`[ORG] Deactivated emergency alert for client ${clientId}`);
      res.json({ success: true, message: "Emergency alert deactivated" });
    } catch (error) {
      console.error("[ORG] Failed to deactivate alert:", error);
      res.status(500).json({ error: "Failed to deactivate alert" });
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
        
        // Send confirmation email to the new contact
        if (result.contact && result.confirmationToken) {
          const user = await storage.getUserById(orgClient.clientId);
          if (user) {
            const baseUrl = process.env.APP_URL || `https://aok.care`;
            console.log("[ORG] Sending contact confirmation email to:", result.contact.email);
            sendContactConfirmationEmail(result.contact, user, result.confirmationToken, baseUrl)
              .then(emailResult => {
                console.log("[ORG] Contact confirmation email result:", emailResult);
              })
              .catch(err => {
                console.error("[ORG] Failed to send contact confirmation email:", err);
              });
          }
        }
        
        res.status(201).json({
          ...result.contact,
          pending: true,
          message: "Confirmation email sent. Contact must confirm within 24 hours."
        });
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
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        
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
        newPassword: passwordSchema,
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
      const [incidents, emergencyAlerts] = await Promise.all([
        storage.getIncidents(orgId),
        organizationStorage.getOrganizationEmergencyAlerts(orgId),
      ]);
      
      // Convert emergency alerts to incident format
      const emergencyIncidents = emergencyAlerts.map(alert => ({
        id: `emergency-${alert.id}`,
        incidentType: "emergency_alert",
        severity: alert.status === "active" ? "critical" : "high",
        description: `Emergency alert triggered${alert.what3words ? ` at ///${alert.what3words}` : ""}`,
        createdAt: alert.timestamp,
        status: alert.status === "active" ? "open" : "closed",
        clientId: null,
        clientName: alert.clientName,
        referenceCode: alert.referenceCode,
        what3words: alert.what3words,
        isEmergencyAlert: true,
      }));
      
      // Combine and sort by date
      const allIncidents = [
        ...incidents.map(i => ({ ...i, isEmergencyAlert: false })),
        ...emergencyIncidents,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(allIncidents);
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
      const orgEmail = (req.user as any).email;
      const orgName = (req.user as any).name || "Organisation";
      
      // Extract recipientEmail from body before validation
      const { recipientEmail, ...concernData } = req.body;
      
      // Validate request body
      const parseResult = insertWelfareConcernSchema.safeParse(concernData);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid welfare concern data", details: parseResult.error.errors });
      }
      
      const concern = await storage.createWelfareConcern(orgId, parseResult.data);
      
      await storage.createAuditEntry(orgId, {
        userEmail: orgEmail,
        userRole: "organisation",
        action: "create",
        entityType: "welfare_concern",
        entityId: concern.id,
        newData: concern,
      });
      
      // Send email if recipientEmail provided
      if (recipientEmail && recipientEmail.includes("@")) {
        try {
          const { sendAlertEmail } = await import("./notifications");
          
          // Get client info if provided
          let clientInfo = "Not specified";
          if (parseResult.data.clientId) {
            // Try to get client info - using just the ID for privacy
            clientInfo = `Client ID: ${parseResult.data.clientId}`;
          }
          
          // Handle observedBehaviours - could be array or string
          const behaviours = parseResult.data.observedBehaviours;
          const behavioursText = Array.isArray(behaviours) 
            ? behaviours.join(", ") 
            : (behaviours || "");
          
          const emailBody = `
            <h2>Welfare Concern Reported</h2>
            <p><strong>Organisation:</strong> ${orgName}</p>
            <p><strong>Concern Type:</strong> ${parseResult.data.concernType || "General Welfare"}</p>
            <p><strong>Client:</strong> ${clientInfo}</p>
            <p><strong>Description:</strong></p>
            <p>${parseResult.data.description}</p>
            ${behavioursText ? `<p><strong>Observed Behaviours:</strong> ${behavioursText}</p>` : ""}
            <p><strong>Anonymous Report:</strong> ${parseResult.data.isAnonymous ? "Yes" : "No"}</p>
            <p><strong>Reported At:</strong> ${new Date().toLocaleString("en-GB")}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">This welfare concern was reported via the aok safeguarding system.</p>
          `;
          
          await sendAlertEmail(
            recipientEmail,
            `Welfare Concern Report - ${orgName}`,
            emailBody,
            emailBody
          );
          
          console.log(`Welfare concern email sent to ${recipientEmail}`);
        } catch (emailError) {
          console.error("Failed to send welfare concern email:", emailError);
          // Don't fail the request if email fails
        }
      }
      
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
      
      const [incidents, concerns, caseFiles, escalations, riskReports, emergencyAlerts] = await Promise.all([
        storage.getIncidents(orgId),
        storage.getWelfareConcerns(orgId),
        storage.getCaseFiles(orgId),
        storage.getMissedCheckInEscalations(orgId),
        storage.getRiskReports(orgId),
        organizationStorage.getOrganizationEmergencyAlerts(orgId),
      ]);
      
      const openIncidents = incidents.filter(i => i.status === "open").length;
      const openConcerns = concerns.filter(c => c.status === "open").length;
      const openCases = caseFiles.filter(c => c.status === "open" || c.status === "monitoring").length;
      const pendingEscalations = escalations.filter(e => e.status === "pending").length;
      const unreviewedReports = riskReports.filter(r => !r.reviewedAt).length;
      
      const highRiskCases = caseFiles.filter(c => c.riskLevel === "red").length;
      const amberRiskCases = caseFiles.filter(c => c.riskLevel === "amber").length;
      
      // Convert emergency alerts to incident format and merge with incidents
      const emergencyIncidents = emergencyAlerts.map(alert => ({
        id: `emergency-${alert.id}`,
        incidentType: "emergency_alert",
        severity: alert.status === "active" ? "critical" : "high",
        description: `Emergency alert triggered${alert.what3words ? ` at ///${alert.what3words}` : ""}`,
        createdAt: alert.timestamp,
        status: alert.status === "active" ? "open" : "closed",
        clientId: null,
        clientName: alert.clientName,
        referenceCode: alert.referenceCode,
        what3words: alert.what3words,
        isEmergencyAlert: true,
      }));
      
      // Combine and sort all incidents by date
      const allIncidents = [
        ...incidents.map(i => ({ ...i, isEmergencyAlert: false })),
        ...emergencyIncidents,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({
        totalIncidents: incidents.length + emergencyAlerts.length,
        openIncidents: openIncidents + emergencyAlerts.filter(a => a.status === "active").length,
        totalConcerns: concerns.length,
        openConcerns,
        totalCaseFiles: caseFiles.length,
        openCases,
        pendingEscalations,
        unreviewedReports,
        highRiskCases,
        amberRiskCases,
        recentIncidents: allIncidents.slice(0, 5),
        recentConcerns: concerns.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching safeguarding summary:", error);
      res.status(500).json({ error: "Failed to fetch safeguarding summary" });
    }
  });

  // Get missed check-ins for organization's clients
  app.get("/api/org/missed-checkins", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const missedCheckIns = await organizationStorage.getOrganizationMissedCheckIns(orgId);
      res.json(missedCheckIns);
    } catch (error) {
      console.error("Error fetching missed check-ins:", error);
      res.status(500).json({ error: "Failed to fetch missed check-ins" });
    }
  });

  // Get emergency alerts for organization's clients
  app.get("/api/org/emergency-alerts", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const alerts = await organizationStorage.getOrganizationEmergencyAlerts(orgId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching emergency alerts:", error);
      res.status(500).json({ error: "Failed to fetch emergency alerts" });
    }
  });

  // Get deactivation confirmations for organization's clients
  app.get("/api/org/safeguarding/deactivation-confirmations", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const confirmations = await organizationStorage.getOrganizationDeactivationConfirmations(orgId);
      res.json(confirmations);
    } catch (error) {
      console.error("Error fetching deactivation confirmations:", error);
      res.status(500).json({ error: "Failed to fetch deactivation confirmations" });
    }
  });

  // ==================== STAFF INVITE ROUTES ====================

  const staffInviteSchema = z.object({
    staffName: z.string().min(1, "Staff name is required"),
    staffPhone: z.string().min(10, "Valid phone number is required"),
    staffEmail: z.string().email("Valid email is required").min(1, "Email is required"),
    bundleId: z.string().min(1, "Bundle is required"),
    emergencyContactName: z.string().min(1, "Emergency contact name is required"),
    emergencyContactPhone: z.string().min(10, "Emergency contact phone is required"),
    emergencyContactEmail: z.string().email("Valid email is required").min(1, "Emergency contact email is required"),
    emergencyContactRelationship: z.string().min(1, "Emergency contact relationship is required"),
    emergencyRecordingEnabled: z.boolean().optional().default(false),
  });

  app.get("/api/org/staff/invites", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const invites = await organizationStorage.getStaffInvites(orgId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching staff invites:", error);
      res.status(500).json({ error: "Failed to fetch staff invites" });
    }
  });

  app.post("/api/org/staff/invite", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const orgUser = req.user as any;

      const parsed = staffInviteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { staffName, staffPhone, staffEmail, bundleId, emergencyContactName, emergencyContactPhone, emergencyContactEmail, emergencyContactRelationship, emergencyRecordingEnabled } = parsed.data;

      const stats = await organizationStorage.getOrganizationDashboardStats(orgId);
      const bundle = stats.bundles.find(b => b.id === bundleId);
      if (!bundle || bundle.status !== "active") {
        return res.status(400).json({ error: "Invalid or inactive bundle" });
      }
      if (bundle.seatsUsed >= bundle.seatLimit) {
        return res.status(400).json({ error: "No seats available in this bundle" });
      }

      const inviteCode = "ST" + generateReferenceCode();

      const invite = await organizationStorage.createStaffInvite({
        organizationId: orgId,
        bundleId,
        staffName,
        staffPhone,
        staffEmail: staffEmail || undefined,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactEmail,
        emergencyContactRelationship,
        emergencyRecordingEnabled: emergencyRecordingEnabled ?? false,
        inviteCode,
      });

      await storage.createAuditEntry(orgId, {
        userEmail: orgUser.email,
        userRole: "organization",
        action: "created",
        entityType: "staff_invite",
        entityId: invite.id,
        newData: { staffName, staffPhone, staffEmail, bundleId, inviteCode },
        ipAddress: req.ip || undefined,
      });

      const smsResult = await sendStaffInviteSMS(staffPhone, inviteCode, orgUser.name || "Your organisation");

      if (emergencyContactEmail) {
        try {
          await sendEmergencyContactConfirmationForStaffInvite(
            emergencyContactName,
            emergencyContactEmail,
            staffName,
            orgUser.name || "Your organisation"
          );
          console.log(`[STAFF INVITE] Confirmation email sent to emergency contact ${emergencyContactEmail} for staff ${staffName}`);
        } catch (emailErr) {
          console.error("[STAFF INVITE] Failed to send emergency contact confirmation email:", emailErr);
        }
      }

      res.status(201).json({ invite, smsSent: smsResult.success, smsError: smsResult.error });
    } catch (error) {
      console.error("Error creating staff invite:", error);
      res.status(500).json({ error: "Failed to create staff invite" });
    }
  });

  const bulkStaffImportSchema = z.object({
    staff: z.array(z.object({
      staffName: z.string().min(1, "Staff name is required"),
      staffPhone: z.string().min(10, "Valid phone number is required"),
      staffEmail: z.string().email("Valid email is required"),
      emergencyContactName: z.string().min(1, "Emergency contact name is required"),
      emergencyContactEmail: z.string().email("Emergency contact email is required"),
      emergencyContactPhone: z.string().optional().or(z.literal("")),
      emergencyContactRelationship: z.string().optional().or(z.literal("")),
    })).min(1, "At least one staff member is required").max(100, "Maximum 100 staff per import"),
    bundleId: z.string().min(1, "Bundle is required"),
  });

  app.post("/api/org/staff/bulk-import", requireOrganization, async (req, res) => {
    try {
      const parsed = bulkStaffImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid import data" });
      }

      const { staff, bundleId } = parsed.data;
      const orgId = (req.user as any).id;
      const orgUser = req.user as any;

      const stats = await organizationStorage.getOrganizationDashboardStats(orgId);
      const bundle = stats.bundles.find(b => b.id === bundleId);
      if (!bundle || bundle.status !== "active") {
        return res.status(400).json({ error: "Invalid or inactive bundle" });
      }

      const availableSeats = bundle.seatLimit - bundle.seatsUsed;
      if (staff.length > availableSeats) {
        return res.status(400).json({ error: `Not enough seats. ${availableSeats} available, ${staff.length} requested.` });
      }

      const results: Array<{ row: number; staffName: string; success: boolean; inviteCode?: string; error?: string }> = [];

      for (let i = 0; i < staff.length; i++) {
        const member = staff[i];
        try {
          let inviteCode = "ST" + generateReferenceCode();
          let codeAttempts = 0;
          while (await organizationStorage.getStaffInviteByCode(inviteCode) && codeAttempts < 10) {
            inviteCode = "ST" + generateReferenceCode();
            codeAttempts++;
          }
          if (codeAttempts >= 10) {
            results.push({ row: i + 1, staffName: member.staffName, success: false, error: "Failed to generate unique invite code" });
            continue;
          }

          const invite = await organizationStorage.createStaffInvite({
            organizationId: orgId,
            bundleId,
            staffName: member.staffName,
            staffPhone: member.staffPhone,
            staffEmail: member.staffEmail || undefined,
            emergencyContactName: member.emergencyContactName,
            emergencyContactPhone: member.emergencyContactPhone || undefined,
            emergencyContactEmail: member.emergencyContactEmail,
            emergencyContactRelationship: member.emergencyContactRelationship || undefined,
            inviteCode,
          });

          await storage.createAuditEntry(orgId, {
            userEmail: orgUser.email,
            userRole: "organization",
            action: "created",
            entityType: "staff_invite",
            entityId: invite.id,
            newData: { staffName: member.staffName, staffPhone: member.staffPhone, staffEmail: member.staffEmail, bundleId, inviteCode, source: "bulk_import" },
            ipAddress: req.ip || undefined,
          });

          const smsResult = await sendStaffInviteSMS(member.staffPhone, inviteCode, orgUser.name || "Your organisation");

          if (member.emergencyContactEmail) {
            try {
              await sendEmergencyContactConfirmationForStaffInvite(
                member.emergencyContactName,
                member.emergencyContactEmail,
                member.staffName,
                orgUser.name || "Your organisation"
              );
            } catch (emailErr) {
              console.error("[STAFF BULK IMPORT] Failed to send EC confirmation email:", emailErr);
            }
          }

          results.push({ row: i + 1, staffName: member.staffName, success: true, inviteCode });
        } catch (err: any) {
          results.push({ row: i + 1, staffName: member.staffName, success: false, error: err.message || "Unknown error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      res.status(201).json({
        success: true,
        totalProcessed: staff.length,
        successCount,
        failCount,
        results,
      });
    } catch (error: any) {
      console.error("[ORG] Staff bulk import failed:", error);
      res.status(400).json({ error: error.message || "Staff bulk import failed" });
    }
  });

  app.post("/api/org/staff/invite/:inviteId/revoke", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const orgUser = req.user as any;
      const { inviteId } = req.params;
      const invites = await organizationStorage.getStaffInvites(orgId);
      const targetInvite = invites.find(i => i.id === inviteId);
      const success = await organizationStorage.revokeStaffInvite(inviteId, orgId);
      if (!success) {
        return res.status(404).json({ error: "Invite not found or already used" });
      }
      await storage.createAuditEntry(orgId, {
        userEmail: orgUser.email,
        userRole: "organization",
        action: "revoked",
        entityType: "staff_invite",
        entityId: inviteId,
        previousData: targetInvite ? { staffName: targetInvite.staffName, staffPhone: targetInvite.staffPhone } : undefined,
        ipAddress: req.ip || undefined,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking staff invite:", error);
      res.status(500).json({ error: "Failed to revoke staff invite" });
    }
  });

  app.delete("/api/org/staff/invite/:inviteId", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const orgUser = req.user as any;
      const { inviteId } = req.params;
      const invites = await organizationStorage.getStaffInvites(orgId);
      const targetInvite = invites.find(i => i.id === inviteId);
      const success = await organizationStorage.deleteStaffInvite(inviteId, orgId);
      if (!success) {
        return res.status(404).json({ error: "Invite not found" });
      }
      await storage.createAuditEntry(orgId, {
        userEmail: orgUser.email,
        userRole: "organization",
        action: "deleted",
        entityType: "staff_invite",
        entityId: inviteId,
        previousData: targetInvite ? { staffName: targetInvite.staffName, staffPhone: targetInvite.staffPhone, status: targetInvite.status } : undefined,
        ipAddress: req.ip || undefined,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting staff invite:", error);
      res.status(500).json({ error: "Failed to delete staff invite" });
    }
  });

  app.post("/api/org/staff/invite/:inviteId/resend", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const orgUser = req.user as any;
      const { inviteId } = req.params;
      const { staffName, staffPhone, staffEmail } = req.body || {};

      const invites = await organizationStorage.getStaffInvites(orgId);
      let invite = invites.find(i => i.id === inviteId && i.status === "pending");
      if (!invite) {
        return res.status(404).json({ error: "Invite not found or not pending" });
      }

      const hasUpdates = (staffName && staffName !== invite.staffName) ||
        (staffPhone && staffPhone !== invite.staffPhone) ||
        (staffEmail && staffEmail !== invite.staffEmail);
      if (hasUpdates) {
        const updated = await organizationStorage.updateStaffInviteDetails(inviteId, orgId, {
          ...(staffName ? { staffName } : {}),
          ...(staffPhone ? { staffPhone } : {}),
          ...(staffEmail ? { staffEmail } : {}),
        });
        if (updated) invite = updated;
      }

      const smsResult = await sendStaffInviteSMS(invite.staffPhone, invite.inviteCode, orgUser.name || "Your organisation");

      await storage.createAuditEntry(orgId, {
        userEmail: orgUser.email,
        userRole: "organization",
        action: "resent",
        entityType: "staff_invite",
        entityId: inviteId,
        newData: { staffName: invite.staffName, staffPhone: invite.staffPhone, staffEmail: invite.staffEmail, smsSent: smsResult.success },
        ipAddress: req.ip || undefined,
      });

      res.json({ success: smsResult.success, error: smsResult.error, invite });
    } catch (error) {
      console.error("Error resending staff invite:", error);
      res.status(500).json({ error: "Failed to resend staff invite" });
    }
  });

  app.get("/api/org/staff/stats", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const invites = await organizationStorage.getStaffInvites(orgId);
      const stats = await organizationStorage.getOrganizationDashboardStats(orgId);

      const totalInvites = invites.length;
      const pendingInvites = invites.filter(i => i.status === "pending").length;
      const acceptedInvites = invites.filter(i => i.status === "accepted").length;
      const revokedInvites = invites.filter(i => i.status === "revoked").length;

      const activeBundles = stats.bundles.filter(b => b.status === "active");
      const totalSeats = activeBundles.reduce((sum, b) => sum + b.seatLimit, 0);
      const usedSeats = activeBundles.reduce((sum, b) => sum + b.seatsUsed, 0);

      res.json({
        totalInvites,
        pendingInvites,
        acceptedInvites,
        revokedInvites,
        totalSeats,
        usedSeats,
        availableSeats: totalSeats - usedSeats,
        bundles: activeBundles,
      });
    } catch (error) {
      console.error("Error fetching staff stats:", error);
      res.status(500).json({ error: "Failed to fetch staff stats" });
    }
  });

  app.get("/api/org/staff/audit-trail", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string) || 200;
      const allTrail = await storage.getAuditTrail(orgId, 500);
      const staffTrail = allTrail.filter(e => e.entityType === "staff_invite" || e.entityType === "lone_worker_session").slice(0, limit);
      res.json(staffTrail);
    } catch (error) {
      console.error("Error fetching staff audit trail:", error);
      res.status(500).json({ error: "Failed to fetch staff audit trail" });
    }
  });

  // ===== TEAM MANAGEMENT (IAM) ENDPOINTS =====

  app.get("/api/org/team", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner" && req.orgRole !== "manager") {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      const members = await orgMemberStorage.getMembersByOrganization(req.orgId!);
      const invites = await orgMemberStorage.getInvitesByOrganization(req.orgId!);
      res.json({ members, invites });
    } catch (error) {
      console.error("[ORG_TEAM] Get team error:", error);
      res.status(500).json({ error: "Failed to get team" });
    }
  });

  app.post("/api/org/team/invite", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner") {
        return res.status(403).json({ error: "Only the owner can invite team members" });
      }
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

      const { sendTeamMemberInviteEmail } = await import("./notifications");
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
        console.error("[ORG_TEAM] Failed to send invite email:", emailError);
      }

      res.json({ invite });
    } catch (error) {
      console.error("[ORG_TEAM] Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.patch("/api/org/team/:memberId/role", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner") {
        return res.status(403).json({ error: "Only the owner can change roles" });
      }
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
      console.error("[ORG_TEAM] Update role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.patch("/api/org/team/:memberId/status", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner") {
        return res.status(403).json({ error: "Only the owner can change status" });
      }
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
      console.error("[ORG_TEAM] Update status error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/org/team/:memberId", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner") {
        return res.status(403).json({ error: "Only the owner can remove team members" });
      }
      const member = await orgMemberStorage.getMemberById(req.params.memberId);
      if (!member || member.organizationId !== req.orgId) {
        return res.status(404).json({ error: "Member not found" });
      }
      await orgMemberStorage.deleteMember(req.params.memberId);
      res.json({ success: true });
    } catch (error) {
      console.error("[ORG_TEAM] Delete member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.post("/api/org/team/invite/:inviteId/revoke", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner") {
        return res.status(403).json({ error: "Only the owner can revoke invites" });
      }
      const invite = await orgMemberStorage.updateInviteStatus(req.params.inviteId, "revoked");
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json({ invite });
    } catch (error) {
      console.error("[ORG_TEAM] Revoke invite error:", error);
      res.status(500).json({ error: "Failed to revoke invite" });
    }
  });

  app.post("/api/org/team/invite/:inviteId/resend", requireOrganization, async (req, res) => {
    try {
      if (req.orgRole !== "owner") {
        return res.status(403).json({ error: "Only the owner can resend invites" });
      }
      const invites = await orgMemberStorage.getInvitesByOrganization(req.orgId!);
      const invite = invites.find(i => i.id === req.params.inviteId);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      const { sendTeamMemberInviteEmail } = await import("./notifications");
      try {
        await sendTeamMemberInviteEmail(invite.email, invite.name, invite.inviteCode);
      } catch (emailError) {
        console.error("[ORG_TEAM] Failed to resend invite email:", emailError);
        return res.status(500).json({ error: "Failed to send email" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[ORG_TEAM] Resend invite error:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  // Public endpoint - verify staff invite code (no auth needed)
  app.get("/api/staff-invite/:code", async (req, res) => {
    try {
      const invite = await organizationStorage.getStaffInviteByCode(req.params.code);
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ error: "Invalid or expired invite code" });
      }
      const orgUser = await storage.getUserById(invite.organizationId);
      res.json({ 
        valid: true, 
        organizationName: orgUser?.name || "Organisation",
        staffName: invite.staffName,
        staffPhone: invite.staffPhone,
        staffEmail: invite.staffEmail || "",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify invite code" });
    }
  });
}
