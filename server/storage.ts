import { 
  contacts, checkIns, settings, alertLogs, users, sessions, passwordResetTokens, pushSubscriptions,
  adminUsers, adminSessions, organizationBundles, bundleUsage, adminAuditLogs, organizationClients, organizationClientProfiles,
  pendingClientContacts, activeEmergencyAlerts, moodEntries, pets, digitalDocuments, globalFeatureFlags, adminPasswordResetTokens,
  incidents, welfareConcerns, caseFiles, caseNotes, escalationRules, missedCheckInEscalations, auditTrail, riskReports,
  Contact, InsertContact, CheckIn, Settings, UpdateSettings, AlertLog, User, Session, PasswordResetToken,
  AdminUser, AdminSession, OrganizationBundle, BundleUsage, AdminAuditLog, DashboardStats, UserProfile, EmergencyAlertInfo,
  OrganizationClient, OrganizationClientWithDetails, OrganizationDashboardStats, StatusData, OrgClientStatus,
  OrgClientRegistrationStatus, UpdateClientFeatures, ClientFeatureSettings, featureKeys, UpdateUserFeatures,
  OrganizationClientProfile, UpdateOrganizationClientProfile, AdminOrganizationClientView, AdminOrganizationView,
  PushSubscription, InsertPushSubscription, ActiveEmergencyAlert,
  MoodEntry, InsertMoodEntry, Pet, InsertPet, UpdatePet, DigitalDocument, InsertDigitalDocument, UpdateDigitalDocument,
  Incident, InsertIncident, WelfareConcern, InsertWelfareConcern, CaseFile, CaseNote, InsertCaseNote,
  EscalationRule, InsertEscalationRule, MissedCheckInEscalation, AuditTrailEntry, RiskReport,
  CaseStatus, RiskLevel
} from "@shared/schema";
import { ensureDb } from "./db";
import { eq, ne, desc, and, isNull, isNotNull, lt, gt, lte, gte, count, sql, notInArray } from "drizzle-orm";
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
    termsAcceptedAt?: Date | null;
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
  deactivateEmergencyAlertByUserId(userId: string): Promise<boolean>;
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

  // User feature controls
  updateUserFeatures(userId: string, features: UpdateUserFeatures): Promise<User | undefined>;

  // Safeguarding - Incidents
  getIncidents(organizationId: string): Promise<Incident[]>;
  getIncident(organizationId: string, id: string): Promise<Incident | undefined>;
  createIncident(organizationId: string, data: InsertIncident): Promise<Incident>;
  updateIncident(organizationId: string, id: string, updates: Partial<InsertIncident>): Promise<Incident | undefined>;
  resolveIncident(organizationId: string, id: string, resolution: string, resolvedById: string): Promise<Incident | undefined>;

  // Safeguarding - Welfare Concerns
  getWelfareConcerns(organizationId: string): Promise<WelfareConcern[]>;
  getWelfareConcern(organizationId: string, id: string): Promise<WelfareConcern | undefined>;
  createWelfareConcern(organizationId: string, data: InsertWelfareConcern): Promise<WelfareConcern>;
  updateWelfareConcern(organizationId: string, id: string, updates: Partial<InsertWelfareConcern>): Promise<WelfareConcern | undefined>;
  resolveWelfareConcern(organizationId: string, id: string, notes: string, resolvedById: string): Promise<WelfareConcern | undefined>;

  // Safeguarding - Case Files
  getCaseFiles(organizationId: string): Promise<CaseFile[]>;
  getCaseFile(organizationId: string, id: string): Promise<CaseFile | undefined>;
  getCaseFileByClient(organizationId: string, clientId: string): Promise<CaseFile | undefined>;
  createCaseFile(organizationId: string, clientId: string): Promise<CaseFile>;
  updateCaseFile(organizationId: string, id: string, updates: { status?: string; riskLevel?: string; summary?: string }): Promise<CaseFile | undefined>;
  closeCaseFile(organizationId: string, id: string, reason: string, closedById: string): Promise<CaseFile | undefined>;

  // Safeguarding - Case Notes
  getCaseNotes(caseFileId: string): Promise<CaseNote[]>;
  createCaseNote(caseFileId: string, authorId: string, data: InsertCaseNote): Promise<CaseNote>;

  // Safeguarding - Escalation Rules
  getEscalationRules(organizationId: string): Promise<EscalationRule[]>;
  getEscalationRule(organizationId: string, id: string): Promise<EscalationRule | undefined>;
  createEscalationRule(organizationId: string, data: InsertEscalationRule): Promise<EscalationRule>;
  updateEscalationRule(organizationId: string, id: string, updates: Partial<InsertEscalationRule>): Promise<EscalationRule | undefined>;
  deleteEscalationRule(organizationId: string, id: string): Promise<boolean>;

  // Safeguarding - Missed Check-in Escalations
  getMissedCheckInEscalations(organizationId: string): Promise<MissedCheckInEscalation[]>;
  createMissedCheckInEscalation(organizationId: string, clientId: string, missedAt: Date): Promise<MissedCheckInEscalation>;
  updateMissedCheckInEscalation(organizationId: string, id: string, updates: { status?: string; resolution?: string; acknowledgedById?: string }): Promise<MissedCheckInEscalation | undefined>;

  // Safeguarding - Audit Trail
  getAuditTrail(organizationId: string, limit?: number): Promise<AuditTrailEntry[]>;
  createAuditEntry(organizationId: string, data: { userId?: string; userEmail?: string; userRole?: string; action: string; entityType: string; entityId?: string; previousData?: any; newData?: any; ipAddress?: string; userAgent?: string }): Promise<AuditTrailEntry>;

  // Safeguarding - Risk Reports
  getRiskReports(organizationId: string): Promise<RiskReport[]>;
  getRiskReport(organizationId: string, id: string): Promise<RiskReport | undefined>;
  createRiskReport(organizationId: string, data: { clientId?: string; reportType: string; riskLevel: string; summary: string; dataPoints?: any; recommendation?: string }): Promise<RiskReport>;
  reviewRiskReport(organizationId: string, id: string, reviewedById: string, notes: string): Promise<RiskReport | undefined>;
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
    termsAcceptedAt?: Date | null;
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
      termsAcceptedAt: data.termsAcceptedAt || null,
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

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
    
    // Generate a confirmation token (expires in 24 hours)
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
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

  async getContactsNeedingReminder(): Promise<Contact[]> {
    // Get contacts that:
    // 1. Have never been confirmed (confirmedAt is null)
    // 2. Have phone number (for SMS)
    // 3. Have expiry within 1 hour
    // 4. Have not had a reminder sent yet
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    const result = await getDb().select().from(contacts)
      .where(
        and(
          isNull(contacts.confirmedAt),
          isNotNull(contacts.phone),
          gt(contacts.confirmationExpiry, now),
          lte(contacts.confirmationExpiry, oneHourFromNow),
          isNull(contacts.reminderSentAt)
        )
      );
    
    return result;
  }

  async markContactReminderSent(contactId: string): Promise<void> {
    await getDb().update(contacts)
      .set({ reminderSentAt: new Date() })
      .where(eq(contacts.id, contactId));
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
    const intervalHours = userSettings.intervalHours || 24;
    const now = new Date();
    
    let nextDue: Date;
    
    // If user has a scheduleStartTime, calculate next due based on that schedule
    // Otherwise fall back to adding interval from current time
    if (userSettings.scheduleStartTime) {
      const scheduleTime = new Date(userSettings.scheduleStartTime);
      const scheduleHour = scheduleTime.getHours();
      const scheduleMinute = scheduleTime.getMinutes();
      
      // Start from today at the scheduled time
      nextDue = new Date(now);
      nextDue.setHours(scheduleHour, scheduleMinute, 0, 0);
      
      // If we're past the scheduled time for today, start from the next scheduled occurrence
      if (nextDue <= now) {
        nextDue = new Date(nextDue.getTime() + intervalHours * 60 * 60 * 1000);
      }
      
      // Ensure the next due is in the future
      while (nextDue <= now) {
        nextDue = new Date(nextDue.getTime() + intervalHours * 60 * 60 * 1000);
      }
    } else {
      // No schedule set - use current time + interval (legacy behaviour)
      nextDue = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    }

    await getDb().update(settings)
      .set({ 
        lastCheckIn: now,
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
        trackingEnabled: false,
        additionalInfo: null,
        livingSituation: null,
        shakeToSOSEnabled: true,
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
      trackingEnabled: row.trackingEnabled ?? false,
      additionalInfo: row.additionalInfo || null,
      livingSituation: row.livingSituation || null,
      shakeToSOSEnabled: row.shakeToSOSEnabled ?? true,
    };
  }

  async updateSettings(userId: string, updates: UpdateSettings): Promise<Settings> {
    const dbUpdates: any = {};
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.intervalHours !== undefined) dbUpdates.intervalHours = String(updates.intervalHours);
    if (updates.alertsEnabled !== undefined) dbUpdates.alertsEnabled = updates.alertsEnabled;
    if (updates.pushStatus !== undefined) dbUpdates.pushStatus = updates.pushStatus;
    if (updates.redAlertEnabled !== undefined) dbUpdates.redAlertEnabled = updates.redAlertEnabled;
    if (updates.trackingEnabled !== undefined) dbUpdates.trackingEnabled = updates.trackingEnabled;
    if (updates.additionalInfo !== undefined) dbUpdates.additionalInfo = updates.additionalInfo;
    if (updates.livingSituation !== undefined) dbUpdates.livingSituation = updates.livingSituation;
    
    // Handle direct nextCheckInDue and lastCheckIn updates (from registration)
    // These take priority over calculated values from scheduleStartTime
    const hasDirectNextCheckInDue = updates.nextCheckInDue !== undefined;
    const hasDirectLastCheckIn = updates.lastCheckIn !== undefined;
    
    if (hasDirectNextCheckInDue) {
      dbUpdates.nextCheckInDue = new Date(updates.nextCheckInDue!);
    }
    if (hasDirectLastCheckIn) {
      dbUpdates.lastCheckIn = new Date(updates.lastCheckIn!);
    }
    
    // Handle schedule start time - only calculate nextCheckInDue if not directly provided
    if (updates.scheduleStartTime !== undefined) {
      const startTime = new Date(updates.scheduleStartTime);
      dbUpdates.scheduleStartTime = startTime;
      
      // Only calculate nextCheckInDue from schedule if not directly provided
      if (!hasDirectNextCheckInDue) {
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
      }
      
      // Only set lastCheckIn from schedule if not directly provided
      if (!hasDirectLastCheckIn) {
        dbUpdates.lastCheckIn = startTime;
      }
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
        const { emailsSent, emailsFailed, smsSent, smsFailed } = await sendMissedCheckInAlert(
          contactsToAlert, 
          user,
          row.additionalInfo
        );
        
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
  
  async deactivateEmergencyAlertByUserId(userId: string): Promise<boolean> {
    const result = await getDb()
      .update(activeEmergencyAlerts)
      .set({ isActive: false, deactivatedAt: new Date() })
      .where(and(
        eq(activeEmergencyAlerts.userId, userId),
        eq(activeEmergencyAlerts.isActive, true)
      ))
      .returning({ id: activeEmergencyAlerts.id });
    
    return result.length > 0;
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

  async updateUserFeatures(userId: string, features: UpdateUserFeatures): Promise<User | undefined> {
    const result = await getDb()
      .update(users)
      .set(features)
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - INCIDENTS ====================

  async getIncidents(organizationId: string): Promise<Incident[]> {
    return await getDb()
      .select()
      .from(incidents)
      .where(eq(incidents.organizationId, organizationId))
      .orderBy(desc(incidents.createdAt));
  }

  async getIncident(organizationId: string, id: string): Promise<Incident | undefined> {
    const result = await getDb()
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, id), eq(incidents.organizationId, organizationId)));
    return result[0];
  }

  async createIncident(organizationId: string, data: InsertIncident): Promise<Incident> {
    const result = await getDb()
      .insert(incidents)
      .values({
        organizationId,
        clientId: data.clientId,
        reportedById: data.reportedById,
        reportedByName: data.reportedByName,
        incidentType: data.incidentType,
        severity: data.severity,
        description: data.description,
        location: data.location,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        what3words: data.what3words,
        isAnonymous: data.isAnonymous ?? false,
        status: (data.status || "open") as CaseStatus,
        resolution: data.resolution,
      })
      .returning();
    return result[0];
  }

  async updateIncident(organizationId: string, id: string, updates: Partial<InsertIncident>): Promise<Incident | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.status) {
      updateData.status = updates.status as CaseStatus;
    }
    const result = await getDb()
      .update(incidents)
      .set(updateData)
      .where(and(eq(incidents.id, id), eq(incidents.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  async resolveIncident(organizationId: string, id: string, resolution: string, resolvedById: string): Promise<Incident | undefined> {
    const result = await getDb()
      .update(incidents)
      .set({ status: "closed" as CaseStatus, resolution, resolvedAt: new Date(), resolvedById, updatedAt: new Date() })
      .where(and(eq(incidents.id, id), eq(incidents.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - WELFARE CONCERNS ====================

  async getWelfareConcerns(organizationId: string): Promise<WelfareConcern[]> {
    return await getDb()
      .select()
      .from(welfareConcerns)
      .where(eq(welfareConcerns.organizationId, organizationId))
      .orderBy(desc(welfareConcerns.createdAt));
  }

  async getWelfareConcern(organizationId: string, id: string): Promise<WelfareConcern | undefined> {
    const result = await getDb()
      .select()
      .from(welfareConcerns)
      .where(and(eq(welfareConcerns.id, id), eq(welfareConcerns.organizationId, organizationId)));
    return result[0];
  }

  async createWelfareConcern(organizationId: string, data: InsertWelfareConcern): Promise<WelfareConcern> {
    const result = await getDb()
      .insert(welfareConcerns)
      .values({
        organizationId,
        clientId: data.clientId,
        reportedById: data.reportedById,
        reportedByName: data.reportedByName,
        concernType: data.concernType,
        description: data.description,
        observedBehaviours: data.observedBehaviours,
        isAnonymous: data.isAnonymous ?? false,
        status: (data.status || "open") as CaseStatus,
        followUpNotes: data.followUpNotes,
      })
      .returning();
    return result[0];
  }

  async updateWelfareConcern(organizationId: string, id: string, updates: Partial<InsertWelfareConcern>): Promise<WelfareConcern | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.status) {
      updateData.status = updates.status as CaseStatus;
    }
    const result = await getDb()
      .update(welfareConcerns)
      .set(updateData)
      .where(and(eq(welfareConcerns.id, id), eq(welfareConcerns.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  async resolveWelfareConcern(organizationId: string, id: string, notes: string, resolvedById: string): Promise<WelfareConcern | undefined> {
    const result = await getDb()
      .update(welfareConcerns)
      .set({ status: "closed" as CaseStatus, followUpNotes: notes, resolvedAt: new Date(), resolvedById, updatedAt: new Date() })
      .where(and(eq(welfareConcerns.id, id), eq(welfareConcerns.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - CASE FILES ====================

  async getCaseFiles(organizationId: string): Promise<CaseFile[]> {
    return await getDb()
      .select()
      .from(caseFiles)
      .where(eq(caseFiles.organizationId, organizationId))
      .orderBy(desc(caseFiles.createdAt));
  }

  async getCaseFile(organizationId: string, id: string): Promise<CaseFile | undefined> {
    const result = await getDb()
      .select()
      .from(caseFiles)
      .where(and(eq(caseFiles.id, id), eq(caseFiles.organizationId, organizationId)));
    return result[0];
  }

  async getCaseFileByClient(organizationId: string, clientId: string): Promise<CaseFile | undefined> {
    const result = await getDb()
      .select()
      .from(caseFiles)
      .where(and(eq(caseFiles.clientId, clientId), eq(caseFiles.organizationId, organizationId)));
    return result[0];
  }

  async createCaseFile(organizationId: string, clientId: string): Promise<CaseFile> {
    const result = await getDb()
      .insert(caseFiles)
      .values({ organizationId, clientId })
      .returning();
    return result[0];
  }

  async updateCaseFile(organizationId: string, id: string, updates: { status?: string; riskLevel?: string; summary?: string }): Promise<CaseFile | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.status) updateData.status = updates.status as CaseStatus;
    if (updates.riskLevel) updateData.riskLevel = updates.riskLevel as RiskLevel;
    if (updates.summary) updateData.summary = updates.summary;
    const result = await getDb()
      .update(caseFiles)
      .set(updateData)
      .where(and(eq(caseFiles.id, id), eq(caseFiles.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  async closeCaseFile(organizationId: string, id: string, reason: string, closedById: string): Promise<CaseFile | undefined> {
    const result = await getDb()
      .update(caseFiles)
      .set({ status: "closed" as CaseStatus, closureReason: reason, closedAt: new Date(), closedById, updatedAt: new Date() })
      .where(and(eq(caseFiles.id, id), eq(caseFiles.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - CASE NOTES ====================

  async getCaseNotes(caseFileId: string): Promise<CaseNote[]> {
    return await getDb()
      .select()
      .from(caseNotes)
      .where(eq(caseNotes.caseFileId, caseFileId))
      .orderBy(desc(caseNotes.createdAt));
  }

  async createCaseNote(caseFileId: string, authorId: string, data: InsertCaseNote): Promise<CaseNote> {
    const result = await getDb()
      .insert(caseNotes)
      .values({ ...data, caseFileId, authorId })
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - ESCALATION RULES ====================

  async getEscalationRules(organizationId: string): Promise<EscalationRule[]> {
    return await getDb()
      .select()
      .from(escalationRules)
      .where(eq(escalationRules.organizationId, organizationId))
      .orderBy(desc(escalationRules.createdAt));
  }

  async getEscalationRule(organizationId: string, id: string): Promise<EscalationRule | undefined> {
    const result = await getDb()
      .select()
      .from(escalationRules)
      .where(and(eq(escalationRules.id, id), eq(escalationRules.organizationId, organizationId)));
    return result[0];
  }

  async createEscalationRule(organizationId: string, data: InsertEscalationRule): Promise<EscalationRule> {
    const result = await getDb()
      .insert(escalationRules)
      .values({ ...data, organizationId })
      .returning();
    return result[0];
  }

  async updateEscalationRule(organizationId: string, id: string, updates: Partial<InsertEscalationRule>): Promise<EscalationRule | undefined> {
    const result = await getDb()
      .update(escalationRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(escalationRules.id, id), eq(escalationRules.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  async deleteEscalationRule(organizationId: string, id: string): Promise<boolean> {
    const result = await getDb()
      .delete(escalationRules)
      .where(and(eq(escalationRules.id, id), eq(escalationRules.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  // ==================== SAFEGUARDING - MISSED CHECK-IN ESCALATIONS ====================

  async getMissedCheckInEscalations(organizationId: string): Promise<MissedCheckInEscalation[]> {
    return await getDb()
      .select()
      .from(missedCheckInEscalations)
      .where(eq(missedCheckInEscalations.organizationId, organizationId))
      .orderBy(desc(missedCheckInEscalations.createdAt));
  }

  async createMissedCheckInEscalation(organizationId: string, clientId: string, missedAt: Date): Promise<MissedCheckInEscalation> {
    const result = await getDb()
      .insert(missedCheckInEscalations)
      .values({ organizationId, clientId, missedAt })
      .returning();
    return result[0];
  }

  async updateMissedCheckInEscalation(organizationId: string, id: string, updates: { status?: string; resolution?: string; acknowledgedById?: string }): Promise<MissedCheckInEscalation | undefined> {
    const updateData: any = { ...updates };
    if (updates.acknowledgedById) {
      updateData.acknowledgedAt = new Date();
    }
    if (updates.status === "resolved") {
      updateData.resolvedAt = new Date();
    }
    const result = await getDb()
      .update(missedCheckInEscalations)
      .set(updateData)
      .where(and(eq(missedCheckInEscalations.id, id), eq(missedCheckInEscalations.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - AUDIT TRAIL ====================

  async getAuditTrail(organizationId: string, limit: number = 100): Promise<AuditTrailEntry[]> {
    return await getDb()
      .select()
      .from(auditTrail)
      .where(eq(auditTrail.organizationId, organizationId))
      .orderBy(desc(auditTrail.createdAt))
      .limit(limit);
  }

  async createAuditEntry(organizationId: string, data: { userId?: string; userEmail?: string; userRole?: string; action: string; entityType: string; entityId?: string; previousData?: any; newData?: any; ipAddress?: string; userAgent?: string }): Promise<AuditTrailEntry> {
    const result = await getDb()
      .insert(auditTrail)
      .values({ ...data, organizationId })
      .returning();
    return result[0];
  }

  // ==================== SAFEGUARDING - RISK REPORTS ====================

  async getRiskReports(organizationId: string): Promise<RiskReport[]> {
    return await getDb()
      .select()
      .from(riskReports)
      .where(eq(riskReports.organizationId, organizationId))
      .orderBy(desc(riskReports.createdAt));
  }

  async getRiskReport(organizationId: string, id: string): Promise<RiskReport | undefined> {
    const result = await getDb()
      .select()
      .from(riskReports)
      .where(and(eq(riskReports.id, id), eq(riskReports.organizationId, organizationId)));
    return result[0];
  }

  async createRiskReport(organizationId: string, data: { clientId?: string; reportType: string; riskLevel: string; summary: string; dataPoints?: any; recommendation?: string }): Promise<RiskReport> {
    const result = await getDb()
      .insert(riskReports)
      .values({ 
        ...data, 
        organizationId,
        riskLevel: data.riskLevel as RiskLevel
      })
      .returning();
    return result[0];
  }

  async reviewRiskReport(organizationId: string, id: string, reviewedById: string, notes: string): Promise<RiskReport | undefined> {
    const result = await getDb()
      .update(riskReports)
      .set({ reviewedById, reviewedAt: new Date(), reviewNotes: notes })
      .where(and(eq(riskReports.id, id), eq(riskReports.organizationId, organizationId)))
      .returning();
    return result[0];
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
  getAllUsersWithOrgInfo(): Promise<any[]>;
  getAllEmergencyAlerts(): Promise<any[]>;
  getAllMissedCheckIns(): Promise<any[]>;
  getAllRegistrations(): Promise<{ date: string; count: number; users: any[] }[]>;
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
  
  // Global feature flags
  getGlobalFeatures(): Promise<Record<string, boolean>>;
  updateGlobalFeatures(features: Record<string, boolean>, adminId: string): Promise<void>;
  initializeGlobalFeatures(): Promise<void>;
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
    
    // Get organizations count
    const orgsResult = await db.select({ count: count() }).from(users).where(eq(users.accountType, "organization"));
    const totalOrganizations = orgsResult[0]?.count || 0;

    // Get individual users who are NOT organization clients
    const orgClientIds = await db
      .select({ clientId: organizationClients.clientId })
      .from(organizationClients)
      .where(isNotNull(organizationClients.clientId));
    const clientIdList = orgClientIds.map(oc => oc.clientId).filter((id): id is string => id !== null);
    
    let independentIndividualsCount = 0;
    if (clientIdList.length > 0) {
      const indResult = await db.select({ count: count() }).from(users).where(
        and(
          eq(users.accountType, "individual"),
          notInArray(users.id, clientIdList)
        )
      );
      independentIndividualsCount = indResult[0]?.count || 0;
    } else {
      const indResult = await db.select({ count: count() }).from(users).where(eq(users.accountType, "individual"));
      independentIndividualsCount = indResult[0]?.count || 0;
    }

    // Get total organization clients count (all clients added to organizations)
    const orgClientsResult = await db.select({ count: count() }).from(organizationClients);
    const totalOrgClients = orgClientsResult[0]?.count || 0;

    // Total users = independent individuals + all org clients (grand total of people being monitored/using the app)
    const totalUsers = independentIndividualsCount + totalOrgClients;
    const totalIndividuals = independentIndividualsCount;

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

    // Get recent users (last 10) with org client info if applicable - exclude organisations
    const recentUsersData = await db.select().from(users)
      .where(ne(users.accountType, "organization"))
      .orderBy(desc(users.createdAt))
      .limit(10);
    
    // For each user, check if they're an org client and get their reference code and org name
    const recentUsersWithOrgInfo = await Promise.all(recentUsersData.map(async (u) => {
      const { passwordHash, ...profile } = u;
      
      // Check if this user is an organization client
      const orgClientRecord = await db.select({
        referenceCode: organizationClients.referenceCode,
        organizationId: organizationClients.organizationId,
      })
        .from(organizationClients)
        .where(eq(organizationClients.clientId, u.id))
        .limit(1);
      
      if (orgClientRecord.length > 0 && orgClientRecord[0].organizationId) {
        // Get organization name
        const orgUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, orgClientRecord[0].organizationId))
          .limit(1);
        
        return {
          ...profile,
          orgClientReferenceCode: orgClientRecord[0].referenceCode,
          organizationName: orgUser[0]?.name || null,
        };
      }
      
      return { ...profile, orgClientReferenceCode: null, organizationName: null };
    }));
    
    const recentUsers = recentUsersWithOrgInfo;

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

    // Enhance emergency alerts with org client info
    const recentEmergencyAlerts = await Promise.all(recentEmergencyData.map(async (r) => {
      // Check if this user is an organization client
      const orgClientRecord = await db.select({
        referenceCode: organizationClients.referenceCode,
        organizationId: organizationClients.organizationId,
      })
        .from(organizationClients)
        .where(eq(organizationClients.clientId, r.userId))
        .limit(1);
      
      let orgClientReferenceCode: string | null = null;
      let organizationName: string | null = null;
      
      if (orgClientRecord.length > 0 && orgClientRecord[0].organizationId) {
        orgClientReferenceCode = orgClientRecord[0].referenceCode;
        const orgUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, orgClientRecord[0].organizationId))
          .limit(1);
        organizationName = orgUser[0]?.name || null;
      }
      
      return {
        id: r.id,
        userId: r.userId,
        userName: r.userName || "Unknown",
        userEmail: r.userEmail || "Unknown",
        timestamp: r.timestamp,
        contactsNotified: r.contactsNotified,
        orgClientReferenceCode,
        organizationName,
      };
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
    // Get all client IDs that belong to organizations
    const orgClientIds = await getDb()
      .select({ clientId: organizationClients.clientId })
      .from(organizationClients)
      .where(isNotNull(organizationClients.clientId));
    
    const clientIdList = orgClientIds
      .map(oc => oc.clientId)
      .filter((id): id is string => id !== null);
    
    // Get all users except those who are organization clients, and exclude organizations
    let query = getDb().select().from(users);
    
    if (clientIdList.length > 0) {
      query = query.where(
        and(
          notInArray(users.id, clientIdList),
          eq(users.accountType, "individual")
        )
      ) as typeof query;
    } else {
      query = query.where(eq(users.accountType, "individual")) as typeof query;
    }
    
    const result = await query.orderBy(desc(users.createdAt));
    return result.map(u => {
      const { passwordHash, ...profile } = u;
      return profile;
    });
  }

  async getAllUsersWithOrgInfo(): Promise<any[]> {
    const db = getDb();
    // Filter out organisations - only return actual users
    const allUsers = await db.select().from(users)
      .where(ne(users.accountType, "organization"))
      .orderBy(desc(users.createdAt));
    
    const usersWithOrgInfo = await Promise.all(allUsers.map(async (u) => {
      const { passwordHash, ...profile } = u;
      
      // Check if this user is an organization client
      const orgClientRecord = await db.select({
        referenceCode: organizationClients.referenceCode,
        organizationId: organizationClients.organizationId,
      })
        .from(organizationClients)
        .where(eq(organizationClients.clientId, u.id))
        .limit(1);
      
      if (orgClientRecord.length > 0 && orgClientRecord[0].organizationId) {
        const orgUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, orgClientRecord[0].organizationId))
          .limit(1);
        
        return {
          ...profile,
          orgClientReferenceCode: orgClientRecord[0].referenceCode,
          organizationName: orgUser[0]?.name || null,
        };
      }
      
      return { ...profile, orgClientReferenceCode: null, organizationName: null };
    }));
    
    return usersWithOrgInfo;
  }

  async getAllEmergencyAlerts(): Promise<any[]> {
    const db = getDb();
    
    const emergencyData = await db.select({
      id: alertLogs.id,
      userId: alertLogs.userId,
      timestamp: alertLogs.timestamp,
      contactsNotified: alertLogs.contactsNotified,
      message: alertLogs.message,
      userName: users.name,
      userEmail: users.email,
    })
      .from(alertLogs)
      .leftJoin(users, eq(alertLogs.userId, users.id))
      .where(sql`${alertLogs.message} LIKE '%EMERGENCY%'`)
      .orderBy(desc(alertLogs.timestamp));

    // Enhance with org client info
    const alertsWithOrgInfo = await Promise.all(emergencyData.map(async (r) => {
      const orgClientRecord = await db.select({
        referenceCode: organizationClients.referenceCode,
        organizationId: organizationClients.organizationId,
      })
        .from(organizationClients)
        .where(eq(organizationClients.clientId, r.userId))
        .limit(1);
      
      let orgClientReferenceCode: string | null = null;
      let organizationName: string | null = null;
      
      if (orgClientRecord.length > 0 && orgClientRecord[0].organizationId) {
        orgClientReferenceCode = orgClientRecord[0].referenceCode;
        const orgUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, orgClientRecord[0].organizationId))
          .limit(1);
        organizationName = orgUser[0]?.name || null;
      }
      
      return {
        id: r.id,
        userId: r.userId,
        userName: r.userName || "Unknown",
        userEmail: r.userEmail || "Unknown",
        timestamp: r.timestamp,
        contactsNotified: r.contactsNotified,
        orgClientReferenceCode,
        organizationName,
      };
    }));

    return alertsWithOrgInfo;
  }

  async getAllMissedCheckIns(): Promise<any[]> {
    const db = getDb();
    
    // Get all missed check-ins with user info
    const missedData = await db.select({
      id: checkIns.id,
      userId: checkIns.userId,
      timestamp: checkIns.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
      .from(checkIns)
      .leftJoin(users, eq(checkIns.userId, users.id))
      .where(eq(checkIns.status, "missed"))
      .orderBy(desc(checkIns.timestamp));

    // Add org client info
    const missedWithOrgInfo = await Promise.all(missedData.map(async (r) => {
      const orgClientRecord = await db.select({
        referenceCode: organizationClients.referenceCode,
        organizationId: organizationClients.organizationId,
      })
        .from(organizationClients)
        .where(eq(organizationClients.clientId, r.userId))
        .limit(1);
      
      let orgClientReferenceCode: string | null = null;
      let organizationName: string | null = null;
      
      if (orgClientRecord.length > 0 && orgClientRecord[0].organizationId) {
        orgClientReferenceCode = orgClientRecord[0].referenceCode;
        const orgUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, orgClientRecord[0].organizationId))
          .limit(1);
        organizationName = orgUser[0]?.name || null;
      }
      
      return {
        id: r.id,
        userId: r.userId,
        userName: r.userName || "Unknown",
        userEmail: r.userEmail || "Unknown",
        timestamp: r.timestamp,
        orgClientReferenceCode,
        organizationName,
      };
    }));

    return missedWithOrgInfo;
  }

  async getAllRegistrations(): Promise<{ date: string; count: number; users: any[] }[]> {
    const db = getDb();
    
    // Get all users grouped by registration date
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    
    // Group by date
    const dateMap: Record<string, any[]> = {};
    
    for (const u of allUsers) {
      const { passwordHash, ...profile } = u;
      const dateStr = u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'unknown';
      
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = [];
      }
      
      // Check if this user is an organization client
      const orgClientRecord = await db.select({
        referenceCode: organizationClients.referenceCode,
        organizationId: organizationClients.organizationId,
      })
        .from(organizationClients)
        .where(eq(organizationClients.clientId, u.id))
        .limit(1);
      
      let enrichedUser = { ...profile, orgClientReferenceCode: null as string | null, organizationName: null as string | null };
      
      if (orgClientRecord.length > 0 && orgClientRecord[0].organizationId) {
        enrichedUser.orgClientReferenceCode = orgClientRecord[0].referenceCode;
        const orgUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, orgClientRecord[0].organizationId))
          .limit(1);
        enrichedUser.organizationName = orgUser[0]?.name || null;
      }
      
      dateMap[dateStr].push(enrichedUser);
    }
    
    // Convert to array and sort by date descending
    const result = Object.entries(dateMap)
      .map(([date, users]) => ({ date, count: users.length, users }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return result;
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

  // Global feature flags
  async getGlobalFeatures(): Promise<Record<string, boolean>> {
    const flags = await getDb().select().from(globalFeatureFlags);
    const result: Record<string, boolean> = {};
    for (const key of featureKeys) {
      const flag = flags.find(f => f.featureKey === key);
      result[key] = flag?.enabled ?? true; // Default to enabled if not found
    }
    return result;
  }

  async updateGlobalFeatures(features: Record<string, boolean>, adminId: string): Promise<void> {
    for (const [key, enabled] of Object.entries(features)) {
      if (featureKeys.includes(key as any)) {
        const existing = await getDb().select().from(globalFeatureFlags).where(eq(globalFeatureFlags.featureKey, key));
        if (existing.length > 0) {
          await getDb().update(globalFeatureFlags)
            .set({ enabled, updatedAt: new Date(), updatedBy: adminId })
            .where(eq(globalFeatureFlags.featureKey, key));
        } else {
          await getDb().insert(globalFeatureFlags).values({
            featureKey: key,
            enabled,
            updatedBy: adminId,
          });
        }
      }
    }
  }

  async initializeGlobalFeatures(): Promise<void> {
    for (const key of featureKeys) {
      const existing = await getDb().select().from(globalFeatureFlags).where(eq(globalFeatureFlags.featureKey, key));
      if (existing.length === 0) {
        await getDb().insert(globalFeatureFlags).values({
          featureKey: key,
          enabled: true,
        });
      }
    }
  }

  // Admin password reset tokens
  async createAdminPasswordResetToken(adminId: string): Promise<string> {
    await getDb().delete(adminPasswordResetTokens).where(eq(adminPasswordResetTokens.adminId, adminId));

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await getDb().insert(adminPasswordResetTokens).values({
      adminId,
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  async validateAdminPasswordResetToken(token: string): Promise<{ adminId: string; tokenId: string } | null> {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const result = await getDb().select().from(adminPasswordResetTokens).where(
      and(
        eq(adminPasswordResetTokens.tokenHash, tokenHash),
        isNull(adminPasswordResetTokens.usedAt)
      )
    );

    const resetToken = result[0];
    if (!resetToken) {
      return null;
    }

    if (new Date(resetToken.expiresAt) < new Date()) {
      return null;
    }

    return { adminId: resetToken.adminId, tokenId: resetToken.id };
  }

  async markAdminPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await getDb().update(adminPasswordResetTokens).set({ usedAt: new Date() }).where(eq(adminPasswordResetTokens.id, tokenId));
  }

  async updateAdminPassword(adminId: string, passwordHash: string): Promise<void> {
    await getDb().update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, adminId));
  }

  async deleteAllAdminSessions(adminId: string): Promise<void> {
    await getDb().delete(adminSessions).where(eq(adminSessions.adminId, adminId));
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
  getOrganizationClientByClientId(organizationId: string, clientId: string): Promise<OrganizationClient | undefined>;
  addClient(organizationId: string, clientId: string, bundleId?: string, nickname?: string): Promise<OrganizationClient>;
  removeClient(organizationId: string, clientId: string): Promise<boolean>;
  isClientOfOrganization(organizationId: string, clientId: string): Promise<boolean>;
  updateClientStatus(organizationClientId: string, status: OrgClientStatus): Promise<OrganizationClient | undefined>;
  updateClientFeatures(organizationClientId: string, features: UpdateClientFeatures): Promise<OrganizationClient | undefined>;
  updateClientDetails(organizationClientId: string, details: { nickname?: string; clientName?: string; clientPhone?: string; clientEmail?: string; alertsEnabled?: boolean }): Promise<OrganizationClient | undefined>;
  updateClientSchedule(organizationClientId: string, scheduleStartTime: Date, checkInIntervalHours: number): Promise<OrganizationClient | undefined>;
  updateClientEmergencyContacts(organizationClientId: string, emergencyContacts: { name: string; email: string; phone: string; relationship?: string }[]): Promise<OrganizationClient | undefined>;
  getClientFeaturesByUserId(userId: string): Promise<ClientFeatureSettings | null>;
  
  // Pending client registration (org-managed flow)
  createPendingClient(data: {
    organizationId: string;
    bundleId: string | null;
    clientName: string;
    clientPhone: string;
    referenceCode: string;
    scheduleStartTime: Date | null;
    checkInIntervalHours: number;
    features?: {
      featureWellbeingAi: boolean;
      featureShakeToAlert: boolean;
      featureMoodTracking: boolean;
      featurePetProtection: boolean;
      featureDigitalWill: boolean;
    };
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
          clientEmail: row.orgClient.clientEmail,
          alertsEnabled: row.orgClient.alertsEnabled ?? true,
          hasActiveEmergency: false,
          scheduleStartTime: row.orgClient.scheduleStartTime,
          checkInIntervalHours: row.orgClient.checkInIntervalHours,
          addedAt: row.orgClient.addedAt,
          emergencyContacts: (row.orgClient.emergencyContacts as any) || [],
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
          features: {
            featureWellbeingAi: row.orgClient.featureWellbeingAi,
            featureMoodTracking: row.orgClient.featureMoodTracking,
            featurePetProtection: row.orgClient.featurePetProtection,
            featureDigitalWill: row.orgClient.featureDigitalWill,
          },
        });
        continue;
      }
      
      // Handle registered clients with linked user
      const status = await this.getClientStatus(row.client.id);
      const alertLogs = await this.getClientAlertLogs(row.client.id);
      const lastAlert = alertLogs.length > 0 ? alertLogs[0] : null;
      const alertCounts = await this.getClientAlertCounts(row.client.id);
      
      // Check for active emergency alert
      const activeEmergency = await getDb()
        .select({ id: activeEmergencyAlerts.id })
        .from(activeEmergencyAlerts)
        .where(
          and(
            eq(activeEmergencyAlerts.userId, row.client.id),
            eq(activeEmergencyAlerts.isActive, true)
          )
        );
      
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
        clientEmail: row.orgClient.clientEmail,
        alertsEnabled: row.orgClient.alertsEnabled ?? true,
        hasActiveEmergency: activeEmergency.length > 0,
        scheduleStartTime: row.orgClient.scheduleStartTime,
        checkInIntervalHours: row.orgClient.checkInIntervalHours,
        addedAt: row.orgClient.addedAt,
        emergencyContacts: (row.orgClient.emergencyContacts as any) || [],
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
        features: {
          featureWellbeingAi: row.orgClient.featureWellbeingAi,
          featureMoodTracking: row.orgClient.featureMoodTracking,
          featurePetProtection: row.orgClient.featurePetProtection,
          featureDigitalWill: row.orgClient.featureDigitalWill,
        },
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
    // Get the client record first - try by clientId first, then by record ID
    let clientRecord = await getDb()
      .select()
      .from(organizationClients)
      .where(and(
        eq(organizationClients.organizationId, organizationId),
        eq(organizationClients.clientId, clientId)
      ));
    
    // If not found by clientId, try by record ID (for unactivated clients)
    if (clientRecord.length === 0) {
      clientRecord = await getDb()
        .select()
        .from(organizationClients)
        .where(and(
          eq(organizationClients.organizationId, organizationId),
          eq(organizationClients.id, clientId)
        ));
    }
    
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

    // Delete by the record ID we found
    const result = await getDb()
      .delete(organizationClients)
      .where(eq(organizationClients.id, clientRecord[0].id))
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

  async updateClientFeatures(organizationClientId: string, features: UpdateClientFeatures): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .update(organizationClients)
      .set(features)
      .where(eq(organizationClients.id, organizationClientId))
      .returning();
    return result[0];
  }

  async updateClientDetails(organizationClientId: string, details: { nickname?: string; clientName?: string; clientPhone?: string; clientEmail?: string; alertsEnabled?: boolean }): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .update(organizationClients)
      .set(details)
      .where(eq(organizationClients.id, organizationClientId))
      .returning();
    return result[0];
  }

  async updateClientSchedule(organizationClientId: string, scheduleStartTime: Date, checkInIntervalHours: number): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .update(organizationClients)
      .set({ 
        scheduleStartTime,
        checkInIntervalHours,
      })
      .where(eq(organizationClients.id, organizationClientId))
      .returning();
    return result[0];
  }
  
  async updateClientEmergencyContacts(organizationClientId: string, emergencyContacts: { name: string; email: string; phone: string; relationship?: string }[]): Promise<OrganizationClient | undefined> {
    // Limit to 3 contacts
    const limitedContacts = emergencyContacts.slice(0, 3);
    const result = await getDb()
      .update(organizationClients)
      .set({ emergencyContacts: limitedContacts })
      .where(eq(organizationClients.id, organizationClientId))
      .returning();
    return result[0];
  }

  async getClientFeaturesByUserId(userId: string): Promise<ClientFeatureSettings | null> {
    const result = await getDb()
      .select({
        featureWellbeingAi: organizationClients.featureWellbeingAi,
        featureShakeToAlert: organizationClients.featureShakeToAlert,
        featureMoodTracking: organizationClients.featureMoodTracking,
        featurePetProtection: organizationClients.featurePetProtection,
        featureDigitalWill: organizationClients.featureDigitalWill,
      })
      .from(organizationClients)
      .where(eq(organizationClients.clientId, userId));
    
    if (result.length === 0) return null;
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

  // Get organization clients for admin view (GDPR-compliant - only reference code, no personal details)
  async getOrganizationClientsForAdmin(organizationId: string): Promise<AdminOrganizationClientView[]> {
    const clients = await getDb()
      .select()
      .from(organizationClients)
      .where(eq(organizationClients.organizationId, organizationId))
      .orderBy(organizationClients.clientOrdinal);
    
    const results: AdminOrganizationClientView[] = [];
    
    for (const client of clients) {
      // Check for active emergency alert if client is activated
      let hasActiveAlert = false;
      let activeAlertId: string | null = null;
      
      if (client.clientId) {
        const activeAlert = await getDb()
          .select({ id: activeEmergencyAlerts.id })
          .from(activeEmergencyAlerts)
          .where(and(
            eq(activeEmergencyAlerts.userId, client.clientId),
            eq(activeEmergencyAlerts.isActive, true)
          ))
          .limit(1);
        
        if (activeAlert.length > 0) {
          hasActiveAlert = true;
          activeAlertId = activeAlert[0].id;
        }
      }
      
      results.push({
        id: client.id,
        clientOrdinal: client.clientOrdinal,
        referenceCode: client.referenceCode || "",
        clientStatus: client.status,
        registrationStatus: client.registrationStatus,
        isActivated: !!client.clientId,
        hasActiveAlert,
        activeAlertId,
        addedAt: client.addedAt,
        bundleId: client.bundleId,
        clientPhone: client.clientPhone || null,
        featureWellbeingAi: client.featureWellbeingAi ?? true,
        featureShakeToAlert: client.featureShakeToAlert ?? true,
        featureMoodTracking: client.featureMoodTracking ?? true,
        featurePetProtection: client.featurePetProtection ?? true,
        featureDigitalWill: client.featureDigitalWill ?? true,
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
    let clientsAwaitingActivation = 0;
    let totalEmergencyAlerts = 0;
    
    for (const client of clients) {
      // Only count activated clients (those with a linked user) in check-in status counts
      if (!client.clientId) {
        // Unactivated clients - don't count them as "pending" check-in status
        clientsAwaitingActivation++;
        continue;
      }
      
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
      clientsAwaitingActivation,
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

  // Get organization client by user's clientId
  async getOrganizationClientByClientId(organizationId: string, clientId: string): Promise<OrganizationClient | undefined> {
    const result = await getDb()
      .select()
      .from(organizationClients)
      .where(and(
        eq(organizationClients.organizationId, organizationId),
        eq(organizationClients.clientId, clientId)
      ));
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
    features?: {
      featureWellbeingAi: boolean;
      featureShakeToAlert: boolean;
      featureMoodTracking: boolean;
      featurePetProtection: boolean;
      featureDigitalWill: boolean;
    };
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
        featureWellbeingAi: data.features?.featureWellbeingAi ?? true,
        featureShakeToAlert: data.features?.featureShakeToAlert ?? true,
        featureMoodTracking: data.features?.featureMoodTracking ?? true,
        featurePetProtection: data.features?.featurePetProtection ?? true,
        featureDigitalWill: data.features?.featureDigitalWill ?? true,
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
