import { 
  contacts, checkIns, settings, alertLogs, users, sessions,
  Contact, InsertContact, CheckIn, Settings, UpdateSettings, AlertLog, User, Session
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  createUser(email: string, passwordHash: string, name: string, dateOfBirth: string, address: { line1: string; line2?: string; city: string; postalCode: string; country: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;

  // Sessions
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<void>;

  // Contacts
  getContacts(userId: string): Promise<Contact[]>;
  getContact(userId: string, id: string): Promise<Contact | undefined>;
  createContact(userId: string, contact: InsertContact): Promise<Contact>;
  updateContact(userId: string, id: string, updates: Partial<InsertContact>): Promise<Contact | undefined>;
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
  async createUser(email: string, passwordHash: string, name: string, dateOfBirth: string, address: { line1: string; line2?: string; city: string; postalCode: string; country: string }): Promise<User> {
    const result = await db.insert(users).values({
      email,
      passwordHash,
      name,
      dateOfBirth,
      addressLine1: address.line1,
      addressLine2: address.line2 || null,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
    }).returning();
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  // Sessions
  async createSession(userId: string): Promise<Session> {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const result = await db.insert(sessions).values({
      userId,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    const session = result[0];
    if (session && new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(sessionId);
      return undefined;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.userId, userId));
  }

  async getContact(userId: string, id: string): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(
      and(eq(contacts.id, id), eq(contacts.userId, userId))
    );
    return result[0];
  }

  async createContact(userId: string, contact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values({
      ...contact,
      userId,
    }).returning();
    return result[0];
  }

  async updateContact(userId: string, id: string, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    const result = await db.update(contacts)
      .set(updates)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteContact(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(
      and(eq(contacts.id, id), eq(contacts.userId, userId))
    ).returning();
    return result.length > 0;
  }

  // Check-ins
  async getCheckIns(userId: string): Promise<CheckIn[]> {
    return await db.select().from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.timestamp));
  }

  async createCheckIn(userId: string): Promise<CheckIn> {
    const result = await db.insert(checkIns).values({
      userId,
      status: "success",
    }).returning();

    const userSettings = await this.getSettings(userId);
    const hoursToAdd = userSettings.frequency === "daily" ? 24 : 48;
    const nextDue = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);

    await db.update(settings)
      .set({ 
        lastCheckIn: new Date(),
        nextCheckInDue: nextDue,
      })
      .where(eq(settings.userId, userId));

    return result[0];
  }

  async createMissedCheckIn(userId: string): Promise<CheckIn> {
    const result = await db.insert(checkIns).values({
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
    const existing = await db.select().from(settings).where(eq(settings.userId, userId));
    if (existing.length === 0) {
      await db.insert(settings).values({
        userId,
        frequency: "daily",
        alertsEnabled: true,
      });
    }
  }

  async getSettings(userId: string): Promise<Settings> {
    const result = await db.select().from(settings).where(eq(settings.userId, userId));
    
    if (result.length === 0) {
      await this.initializeSettings(userId);
      return {
        frequency: "daily",
        lastCheckIn: null,
        nextCheckInDue: null,
        alertsEnabled: true,
      };
    }

    const row = result[0];
    return {
      frequency: row.frequency as "daily" | "every_two_days",
      lastCheckIn: row.lastCheckIn?.toISOString() || null,
      nextCheckInDue: row.nextCheckInDue?.toISOString() || null,
      alertsEnabled: row.alertsEnabled,
    };
  }

  async updateSettings(userId: string, updates: UpdateSettings): Promise<Settings> {
    await db.update(settings)
      .set(updates)
      .where(eq(settings.userId, userId));
    return this.getSettings(userId);
  }

  // Alerts
  async getAlertLogs(userId: string): Promise<AlertLog[]> {
    return await db.select().from(alertLogs)
      .where(eq(alertLogs.userId, userId))
      .orderBy(desc(alertLogs.timestamp));
  }

  async createAlertLog(userId: string, contactsNotified: string[], message: string): Promise<AlertLog> {
    const result = await db.insert(alertLogs).values({
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

    const hoursToAdd = currentSettings.frequency === "daily" ? 24 : 48;
    const nextDue = new Date(dueDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    await db.update(settings)
      .set({ nextCheckInDue: nextDue })
      .where(eq(settings.userId, userId));

    const allContacts = await this.getContacts(userId);
    if (allContacts.length === 0) {
      return { wasMissed: true, alertSent: false };
    }

    const contactNames = allContacts.map(c => c.name);
    const message = `Missed check-in alert! ${contactNames.join(", ")} would be notified via email.`;
    await this.createAlertLog(userId, contactNames, message);

    console.log(`[ALERT] Missed check-in detected for user ${userId}! Notifying: ${contactNames.join(", ")}`);
    allContacts.forEach(contact => {
      console.log(`[ALERT] Sending alert to ${contact.name} at ${contact.email}`);
    });

    return { wasMissed: true, alertSent: true };
  }
}

export const storage = new DatabaseStorage();
