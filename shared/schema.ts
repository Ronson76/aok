import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Check-in frequency options
export const checkInFrequencies = ["daily", "every_two_days"] as const;
export type CheckInFrequency = typeof checkInFrequencies[number];

// Account type options
export const accountTypes = ["individual", "organization"] as const;
export type AccountType = typeof accountTypes[number];

// Phone type options for contacts
export const phoneTypes = ["mobile", "landline"] as const;
export type PhoneType = typeof phoneTypes[number];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  accountType: text("account_type").notNull().$type<AccountType>().default("individual"),
  // For individuals: personal name, for organizations: organization name
  name: text("name").notNull(),
  // For organizations only: reference ID for the vulnerable person
  referenceId: text("reference_id"),
  dateOfBirth: date("date_of_birth"),
  // Mobile number (required for individuals, optional for organizations)
  mobileNumber: text("mobile_number"),
  // Address fields (optional for individuals, may be needed for organizations)
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  // Admin can disable users to prevent them from logging in
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  passwordHash: true, 
  createdAt: true,
  disabled: true,
}).extend({
  accountType: z.enum(accountTypes),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(1, "Name is required"),
  referenceId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  mobileNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Organizations must have a reference ID
  if (data.accountType === "organization") {
    return !!data.referenceId && data.referenceId.length > 0;
  }
  return true;
}, {
  message: "Reference ID is required for organizations",
  path: ["referenceId"],
}).refine((data) => {
  // Individuals must have a valid mobile number (at least 10 characters after trimming)
  if (data.accountType === "individual") {
    const trimmed = data.mobileNumber?.trim() || "";
    return trimmed.length >= 10;
  }
  return true;
}, {
  message: "Please enter a valid mobile number",
  path: ["mobileNumber"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sessions table
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;

// Contacts table
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  phoneType: text("phone_type").$type<PhoneType>(),
  relationship: text("relationship").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, userId: true, isPrimary: true }).extend({
  phoneType: z.enum(phoneTypes).optional(),
});
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Note: isPrimary is managed through dedicated setPrimaryContact endpoint, not general updates
export const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  phoneType: z.enum(phoneTypes).optional(),
  relationship: z.string().optional(),
});
export type UpdateContact = z.infer<typeof updateContactSchema>;

// Check-ins table
export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().$type<"success" | "missed">(),
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({ id: true, userId: true, timestamp: true });
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

// Settings table (per-user settings)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  frequency: text("frequency").notNull().$type<CheckInFrequency>().default("daily"),
  intervalHours: text("interval_hours").notNull().default("24"),
  scheduleStartTime: timestamp("schedule_start_time"),
  lastCheckIn: timestamp("last_check_in"),
  nextCheckInDue: timestamp("next_check_in_due"),
  lastMissedDueAt: timestamp("last_missed_due_at"),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
});

export type Settings = {
  frequency: CheckInFrequency;
  intervalHours: number;
  scheduleStartTime: string | null;
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
  alertsEnabled: boolean;
};

export const updateSettingsSchema = z.object({
  frequency: z.enum(checkInFrequencies).optional(),
  intervalHours: z.number().min(1).max(48).optional(),
  scheduleStartTime: z.string().optional(),
  alertsEnabled: z.boolean().optional(),
  password: z.string().optional(),
});

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// Alert logs table
export const alertLogs = pgTable("alert_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  contactsNotified: text("contacts_notified").array().notNull(),
  message: text("message").notNull(),
});

export type AlertLog = typeof alertLogs.$inferSelect;

// Password reset tokens table (stores hashed tokens for security)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Push subscriptions table for web push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Status display data (not persisted, computed)
export interface StatusData {
  status: "safe" | "pending" | "overdue";
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
  streak: number;
  hoursUntilDue: number | null;
  contactCount: number;
}

// User profile (safe to send to frontend, without password)
export type UserProfile = Omit<User, "passwordHash">;

// ==================== ADMIN SYSTEM ====================

// Admin role options
export const adminRoles = ["super_admin", "analyst"] as const;
export type AdminRole = typeof adminRoles[number];

// Admin users table (separate from regular users)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().$type<AdminRole>().default("analyst"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  lastLoginAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(adminRoles).optional(),
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminUserProfile = Omit<AdminUser, "passwordHash">;

// Admin sessions table
export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminSession = typeof adminSessions.$inferSelect;

// Admin login schema
export const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// Bundle status options
export const bundleStatuses = ["active", "expired", "cancelled"] as const;
export type BundleStatus = typeof bundleStatuses[number];

// Organization client status options
export const orgClientStatuses = ["active", "paused", "terminated"] as const;
export type OrgClientStatus = typeof orgClientStatuses[number];

// Organization bundles table (subscription packages for organizations)
export const organizationBundles = pgTable("organization_bundles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  seatLimit: integer("seat_limit").notNull(),
  seatsUsed: integer("seats_used").notNull().default(0),
  status: text("status").notNull().$type<BundleStatus>().default("active"),
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => adminUsers.id),
});

export const insertOrganizationBundleSchema = createInsertSchema(organizationBundles).omit({
  id: true,
  seatsUsed: true,
  createdAt: true,
  createdBy: true,
}).extend({
  seatLimit: z.number().min(1, "Seat limit must be at least 1"),
  name: z.string().min(1, "Bundle name is required"),
  expiresAt: z.string().optional(),
});

export type InsertOrganizationBundle = z.infer<typeof insertOrganizationBundleSchema>;
export type OrganizationBundle = typeof organizationBundles.$inferSelect;

// Bundle usage tracking (tracks each seat used)
export const bundleUsage = pgTable("bundle_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bundleId: varchar("bundle_id").notNull().references(() => organizationBundles.id, { onDelete: "cascade" }),
  referenceId: text("reference_id").notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export type BundleUsage = typeof bundleUsage.$inferSelect;

// Organization clients table (links organizations to individual users they monitor)
export const organizationClients = pgTable("organization_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bundleId: varchar("bundle_id").references(() => organizationBundles.id, { onDelete: "set null" }),
  nickname: text("nickname"),
  clientOrdinal: integer("client_ordinal").notNull().default(0),
  status: text("status").notNull().$type<OrgClientStatus>().default("active"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertOrganizationClientSchema = createInsertSchema(organizationClients).omit({
  id: true,
  addedAt: true,
  clientOrdinal: true,
  status: true,
});

export type InsertOrganizationClient = z.infer<typeof insertOrganizationClientSchema>;
export type OrganizationClient = typeof organizationClients.$inferSelect;

// Organization client profiles table (detailed info about clients, managed by org)
export const organizationClientProfiles = pgTable("organization_client_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationClientId: varchar("organization_client_id").notNull().references(() => organizationClients.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  dateOfBirth: date("date_of_birth"),
  vulnerabilities: text("vulnerabilities"),
  medicalNotes: text("medical_notes"),
  emergencyInstructions: text("emergency_instructions"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrganizationClientProfileSchema = createInsertSchema(organizationClientProfiles).omit({
  id: true,
  updatedAt: true,
});

export const updateOrganizationClientProfileSchema = z.object({
  displayName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  vulnerabilities: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyInstructions: z.string().optional(),
  notes: z.string().optional(),
});

export type InsertOrganizationClientProfile = z.infer<typeof insertOrganizationClientProfileSchema>;
export type UpdateOrganizationClientProfile = z.infer<typeof updateOrganizationClientProfileSchema>;
export type OrganizationClientProfile = typeof organizationClientProfiles.$inferSelect;

// Organization client with user details (for dashboard display)
export interface OrganizationClientWithDetails {
  id: string;
  clientId: string;
  nickname: string | null;
  clientOrdinal: number;
  clientStatus: OrgClientStatus;
  addedAt: Date;
  client: {
    id: string;
    name: string;
    email: string;
    mobileNumber: string | null;
  };
  profile: OrganizationClientProfile | null;
  status: StatusData;
  lastAlert: AlertLog | null;
  alertCounts: {
    total: number;
    emails: number;
    calls: number;
    emergencies: number;
  };
}

// Admin view of organization client (privacy-limited)
export interface AdminOrganizationClientView {
  id: string;
  clientOrdinal: number;
  clientStatus: OrgClientStatus;
  email: string;
  mobileNumber: string | null;
  userDisabled: boolean;
  addedAt: Date;
  status: StatusData;
  alertCounts: {
    total: number;
    emails: number;
    calls: number;
    emergencies: number;
  };
}

// Admin view of organization with client summary
export interface AdminOrganizationView {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  disabled: boolean;
  bundles: {
    id: string;
    name: string;
    seatLimit: number;
    seatsUsed: number;
    status: BundleStatus;
  }[];
  totalClients: number;
  activeClients: number;
  pausedClients: number;
  totalAlerts: number;
}

// Admin audit logs (track admin actions)
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

// Emergency alert info for admin dashboard
export interface EmergencyAlertInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: Date;
  contactsNotified: string[];
}

// Dashboard statistics type (computed, not stored)
export interface DashboardStats {
  totalUsers: number;
  totalOrganizations: number;
  totalIndividuals: number;
  totalCheckIns: number;
  totalMissedCheckIns: number;
  activeBundles: number;
  totalSeatsAllocated: number;
  totalSeatsUsed: number;
  recentUsers: UserProfile[];
  dailyRegistrations: { date: string; count: number }[];
  totalEmergencyAlerts: number;
  recentEmergencyAlerts: EmergencyAlertInfo[];
}

// Organization dashboard statistics type
export interface OrganizationDashboardStats {
  totalClients: number;
  totalSeats: number;
  seatsUsed: number;
  clientsSafe: number;
  clientsPending: number;
  clientsOverdue: number;
  totalEmergencyAlerts: number;
  bundles: OrganizationBundle[];
}
