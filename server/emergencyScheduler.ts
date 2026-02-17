import { storage } from "./storage";
import { sendEmergencyAlert, sendVoiceAlerts, sendPushNotification, sendContactConfirmationReminder, sendSmsCheckinLink, sendActivityOverdueAlert, sendActivityVoiceAlerts, sendLoneWorkerMissedCheckInAlert } from "./notifications";
import { ObjectStorageService } from "./replit_integrations/object_storage";

let schedulerInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;
let pushNotificationInterval: NodeJS.Timeout | null = null;
let contactReminderInterval: NodeJS.Timeout | null = null;
let recordingCleanupInterval: NodeJS.Timeout | null = null;
let errandCheckInterval: NodeJS.Timeout | null = null;
let auditRetentionInterval: NodeJS.Timeout | null = null;
let loneWorkerCheckInterval: NodeJS.Timeout | null = null;
// Minimum interval between push notifications to same user (30 seconds)
const PUSH_NOTIFICATION_COOLDOWN_MS = 30 * 1000;


// Send push notifications to overdue users
async function processOverduePushNotifications(): Promise<void> {
  try {
    const overdueUsers = await storage.getOverdueUsersWithPushSubscriptions();
    
    if (overdueUsers.length === 0) {
      return;
    }

    const now = Date.now();

    for (const user of overdueUsers) {
      // Check cooldown - only send if enough time has passed since last push
      if (user.lastPushSentAt) {
        const timeSinceLastPush = now - user.lastPushSentAt.getTime();
        if (timeSinceLastPush < PUSH_NOTIFICATION_COOLDOWN_MS) {
          continue;
        }
      }

      try {
        const overdueMinutes = Math.floor((now - user.nextCheckInDue.getTime()) / 60000);
        const overdueText = overdueMinutes < 60 
          ? `${overdueMinutes} minute${overdueMinutes !== 1 ? 's' : ''}`
          : `${Math.floor(overdueMinutes / 60)} hour${Math.floor(overdueMinutes / 60) !== 1 ? 's' : ''}`;

        const result = await sendPushNotification(user.subscriptions, {
          title: "Check-in Overdue!",
          body: `You're ${overdueText} overdue. Tap to check in now.`,
          tag: "overdue-checkin",
          url: "/",
          requireInteraction: true,
        });

        if (result.sent > 0) {
          await storage.updateLastPushSentAt(user.userId);
          console.log(`[PUSH SCHEDULER] Sent overdue notification to ${user.userName}: ${result.sent} device(s)`);
        }
      } catch (error) {
        console.error(`[PUSH SCHEDULER] Failed to send push to ${user.userName}:`, error);
      }
    }
  } catch (error) {
    console.error('[PUSH SCHEDULER] Error processing overdue push notifications:', error);
  }
}

let smsCheckinInterval: NodeJS.Timeout | null = null;
const SMS_CHECKIN_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes

async function processSmsCheckinReminders(): Promise<void> {
  try {
    const overdueUsers = await storage.getOverdueUsersForSmsCheckin();

    if (overdueUsers.length === 0) {
      return;
    }

    for (const user of overdueUsers) {
      // Only send one SMS per check-in cycle:
      // Compare the exact due timestamp — if we already notified for this due time, skip
      if (user.lastSmsNotifiedDueAt && user.lastSmsNotifiedDueAt.getTime() === user.nextCheckInDue.getTime()) {
        continue;
      }

      try {
        const tokenRecord = await storage.createSmsCheckinToken(user.userId);

        const result = await sendSmsCheckinLink(
          user.mobileNumber,
          user.userName,
          tokenRecord.token
        );

        if (result.success) {
          console.log(`[SMS CHECK-IN] Sent check-in link to ${user.userName} (${user.mobileNumber})`);
        } else {
          console.error(`[SMS CHECK-IN] Failed to send to ${user.userName}: ${result.error}`);
        }
        // Mark as sent for this cycle regardless of success/failure
        // to prevent repeated attempts to invalid numbers
        await storage.updateLastSmsSentAt(user.userId, user.nextCheckInDue);
      } catch (error) {
        console.error(`[SMS CHECK-IN] Error processing ${user.userName}:`, error);
      }
    }
  } catch (error) {
    console.error('[SMS CHECK-IN] Error processing SMS check-in reminders:', error);
  }
}

// Cleanup old emergency alerts (location data privacy - runs daily)
async function cleanupOldLocationData(): Promise<void> {
  try {
    const deletedAlertLogs = await storage.cleanupOldAlerts();
    const deletedEmergencyAlerts = await storage.cleanupOldEmergencyAlerts();
    
    if (deletedAlertLogs > 0 || deletedEmergencyAlerts > 0) {
      console.log(`[CLEANUP] Deleted ${deletedAlertLogs} old alert logs and ${deletedEmergencyAlerts} old emergency alerts (30+ days old)`);
    }
  } catch (error) {
    console.error('[CLEANUP] Error cleaning up old data:', error);
  }
}

// Cleanup expired unconfirmed contacts (runs every minute)
async function cleanupExpiredContacts(): Promise<void> {
  try {
    const deletedContacts = await storage.cleanupExpiredUnconfirmedContacts();
    // Only log if contacts were deleted (reduce noise)
  } catch (error) {
    console.error('[CLEANUP] Error cleaning up expired contacts:', error);
  }
}

// Send SMS reminders to contacts that haven't confirmed and are within 1 hour of expiry
async function sendContactReminders(): Promise<void> {
  try {
    const contactsNeedingReminder = await storage.getContactsNeedingReminder();
    
    if (contactsNeedingReminder.length === 0) {
      return;
    }

    console.log(`[CONTACT REMINDER] Found ${contactsNeedingReminder.length} contacts needing confirmation reminder`);

    for (const contact of contactsNeedingReminder) {
      try {
        // Get the user who added this contact
        const user = await storage.getUserById(contact.userId);
        if (!user) {
          console.log(`[CONTACT REMINDER] User not found for contact ${contact.id}, skipping`);
          continue;
        }

        if (!contact.phone) {
          console.log(`[CONTACT REMINDER] No phone number for contact ${contact.name}, skipping`);
          continue;
        }

        if (!contact.email) {
          console.log(`[CONTACT REMINDER] No email for contact ${contact.name}, skipping`);
          continue;
        }

        // Direct user to check their email for the original confirmation link
        const result = await sendContactConfirmationReminder(
          contact.phone,
          contact.name,
          user.name,
          contact.email
        );

        if (result.success) {
          await storage.markContactReminderSent(contact.id);
          console.log(`[CONTACT REMINDER] Sent reminder to ${contact.name} (${contact.phone})`);
        } else {
          console.error(`[CONTACT REMINDER] Failed to send reminder to ${contact.name}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[CONTACT REMINDER] Error processing reminder for ${contact.name}:`, error);
      }
    }
  } catch (error) {
    console.error('[CONTACT REMINDER] Error sending contact reminders:', error);
  }
}

export async function processOverdueEmergencyAlerts(): Promise<void> {
  try {
    const overdueAlerts = await storage.getOverdueActiveAlerts();
    
    if (overdueAlerts.length === 0) {
      return;
    }

    console.log(`[EMERGENCY SCHEDULER] Found ${overdueAlerts.length} overdue alerts to process`);

    for (const alert of overdueAlerts) {
      try {
        const user = await storage.getUserById(alert.userId);
        if (!user) {
          console.log(`[EMERGENCY SCHEDULER] User not found for alert ${alert.id}, skipping`);
          continue;
        }

        const allContacts = await storage.getContacts(alert.userId);
        const contacts = allContacts.filter(c => !!c.confirmedAt);
        if (contacts.length === 0) {
          console.log(`[EMERGENCY SCHEDULER] No confirmed contacts for user ${alert.userId}, skipping`);
          continue;
        }

        // Get settings for additional info
        const settings = await storage.getSettings(alert.userId);

        // Enrich additionalInfo with org client emergency notes if applicable
        let enrichedAdditionalInfo = settings?.additionalInfo;
        if (user.accountType === "organization" && user.referenceId) {
          const { organizationStorage } = await import("./storage");
          const orgClients = await organizationStorage.getOrganizationClientsForUser(alert.userId);
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

        const location = alert.latitude && alert.longitude
          ? { latitude: parseFloat(alert.latitude), longitude: parseFloat(alert.longitude) }
          : undefined;

        console.log(`[EMERGENCY SCHEDULER] Sending location update for alert ${alert.id}`);

        // For 5-minute location updates: only send email and SMS (no phone calls)
        // Phone calls are only made on the initial emergency trigger
        const alertResult = await sendEmergencyAlert(
          contacts, 
          user, 
          location, 
          true,
          enrichedAdditionalInfo
        );

        await storage.updateEmergencyAlertDispatchTime(alert.id);

        const notificationSummary = [];
        if (alertResult.emailsSent > 0) {
          notificationSummary.push(`${alertResult.emailsSent} email(s)`);
        }
        if (alertResult.smsSent > 0) {
          notificationSummary.push(`${alertResult.smsSent} SMS(s)`);
        }

        await storage.createAlertLog(
          alert.userId,
          contacts.map(c => c.email),
          `EMERGENCY LOCATION UPDATE - ${notificationSummary.join(', ') || 'no contacts'} notified`
        );

        console.log(`[EMERGENCY SCHEDULER] Sent location update for alert ${alert.id}: ${notificationSummary.join(', ')}`);
      } catch (error) {
        console.error(`[EMERGENCY SCHEDULER] Failed to process alert ${alert.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[EMERGENCY SCHEDULER] Error processing overdue alerts:', error);
  }
}

export function startEmergencyScheduler(): void {
  if (schedulerInterval) {
    console.log('[EMERGENCY SCHEDULER] Scheduler already running');
    return;
  }

  console.log('[EMERGENCY SCHEDULER] Starting emergency alert scheduler (checks every minute)');
  console.log('[PUSH SCHEDULER] Starting push notification scheduler (checks every 30 seconds)');
  console.log('[CONTACT REMINDER] Starting contact reminder scheduler (checks every 5 minutes)');
  
  schedulerInterval = setInterval(async () => {
    await processOverdueEmergencyAlerts();
    await cleanupExpiredContacts();
  }, 60 * 1000);

  // Push notifications run more frequently (every 30 seconds) for timely alerts
  pushNotificationInterval = setInterval(async () => {
    await processOverduePushNotifications();
  }, 30 * 1000);

  // Contact reminders run every 5 minutes to catch contacts approaching expiry
  contactReminderInterval = setInterval(async () => {
    await sendContactReminders();
  }, 5 * 60 * 1000);

  // SMS check-in reminders: 10 mins after overdue, one SMS per check-in cycle
  console.log('[SMS CHECK-IN] Starting SMS check-in reminder scheduler (checks every 2 minutes)');
  smsCheckinInterval = setInterval(async () => {
    await processSmsCheckinReminders();
  }, SMS_CHECKIN_INTERVAL_MS);

  // Run cleanup daily (every 24 hours)
  cleanupInterval = setInterval(async () => {
    await cleanupOldLocationData();
  }, 24 * 60 * 60 * 1000);

  // Recording retention cleanup daily
  console.log('[RECORDING CLEANUP] Starting emergency recording retention scheduler (checks every 24 hours)');
  recordingCleanupInterval = setInterval(async () => {
    await cleanupExpiredRecordings();
  }, 24 * 60 * 60 * 1000);

  console.log('[ERRAND SCHEDULER] Starting errand session monitor (checks every 60 seconds)');
  errandCheckInterval = setInterval(async () => {
    await processOverdueErrandSessions();
  }, 60 * 1000);

  console.log('[AUDIT RETENTION] Starting audit retention cleanup scheduler (checks every 24 hours)');
  auditRetentionInterval = setInterval(async () => {
    await processAuditRetentionCleanup();
  }, 24 * 60 * 60 * 1000);

  console.log('[LW SCHEDULER] Starting lone worker check-in monitor (checks every 30 seconds)');
  loneWorkerCheckInterval = setInterval(async () => {
    await processOverdueLoneWorkerSessions();
  }, 30 * 1000);

  // Run initial checks
  processOverdueEmergencyAlerts();
  processOverduePushNotifications();
  cleanupOldLocationData();
  cleanupExpiredContacts();
  sendContactReminders();
  processSmsCheckinReminders();
  cleanupExpiredRecordings();
  processOverdueErrandSessions();
  processOverdueLoneWorkerSessions();
}

async function cleanupExpiredRecordings(): Promise<void> {
  try {
    const result = await storage.cleanupExpiredEmergencyRecordings();
    if (result.deleted > 0) {
      console.log(`[RECORDING CLEANUP] Cleaned up ${result.deleted} expired recording(s)`);
      if (result.objectPaths.length > 0) {
        try {
          const objService = new ObjectStorageService();
          for (const objectPath of result.objectPaths) {
            try {
              const objectFile = await objService.getObjectEntityFile(objectPath);
              await objectFile.delete();
              console.log(`[RECORDING CLEANUP] Deleted object: ${objectPath}`);
            } catch (objErr) {
              console.error(`[RECORDING CLEANUP] Failed to delete object ${objectPath}:`, objErr);
            }
          }
        } catch (svcErr) {
          console.error('[RECORDING CLEANUP] Failed to initialize object storage for cleanup:', svcErr);
        }
      }
    }
  } catch (error) {
    console.error('[RECORDING CLEANUP] Error cleaning up expired recordings:', error);
  }
}

async function processOverdueLoneWorkerSessions(): Promise<void> {
  try {
    const overdueSessions = await storage.getOverdueLoneWorkerSessions();
    for (const session of overdueSessions) {
      try {
        await storage.loneWorkerMarkCheckInDue(session.id);
        console.log(`[LW SCHEDULER] Session ${session.id} (${session.userId}) marked as check_in_due`);
      } catch (e) {
        console.error(`[LW SCHEDULER] Error marking session ${session.id} as check_in_due:`, e);
      }
    }

    const graceExpired = await storage.getGraceExpiredLoneWorkerSessions();
    for (const session of graceExpired) {
      try {
        await storage.loneWorkerMarkUnresponsive(session.id);
        console.log(`[LW SCHEDULER] Session ${session.id} marked as unresponsive — alerting supervisor`);

        const worker = await storage.getUserById(session.userId);
        if (!worker) {
          console.log(`[LW SCHEDULER] Worker not found for session ${session.id}, skipping alerts`);
          continue;
        }

        const org = await storage.getUserById(session.organizationId);
        const orgName = org?.name || 'Organisation';

        const { organizationStorage } = await import("./organizationStorage");
        const staffInvite = await organizationStorage.getStaffInviteByUserId(session.userId);

        const supervisorPhone = staffInvite?.supervisorPhone || org?.mobileNumber || null;
        const supervisorEmail = staffInvite?.supervisorEmail || org?.email || null;
        const supervisorName = staffInvite?.supervisorName || null;

        const jobLabel = session.jobType.replace(/_/g, ' ');
        const gpsLocation = session.lastLocationLat && session.lastLocationLng
          ? { latitude: parseFloat(session.lastLocationLat), longitude: parseFloat(session.lastLocationLng) }
          : null;

        const alertResult = await sendLoneWorkerMissedCheckInAlert(
          supervisorPhone,
          supervisorEmail,
          supervisorName,
          worker.name || staffInvite?.staffName || 'Lone Worker',
          jobLabel,
          orgName,
          gpsLocation,
        );

        await storage.createLoneWorkerEscalation(
          session.id,
          "monitoring_contact",
          "missed_checkin",
          [{ supervisorPhone, supervisorEmail, supervisorName }],
          session.lastLocationLat || undefined,
          session.lastLocationLng || undefined,
        );

        await storage.createAuditEntry(session.organizationId, {
          userId: session.userId,
          userEmail: worker.email,
          userRole: "staff",
          action: "missed_checkin_alert",
          entityType: "lone_worker_session",
          entityId: session.id,
          newData: {
            staffName: worker.name,
            jobType: session.jobType,
            emailsSent: alertResult.emailsSent,
            smsSent: alertResult.smsSent,
            callsMade: alertResult.callsMade,
          },
        });

        const notificationSummary = [];
        if (alertResult.emailsSent > 0) notificationSummary.push(`${alertResult.emailsSent} email(s)`);
        if (alertResult.smsSent > 0) notificationSummary.push(`${alertResult.smsSent} SMS(s)`);
        if (alertResult.callsMade > 0) notificationSummary.push(`${alertResult.callsMade} voice call(s)`);
        console.log(`[LW SCHEDULER] Supervisor alerted for session ${session.id}: ${notificationSummary.join(', ') || 'no contact info'}`);
      } catch (e) {
        console.error(`[LW SCHEDULER] Error processing grace-expired session ${session.id}:`, e);
      }
    }
  } catch (error) {
    console.error('[LW SCHEDULER] Error processing overdue lone worker sessions:', error);
  }
}

async function processAuditRetentionCleanup(): Promise<void> {
  try {
    const { getDb } = await import("./db");
    const { users } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const orgs = await db.select({ id: users.id, retentionPolicyDays: users.retentionPolicyDays })
      .from(users)
      .where(eq(users.accountType, "organization"));

    for (const org of orgs) {
      const retentionDays = org.retentionPolicyDays || 2190;
      const purged = await storage.purgeExpiredAuditEntries(org.id, retentionDays);
      if (purged > 0) {
        console.log(`[AUDIT RETENTION] Purged ${purged} expired audit entries for org ${org.id}`);
      }
    }
  } catch (error) {
    console.error('[AUDIT RETENTION] Error processing audit retention cleanup:', error);
  }
}

export function stopEmergencyScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  if (pushNotificationInterval) {
    clearInterval(pushNotificationInterval);
    pushNotificationInterval = null;
  }
  if (contactReminderInterval) {
    clearInterval(contactReminderInterval);
    contactReminderInterval = null;
  }
  if (smsCheckinInterval) {
    clearInterval(smsCheckinInterval);
    smsCheckinInterval = null;
  }
  if (recordingCleanupInterval) {
    clearInterval(recordingCleanupInterval);
    recordingCleanupInterval = null;
  }
  if (errandCheckInterval) {
    clearInterval(errandCheckInterval);
    errandCheckInterval = null;
  }
  if (auditRetentionInterval) {
    clearInterval(auditRetentionInterval);
    auditRetentionInterval = null;
  }
  if (loneWorkerCheckInterval) {
    clearInterval(loneWorkerCheckInterval);
    loneWorkerCheckInterval = null;
  }
  console.log('[EMERGENCY SCHEDULER] Scheduler stopped');
}

async function processOverdueErrandSessions(): Promise<void> {
  try {
    const overdueSessions = await storage.getOverdueErrandSessions();
    for (const session of overdueSessions) {
      try {
        await storage.updateErrandSessionStatus(session.id, "grace");
        console.log(`[ERRAND] Session ${session.id} moved to grace period`);
      } catch (e) {
        console.error(`[ERRAND] Error moving session ${session.id} to grace:`, e);
      }
    }

    const graceExpired = await storage.getGraceExpiredErrandSessions();
    for (const session of graceExpired) {
      try {
        const user = await storage.getUserById(session.userId);
        if (!user) continue;
        const contacts = await storage.getConfirmedContacts(session.userId);
        if (contacts.length === 0) {
          console.log(`[ERRAND] No confirmed contacts for user ${session.userId}, skipping alerts`);
          await storage.markErrandSessionNotified(session.id);
          continue;
        }

        const activityLabel = session.customLabel || session.activityType.replace(/_/g, ' ');
        const contactEmails = contacts.map(c => c.email);

        const location = session.lastKnownLat && session.lastKnownLng
          ? { latitude: parseFloat(session.lastKnownLat), longitude: parseFloat(session.lastKnownLng) }
          : undefined;

        const settings = await storage.getSettings(session.userId);

        // Enrich additionalInfo with org client emergency notes if applicable
        let activityAdditionalInfo = settings?.additionalInfo;
        if (user.accountType === "organization" && user.referenceId) {
          const { organizationStorage: orgStore } = await import("./storage");
          const orgClients = await orgStore.getOrganizationClientsForUser(session.userId);
          const orgClient = orgClients[0];
          if (orgClient?.emergencyNotes) {
            try {
              const parsed = activityAdditionalInfo ? JSON.parse(activityAdditionalInfo) : {};
              parsed.emergencyNotes = orgClient.emergencyNotes;
              activityAdditionalInfo = JSON.stringify(parsed);
            } catch {
              activityAdditionalInfo = JSON.stringify({ emergencyNotes: orgClient.emergencyNotes });
            }
          }
        }

        const alertResult = await sendActivityOverdueAlert(
          contacts,
          user,
          activityLabel,
          session.expectedDurationMins,
          location,
          activityAdditionalInfo
        );

        const voiceResult = await sendActivityVoiceAlerts(contacts, user, activityLabel);

        const notificationSummary = [];
        if (alertResult.emailsSent > 0) notificationSummary.push(`${alertResult.emailsSent} email(s)`);
        if (alertResult.smsSent > 0) notificationSummary.push(`${alertResult.smsSent} SMS(s)`);
        if (voiceResult.callsMade > 0) notificationSummary.push(`${voiceResult.callsMade} voice call(s)`);

        await storage.createAlertLog(
          session.userId,
          contactEmails,
          `ACTIVITY OVERDUE: ${activityLabel} - ${notificationSummary.join(', ') || 'no contacts'} notified`
        );

        const existingAlert = await storage.getActiveEmergencyAlert(session.userId);
        if (!existingAlert) {
          const activeAlert = await storage.createActiveEmergencyAlert(
            session.userId,
            session.lastKnownLat || null,
            session.lastKnownLng || null,
            null
          );
          await storage.linkErrandSessionToAlert(session.id, activeAlert.id);
          console.log(`[ERRAND] Created emergency alert ${activeAlert.id} for overdue session ${session.id} (5-min location updates active)`);
        } else {
          await storage.linkErrandSessionToAlert(session.id, existingAlert.id);
          console.log(`[ERRAND] Linked existing emergency alert ${existingAlert.id} to session ${session.id}`);
        }

        await storage.markErrandSessionNotified(session.id);
        console.log(`[ERRAND] Contacts notified for overdue session ${session.id}: ${notificationSummary.join(', ')}`);
      } catch (e) {
        console.error(`[ERRAND] Error processing grace-expired session ${session.id}:`, e);
      }
    }
  } catch (error) {
    console.error('[ERRAND] Error processing overdue errand sessions:', error);
  }
}
