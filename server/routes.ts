import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, organizationStorage } from "./storage";
import { insertContactSchema, updateContactSchema, updateSettingsSchema, insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import type { StatusData, UserProfile } from "@shared/schema";
import bcrypt from "bcrypt";
import { sendContactAddedNotification, sendPasswordResetEmail, sendSuccessfulCheckInNotification, sendEmergencyAlert, sendVoiceAlerts, sendLogoutNotification, sendSchedulePreferencesNotification, testSMSDelivery, diagnoseTwilioCredentials } from "./notifications";
import { registerAdminRoutes } from "./adminRoutes";
import { registerOrganizationRoutes } from "./organizationRoutes";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: UserProfile;
    }
  }
}

// Auth middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session;
  
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const user = await storage.getUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const { passwordHash, ...userProfile } = user;
  req.userId = user.id;
  req.user = userProfile;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register admin routes
  registerAdminRoutes(app);

  // Register organization routes (requires auth middleware for all /api/org/* routes)
  app.use("/api/org", authMiddleware);
  registerOrganizationRoutes(app);

  // Auth routes (public)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { 
        email, password, accountType, name, referenceId, dateOfBirth, 
        mobileNumber, addressLine1, addressLine2, city, postalCode, country 
      } = parsed.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        accountType,
        name,
        referenceId,
        dateOfBirth,
        mobileNumber,
        addressLine1,
        addressLine2,
        city,
        postalCode,
        country,
      });

      // Initialize settings for new user
      await storage.initializeSettings(user.id);

      // Create session
      const session = await storage.createSession(user.id);

      // Set cookie
      res.cookie("session", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days - client-side inactivity timer handles security
      });

      const { passwordHash: _, ...userProfile } = user;
      res.status(201).json(userProfile);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if user is disabled
      if (user.disabled) {
        return res.status(403).json({ error: "Your account has been disabled. Please contact support." });
      }

      // Create session
      const session = await storage.createSession(user.id);

      // Set cookie
      res.cookie("session", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days - client-side inactivity timer handles security
      });

      const { passwordHash, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.cookies?.session;
    if (sessionId) {
      await storage.deleteSession(sessionId);
    }
    res.clearCookie("session");
    res.json({ success: true });
  });

  // Activate/login org-managed client with reference code only
  app.post("/api/activate", async (req, res) => {
    try {
      const { referenceCode } = req.body;
      
      if (!referenceCode) {
        return res.status(400).json({ error: "Reference code is required" });
      }
      
      // Find the client by reference code
      const orgClient = await organizationStorage.getClientByReferenceCode(referenceCode.toUpperCase());
      if (!orgClient) {
        return res.status(404).json({ error: "Invalid reference code. Please check and try again." });
      }
      
      let user;
      
      // Check if client already has a linked user account
      if (orgClient.clientId) {
        // Already activated - just log them in
        user = await storage.getUserById(orgClient.clientId);
        if (!user) {
          return res.status(404).json({ error: "Account not found. Please contact your organization." });
        }
      } else {
        // First time activation - create a minimal user account
        // Use reference code as email placeholder (clients don't need real email)
        const placeholderEmail = `${referenceCode.toLowerCase()}@client.aok.local`;
        
        // Create user with no password (reference code is the auth method)
        user = await storage.createUser({
          email: placeholderEmail,
          passwordHash: "", // No password needed - reference code is auth
          name: orgClient.clientName || "Client",
          accountType: "individual",
          referenceId: orgClient.referenceCode || undefined,
          mobileNumber: orgClient.clientPhone || undefined,
        });
        
        // Link the client to the new user
        await organizationStorage.linkClientToUser(orgClient.id, user.id);
        
        // Create initial settings using org-defined schedule
        const now = new Date();
        let nextDue = new Date();
        
        if (orgClient.scheduleStartTime) {
          const scheduleTime = new Date(orgClient.scheduleStartTime);
          nextDue.setHours(scheduleTime.getHours(), scheduleTime.getMinutes(), 0, 0);
          if (nextDue <= now) {
            nextDue.setDate(nextDue.getDate() + 1);
          }
        } else {
          nextDue.setHours(now.getHours() + (orgClient.checkInIntervalHours || 24));
        }
        
        await storage.updateSettings(user.id, {
          frequency: orgClient.checkInIntervalHours === 24 ? "daily" : 
                     orgClient.checkInIntervalHours === 48 ? "every_two_days" : "daily",
          alertsEnabled: true,
        });
        
        // Copy pending contacts to user's contacts
        const pendingContacts = await organizationStorage.getPendingClientContacts(orgClient.id);
        for (const contact of pendingContacts) {
          if (contact.email && contact.name) {
            await storage.createContact(user.id, {
              name: contact.name,
              email: contact.email,
              phone: contact.phone ?? undefined,
              phoneType: (contact.phoneType ?? "mobile") as "mobile" | "landline",
              relationship: contact.relationship ?? "Emergency Contact",
            });
          }
        }
      }
      
      // Create session and log them in directly
      const session = await storage.createSession(user.id);
      
      res.cookie("session", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: session.expiresAt,
      });
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          referenceId: user.referenceId,
        }
      });
    } catch (error) {
      console.error("Activation error:", error);
      res.status(500).json({ error: "Failed to sign in. Please try again." });
    }
  });

  app.post("/api/auth/logout-confirmed", async (req, res) => {
    try {
      const sessionId = req.cookies?.session;
      if (!sessionId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }

      const user = await storage.getUserById(session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { password, location } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      // Get all primary contacts and send logout notification to each with location
      const contacts = await storage.getContacts(user.id);
      const primaryContacts = contacts.filter(c => c.isPrimary);
      
      let notificationsSent = 0;
      for (const primaryContact of primaryContacts) {
        const result = await sendLogoutNotification(primaryContact, user, location);
        if (result.sent) notificationsSent++;
      }

      await storage.deleteSession(sessionId);
      res.clearCookie("session");
      res.json({ success: true, notificationsSent });
    } catch (error) {
      console.error("Logout confirmation error:", error);
      res.status(500).json({ error: "Failed to process logout" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const sessionId = req.cookies?.session;
    
    if (!sessionId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const user = await storage.getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check if user is disabled
    if (user.disabled) {
      await storage.deleteSession(sessionId);
      res.clearCookie("session");
      return res.status(403).json({ error: "Your account has been disabled. Please contact support." });
    }

    const { passwordHash, ...userProfile } = user;
    res.json(userProfile);
  });

  // Forgot password (public) - always returns success to prevent email enumeration
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid email" });
      }

      const { email } = parsed.data;
      const user = await storage.getUserByEmail(email.toLowerCase());

      if (user) {
        // Generate reset token
        const rawToken = await storage.createPasswordResetToken(user.id);
        
        // Build full reset URL
        const baseUrl = process.env.NODE_ENV === "production" 
          ? `https://${req.get('host')}`
          : `http://${req.get('host')}`;
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
        
        // Send password reset email
        try {
          await sendPasswordResetEmail(user.email, resetUrl, user.name);
        } catch (error) {
          console.error("Failed to send password reset email:", error);
          // Log in development for testing
          if (process.env.NODE_ENV !== "production") {
            console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
          }
        }
      }

      // Always return success to prevent email enumeration
      res.json({ success: true, message: "If an account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password (public)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { token, password } = parsed.data;

      // Validate token
      const tokenData = await storage.validatePasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password
      await storage.updateUserPassword(tokenData.userId, passwordHash);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(tokenData.tokenId);

      // Invalidate all existing sessions for this user
      await storage.deleteAllUserSessions(tokenData.userId);

      res.json({ success: true, message: "Password reset successfully. Please log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Protected routes - all require authentication
  app.use("/api/status", authMiddleware);
  app.use("/api/alerts", authMiddleware);
  app.use("/api/contacts", authMiddleware);
  app.use("/api/checkins", authMiddleware);
  app.use("/api/settings", authMiddleware);
  app.use("/api/emergency", authMiddleware);

  // Get status data for dashboard
  app.get("/api/status", async (req, res) => {
    try {
      const userId = req.userId!;
      await storage.processOverdueCheckIn(userId);
      
      const settings = await storage.getSettings(userId);
      const checkIns = await storage.getCheckIns(userId);
      const contacts = await storage.getContacts(userId);
      
      let status: StatusData["status"] = "safe";
      let hoursUntilDue: number | null = null;
      
      if (settings.nextCheckInDue) {
        const now = new Date();
        const dueDate = new Date(settings.nextCheckInDue);
        const diffMs = dueDate.getTime() - now.getTime();
        hoursUntilDue = Math.round(diffMs / (1000 * 60 * 60));
        
        if (diffMs < 0) {
          status = "overdue";
        } else if (hoursUntilDue <= 6) {
          status = "pending";
        }
      } else if (!settings.lastCheckIn) {
        status = "pending";
      }

      let streak = 0;
      if (checkIns.length > 0) {
        const successfulCheckIns = checkIns.filter(c => c.status === "success");
        const dates = new Set<string>();
        successfulCheckIns.forEach(c => {
          dates.add(new Date(c.timestamp).toDateString());
        });
        streak = dates.size;
      }

      const statusData: StatusData = {
        status,
        lastCheckIn: settings.lastCheckIn,
        nextCheckInDue: settings.nextCheckInDue,
        streak,
        hoursUntilDue,
        contactCount: contacts.length,
      };

      res.json(statusData);
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Get alert logs (7 days for regular users)
  app.get("/api/alerts", async (req, res) => {
    try {
      // Cleanup old alerts (older than 30 days) in the background
      storage.cleanupOldAlerts().catch(err => console.log("[cleanup] Failed to cleanup old alerts:", err));
      
      // Show only last 7 days for regular users
      const alerts = await storage.getAlertLogsForUser(req.userId!);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  // Contacts CRUD
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.userId!);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const parsed = insertContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const contact = await storage.createContact(req.userId!, parsed.data);
      
      // Send notification to the new contact (email and SMS)
      const user = await storage.getUserById(req.userId!);
      if (user) {
        // Fire and forget - don't block the response
        sendContactAddedNotification(contact, user).catch(err => {
          console.error("Failed to send contact notification:", err);
        });
      }
      
      res.status(201).json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = updateContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const contact = await storage.updateContact(req.userId!, id, parsed.data);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  // Set a contact as the primary contact (receives notifications for every check-in)
  app.post("/api/contacts/:id/primary", async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await storage.setPrimaryContact(req.userId!, id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to set primary contact" });
    }
  });

  // Update a contact
  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, phoneType, relationship } = req.body;

      // At minimum, name and email are required
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      const updated = await storage.updateContact(req.userId!, id, {
        name,
        email,
        phone: phone || null,
        phoneType: phone ? (phoneType || "mobile") : null,
        relationship,
      });

      if (!updated) {
        return res.status(404).json({ error: "Contact not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      const contacts = await storage.getContacts(req.userId!);
      const contactToDelete = contacts.find(c => c.id === id);
      
      if (!contactToDelete) {
        return res.status(404).json({ error: "Contact not found" });
      }

      // Don't allow deletion of the last contact
      if (contacts.length === 1) {
        return res.status(400).json({ error: "At least one emergency contact is required for aok to function properly." });
      }

      // Organizations require password to delete contacts (protect vulnerable individuals)
      const user = await storage.getUserById(req.userId!);
      if (user?.accountType === "organization") {
        if (!password) {
          return res.status(400).json({ error: "Password required to remove contacts", requiresPassword: true });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: "Incorrect password" });
        }
      }

      const deleted = await storage.deleteContact(req.userId!, id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }

      // If we deleted the primary contact, promote the first remaining contact to primary
      if (contactToDelete.isPrimary) {
        const remainingContacts = contacts.filter(c => c.id !== id);
        if (remainingContacts.length > 0) {
          await storage.setPrimaryContact(req.userId!, remainingContacts[0].id);
        }
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Check-ins
  app.get("/api/checkins", async (req, res) => {
    try {
      const checkIns = await storage.getCheckIns(req.userId!);
      res.json(checkIns);
    } catch (error) {
      res.status(500).json({ error: "Failed to get check-ins" });
    }
  });

  app.post("/api/checkins", async (req, res) => {
    try {
      // Require at least one contact before check-in
      const contacts = await storage.getContacts(req.userId!);
      if (contacts.length === 0) {
        return res.status(400).json({ error: "Please add at least one emergency contact before checking in" });
      }
      
      const checkIn = await storage.createCheckIn(req.userId!);
      
      // Notify ALL primary contacts
      const primaryContacts = await storage.getPrimaryContacts(req.userId!);
      if (primaryContacts.length > 0 && req.user) {
        // Send notifications to all primary contacts asynchronously
        for (const contact of primaryContacts) {
          sendSuccessfulCheckInNotification(contact, req.user as any).catch(err => {
            console.error('[CHECK-IN] Failed to notify primary contact:', contact.email, err);
          });
        }
        console.log(`[CHECK-IN] Notifying ${primaryContacts.length} primary contact(s) of successful check-in`);
      }
      
      res.status(201).json(checkIn);
    } catch (error) {
      res.status(500).json({ error: "Failed to create check-in" });
    }
  });

  // Emergency alert endpoint
  app.post("/api/emergency", async (req, res) => {
    try {
      console.log('[EMERGENCY] Request from userId:', req.userId);
      const contacts = await storage.getContacts(req.userId!);
      console.log('[EMERGENCY] Found contacts:', contacts.length, contacts.map(c => c.name));
      
      if (contacts.length === 0) {
        return res.status(400).json({ error: "No emergency contacts configured" });
      }

      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const location = req.body?.location as { latitude: number; longitude: number } | undefined;
      
      // Send email and SMS alerts
      const alertResult = await sendEmergencyAlert(contacts, user, location);
      
      // Send voice calls to landline contacts
      const voiceResult = await sendVoiceAlerts(contacts, user, 'emergency');
      
      // Log the emergency alert
      const notificationSummary = [];
      if (alertResult.emailsSent > 0) {
        notificationSummary.push(`${alertResult.emailsSent} email(s)`);
      }
      if (alertResult.smsSent > 0) {
        notificationSummary.push(`${alertResult.smsSent} SMS(s)`);
      }
      if (voiceResult.callsMade > 0) {
        notificationSummary.push(`${voiceResult.callsMade} voice call(s)`);
      }
      
      await storage.createAlertLog(
        req.userId!, 
        contacts.map(c => c.email),
        `EMERGENCY ALERT triggered - ${notificationSummary.join(', ') || 'no contacts'} notified`
      );

      const totalNotified = alertResult.emailsSent + alertResult.smsSent + voiceResult.callsMade;
      let message = `Emergency alert sent to ${alertResult.emailsSent} email(s)`;
      if (alertResult.smsSent > 0) {
        message += `, ${alertResult.smsSent} SMS(s)`;
      }
      if (voiceResult.callsMade > 0) {
        message += ` and ${voiceResult.callsMade} voice call(s)`;
      }

      res.json({ 
        success: true, 
        emailsSent: alertResult.emailsSent,
        smsSent: alertResult.smsSent,
        voiceCallsMade: voiceResult.callsMade,
        contactsNotified: totalNotified,
        message 
      });
    } catch (error) {
      console.error('[EMERGENCY] Failed to send emergency alert:', error);
      res.status(500).json({ error: "Failed to send emergency alert" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings(req.userId!);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { password, ...settingsData } = parsed.data;

      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get current settings to check if schedule is already set
      const currentSettings = await storage.getSettings(req.userId!);
      
      // Check if password is required for this change
      const requiresPassword = 
        settingsData.alertsEnabled === false || // Disabling alerts always requires password
        (user.accountType === "organization" && settingsData.intervalHours !== undefined) || // Organizations need password for timer changes
        (currentSettings.scheduleStartTime && settingsData.scheduleStartTime !== undefined); // Password required to change schedule once set

      if (requiresPassword) {
        if (!password) {
          return res.status(400).json({ error: "Password required for this change" });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: "Incorrect password" });
        }
      }

      const settings = await storage.updateSettings(req.userId!, settingsData);
      
      // Send schedule preferences notification to primary contacts when schedule is set
      if (settingsData.scheduleStartTime) {
        const primaryContacts = await storage.getPrimaryContacts(req.userId!);
        if (primaryContacts.length > 0) {
          sendSchedulePreferencesNotification(
            primaryContacts,
            user as any,
            settingsData.scheduleStartTime,
            settings.intervalHours
          ).catch(err => {
            console.error('[SETTINGS] Failed to send schedule notification:', err);
          });
          console.log(`[SETTINGS] Notifying ${primaryContacts.length} primary contact(s) of schedule preferences`);
        }
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Push subscription endpoints
  app.get("/api/push/vapid-public-key", async (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID public key not configured" });
    }
    res.json({ publicKey });
  });

  app.get("/api/push/subscription", async (req, res) => {
    try {
      const subscriptions = await storage.getPushSubscriptions(req.userId!);
      res.json({ hasSubscription: subscriptions.length > 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      const subscription = await storage.createPushSubscription(req.userId!, {
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth }
      });
      
      res.status(201).json({ success: true, id: subscription.id });
    } catch (error) {
      console.error('[PUSH] Failed to create subscription:', error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await storage.deletePushSubscription(req.userId!, endpoint);
      } else {
        await storage.deleteAllPushSubscriptions(req.userId!);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  // Test email endpoint (temporary for debugging)
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }
      
      const { Resend } = await import('resend');
      
      // Use RESEND_API_KEY2 or RESEND_API_KEY secret
      const apiKey = process.env.RESEND_API_KEY2 || process.env.RESEND_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'RESEND_API_KEY not set' });
      }

      const resend = new Resend(apiKey);
      const fromEmail = 'aok <onboarding@resend.dev>';
      
      console.log(`[TEST EMAIL] Sending to ${email} from ${fromEmail}`);
      
      const result = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: 'aok Test Email',
        text: `This is a test email from aok to verify the email system is working correctly.\n\nSent at: ${new Date().toISOString()}`,
      });
      
      console.log(`[TEST EMAIL] Result:`, result);
      res.json({ success: true, result, fromEmail });
    } catch (error: any) {
      console.error('[TEST EMAIL] Error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Diagnose Twilio credentials (no SMS sent)
  app.get("/api/diagnose-twilio", async (req, res) => {
    try {
      const result = await diagnoseTwilioCredentials();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test SMS endpoint - requires phone number
  app.post("/api/test-sms", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number required" });
      }
      
      console.log(`[TEST SMS ENDPOINT] Testing SMS to ${phoneNumber}`);
      const result = await testSMSDelivery(phoneNumber);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Test SMS sent successfully",
          ...result 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "SMS delivery failed",
          ...result 
        });
      }
    } catch (error: any) {
      console.error('[TEST SMS ENDPOINT] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
