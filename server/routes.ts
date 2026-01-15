import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, updateContactSchema, updateSettingsSchema, insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import type { StatusData, UserProfile } from "@shared/schema";
import bcrypt from "bcrypt";
import { sendContactAddedNotification, sendPasswordResetEmail, sendSuccessfulCheckInNotification, sendEmergencyAlert } from "./notifications";
import { registerAdminRoutes } from "./adminRoutes";

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
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
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

      // Create session
      const session = await storage.createSession(user.id);

      // Set cookie
      res.cookie("session", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000,
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

  // Get status data for dashboard
  app.get("/api/status", async (req, res) => {
    try {
      const userId = req.userId!;
      await storage.processOverdueCheckIn(userId);
      
      const settings = await storage.getSettings(userId);
      const checkIns = await storage.getCheckIns(userId);
      
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
      };

      res.json(statusData);
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Get alert logs
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlertLogs(req.userId!);
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

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContact(req.userId!, id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
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
      const checkIn = await storage.createCheckIn(req.userId!);
      
      // Notify primary contact if one exists
      const primaryContact = await storage.getPrimaryContact(req.userId!);
      if (primaryContact && req.user) {
        // Send notification asynchronously (don't wait for it)
        sendSuccessfulCheckInNotification(primaryContact, req.user as any).catch(err => {
          console.error('[CHECK-IN] Failed to notify primary contact:', err);
        });
      }
      
      res.status(201).json(checkIn);
    } catch (error) {
      res.status(500).json({ error: "Failed to create check-in" });
    }
  });

  // Emergency alert endpoint
  app.post("/api/emergency", async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.userId!);
      
      if (contacts.length === 0) {
        return res.status(400).json({ error: "No emergency contacts configured" });
      }

      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const result = await sendEmergencyAlert(contacts, user);
      
      // Log the emergency alert
      await storage.createAlertLog(
        req.userId!, 
        contacts.map(c => c.email),
        `EMERGENCY ALERT triggered - ${result.emailsSent} contacts notified`
      );

      res.json({ 
        success: true, 
        contactsNotified: result.emailsSent,
        message: `Emergency alert sent to ${result.emailsSent} contact(s)` 
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

      // If trying to disable alerts, require password verification
      if (settingsData.alertsEnabled === false) {
        if (!password) {
          return res.status(400).json({ error: "Password required to disable alerts" });
        }

        const user = await storage.getUserById(req.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: "Incorrect password" });
        }
      }

      const settings = await storage.updateSettings(req.userId!, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
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
      const fromEmail = 'CheckMate <onboarding@resend.dev>';
      
      console.log(`[TEST EMAIL] Sending to ${email} from ${fromEmail}`);
      
      const result = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: 'CheckMate Test Email',
        text: `This is a test email from CheckMate to verify the email system is working correctly.\n\nSent at: ${new Date().toISOString()}`,
      });
      
      console.log(`[TEST EMAIL] Result:`, result);
      res.json({ success: true, result, fromEmail });
    } catch (error: any) {
      console.error('[TEST EMAIL] Error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  return httpServer;
}
