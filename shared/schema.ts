import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, date, integer, jsonb } from "drizzle-orm/pg-core";
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
  // Track when user accepted terms and conditions (null = not accepted)
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Per-user feature toggles (all ON by default)
  featureWellbeingAi: boolean("feature_wellbeing_ai").notNull().default(true),
  featureShakeToAlert: boolean("feature_shake_to_alert").notNull().default(true),
  featureWellness: boolean("feature_wellness").notNull().default(true),
  featurePetProtection: boolean("feature_pet_protection").notNull().default(true),
  featureDigitalWill: boolean("feature_digital_will").notNull().default(true),
  // Last known location (updated on check-in if provided)
  latitude: text("latitude"),
  longitude: text("longitude"),
  lastLocationUpdatedAt: timestamp("last_location_updated_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  passwordHash: true, 
  createdAt: true,
  disabled: true,
  termsAcceptedAt: true, // Handled separately in backend to allow string input
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

// Schema for updating user feature settings
export const updateUserFeaturesSchema = z.object({
  featureWellbeingAi: z.boolean().optional(),
  featureShakeToAlert: z.boolean().optional(),
  featureWellness: z.boolean().optional(),
  featurePetProtection: z.boolean().optional(),
  featureDigitalWill: z.boolean().optional(),
});
export type UpdateUserFeatures = z.infer<typeof updateUserFeaturesSchema>;

// Type for user feature settings
export type UserFeatureSettings = {
  featureWellbeingAi: boolean;
  featureShakeToAlert: boolean;
  featureWellness: boolean;
  featurePetProtection: boolean;
  featureDigitalWill: boolean;
};

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
  // Confirmation fields - contact must confirm before becoming active
  confirmedAt: timestamp("confirmed_at"),
  confirmationToken: text("confirmation_token"),
  confirmationExpiry: timestamp("confirmation_expiry"),
  reminderSentAt: timestamp("reminder_sent_at"),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, userId: true, isPrimary: true }).extend({
  phoneType: z.enum(phoneTypes).optional(),
  phone: z.string().optional().refine(
    (val) => !val || val === "" || /^\+\d{7,15}$/.test(val.replace(/[\s\-\(\)]/g, "")),
    { message: "Phone must be in international format with country code (e.g., +447123456789)" }
  ),
});
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Note: isPrimary is managed through dedicated setPrimaryContact endpoint, not general updates
export const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().refine(
    (val) => !val || /^\+\d{7,15}$/.test(val.replace(/[\s\-\(\)]/g, "")),
    { message: "Phone must be in international format with country code (e.g., +447123456789)" }
  ),
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

// Push notification status
export const pushStatuses = ["unknown", "enabled", "declined"] as const;
export type PushStatus = (typeof pushStatuses)[number];

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
  lastPushSentAt: timestamp("last_push_sent_at"),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  pushStatus: text("push_status").notNull().$type<PushStatus>().default("unknown"),
  redAlertEnabled: boolean("red_alert_enabled").notNull().default(false),
  trackingEnabled: boolean("tracking_enabled").notNull().default(false),
  // Additional living situation info (pets, children, partner travel, rural access, solo travel, lone worker)
  additionalInfo: text("additional_info"),
  // Living situation from onboarding (with-pets, with-children, partner-travels, rural-area, solo-travel, lone-worker)
  livingSituation: text("living_situation"),
  // Shake-to-SOS feature (enabled by default, user can disable in settings)
  shakeToSOSEnabled: boolean("shake_to_sos_enabled").notNull().default(true),
});

export type Settings = {
  frequency: CheckInFrequency;
  intervalHours: number;
  scheduleStartTime: string | null;
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
  alertsEnabled: boolean;
  pushStatus: PushStatus;
  redAlertEnabled: boolean;
  trackingEnabled: boolean;
  additionalInfo: string | null;
  livingSituation: string | null;
  shakeToSOSEnabled: boolean;
};

export const updateSettingsSchema = z.object({
  frequency: z.enum(checkInFrequencies).optional(),
  intervalHours: z.number().min(0.08).max(48).optional(), // Min 0.08 (~5 mins) for testing
  scheduleStartTime: z.string().optional(),
  nextCheckInDue: z.string().optional(),
  lastCheckIn: z.string().optional(),
  alertsEnabled: z.boolean().optional(),
  pushStatus: z.enum(pushStatuses).optional(),
  redAlertEnabled: z.boolean().optional(),
  trackingEnabled: z.boolean().optional(),
  shakeToSOSEnabled: z.boolean().optional(),
  password: z.string().optional(),
  additionalInfo: z.string().optional(),
  livingSituation: z.string().optional(),
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

// Active emergency alerts table - tracks ongoing red alert states
export const activeEmergencyAlerts = pgTable("active_emergency_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  lastDispatchAt: timestamp("last_dispatch_at").notNull().defaultNow(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  what3words: text("what3words"),
  isActive: boolean("is_active").notNull().default(true),
  deactivatedAt: timestamp("deactivated_at"),
});

export type ActiveEmergencyAlert = typeof activeEmergencyAlerts.$inferSelect;

export const insertActiveEmergencyAlertSchema = createInsertSchema(activeEmergencyAlerts).omit({
  id: true,
  activatedAt: true,
  lastDispatchAt: true,
  deactivatedAt: true,
});

export type InsertActiveEmergencyAlert = z.infer<typeof insertActiveEmergencyAlertSchema>;

// Schema for deactivating emergency alert with password
export const deactivateEmergencyAlertSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type DeactivateEmergencyAlertInput = z.infer<typeof deactivateEmergencyAlertSchema>;

// Deactivation confirmations - tracks when contacts confirm they've spoken to the client
export const deactivationConfirmations = pgTable("deactivation_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactEmail: text("contact_email").notNull(),
  contactName: text("contact_name").notNull(),
  alertId: varchar("alert_id").notNull(),
  confirmationToken: text("confirmation_token").notNull().unique(),
  lastKnownLatitude: text("last_known_latitude"),
  lastKnownLongitude: text("last_known_longitude"),
  lastKnownWhat3Words: text("last_known_what3words"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  confirmedByIp: text("confirmed_by_ip"),
  confirmedByUserAgent: text("confirmed_by_user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
});

export type DeactivationConfirmation = typeof deactivationConfirmations.$inferSelect;

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
  expiringContacts?: { name: string; expiresAt: string }[];
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

// Admin password reset tokens table
export const adminPasswordResetTokens = pgTable("admin_password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminPasswordResetToken = typeof adminPasswordResetTokens.$inferSelect;

// Global feature flags table (admin-level control of features)
export const globalFeatureFlags = pgTable("global_feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  featureKey: text("feature_key").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => adminUsers.id),
});

export const featureKeys = [
  "wellbeing_ai",
  "shake_to_alert", 
  "wellness",
  "pet_protection",
  "digital_will"
] as const;

export type FeatureKey = typeof featureKeys[number];
export type GlobalFeatureFlag = typeof globalFeatureFlags.$inferSelect;

export const updateGlobalFeaturesSchema = z.object({
  wellbeing_ai: z.boolean().optional(),
  shake_to_alert: z.boolean().optional(),
  wellness: z.boolean().optional(),
  pet_protection: z.boolean().optional(),
  digital_will: z.boolean().optional(),
});

export type UpdateGlobalFeatures = z.infer<typeof updateGlobalFeaturesSchema>;

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
// Registration status for org-managed clients
export const orgClientRegistrationStatuses = ["pending_sms", "pending_registration", "registered"] as const;
export type OrgClientRegistrationStatus = typeof orgClientRegistrationStatuses[number];

// Emergency contact type for org-managed clients
export interface OrgClientEmergencyContact {
  name: string;
  email: string;
  phone: string;
  relationship?: string;
}

export const organizationClients = pgTable("organization_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => users.id, { onDelete: "cascade" }),
  bundleId: varchar("bundle_id").references(() => organizationBundles.id, { onDelete: "set null" }),
  nickname: text("nickname"),
  clientOrdinal: integer("client_ordinal").notNull().default(0),
  status: text("status").notNull().$type<OrgClientStatus>().default("active"),
  registrationStatus: text("registration_status").notNull().$type<OrgClientRegistrationStatus>().default("pending_sms"),
  referenceCode: varchar("reference_code", { length: 8 }).unique(),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientName: text("client_name"),
  // Alerts toggle - organisations can turn alerts on/off for each client
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  scheduleStartTime: timestamp("schedule_start_time"),
  checkInIntervalHours: integer("check_in_interval_hours").default(24),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  // Emergency contacts for org-managed clients (up to 3, stored as JSON)
  emergencyContacts: jsonb("emergency_contacts").$type<OrgClientEmergencyContact[]>().default([]),
  // Feature controls - organizations can enable/disable features for each client (all ON by default)
  featureWellbeingAi: boolean("feature_wellbeing_ai").notNull().default(true),
  featureShakeToAlert: boolean("feature_shake_to_alert").notNull().default(true),
  featureMoodTracking: boolean("feature_mood_tracking").notNull().default(true),
  featurePetProtection: boolean("feature_pet_protection").notNull().default(true),
  featureDigitalWill: boolean("feature_digital_will").notNull().default(true),
});

export const insertOrganizationClientSchema = createInsertSchema(organizationClients).omit({
  id: true,
  addedAt: true,
  clientOrdinal: true,
  status: true,
  registrationStatus: true,
  referenceCode: true,
  clientId: true,
});

// Schema for org to register a new client
export const registerOrgClientSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientPhone: z.string().min(10, "Valid phone number is required"),
  dateOfBirth: z.string().optional(),
  bundleId: z.string().optional(),
  scheduleStartTime: z.string().optional(),
  checkInIntervalHours: z.number().min(1).max(48).default(24),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    phoneType: z.enum(["mobile", "landline"]).optional(),
    relationship: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  features: z.object({
    featureWellbeingAi: z.boolean().default(true),
    featureShakeToAlert: z.boolean().default(true),
    featureMoodTracking: z.boolean().default(true),
    featurePetProtection: z.boolean().default(true),
    featureDigitalWill: z.boolean().default(true),
  }).optional(),
});

export type InsertOrganizationClient = z.infer<typeof insertOrganizationClientSchema>;
export type OrganizationClient = typeof organizationClients.$inferSelect;

// Schema for updating client feature settings
export const updateClientFeaturesSchema = z.object({
  featureWellbeingAi: z.boolean().optional(),
  featureShakeToAlert: z.boolean().optional(),
  featureMoodTracking: z.boolean().optional(),
  featurePetProtection: z.boolean().optional(),
  featureDigitalWill: z.boolean().optional(),
});
export type UpdateClientFeatures = z.infer<typeof updateClientFeaturesSchema>;

// Type for client feature settings
export type ClientFeatureSettings = {
  featureWellbeingAi: boolean;
  featureShakeToAlert: boolean;
  featureMoodTracking: boolean;
  featurePetProtection: boolean;
  featureDigitalWill: boolean;
};

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

// Pending client contacts table (contacts added by org before client registers)
export const pendingClientContacts = pgTable("pending_client_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationClientId: varchar("organization_client_id").notNull().references(() => organizationClients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  phoneType: text("phone_type").$type<PhoneType>(),
  relationship: text("relationship"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PendingClientContact = typeof pendingClientContacts.$inferSelect;

// Organization client with user details (for dashboard display)
export interface OrganizationClientWithDetails {
  id: string;
  clientId: string | null;
  nickname: string | null;
  clientOrdinal: number;
  clientStatus: OrgClientStatus;
  registrationStatus?: OrgClientRegistrationStatus;
  referenceCode?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  alertsEnabled?: boolean;
  hasActiveEmergency?: boolean;
  emergencyAlertActivatedAt?: string | null;
  emergencyAlertLatitude?: string | null;
  emergencyAlertLongitude?: string | null;
  emergencyAlertWhat3Words?: string | null;
  scheduleStartTime?: Date | null;
  checkInIntervalHours?: number | null;
  addedAt: Date;
  emergencyContacts: OrgClientEmergencyContact[];
  client: {
    id: string;
    name: string;
    email: string;
    mobileNumber: string | null;
  } | null;
  profile: OrganizationClientProfile | null;
  status: StatusData;
  lastAlert: AlertLog | null;
  alertCounts: {
    total: number;
    emails: number;
    calls: number;
    emergencies: number;
  };
  features: {
    featureWellbeingAi: boolean;
    featureMoodTracking: boolean;
    featurePetProtection: boolean;
    featureDigitalWill: boolean;
  };
}

// Admin view of organization client (GDPR-compliant - only reference code, no personal details)
export interface AdminOrganizationClientView {
  id: string;
  clientOrdinal: number;
  referenceCode: string;
  clientStatus: OrgClientStatus;
  registrationStatus: OrgClientRegistrationStatus;
  isActivated: boolean;
  hasActiveAlert: boolean;
  activeAlertId: string | null;
  alertActivatedAt: string | null;
  alertLatitude: string | null;
  alertLongitude: string | null;
  alertWhat3Words: string | null;
  addedAt: Date;
  bundleId: string | null;
  clientPhone: string | null;
  featureWellbeingAi?: boolean;
  featureShakeToAlert?: boolean;
  featureMoodTracking?: boolean;
  featurePetProtection?: boolean;
  featureDigitalWill?: boolean;
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
  clientsAwaitingActivation: number;
  totalEmergencyAlerts: number;
  bundles: OrganizationBundle[];
}

// ==================== WELLNESS/MOOD TRACKING ====================

// Mood options
export const moodOptions = ["great", "good", "okay", "low", "bad"] as const;
export type MoodOption = typeof moodOptions[number];

// Mood entries table
export const moodEntries = pgTable("mood_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkInId: varchar("check_in_id").references(() => checkIns.id, { onDelete: "set null" }),
  mood: text("mood").notNull().$type<MoodOption>(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  mood: z.enum(moodOptions),
  note: z.string().max(500).optional(),
  checkInId: z.string().optional(),
});

export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;

// ==================== PET PROTECTION ====================

// Pet types
export const petTypes = ["dog", "cat", "bird", "fish", "rabbit", "hamster", "reptile", "other"] as const;
export type PetType = typeof petTypes[number];

// Pets table
export const pets = pgTable("pets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<PetType>(),
  breed: text("breed"),
  age: text("age"),
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  feedingInstructions: text("feeding_instructions"),
  vetName: text("vet_name"),
  vetPhone: text("vet_phone"),
  vetAddress: text("vet_address"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPetSchema = createInsertSchema(pets).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(petTypes),
  name: z.string().min(1, "Pet name is required"),
});

export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof pets.$inferSelect;

export const updatePetSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(petTypes).optional(),
  breed: z.string().optional(),
  age: z.string().optional(),
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  feedingInstructions: z.string().optional(),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  vetAddress: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export type UpdatePet = z.infer<typeof updatePetSchema>;

// ==================== DIGITAL WILL STORAGE ====================

// Document types
export const documentTypes = ["will", "power_of_attorney", "healthcare_directive", "insurance", "account_info", "letter", "other"] as const;
export type DocumentType = typeof documentTypes[number];

// Digital documents table
export const digitalDocuments = pgTable("digital_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().$type<DocumentType>(),
  description: text("description"),
  // Content stored as encrypted text or file reference
  content: text("content"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  // Executors who should receive this document
  executorContactIds: text("executor_contact_ids").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDigitalDocumentSchema = createInsertSchema(digitalDocuments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(documentTypes),
  title: z.string().min(1, "Document title is required"),
  executorContactIds: z.array(z.string()).optional(),
});

export type InsertDigitalDocument = z.infer<typeof insertDigitalDocumentSchema>;
export type DigitalDocument = typeof digitalDocuments.$inferSelect;

export const updateDigitalDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(documentTypes).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  executorContactIds: z.array(z.string()).optional(),
});

export type UpdateDigitalDocument = z.infer<typeof updateDigitalDocumentSchema>;

// ==================== SAFEGUARDING & INCIDENT REPORTING ====================

// Incident types
export const incidentTypes = [
  "abuse", 
  "neglect", 
  "self_harm_risk", 
  "medical_issue", 
  "harassment", 
  "lone_worker_danger", 
  "missing_person_concern",
  "other"
] as const;
export type IncidentType = typeof incidentTypes[number];

// Severity levels
export const severityLevels = ["low", "medium", "high", "immediate_danger"] as const;
export type SeverityLevel = typeof severityLevels[number];

// Case status
export const caseStatuses = ["open", "monitoring", "closed"] as const;
export type CaseStatus = typeof caseStatuses[number];

// Risk levels
export const riskLevels = ["green", "amber", "red"] as const;
export type RiskLevel = typeof riskLevels[number];

// Incidents table - for incident reporting
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => organizationClients.id, { onDelete: "set null" }),
  reportedById: varchar("reported_by_id"), // Staff member who reported
  reportedByName: text("reported_by_name"), // Name for anonymous reports
  incidentType: text("incident_type").notNull().$type<IncidentType>(),
  severity: text("severity").notNull().$type<SeverityLevel>(),
  description: text("description").notNull(),
  location: text("location"), // GPS or what3words
  locationLat: text("location_lat"),
  locationLng: text("location_lng"),
  what3words: text("what3words"),
  attachments: jsonb("attachments").$type<{ type: string; url: string; name: string }[]>(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status").notNull().default("open").$type<CaseStatus>(),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  resolvedById: true,
}).extend({
  incidentType: z.enum(incidentTypes),
  severity: z.enum(severityLevels),
  description: z.string().min(1, "Description is required"),
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// Welfare concerns table - for third-party concerns
export const welfareConcerns = pgTable("welfare_concerns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => organizationClients.id, { onDelete: "set null" }),
  reportedById: varchar("reported_by_id"),
  reportedByName: text("reported_by_name"),
  concernType: text("concern_type").notNull(), // "welfare_concern", "pattern_based", "gut_instinct"
  description: text("description").notNull(),
  observedBehaviours: text("observed_behaviours"), // withdrawal, behaviour change, etc.
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status").notNull().default("open").$type<CaseStatus>(),
  followUpNotes: text("follow_up_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWelfareConcernSchema = createInsertSchema(welfareConcerns).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  resolvedById: true,
}).extend({
  description: z.string().min(1, "Description is required"),
});

export type InsertWelfareConcern = z.infer<typeof insertWelfareConcernSchema>;
export type WelfareConcern = typeof welfareConcerns.$inferSelect;

// Case files table - comprehensive safeguarding record per individual
export const caseFiles = pgTable("case_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => organizationClients.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("open").$type<CaseStatus>(),
  riskLevel: text("risk_level").notNull().default("green").$type<RiskLevel>(),
  safeguardingLeadId: varchar("safeguarding_lead_id"),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  closedById: varchar("closed_by_id"),
  closureReason: text("closure_reason"),
});

export type CaseFile = typeof caseFiles.$inferSelect;

// Case notes table - notes attached to case files
export const caseNotes = pgTable("case_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseFileId: varchar("case_file_id").notNull().references(() => caseFiles.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  isConfidential: boolean("is_confidential").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({
  id: true,
  caseFileId: true,
  authorId: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "Note content is required"),
  authorName: z.string().min(1, "Author name is required"),
});

export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;
export type CaseNote = typeof caseNotes.$inferSelect;

// Escalation rules table - automatic escalation thresholds
export const escalationRules = pgTable("escalation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // "missed_checkins", "high_risk_incident", "repeat_incidents"
  threshold: integer("threshold").notNull(), // e.g., 3 missed check-ins
  timeWindowHours: integer("time_window_hours"), // within X hours
  action: text("action").notNull(), // "notify_safeguarding_lead", "escalate_management", "auto_alert"
  notifyEmails: text("notify_emails").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEscalationRuleSchema = createInsertSchema(escalationRules).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Rule name is required"),
  threshold: z.number().min(1),
});

export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;
export type EscalationRule = typeof escalationRules.$inferSelect;

// Missed check-in escalations table - tracks escalation timeline
export const missedCheckInEscalations = pgTable("missed_checkin_escalations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => organizationClients.id, { onDelete: "cascade" }),
  checkInId: varchar("check_in_id"),
  missedAt: timestamp("missed_at").notNull(),
  escalationSteps: jsonb("escalation_steps").$type<{ step: string; timestamp: string; notified: string[]; status: string }[]>(),
  status: text("status").notNull().default("pending"), // "pending", "acknowledged", "resolved"
  acknowledgedById: varchar("acknowledged_by_id"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MissedCheckInEscalation = typeof missedCheckInEscalations.$inferSelect;

// Audit trail table - immutable log of all actions
export const auditTrail = pgTable("audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  userEmail: text("user_email"),
  userRole: text("user_role"),
  action: text("action").notNull(), // "create", "read", "update", "delete", "export"
  entityType: text("entity_type").notNull(), // "incident", "welfare_concern", "case_file", "escalation_rule"
  entityId: varchar("entity_id"),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditTrailEntry = typeof auditTrail.$inferSelect;

// Risk reports table - automated pattern detection
export const riskReports = pgTable("risk_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => organizationClients.id, { onDelete: "set null" }),
  reportType: text("report_type").notNull(), // "missed_checkins", "increased_alerts", "inactivity", "repeat_incidents"
  riskLevel: text("risk_level").notNull().$type<RiskLevel>(),
  summary: text("summary").notNull(),
  dataPoints: jsonb("data_points"), // evidence used to generate the report
  recommendation: text("recommendation"), // "review", "contact", "escalate"
  reviewedById: varchar("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RiskReport = typeof riskReports.$inferSelect;

// Staff invite statuses
export const staffInviteStatuses = ["pending", "accepted", "revoked"] as const;
export type StaffInviteStatus = typeof staffInviteStatuses[number];

export const organizationStaffInvites = pgTable("organization_staff_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bundleId: varchar("bundle_id").notNull().references(() => organizationBundles.id, { onDelete: "cascade" }),
  staffName: text("staff_name").notNull(),
  staffPhone: text("staff_phone").notNull(),
  staffEmail: text("staff_email"),
  inviteCode: varchar("invite_code", { length: 10 }).notNull().unique(),
  status: text("status").notNull().$type<StaffInviteStatus>().default("pending"),
  acceptedByUserId: varchar("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStaffInviteSchema = createInsertSchema(organizationStaffInvites).omit({
  id: true,
  inviteCode: true,
  status: true,
  acceptedByUserId: true,
  acceptedAt: true,
  createdAt: true,
});

export type InsertStaffInvite = z.infer<typeof insertStaffInviteSchema>;
export type OrganizationStaffInvite = typeof organizationStaffInvites.$inferSelect;

export const smsCheckinTokens = pgTable("sms_checkin_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 32 }).notNull().unique(),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SmsCheckinToken = typeof smsCheckinTokens.$inferSelect;

// Re-export chat models for AI integrations (used by integration storage)
export * from "./models/chat";
