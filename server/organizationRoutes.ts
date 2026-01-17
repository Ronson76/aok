import { Express, Request, Response } from "express";
import { organizationStorage, storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import { updateOrganizationClientProfileSchema, orgClientStatuses } from "@shared/schema";

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
}
