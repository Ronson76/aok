import { 
  contacts, checkIns, settings, alertLogs, users, sessions, passwordResetTokens, pushSubscriptions,
  adminUsers, adminSessions, organizationBundles, bundleUsage, adminAuditLogs, organizationClients, organizationClientProfiles,
  pendingClientContacts, activeEmergencyAlerts, moodEntries, pets, digitalDocuments,
  Contact, InsertContact, CheckIn, Settings, UpdateSettings, AlertLog, User, Session, PasswordResetToken,
  AdminUser, AdminSession, OrganizationBundle, BundleUsage, AdminAuditLog, DashboardStats, UserProfile, EmergencyAlertInfo,
  OrganizationClient, OrganizationClientWithDetails, OrganizationDashboardStats, StatusData, OrgClientStatus,
  OrgClientRegistrationStatus,
  OrganizationClientProfile, UpdateOrganizationClientProfile, AdminOrganizationClientView, AdminOrganizationView,
  PushSubscription, InsertPushSubscription, ActiveEmergencyAlert,
  MoodEntry, InsertMoodEntry, Pet, InsertPet, UpdatePet, DigitalDocument, InsertDigitalDocument, UpdateDigitalDocument
} from "@shared/schema";
import { ensureDb } from "./db";
import { eq, desc, and, isNull, lt, gte, count, sql } from "drizzle-orm";
import { randomUUID, randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";
import { sendMissedCheckInAlert, sendVoiceAlerts, sendPushNotification } from "./notifications";

// Get database instance at runtime (not at import time)
function getDb() {
  return ensureDb();
}

export interface IStorage {
  // Users
  createUser(data: {
    email: string;
    passwordHash: string;
    accountType: "individual" | "organization";
    name: string;
    referenceId?: string;
    dateOfBirth?: string;
    mobileNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;

  // Sessions
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  deleteAllUserSessions(userId: string): Promise<void>;

  // Password reset
  createPasswordResetToken(userId: string): Promise<string>;
  validatePasswordResetToken(token: string): Promise<{ userId: string; tokenId: string } | null>;
  markPasswordResetTokenUsed(tokenId: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Contacts
  getContacts(userId: string): Promise<Contact[]>;
  getConfirmedContacts(userId: string): Promise<Contact[]>;
  getContact(userId: string, id: string): Promise<Contact | undefined>;
  getContactByToken(token: string): Promise<Contact | undefined>;
  getPrimaryContact(userId: string): Promise<Contact | undefined>;
  getPrimaryContacts(userId: string): Promise<Contact[]>;
  createContact(userId: string, contact: InsertContact): Promise<{ contact: Contact; confirmationToken: string }>;
  confirmContact(contactId: string): Promise<Contact | undefined>;
  declineContact(contactId: string): Promise<boolean>;
  updateContact(userId: string, id: string, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  setPrimaryContact(userId: string, contactId: string): Promise<Contact | undefined>;
  deleteContact(userId: string, id: string): Promise<boolean>;
  cleanupExpiredUnconfirmedContacts(): Promise<number>;

  // Check-ins
  getCheckIns(userId: string): Promise<CheckIn[]>;
  createCheckIn(userId: string): Promise<CheckIn>;
  createMissedCheckIn(userId: string): Promise<CheckIn>;
  getStreak(userId: string): Promise<number>;

  // Settings
  getSettings(userId: string): Promise<Settings>;
  updateSettings(userId: string, updates: UpdateSettings): Promise<Settings>;
  initializeSettings(userId: string): Promise<void>;

  // Alerts
  getAlertLogs(userId: string): Promise<AlertLog[]>;
  getAlertLogsForUser(userId: string): Promise<AlertLog[]>;
  createAlertLog(userId: string, contactsNotified: string[], message: string): Promise<AlertLog>;
  cleanupOldAlerts(): Promise<number>;

  // Missed check-in processing
  processOverdueCheckIn(userId: string): Promise<{ wasMissed: boolean; alertSent: boolean }>;

  // Push subscriptions
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(userId: string, subscription: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  deleteAllPushSubscriptions(userId: string): Promise<void>;
  
  // Get overdue users with push subscriptions for server-side notifications
  getOverdueUsersWithPushSubscriptions(): Promise<Array<{
    userId: string;
    userName: string;
    subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>;
    nextCheckInDue: Date;
    lastPushSentAt: Date | null;
  }>>;
  updateLastPushSentAt(userId: string): Promise<void>;

  // Active emergency alerts
  getActiveEmergencyAlert(userId: string): Promise<ActiveEmergencyAlert | undefined>;
  createActiveEmergencyAlert(userId: string, latitude: string | null, longitude: string | null): Promise<ActiveEmergencyAlert>;
  updateEmergencyAlertLocation(alertId: string, latitude: string, longitude: string): Promise<void>;
  updateEmergencyAlertDispatchTime(alertId: string): Promise<void>;
  deactivateEmergencyAlert(alertId: string): Promise<void>;
  getOverdueActiveAlerts(): Promise<ActiveEmergencyAlert[]>;

  // Terms and conditions
  acceptTerms(userId: string): Promise<void>;

  // Cleanup old emergency alerts (location data privacy)
  cleanupOldEmergencyAlerts(): Promise<number>;

  // Mood entries
  getMoodEntries(userId: string): Promise<MoodEntry[]>;
  createMoodEntry(userId: string, data: InsertMoodEntry): Promise<MoodEntry>;
  getMoodStats(userId: string): Promise<{ mood: string; count: number }[]>;

  // Pets
  getPets(userId: string): Promise<Pet[]>;
  getPet(userId: string, id: string): Promise<Pet | undefined>;
  createPet(userId: string, data: InsertPet): Promise<Pet>;
  updatePet(userId: string, id: string, updates: UpdatePet): Promise<Pet | undefined>;
  deletePet(userId: string, id: string): Promise<boolean>;

  // Digital documents
  getDigitalDocuments(userId: string): Promise<DigitalDocument[]>;
  getDigitalDocument(userId: string, id: string): Promise<DigitalDocument | undefined>;
  createDigitalDocument(userId: string, data: InsertDigitalDocument): Promise<DigitalDocument>;
  updateDigitalDocument(userId: string, id: string, updates: UpdateDigitalDocument): Promise<DigitalDocument | undefined>;
  deleteDigitalDocument(userId: string, id: string): Promise<boolean>;
}

class DatabaseStorage implements IStorage {

  // Users
  async createUser(data: {
    email: string;
    passwordHash: string;
    accountType: "individual" | "organization";
    name: string;
    referenceId?: string;
    dateOfBirth?: string;
    mobileNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  }): Promise<User> {
    const result = await getDb().insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      accountType: data.accountType,
      name: data.name,
      referenceId: data.referenceId || null,
      dateOfBirth: data.dateOfBirth || null,
      mobileNumber: data.mobileNumber || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
    }).returning();
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await getDb().select().from(users).where(eq(users.email, email.toLowerCase()));
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await getDb().select().from(users).where(eq(users.id, id));
    return result[0];
  }

  // Sessions
  async createSession(userId: string): Promise<Session> {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const result = await getDb().insert(sessions).values({
      userId,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const result = await getDb().select().from(sessions).where(eq(sessions.id, sessionId));
    const session = result[0];
    if (session && new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(sessionId);
      return undefined;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await getDb().delete(sessions).where(eq(sessions.userId, userId));
  }

  // Password reset
  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await getDb().update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    // Invalidate any existing tokens for this user
    await getDb().delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

    // Generate a secure random token
    const rawToken = randomBytes(32).toString("hex");
    
    // Hash the token for storage (we only store the hash)
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await getDb().insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    // Return the raw token (this is sent to the user, not stored)
    return rawToken;
  }

  async validatePasswordResetToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
    // Hash the provided token to compare
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const result = await getDb().select().from(passwordResetTokens).where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt)
      )
    );

    const resetToken = result[0];
    if (!resetToken) {
      return null;
    }

    // Check if expired
    if (new Date(resetToken.expiresAt) < new Date()) {
      return null;
    }

    return { userId: resetToken.userId, tokenId: resetToken.id };
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await getDb().update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await getDb().delete(passwordResetTokens).where(
      lt(passwordResetTokens.expiresAt, new Date())
    );
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    return await getDb().select().from(contacts).where(eq(contacts.userId, userId));
  }

  async getConfirmedContacts(userId: string): Promise<Contact[]> {
    // Get only confirmed contacts (confirmedAt is not null)
    const result = await getDb().select().from(contacts).where(
      and(eq(contacts.userId, userId), sql`${contacts.confirmedAt} IS NOT NULL`)
    );
    return result;
  }

  async getContact(userId: string, id: string): Promise<Contact | undefined> {
    const result = await getDb().select().from(contacts).where(
      and(eq(contacts.id, id), eq(contacts.userId, userId))
    );
    return result[0];
  }

  async getContactByToken(token: string): Promise<Contact | undefined> {
    // Hash the token and find the contact
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const result = await getDb().select().from(contacts).where(
      eq(contacts.confirmationToken, tokenHash)
    );
    return result[0];
  }

  async getPrimaryContact(userId: string): Promise<Contact | undefined> {
    const result = await getDb().select().from(contacts).where(
      and(eq(contacts.userId, userId), eq(contacts.isPrimary, true))
    );
    return result[0];
  }

  async createContact(userId: string, contact: InsertContact): Promise<{ contact: Contact; confirmationToken: string }> {
    // Check if user has any existing CONFIRMED contacts - if not, this will be primary once confirmed
    const existingContacts = await this.getConfirmedContacts(userId);
    const shouldBePrimary = existingContacts.length === 0;
    
    // Generate a confirmation token (expires in 10 minutes)
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log(`[STORAGE] Creating contact for user ${userId}:`, {
      name: contact.name,
      email: contact.email,
      shouldBePrimary,
      hasToken: !!tokenHash,
      tokenHash: tokenHash.substring(0, 10) + '...',
      expiresAt: expiresAt.toISOString()
    });
    
    const result = await getDb().insert(contacts).values({
      ...contact,
      userId,
      isPrimary: shouldBePrimary,
      confirmationToken: tokenHash,
      confirmationExpiry: expiresAt,
      confirmedAt: null,
    }).returning();
    
    console.log(`[STORAGE] Contact created:`, {
      id: result[0].id,
      hasStoredToken: !!result[0].confirmationToken,
      storedExpiry: result[0].confirmationExpiry
    });
    
    return { contact: result[0], confirmationToken: rawToken };
  }

  async confirmContact(contactId: string): Promise<Contact | undefined> {
    // Keep the token so subsequent clicks can still find the contact and show "already confirmed"
    const result = await getDb().update(contacts)
      .set({ 
        confirmedAt: new Date(),
        confirmationExpiry: null,
      })
      .where(eq(contacts.id, contactId))
      .returning();
    return result[0];
  }

  async declineContact(contactId: string): Promise<boolean> {
    const result = await getDb().delete(contacts)
      .where(eq(contacts.id, contactId))
      .returning();
    return result.length > 0;
  }

  async updateContact(userId: string, id: string, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    // Note: isPrimary is not allowed through general updates, use setPrimaryContact instead
    const result = await getDb().update(contacts)
      .set(updates)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    return result[0];
  }

  async setPrimaryContact(userId: string, contactId: string): Promise<Contact | undefined> {
    // First, verify the contact exists and belongs to this user
    const existingContact = await this.getContact(userId, contactId);
    if (!existingContact) {
      return undefined;
    }
    
    // Toggle the isPrimary status
    const newPrimaryStatus = !existingContact.isPrimary;
    
    // If turning OFF primary, ensure at least one other contact remains primary
    if (!newPrimaryStatus) {
      const allContacts = await this.getContacts(userId);
      const primaryContacts = allContacts.filter(c => c.isPrimary);
      
      // If this is the only primary contact, don't allow turning it off
      if (primaryContacts.length === 1 && primaryContacts[0].id === contactId) {
        return existingContact; // Return unchanged - at least one must remain primary
      }
    }
    
    // Update the contact's primary status
    const result = await getDb().update(contacts)
      .set({ isPrimary: newPrimaryStatus })
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .returning();
    return result[0];
  }
  
  async getPrimaryContacts(userId: string): Promise<Contact[]> {
    const result = await getDb().select().from(contacts).where(
      and(eq(contacts.userId, userId), eq(contacts.isPrimary, true))
    );
    return result;
  }

  async deleteContact(userId: string, id: string): Promise<boolean> {
    const result = await getDb().delete(contacts).where(
      and(eq(contacts.id, id), eq(contacts.userId, userId))
    ).returning();
    return result.length > 0;
  }

  async cleanupExpiredUnconfirmedContacts(): Promise<number> {
    // Delete contacts that:
    // 1. Have never been confirmed (confirmedAt is null)
    // 2. Have an expiry date that has passed
    const now = new Date();
    const result = await getDb().delete(contacts)
      .where(
        and(
          isNull(contacts.confirmedAt),
          lt(contacts.confirmationExpiry, now)
        )
      )
      .returning();
    
    if (result.length > 0) {
      console.log(`[CONTACT CLEANUP] Removed ${result.length} expired unconfirmed contacts`);
    }
    
    return result.length;
  }

  // Check-ins
  async getCheckIns(userId: string): Promise<CheckIn[]> {
    return await getDb().select().from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.timestamp));
  }

  async createCheckIn(userId: string): Promise<CheckIn> {
    const result = await getDb().insert(checkIns).values({
      userId,
      status: "success",
    }).returning();

    const userSettings = await this.getSettings(userId);
    const hoursToAdd = userSettings.intervalHours || 24;
    const nextDue = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);

    await getDb().update(settings)
      .set({ 
        lastCheckIn: new Date(),
        nextCheckInDue: nextDue,
      })
      .where(eq(settings.userId, userId));

    return result[0];
  }

  async createMissedCheckIn(userId: string): Promise<CheckIn> {
    const result = await getDb().insert(checkIns).values({
      userId,
      status: "missed",
    }).returning();
    return result[0];
  }

  async getStreak(userId: string): Promise<number> {
    const allCheckIns = await this.getCheckIns(userId);
    let streak = 0;
    for (const checkIn of allCheckIns) {
      if (checkIn.status === "success") {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Settings
  async initializeSettings(userId: string): Promise<void> {
    const existing = await getDb().select().from(settings).where(eq(settings.userId, userId));
    if (existing.length === 0) {
      await getDb().insert(settings).values({
        userId,
        frequency: "daily",
        intervalHours: "24",
        alertsEnabled: true,
      });
    }
  }

  async getSettings(userId: string): Promise<Settings> {
    const result = await getDb().select().from(settings).where(eq(settings.userId, userId));
    
    if (result.length === 0) {
      await this.initializeSettings(userId);
      return {
        frequency: "daily",
        intervalHours: 24,
        lastCheckIn: null,
        scheduleStartTime: null,
        nextCheckInDue: null,
        alertsEnabled: true,
        pushStatus: "unknown",
        redAlertEnabled: false,
      };
    }

    const row = result[0];
    return {
      frequency: row.frequency as "daily" | "every_two_days",
      intervalHours: parseFloat(row.intervalHours) || 24,
      scheduleStartTime: row.scheduleStartTime?.toISOString() || null,
      lastCheckIn: row.lastCheckIn?.toISOString() || null,
      nextCheckInDue: row.nextCheckInDue?.toISOString() || null,
      alertsEnabled: row.alertsEnabled,
      pushStatus: (row.pushStatus as "unknown" | "enabled" | "declined") || "unknown",
      redAlertEnabled: row.redAlertEnabled ?? false,
    };
  }

  async updateSettings(userId: string, updates: UpdateSettings): Promise<Settings> {
    const dbUpdates: any = {};
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.intervalHours !== undefined) dbUpdates.intervalHours = String(updates.intervalHours);
    if (updates.alertsEnabled !== undefined) dbUpdates.alertsEnabled = updates.alertsEnabled;
    if (updates.pushStatus !== undefined) dbUpdates.pushStatus = updates.pushStatus;
    if (updates.redAlertEnabled !== undefined) dbUpdates.redAlertEnabled = updates.redAlertEnabled;
    
    // Handle schedule start time - this is the initial check-in time
    if (updates.scheduleStartTime !== undefined) {
      const startTime = new Date(updates.scheduleStartTime);
      dbUpdates.scheduleStartTime = startTime;
      
      // Get current interval to calculate next due
      const currentSettings = await this.getSettings(userId);
      const intervalHours = updates.intervalHours ?? currentSettings.intervalHours;
      
      // Calculate the next check-in due time from the start time
      let nextDue = new Date(startTime.getTime() + intervalHours * 60 * 60 * 1000);
      
      // If the calculated next due is in the past, advance it to the future
      const now = new Date();
      while (nextDue < now) {
        nextDue = new Date(nextDue.getTime() + intervalHours * 60 * 60 * 1000);
      }
      
      dbUpdates.nextCheckInDue = nextDue;
      dbUpdates.lastCheckIn = startTime;
    }
    // If only interval is changing (no new start time), recalculate based on existing schedule
    else if (updates.intervalHours !== undefined) {
      const currentSettings = await this.getSettings(userId);
      // Use scheduleStartTime if available, otherwise use lastCheckIn
      const baseTime = currentSettings.scheduleStartTime || currentSettings.lastCheckIn;
      if (baseTime) {
        const baseDate = new Date(baseTime);
        let nextDue = new Date(baseDate.getTime() + updates.intervalHours * 60 * 60 * 1000);
        
        // If the calculated next due is in the past, advance it to the future
        const now = new Date();
        while (nextDue < now) {
          nextDue = new Date(nextDue.getTime() + updates.intervalHours * 60 * 60 * 1000);
        }
        
        dbUpdates.nextCheckInDue = nextDue;
      }
    }
    
    await getDb().update(settings)
      .set(dbUpdates)
      .where(eq(settings.userId, userId));
    return this.getSettings(userId);
  }

  // Alerts
  async getAlertLogs(userId: string): Promise<AlertLog[]> {
    return await getDb().select().from(alertLogs)
      .where(eq(alertLogs.userId, userId))
      .orderBy(desc(alertLogs.timestamp));
  }

  async createAlertLog(userId: string, contactsNotified: string[], message: string): Promise<AlertLog> {
    const result = await getDb().insert(alertLogs).values({
      userId,
      contactsNotified,
      message,
    }).returning();
    return result[0];
  }

  async cleanupOldAlerts(): Promise<number> {
    // Delete alerts older than 30 days (admin retention period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await getDb().delete(alertLogs)
      .where(lt(alertLogs.timestamp, thirtyDaysAgo))
      .returning();
    
    return result.length;
  }

  async getAlertLogsForUser(userId: string): Promise<AlertLog[]> {
    // Returns alerts from last 7 days for regular users
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return await getDb().select().from(alertLogs)
      .where(and(
        eq(alertLogs.userId, userId),
        gte(alertLogs.timestamp, sevenDaysAgo)
      ))
      .orderBy(desc(alertLogs.timestamp));
  }

  // Process overdue check-ins
  async processOverdueCheckIn(userId: string): Promise<{ wasMissed: boolean; alertSent: boolean }> {
    // Get raw settings including lastMissedDueAt and lastAlertSentAt
    const rawSettings = await getDb().select().from(settings).where(eq(settings.userId, userId));
    if (rawSettings.length === 0) {
      return { wasMissed: false, alertSent: false };
    }
    
    const row = rawSettings[0];
    const now = new Date();
    
    if (!row.nextCheckInDue) {
      return { wasMissed: false, alertSent: false };
    }

    const dueDate = row.nextCheckInDue;
    
    // Check if currently overdue
    if (now < dueDate) {
      return { wasMissed: false, alertSent: false };
    }

    // Calculate time since overdue
    const msSinceOverdue = now.getTime() - dueDate.getTime();
    const minutesSinceOverdue = msSinceOverdue / (1000 * 60);
    
    // First alert: 5 minutes after overdue
    // Repeat alerts: every 15 minutes after the first alert
    const FIRST_ALERT_DELAY_MINUTES = 5;
    const REPEAT_ALERT_INTERVAL_MINUTES = 15;
    
    // Check if it's too early for first alert
    if (minutesSinceOverdue < FIRST_ALERT_DELAY_MINUTES) {
      return { wasMissed: true, alertSent: false };
    }
    
    // Check if we need to send an alert
    let shouldSendAlert = false;
    const lastAlertTime = row.lastAlertSentAt;
    
    if (!lastAlertTime || lastAlertTime < dueDate) {
      // No alert sent for this overdue period yet - send first alert
      shouldSendAlert = true;
    } else {
      // Check if enough time has passed since last alert (15 minutes)
      const msSinceLastAlert = now.getTime() - lastAlertTime.getTime();
      const minutesSinceLastAlert = msSinceLastAlert / (1000 * 60);
      
      if (minutesSinceLastAlert >= REPEAT_ALERT_INTERVAL_MINUTES) {
        shouldSendAlert = true;
      }
    }
    
    if (!shouldSendAlert) {
      return { wasMissed: true, alertSent: false };
    }

    // Get contacts and user info BEFORE making any changes
    const allContacts = await this.getContacts(userId);
    const user = await this.getUserById(userId);
    
    if (!user) {
      return { wasMissed: false, alertSent: false };
    }

    // Determine contacts to alert
    const primaryContact = allContacts.find(c => c.isPrimary);
    const alertsEnabled = row.alertsEnabled;
    const contactsToAlert = alertsEnabled 
      ? allContacts 
      : (primaryContact ? [primaryContact] : []);
    
    const contactNames = contactsToAlert.map(c => c.name);
    let alertSent = false;
    
    // Determine if this is first alert or repeat
    const isFirstAlert = !lastAlertTime || lastAlertTime < dueDate;
    const alertType = isFirstAlert ? "First" : "Repeat";
    
    // Send alerts FIRST (before updating any state)
    if (contactsToAlert.length > 0) {
      console.log(`[ALERT] ${alertType} missed check-in alert for user ${userId}! Sending to: ${contactNames.join(", ")}`);
      
      try {
        // Send email and SMS alerts
        const { emailsSent, emailsFailed, smsSent, smsFailed } = await sendMissedCheckInAlert(contactsToAlert, user);
        
        // Send voice calls to landline contacts
        const { callsMade, callsFailed } = await sendVoiceAlerts(contactsToAlert, user, 'missed_checkin');
        
        // Send push notifications to user's devices
        const userSubscriptions = await this.getPushSubscriptions(userId);
        let pushSent = 0;
        let pushFailed = 0;
        if (userSubscriptions.length > 0) {
          const pushResult = await sendPushNotification(userSubscriptions, {
            title: "Check-in Overdue!",
            body: "Your check-in is overdue. Your contacts have been notified.",
            tag: "overdue-alert",
            url: "/",
            requireInteraction: true,
          });
          pushSent = pushResult.sent;
          pushFailed = pushResult.failed;
        }
        
        alertSent = emailsSent > 0 || smsSent > 0 || callsMade > 0 || pushSent > 0;
        
        const notificationParts = [];
        if (emailsSent > 0) notificationParts.push(`${emailsSent} email(s)`);
        if (smsSent > 0) notificationParts.push(`${smsSent} SMS`);
        if (callsMade > 0) notificationParts.push(`${callsMade} voice call(s)`);
        if (pushSent > 0) notificationParts.push(`${pushSent} push notification(s)`);
        
        const failedParts = [];
        if (emailsFailed > 0) failedParts.push(`${emailsFailed} email(s)`);
        if (smsFailed > 0) failedParts.push(`${smsFailed} SMS`);
        if (callsFailed > 0) failedParts.push(`${callsFailed} call(s)`);
        if (pushFailed > 0) failedParts.push(`${pushFailed} push(es)`);
        
        const message = `${alertType} missed check-in alert sent! ${notificationParts.join(', ') || 'no notifications'} delivered${failedParts.length > 0 ? `, ${failedParts.join(', ')} failed` : ''}.`;
        await this.createAlertLog(userId, contactNames, message);
      } catch (error) {
        console.error(`[ALERT] Error sending alerts:`, error);
        const message = `${alertType} missed check-in detected. Alert delivery failed.`;
        await this.createAlertLog(userId, contactNames, message);
      }
    }

    // Record missed check-in only on first alert
    if (isFirstAlert) {
      await this.createMissedCheckIn(userId);
    }

    // Update lastAlertSentAt and lastMissedDueAt
    await getDb().update(settings)
      .set({ 
        lastMissedDueAt: dueDate,
        lastAlertSentAt: now
      })
      .where(eq(settings.userId, userId));

    return { wasMissed: true, alertSent };
  }

  // Push subscriptions
  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await getDb().select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async createPushSubscription(userId: string, subscription: InsertPushSubscription): Promise<PushSubscription> {
    // Delete existing subscription with same endpoint (in case of re-subscription)
    await getDb().delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    
    const result = await getDb().insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }).returning();
    return result[0];
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    const result = await getDb().delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ))
      .returning();
    return result.length > 0;
  }

  async deleteAllPushSubscriptions(userId: string): Promise<void> {
    await getDb().delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return await getDb().select().from(pushSubscriptions);
  }

  async getOverdueUsersWithPushSubscriptions(): Promise<Array<{
    userId: string;
    userName: string;
    subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>;
    nextCheckInDue: Date;
    lastPushSentAt: Date | null;
  }>> {
    const now = new Date();
    
    // Get all settings where user is overdue (nextCheckInDue < now) and alerts are enabled
    const overdueSettings = await getDb()
      .select({
        userId: settings.userId,
        nextCheckInDue: settings.nextCheckInDue,
        lastPushSentAt: settings.lastPushSentAt,
      })
      .from(settings)
      .where(and(
        lt(settings.nextCheckInDue, now),
        eq(settings.alertsEnabled, true)
      ));

    const result: Array<{
      userId: string;
      userName: string;
      subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>;
      nextCheckInDue: Date;
      lastPushSentAt: Date | null;
    }> = [];

    for (const s of overdueSettings) {
      // Get push subscriptions for this user
      const subs = await getDb()
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, s.userId));

      if (subs.length === 0) continue;

      // Get user info
      const user = await this.getUserById(s.userId);
      if (!user || user.disabled) continue;

      result.push({
        userId: s.userId,
        userName: user.name || user.email,
        subscriptions: subs.map(sub => ({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        })),
        nextCheckInDue: s.nextCheckInDue!,
        lastPushSentAt: s.lastPushSentAt,
      });
    }

    return result;
  }

  async updateLastPushSentAt(userId: string): Promise<void> {
    await getDb()
      .update(settings)
      .set({ lastPushSentAt: new Date() })
      .where(eq(settings.userId, userId));
  }

  // Active emergency alerts
  async getActiveEmergencyAlert(userId: string): Promise<ActiveEmergencyAlert | undefined> {
    const result = await getDb()
      .select()
      .from(activeEmergencyAlerts)
      .where(and(
        eq(activeEmergencyAlerts.userId, userId),
        eq(activeEmergencyAlerts.isActive, true)
      ));
    return result[0];
  }

  async createActiveEmergencyAlert(userId: string, latitude: string | null, longitude: string | null): Promise<ActiveEmergencyAlert> {
    // First deactivate any existing alerts for this user
    await getDb()
      .update(activeEmergencyAlerts)
      .set({ isActive: false, deactivatedAt: new Date() })
      .where(and(
        eq(activeEmergencyAlerts.userId, userId),
        eq(activeEmergencyAlerts.isActive, true)
      ));

    // Create new alert
    const result = await getDb()
      .insert(activeEmergencyAlerts)
      .values({
        userId,
        latitude,
        longitude,
        isActive: true,
      })
      .returning();
    return result[0];
  }

  async updateEmergencyAlertLocation(alertId: string, latitude: string, longitude: string): Promise<void> {
    await getDb()
      .update(activeEmergencyAlerts)
      .set({ latitude, longitude })
      .where(eq(activeEmergencyAlerts.id, alertId));
  }

  async updateEmergencyAlertDispatchTime(alertId: string): Promise<void> {
    await getDb()
      .update(activeEmergencyAlerts)
      .set({ lastDispatchAt: new Date() })
      .where(eq(activeEmergencyAlerts.id, alertId));
  }

  async deactivateEmergencyAlert(alertId: string): Promise<void> {
    await getDb()
      .update(activeEmergencyAlerts)
      .set({ isActive: false, deactivatedAt: new Date() })
      .where(eq(activeEmergencyAlerts.id, alertId));
  }

  async getOverdueActiveAlerts(): Promise<ActiveEmergencyAlert[]> {
    // Get all active alerts where lastDispatchAt is more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await getDb()
      .select()
      .from(activeEmergencyAlerts)
      .where(and(
        eq(activeEmergencyAlerts.isActive, true),
        lt(activeEmergencyAlerts.lastDispatchAt, fiveMinutesAgo)
      ));
    return result;
  }

  // Terms and conditions
  async acceptTerms(userId: string): Promise<void> {
    await getDb()
      .update(users)
      .set({ termsAcceptedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Cleanup old emergency alerts (location data privacy - 30 days)
  async cleanupOldEmergencyAlerts(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Delete deactivated emergency alerts older than 30 days
    const result = await getDb().delete(activeEmergencyAlerts)
      .where(and(
        eq(activeEmergencyAlerts.isActive, false),
        lt(activeEmergencyAlerts.deactivatedAt, thirtyDaysAgo)
      ))
      .returning();
    
    return result.length;
  }

  // ==================== MOOD ENTRIES ====================

  async getMoodEntries(userId: string): Promise<MoodEntry[]> {
    return await getDb()
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.createdAt));
  }

  async createMoodEntry(userId: string, data: InsertMoodEntry): Promise<MoodEntry> {
    const result = await getDb()
      .insert(moodEntries)
      .values({
        userId,
        mood: data.mood,
        note: data.note || null,
        checkInId: data.checkInId || null,
      })
      .returning();
    return result[0];
  }

  async getMoodStats(userId: string): Promise<{ mood: string; count: number }[]> {
    const result = await getDb()
      .select({
        mood: moodEntries.mood,
        count: count(),
      })
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .groupBy(moodEntries.mood);
    return result.map(r => ({ mood: r.mood, count: Number(r.count) }));
  }

  // ==================== PETS ====================

  async getPets(userId: string): Promise<Pet[]> {
    return await getDb()
      .select()
      .from(pets)
      .where(eq(pets.userId, userId))
      .orderBy(pets.name);
  }

  async getPet(userId: string, id: string): Promise<Pet | undefined> {
    const result = await getDb()
      .select()
      .from(pets)
      .where(and(eq(pets.id, id), eq(pets.userId, userId)));
    return result[0];
  }

  async createPet(userId: string, data: InsertPet): Promise<Pet> {
    const result = await getDb()
      .insert(pets)
      .values({
        userId,
        name: data.name,
        type: data.type,
        breed: data.breed || null,
        age: data.age || null,
        medicalConditions: data.medicalConditions || null,
        medications: data.medications || null,
        feedingInstructions: data.feedingInstructions || null,
        vetName: data.vetName || null,
        vetPhone: data.vetPhone || null,
        vetAddress: data.vetAddress || null,
        specialInstructions: data.specialInstructions || null,
      })
      .returning();
    return result[0];
  }

  async updatePet(userId: string, id: string, updates: UpdatePet): Promise<Pet | undefined> {
    const result = await getDb()
      .update(pets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(pets.id, id), eq(pets.userId, userId)))
      .returning();
    return result[0];
  }

  async deletePet(userId: string, id: string): Promise<boolean> {
    const result = await getDb()
      .delete(pets)
      .where(and(eq(pets.id, id), eq(pets.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ==================== DIGITAL DOCUMENTS ====================

  async getDigitalDocuments(userId: string): Promise<DigitalDocument[]> {
    return await getDb()
      .select()
      .from(digitalDocuments)
      .where(eq(digitalDocuments.userId, userId))
      .orderBy(desc(digitalDocuments.updatedAt));
  }

  async getDigitalDocument(userId: string, id: string): Promise<DigitalDocument | undefined> {
    const result = await getDb()
      .select()
      .from(digitalDocuments)
      .where(and(eq(digitalDocuments.id, id), eq(digitalDocuments.userId, userId)));
    return result[0];
  }

  async createDigitalDocument(userId: string, data: InsertDigitalDocument): Promise<DigitalDocument> {
    const result = await getDb()
      .insert(digitalDocuments)
      .values({
        userId,
        title: data.title,
        type: data.type,
        description: data.description || null,
        content: data.content || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        mimeType: data.mimeType || null,
        executorContactIds: data.executorContactIds || null,
      })
      .returning();
    return result[0];
  }

  async updateDigitalDocument(userId: string, id: string, updates: UpdateDigitalDocument): Promise<DigitalDocument | undefined> {
    const result = await getDb()
      .update(digitalDocuments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(digitalDocuments.id, id), eq(digitalDocuments.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteDigitalDocument(userId: string, id: string): Promise<boolean> {
    const result = await getDb()
      .delete(digitalDocuments)
      .where(and(eq(digitalDocuments.id, id), eq(digitalDocuments.userId, userId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();

// ==================== ADMIN STORAGE ====================

export interface IAdminStorage {
  // Admin users
  createAdminUser(data: { email: string; passwordHash: string; name: string; role?: "super_admin" | "analyst" }): Promise<AdminUser>;
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  hasAnyAdmin(): Promise<boolean>;
  updateAdminLastLogin(adminId: string): Promise<void>;
  
  // Admin sessions
  createAdminSession(adminId: string): Promise<AdminSession>;
  getAdminSession(sessionId: string): Promise<AdminSession | undefined>;
  deleteAdminSession(sessionId: string): Promise<void>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<DashboardStats>;
  
  // User management
  getAllUsers(): Promise<UserProfile[]>;
  deleteUser(userId: string): Promise<boolean>;
  setUserDisabled(userId: string, disabled: boolean): Promise<UserProfile | undefined>;
  
  // Organization bundles
  createBundle(userId: string, name: string, seatLimit: number, adminId: string, expiresAt?: Date): Promise<OrganizationBundle>;
  getAllBundles(): Promise<(OrganizationBundle & { userName: string })[]>;
  getBundle(bundleId: string): Promise<OrganizationBundle | undefined>;
  getBundlesByUser(userId: string): Promise<OrganizationBundle[]>;
  updateBundleStatus(bundleId: string, status: "active" | "expired" | "cancelled"): Promise<OrganizationBundle | undefined>;
  deleteBundle(bundleId: string): Promise<boolean>;
  
  // Audit logs
  createAuditLog(adminId: string, action: string, entityType: string, entityId?: string, details?: string): Promise<AdminAuditLog>;
  getAuditLogs(limit?: number): Promise<AdminAuditLog[]>;
}

class AdminStorage implements IAdminStorage {
  // Admin users
  async createAdminUser(data: { email: string; passwordHash: string; name: string; role?: "super_admin" | "analyst" }): Promise<AdminUser> {
    const result = await getDb().insert(adminUsers).values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || "analyst",
    }).returning();
    return result[0];
  }

  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await getDb().select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase()));
    return result[0];
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const result = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id));
    return result[0];
  }

  async hasAnyAdmin(): Promise<boolean> {
    const result = await getDb().select({ id: adminUsers.id }).from(adminUsers).limit(1);
    return result.length > 0;
  }

  async updateAdminLastLogin(adminId: string): Promise<void> {
    await getDb().update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, adminId));
  }

  // Admin sessions
  async createAdminSession(adminId: string): Promise<AdminSession> {
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    const result = await getDb().insert(adminSessions).values({
      adminId,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    const result = await getDb().select().from(adminSessions).where(eq(adminSessions.id, sessionId));
    const session = result[0];
    if (session && new Date(session.expiresAt) < new Date()) {
      await this.deleteAdminSession(sessionId);
      return undefined;
    }
    return session;
  }

  async deleteAdminSession(sessionId: string): Promise<void> {
    await getDb().delete(adminSessions).where(eq(adminSessions.id, sessionId));
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const db = getDb();
    
    // Get total users count
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get organizations count
    const orgsResult = await db.select({ count: count() }).from(users).where(eq(users.accountType, "organization"));
    const totalOrganizations = orgsResult[0]?.count || 0;

    // Get individuals count
    const totalIndividuals = totalUsers - totalOrganizations;

    // Get check-ins stats
    const checkInsResult = await db.select({ count: count() }).from(checkIns);
    const totalCheckIns = checkInsResult[0]?.count || 0;

    const missedCheckInsResult = await db.select({ count: count() }).from(checkIns).where(eq(checkIns.status, "missed"));
    const totalMissedCheckIns = missedCheckInsResult[0]?.count || 0;

    // Get bundles stats
    const activeBundlesResult = await db.select({ count: count() }).from(organizationBundles).where(eq(organizationBundles.status, "active"));
    const activeBundles = activeBundlesResult[0]?.count || 0;

    const seatsResult = await db.select({
      totalSeats: sql<number>`COALESCE(SUM(${organizationBundles.seatLimit}), 0)`,
      usedSeats: sql<number>`COALESCE(SUM(${organizationBundles.seatsUsed}), 0)`,
    }).from(organizationBundles).where(eq(organizationBundles.status, "active"));
    const totalSeatsAllocated = seatsResult[0]?.totalSeats || 0;
    const totalSeatsUsed = seatsResult[0]?.usedSeats || 0;

    // Get recent users (last 10)
    const recentUsersData = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10);
    const recentUsers: UserProfile[] = recentUsersData.map(u => {
      const { passwordHash, ...profile } = u;
      return profile;
    });

    // Get daily registrations for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyRegsResult = await db.select({
      date: sql<string>`DATE(${users.createdAt})`,
      count: count(),
    }).from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    const dailyRegistrations = dailyRegsResult.map(r => ({
      date: String(r.date),
      count: r.count,
    }));

    // Get emergency alerts count (alerts with "EMERGENCY" in message)
    const emergencyAlertsResult = await db.select({ count: count() })
      .from(alertLogs)
      .where(sql`${alertLogs.message} LIKE '%EMERGENCY%'`);
    const totalEmergencyAlerts = emergencyAlertsResult[0]?.count || 0;

    // Get recent emergency alerts with user info (last 10)
    const recentEmergencyData = await db.select({
      id: alertLogs.id,
      userId: alertLogs.userId,
      timestamp: alertLogs.timestamp,
      contactsNotified: alertLogs.contactsNotified,
      userName: users.name,
      userEmail: users.email,
    })
      .from(alertLogs)
      .leftJoin(users, eq(alertLogs.userId, users.id))
      .where(sql`${alertLogs.message} LIKE '%EMERGENCY%'`)
      .orderBy(desc(alertLogs.timestamp))
      .limit(10);

    const recentEmergencyAlerts: EmergencyAlertInfo[] = recentEmergencyData.map(r => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName || "Unknown",
      userEmail: r.userEmail || "Unknown",
      timestamp: r.timestamp,
      contactsNotified: r.contactsNotified,
    }));

    return {
      totalUsers,
      totalOrganizations,
      totalIndividuals,
      totalCheckIns,
      totalMissedCheckIns,
      activeBundles,
      totalSeatsAllocated,
      totalSeatsUsed,
      recentUsers,
      dailyRegistrations,
      totalEmergencyAlerts,
      recentEmergencyAlerts,
    };
  }

  // User management
  async getAllUsers(): Promise<UserProfile[]> {
    const result = await getDb().select().from(users).orderBy(desc(users.createdAt));
    return result.map(u => {
      const { passwordHash, ...profile } = u;
      return profile;
    });
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await getDb().delete(users).where(eq(users.id, userId)).returning();
    return result.length > 0;
  }

  async setUserDisabled(userId: string, disabled: boolean): Promise<UserProfile | undefined> {
    const result = await getDb()
      .update(users)
      .set({ disabled })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) return undefined;
    
    const { passwordHash, ...profile } = result[0];
    return profile;
  }

  // Organization bundles
  async createBundle(userId: string, name: string, seatLimit: number, adminId: string, expiresAt?: Date): Promise<OrganizationBundle> {
    const result = await getDb().insert(organizationBundles).values({
      userId,
      name,
      seatLimit,
      status: "active",
      expiresAt: expiresAt || null,
      createdBy: adminId,
    }).returning();
    return result[0];
  }

  async getAllBundles(): Promise<(OrganizationBundle & { userName: string })[]> {
    const result = await getDb()
      .select({
        bundle: organizationBundles,
        userName: users.name,
      })
      .from(organizationBundles)
      .leftJoin(users, eq(organizationBundles.userId, users.id))
      .orderBy(desc(organizationBundles.createdAt));
    
    return result.map(r => ({
      ...r.bundle,
      userName: r.userName || "Unknown",
    }));
  }

  async getBundle(bundleId: string): Promise<OrganizationBundle | undefined> {
    const result = await getDb().select().from(organizationBundles).where(eq(organizationBundles.id, bundleId));
    return result[0];
  }

  async getBundlesByUser(userId: string): Promise<OrganizationBundle[]> {
    return await getDb().select().from(organizationBundles).where(eq(organizationBundles.userId, userId));
  }

  async updateBundleStatus(bundleId: string, status: "active" | "expired" | "cancelled"): Promise<OrganizationBundle | undefined> {
    const result = await getDb().update(organizationBundles)
      .set({ status })
      .where(eq(organizationBundles.id, bundleId))
      .returning();
    return result[0];
  }

  async deleteBundle(bundleId: string): Promise<boolean> {
    const result = await getDb().delete(organizationBundles).where(eq(organizationBundles.id, bundleId)).returning();
    return result.length > 0;
  }

  // Audit logs
  async createAuditLog(adminId: string, action: string, entityType: string, entityId?: string, details?: string): Promise<AdminAuditLog> {
    const result = await getDb().insert(adminAuditLogs).values({
      adminId,
      action,
      entityType,
      entityId: entityId || null,
      details: details || null,
    }).returning();
    return result[0];
  }

  async getAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
    return await getDb().select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
  }
}

export const adminStorage = new AdminStorage();

// ==================== ORGANIZATION STORAGE ====================

export interface IOrganizationStorage {
  // Organization clients
  getClients(organizationId: string): Promise<OrganizationClient[]>;
  getClientsWithDetails(organizationId: string): Promise<OrganizationClientWithDetails[]>;
  getClientById(organizationClientId: string): Promise<OrganizationClient | undefined>;
  getClientByReferenceCode(referenceCode: string): Promise<OrganizationClient | undefined>;
  addClient(organizationId: string, clientId: string, bundleId?: string, nickname?: string): Promise<OrganizationClient>;
  removeClient(organizationId: string, clientId: string): Promise<boolean>;
  isClientOfOrganization(organizationId: string, clientId: string): Promise<boolean>;
  updateClientStatus(organizationClientId: string, status: OrgClientStatus): Promise<OrganizationClient | undefined>;
  
  // Pending client registration (org-managed flow)
  createPendingClient(data: {
    organizationId: string;
    bundleId: string | null;
    clientName: string;
    clientPhone: string;
    referenceCode: string;
    scheduleStartTime: Date | null;
    checkInIntervalHours: number;
  }): Promise<OrganizationClient>;
  updateClientRegistrationStatus(orgClientId: string, status: OrgClientRegistrationStatus): Promise<void>;
  addPendingClientContact(orgClientId: string, contact: {
    name: string;
    email: string;
    phone?: string;
    phoneType?: "mobile" | "landline";
    relationship?: string;
    isPrimary?: boolean;
  }): Promise<void>;
  getPendingClientContacts(orgClientId: string): Promise<Array<{
    name: string | null;
    email: string | null;
    phone: string | null;
    phoneType: "mobile" | "landline" | null;
    relationship: string | null;
    isPrimary: boolean | null;
  }>>;
  linkClientToUser(orgClientId: string, userId: string): Promise<OrganizationClient | undefined>;
  
  // Client profiles
  getClientProfile(organizationClientId: string): Promise<OrganizationClientProfile | undefined>;
  updateClientProfile(organizationClientId: string, profile: UpdateOrganizationClientProfile): Promise<OrganizationClientProfile>;
  createOrUpdateClientProfile(organizationClientId: string, profile: { organizationClientId: string; dateOfBirth?: string }): Promise<OrganizationClientProfile>;
  
  // Alert aggregation
  getClientAlertCounts(clientId: string): Promise<{ total: number; emails: number; calls: number; emergencies: number }>;
  
  // Dashboard
  getOrganizationDashboardStats(organizationId: string): Promise<OrganizationDashboardStats>;
  
  // Client details
  getClientStatus(clientId: string): Promise<StatusData>;
  getClientAlertLogs(clientId: string): Promise<AlertLog[]>;
  
  // Admin views
  getOrganizationsWithClientSummary(): Promise<AdminOrganizationView[]>;
  getOrganizationClientsForAdmin(organizationId: string): Promise<AdminOrganizationClientView[]>;
}

class OrganizationStorage implements IOrganizationStorage {
  // Get all clients for an organization
  async getClients(organizationId: string): Promise<OrganizationClient[]> {
    return await getDb()
      .select()
      .from(organizationClients)
      .where(eq(organizationClients.organizationId, organizationId))
      .orderBy(desc(organizationClients.addedAt));
  }

  // Get clients with their user details and status
  async getClientsWithDetails(organizationId: string): Promise<OrganizationClientWithDetails[]> {
    const clients = await getDb()
      .select({
        orgClient: organizationClients,
        client: users,
      })
      .from(organizationClients)
      .leftJoin(users, eq(organizationClients.clientId, users.id))
      .where(eq(organizationClients.organizationId, organizationId))
      .orderBy(organizationClients.clientOrdinal);

    const results: OrganizationClientWithDetails[] = [];
    
    for (const row of clients) {
      const profile = await this.getClientProfile(row.orgClient.id);
      
      // Handle pending clients (no linked user yet)
      if (!row.client) {
        // Get pending contact count
        const pendingContacts = await getDb()
          .select()
          .from(pendingClientContacts)
          .where(eq(pendingClientContacts.organizationClientId, row.orgClient.id));
        
        results.push({
          id: row.orgClient.id,
          clientId: null,
          nickname: row.orgClient.nickname,
          clientOrdinal: row.orgClient.clientOrdinal,
          clientStatus: row.orgClient.status,
          registrationStatus: row.orgClient.registrationStatus,
          referenceCode: row.orgClient.referenceCode,
          clientName: row.orgClient.clientName,
          clientPhone: row.orgClient.clientPhone,
          scheduleStartTime: row.orgClient.scheduleStartTime,
          checkInIntervalHours: row.orgClient.checkInIntervalHours,
          addedAt: row.orgClient.addedAt,
          client: null,
          profile: profile || null,
          status: {
            status: "pending" as const,
            lastCheckIn: null,
            nextCheckInDue: null,
            streak: 0,
            hoursUntilDue: null,
            contactCount: pendingContacts.length,
          },
          lastAlert: null,
          alertCounts: { total: 0, emails: 0, calls: 0, emergencies: 0 },
        });
        continue;
      }
      
      // Handle registered clients with linked user
      const status = await this.getClientStatus(row.client.id);
      const alertLogs = await this.getClientAlertLogs(row.client.id);
      const lastAlert = alertLogs.length > 0 ? alertLogs[0] : null;
      const alertCounts = await this.getClientAlertCounts(row.client.id);
      
      results.push({
        id: row.orgClient.id,
        clientId: row.orgClient.clientId,
        nickname: row.orgClient.nickname,
        clientOrdinal: row.orgClient.clientOrdinal,
        clientStatus: row.orgClient.status,
        registrationStatus: row.orgClient.registrationStatus,
        referenceCode: row.orgClient.referenceCode,
        clientName: row.orgClient.clientName,
        clientPhone: row.orgClient.clientPhone,
        scheduleStartTime: row.orgClient.scheduleStartTime,
        checkInIntervalHours: row.orgClient.checkInIntervalHours,
        addedAt: row.orgClient.addedAt,
        client: {
          id: row.client.id,
          name: row.client.name,
          email: row.client.email,
          mobileNumber: row.client.mobileNumber,
        },
        profile: profile || null,
        status,
        lastAlert,
        alertCounts,
      });
    }
    
    return results;
  }

  // Get a single organization client by its ID
  async getClientById(organizationClientId: string): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .select()
      .from(organizationClients)
      .where(eq(organizationClients.id, organizationClientId));
    return result[0];
  }

  // Add a client to an organization
  async addClient(organizationId: string, clientId: string, bundleId?: string, nickname?: string): Promise<OrganizationClient> {
    // Check if the client is already assigned
    const existing = await getDb()
      .select()
      .from(organizationClients)
      .where(and(
        eq(organizationClients.organizationId, organizationId),
        eq(organizationClients.clientId, clientId)
      ));
    
    if (existing.length > 0) {
      throw new Error("Client is already assigned to this organization");
    }

    // Check seat availability if bundleId is provided
    if (bundleId) {
      const bundle = await getDb()
        .select()
        .from(organizationBundles)
        .where(eq(organizationBundles.id, bundleId));
      
      if (bundle.length === 0) {
        throw new Error("Bundle not found");
      }

      // SECURITY: Verify the bundle belongs to this organization
      if (bundle[0].userId !== organizationId) {
        throw new Error("You can only use bundles assigned to your organization");
      }
      
      if (bundle[0].seatsUsed >= bundle[0].seatLimit) {
        throw new Error("No seats available in this bundle");
      }
      
      // Increment seats used
      await getDb()
        .update(organizationBundles)
        .set({ seatsUsed: bundle[0].seatsUsed + 1 })
        .where(eq(organizationBundles.id, bundleId));
    }

    // Get the next ordinal number for this organization
    const maxOrdinalResult = await getDb()
      .select({ maxOrdinal: sql<number>`COALESCE(MAX(${organizationClients.clientOrdinal}), 0)` })
      .from(organizationClients)
      .where(eq(organizationClients.organizationId, organizationId));
    
    const nextOrdinal = (maxOrdinalResult[0]?.maxOrdinal ?? 0) + 1;

    const result = await getDb()
      .insert(organizationClients)
      .values({
        organizationId,
        clientId,
        bundleId: bundleId || null,
        nickname: nickname || null,
        clientOrdinal: nextOrdinal,
        status: "active",
      })
      .returning();
    
    return result[0];
  }

  // Remove a client from an organization
  async removeClient(organizationId: string, clientId: string): Promise<boolean> {
    // Get the client record first to check bundle
    const clientRecord = await getDb()
      .select()
      .from(organizationClients)
      .where(and(
        eq(organizationClients.organizationId, organizationId),
        eq(organizationClients.clientId, clientId)
      ));
    
    if (clientRecord.length === 0) {
      return false;
    }

    // Decrement seats used if bundleId exists
    if (clientRecord[0].bundleId) {
      const bundle = await getDb()
        .select()
        .from(organizationBundles)
        .where(eq(organizationBundles.id, clientRecord[0].bundleId));
      
      if (bundle.length > 0 && bundle[0].seatsUsed > 0) {
        await getDb()
          .update(organizationBundles)
          .set({ seatsUsed: bundle[0].seatsUsed - 1 })
          .where(eq(organizationBundles.id, clientRecord[0].bundleId));
      }
    }

    const result = await getDb()
      .delete(organizationClients)
      .where(and(
        eq(organizationClients.organizationId, organizationId),
        eq(organizationClients.clientId, clientId)
      ))
      .returning();
    
    return result.length > 0;
  }

  // Check if a client belongs to an organization
  async isClientOfOrganization(organizationId: string, clientId: string): Promise<boolean> {
    const result = await getDb()
      .select({ id: organizationClients.id })
      .from(organizationClients)
      .where(and(
        eq(organizationClients.organizationId, organizationId),
        eq(organizationClients.clientId, clientId)
      ));
    
    return result.length > 0;
  }

  // Update client status (active/paused/terminated)
  async updateClientStatus(organizationClientId: string, status: OrgClientStatus): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .update(organizationClients)
      .set({ status })
      .where(eq(organizationClients.id, organizationClientId))
      .returning();
    return result[0];
  }

  // Get client profile
  async getClientProfile(organizationClientId: string): Promise<OrganizationClientProfile | undefined> {
    const result = await getDb()
      .select()
      .from(organizationClientProfiles)
      .where(eq(organizationClientProfiles.organizationClientId, organizationClientId));
    return result[0];
  }

  // Update (or create) client profile
  async updateClientProfile(organizationClientId: string, profile: UpdateOrganizationClientProfile): Promise<OrganizationClientProfile> {
    // Check if profile exists
    const existing = await this.getClientProfile(organizationClientId);
    
    if (existing) {
      // Update existing
      const result = await getDb()
        .update(organizationClientProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(organizationClientProfiles.id, existing.id))
        .returning();
      return result[0];
    } else {
      // Create new
      const result = await getDb()
        .insert(organizationClientProfiles)
        .values({
          organizationClientId,
          ...profile,
        })
        .returning();
      return result[0];
    }
  }

  // Get alert counts for a client
  async getClientAlertCounts(clientId: string): Promise<{ total: number; emails: number; calls: number; emergencies: number }> {
    const alerts = await getDb()
      .select()
      .from(alertLogs)
      .where(eq(alertLogs.userId, clientId));
    
    let emails = 0;
    let calls = 0;
    let emergencies = 0;
    
    for (const alert of alerts) {
      if (alert.message.includes("EMERGENCY")) {
        emergencies++;
      }
      // Count emails (any alert that doesn't mention "voice call" is an email)
      if (!alert.message.toLowerCase().includes("voice call")) {
        emails++;
      }
      // Count voice calls
      if (alert.message.toLowerCase().includes("voice call")) {
        calls++;
      }
    }
    
    return {
      total: alerts.length,
      emails,
      calls,
      emergencies,
    };
  }

  // Get all organizations with client summaries for admin view
  async getOrganizationsWithClientSummary(): Promise<AdminOrganizationView[]> {
    // Get all organization users
    const orgs = await getDb()
      .select()
      .from(users)
      .where(eq(users.accountType, "organization"))
      .orderBy(desc(users.createdAt));
    
    const results: AdminOrganizationView[] = [];
    
    for (const org of orgs) {
      // Get bundles for this org
      const bundles = await getDb()
        .select()
        .from(organizationBundles)
        .where(eq(organizationBundles.userId, org.id));
      
      // Get clients for this org
      const clients = await getDb()
        .select()
        .from(organizationClients)
        .where(eq(organizationClients.organizationId, org.id));
      
      // Count by status
      let activeClients = 0;
      let pausedClients = 0;
      for (const client of clients) {
        if (client.status === "active") activeClients++;
        else if (client.status === "paused") pausedClients++;
      }
      
      // Count total alerts for all clients
      let totalAlerts = 0;
      for (const client of clients) {
        if (!client.clientId) continue;
        const alertCount = await getDb()
          .select({ count: count() })
          .from(alertLogs)
          .where(eq(alertLogs.userId, client.clientId));
        totalAlerts += alertCount[0]?.count || 0;
      }
      
      results.push({
        id: org.id,
        name: org.name,
        email: org.email,
        createdAt: org.createdAt,
        disabled: org.disabled,
        bundles: bundles.map(b => ({
          id: b.id,
          name: b.name,
          seatLimit: b.seatLimit,
          seatsUsed: b.seatsUsed,
          status: b.status,
        })),
        totalClients: clients.length,
        activeClients,
        pausedClients,
        totalAlerts,
      });
    }
    
    return results;
  }

  // Get organization clients for admin view (privacy-limited - only ordinal, phone, status)
  async getOrganizationClientsForAdmin(organizationId: string): Promise<AdminOrganizationClientView[]> {
    const clients = await getDb()
      .select({
        orgClient: organizationClients,
        client: users,
      })
      .from(organizationClients)
      .leftJoin(users, eq(organizationClients.clientId, users.id))
      .where(eq(organizationClients.organizationId, organizationId))
      .orderBy(organizationClients.clientOrdinal);
    
    const results: AdminOrganizationClientView[] = [];
    
    for (const row of clients) {
      // Get phone from org client record (privacy-safe) or user's mobile if linked
      const mobileNumber = row.orgClient.clientPhone || row.client?.mobileNumber || null;
      
      // Get status only if client is linked to a user
      const status = row.client ? await this.getClientStatus(row.client.id) : null;
      const alertCounts = row.client 
        ? await this.getClientAlertCounts(row.client.id)
        : { total: 0, emails: 0, calls: 0, emergencies: 0 };
      
      results.push({
        id: row.orgClient.id,
        clientOrdinal: row.orgClient.clientOrdinal,
        clientStatus: row.orgClient.status,
        mobileNumber,
        clientDisabled: row.client?.disabled || false,
        registrationStatus: row.orgClient.registrationStatus,
        addedAt: row.orgClient.addedAt,
        status,
        alertCounts,
      });
    }
    
    return results;
  }

  // Get organization dashboard statistics
  async getOrganizationDashboardStats(organizationId: string): Promise<OrganizationDashboardStats> {
    const clients = await this.getClientsWithDetails(organizationId);
    
    const bundles = await getDb()
      .select()
      .from(organizationBundles)
      .where(eq(organizationBundles.userId, organizationId));
    
    const totalSeats = bundles.reduce((sum, b) => sum + b.seatLimit, 0);
    const seatsUsed = bundles.reduce((sum, b) => sum + b.seatsUsed, 0);
    
    let clientsSafe = 0;
    let clientsPending = 0;
    let clientsOverdue = 0;
    let totalEmergencyAlerts = 0;
    
    for (const client of clients) {
      if (client.status.status === "safe") clientsSafe++;
      else if (client.status.status === "pending") clientsPending++;
      else if (client.status.status === "overdue") clientsOverdue++;
      
      // Count emergency alerts for this client (only if linked to a user)
      if (client.clientId) {
        const alerts = await getDb()
          .select({ count: count() })
          .from(alertLogs)
          .where(and(
            eq(alertLogs.userId, client.clientId),
            sql`${alertLogs.message} LIKE '%EMERGENCY%'`
          ));
        totalEmergencyAlerts += alerts[0]?.count || 0;
      }
    }
    
    return {
      totalClients: clients.length,
      totalSeats,
      seatsUsed,
      clientsSafe,
      clientsPending,
      clientsOverdue,
      totalEmergencyAlerts,
      bundles,
    };
  }

  // Get status for a specific client
  async getClientStatus(clientId: string): Promise<StatusData> {
    // Get settings for the client
    const settingsResult = await getDb()
      .select()
      .from(settings)
      .where(eq(settings.userId, clientId));
    
    const clientSettings = settingsResult[0];
    
    // Get last check-in
    const lastCheckInResult = await getDb()
      .select()
      .from(checkIns)
      .where(and(
        eq(checkIns.userId, clientId),
        eq(checkIns.status, "success")
      ))
      .orderBy(desc(checkIns.timestamp))
      .limit(1);
    
    const lastCheckIn = lastCheckInResult[0];
    
    // Calculate streak
    const allCheckIns = await getDb()
      .select()
      .from(checkIns)
      .where(eq(checkIns.userId, clientId))
      .orderBy(desc(checkIns.timestamp));
    
    let streak = 0;
    for (const ci of allCheckIns) {
      if (ci.status === "success") streak++;
      else break;
    }
    
    // Get contact count for this client
    const clientContacts = await getDb()
      .select()
      .from(contacts)
      .where(eq(contacts.userId, clientId));
    
    // Determine status
    const now = new Date();
    const nextDue = clientSettings?.nextCheckInDue ? new Date(clientSettings.nextCheckInDue) : null;
    const lastCheckInTime = lastCheckIn?.timestamp ? new Date(lastCheckIn.timestamp) : null;
    
    let status: "safe" | "pending" | "overdue" = "pending";
    let hoursUntilDue: number | null = null;
    
    if (nextDue) {
      hoursUntilDue = Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (now > nextDue) {
        status = "overdue";
      } else if (lastCheckInTime) {
        status = "safe";
      }
    }
    
    return {
      status,
      lastCheckIn: lastCheckInTime?.toISOString() || null,
      nextCheckInDue: nextDue?.toISOString() || null,
      streak,
      hoursUntilDue,
      contactCount: clientContacts.length,
    };
  }

  // Get alert logs for a specific client
  async getClientAlertLogs(clientId: string): Promise<AlertLog[]> {
    return await getDb()
      .select()
      .from(alertLogs)
      .where(eq(alertLogs.userId, clientId))
      .orderBy(desc(alertLogs.timestamp))
      .limit(10);
  }

  // Get client by reference code
  async getClientByReferenceCode(referenceCode: string): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .select()
      .from(organizationClients)
      .where(eq(organizationClients.referenceCode, referenceCode));
    return result[0];
  }

  // Create a pending client (org-managed flow)
  async createPendingClient(data: {
    organizationId: string;
    bundleId: string | null;
    clientName: string;
    clientPhone: string;
    referenceCode: string;
    scheduleStartTime: Date | null;
    checkInIntervalHours: number;
  }): Promise<OrganizationClient> {
    // Get next ordinal number
    const existingClients = await this.getClients(data.organizationId);
    const nextOrdinal = existingClients.length + 1;

    const result = await getDb()
      .insert(organizationClients)
      .values({
        organizationId: data.organizationId,
        bundleId: data.bundleId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        referenceCode: data.referenceCode,
        scheduleStartTime: data.scheduleStartTime,
        checkInIntervalHours: data.checkInIntervalHours,
        clientOrdinal: nextOrdinal,
        status: "active",
        registrationStatus: "pending_sms",
      })
      .returning();
    
    // Update bundle seat count if assigned
    if (data.bundleId) {
      await getDb()
        .update(organizationBundles)
        .set({ seatsUsed: sql`${organizationBundles.seatsUsed} + 1` })
        .where(eq(organizationBundles.id, data.bundleId));
    }
    
    return result[0];
  }

  // Update client registration status
  async updateClientRegistrationStatus(orgClientId: string, status: OrgClientRegistrationStatus): Promise<void> {
    await getDb()
      .update(organizationClients)
      .set({ registrationStatus: status })
      .where(eq(organizationClients.id, orgClientId));
  }

  // Add emergency contact for pending client
  async addPendingClientContact(orgClientId: string, contact: {
    name: string;
    email: string;
    phone?: string;
    phoneType?: "mobile" | "landline";
    relationship?: string;
    isPrimary?: boolean;
  }): Promise<void> {
    await getDb()
      .insert(pendingClientContacts)
      .values({
        organizationClientId: orgClientId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        phoneType: contact.phoneType || null,
        relationship: contact.relationship || null,
        isPrimary: contact.isPrimary || false,
      });
  }

  // Get pending client contacts
  async getPendingClientContacts(orgClientId: string): Promise<Array<{
    name: string | null;
    email: string | null;
    phone: string | null;
    phoneType: "mobile" | "landline" | null;
    relationship: string | null;
    isPrimary: boolean | null;
  }>> {
    const contacts = await getDb()
      .select()
      .from(pendingClientContacts)
      .where(eq(pendingClientContacts.organizationClientId, orgClientId));
    return contacts;
  }

  // Link a client to a user account (when they register via reference code)
  async linkClientToUser(orgClientId: string, userId: string): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .update(organizationClients)
      .set({ 
        clientId: userId,
        registrationStatus: "registered",
      })
      .where(eq(organizationClients.id, orgClientId))
      .returning();
    return result[0];
  }

  // Create or update client profile
  async createOrUpdateClientProfile(organizationClientId: string, profile: { organizationClientId: string; dateOfBirth?: string }): Promise<OrganizationClientProfile> {
    // Check if profile exists
    const existing = await getDb()
      .select()
      .from(organizationClientProfiles)
      .where(eq(organizationClientProfiles.organizationClientId, organizationClientId));
    
    if (existing[0]) {
      // Update
      const result = await getDb()
        .update(organizationClientProfiles)
        .set({
          dateOfBirth: profile.dateOfBirth || null,
          updatedAt: new Date(),
        })
        .where(eq(organizationClientProfiles.organizationClientId, organizationClientId))
        .returning();
      return result[0];
    } else {
      // Create
      const result = await getDb()
        .insert(organizationClientProfiles)
        .values({
          organizationClientId,
          dateOfBirth: profile.dateOfBirth || null,
        })
        .returning();
      return result[0];
    }
  }
}

export const organizationStorage = new OrganizationStorage();
