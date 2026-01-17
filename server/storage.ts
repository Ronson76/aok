import { 
  contacts, checkIns, settings, alertLogs, users, sessions, passwordResetTokens,
  adminUsers, adminSessions, organizationBundles, bundleUsage, adminAuditLogs, organizationClients, organizationClientProfiles,
  Contact, InsertContact, CheckIn, Settings, UpdateSettings, AlertLog, User, Session, PasswordResetToken,
  AdminUser, AdminSession, OrganizationBundle, BundleUsage, AdminAuditLog, DashboardStats, UserProfile, EmergencyAlertInfo,
  OrganizationClient, OrganizationClientWithDetails, OrganizationDashboardStats, StatusData, OrgClientStatus,
  OrganizationClientProfile, UpdateOrganizationClientProfile, AdminOrganizationClientView, AdminOrganizationView
} from "@shared/schema";
import { ensureDb } from "./db";
import { eq, desc, and, isNull, lt, gte, count, sql } from "drizzle-orm";
import { randomUUID, randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";
import { sendMissedCheckInAlert, sendVoiceAlerts } from "./notifications";

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
  getContact(userId: string, id: string): Promise<Contact | undefined>;
  getPrimaryContact(userId: string): Promise<Contact | undefined>;
  getPrimaryContacts(userId: string): Promise<Contact[]>;
  createContact(userId: string, contact: InsertContact): Promise<Contact>;
  updateContact(userId: string, id: string, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  setPrimaryContact(userId: string, contactId: string): Promise<Contact | undefined>;
  deleteContact(userId: string, id: string): Promise<boolean>;

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

  async getContact(userId: string, id: string): Promise<Contact | undefined> {
    const result = await getDb().select().from(contacts).where(
      and(eq(contacts.id, id), eq(contacts.userId, userId))
    );
    return result[0];
  }

  async getPrimaryContact(userId: string): Promise<Contact | undefined> {
    const result = await getDb().select().from(contacts).where(
      and(eq(contacts.userId, userId), eq(contacts.isPrimary, true))
    );
    return result[0];
  }

  async createContact(userId: string, contact: InsertContact): Promise<Contact> {
    // Check if user has any existing contacts - if not, make this the primary
    const existingContacts = await this.getContacts(userId);
    const shouldBePrimary = existingContacts.length === 0;
    
    const result = await getDb().insert(contacts).values({
      ...contact,
      userId,
      isPrimary: shouldBePrimary,
    }).returning();
    return result[0];
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
        nextCheckInDue: null,
        alertsEnabled: true,
      };
    }

    const row = result[0];
    return {
      frequency: row.frequency as "daily" | "every_two_days",
      intervalHours: parseInt(row.intervalHours) || 24,
      lastCheckIn: row.lastCheckIn?.toISOString() || null,
      nextCheckInDue: row.nextCheckInDue?.toISOString() || null,
      alertsEnabled: row.alertsEnabled,
    };
  }

  async updateSettings(userId: string, updates: UpdateSettings): Promise<Settings> {
    const dbUpdates: any = {};
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.intervalHours !== undefined) dbUpdates.intervalHours = String(updates.intervalHours);
    if (updates.alertsEnabled !== undefined) dbUpdates.alertsEnabled = updates.alertsEnabled;
    
    // If interval is changing, recalculate nextCheckInDue based on lastCheckIn
    if (updates.intervalHours !== undefined) {
      const currentSettings = await this.getSettings(userId);
      if (currentSettings.lastCheckIn) {
        const lastCheckIn = new Date(currentSettings.lastCheckIn);
        const nextDue = new Date(lastCheckIn.getTime() + updates.intervalHours * 60 * 60 * 1000);
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
        // Send email alerts
        const { emailsSent, emailsFailed } = await sendMissedCheckInAlert(contactsToAlert, user);
        
        // Send voice calls to landline contacts
        const { callsMade, callsFailed } = await sendVoiceAlerts(contactsToAlert, user, 'missed_checkin');
        
        alertSent = emailsSent > 0 || callsMade > 0;
        
        const notificationParts = [];
        if (emailsSent > 0) notificationParts.push(`${emailsSent} email(s)`);
        if (callsMade > 0) notificationParts.push(`${callsMade} voice call(s)`);
        
        const failedParts = [];
        if (emailsFailed > 0) failedParts.push(`${emailsFailed} email(s)`);
        if (callsFailed > 0) failedParts.push(`${callsFailed} call(s)`);
        
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
  addClient(organizationId: string, clientId: string, bundleId?: string, nickname?: string): Promise<OrganizationClient>;
  removeClient(organizationId: string, clientId: string): Promise<boolean>;
  isClientOfOrganization(organizationId: string, clientId: string): Promise<boolean>;
  updateClientStatus(organizationClientId: string, status: OrgClientStatus): Promise<OrganizationClient | undefined>;
  
  // Client profiles
  getClientProfile(organizationClientId: string): Promise<OrganizationClientProfile | undefined>;
  updateClientProfile(organizationClientId: string, profile: UpdateOrganizationClientProfile): Promise<OrganizationClientProfile>;
  
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
      if (!row.client) continue;
      
      const status = await this.getClientStatus(row.client.id);
      const alertLogs = await this.getClientAlertLogs(row.client.id);
      const lastAlert = alertLogs.length > 0 ? alertLogs[0] : null;
      const profile = await this.getClientProfile(row.orgClient.id);
      const alertCounts = await this.getClientAlertCounts(row.client.id);
      
      results.push({
        id: row.orgClient.id,
        clientId: row.orgClient.clientId,
        nickname: row.orgClient.nickname,
        clientOrdinal: row.orgClient.clientOrdinal,
        clientStatus: row.orgClient.status,
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

  // Get organization clients for admin view (privacy-limited)
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
      if (!row.client) continue;
      
      const status = await this.getClientStatus(row.client.id);
      const alertCounts = await this.getClientAlertCounts(row.client.id);
      
      results.push({
        id: row.orgClient.id,
        clientOrdinal: row.orgClient.clientOrdinal,
        clientStatus: row.orgClient.status,
        email: row.client.email,
        mobileNumber: row.client.mobileNumber,
        userDisabled: row.client.disabled,
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
      
      // Count emergency alerts for this client
      const alerts = await getDb()
        .select({ count: count() })
        .from(alertLogs)
        .where(and(
          eq(alertLogs.userId, client.clientId),
          sql`${alertLogs.message} LIKE '%EMERGENCY%'`
        ));
      totalEmergencyAlerts += alerts[0]?.count || 0;
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
}

export const organizationStorage = new OrganizationStorage();
