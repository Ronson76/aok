import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, organizationStorage, adminStorage } from "./storage";
import { insertContactSchema, updateContactSchema, updateSettingsSchema, insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, insertMoodEntrySchema, insertPetSchema, updatePetSchema, insertDigitalDocumentSchema, updateDigitalDocumentSchema } from "@shared/schema";
import type { StatusData, UserProfile } from "@shared/schema";
import bcrypt from "bcrypt";
import { sendContactAddedNotification, sendContactConfirmationEmail, sendPasswordResetEmail, sendSuccessfulCheckInNotification, sendEmergencyAlert, sendVoiceAlerts, sendLogoutNotification, sendSchedulePreferencesNotification, testSMSDelivery, diagnoseTwilioCredentials, sendTestEmail, sendPrimaryContactPromotionNotification, sendContactRemovedNotification, sendWelcomeEmail } from "./notifications";
import { registerAdminRoutes } from "./adminRoutes";
import { registerOrganizationRoutes } from "./organizationRoutes";
import { registerWellbeingAIRoutes } from "./wellbeingAI";
import { getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";
import { stripeService } from "./stripeService";
import { getEcologiImpact, plantTreeForNewSubscriber, isTestMode as isEcologiTestMode } from "./ecologiService";

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

// Helper function to render a safety confirmation page
function renderSafetyConfirmationPage(success: boolean, message: string, userName: string | null): string {
  const bgColor = success ? '#22c55e' : '#ef4444';
  const icon = success ? '&#10004;' : '&#10008;';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>aok - Safety Confirmation</title>
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
      max-width: 450px;
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
      color: #22c55e;
      font-weight: bold;
      font-size: 28px;
      margin-bottom: 32px;
    }
    .subtitle {
      color: #22c55e;
      font-size: 14px;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">aok</div>
    <div class="icon">${icon}</div>
    <h1>${success ? 'Confirmation Recorded' : 'Error'}</h1>
    <p>${message}</p>
    ${success && userName ? `<p class="subtitle">Thank you for confirming you have spoken to ${userName}.</p>` : ''}
  </div>
</body>
</html>`;
}

function renderSafetyConfirmationForm(token: string, userName: string, contactName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>aok - Confirm Safety</title>
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
      max-width: 500px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .logo {
      color: #22c55e;
      font-weight: bold;
      font-size: 28px;
      margin-bottom: 24px;
      text-align: center;
    }
    h1 {
      color: #1e293b;
      font-size: 22px;
      margin-bottom: 8px;
      text-align: center;
    }
    .intro {
      color: #64748b;
      line-height: 1.6;
      font-size: 15px;
      margin-bottom: 24px;
      text-align: center;
    }
    .checkbox-group {
      margin-bottom: 24px;
    }
    .checkbox-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .checkbox-item:hover {
      background: #f1f5f9;
    }
    .checkbox-item input[type="checkbox"] {
      width: 20px;
      height: 20px;
      margin-top: 2px;
      accent-color: #22c55e;
      cursor: pointer;
    }
    .checkbox-item span {
      color: #1e293b;
      font-size: 15px;
      line-height: 1.5;
    }
    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }
    .submit-btn:hover {
      opacity: 0.95;
    }
    .submit-btn:active {
      transform: scale(0.99);
    }
    .submit-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      transform: none;
    }
    .warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: #92400e;
      font-size: 14px;
      line-height: 1.5;
    }
    .error {
      color: #dc2626;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">aok</div>
    <h1>Confirm Emergency End</h1>
    <p class="intro">Hello ${contactName}, please confirm you have spoken to <strong>${userName}</strong> and they have requested the emergency to end.</p>
    
    <div class="warning">
      By confirming below, you are stating that you have personally verified ${userName}'s wellbeing. This will stop all emergency alerts.
    </div>
    
    <form id="confirmForm" method="POST" action="/api/confirm-safety">
      <input type="hidden" name="token" value="${token}">
      
      <div class="checkbox-group">
        <label class="checkbox-item" for="spoken">
          <input type="checkbox" id="spoken" name="spoken" required>
          <span>I have spoken directly to ${userName}</span>
        </label>
        
        <label class="checkbox-item" for="safe">
          <input type="checkbox" id="safe" name="safe" required>
          <span>They told me they are safe and requested the emergency to end</span>
        </label>
        
        <label class="checkbox-item" for="understand">
          <input type="checkbox" id="understand" name="understand" required>
          <span>I understand this will stop all further emergency alerts</span>
        </label>
      </div>
      
      <p id="errorMsg" class="error">Please tick all boxes to confirm</p>
      
      <button type="submit" class="submit-btn" id="submitBtn" disabled>
        Confirm I have spoken to ${userName}
      </button>
    </form>
  </div>
  
  <script>
    const form = document.getElementById('confirmForm');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    
    function updateButtonState() {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      submitBtn.disabled = !allChecked;
      errorMsg.style.display = 'none';
    }
    
    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateButtonState);
    });
    
    form.addEventListener('submit', function(e) {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      if (!allChecked) {
        e.preventDefault();
        errorMsg.style.display = 'block';
        return false;
      }
    });
  </script>
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
    console.log("[AUTH] No session cookie found. Cookies:", JSON.stringify(req.cookies));
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    console.log("[AUTH] Session not found in DB for id:", sessionId);
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

  // Heartbeat/ping endpoint for connection monitoring
  // Client pings this every 60 seconds to ensure connectivity
  app.get("/api/heartbeat", (_req, res) => {
    res.json({ 
      ok: true, 
      timestamp: Date.now(),
      serverTime: new Date().toISOString()
    });
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

  // Stripe payment routes
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Failed to get Stripe publishable key:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  app.post("/api/stripe/create-subscription-checkout", async (req, res) => {
    try {
      const { priceId, email, successUrl, cancelUrl, trialDays = 7 } = req.body;
      
      console.log("[STRIPE CHECKOUT] Request received:", { priceId, email, successUrl, cancelUrl, trialDays });
      
      if (!priceId || !email) {
        console.log("[STRIPE CHECKOUT] Missing required fields");
        return res.status(400).json({ error: "priceId and email are required" });
      }

      console.log("[STRIPE CHECKOUT] Creating checkout session...");
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createSubscriptionCheckoutSession(
        null,
        priceId,
        successUrl || `${appUrl}/checkout/success`,
        cancelUrl || `${appUrl}/checkout/cancel`,
        email,
        trialDays
      );

      console.log("[STRIPE CHECKOUT] Session created successfully:", { url: session.url, sessionId: session.id });
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("[STRIPE CHECKOUT] Failed to create checkout session:", error.message, error.stack);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/create-setup-intent", async (req, res) => {
    try {
      const setupIntent = await stripeService.createSetupIntent();
      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error("Failed to create setup intent:", error);
      res.status(500).json({ error: error.message || "Failed to create setup intent" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const products = await stripeService.getProductsWithPrices();
      res.json({ products });
    } catch (error: any) {
      console.error("Failed to get products:", error);
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  app.get("/api/stripe/subscription", async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user?.email) {
        return res.json({ subscription: null });
      }

      const subscription = await stripeService.getSubscriptionByCustomerEmail(user.email) as any;
      
      if (!subscription) {
        return res.json({ subscription: null });
      }

      const currentPeriodEnd = subscription.current_period_end 
        ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
        : null;
      
      const trialEnd = subscription.trial_end 
        ? new Date(Number(subscription.trial_end) * 1000).toISOString()
        : null;

      const recurring = subscription.recurring as { interval?: string } | null;

      res.json({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd,
          trialEnd,
          productName: subscription.product_name || 'aok Subscription',
          unitAmount: subscription.unit_amount,
          currency: subscription.currency || 'gbp',
          interval: recurring?.interval || 'month',
        }
      });
    } catch (error: any) {
      console.error("Failed to get subscription:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  app.get("/api/stripe/payment-status", async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user?.email) {
        return res.json({ blocked: false, reason: null });
      }

      const subscription = await stripeService.getSubscriptionByCustomerEmail(user.email) as any;
      
      if (!subscription) {
        return res.json({ blocked: false, reason: null });
      }

      const isPastDue = subscription.status === 'past_due';
      const isUnpaid = subscription.status === 'unpaid';
      
      if (isPastDue || isUnpaid) {
        return res.json({ 
          blocked: true, 
          reason: 'payment_failed',
          message: 'Your payment failed. Please update your payment details to continue using aok.'
        });
      }

      res.json({ blocked: false, reason: null });
    } catch (error: any) {
      console.error("Failed to check payment status:", error);
      res.json({ blocked: false, reason: null });
    }
  });

  app.post("/api/stripe/cancel-subscription", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const user = await storage.getUserById(req.userId!);
      if (!user?.email) {
        return res.status(400).json({ error: "User not found" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      const subscription = await stripeService.getSubscriptionByCustomerEmail(user.email) as any;
      
      if (!subscription) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      await stripeService.cancelSubscription(String(subscription.id), true);
      
      res.json({ 
        success: true, 
        message: "Subscription will be cancelled at the end of your billing period" 
      });
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.post("/api/stripe/reactivate-subscription", async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user?.email) {
        return res.status(400).json({ error: "User not found" });
      }

      const subscription = await stripeService.getSubscriptionByCustomerEmail(user.email) as any;
      
      if (!subscription) {
        return res.status(404).json({ error: "No subscription found" });
      }

      await stripeService.reactivateSubscription(String(subscription.id));
      
      res.json({ 
        success: true, 
        message: "Subscription reactivated successfully" 
      });
    } catch (error: any) {
      console.error("Failed to reactivate subscription:", error);
      res.status(500).json({ error: "Failed to reactivate subscription" });
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

  // Register organization routes (requires auth middleware for /api/org/* routes except auth routes)
  app.use("/api/org", (req, res, next) => {
    // Allow public auth routes without authentication
    if (req.path.startsWith("/auth/forgot-password") || req.path.startsWith("/auth/reset-password")) {
      return next();
    }
    return authMiddleware(req, res, next);
  });
  registerOrganizationRoutes(app);
  
  // Wellbeing AI routes (uses session auth)
  registerWellbeingAIRoutes(app);

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
      
      // Check for terms acceptance from onboarding (passed separately)
      let termsAcceptedAt: Date | null = null;
      if (req.body.termsAcceptedAt) {
        const parsedDate = new Date(req.body.termsAcceptedAt);
        if (!isNaN(parsedDate.getTime())) {
          termsAcceptedAt = parsedDate;
        }
      }

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
        termsAcceptedAt,
      });

      // Initialize settings for new user
      await storage.initializeSettings(user.id);

      // Handle staff invite code - accept invite and consume bundle seat
      const staffInviteCode = req.body.staffInviteCode;
      if (staffInviteCode && typeof staffInviteCode === "string") {
        try {
          const acceptedInvite = await organizationStorage.acceptStaffInvite(staffInviteCode, user.id);
          if (acceptedInvite) {
            await organizationStorage.incrementBundleSeatsUsed(acceptedInvite.bundleId);
            console.log(`[STAFF INVITE] User ${user.id} accepted staff invite ${staffInviteCode}, bundle ${acceptedInvite.bundleId} seat consumed`);
          }
        } catch (err) {
          console.error("[STAFF INVITE] Error processing staff invite:", err);
        }
      }

      // Send welcome email for individual sign-ups
      if (accountType === "individual") {
        sendWelcomeEmail(email, name).catch(err => {
          console.error("[WELCOME] Failed to send welcome email:", err);
        });
      }

      // Plant a tree for every person we onboard
      plantTreeForNewSubscriber(email).catch(err => {
        console.error("[ECOLOGI] Failed to plant tree for new user:", err);
      });

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

  // Organisation staff login
  app.post("/api/auth/org-login", async (req, res) => {
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

      // Verify user is an organization account
      if (user.accountType !== "organization") {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.passwordHash) {
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
      console.log("[ORG LOGIN] Session created:", session.id, "for user:", user.id);

      // Set cookie
      const isProduction = process.env.NODE_ENV === "production";
      console.log("[ORG LOGIN] Setting cookie, secure:", isProduction, "NODE_ENV:", process.env.NODE_ENV);
      res.cookie("session", session.id, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash, ...userProfile } = user;
      console.log("[ORG LOGIN] Login successful for:", user.email);
      res.json(userProfile);
    } catch (error) {
      console.error("Org login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
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
    
    // Check if user is an org client and apply org's feature restrictions
    const orgClientFeatures = await organizationStorage.getClientFeaturesByUserId(user.id);
    if (orgClientFeatures) {
      // Org client features override user's own feature settings
      // Features are only enabled if BOTH org allows it AND user has it enabled
      const mergedProfile = {
        ...userProfile,
        featureWellbeingAi: orgClientFeatures.featureWellbeingAi && userProfile.featureWellbeingAi,
        featureShakeToAlert: orgClientFeatures.featureShakeToAlert && userProfile.featureShakeToAlert,
        featureWellness: orgClientFeatures.featureMoodTracking && userProfile.featureWellness,
        featurePetProtection: orgClientFeatures.featurePetProtection && userProfile.featurePetProtection,
        featureDigitalWill: orgClientFeatures.featureDigitalWill && userProfile.featureDigitalWill,
        // Include org restrictions so client knows what's available
        orgFeatureRestrictions: orgClientFeatures,
      };
      return res.json(mergedProfile);
    }
    
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
        
        // Use production domain directly when in production, otherwise use request headers
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
        
        console.log(`[PASSWORD RESET] baseUrl: ${baseUrl}`);
        
        // Send password reset email
        try {
          await sendPasswordResetEmail(user.email, resetUrl, user.name, 'individual');
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

  // Safety confirmation endpoint (public - no auth required)
  // This is called when a contact clicks the confirmation link in the deactivation email
  // GET: Show confirmation form
  app.get("/api/confirm-safety", async (req, res) => {
    try {
      const { token } = req.query;
      
      console.log("[CONFIRM-SAFETY] Received confirmation page request:", { 
        token: token ? `${String(token).substring(0, 10)}...` : 'missing'
      });
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send(renderSafetyConfirmationPage(false, "Invalid confirmation link.", null));
      }
      
      const confirmation = await storage.getDeactivationConfirmationByToken(token);
      
      if (!confirmation) {
        return res.status(404).send(renderSafetyConfirmationPage(false, "This confirmation link has expired or is invalid.", null));
      }
      
      // Check if already confirmed
      if (confirmation.confirmedAt) {
        return res.send(renderSafetyConfirmationPage(true, "You have already confirmed that you've spoken to this person. The emergency has ended.", confirmation.user?.name || 'the client'));
      }
      
      // Check if expired
      if (new Date(confirmation.expiresAt) < new Date()) {
        return res.status(410).send(renderSafetyConfirmationPage(false, "This confirmation link has expired.", null));
      }
      
      // Show the confirmation form with checkboxes
      const userName = confirmation.user?.name || 'the client';
      const contactName = confirmation.contactName || 'Contact';
      return res.send(renderSafetyConfirmationForm(token, userName, contactName));
    } catch (error) {
      console.error("Safety confirmation page error:", error);
      res.status(500).send(renderSafetyConfirmationPage(false, "Something went wrong. Please try again.", null));
    }
  });
  
  // POST: Handle form submission and confirm deactivation
  app.post("/api/confirm-safety", express.urlencoded({ extended: true }), async (req, res) => {
    try {
      const { token, spoken, safe, understand } = req.body;
      
      // Get client info for audit logging
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const confirmationTime = new Date();
      
      console.log("[CONFIRM-SAFETY] Form submission:", { 
        token: token ? `${String(token).substring(0, 10)}...` : 'missing',
        spoken: !!spoken,
        safe: !!safe,
        understand: !!understand,
        clientIp: typeof clientIp === 'string' ? clientIp : clientIp[0],
        userAgent: userAgent.substring(0, 50)
      });
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send(renderSafetyConfirmationPage(false, "Invalid confirmation link.", null));
      }
      
      // Verify all checkboxes were ticked
      if (!spoken || !safe || !understand) {
        return res.status(400).send(renderSafetyConfirmationPage(false, "You must tick all boxes to confirm.", null));
      }
      
      const confirmation = await storage.getDeactivationConfirmationByToken(token);
      
      if (!confirmation) {
        return res.status(404).send(renderSafetyConfirmationPage(false, "This confirmation link has expired or is invalid.", null));
      }
      
      // Check if already confirmed
      if (confirmation.confirmedAt) {
        return res.send(renderSafetyConfirmationPage(true, "You have already confirmed that you've spoken to this person. The emergency has ended.", confirmation.user?.name || 'the client'));
      }
      
      // Check if expired
      if (new Date(confirmation.expiresAt) < new Date()) {
        return res.status(410).send(renderSafetyConfirmationPage(false, "This confirmation link has expired.", null));
      }
      
      // Confirm the deactivation with audit info
      const confirmed = await storage.confirmDeactivation(token, {
        confirmedAt: confirmationTime,
        confirmedByIp: typeof clientIp === 'string' ? clientIp : clientIp[0],
        confirmedByUserAgent: userAgent
      });
      
      if (confirmed) {
        const userName = confirmation.user?.name || 'the client';
        console.log(`[CONFIRM-SAFETY] Contact ${confirmation.contactName} confirmed safety for user ${confirmation.userId}`);
        console.log(`[CONFIRM-SAFETY] Audit: IP=${clientIp}, Time=${confirmationTime.toISOString()}, UserAgent=${userAgent.substring(0, 100)}`);
        
        // NOW deactivate the emergency alert
        if (confirmation.alertId) {
          await storage.deactivateEmergencyAlert(confirmation.alertId);
          console.log(`[CONFIRM-SAFETY] Emergency alert ${confirmation.alertId} deactivated`);
        }
        
        // Log the confirmation with audit trail
        await storage.createAlertLog(
          confirmation.userId, 
          [], 
          `Emergency ended following confirmation by ${confirmation.contactName} at ${confirmationTime.toLocaleString('en-GB')}`
        );
        
        // Send final notification to ALL contacts
        const allContacts = await storage.getContacts(confirmation.userId);
        const contactsWithEmail = allContacts.filter(c => c.email && c.email.trim() !== '');
        
        if (contactsWithEmail.length > 0 && confirmation.user) {
          const { sendEmergencyEndedNotification } = await import("./notifications");
          await sendEmergencyEndedNotification(
            contactsWithEmail,
            confirmation.user,
            confirmation.contactName,
            confirmationTime
          );
          console.log(`[CONFIRM-SAFETY] Final notifications sent to ${contactsWithEmail.length} contacts`);
        }
        
        return res.send(renderSafetyConfirmationPage(
          true, 
          `Thank you for confirming that you have spoken to ${userName} and they have requested the emergency to end. All alerts have now stopped.`, 
          userName
        ));
      }
      
      return res.status(500).send(renderSafetyConfirmationPage(false, "Something went wrong. Please try again.", null));
    } catch (error) {
      console.error("Safety confirmation error:", error);
      res.status(500).send(renderSafetyConfirmationPage(false, "Something went wrong. Please try again.", null));
    }
  });

  // Protected routes - all require authentication
  app.use("/api/status", authMiddleware);
  app.use("/api/alerts", authMiddleware);
  app.use("/api/contacts", authMiddleware);
  app.use("/api/checkins", authMiddleware);
  app.use("/api/settings", authMiddleware);
  app.use("/api/emergency", authMiddleware);
  app.use("/api/mood", authMiddleware);
  app.use("/api/pets", authMiddleware);
  app.use("/api/documents", authMiddleware);
  app.use("/api/features", authMiddleware);
  app.use("/api/stripe/subscription", authMiddleware);
  app.use("/api/stripe/payment-status", authMiddleware);
  app.use("/api/stripe/cancel-subscription", authMiddleware);
  app.use("/api/stripe/reactivate-subscription", authMiddleware);

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

      // Check for contacts about to expire (within 1 hour of 24-hour deadline)
      const now = new Date();
      const expiringContacts = contacts
        .filter(c => {
          if (c.confirmedAt) return false; // Already confirmed
          if (!c.confirmationExpiry) return false;
          const expiry = new Date(c.confirmationExpiry);
          const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursUntilExpiry > 0 && hoursUntilExpiry <= 1; // Within last hour before expiry
        })
        .map(c => ({ name: c.name, expiresAt: c.confirmationExpiry!.toString() }));

      const statusData: StatusData = {
        status,
        lastCheckIn: settings.lastCheckIn,
        nextCheckInDue: settings.nextCheckInDue,
        streak,
        hoursUntilDue,
        contactCount: contacts.length,
        expiringContacts: expiringContacts.length > 0 ? expiringContacts : undefined,
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
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
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
        message: "Confirmation email sent. Contact must confirm within 24 hours."
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
    } catch (error: any) {
      if (error.message === "Maximum of 3 primary contacts allowed") {
        return res.status(400).json({ error: error.message });
      }
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

      // Notify the removed contact (only if confirmed - unconfirmed contacts don't need notification)
      if (contactToDelete.confirmedAt) {
        const userForNotification = await storage.getUserById(req.userId!);
        if (userForNotification) {
          await sendContactRemovedNotification(contactToDelete, userForNotification);
        }
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
      
      // Store user's location if provided (for missed check-in alerts)
      const location = req.body?.location as { latitude: number; longitude: number } | undefined;
      if (location?.latitude && location?.longitude) {
        await storage.updateUserLocation(req.userId!, location.latitude.toString(), location.longitude.toString());
        console.log(`[CHECK-IN] Updated user ${req.userId} location to ${location.latitude}, ${location.longitude}`);
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
      
      // Get what3words if location is provided
      let what3words: string | null = null;
      if (location?.latitude && location?.longitude) {
        const apiKey = process.env.WHAT3WORDS_API_KEY;
        if (apiKey) {
          try {
            const w3wResponse = await fetch(
              `https://api.what3words.com/v3/convert-to-3wa?coordinates=${location.latitude},${location.longitude}&key=${apiKey}`
            );
            if (w3wResponse.ok) {
              const w3wData = await w3wResponse.json();
              if (w3wData.words) {
                what3words = w3wData.words;
                console.log('[EMERGENCY] Got what3words:', what3words);
              }
            }
          } catch (e) {
            console.error('[EMERGENCY] Failed to get what3words:', e);
          }
        }
      }
      
      // Always check if user already has an active emergency alert
      const existingAlert = await storage.getActiveEmergencyAlert(req.userId!);
      if (existingAlert) {
        return res.status(400).json({ error: "An emergency alert is already active" });
      }
      
      // Always create active emergency alert so org dashboards can track it
      const activeAlert = await storage.createActiveEmergencyAlert(
        req.userId!,
        location?.latitude?.toString() || null,
        location?.longitude?.toString() || null,
        what3words
      );
      console.log('[EMERGENCY] Created active alert:', activeAlert.id, 'Continuous tracking:', continuousTrackingEnabled);
      
      // Send email and SMS alerts
      const alertResult = await sendEmergencyAlert(
        contacts, 
        user, 
        location,
        false, // isLocationUpdate
        userSettings?.additionalInfo
      );
      
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
      
      // Create safeguarding incident for any organizations this client belongs to
      try {
        const orgClients = await storage.getOrganizationClientsForUser(req.userId!);
        for (const orgClient of orgClients) {
          if (orgClient.organizationId) {
            await storage.createIncident(orgClient.organizationId, {
              clientId: orgClient.id,
              reportedById: req.userId!,
              reportedByName: user.name,
              incidentType: "lone_worker_danger",
              severity: "immediate_danger",
              description: `EMERGENCY ALERT triggered by client via SOS button. ${what3words ? `Location: ///${what3words}` : 'Location unknown.'}`,
              location: what3words ? `///${what3words}` : null,
              locationLat: location?.latitude?.toString() || null,
              locationLng: location?.longitude?.toString() || null,
              what3words: what3words,
              isAnonymous: false,
              status: "open",
            });
            console.log(`[EMERGENCY] Created safeguarding incident for org ${orgClient.organizationId}`);
          }
        }
      } catch (incidentError) {
        console.error('[EMERGENCY] Failed to create safeguarding incident:', incidentError);
        // Don't fail the emergency alert if incident creation fails
      }

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

  // Deactivate emergency alert via 10-second hold (no password required)
  app.post("/api/emergency/deactivate-hold", async (req, res) => {
    try {
      const userId = req.userId!;
      
      const activeAlert = await storage.getActiveEmergencyAlert(userId);
      if (!activeAlert) {
        return res.status(400).json({ error: "No active emergency alert" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get location from request body (sent from client)
      const { location } = req.body;
      
      // Get what3words for the location
      let what3words: string | null = null;
      if (location?.latitude && location?.longitude) {
        const apiKey = process.env.WHAT3WORDS_API_KEY;
        if (apiKey) {
          try {
            const w3wResponse = await fetch(
              `https://api.what3words.com/v3/convert-to-3wa?coordinates=${location.latitude},${location.longitude}&key=${apiKey}`
            );
            if (w3wResponse.ok) {
              const w3wData = await w3wResponse.json();
              if (w3wData.words) {
                what3words = w3wData.words;
              }
            }
          } catch (e) {
            console.error('[EMERGENCY] Failed to get what3words for deactivation:', e);
          }
        }
      }

      // DO NOT deactivate the alert yet - alerts continue until a contact confirms
      // Just send confirmation requests to contacts
      
      // Get ALL contacts to notify them (emergency notifications go to all contacts, not just confirmed)
      const contacts = await storage.getContacts(userId);
      const contactsWithEmail = contacts.filter(c => c.email && c.email.trim() !== '');
      
      // Create confirmation records for each contact and generate links
      const baseUrl = process.env.APP_URL || 
        (process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'http://localhost:5000');
      
      const confirmationLinks = new Map<string, string>();
      for (const contact of contactsWithEmail) {
        const { token } = await storage.createDeactivationConfirmation(
          userId,
          activeAlert.id,
          contact.email,
          contact.name,
          location?.latitude?.toString() || activeAlert.latitude,
          location?.longitude?.toString() || activeAlert.longitude,
          what3words || activeAlert.what3words
        );
        confirmationLinks.set(contact.email, `${baseUrl}/api/confirm-safety?token=${token}`);
      }
      
      // Send confirmation request notifications to ALL contacts
      // Alert will only stop when a contact confirms they've spoken to the user
      if (contactsWithEmail.length > 0) {
        const { sendEmergencyConfirmationRequest } = await import("./notifications");
        await sendEmergencyConfirmationRequest(
          contactsWithEmail,
          user,
          location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
          confirmationLinks
        );
        console.log(`[EMERGENCY] Confirmation requests sent to ${contactsWithEmail.length} contacts - alerts continue until confirmed`);
      } else {
        console.log(`[EMERGENCY] No contacts with email addresses to send confirmation requests`);
      }
      
      // Log the confirmation request
      let logMessage = `Client requested emergency end - awaiting contact confirmation (alerts continue)`;
      if (location) {
        logMessage += ` (Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`;
      }
      await storage.createAlertLog(userId, [], logMessage);

      res.json({ success: true, message: "Confirmation requests sent to your contacts. Alerts will stop once a contact confirms they have spoken to you." });
    } catch (error) {
      console.error('[EMERGENCY] Failed to deactivate alert via hold:', error);
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

  // Get feature settings for current user (to check what features are enabled)
  app.get("/api/features", async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user is an organization, they cannot access wellness features
      if (user.accountType === "organization") {
        return res.json({
          isOrgAccount: true,
          featureWellbeingAi: false,
          featureMoodTracking: false,
          featurePetProtection: false,
          featureDigitalWill: false,
        });
      }

      // Check if user is managed by an organization
      const features = await organizationStorage.getClientFeaturesByUserId(req.userId!);
      
      if (features) {
        // User is an org client - return their enabled features
        return res.json({
          isOrgAccount: false,
          isOrgClient: true,
          ...features,
        });
      }

      // Regular individual user - return their actual feature settings from the database
      res.json({
        isOrgAccount: false,
        isOrgClient: false,
        featureWellbeingAi: user.featureWellbeingAi ?? true,
        featureMoodTracking: user.featureWellness ?? true,
        featurePetProtection: user.featurePetProtection ?? true,
        featureDigitalWill: user.featureDigitalWill ?? true,
      });
    } catch (error) {
      console.error("[API] Failed to get features:", error);
      res.status(500).json({ error: "Failed to get feature settings" });
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

  // ==================== MOOD TRACKING ROUTES ====================

  // Get mood entries
  app.get("/api/mood", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const entries = await storage.getMoodEntries(req.userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get mood entries" });
    }
  });

  // Get mood stats
  app.get("/api/mood/stats", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const stats = await storage.getMoodStats(req.userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get mood stats" });
    }
  });

  // Create mood entry
  app.post("/api/mood", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const parsed = insertMoodEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const entry = await storage.createMoodEntry(req.userId, parsed.data);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to create mood entry" });
    }
  });

  // ==================== PET PROTECTION ROUTES ====================

  // Get pets
  app.get("/api/pets", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const pets = await storage.getPets(req.userId);
      res.json(pets);
    } catch (error) {
      res.status(500).json({ error: "Failed to get pets" });
    }
  });

  // Get single pet
  app.get("/api/pets/:id", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const pet = await storage.getPet(req.userId, req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      res.json(pet);
    } catch (error) {
      res.status(500).json({ error: "Failed to get pet" });
    }
  });

  // Create pet
  app.post("/api/pets", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const parsed = insertPetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const pet = await storage.createPet(req.userId, parsed.data);
      res.json(pet);
    } catch (error) {
      res.status(500).json({ error: "Failed to create pet" });
    }
  });

  // Update pet
  app.patch("/api/pets/:id", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const parsed = updatePetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const pet = await storage.updatePet(req.userId, req.params.id, parsed.data);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      res.json(pet);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pet" });
    }
  });

  // Delete pet
  app.delete("/api/pets/:id", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const deleted = await storage.deletePet(req.userId, req.params.id);
      if (!deleted) return res.status(404).json({ error: "Pet not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete pet" });
    }
  });

  // ==================== DIGITAL WILL ROUTES ====================

  // Get documents
  app.get("/api/documents", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const documents = await storage.getDigitalDocuments(req.userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const document = await storage.getDigitalDocument(req.userId, req.params.id);
      if (!document) return res.status(404).json({ error: "Document not found" });
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to get document" });
    }
  });

  // Create document
  app.post("/api/documents", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const parsed = insertDigitalDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const document = await storage.createDigitalDocument(req.userId, parsed.data);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Update document
  app.patch("/api/documents/:id", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const parsed = updateDigitalDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const document = await storage.updateDigitalDocument(req.userId, req.params.id, parsed.data);
      if (!document) return res.status(404).json({ error: "Document not found" });
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    try {
      const deleted = await storage.deleteDigitalDocument(req.userId, req.params.id);
      if (!deleted) return res.status(404).json({ error: "Document not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Ecologi environmental impact stats (public endpoint with server-side caching)
  let cachedEcologiImpact: { trees: number; carbonOffset: number; timestamp: number } | null = null;
  const ECOLOGI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  
  app.get("/api/ecologi/impact", async (_req, res) => {
    try {
      // Check if cached data is still valid
      const now = Date.now();
      if (cachedEcologiImpact && (now - cachedEcologiImpact.timestamp) < ECOLOGI_CACHE_TTL) {
        return res.json({
          trees: cachedEcologiImpact.trees,
          carbonOffset: cachedEcologiImpact.carbonOffset,
          testMode: isEcologiTestMode(),
        });
      }
      
      const impact = await getEcologiImpact();
      if (!impact) {
        // Return fallback with zeros or last cached value if API fails
        return res.json({
          trees: cachedEcologiImpact?.trees ?? 0,
          carbonOffset: cachedEcologiImpact?.carbonOffset ?? 0,
          testMode: isEcologiTestMode(),
        });
      }
      
      // Update cache
      cachedEcologiImpact = {
        trees: impact.trees,
        carbonOffset: impact.carbonOffset,
        timestamp: now,
      };
      
      res.json({
        trees: impact.trees,
        carbonOffset: impact.carbonOffset,
        testMode: isEcologiTestMode(),
      });
    } catch (error) {
      console.error("[ECOLOGI] Error fetching impact:", error);
      // Return fallback with zeros or last cached value
      res.json({
        trees: cachedEcologiImpact?.trees ?? 0,
        carbonOffset: cachedEcologiImpact?.carbonOffset ?? 0,
        testMode: isEcologiTestMode(),
      });
    }
  });

  // Backup download route
  app.get("/api/download-backup", async (_req, res) => {
    const path = require("path");
    const fs = require("fs");
    const backupPath = path.join(process.cwd(), "aok-code-backup.tar.gz");
    
    if (fs.existsSync(backupPath)) {
      res.download(backupPath, "aok-code-backup.tar.gz");
    } else {
      res.status(404).json({ error: "Backup file not found" });
    }
  });

  return httpServer;
}
