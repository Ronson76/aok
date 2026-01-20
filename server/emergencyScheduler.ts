import { storage } from "./storage";
import { sendEmergencyAlert, sendVoiceAlerts } from "./notifications";

let schedulerInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

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

        const location = alert.latitude && alert.longitude
          ? { latitude: parseFloat(alert.latitude), longitude: parseFloat(alert.longitude) }
          : undefined;

        console.log(`[EMERGENCY SCHEDULER] Sending location update for alert ${alert.id}`);

        // For 5-minute location updates: only send email and SMS (no phone calls)
        // Phone calls are only made on the initial emergency trigger
        const alertResult = await sendEmergencyAlert(contacts, user, location, true);

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
  
  schedulerInterval = setInterval(async () => {
    await processOverdueEmergencyAlerts();
    await cleanupExpiredContacts();
  }, 60 * 1000);

  // Run cleanup daily (every 24 hours)
  cleanupInterval = setInterval(async () => {
    await cleanupOldLocationData();
  }, 24 * 60 * 60 * 1000);

  // Run initial checks
  processOverdueEmergencyAlerts();
  cleanupOldLocationData();
  cleanupExpiredContacts();
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
  console.log('[EMERGENCY SCHEDULER] Scheduler stopped');
}
