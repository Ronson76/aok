import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, organizationStorage } from "./storage";
import { insertContactSchema, updateContactSchema, updateSettingsSchema, insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import type { StatusData, UserProfile } from "@shared/schema";
import bcrypt from "bcrypt";
import { sendContactAddedNotification, sendContactConfirmationEmail, sendPasswordResetEmail, sendSuccessfulCheckInNotification, sendEmergencyAlert, sendVoiceAlerts, sendLogoutNotification, sendSchedulePreferencesNotification, testSMSDelivery, diagnoseTwilioCredentials, sendTestEmail, sendPrimaryContactPromotionNotification } from "./notifications";
import { registerAdminRoutes } from "./adminRoutes";
import { registerOrganizationRoutes } from "./organizationRoutes";

// Helper function to render a simple HTML confirmation page
function renderConfirmationPage(success: boolean, message: string): string {
  const bgColor = success ? '#22c55e' : '#ef4444';
  const icon = success ? '&#10004;' : '&#10008;';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>aok - Contact Confirmation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${bgColor};
      color: white;
      font-size: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #64748b;
      line-height: 1.6;
      font-size: 16px;
    }
    .logo {
      color: #3b82f6;
      font-weight: bold;
      font-size: 28px;
      margin-bottom: 32px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">aok</div>
    <div class="icon">${icon}</div>
    <h1>${success ? 'Success' : 'Error'}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

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

import path from "path";
import fs from "fs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Serve promotional videos for download
  app.get("/promo-video.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/safety_check-in_app_promo.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-promo-video.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/promo-checkin.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/check-in_button_tap_scene.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-checkin-scene.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/promo-emergency.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/emergency_gps_tracking_scene.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-emergency-scene.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/promo-alerts.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/contacts_receiving_alerts_scene.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-alerts-scene.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/promo-org.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/organization_dashboard_monitoring.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-org-dashboard-scene.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/promo-family.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/family_peace_of_mind_scene.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-family-scene.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/promo-complete.mp4", (_req, res) => {
    const videoPath = path.resolve(process.cwd(), "attached_assets/generated_videos/aok_complete_promo.mp4");
    if (fs.existsSync(videoPath)) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-complete-promo.mp4"');
      res.sendFile(videoPath);
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  });
  
  app.get("/aok-logo.jpg", (_req, res) => {
    const logoPath = path.resolve(process.cwd(), "attached_assets/generated_images/aok_shield_logo.jpg");
    if (fs.existsSync(logoPath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Disposition", 'attachment; filename="aok-shield-logo.jpg"');
      res.sendFile(logoPath);
    } else {
      res.status(404).json({ error: "Logo not found" });
    }
  });

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
              phone: contact.phone || "",
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

  // Accept terms and conditions
  app.post("/api/auth/accept-terms", async (req, res) => {
    const sessionId = req.cookies?.session;
    
    if (!sessionId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    try {
      await storage.acceptTerms(session.userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[ACCEPT TERMS] Error:', error);
      res.status(500).json({ error: "Failed to accept terms" });
    }
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

  // Contact confirmation endpoint (public - no auth required)
  // This handles both accept and decline actions via query params
  app.get("/api/contacts/confirm", async (req, res) => {
    try {
      const { token, action } = req.query;
      
      console.log("[CONFIRM] Received confirmation request:", { 
        token: token ? `${String(token).substring(0, 10)}...` : 'missing', 
        action,
        tokenLength: token ? String(token).length : 0
      });
      
      if (!token || typeof token !== 'string') {
        console.log("[CONFIRM] Invalid token format");
        return res.status(400).send(renderConfirmationPage(false, "Invalid confirmation link."));
      }
      
      const contact = await storage.getContactByToken(token);
      
      console.log("[CONFIRM] Contact lookup result:", contact ? { id: contact.id, name: contact.name, confirmedAt: contact.confirmedAt } : 'not found');
      
      if (!contact) {
        console.log("[CONFIRM] Contact not found for token");
        return res.status(404).send(renderConfirmationPage(false, "This confirmation link has expired or is invalid."));
      }
      
      // Check if already confirmed
      if (contact.confirmedAt) {
        return res.send(renderConfirmationPage(true, "You have already confirmed this request."));
      }
      
      // Check if expired
      if (contact.confirmationExpiry && new Date(contact.confirmationExpiry) < new Date()) {
        await storage.declineContact(contact.id);
        return res.status(410).send(renderConfirmationPage(false, "This confirmation link has expired. Please ask to be added again."));
      }
      
      if (action === 'decline') {
        await storage.declineContact(contact.id);
        return res.send(renderConfirmationPage(true, "You have declined to be an emergency contact. The request has been removed."));
      }
      
      // Accept (confirm) the contact
      const confirmedContact = await storage.confirmContact(contact.id);
      
      if (confirmedContact) {
        // Send confirmation notification to the contact
        const user = await storage.getUserById(confirmedContact.userId);
        if (user) {
          sendContactAddedNotification(confirmedContact, user).catch(err => {
            console.error("Failed to send contact confirmed notification:", err);
          });
        }
        
        return res.send(renderConfirmationPage(true, "Thank you! You are now an emergency contact. You will receive notifications if the person misses a check-in."));
      }
      
      return res.status(500).send(renderConfirmationPage(false, "Something went wrong. Please try again."));
    } catch (error) {
      console.error("Contact confirmation error:", error);
      res.status(500).send(renderConfirmationPage(false, "Something went wrong. Please try again."));
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
    console.log("[ROUTES] POST /api/contacts called for user:", req.userId);
    try {
      const parsed = insertContactSchema.safeParse(req.body);
      if (!parsed.success) {
        console.log("[ROUTES] Validation failed:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      console.log("[ROUTES] Creating contact:", parsed.data.name, parsed.data.email);
      const { contact, confirmationToken } = await storage.createContact(req.userId!, parsed.data);
      console.log("[ROUTES] Contact created with ID:", contact.id, "Token length:", confirmationToken?.length);
      
      // Send confirmation email to the new contact (they must confirm before becoming active)
      const user = await storage.getUserById(req.userId!);
      if (user) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        console.log("[ROUTES] Sending confirmation email to:", contact.email, "baseUrl:", baseUrl);
        // Fire and forget - don't block the response
        sendContactConfirmationEmail(contact, user, confirmationToken, baseUrl).then(result => {
          console.log("[ROUTES] Confirmation email result:", result);
        }).catch(err => {
          console.error("[ROUTES] Failed to send contact confirmation email:", err);
        });
      } else {
        console.log("[ROUTES] Could not find user for confirmation email");
      }
      
      // Return the contact with a pending status indication
      res.status(201).json({
        ...contact,
        pending: true,
        message: "Confirmation email sent. Contact must confirm within 10 minutes."
      });
    } catch (error) {
      console.error("[ROUTES] Error creating contact:", error);
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

      // All users require password to delete contacts (security protection)
      const user = await storage.getUserById(req.userId!);
      if (!password) {
        return res.status(400).json({ error: "Password required to remove contacts", requiresPassword: true });
      }

      const isValid = await bcrypt.compare(password, user!.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Incorrect password" });
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
          
          // Notify the newly promoted primary contact
          const user = await storage.getUserById(req.userId!);
          if (user) {
            await sendPrimaryContactPromotionNotification(remainingContacts[0], user);
          }
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

  // Emergency alert endpoint - activates red alert mode if continuous tracking is enabled
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

      // Check if continuous location tracking is enabled
      const userSettings = await storage.getSettings(req.userId!);
      const continuousTrackingEnabled = userSettings.redAlertEnabled;

      const location = req.body?.location as { latitude: number; longitude: number } | undefined;
      
      let activeAlert = null;
      
      // Only create active emergency alert if continuous tracking is enabled
      if (continuousTrackingEnabled) {
        // Check if user already has an active emergency alert
        const existingAlert = await storage.getActiveEmergencyAlert(req.userId!);
        if (existingAlert) {
          return res.status(400).json({ error: "An emergency alert is already active" });
        }
        
        activeAlert = await storage.createActiveEmergencyAlert(
          req.userId!,
          location?.latitude?.toString() || null,
          location?.longitude?.toString() || null
        );
        console.log('[EMERGENCY] Created active alert (continuous tracking):', activeAlert.id);
      } else {
        console.log('[EMERGENCY] Sending one-time alert (no continuous tracking)');
      }
      
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
      
      const alertType = continuousTrackingEnabled ? 'EMERGENCY ALERT (continuous tracking)' : 'EMERGENCY ALERT (one-time)';
      await storage.createAlertLog(
        req.userId!, 
        contacts.map(c => c.email),
        `${alertType} triggered - ${notificationSummary.join(', ') || 'no contacts'} notified`
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
        isRedAlert: continuousTrackingEnabled,
        alertId: activeAlert?.id || null,
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

  // Get emergency alert status (check if in red alert mode)
  app.get("/api/emergency/status", async (req, res) => {
    try {
      const activeAlert = await storage.getActiveEmergencyAlert(req.userId!);
      res.json({
        isRedAlert: !!activeAlert,
        alertId: activeAlert?.id || null,
        activatedAt: activeAlert?.activatedAt || null,
        lastDispatchAt: activeAlert?.lastDispatchAt || null,
        latitude: activeAlert?.latitude || null,
        longitude: activeAlert?.longitude || null,
      });
    } catch (error) {
      console.error('[EMERGENCY] Failed to get alert status:', error);
      res.status(500).json({ error: "Failed to get alert status" });
    }
  });

  // Update location during red alert (heartbeat)
  app.post("/api/emergency/heartbeat", async (req, res) => {
    try {
      const activeAlert = await storage.getActiveEmergencyAlert(req.userId!);
      if (!activeAlert) {
        return res.status(400).json({ error: "No active emergency alert" });
      }

      const { latitude, longitude } = req.body;
      if (latitude && longitude) {
        await storage.updateEmergencyAlertLocation(
          activeAlert.id,
          latitude.toString(),
          longitude.toString()
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[EMERGENCY] Failed to update heartbeat:', error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Rate limiting for deactivation attempts - track failed attempts per user
  const deactivationAttempts: Map<string, { attempts: number; lastAttempt: number }> = new Map();
  const MAX_DEACTIVATION_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  // Deactivate emergency alert with password verification
  app.post("/api/emergency/deactivate", async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Check rate limiting
      const attemptInfo = deactivationAttempts.get(userId);
      if (attemptInfo && attemptInfo.attempts >= MAX_DEACTIVATION_ATTEMPTS) {
        const timeSinceLockout = Date.now() - attemptInfo.lastAttempt;
        if (timeSinceLockout < LOCKOUT_DURATION_MS) {
          const remainingMinutes = Math.ceil((LOCKOUT_DURATION_MS - timeSinceLockout) / 60000);
          console.log(`[EMERGENCY] Deactivation locked for user ${userId} - ${attemptInfo.attempts} failed attempts`);
          return res.status(429).json({ error: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.` });
        } else {
          // Lockout expired, reset attempts
          deactivationAttempts.delete(userId);
        }
      }
      
      const activeAlert = await storage.getActiveEmergencyAlert(userId);
      if (!activeAlert) {
        return res.status(400).json({ error: "No active emergency alert" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      // Verify password
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Track failed attempt
        const current = deactivationAttempts.get(userId) || { attempts: 0, lastAttempt: 0 };
        deactivationAttempts.set(userId, { 
          attempts: current.attempts + 1, 
          lastAttempt: Date.now() 
        });
        const remaining = MAX_DEACTIVATION_ATTEMPTS - (current.attempts + 1);
        console.log(`[EMERGENCY] Failed deactivation attempt for user ${userId} - ${remaining} attempts remaining`);
        return res.status(401).json({ error: remaining > 0 ? `Incorrect password. ${remaining} attempts remaining.` : "Incorrect password. Account locked for 15 minutes." });
      }

      // Successful password verification - reset attempts
      deactivationAttempts.delete(userId);

      // Deactivate the alert
      await storage.deactivateEmergencyAlert(activeAlert.id);
      
      // Log the deactivation
      await storage.createAlertLog(
        userId,
        [],
        `Emergency alert deactivated by user - confirmed safe`
      );

      res.json({ success: true, message: "Emergency alert deactivated" });
    } catch (error) {
      console.error('[EMERGENCY] Failed to deactivate alert:', error);
      res.status(500).json({ error: "Failed to deactivate alert" });
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
      
      // Update pushStatus to enabled
      await storage.updateSettings(req.userId!, { pushStatus: "enabled" });
      
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
      
      // Update pushStatus to declined (user intentionally disabled)
      await storage.updateSettings(req.userId!, { pushStatus: "declined" });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove subscription" });
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
          message: "Test SMS sent successfully",
          ...result 
        });
      } else {
        res.status(500).json({ 
          message: "SMS delivery failed",
          ...result 
        });
      }
    } catch (error: any) {
      console.error('[TEST SMS ENDPOINT] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address required" });
      }
      
      console.log(`[TEST EMAIL ENDPOINT] Testing email to ${email}`);
      const result = await sendTestEmail(email);
      
      if (result.success) {
        res.json({ message: "Test email sent successfully", ...result });
      } else {
        res.status(500).json({ message: "Email delivery failed", ...result });
      }
    } catch (error: any) {
      console.error('[TEST EMAIL ENDPOINT] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
