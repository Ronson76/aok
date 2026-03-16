import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, organizationStorage, adminStorage } from "./storage";
import { db, ensureDb } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { insertContactSchema, updateContactSchema, updateSettingsSchema, insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, insertMoodEntrySchema, insertPetSchema, updatePetSchema, insertDigitalDocumentSchema, updateDigitalDocumentSchema, insertErrandSessionSchema, errandActivityTypes, insertPlannedRouteSchema } from "@shared/schema";
import type { StatusData, UserProfile } from "@shared/schema";
import { supportSignals, frontlineInteractions, organizationClients, organizationMembers, orgMemberClientAssignments } from "@shared/schema";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { sendContactAddedNotification, sendContactConfirmationEmail, sendPasswordResetEmail, sendSuccessfulCheckInNotification, sendEmergencyAlert, sendVoiceAlerts, sendLogoutNotification, sendSchedulePreferencesNotification, testSMSDelivery, diagnoseTwilioCredentials, sendTestEmail, sendPrimaryContactPromotionNotification, sendContactRemovedNotification, sendWelcomeEmail, makeVoiceCall, sendEmail, sendSMS } from "./notifications";
import { registerAdminRoutes, adminAuthMiddleware } from "./adminRoutes";
import { registerOrganizationRoutes } from "./organizationRoutes";
import { registerOrgMemberRoutes } from "./orgMemberRoutes";
import { registerWellbeingAIRoutes } from "./wellbeingAI";
import { registerReportingRoutes } from "./reportingRoutes";
import { registerFundingRoutes } from "./fundingRoutes";
import { getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";
import { stripeService, getPlanFeatures, tierFromAmount } from "./stripeService";
import type { PlanTier, PlanFeatures } from "./stripeService";
import { getEcologiImpact, plantTreeForNewSubscriber, isTestMode as isEcologiTestMode } from "./ecologiService";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { loginRateLimiter, passwordResetRateLimiter } from "./security";
import { z } from "zod";

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

  const { passwordHash, twoFactorSecret, ...userProfile } = user;
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

  const checkoutSchema = z.object({
    priceId: z.string().min(1).startsWith("price_"),
    email: z.string().email(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    trialDays: z.number().int().min(0).max(30).optional().default(0),
  });

  app.post("/api/stripe/create-subscription-checkout", async (req, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "A valid priceId and email are required" });
      }

      let email = parsed.data.email;
      const { priceId, successUrl, cancelUrl, trialDays } = parsed.data;

      if (req.userId) {
        const user = await storage.getUserById(req.userId);
        if (user?.email) email = user.email;
      }

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createSubscriptionCheckoutSession(
        null,
        priceId,
        successUrl || `${appUrl}/checkout/success`,
        cancelUrl || `${appUrl}/checkout/cancel`,
        email,
        trialDays
      );

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("[STRIPE CHECKOUT] Failed to create checkout session:", error.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/create-setup-intent", async (req, res) => {
    try {
      const setupIntent = await stripeService.createSetupIntent();
      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error("Failed to create setup intent:", error);
      res.status(500).json({ error: "Failed to create setup intent" });
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
  
  const ALLOWED_PRICE_IDS = [
    process.env.VITE_STRIPE_BASIC_PRICE_ID,
    process.env.VITE_STRIPE_ESSENTIAL_PRICE_ID,
    process.env.VITE_STRIPE_COMPLETE_PRICE_ID,
  ].filter(Boolean);

  app.post("/api/stripe/upgrade-subscription", authMiddleware, async (req, res) => {
    try {
      const { newPriceId } = req.body;
      if (!newPriceId || typeof newPriceId !== "string" || !newPriceId.startsWith("price_")) {
        return res.status(400).json({ error: "Valid price ID is required" });
      }

      if (ALLOWED_PRICE_IDS.length > 0 && !ALLOWED_PRICE_IDS.includes(newPriceId)) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      const user = await storage.getUserById(req.userId!);
      if (!user?.email) {
        return res.status(400).json({ error: "User not found" });
      }

      const subscription = await stripeService.getSubscriptionByCustomerEmail(user.email) as any;

      if (subscription) {
        const stripe = await getUncachableStripeClient();
        const items = typeof subscription.items === 'string' ? JSON.parse(subscription.items) : subscription.items;
        const currentItemId = items?.data?.[0]?.id;

        if (!currentItemId) {
          return res.status(400).json({ error: "Could not determine current subscription item" });
        }

        await stripe.subscriptions.update(String(subscription.id), {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_behavior: 'none',
        });

        res.json({ success: true, message: "Subscription upgraded successfully" });
      } else {
        const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const session = await stripeService.createSubscriptionCheckoutSession(
          null,
          newPriceId,
          `${appUrl}/app/settings?upgraded=true`,
          `${appUrl}/app/settings`,
          user.email,
          0
        );
        res.json({ url: session.url, sessionId: session.id });
      }
    } catch (error: any) {
      console.error("[STRIPE UPGRADE] Failed:", error.message);
      res.status(500).json({ error: "Failed to upgrade subscription" });
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

  app.use("/api/org", (req, res, next) => {
    if (req.path.startsWith("/auth/forgot-password") || req.path.startsWith("/auth/reset-password") || req.path.startsWith("/auth/setup-password")) {
      return next();
    }
    if (req.cookies?.org_member_session) {
      return next();
    }
    return authMiddleware(req, res, next);
  });
  app.use("/api/kiosk", (req, res, next) => {
    if (req.cookies?.org_member_session) {
      return next();
    }
    return authMiddleware(req, res, next);
  });
  registerOrganizationRoutes(app);
  registerReportingRoutes(app);
  registerFundingRoutes(app);
  
  registerOrgMemberRoutes(app);
  
  // Object storage routes
  registerObjectStorageRoutes(app);

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
      const staffInviteCode = req.body.staffInviteCode;

      if (existingUser) {
        // Allow staff invite registrations where the email matches the invite
        let staffEmailMatch = false;
        if (staffInviteCode && typeof staffInviteCode === "string") {
          const invite = await organizationStorage.getStaffInviteByCode(staffInviteCode);
          if (invite && invite.status === "pending" && invite.staffEmail?.toLowerCase() === email.toLowerCase()) {
            staffEmailMatch = true;
          }
        }
        if (!staffEmailMatch) {
          return res.status(400).json({ error: "An account with this email already exists" });
        }

        // Staff email match -  update existing user's password and link to invite
        const newPasswordHash = await bcrypt.hash(password, 10);
        await storage.updateUserPassword(existingUser.id, newPasswordHash);

        // Accept invite and consume bundle seat, create emergency contact
        try {
          const invite = await organizationStorage.getStaffInviteByCode(staffInviteCode!);
          const acceptedInvite = await organizationStorage.acceptStaffInvite(staffInviteCode!, existingUser.id);
          if (acceptedInvite) {
            await organizationStorage.incrementBundleSeatsUsed(acceptedInvite.bundleId);
            console.log(`[STAFF INVITE] Existing user ${existingUser.id} accepted staff invite ${staffInviteCode}, bundle ${acceptedInvite.bundleId} seat consumed`);
          }
          if (invite?.emergencyRecordingEnabled) {
            try {
              await storage.initializeSettings(existingUser.id);
              await storage.updateSettings(existingUser.id, { emergencyRecordingEnabled: true });
              console.log(`[STAFF INVITE] Emergency recording enabled for returning staff user ${existingUser.id}`);
            } catch (recErr) {
              console.error("[STAFF INVITE] Error enabling emergency recording for returning user:", recErr);
            }
          }
          if (invite?.supervisorName && invite?.supervisorPhone) {
            try {
              await storage.initializeSettings(existingUser.id);
              const { contact: supContact, confirmationToken: supToken } = await storage.createContact(existingUser.id, {
                name: invite.supervisorName,
                email: invite.supervisorEmail || invite.staffEmail || email,
                phone: invite.supervisorPhone,
                phoneType: "mobile",
                relationship: "Supervisor",
              });
              await storage.setPrimaryContact(existingUser.id, supContact.id);
              console.log(`[STAFF INVITE] Supervisor contact ${supContact.id} created and set as primary for staff user ${existingUser.id}`);
              const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
              sendContactConfirmationEmail(supContact, existingUser, supToken, baseUrl).catch(err => {
                console.error("[STAFF INVITE] Failed to send supervisor confirmation email:", err);
              });
            } catch (supErr) {
              console.error("[STAFF INVITE] Error creating supervisor contact:", supErr);
            }
          }
          if (invite?.emergencyContactName && invite?.emergencyContactPhone) {
            try {
              await storage.initializeSettings(existingUser.id);
              const { contact: newContact, confirmationToken: contactToken } = await storage.createContact(existingUser.id, {
                name: invite.emergencyContactName,
                email: invite.emergencyContactEmail || invite.staffEmail || email,
                phone: invite.emergencyContactPhone,
                phoneType: "mobile",
                relationship: invite.emergencyContactRelationship || "colleague",
              });
              console.log(`[STAFF INVITE] Emergency contact ${newContact.id} created for staff user ${existingUser.id}`);
              const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
              sendContactConfirmationEmail(newContact, existingUser, contactToken, baseUrl).catch(err => {
                console.error("[STAFF INVITE] Failed to send contact confirmation email:", err);
              });
            } catch (contactErr) {
              console.error("[STAFF INVITE] Error creating emergency contact:", contactErr);
            }
          }
        } catch (err) {
          console.error("[STAFF INVITE] Error processing staff invite:", err);
        }

        // Send welcome email for returning staff users
        sendWelcomeEmail(email, name || existingUser.name).catch(err => {
          console.error("[WELCOME] Failed to send welcome email to returning staff user:", err);
        });

        // Create session for existing user
        const session = await storage.createSession(existingUser.id);
        res.cookie("session", session.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 14 * 24 * 60 * 60 * 1000,
        });

        const { passwordHash: _, twoFactorSecret: _s, ...userProfile } = { ...existingUser, passwordHash: newPasswordHash, name: name || existingUser.name };
        return res.status(201).json(userProfile);
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

      // Handle staff invite code - accept invite, consume bundle seat, create emergency contact
      if (staffInviteCode && typeof staffInviteCode === "string") {
        try {
          const invite = await organizationStorage.getStaffInviteByCode(staffInviteCode);
          const acceptedInvite = await organizationStorage.acceptStaffInvite(staffInviteCode, user.id);
          if (acceptedInvite) {
            await organizationStorage.incrementBundleSeatsUsed(acceptedInvite.bundleId);
            console.log(`[STAFF INVITE] User ${user.id} accepted staff invite ${staffInviteCode}, bundle ${acceptedInvite.bundleId} seat consumed`);
          }
          if (invite?.emergencyRecordingEnabled) {
            try {
              await storage.updateSettings(user.id, { emergencyRecordingEnabled: true });
              console.log(`[STAFF INVITE] Emergency recording enabled for staff user ${user.id}`);
            } catch (recErr) {
              console.error("[STAFF INVITE] Error enabling emergency recording:", recErr);
            }
          }
          if (invite?.supervisorName && invite?.supervisorPhone) {
            try {
              const { contact: supContact, confirmationToken: supToken } = await storage.createContact(user.id, {
                name: invite.supervisorName,
                email: invite.supervisorEmail || invite.staffEmail || email,
                phone: invite.supervisorPhone,
                phoneType: "mobile",
                relationship: "Supervisor",
              });
              await storage.setPrimaryContact(user.id, supContact.id);
              console.log(`[STAFF INVITE] Supervisor contact ${supContact.id} created and set as primary for staff user ${user.id}`);
              const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
              sendContactConfirmationEmail(supContact, user, supToken, baseUrl).catch(err => {
                console.error("[STAFF INVITE] Failed to send supervisor confirmation email:", err);
              });
            } catch (supErr) {
              console.error("[STAFF INVITE] Error creating supervisor contact:", supErr);
            }
          }
          if (invite?.emergencyContactName && invite?.emergencyContactPhone) {
            try {
              const { contact: newContact, confirmationToken: contactToken } = await storage.createContact(user.id, {
                name: invite.emergencyContactName,
                email: invite.emergencyContactEmail || invite.staffEmail || email,
                phone: invite.emergencyContactPhone,
                phoneType: "mobile",
                relationship: invite.emergencyContactRelationship || "colleague",
              });
              console.log(`[STAFF INVITE] Emergency contact ${newContact.id} created for staff user ${user.id}`);
              const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
              sendContactConfirmationEmail(newContact, user, contactToken, baseUrl).catch(err => {
                console.error("[STAFF INVITE] Failed to send contact confirmation email:", err);
              });
            } catch (contactErr) {
              console.error("[STAFF INVITE] Error creating emergency contact:", contactErr);
            }
          }
        } catch (err) {
          console.error("[STAFF INVITE] Error processing staff invite:", err);
        }
      }

      // Send welcome email for all new users (individual and staff)
      sendWelcomeEmail(email, name).catch(err => {
        console.error("[WELCOME] Failed to send welcome email:", err);
      });

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

      const { passwordHash: _, twoFactorSecret: _s, ...userProfile } = user;
      res.status(201).json(userProfile);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { email, password } = parsed.data;
      const totpCode = req.body.totpCode as string | undefined;

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.disabled) {
        return res.status(403).json({ error: "Your account has been disabled. Please contact support." });
      }

      if (user.accountType === "organization" && user.orgSubscriptionExpiresAt) {
        const expiresAt = new Date(user.orgSubscriptionExpiresAt);
        const now = new Date();
        const daysSinceExpiry = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceExpiry > 7) {
          return res.status(403).json({ error: "Your organisation's subscription has expired. Please contact AOK to renew your subscription." });
        }
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!totpCode) {
          return res.status(200).json({ requires2FA: true, email });
        }
        const totp = new OTPAuth.TOTP({
          issuer: "aok",
          label: user.email,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
        });
        const valid = totp.validate({ token: totpCode, window: 1 });
        if (valid === null) {
          return res.status(401).json({ error: "Invalid verification code" });
        }
      }

      const session = await storage.createSession(user.id);

      res.cookie("session", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash, twoFactorSecret, ...userProfile } = user;
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

  // 2FA Setup - Generate TOTP secret and QR code
  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      const sessionId = req.cookies?.session;
      if (!sessionId) return res.status(401).json({ error: "Not authenticated" });
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserById(session.userId);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "aok",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      const otpauthUrl = totp.toString();
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      res.json({
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        otpauthUrl,
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  // 2FA Verify and Enable
  app.post("/api/auth/2fa/verify", async (req, res) => {
    try {
      const sessionId = req.cookies?.session;
      if (!sessionId) return res.status(401).json({ error: "Not authenticated" });
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserById(session.userId);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const { secret, token } = req.body;
      if (!secret || !token) {
        return res.status(400).json({ error: "Secret and token are required" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: "aok",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const valid = totp.validate({ token, window: 1 });
      if (valid === null) {
        return res.status(400).json({ error: "Invalid verification code. Please try again." });
      }

      await storage.updateUser2FA(user.id, true, secret);
      res.json({ success: true, message: "Two-factor authentication enabled" });
    } catch (error) {
      console.error("2FA verify error:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  // 2FA Disable
  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      const sessionId = req.cookies?.session;
      if (!sessionId) return res.status(401).json({ error: "Not authenticated" });
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserById(session.userId);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password is required to disable 2FA" });

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) return res.status(401).json({ error: "Invalid password" });

      await storage.updateUser2FA(user.id, false, null);
      res.json({ success: true, message: "Two-factor authentication disabled" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
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

      if (user.disabled) {
        return res.status(403).json({ error: "Your account has been disabled. Please contact support." });
      }

      if (user.orgSubscriptionExpiresAt) {
        const expiresAt = new Date(user.orgSubscriptionExpiresAt);
        const now = new Date();
        const daysSinceExpiry = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceExpiry > 7) {
          return res.status(403).json({ error: "Your organisation's subscription has expired. Please contact AOK to renew your subscription." });
        }
      }

      const totpCode = req.body.totpCode as string | undefined;
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!totpCode) {
          return res.status(200).json({ requires2FA: true, email });
        }
        const totp = new OTPAuth.TOTP({
          issuer: "aok",
          label: user.email,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
        });
        const valid = totp.validate({ token: totpCode, window: 1 });
        if (valid === null) {
          return res.status(401).json({ error: "Invalid verification code" });
        }
      }

      const session = await storage.createSession(user.id);
      console.log("[ORG LOGIN] Session created:", session.id, "for user:", user.id);

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("session", session.id, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash, twoFactorSecret, ...userProfile } = user;
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
          ...(orgClient.featureEmergencyRecording ? { emergencyRecordingEnabled: true } : {}),
        });
        
        // Copy pending contacts to user's contacts (supervisor first as primary)
        const pendingContacts = await organizationStorage.getPendingClientContacts(orgClient.id);
        const sortedContacts = [...pendingContacts].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        for (const contact of sortedContacts) {
          if (contact.email && contact.name) {
            const { contact: createdContact, confirmationToken } = await storage.createContact(user.id, {
              name: contact.name,
              email: contact.email,
              phone: contact.phone || "",
              phoneType: (contact.phoneType ?? "mobile") as "mobile" | "landline",
              relationship: contact.relationship ?? "Emergency Contact",
            });
            sendContactConfirmationEmail(createdContact, user, confirmationToken, baseUrl).catch(err => {
              console.error("[ACTIVATE] Failed to send confirmation email to contact:", contact.email, err);
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

      // Get confirmed primary contacts and send logout notification to each with location
      const primaryContacts = await storage.getPrimaryContacts(user.id);
      
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
      await storage.deleteSession(sessionId);
      res.clearCookie("session");
      return res.status(401).json({ error: "User not found" });
    }

    // Check if user is disabled
    if (user.disabled) {
      await storage.deleteSession(sessionId);
      res.clearCookie("session");
      return res.status(403).json({ error: "Your account has been disabled. Please contact support." });
    }

    const { passwordHash, twoFactorSecret, ...userProfile } = user;
    
    // Check if user is a staff member (accepted a staff invite)
    const staffInfo = await storage.isStaffMember(user.id);
    
    // Check if user is an org client and apply org's feature restrictions
    const orgClientFeatures = await organizationStorage.getClientFeaturesByUserId(user.id);
    if (orgClientFeatures) {
      const mergedProfile = {
        ...userProfile,
        featureWellbeingAi: orgClientFeatures.featureWellbeingAi && userProfile.featureWellbeingAi,
        featureShakeToAlert: orgClientFeatures.featureShakeToAlert && userProfile.featureShakeToAlert,
        featureWellness: orgClientFeatures.featureMoodTracking && userProfile.featureWellness,
        featurePetProtection: orgClientFeatures.featurePetProtection && userProfile.featurePetProtection,
        featureDigitalWill: orgClientFeatures.featureDigitalWill && userProfile.featureDigitalWill,
        orgFeatureRestrictions: orgClientFeatures,
        ...(staffInfo.isStaff ? { isStaffMember: true, staffOrganizationId: staffInfo.organizationId, staffOrganizationName: staffInfo.organizationName } : {}),
      };
      return res.json(mergedProfile);
    }
    
    const profileWithStaff = staffInfo.isStaff 
      ? { ...userProfile, isStaffMember: true, staffOrganizationId: staffInfo.organizationId, staffOrganizationName: staffInfo.organizationName }
      : userProfile;
    res.json(profileWithStaff);
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
  app.post("/api/auth/forgot-password", passwordResetRateLimiter, async (req, res) => {
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
  app.post("/api/auth/reset-password", passwordResetRateLimiter, async (req, res) => {
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
          const linkedErrand = await storage.getErrandSessionByAlertId(confirmation.alertId);
          if (linkedErrand && linkedErrand.status !== "completed" && linkedErrand.status !== "cancelled") {
            await storage.completeErrandSession(linkedErrand.id);
            console.log(`[CONFIRM-SAFETY] Linked activity session ${linkedErrand.id} completed`);
          }
        }
        
        // Log the confirmation with audit trail
        await storage.createAlertLog(
          confirmation.userId, 
          [], 
          `Emergency ended following confirmation by ${confirmation.contactName} at ${confirmationTime.toLocaleString('en-GB')}`
        );
        
        // Send final notification to confirmed contacts only
        const allContactsForEnd = await storage.getContacts(confirmation.userId);
        const contactsWithEmail = allContactsForEnd.filter(c => !!c.confirmedAt && c.email && c.email.trim() !== '');
        
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
  app.use("/api/plan", authMiddleware);
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

  // =====================================================
  // CALL SUPERVISOR (Org-managed clients only)
  // =====================================================
  app.post("/api/call-supervisor", async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Only lone worker staff (linked via staff invite) can call supervisor
      const staffInvite = await organizationStorage.getStaffInviteByUserId(userId);
      if (!staffInvite) {
        return res.status(403).json({ error: "This feature is only available for lone worker staff members" });
      }

      const org = await storage.getUserById(staffInvite.organizationId);
      if (!org) {
        return res.status(404).json({ error: "Organisation not found" });
      }

      const supervisorPhone = staffInvite.supervisorPhone || org.mobileNumber;
      if (!supervisorPhone) {
        return res.status(400).json({ error: "Your organisation has not set up a phone number for supervisor calls" });
      }

      const callerName = user.name || staffInvite.staffName || "A staff member";
      const supervisorDisplayName = staffInvite.supervisorName || "your supervisor";
      const orgId = staffInvite.organizationId;

      const message = `Hello, this is a call from A O K on behalf of ${callerName}. They are trying to reach ${supervisorDisplayName}. Please call them back or check on them in the A O K dashboard.`;

      const result = await makeVoiceCall(supervisorPhone, message);

      if (result.success) {
        console.log(`[CALL SUPERVISOR] ${callerName} (${userId}) called supervisor at org ${orgId}`);
        res.json({ success: true, message: "Call placed to your supervisor" });
      } else {
        console.error(`[CALL SUPERVISOR] Failed:`, result.error);
        res.status(500).json({ error: "Failed to place the call. Please try again." });
      }
    } catch (error) {
      console.error("[CALL SUPERVISOR] Error:", error);
      res.status(500).json({ error: "Failed to call supervisor" });
    }
  });

  // Get supervisor info for org-managed clients
  app.get("/api/supervisor-info", async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Only lone worker staff (linked via staff invite) get supervisor info
      const staffInvite = await organizationStorage.getStaffInviteByUserId(userId);
      if (staffInvite) {
        const org = await storage.getUserById(staffInvite.organizationId);
        if (org) {
          const supervisorPhone = staffInvite.supervisorPhone || org.mobileNumber;
          return res.json({
            organizationName: org.name,
            hasPhoneNumber: !!supervisorPhone,
            supervisorName: staffInvite.supervisorName || null,
            supervisorPhone: staffInvite.supervisorPhone || null,
          });
        }
      }

      return res.json({ organizationName: null, hasPhoneNumber: false, supervisorName: null, supervisorPhone: null });
    } catch (error) {
      console.error("[SUPERVISOR INFO] Error:", error);
      res.status(500).json({ error: "Failed to get supervisor info" });
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
      if (error.message === "Maximum of 3 primary contacts/carers allowed") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to set primary contact/carer" });
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
          
          // Notify the newly promoted primary contact (only if confirmed)
          if (remainingContacts[0].confirmedAt) {
            const user = await storage.getUserById(req.userId!);
            if (user) {
              await sendPrimaryContactPromotionNotification(remainingContacts[0], user);
            }
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
      
      const allContacts = await storage.getContacts(req.userId!);
      const contacts = allContacts.filter(c => !!c.confirmedAt);
      console.log('[EMERGENCY] Found contacts:', allContacts.length, 'confirmed:', contacts.length, contacts.map(c => c.name));
      
      if (allContacts.length === 0) {
        return res.status(400).json({ error: "No emergency contacts configured" });
      }
      if (contacts.length === 0) {
        return res.status(400).json({ error: "No confirmed emergency contacts. Your contacts must accept their confirmation email first." });
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
      
      // Enrich additionalInfo with org client emergency notes if applicable
      let enrichedAdditionalInfo = userSettings?.additionalInfo;
      if (user.accountType === "organization" && user.referenceId) {
        const orgClients = await organizationStorage.getOrganizationClientsForUser(req.userId!);
        const orgClient = orgClients[0];
        if (orgClient?.emergencyNotes) {
          try {
            const parsed = enrichedAdditionalInfo ? JSON.parse(enrichedAdditionalInfo) : {};
            parsed.emergencyNotes = orgClient.emergencyNotes;
            enrichedAdditionalInfo = JSON.stringify(parsed);
          } catch {
            enrichedAdditionalInfo = JSON.stringify({ emergencyNotes: orgClient.emergencyNotes });
          }
        }
      }

      // Send email and SMS alerts
      const alertResult = await sendEmergencyAlert(
        contacts, 
        user, 
        location,
        false, // isLocationUpdate
        enrichedAdditionalInfo
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

  // Emergency recording endpoints
  const objectStorageService = new ObjectStorageService();

  // Initialize a new emergency recording
  app.post("/api/emergency/recordings/init", async (req, res) => {
    try {
      const userSettings = await storage.getSettings(req.userId!);
      if (!userSettings.emergencyRecordingEnabled) {
        return res.status(403).json({ error: "Emergency recording is not enabled" });
      }

      const activeAlert = await storage.getActiveEmergencyAlert(req.userId!);
      if (!activeAlert) {
        return res.status(400).json({ error: "No active emergency alert" });
      }

      const retentionExpiresAt = new Date();
      retentionExpiresAt.setDate(retentionExpiresAt.getDate() + 90);

      const contentType = req.body?.contentType || "video/webm";

      const recording = await storage.createEmergencyRecording({
        userId: req.userId!,
        alertId: activeAlert.id,
        contentType,
        retentionExpiresAt,
      });

      console.log(`[EMERGENCY RECORDING] Initialized recording ${recording.id} for user ${req.userId}, alert ${activeAlert.id}`);

      res.json({
        recordingId: recording.id,
        alertId: activeAlert.id,
        retentionExpiresAt: retentionExpiresAt.toISOString(),
      });
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to initialize recording:", error);
      res.status(500).json({ error: "Failed to initialize recording" });
    }
  });

  // Request a presigned upload URL for a recording
  app.post("/api/emergency/recordings/upload-url", async (req, res) => {
    try {
      const { recordingId, contentType } = req.body;
      if (!recordingId) {
        return res.status(400).json({ error: "Missing recordingId" });
      }

      const recording = await storage.getEmergencyRecording(recordingId);
      if (!recording || recording.userId !== req.userId) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      await storage.updateEmergencyRecording(recordingId, { objectPath });

      console.log(`[EMERGENCY RECORDING] Upload URL generated for recording ${recordingId}, path: ${objectPath}`);

      res.json({
        uploadURL,
        objectPath,
        contentType: contentType || recording.contentType,
      });
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to generate upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Finalize a recording after upload
  app.post("/api/emergency/recordings/complete", async (req, res) => {
    try {
      const { recordingId, fileSize, durationSeconds } = req.body;
      if (!recordingId) {
        return res.status(400).json({ error: "Missing recordingId" });
      }

      const recording = await storage.getEmergencyRecording(recordingId);
      if (!recording || recording.userId !== req.userId) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const updated = await storage.updateEmergencyRecording(recordingId, {
        status: "ready",
        fileSize: fileSize || null,
        durationSeconds: durationSeconds || null,
      });

      console.log(`[EMERGENCY RECORDING] Recording ${recordingId} completed: ${fileSize} bytes, ${durationSeconds}s`);

      res.json(updated);
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to complete recording:", error);
      res.status(500).json({ error: "Failed to complete recording" });
    }
  });

  // List recordings for the current user
  app.get("/api/emergency/recordings", async (req, res) => {
    try {
      const recordings = await storage.getEmergencyRecordingsForUser(req.userId!);
      res.json(recordings);
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to list recordings:", error);
      res.status(500).json({ error: "Failed to list recordings" });
    }
  });

  // Get a single recording with download URL
  app.get("/api/emergency/recordings/:id", async (req, res) => {
    try {
      const recording = await storage.getEmergencyRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      if (recording.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(recording);
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to get recording:", error);
      res.status(500).json({ error: "Failed to get recording" });
    }
  });

  // Stream/download a recording file
  app.get("/api/emergency/recordings/:id/download", async (req, res) => {
    try {
      const recording = await storage.getEmergencyRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      if (recording.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!recording.objectPath || recording.status !== "ready") {
        return res.status(404).json({ error: "Recording file not available" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(recording.objectPath);
      const [metadata] = await objectFile.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "video/webm",
        "Content-Length": metadata.size?.toString() || "",
        "Content-Disposition": `attachment; filename="emergency-recording-${recording.id}.webm"`,
      });
      const stream = objectFile.createReadStream();
      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to download recording:", error);
      res.status(500).json({ error: "Failed to download recording" });
    }
  });

  // Stream a recording for inline playback
  app.get("/api/emergency/recordings/:id/stream", async (req, res) => {
    try {
      const recording = await storage.getEmergencyRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      if (recording.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!recording.objectPath || recording.status !== "ready") {
        return res.status(404).json({ error: "Recording file not available" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(recording.objectPath);
      const [metadata] = await objectFile.getMetadata();
      const contentType = metadata.contentType || "video/webm";
      const fileSize = parseInt(metadata.size?.toString() || "0", 10);

      const range = req.headers.range;
      if (range && fileSize > 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).set({ "Content-Range": `bytes */${fileSize}` }).end();
          return;
        }
        const chunkSize = end - start + 1;
        res.status(206);
        res.set({
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Content-Disposition": "inline",
        });
        const stream = objectFile.createReadStream({ start, end });
        stream.pipe(res);
      } else {
        res.set({
          "Content-Type": contentType,
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
          "Content-Disposition": "inline",
        });
        const stream = objectFile.createReadStream();
        stream.pipe(res);
      }
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to stream recording:", error);
      res.status(500).json({ error: "Failed to stream recording" });
    }
  });

  // Delete a recording
  app.delete("/api/emergency/recordings/:id", async (req, res) => {
    try {
      const recording = await storage.getEmergencyRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      if (recording.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (recording.objectPath) {
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(recording.objectPath);
          await objectFile.delete();
          console.log(`[EMERGENCY RECORDING] Deleted object: ${recording.objectPath}`);
        } catch (objErr) {
          console.error("[EMERGENCY RECORDING] Failed to delete object:", objErr);
        }
      }

      await storage.deleteEmergencyRecording(req.params.id);
      console.log(`[EMERGENCY RECORDING] Deleted recording ${req.params.id}`);

      res.json({ success: true });
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to delete recording:", error);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  // Get recording status for an active emergency alert
  app.get("/api/emergency/:alertId/recording-status", async (req, res) => {
    try {
      const recordings = await storage.getEmergencyRecordingsForAlert(req.params.alertId);
      const userRecordings = recordings.filter(r => r.userId === req.userId);
      res.json({
        hasRecordings: userRecordings.length > 0,
        recordings: userRecordings,
      });
    } catch (error) {
      console.error("[EMERGENCY RECORDING] Failed to get recording status:", error);
      res.status(500).json({ error: "Failed to get recording status" });
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
      
      const linkedErrand = await storage.getErrandSessionByAlertId(activeAlert.id);
      if (linkedErrand && linkedErrand.status !== "completed" && linkedErrand.status !== "cancelled") {
        await storage.completeErrandSession(linkedErrand.id);
        console.log(`[EMERGENCY] Linked activity session ${linkedErrand.id} completed on password deactivation`);
      }
      
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
      
      // Get confirmed contacts to notify them
      const allContactsForDeactivation = await storage.getContacts(userId);
      const contacts = allContactsForDeactivation.filter(c => !!c.confirmedAt);
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
      
      // Send confirmation request notifications to confirmed contacts
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
  app.get("/api/plan", async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.accountType === "organization" || user.referenceId) {
        return res.json({ tier: "complete" as PlanTier, features: getPlanFeatures("complete") });
      }

      const planFeatures = await stripeService.getUserPlanFeatures(user.email);
      res.json({ tier: planFeatures.tier, features: planFeatures });
    } catch (error) {
      console.error("[API] Failed to get plan:", error);
      res.status(500).json({ error: "Failed to get plan information" });
    }
  });

  app.get("/api/features", async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.accountType === "organization") {
        return res.json({
          isOrgAccount: true,
          featureWellbeingAi: false,
          featureMoodTracking: false,
          featurePetProtection: false,
          featureDigitalWill: false,
          featureFitnessTracking: false,
        });
      }

      const features = await organizationStorage.getClientFeaturesByUserId(req.userId!);
      
      if (features) {
        return res.json({
          isOrgAccount: false,
          isOrgClient: true,
          ...features,
        });
      }

      const planFeatures = await stripeService.getUserPlanFeatures(user.email);

      res.json({
        isOrgAccount: false,
        isOrgClient: false,
        planTier: planFeatures.tier,
        featureWellbeingAi: planFeatures.wellbeingAi,
        featureMoodTracking: planFeatures.moodTracking,
        featurePetProtection: planFeatures.petProtection,
        featureDigitalWill: planFeatures.digitalDocuments,
        featureFitnessTracking: planFeatures.activities,
        featureShakeToAlert: planFeatures.shakeToAlert,
        featureContinuousTracking: planFeatures.continuousTracking,
        featureEmergencyRecording: planFeatures.emergencyRecording,
        featurePushNotifications: planFeatures.pushNotifications,
        maxActiveContacts: planFeatures.maxActiveContacts,
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

  // ===== GDPR DATA PORTABILITY & ACCOUNT DELETION =====

  app.get("/api/gdpr/export", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const userSettings = await storage.getSettings(userId);
      const contacts = await storage.getContacts(userId);
      const checkInHistory = await storage.getCheckInHistory(userId);
      const alertHistory = await storage.getAlertLogs(userId);

      let moodData: any[] = [];
      let petData: any[] = [];
      try {
        moodData = await storage.getMoodEntries(userId);
      } catch (e) {}
      try {
        petData = await storage.getPets(userId);
      } catch (e) {}

      const { passwordHash, twoFactorSecret, archivedEmail, archivedBy, ...safeUser } = user;

      const exportData = {
        exportDate: new Date().toISOString(),
        exportType: "GDPR Subject Access Request - Full Data Export",
        account: safeUser,
        settings: userSettings,
        emergencyContacts: contacts.map(c => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
          phoneType: c.phoneType,
          relationship: c.relationship,
          isPrimary: c.isPrimary,
          confirmedAt: c.confirmedAt,
          createdAt: c.createdAt,
        })),
        checkInHistory: checkInHistory,
        alertHistory: alertHistory,
        moodEntries: moodData,
        pets: petData,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="aok-data-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("[GDPR] Data export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/api/gdpr/delete-account", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required to delete your account" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      const success = await storage.archiveUser(userId, "self-deletion");
      if (!success) {
        return res.status(500).json({ error: "Failed to delete account" });
      }

      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) console.error("[GDPR] Session destroy error:", err);
        });
      }

      console.log(`[GDPR] User ${userId} self-deleted their account`);
      res.json({ success: true, message: "Your account has been deleted. Your data will be permanently removed within 30 days." });
    } catch (error) {
      console.error("[GDPR] Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
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

  // Diagnose Twilio credentials (no SMS sent) - admin only
  app.get("/api/diagnose-twilio", adminAuthMiddleware, async (req, res) => {
    try {
      const result = await diagnoseTwilioCredentials();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to diagnose Twilio credentials" });
    }
  });

  // Test SMS endpoint - admin only
  app.post("/api/test-sms", adminAuthMiddleware, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber || typeof phoneNumber !== "string") {
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
      res.status(500).json({ error: "Failed to send test SMS" });
    }
  });

  // Test email endpoint - admin only
  app.post("/api/test-email", adminAuthMiddleware, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email address required" });
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
      res.status(500).json({ error: "Failed to send test email" });
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

  const pendingPetInsuranceUploads = new Map<string, { objectPath: string; expiresAt: number }>();

  function sanitizeFileName(name: string): string {
    return name.replace(/[^\w.\-_ ]/g, "_").slice(0, 200);
  }

  // Pet insurance document upload URL
  app.post("/api/pets/:id/insurance/upload-url", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const pet = await storage.getPet(req.userId, req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      const uploadKey = `${req.userId}:${req.params.id}`;
      pendingPetInsuranceUploads.set(uploadKey, { objectPath, expiresAt: Date.now() + 15 * 60 * 1000 });
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("[PET INSURANCE] Failed to generate upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Finalize pet insurance document upload
  app.post("/api/pets/:id/insurance/finalize", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { objectPath, fileName } = req.body;
      if (!objectPath || typeof objectPath !== "string" || !fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "Missing or invalid objectPath or fileName" });
      }

      const uploadKey = `${req.userId}:${req.params.id}`;
      const pending = pendingPetInsuranceUploads.get(uploadKey);
      if (!pending || pending.objectPath !== objectPath || pending.expiresAt < Date.now()) {
        return res.status(403).json({ error: "Invalid or expired upload" });
      }
      pendingPetInsuranceUploads.delete(uploadKey);

      const pet = await storage.getPet(req.userId, req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      if (pet.insuranceDocumentPath) {
        try {
          const oldFile = await objectStorageService.getObjectEntityFile(pet.insuranceDocumentPath);
          await oldFile.delete();
        } catch (e) {
          console.warn("[PET INSURANCE] Failed to clean up old document:", e);
        }
      }

      const safeName = sanitizeFileName(fileName);
      const updated = await storage.updatePet(req.userId, req.params.id, {
        insuranceDocumentPath: objectPath,
        insuranceDocumentName: safeName,
      } as any);
      res.json({ success: true, pet: updated });
    } catch (error) {
      console.error("[PET INSURANCE] Failed to finalize upload:", error);
      res.status(500).json({ error: "Failed to save document" });
    }
  });

  // Download pet insurance document
  app.get("/api/pets/:id/insurance/download", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const pet = await storage.getPet(req.userId, req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      if (!pet.insuranceDocumentPath) return res.status(404).json({ error: "No insurance document" });

      const objectFile = await objectStorageService.getObjectEntityFile(pet.insuranceDocumentPath);
      const safeName = sanitizeFileName(pet.insuranceDocumentName || "insurance-document");
      res.set("Content-Disposition", `attachment; filename="${safeName}"`);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("[PET INSURANCE] Failed to download:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  // View pet insurance document (inline)
  app.get("/api/pets/:id/insurance/view", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const pet = await storage.getPet(req.userId, req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      if (!pet.insuranceDocumentPath) return res.status(404).json({ error: "No insurance document" });

      const objectFile = await objectStorageService.getObjectEntityFile(pet.insuranceDocumentPath);
      const safeName = sanitizeFileName(pet.insuranceDocumentName || "insurance-document");
      res.set("Content-Disposition", `inline; filename="${safeName}"`);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("[PET INSURANCE] Failed to view:", error);
      res.status(500).json({ error: "Failed to view document" });
    }
  });

  // Delete pet insurance document
  app.delete("/api/pets/:id/insurance", async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const pet = await storage.getPet(req.userId, req.params.id);
      if (!pet) return res.status(404).json({ error: "Pet not found" });
      if (!pet.insuranceDocumentPath) return res.status(404).json({ error: "No insurance document" });

      try {
        const objectFile = await objectStorageService.getObjectEntityFile(pet.insuranceDocumentPath);
        await objectFile.delete();
      } catch (e) {
        console.warn("[PET INSURANCE] Failed to delete object from storage:", e);
      }

      await storage.updatePet(req.userId, req.params.id, {
        insuranceDocumentPath: null,
        insuranceDocumentName: null,
      } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("[PET INSURANCE] Failed to delete:", error);
      res.status(500).json({ error: "Failed to delete document" });
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

  app.get("/sms-checkin/:token", async (req, res) => {
    try {
      const tokenData = await storage.getSmsCheckinTokenByToken(req.params.token);
      const isValid = tokenData && !tokenData.used && new Date() < tokenData.expiresAt;
      const user = isValid ? await storage.getUserById(tokenData.userId) : null;
      const firstName = user?.name?.split(' ')[0] || "there";

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>aok - Check In</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0fdf4;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
    .logo{display:flex;align-items:center;gap:8px;margin-bottom:32px}
    .logo svg{width:40px;height:40px;color:#16a34a}
    .logo span{font-size:32px;font-weight:700;color:#16a34a}
    .card{background:white;border-radius:16px;padding:32px;box-shadow:0 2px 16px rgba(0,0,0,0.08);text-align:center;max-width:380px;width:100%}
    h1{font-size:22px;color:#111;margin-bottom:8px}
    p{font-size:15px;color:#666;margin-bottom:24px;line-height:1.5}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:20px 24px;border:none;border-radius:14px;font-size:22px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.5px}
    .btn-check{background:#16a34a;color:white;box-shadow:0 4px 14px rgba(22,163,74,0.4)}
    .btn-check:hover{background:#15803d;transform:scale(1.02)}
    .btn-check:active{transform:scale(0.98)}
    .btn-check:disabled{background:#a3a3a3;box-shadow:none;transform:none;cursor:not-allowed}
    .btn-check svg{width:28px;height:28px}
    .success{display:none}
    .success.show{display:block}
    .success h1{color:#16a34a;font-size:26px}
    .success .tick{width:64px;height:64px;margin:0 auto 16px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center}
    .success .tick svg{width:36px;height:36px;color:white}
    .error{display:none;color:#dc2626;margin-top:12px;font-size:14px}
    .error.show{display:block}
    .expired{color:#dc2626}
    .footer{margin-top:24px;font-size:12px;color:#999}
    .spin{animation:spin 1s linear infinite}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="logo">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    <span>aok</span>
  </div>
  <div class="card">
    ${isValid ? `
    <div id="loading-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin" style="margin:0 auto 16px;display:block"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      <h1>Checking you in...</h1>
      <p>Hold tight, ${firstName}. We're letting your contacts know you're safe.</p>
    </div>
    <div class="success" id="success-msg">
      <div class="tick"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
      <h1>You're checked in</h1>
      <p>Your contacts have been notified.</p>
    </div>
    <div id="offline-state" style="display:none">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 16px;display:block"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M2.7 10.3a8 8 0 0 1 0 0"/><circle cx="12" cy="12" r="10"/></svg>
      <h1 style="color:#f59e0b">Waiting for signal...</h1>
      <p>No connection right now. Keep this page open &mdash; we'll check you in automatically as soon as you get signal.</p>
    </div>
    <div id="error-state" style="display:none">
      <h1 class="expired" id="error-title">Something went wrong</h1>
      <p id="error-detail">Please try again or open the aok app.</p>
      <button class="btn btn-check" onclick="doCheckin()" style="margin-top:16px">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        Try Again
      </button>
    </div>
    <script>
      var retryTimer=null;
      var done=false;
      function show(id){['loading-state','success-msg','offline-state','error-state'].forEach(function(s){document.getElementById(s).style.display=s===id?'block':'none'})}
      function stopRetry(){if(retryTimer){clearInterval(retryTimer);retryTimer=null}}
      async function doCheckin(){
        if(done)return;
        if(!navigator.onLine){show('offline-state');startRetry();return}
        show('loading-state');
        try{
          var r=await fetch('/api/sms-checkin/${req.params.token}',{method:'POST'});
          var d=await r.json();
          if(r.ok&&d.success){done=true;show('success-msg');stopRetry()}
          else{document.getElementById('error-detail').textContent=d.error||'Something went wrong.';show('error-state');stopRetry()}
        }catch(e){
          show('offline-state');
          startRetry();
        }
      }
      function startRetry(){if(!retryTimer&&!done){retryTimer=setInterval(doCheckin,5000)}}
      window.addEventListener('online',function(){if(!done)doCheckin()});
      window.addEventListener('offline',function(){if(!done)show('offline-state')});
      doCheckin();
    </script>
    ` : `
    <h1 class="expired">Link Expired</h1>
    <p>This check-in link has expired or has already been used. Open the aok app to check in, or wait for a new SMS.</p>
    `}
  </div>
  <p class="footer">aok.care &mdash; personal wellbeing tools</p>
</body>
</html>`);
    } catch (error) {
      console.error("[SMS CHECK-IN] Error rendering page:", error);
      res.status(500).send("Something went wrong. Please try again.");
    }
  });

  app.post("/api/sms-checkin/:token", async (req, res) => {
    try {
      // Check if token was already used (idempotent - return success if already consumed)
      const existing = await storage.getSmsCheckinTokenByToken(req.params.token);
      if (existing && existing.used) {
        return res.json({ success: true });
      }

      const consumed = await storage.consumeSmsCheckinToken(req.params.token);
      if (!consumed) {
        return res.status(400).json({ error: "This check-in link has expired or already been used." });
      }

      const contacts = await storage.getContacts(consumed.userId);
      if (contacts.length === 0) {
        return res.status(400).json({ error: "No emergency contacts configured." });
      }

      await storage.createCheckIn(consumed.userId);

      const primaryContacts = await storage.getPrimaryContacts(consumed.userId);
      const user = await storage.getUserById(consumed.userId);
      if (primaryContacts.length > 0 && user) {
        for (const contact of primaryContacts) {
          sendSuccessfulCheckInNotification(contact, user as any).catch(err => {
            console.error("[SMS CHECK-IN] Failed to notify primary contact:", contact.email, err);
          });
        }
      }

      console.log(`[SMS CHECK-IN] User ${consumed.userId} checked in via SMS link`);
      res.json({ success: true });
    } catch (error) {
      console.error("[SMS CHECK-IN] Error processing check-in:", error);
      res.status(500).json({ error: "Failed to process check-in. Please try again." });
    }
  });

  // ==================== LONE WORKER SESSION ROUTES ====================

  app.get("/api/lone-worker/supervisor", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const supervisor = await storage.getStaffSupervisorInfo(user.id);
      if (!supervisor) {
        return res.json({ hasSupervisor: false });
      }
      res.json({
        hasSupervisor: true,
        supervisorName: supervisor.supervisorName,
        supervisorPhone: supervisor.supervisorPhone,
        supervisorEmail: supervisor.supervisorEmail,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get supervisor info" });
    }
  });

  app.post("/api/lone-worker/start", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const staffInfo = await storage.isStaffMember(user.id);
      if (!staffInfo.isStaff) return res.status(403).json({ error: "Only staff members can start lone worker sessions" });

      const existing = await storage.getActiveLoneWorkerSession(user.id);
      if (existing) return res.status(409).json({ error: "You already have an active session", session: existing });

      const { insertLoneWorkerSessionSchema } = await import("@shared/schema");
      const parsed = insertLoneWorkerSessionSchema.parse(req.body);
      const session = await storage.createLoneWorkerSession(user.id, staffInfo.organizationId!, parsed);

      await storage.createAuditEntry(staffInfo.organizationId!, {
        userId: user.id,
        userEmail: user.email,
        userRole: "staff",
        action: "session_started",
        entityType: "lone_worker_session",
        entityId: session.id,
        newData: { jobType: parsed.jobType, jobDescription: parsed.jobDescription, expectedDurationMins: parsed.expectedDurationMins, checkInIntervalMins: parsed.checkInIntervalMins, staffName: user.name },
        ipAddress: req.ip || undefined,
      });

      res.json(session);
    } catch (error: any) {
      console.error("[LONE WORKER] Error starting session:", error);
      res.status(400).json({ error: "Failed to start session" });
    }
  });

  app.get("/api/lone-worker/active", authMiddleware, async (req, res) => {
    try {
      const session = await storage.getActiveLoneWorkerSession(req.user!.id);
      res.json({ session: session || null });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get active session" });
    }
  });

  app.get("/api/lone-worker/history", authMiddleware, async (req, res) => {
    try {
      const sessions = await storage.getLoneWorkerSessionHistory(req.user!.id);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get session history" });
    }
  });

  app.post("/api/lone-worker/:sessionId/check-in", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { status, lat, lng } = req.body;
      const session = await storage.getLoneWorkerSession(req.params.sessionId);
      if (!session || session.userId !== user.id) return res.status(404).json({ error: "Session not found" });

      const checkIn = await storage.loneWorkerCheckIn(req.params.sessionId, user.id, status || "ok", lat, lng);

      await storage.createAuditEntry(session.organizationId, {
        userId: user.id,
        userEmail: user.email,
        userRole: "staff",
        action: status === "help_needed" ? "check_in_help_needed" : "check_in_ok",
        entityType: "lone_worker_session",
        entityId: req.params.sessionId,
        newData: { checkInId: checkIn.id, status: status || "ok", lat, lng, staffName: user.name },
        ipAddress: req.ip || undefined,
      });

      res.json(checkIn);
    } catch (error: any) {
      console.error("[LONE WORKER] Check-in error:", error);
      res.status(400).json({ error: "Failed to check in" });
    }
  });

  app.post("/api/lone-worker/:sessionId/panic", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const session = await storage.getLoneWorkerSession(req.params.sessionId);
      if (!session || session.userId !== user.id) return res.status(404).json({ error: "Session not found" });

      const { lat, lng, what3words } = req.body;
      const updated = await storage.loneWorkerPanic(req.params.sessionId, lat, lng);
      
      await storage.createLoneWorkerEscalation(
        req.params.sessionId,
        "local_alert",
        "user_panic",
        undefined,
        lat, lng, what3words
      );

      await storage.createAuditEntry(session.organizationId, {
        userId: user.id,
        userEmail: user.email,
        userRole: "staff",
        action: "panic_triggered",
        entityType: "lone_worker_session",
        entityId: req.params.sessionId,
        newData: { lat, lng, what3words, staffName: user.name, jobType: session.jobType },
        ipAddress: req.ip || undefined,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("[LONE WORKER] Panic error:", error);
      res.status(500).json({ error: "Failed to trigger panic" });
    }
  });

  app.post("/api/lone-worker/:sessionId/cancel-panic", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const session = await storage.getLoneWorkerSession(req.params.sessionId);
      if (!session || session.userId !== user.id) return res.status(404).json({ error: "Session not found" });
      if (session.status !== "panic") return res.status(400).json({ error: "Session is not in panic state" });

      const updated = await storage.loneWorkerCancelPanic(req.params.sessionId);

      await storage.createAuditEntry(session.organizationId, {
        userId: user.id,
        userEmail: user.email,
        userRole: "staff",
        action: "panic_cancelled",
        entityType: "lone_worker_session",
        entityId: req.params.sessionId,
        newData: { staffName: user.name, jobType: session.jobType },
        ipAddress: req.ip || undefined,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("[LONE WORKER] Cancel panic error:", error);
      res.status(500).json({ error: "Failed to cancel panic" });
    }
  });

  app.post("/api/lone-worker/:sessionId/resolve", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const session = await storage.getLoneWorkerSession(req.params.sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.userId !== user.id && session.organizationId !== user.id) {
        return res.status(403).json({ error: "Not authorised to resolve this session" });
      }

      const { outcome, notes } = req.body;
      if (!outcome || !["safe", "assistance_required", "emergency_attended"].includes(outcome)) {
        return res.status(400).json({ error: "Invalid outcome" });
      }

      const resolved = await storage.resolveLoneWorkerSession(req.params.sessionId, user.id, outcome, notes);

      const isOrgResolving = user.accountType === "organization";
      await storage.createAuditEntry(session.organizationId, {
        userId: user.id,
        userEmail: user.email,
        userRole: isOrgResolving ? "organization" : "staff",
        action: "session_resolved",
        entityType: "lone_worker_session",
        entityId: req.params.sessionId,
        newData: { outcome, notes, resolvedBy: isOrgResolving ? "organisation" : "staff", staffName: user.name },
        previousData: { status: session.status, jobType: session.jobType },
        ipAddress: req.ip || undefined,
      });

      res.json(resolved);
    } catch (error: any) {
      console.error("[LONE WORKER] Resolve error:", error);
      res.status(500).json({ error: "Failed to resolve session" });
    }
  });

  app.post("/api/lone-worker/:sessionId/location", authMiddleware, async (req, res) => {
    try {
      const session = await storage.getLoneWorkerSession(req.params.sessionId);
      if (!session || session.userId !== req.user!.id) return res.status(404).json({ error: "Session not found" });
      if (session.status === "resolved" || session.endedAt) return res.status(400).json({ error: "Session ended" });

      const { lat, lng } = req.body;
      if (!lat || !lng) return res.status(400).json({ error: "Location required" });

      await storage.loneWorkerUpdateLocation(req.params.sessionId, lat, lng);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.get("/api/lone-worker/:sessionId/escalations", authMiddleware, async (req, res) => {
    try {
      const escalations = await storage.getLoneWorkerEscalations(req.params.sessionId);
      res.json(escalations);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get escalations" });
    }
  });

  app.get("/api/lone-worker/:sessionId/check-ins", authMiddleware, async (req, res) => {
    try {
      const checkIns = await storage.getLoneWorkerCheckIns(req.params.sessionId);
      res.json(checkIns);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get check-ins" });
    }
  });

  // Org monitoring: get active lone worker sessions for their org
  app.get("/api/org/lone-worker/active", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      if (user.accountType !== "organization") return res.status(403).json({ error: "Organisation access only" });
      const sessions = await storage.getOrgActiveLoneWorkerSessions(user.id);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get active sessions" });
    }
  });

  app.get("/api/org/lone-worker/history", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      if (user.accountType !== "organization") return res.status(403).json({ error: "Organisation access only" });
      const sessions = await storage.getOrgLoneWorkerSessionHistory(user.id);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get session history" });
    }
  });

  // ===== STRAVA FITNESS TRACKING =====

  const stravaOAuthStates = new Map<string, { nonce: string; expiresAt: number }>();

  app.get("/api/strava/status", authMiddleware, async (req, res) => {
    try {
      const connection = await storage.getStravaConnection(req.userId!);
      if (!connection) return res.json({ connected: false });
      res.json({
        connected: true,
        athleteId: connection.athleteId,
        athleteFirstName: connection.athleteFirstName,
        athleteLastName: connection.athleteLastName,
        athleteProfileImage: connection.athleteProfileImage,
        connectedAt: connection.connectedAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check Strava status" });
    }
  });

  app.get("/api/strava/auth-url", authMiddleware, async (req, res) => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    if (!clientId) {
      console.error("[STRAVA] STRAVA_CLIENT_ID not found in environment");
      return res.status(500).json({ error: "Strava integration not configured" });
    }
    const host = req.get("host") || "";
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    const redirectUri = `${protocol}://${host}/api/strava/callback`;
    const scope = "read,activity:read_all,profile:read_all";
    const stateNonce = randomBytes(32).toString("hex");
    stravaOAuthStates.set(req.userId!, { nonce: stateNonce, expiresAt: Date.now() + 10 * 60 * 1000 });
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${stateNonce}&approval_prompt=auto`;
    res.json({ url });
  });

  app.get("/api/strava/callback", authMiddleware, async (req, res) => {
    const { code, state, error: stravaError } = req.query;
    if (stravaError) return res.redirect("/fitness?error=denied");
    if (!code || !state) return res.redirect("/fitness?error=missing_params");

    const storedState = stravaOAuthStates.get(req.userId!);
    if (!storedState || storedState.nonce !== state || Date.now() > storedState.expiresAt) {
      stravaOAuthStates.delete(req.userId!);
      return res.redirect("/fitness?error=invalid_state");
    }
    stravaOAuthStates.delete(req.userId!);

    const userId = req.userId!;
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.redirect("/fitness?error=not_configured");

    try {
      const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) return res.redirect("/fitness?error=token_exchange");

      const tokenData = await tokenRes.json();
      const athlete = tokenData.athlete || {};
      await storage.createStravaConnection({
        userId,
        athleteId: String(athlete.id),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(tokenData.expires_at * 1000),
        scope: "read,activity:read_all,profile:read_all",
        athleteFirstName: athlete.firstname || null,
        athleteLastName: athlete.lastname || null,
        athleteProfileImage: athlete.profile || null,
      });
      res.redirect("/fitness?connected=true");
    } catch (error: any) {
      console.error("[STRAVA] OAuth callback error:", error);
      res.redirect("/fitness?error=server_error");
    }
  });

  async function refreshStravaToken(userId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    try {
      const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!tokenRes.ok) return null;
      const data = await tokenRes.json();
      const newTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
      };
      await storage.updateStravaConnection(userId, newTokens);
      return newTokens;
    } catch {
      return null;
    }
  }

  async function getValidStravaToken(userId: string): Promise<string | null> {
    const conn = await storage.getStravaConnection(userId);
    if (!conn) return null;
    if (new Date() < conn.expiresAt) return conn.accessToken;
    const refreshed = await refreshStravaToken(userId, conn.refreshToken);
    return refreshed?.accessToken || null;
  }

  app.get("/api/strava/activities", authMiddleware, async (req, res) => {
    try {
      const token = await getValidStravaToken(req.userId!);
      if (!token) return res.status(401).json({ error: "Strava not connected or token expired" });

      const page = parseInt(req.query.page as string) || 1;
      const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 50);
      const after = req.query.after ? parseInt(req.query.after as string) : undefined;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;

      let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
      if (after) url += `&after=${after}`;
      if (before) url += `&before=${before}`;

      const stravaRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!stravaRes.ok) {
        if (stravaRes.status === 401) {
          await storage.deleteStravaConnection(req.userId!);
          return res.status(401).json({ error: "Strava authorisation revoked" });
        }
        return res.status(stravaRes.status).json({ error: "Strava API error" });
      }
      const activities = await stravaRes.json();
      res.json(activities);
    } catch (error: any) {
      console.error("[STRAVA] Activities error:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/strava/stats", authMiddleware, async (req, res) => {
    try {
      const conn = await storage.getStravaConnection(req.userId!);
      if (!conn) return res.status(401).json({ error: "Strava not connected" });
      const token = await getValidStravaToken(req.userId!);
      if (!token) return res.status(401).json({ error: "Token expired" });

      const stravaRes = await fetch(`https://www.strava.com/api/v3/athletes/${conn.athleteId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!stravaRes.ok) return res.status(stravaRes.status).json({ error: "Strava API error" });
      const stats = await stravaRes.json();
      res.json(stats);
    } catch (error: any) {
      console.error("[STRAVA] Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.delete("/api/strava/disconnect", authMiddleware, async (req, res) => {
    try {
      const conn = await storage.getStravaConnection(req.userId!);
      if (conn) {
        try {
          await fetch("https://www.strava.com/oauth/deauthorize", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `access_token=${conn.accessToken}`,
          });
        } catch {}
      }
      await storage.deleteStravaConnection(req.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect Strava" });
    }
  });

  // ─── Fitness Tracking (built-in) ────────────────────────────────────
  const { fitnessStorage } = await import("./fitnessStorage");

  app.post("/api/fitness/activities", authMiddleware, async (req, res) => {
    try {
      const { type, title, privacyLevel } = req.body;
      if (!["run", "walk", "cycle"].includes(type)) return res.status(400).json({ error: "Invalid activity type" });
      const activity = await fitnessStorage.createActivity({
        userId: req.userId!,
        type,
        title: title || null,
        status: "recording",
        startTime: new Date(),
        durationSec: 0,
        distanceM: 0,
        gpsPoints: [],
        privacyLevel: privacyLevel || "private",
        liveShareEnabled: false,
      });
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.patch("/api/fitness/activities/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const activity = await fitnessStorage.updateActivity(id, req.userId!, updates);
      if (!activity) return res.status(404).json({ error: "Activity not found" });
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  app.get("/api/fitness/activities/recording", authMiddleware, async (req, res) => {
    try {
      const activity = await fitnessStorage.getActiveRecording(req.userId!);
      res.json(activity || null);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get recording" });
    }
  });

  app.get("/api/fitness/activities", authMiddleware, async (req, res) => {
    try {
      const { type, dateFrom, dateTo, page, limit } = req.query;
      const activities = await fitnessStorage.getUserActivities(req.userId!, {
        type: type as any,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get activities" });
    }
  });

  app.get("/api/fitness/activities/:id", authMiddleware, async (req, res) => {
    try {
      const canView = await fitnessStorage.canViewActivity(req.params.id, req.userId!);
      if (!canView) return res.status(403).json({ error: "Access denied" });
      const activity = await fitnessStorage.getActivity(req.params.id);
      if (!activity) return res.status(404).json({ error: "Activity not found" });
      const likes = await fitnessStorage.getLikeCount(activity.id);
      const hasLiked = await fitnessStorage.hasUserLiked(activity.id, req.userId!);
      const comments = await fitnessStorage.getComments(activity.id);
      const owner = await storage.getUserById(activity.userId);
      res.json({ ...activity, likeCount: likes, hasLiked, comments, ownerName: owner?.name || "Unknown" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get activity" });
    }
  });

  app.delete("/api/fitness/activities/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await fitnessStorage.deleteActivity(req.params.id, req.userId!);
      if (!deleted) return res.status(404).json({ error: "Activity not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  app.get("/api/fitness/stats", authMiddleware, async (req, res) => {
    try {
      const stats = await fitnessStorage.getUserStats(req.userId!);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/fitness/feed", authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const activities = await fitnessStorage.getFeed(req.userId!, page);
      const enriched = await Promise.all(activities.map(async (a) => {
        const owner = await storage.getUserById(a.userId);
        const likeCount = await fitnessStorage.getLikeCount(a.id);
        const hasLiked = await fitnessStorage.hasUserLiked(a.id, req.userId!);
        const commentCount = (await fitnessStorage.getComments(a.id)).length;
        return { ...a, ownerName: owner?.name || "Unknown", likeCount, hasLiked, commentCount };
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get feed" });
    }
  });

  app.post("/api/fitness/follow/:userId", authMiddleware, async (req, res) => {
    try {
      if (req.params.userId === req.userId) return res.status(400).json({ error: "Cannot follow yourself" });
      const follow = await fitnessStorage.follow(req.userId!, req.params.userId);
      res.json(follow);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  app.delete("/api/fitness/follow/:userId", authMiddleware, async (req, res) => {
    try {
      const unfollowed = await fitnessStorage.unfollow(req.userId!, req.params.userId);
      res.json({ success: unfollowed });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  app.get("/api/fitness/followers", authMiddleware, async (req, res) => {
    try {
      const followers = await fitnessStorage.getFollowers(req.userId!);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get followers" });
    }
  });

  app.get("/api/fitness/following", authMiddleware, async (req, res) => {
    try {
      const following = await fitnessStorage.getFollowing(req.userId!);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get following" });
    }
  });

  app.get("/api/fitness/users/search", authMiddleware, async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (q.length < 2) return res.json([]);
      const users = await fitnessStorage.searchUsers(q, req.userId!);
      const following = await fitnessStorage.getFollowingIds(req.userId!);
      res.json(users.map(u => ({ ...u, isFollowing: following.includes(u.id) })));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.post("/api/fitness/activities/:id/like", authMiddleware, async (req, res) => {
    try {
      const canView = await fitnessStorage.canViewActivity(req.params.id, req.userId!);
      if (!canView) return res.status(403).json({ error: "Access denied" });
      const like = await fitnessStorage.likeActivity(req.params.id, req.userId!);
      res.json(like);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to like activity" });
    }
  });

  app.delete("/api/fitness/activities/:id/like", authMiddleware, async (req, res) => {
    try {
      const unliked = await fitnessStorage.unlikeActivity(req.params.id, req.userId!);
      res.json({ success: unliked });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to unlike activity" });
    }
  });

  app.post("/api/fitness/activities/:id/comments", authMiddleware, async (req, res) => {
    try {
      const canView = await fitnessStorage.canViewActivity(req.params.id, req.userId!);
      if (!canView) return res.status(403).json({ error: "Access denied" });
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: "Comment cannot be empty" });
      const comment = await fitnessStorage.addComment(req.params.id, req.userId!, content.trim());
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  app.delete("/api/fitness/comments/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await fitnessStorage.deleteComment(req.params.id, req.userId!);
      if (!deleted) return res.status(404).json({ error: "Comment not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  app.post("/api/fitness/activities/:id/emergency-attach", authMiddleware, async (req, res) => {
    try {
      const { emergencyAlertId } = req.body;
      if (!emergencyAlertId) return res.status(400).json({ error: "Emergency alert ID required" });
      const activity = await fitnessStorage.getActivity(req.params.id);
      if (!activity || activity.userId !== req.userId) return res.status(404).json({ error: "Activity not found" });
      await fitnessStorage.attachActivityToEmergency(req.params.id, emergencyAlertId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to attach activity to emergency" });
    }
  });

  // ===== ROUTE PLANNING ROUTES =====

  app.post("/api/routes/plan", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const { startLat, startLng, endLat, endLng, mode, waypoints } = req.body;
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: "Start and end coordinates required" });
    }
    const profile = mode === "bike" ? "bike" : "foot";
    try {
      let coords = `${startLng},${startLat}`;
      if (Array.isArray(waypoints) && waypoints.length > 0) {
        for (const wp of waypoints) {
          const wLat = Number(wp.lat);
          const wLng = Number(wp.lng);
          if (isNaN(wLat) || isNaN(wLng) || wLat < -90 || wLat > 90 || wLng < -180 || wLng > 180) continue;
          coords += `;${wLng},${wLat}`;
        }
      }
      coords += `;${endLng},${endLat}`;
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code !== "Ok" || !data.routes?.length) {
        return res.status(400).json({ error: "Could not find route" });
      }
      const route = data.routes[0];
      res.json({
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry.coordinates,
      });
    } catch (err) {
      console.error("OSRM error:", err);
      res.status(500).json({ error: "Routing service unavailable" });
    }
  });

  app.get("/api/routes/weather", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&daily=sunset&timezone=auto&forecast_days=1`;
      const response = await fetch(url);
      const data = await response.json();
      const current = data.current || {};
      const daily = data.daily || {};
      res.json({
        temperature: current.temperature_2m,
        precipitationProbability: current.precipitation_probability,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        sunset: daily.sunset?.[0],
        timezone: data.timezone,
      });
    } catch (err) {
      console.error("Weather error:", err);
      res.status(500).json({ error: "Weather service unavailable" });
    }
  });

  app.post("/api/routes/share", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const { contactId, routeId } = req.body;
    if (!contactId || !routeId) return res.status(400).json({ error: "contactId and routeId required" });
    try {
      const contact = await storage.getContact(req.userId, contactId);
      if (!contact || contact.userId !== req.userId) return res.status(404).json({ error: "Contact not found" });
      const route = await fitnessStorage.getPlannedRoute(routeId);
      if (!route || route.userId !== req.userId) return res.status(404).json({ error: "Route not found" });
      const user = await storage.getUserById(req.userId);
      const distanceKm = (route.distanceM / 1000).toFixed(1);
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "aok <help@aok.care>",
        to: contact.email,
        subject: `${user?.name || "Someone"} shared a route with you`,
        html: `<h2>Route: ${route.name}</h2><p><strong>${user?.name}</strong> shared a planned route with you.</p><p><strong>Distance:</strong> ${distanceKm} km</p><p><strong>Band:</strong> ${route.distanceBand || "Unknown"}</p><p>This route was shared via aok - the personal safety check-in app.</p>`,
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Share route error:", err);
      res.status(500).json({ error: "Failed to share route" });
    }
  });

  app.get("/api/routes", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const routes = await fitnessStorage.getUserPlannedRoutes(req.userId);
    res.json(routes);
  });

  app.post("/api/routes", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const parsed = insertPlannedRouteSchema.parse(req.body);
      const route = await fitnessStorage.createPlannedRoute(req.userId, parsed);
      res.json(route);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to save route" });
    }
  });

  app.get("/api/routes/:id", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const route = await fitnessStorage.getPlannedRoute(req.params.id);
    if (!route || route.userId !== req.userId) return res.status(404).json({ error: "Not found" });
    res.json(route);
  });

  app.delete("/api/routes/:id", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const deleted = await fitnessStorage.deletePlannedRoute(req.params.id, req.userId);
    res.json({ success: deleted });
  });

  app.patch("/api/routes/:id", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const parsed = insertPlannedRouteSchema.partial().parse(req.body);
      const route = await fitnessStorage.updatePlannedRoute(req.params.id, req.userId, parsed);
      if (!route) return res.status(404).json({ error: "Not found" });
      res.json(route);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid update data" });
    }
  });

  // ===== ACTIVITY / ERRANDS ROUTES =====

  app.post("/api/errands/start", authMiddleware, async (req: Request, res: Response) => {
    try {
      const parsed = insertErrandSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      const existing = await storage.getActiveErrandSession(req.userId!);
      if (existing) return res.status(409).json({ error: "You already have an active activity session. Complete or cancel it first." });
      const session = await storage.createErrandSession(req.userId!, parsed.data);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("[ERRANDS] Start error:", error);
      res.status(500).json({ error: "Failed to start activity session" });
    }
  });

  app.get("/api/errands/active", authMiddleware, async (req: Request, res: Response) => {
    try {
      const session = await storage.getActiveErrandSession(req.userId!);
      res.json(session || null);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get active session" });
    }
  });

  app.get("/api/errands/history", authMiddleware, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const sessions = await storage.getErrandSessions(req.userId!, limit);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get session history" });
    }
  });

  app.get("/api/errands/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const session = await storage.getErrandSession(req.userId!, req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  app.post("/api/errands/:id/gps", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { lat, lng } = req.body;
      if (lat == null || lng == null) return res.status(400).json({ error: "Latitude and longitude required" });
      const session = await storage.getErrandSession(req.userId!, req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ error: "Session is no longer active" });
      }
      const gpsPoint = { lat: parseFloat(lat), lng: parseFloat(lng), timestamp: Date.now() };
      const updated = await storage.updateErrandSessionGps(req.params.id, String(lat), String(lng), gpsPoint);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update GPS" });
    }
  });

  app.post("/api/errands/:id/checkin", authMiddleware, async (req: Request, res: Response) => {
    try {
      const session = await storage.getErrandSession(req.userId!, req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ error: "Session is no longer active" });
      }
      if (session.emergencyAlertId) {
        await storage.deactivateEmergencyAlert(session.emergencyAlertId);
        console.log(`[ERRAND] Deactivated emergency alert ${session.emergencyAlertId} on check-in extension`);
      }
      const now = new Date();
      const newExpectedEnd = new Date(now.getTime() + session.expectedDurationMins * 60 * 1000);
      const newGraceEnd = new Date(newExpectedEnd.getTime() + 10 * 60 * 1000);
      const { lat, lng } = req.body;
      if (lat != null && lng != null) {
        const gpsPoint = { lat: parseFloat(lat), lng: parseFloat(lng), timestamp: Date.now() };
        await storage.updateErrandSessionGps(req.params.id, String(lat), String(lng), gpsPoint);
      }
      const updated = await storage.extendErrandSession(req.params.id, newExpectedEnd, newGraceEnd);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  app.post("/api/errands/:id/complete", authMiddleware, async (req: Request, res: Response) => {
    try {
      const session = await storage.getErrandSession(req.userId!, req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ error: "Session already ended" });
      }
      if (session.emergencyAlertId) {
        await storage.deactivateEmergencyAlert(session.emergencyAlertId);
        console.log(`[ERRAND] Deactivated emergency alert ${session.emergencyAlertId} on activity completion`);
      }
      const completed = await storage.completeErrandSession(req.params.id);
      res.json(completed);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to complete session" });
    }
  });

  app.post("/api/errands/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
    try {
      const session = await storage.getErrandSession(req.userId!, req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ error: "Session already ended" });
      }
      if (session.emergencyAlertId) {
        await storage.deactivateEmergencyAlert(session.emergencyAlertId);
        console.log(`[ERRAND] Deactivated emergency alert ${session.emergencyAlertId} on activity cancellation`);
      }
      const cancelled = await storage.cancelErrandSession(req.params.id);
      res.json(cancelled);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to cancel session" });
    }
  });

  app.post("/api/errands/:id/extend", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { additionalMins } = req.body;
      if (!additionalMins || additionalMins < 5 || additionalMins > 480) {
        return res.status(400).json({ error: "Additional minutes must be between 5 and 480" });
      }
      const session = await storage.getErrandSession(req.userId!, req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ error: "Session already ended" });
      }
      const now = new Date();
      const newExpectedEnd = new Date(now.getTime() + additionalMins * 60 * 1000);
      const newGraceEnd = new Date(newExpectedEnd.getTime() + 10 * 60 * 1000);
      const updated = await storage.extendErrandSession(req.params.id, newExpectedEnd, newGraceEnd);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to extend session" });
    }
  });

  const lowBatteryAlertedSessions = new Set<string>();

  app.post("/api/errands/low-battery", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { batteryLevel } = req.body;
      if (batteryLevel == null || typeof batteryLevel !== "number") {
        return res.status(400).json({ error: "batteryLevel is required as a number" });
      }
      if (batteryLevel >= 20) {
        return res.status(400).json({ error: "Battery level is not low enough to trigger alert" });
      }
      const session = await storage.getActiveErrandSession(req.userId!);
      if (!session) {
        return res.status(400).json({ error: "No active activity session -  low battery alerts only apply during activities" });
      }
      if (lowBatteryAlertedSessions.has(session.id)) {
        return res.json({ success: true, alreadySent: true, emailsSent: 0, emailsFailed: 0 });
      }
      lowBatteryAlertedSessions.add(session.id);
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });
      const contacts = await storage.getContacts(req.userId!);
      const { sendLowBatteryAlert } = await import("./notifications");
      const activityLabel = session.customLabel || session.activityType;
      const result = await sendLowBatteryAlert(contacts, user, batteryLevel, activityLabel);
      console.log(`[LOW BATTERY] Alert sent for user ${req.userId} at ${Math.round(batteryLevel)}% -  ${result.emailsSent} emails sent`);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[LOW BATTERY] Error:", error);
      res.status(500).json({ error: "Failed to send low battery alert" });
    }
  });

  // ===== GENERAL LOW BATTERY ALERT =====
  const lowBatteryAlertCooldowns = new Map<string, number>();

  app.post("/api/battery-alert", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { batteryLevel } = req.body;
      if (batteryLevel == null || typeof batteryLevel !== "number") {
        return res.status(400).json({ error: "batteryLevel is required as a number" });
      }
      if (batteryLevel >= 20) {
        return res.json({ success: true, skipped: true, reason: "Battery level above threshold" });
      }

      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      const settings = await storage.getSettings(req.userId!);
      if (!settings.lowBatteryAlertEnabled) {
        return res.json({ success: true, skipped: true, reason: "Low battery alerts disabled" });
      }

      const now = Date.now();
      const lastAlerted = lowBatteryAlertCooldowns.get(req.userId!);
      const COOLDOWN_MS = 4 * 60 * 60 * 1000;
      if (lastAlerted && (now - lastAlerted) < COOLDOWN_MS) {
        return res.json({ success: true, alreadySent: true, emailsSent: 0, emailsFailed: 0 });
      }

      const lastDbAlert = await storage.getLastLowBatteryAlertTime(req.userId!);
      if (lastDbAlert && (now - lastDbAlert.getTime()) < COOLDOWN_MS) {
        lowBatteryAlertCooldowns.set(req.userId!, lastDbAlert.getTime());
        return res.json({ success: true, alreadySent: true, emailsSent: 0, emailsFailed: 0 });
      }

      const contacts = await storage.getContacts(req.userId!);
      const { sendLowBatteryAlert } = await import("./notifications");
      const result = await sendLowBatteryAlert(contacts, user, batteryLevel);

      lowBatteryAlertCooldowns.set(req.userId!, now);
      await storage.updateLastLowBatteryAlertTime(req.userId!, new Date(now));

      console.log(`[LOW BATTERY] General alert sent for user ${req.userId} at ${Math.round(batteryLevel)}% -  ${result.emailsSent} emails sent`);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[LOW BATTERY] General alert error:", error);
      res.status(500).json({ error: "Failed to send low battery alert" });
    }
  });

  // ===== ACTIVITY MEMORIES ROUTES =====

  app.get("/api/memories", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const { fitnessStorage } = await import("./fitnessStorage");
    const memories = await fitnessStorage.getUserMemories(req.userId);
    res.json(memories);
  });

  app.post("/api/memories", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { fitnessStorage } = await import("./fitnessStorage");
      const { photoPath, note, lat, lng, locationName, activityId } = req.body;
      if (!photoPath) return res.status(400).json({ error: "Photo path is required" });
      const memory = await fitnessStorage.createMemory(req.userId, {
        photoPath,
        note: note || null,
        lat: lat || null,
        lng: lng || null,
        locationName: locationName || null,
        activityId: activityId || null,
      });
      res.json(memory);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create memory" });
    }
  });

  app.patch("/api/memories/:id", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { fitnessStorage } = await import("./fitnessStorage");
      const memory = await fitnessStorage.updateMemory(req.params.id, req.userId, req.body);
      if (!memory) return res.status(404).json({ error: "Not found" });
      res.json(memory);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update memory" });
    }
  });

  app.delete("/api/memories/:id", authMiddleware, async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const { fitnessStorage } = await import("./fitnessStorage");
    const deleted = await fitnessStorage.deleteMemory(req.params.id, req.userId);
    res.json({ success: deleted });
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

  app.post("/api/admin/clear-test-data", async (req, res) => {
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const { email, password } = req.body;
      if (!email || !password || email !== adminEmail || password !== adminPassword) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const testUsers = await db.execute(sql`SELECT id FROM users WHERE archived_at IS NOT NULL OR email LIKE '%@demo.aok.care' OR email = 'demo-ymca@aok.care'`);
      const testIds = testUsers.rows.map((r: any) => r.id);
      const deleteUserData = async (userId: string) => {
        await db.execute(sql`DELETE FROM lone_worker_check_ins WHERE session_id IN (SELECT id FROM lone_worker_sessions WHERE user_id = ${userId})`);
        await db.execute(sql`DELETE FROM lone_worker_escalations WHERE session_id IN (SELECT id FROM lone_worker_sessions WHERE user_id = ${userId})`);
        await db.execute(sql`DELETE FROM lone_worker_sessions WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM active_emergency_alerts WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM emergency_recordings WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM alert_logs WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM check_ins WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM sms_checkin_tokens WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM mood_entries WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM contacts WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM digital_documents WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM pets WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM fitness_activities WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM planned_routes WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM activity_memories WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM activity_comments WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM activity_likes WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM settings WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM errand_sessions WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM deactivation_confirmations WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM strava_connections WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM audit_trail WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM organization_staff_invites WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM organization_member_invites WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM org_member_client_assignments WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM org_member_sessions WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM organization_client_profiles WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM organization_clients WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM organization_members WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM bundle_usage WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM organization_bundles WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM tier_permissions WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM case_notes WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM case_files WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM incidents WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM risk_reports WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM welfare_concerns WHERE organization_id = ${userId}`);
        await db.execute(sql`DELETE FROM sessions WHERE user_id = ${userId}`);
        await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
      };
      for (const userId of testIds) {
        await deleteUserData(userId);
      }
      await db.execute(sql`DELETE FROM lone_worker_check_ins WHERE session_id IN (SELECT id FROM lone_worker_sessions WHERE status IN ('resolved', 'unresponsive'))`);
      await db.execute(sql`DELETE FROM lone_worker_escalations WHERE session_id IN (SELECT id FROM lone_worker_sessions WHERE status IN ('resolved', 'unresponsive'))`);
      await db.execute(sql`DELETE FROM lone_worker_sessions WHERE status IN ('resolved', 'unresponsive')`);
      res.json({ success: true, message: `Cleared ${testIds.length} test/archived users and all associated data` });
    } catch (error: any) {
      console.error("[CLEANUP] Error:", error);
      res.status(500).json({ error: "Failed to clear test data" });
    }
  });

  app.post("/api/whatsapp/incoming", async (req, res) => {
    try {
      const { From, Body, MessageSid } = req.body;
      console.log(`[WHATSAPP INCOMING] From: ${From}, SID: ${MessageSid}, Body: ${Body?.substring(0, 100)}`);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you for your message. This is an automated aok safety system. If you need emergency help, please call 999.</Message></Response>`;
      res.type('text/xml').send(twiml);
    } catch (error) {
      console.error("[WHATSAPP INCOMING] Error:", error);
      res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  app.post("/api/whatsapp/status", async (req, res) => {
    try {
      const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;
      console.log(`[WHATSAPP STATUS] SID: ${MessageSid}, Status: ${MessageStatus}, To: ${To}${ErrorCode ? `, Error: ${ErrorCode} - ${ErrorMessage}` : ''}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("[WHATSAPP STATUS] Error:", error);
      res.sendStatus(200);
    }
  });

  app.post("/api/whatsapp/fallback", async (req, res) => {
    try {
      const { From, Body, MessageSid, ErrorCode, ErrorMessage } = req.body;
      console.error(`[WHATSAPP FALLBACK] From: ${From}, SID: ${MessageSid}, Error: ${ErrorCode} - ${ErrorMessage}`);
      res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error("[WHATSAPP FALLBACK] Error:", error);
      res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  app.use("/api/support-signal", authMiddleware);

  app.post("/api/support-signal", async (req, res) => {
    try {
      const userId = req.userId!;
      const { level, notes, preferStaffVisit, requestLaterCheckin } = req.body;

      if (!["im_ok", "need_support", "urgent_help"].includes(level)) {
        return res.status(400).json({ error: "Invalid signal level" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.referenceId) {
        return res.status(403).json({ error: "Support signals are available for organisation clients only" });
      }

      const db = ensureDb();
      const orgClient = await db.select().from(organizationClients)
        .where(eq(organizationClients.referenceCode, user.referenceId))
        .limit(1);

      if (!orgClient.length) {
        return res.status(404).json({ error: "Client record not found" });
      }

      const oc = orgClient[0];

      const [signal] = await db.insert(supportSignals).values({
        organizationId: oc.organizationId,
        orgClientId: oc.id,
        clientUserId: userId,
        level,
        notes: notes || null,
        preferStaffVisit: preferStaffVisit || false,
        requestLaterCheckin: requestLaterCheckin || false,
      }).returning();

      if (level === "im_ok") {
        await db.insert(frontlineInteractions).values({
          organizationId: oc.organizationId,
          orgClientId: oc.id,
          staffName: "System (Resident Signal)",
          category: "wellbeing_check",
          notes: `Resident signalled: I'm OK${notes ? ` — ${notes}` : ""}`,
        });
      }

      if (level === "need_support" || level === "urgent_help") {
        const assignedMembers = await db.select({
          memberId: orgMemberClientAssignments.memberId,
        }).from(orgMemberClientAssignments)
          .where(eq(orgMemberClientAssignments.clientId, oc.id));

        let staffToNotify: any[] = [];

        if (assignedMembers.length > 0) {
          const memberIds = assignedMembers.map(a => a.memberId);
          staffToNotify = await db.select()
            .from(organizationMembers)
            .where(sql`${organizationMembers.id} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`,`)})`);
        }

        if (staffToNotify.length === 0) {
          staffToNotify = await db.select()
            .from(organizationMembers)
            .where(and(
              eq(organizationMembers.organizationId, oc.organizationId),
              eq(organizationMembers.status, "active"),
              sql`${organizationMembers.role} IN ('owner', 'admin', 'manager', 'service_manager')`,
            ));
        }

        const clientName = oc.clientName || user.name || "A resident";
        const levelLabel = level === "urgent_help" ? "URGENT HELP" : "Needs Support";
        const prefNote = preferStaffVisit ? " (Prefers staff visit)" : requestLaterCheckin ? " (Requests later check-in)" : "";

        for (const member of staffToNotify) {
          if (member.email) {
            sendEmail(
              member.email,
              `A-OK Support Signal: ${levelLabel}`,
              `<h2>Support Signal — ${levelLabel}</h2>
              <p><strong>Resident:</strong> ${clientName}</p>
              <p><strong>Reference:</strong> ${oc.referenceCode}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleTimeString("en-GB")}</p>
              ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ""}
              <p>${prefNote}</p>
              <p>Please log into the Frontline dashboard to respond.</p>`
            ).catch(err => console.error("[SUPPORT SIGNAL] Email error:", err));
          }
          if (member.phone) {
            sendSMS(
              member.phone,
              `A-OK SUPPORT SIGNAL: ${levelLabel}\nResident: ${clientName} (${oc.referenceCode})\nTime: ${new Date().toLocaleTimeString("en-GB")}${notes ? `\nNote: ${notes}` : ""}${prefNote}\nPlease respond via the Frontline dashboard.`
            ).catch(err => console.error("[SUPPORT SIGNAL] SMS error:", err));
          }
        }

        await db.insert(frontlineInteractions).values({
          organizationId: oc.organizationId,
          orgClientId: oc.id,
          staffName: "System (Resident Signal)",
          category: level === "urgent_help" ? "crisis_intervention" : "support_conversation",
          notes: `Resident signalled: ${levelLabel}${notes ? ` — ${notes}` : ""}${prefNote}`,
        });
      }

      console.log(`[SUPPORT SIGNAL] ${level} signal from client ${oc.referenceCode} (org: ${oc.organizationId})`);
      res.status(201).json({ id: signal.id, level: signal.level, status: signal.status });
    } catch (error: any) {
      console.error("[SUPPORT SIGNAL] Error:", error);
      res.status(500).json({ error: "Failed to send support signal" });
    }
  });

  app.get("/api/support-signal/active", async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      if (!user?.referenceId) return res.json(null);

      const db = ensureDb();
      const orgClient = await db.select().from(organizationClients)
        .where(eq(organizationClients.referenceCode, user.referenceId))
        .limit(1);
      if (!orgClient.length) return res.json(null);

      const active = await db.select().from(supportSignals)
        .where(and(
          eq(supportSignals.orgClientId, orgClient[0].id),
          eq(supportSignals.status, "active"),
        ))
        .orderBy(sql`${supportSignals.createdAt} DESC`)
        .limit(1);

      res.json(active[0] || null);
    } catch (error: any) {
      console.error("[SUPPORT SIGNAL] Active check error:", error);
      res.status(500).json({ error: "Failed to check signal status" });
    }
  });

  return httpServer;
}
