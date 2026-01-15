import { 
  type Contact, 
  type InsertContact, 
  type CheckIn, 
  type Settings, 
  type CheckInFrequency, 
  type AlertLog,
  contacts,
  checkIns,
  settings,
  alertLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;

  // Check-ins
  getCheckIns(): Promise<CheckIn[]>;
  createCheckIn(): Promise<CheckIn>;
  createMissedCheckIn(): Promise<CheckIn>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: { frequency?: CheckInFrequency; alertsEnabled?: boolean }): Promise<Settings>;

  // Alerts
  getAlertLogs(): Promise<AlertLog[]>;
  createAlertLog(contactsNotified: string[], message: string): Promise<AlertLog>;
  
  // Check and process missed check-ins
  processOverdueCheckIn(): Promise<{ wasMissed: boolean; alertSent: boolean }>;
}

export class DatabaseStorage implements IStorage {
  private lastProcessedOverdue: string | null = null;

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values(insertContact).returning();
    return result[0];
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return result.length > 0;
  }

  // Check-ins
  async getCheckIns(): Promise<CheckIn[]> {
    return await db.select().from(checkIns).orderBy(desc(checkIns.timestamp));
  }

  async createCheckIn(): Promise<CheckIn> {
    const now = new Date();
    const result = await db.insert(checkIns).values({
      status: "success",
    }).returning();

    // Get current settings to determine frequency
    const currentSettings = await this.getSettings();
    const hoursToAdd = currentSettings.frequency === "daily" ? 24 : 48;
    const nextDue = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

    // Update settings with last check-in time and next due
    await db.update(settings)
      .set({
        lastCheckIn: now,
        nextCheckInDue: nextDue,
      })
      .where(eq(settings.id, "default"));
    
    // Reset the overdue tracking since user checked in
    this.lastProcessedOverdue = null;

    return result[0];
  }

  async createMissedCheckIn(): Promise<CheckIn> {
    const result = await db.insert(checkIns).values({
      status: "missed",
    }).returning();
    return result[0];
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const result = await db.select().from(settings).where(eq(settings.id, "default"));
    
    if (result.length === 0) {
      // Create default settings if not exists
      await db.insert(settings).values({
        id: "default",
        frequency: "daily",
        alertsEnabled: true,
      });
      return {
        frequency: "daily",
        lastCheckIn: null,
        nextCheckInDue: null,
        alertsEnabled: true,
      };
    }
    
    const row = result[0];
    return {
      frequency: row.frequency as CheckInFrequency,
      lastCheckIn: row.lastCheckIn?.toISOString() || null,
      nextCheckInDue: row.nextCheckInDue?.toISOString() || null,
      alertsEnabled: row.alertsEnabled,
    };
  }

  async updateSettings(updates: { frequency?: CheckInFrequency; alertsEnabled?: boolean }): Promise<Settings> {
    const currentSettings = await this.getSettings();
    
    const updateData: Record<string, unknown> = {};
    
    if (updates.frequency !== undefined) {
      updateData.frequency = updates.frequency;
      
      // Recalculate next check-in due if there was a previous check-in
      if (currentSettings.lastCheckIn) {
        const lastCheckIn = new Date(currentSettings.lastCheckIn);
        const hoursToAdd = updates.frequency === "daily" ? 24 : 48;
        const nextDue = new Date(lastCheckIn.getTime() + hoursToAdd * 60 * 60 * 1000);
        updateData.nextCheckInDue = nextDue;
      }
    }
    
    if (updates.alertsEnabled !== undefined) {
      updateData.alertsEnabled = updates.alertsEnabled;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(settings).set(updateData).where(eq(settings.id, "default"));
    }

    return await this.getSettings();
  }

  // Alerts
  async getAlertLogs(): Promise<AlertLog[]> {
    return await db.select().from(alertLogs).orderBy(desc(alertLogs.timestamp));
  }

  async createAlertLog(contactsNotified: string[], message: string): Promise<AlertLog> {
    const result = await db.insert(alertLogs).values({
      contactsNotified,
      message,
    }).returning();
    return result[0];
  }

  // Process overdue check-ins
  async processOverdueCheckIn(): Promise<{ wasMissed: boolean; alertSent: boolean }> {
    const currentSettings = await this.getSettings();
    const now = new Date();
    
    // If no next due date set, or alerts disabled
    if (!currentSettings.nextCheckInDue || !currentSettings.alertsEnabled) {
      return { wasMissed: false, alertSent: false };
    }

    const dueDate = new Date(currentSettings.nextCheckInDue);
    
    // If not overdue yet, nothing to do
    if (now < dueDate) {
      return { wasMissed: false, alertSent: false };
    }

    // Check if we already processed this overdue period
    const overdueKey = currentSettings.nextCheckInDue;
    if (this.lastProcessedOverdue === overdueKey) {
      return { wasMissed: true, alertSent: false };
    }

    // Mark as processed
    this.lastProcessedOverdue = overdueKey;

    // Create a missed check-in record
    await this.createMissedCheckIn();

    // Advance the next check-in due date for future alerts
    const hoursToAdd = currentSettings.frequency === "daily" ? 24 : 48;
    const nextDue = new Date(dueDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    await db.update(settings)
      .set({ nextCheckInDue: nextDue })
      .where(eq(settings.id, "default"));

    // Get contacts to notify
    const allContacts = await this.getContacts();
    if (allContacts.length === 0) {
      return { wasMissed: true, alertSent: false };
    }

    // Create alert log (simulating sending alerts)
    const contactNames = allContacts.map(c => c.name);
    const message = `Missed check-in alert! ${contactNames.join(", ")} would be notified via email.`;
    await this.createAlertLog(contactNames, message);

    // Log to console for demonstration purposes
    console.log(`[ALERT] Missed check-in detected! Notifying: ${contactNames.join(", ")}`);
    allContacts.forEach(contact => {
      console.log(`[ALERT] Sending alert to ${contact.name} at ${contact.email}`);
    });

    return { wasMissed: true, alertSent: true };
  }

  // Update a contact
  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    const result = await db.update(contacts)
      .set(updates)
      .where(eq(contacts.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
