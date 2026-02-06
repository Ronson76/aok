import { storage } from "./storage";
import { sendEmergencyAlert, sendVoiceAlerts, sendPushNotification, sendContactConfirmationReminder, sendSmsCheckinLink } from "./notifications";

let schedulerInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;
let pushNotificationInterval: NodeJS.Timeout | null = null;
let contactReminderInterval: NodeJS.Timeout | null = null;
let smsCheckinInterval: NodeJS.Timeout | null = null;

// Minimum interval between push notifications to same user (30 seconds)
const PUSH_NOTIFICATION_COOLDOWN_MS = 30 * 1000;

// Track which users have been sent SMS check-in links this overdue cycle
const smsCheckinSentCache = new Map<string, number>();
const SMS_CHECKIN_COOLDOWN_MS = 30 * 60 * 1000;

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

// Send SMS check-in links to overdue users who are likely offline
async function processOverdueSmsCheckins(): Promise<void> {
  try {
    const overdueUsers = await storage.getOverdueUsersForSmsCheckin();

    if (overdueUsers.length === 0) return;

    const now = Date.now();

    for (const user of overdueUsers) {
      const lastSent = smsCheckinSentCache.get(user.userId);
      if (lastSent && now - lastSent < SMS_CHECKIN_COOLDOWN_MS) {
        continue;
      }

      try {
        const tokenData = await storage.createSmsCheckinToken(user.userId);

        const result = await sendSmsCheckinLink(
          user.mobileNumber,
          user.userName,
          tokenData.token
        );

        if (result.success) {
          smsCheckinSentCache.set(user.userId, now);
          console.log(`[SMS CHECK-IN] Sent check-in link to ${user.userName} (${user.mobileNumber})`);
        } else {
          console.error(`[SMS CHECK-IN] Failed to send to ${user.userName}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[SMS CHECK-IN] Error processing user ${user.userName}:`, error);
      }
    }

    // Clean up cache entries for users who are no longer overdue
    const overdueIds = new Set(overdueUsers.map(u => u.userId));
    Array.from(smsCheckinSentCache.keys()).forEach(userId => {
      if (!overdueIds.has(userId)) {
        smsCheckinSentCache.delete(userId);
      }
    });
  } catch (error) {
    console.error('[SMS CHECK-IN] Error processing overdue SMS check-ins:', error);
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

        const contacts = await storage.getContacts(alert.userId);
        if (contacts.length === 0) {
          console.log(`[EMERGENCY SCHEDULER] No contacts for user ${alert.userId}, skipping`);
          continue;
        }

        // Get settings for additional info
        const settings = await storage.getSettings(alert.userId);

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
          settings?.additionalInfo
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

  // SMS check-in links every 2 minutes for overdue users who are offline
  smsCheckinInterval = setInterval(async () => {
    await processOverdueSmsCheckins();
  }, 2 * 60 * 1000);

  // Run cleanup daily (every 24 hours)
  cleanupInterval = setInterval(async () => {
    await cleanupOldLocationData();
  }, 24 * 60 * 60 * 1000);

  // Run initial checks
  processOverdueEmergencyAlerts();
  processOverduePushNotifications();
  cleanupOldLocationData();
  cleanupExpiredContacts();
  sendContactReminders();
  console.log('[SMS CHECK-IN] Starting SMS check-in scheduler (checks every 2 minutes, 30min cooldown per user)');
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
  console.log('[EMERGENCY SCHEDULER] Scheduler stopped');
}
