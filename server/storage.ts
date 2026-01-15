import { 
  contacts, checkIns, settings, alertLogs, users, sessions, passwordResetTokens,
  Contact, InsertContact, CheckIn, Settings, UpdateSettings, AlertLog, User, Session, PasswordResetToken
} from "@shared/schema";
import { ensureDb } from "./db";
import { eq, desc, and, isNull, lt } from "drizzle-orm";
import { randomUUID, randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";
import { sendMissedCheckInAlert } from "./notifications";

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
  createAlertLog(userId: string, contactsNotified: string[], message: string): Promise<AlertLog>;

  // Missed check-in processing
  processOverdueCheckIn(userId: string): Promise<{ wasMissed: boolean; alertSent: boolean }>;
}

class DatabaseStorage implements IStorage {
  private lastProcessedOverdue: { [userId: string]: string | null } = {};

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
    const result = await getDb().insert(contacts).values({
      ...contact,
      userId,
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
    
    // Unset all primary contacts for this user
    await getDb().update(contacts)
      .set({ isPrimary: false })
      .where(eq(contacts.userId, userId));
    
    // Then set the specified contact as primary (scoped by userId for security)
    const result = await getDb().update(contacts)
      .set({ isPrimary: true })
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .returning();
    return result[0];
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

  // Process overdue check-ins
  async processOverdueCheckIn(userId: string): Promise<{ wasMissed: boolean; alertSent: boolean }> {
    const currentSettings = await this.getSettings(userId);
    const now = new Date();
    
    if (!currentSettings.nextCheckInDue || !currentSettings.alertsEnabled) {
      return { wasMissed: false, alertSent: false };
    }

    const dueDate = new Date(currentSettings.nextCheckInDue);
    
    if (now < dueDate) {
      return { wasMissed: false, alertSent: false };
    }

    const overdueKey = currentSettings.nextCheckInDue;
    if (this.lastProcessedOverdue[userId] === overdueKey) {
      return { wasMissed: true, alertSent: false };
    }

    this.lastProcessedOverdue[userId] = overdueKey;

    await this.createMissedCheckIn(userId);

    const hoursToAdd = currentSettings.intervalHours || 24;
    const nextDue = new Date(dueDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    await getDb().update(settings)
      .set({ nextCheckInDue: nextDue })
      .where(eq(settings.userId, userId));

    const allContacts = await this.getContacts(userId);
    if (allContacts.length === 0) {
      return { wasMissed: true, alertSent: false };
    }

    const user = await this.getUserById(userId);
    if (!user) {
      return { wasMissed: true, alertSent: false };
    }

    const contactNames = allContacts.map(c => c.name);
    
    console.log(`[ALERT] Missed check-in detected for user ${userId}! Sending alerts to: ${contactNames.join(", ")}`);
    
    try {
      const { emailsSent, emailsFailed } = await sendMissedCheckInAlert(allContacts, user);
      const message = `Missed check-in alert sent! ${emailsSent} email(s) delivered${emailsFailed > 0 ? `, ${emailsFailed} failed` : ''}.`;
      await this.createAlertLog(userId, contactNames, message);
      return { wasMissed: true, alertSent: emailsSent > 0 };
    } catch (error) {
      console.error(`[ALERT] Error sending alerts:`, error);
      const message = `Missed check-in detected. Alert delivery failed.`;
      await this.createAlertLog(userId, contactNames, message);
      return { wasMissed: true, alertSent: false };
    }
  }
}

export const storage = new DatabaseStorage();
