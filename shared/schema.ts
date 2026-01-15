import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Check-in frequency options
export const checkInFrequencies = ["daily", "every_two_days"] as const;
export type CheckInFrequency = typeof checkInFrequencies[number];

// Contacts table
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  relationship: text("relationship").notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Check-ins table
export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().$type<"success" | "missed">(),
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({ id: true, timestamp: true });
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

// Settings table (single row for app settings)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`'default'`),
  frequency: text("frequency").notNull().$type<CheckInFrequency>().default("daily"),
  lastCheckIn: timestamp("last_check_in"),
  nextCheckInDue: timestamp("next_check_in_due"),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
});

export type Settings = {
  frequency: CheckInFrequency;
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
  alertsEnabled: boolean;
};

export const updateSettingsSchema = z.object({
  frequency: z.enum(checkInFrequencies).optional(),
  alertsEnabled: z.boolean().optional(),
});

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// Alert logs table
export const alertLogs = pgTable("alert_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  contactsNotified: text("contacts_notified").array().notNull(),
  message: text("message").notNull(),
});

export type AlertLog = typeof alertLogs.$inferSelect;

// Status display data (not persisted, computed)
export interface StatusData {
  status: "safe" | "pending" | "overdue";
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
  streak: number;
  hoursUntilDue: number | null;
}
