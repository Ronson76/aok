import type { Contact, User } from "@shared/schema";
import { Resend } from 'resend';

interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
  voiceCall: { sent: boolean; error?: string };
}

interface VoiceCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

let connectionSettings: any;

async function getResendCredentials() {
  // First try environment variable (user's own API key)
  const apiKey = process.env.RESEND_API_KEY2 || process.env.RESEND_API_KEY;
  if (apiKey) {
    return { 
      apiKey, 
      fromEmail: 'aok <onboarding@resend.dev>' 
    };
  }
  
  // Fallback to Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getResendCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'aok <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: body,
    });
    
    console.log(`[EMAIL] Successfully sent email to ${to}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send email to ${to}:`, error);
    throw error;
  }
}

async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const credentials = await getTwilioCredentials();
  
  if (!credentials) {
    console.log(`[SMS] Twilio not configured. Would send to ${to}: ${body.substring(0, 50)}...`);
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiKeySecret}`).toString('base64');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: credentials.phoneNumber,
          Body: body,
        }).toString(),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`[SMS] Successfully sent SMS to ${to}, SID: ${result.sid}`);
      return { success: true };
    } else {
      console.error(`[SMS] Failed to send to ${to}:`, result);
      return { success: false, error: result.message || 'SMS failed' };
    }
  } catch (error) {
    console.error(`[SMS] Error sending to ${to}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function sendContactAddedNotification(
  contact: Contact,
  user: User
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
    voiceCall: { sent: false },
  };

  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `${user.name} (Reference ID: ${user.referenceId})`
    : user.name;
  const contactName = contact.name;

  const emailSubject = `You've been added as an emergency contact on aok`;
  const emailBody = isOrganization 
    ? `Hi ${contactName},

${user.name} has added you as an emergency contact for a person they are monitoring on aok.

Reference ID: ${user.referenceId}

aok is a personal safety check-in app. If this person misses a check-in, you will be notified automatically.

You don't need to do anything right now - you'll only be contacted if they miss a scheduled check-in.

Thank you for your support.

- The aok Team`
    : `Hi ${contactName},

${user.name} has added you as their emergency contact on aok.

aok is a personal safety check-in app. If ${user.name} misses a check-in, you will be notified automatically.

This means ${user.name} trusts you to help ensure their safety. You don't need to do anything right now - you'll only be contacted if they miss a scheduled check-in.

Thank you for being there for ${user.name}.

- The aok Team`;

  const smsBody = isOrganization
    ? `Hi ${contactName}, you've been added as an emergency contact for Reference ${user.referenceId} on aok. You'll be notified if they miss a check-in.`
    : `Hi ${contactName}, ${user.name} has added you as their emergency contact on aok. You'll be notified if they miss a check-in.`;

  try {
    await sendEmail(contact.email, emailSubject, emailBody);
    result.email.sent = true;
    console.log(`[NOTIFICATION] Email sent to ${contact.email} for contact ${contactName}`);
  } catch (error) {
    result.email.error = error instanceof Error ? error.message : "Failed to send email";
    console.log(`[NOTIFICATION] Email failed for ${contact.email}: ${result.email.error}`);
  }

  if (contact.phone && contact.phoneType !== "landline") {
    const smsResult = await sendSMS(contact.phone, smsBody);
    result.sms.sent = smsResult.success;
    if (!smsResult.success) {
      result.sms.error = smsResult.error || "Failed to send SMS";
    }
  }

  return result;
}

export async function sendMissedCheckInAlert(
  contacts: Contact[],
  user: User
): Promise<{ emailsSent: number; emailsFailed: number }> {
  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `Reference ID: ${user.referenceId}` 
    : user.name;
  const subjectIdentifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : user.name;
  
  let emailsSent = 0;
  let emailsFailed = 0;
  
  for (const contact of contacts) {
    const emailSubject = `ALERT: ${subjectIdentifier} missed their aok check-in`;
    
    let locationInfo = "";
    if (user.addressLine1) {
      locationInfo = `
Registered address:
${user.addressLine1}
${user.addressLine2 ? user.addressLine2 + '\n' : ''}${user.city || ""}, ${user.postalCode || ""}
${user.country || ""}`;
    } else if (user.mobileNumber) {
      locationInfo = `
Mobile number: ${user.mobileNumber}`;
    }
    
    const emailBody = `Hi ${contact.name},

This is an automated alert from aok.

${identifier} has missed their scheduled check-in. This may indicate they need assistance.
${locationInfo}

Please try to reach out to ensure their safety.

- The aok Team`;

    try {
      await sendEmail(contact.email, emailSubject, emailBody);
      emailsSent++;
      console.log(`[ALERT] Email sent to ${contact.name} (${contact.email})`);
    } catch (error) {
      emailsFailed++;
      console.error(`[ALERT] Failed to send email to ${contact.email}:`, error);
    }
  }

  return { emailsSent, emailsFailed };
}

export async function sendSuccessfulCheckInNotification(
  primaryContact: Contact,
  user: User
): Promise<boolean> {
  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : user.name;
  
  const now = new Date();
  const checkInTime = now.toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });
  
  const subject = `aok: ${identifier} checked in successfully`;
  const body = `Hi ${primaryContact.name},

Good news! ${identifier} has completed their scheduled check-in on aok.

Check-in time: ${checkInTime}

This is an automated notification confirming their safety. No action is required from you.

- The aok Team`;

  try {
    await sendEmail(primaryContact.email, subject, body);
    console.log(`[CHECK-IN NOTIFICATION] Sent to primary contact ${primaryContact.name} (${primaryContact.email})`);
    return true;
  } catch (error) {
    console.error(`[CHECK-IN NOTIFICATION] Failed to send to ${primaryContact.email}:`, error);
    return false;
  }
}

export async function sendSchedulePreferencesNotification(
  primaryContacts: Contact[],
  user: User,
  scheduleTime: string,
  intervalHours: number
): Promise<{ emailsSent: number; emailsFailed: number }> {
  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : user.name;
  
  const scheduleDate = new Date(scheduleTime);
  const formattedTime = scheduleDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  const intervalDisplay = intervalHours === 1 ? "1 hour" : 
    intervalHours < 24 ? `${intervalHours} hours` :
    intervalHours === 24 ? "24 hours (daily)" :
    intervalHours === 48 ? "48 hours (every 2 days)" :
    `${intervalHours} hours`;

  let emailsSent = 0;
  let emailsFailed = 0;

  for (const contact of primaryContacts) {
    const subject = `aok: Check-in schedule set for ${identifier}`;
    const body = `Hi ${contact.name},

${identifier} has set up their check-in schedule on aok.

Schedule Details:
- Check-in starts at: ${formattedTime}
- Check-in interval: Every ${intervalDisplay}

As a primary contact, you will be notified:
- When ${identifier} successfully checks in
- If ${identifier} misses a scheduled check-in

This is an automated notification. No action is required from you.

- The aok Team`;

    try {
      await sendEmail(contact.email, subject, body);
      emailsSent++;
      console.log(`[SCHEDULE NOTIFICATION] Sent to ${contact.name} (${contact.email})`);
    } catch (error) {
      emailsFailed++;
      console.error(`[SCHEDULE NOTIFICATION] Failed to send to ${contact.email}:`, error);
    }
  }

  return { emailsSent, emailsFailed };
}

export async function sendEmergencyAlert(
  contacts: Contact[],
  user: User,
  gpsLocation?: { latitude: number; longitude: number }
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number }> {
  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `Reference ID: ${user.referenceId}` 
    : user.name;
  const subjectIdentifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : user.name;
  
  let emailsSent = 0;
  let emailsFailed = 0;
  let smsSent = 0;
  let smsFailed = 0;
  
  for (const contact of contacts) {
    const emailSubject = `EMERGENCY ALERT: ${subjectIdentifier} needs help!`;
    
    let locationInfo = "";
    let smsLocationInfo = "";
    
    if (gpsLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`;
      locationInfo = `
CURRENT GPS LOCATION:
Coordinates: ${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}
View on map: ${mapsUrl}
`;
      smsLocationInfo = `Location: ${mapsUrl}`;
    }
    
    if (user.addressLine1) {
      locationInfo += `
Registered address:
${user.addressLine1}
${user.addressLine2 ? user.addressLine2 + '\n' : ''}${user.city || ""}, ${user.postalCode || ""}
${user.country || ""}`;
    }
    
    if (user.mobileNumber) {
      locationInfo += `
Mobile number: ${user.mobileNumber}`;
    }
    
    const now = new Date();
    const alertTime = now.toLocaleString('en-US', { 
      dateStyle: 'full', 
      timeStyle: 'long' 
    });
    
    const emailBody = `URGENT - EMERGENCY ALERT

Hi ${contact.name},

${identifier} has triggered an EMERGENCY ALERT on aok at ${alertTime}.

This is NOT a routine missed check-in. They have manually pressed the emergency button indicating they need immediate assistance.
${locationInfo}

PLEASE CONTACT THEM IMMEDIATELY.

If you cannot reach them, consider contacting local emergency services.

- The aok Team`;

    try {
      await sendEmail(contact.email, emailSubject, emailBody);
      emailsSent++;
      console.log(`[EMERGENCY ALERT] Email sent to ${contact.name} (${contact.email})`);
    } catch (error) {
      emailsFailed++;
      console.error(`[EMERGENCY ALERT] Failed to send email to ${contact.email}:`, error);
    }

    if (contact.phone) {
      const smsBody = `EMERGENCY ALERT from aok: ${identifier} needs immediate help! ${smsLocationInfo} ${user.mobileNumber ? `Call them: ${user.mobileNumber}` : "Contact them immediately."}`;
      
      const smsResult = await sendSMS(contact.phone, smsBody);
      if (smsResult.success) {
        smsSent++;
        console.log(`[EMERGENCY ALERT] SMS sent to ${contact.name} (${contact.phone})`);
      } else {
        smsFailed++;
        console.error(`[EMERGENCY ALERT] Failed to send SMS to ${contact.phone}:`, smsResult.error);
      }
    }
  }

  return { emailsSent, emailsFailed, smsSent, smsFailed };
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string
): Promise<boolean> {
  const subject = "Reset your aok password";
  const body = `Hi ${userName},

You requested to reset your aok password. Click the link below to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

- The aok Team`;

  try {
    await sendEmail(email, subject, body);
    console.log(`[PASSWORD RESET] Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[PASSWORD RESET] Failed to send email to ${email}:`, error);
    return false;
  }
}

// =====================================================
// TWILIO VOICE CALLING FOR LANDLINE EMERGENCY ALERTS
// =====================================================

interface TwilioCredentials {
  accountSid: string;
  apiKey: string;
  apiKeySecret: string;
  phoneNumber: string;
}

async function getTwilioCredentials(): Promise<TwilioCredentials | null> {
  // Check for environment variables (legacy support)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && phoneNumber) {
    // Legacy auth token mode - use as API key
    return { accountSid, apiKey: accountSid, apiKeySecret: authToken, phoneNumber };
  }

  // Try Replit connector (uses API Key authentication)
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      return null;
    }

    const response = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=twilio`,
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const twilioSettings = data.items?.[0]?.settings;

    if (twilioSettings?.account_sid && twilioSettings?.api_key && twilioSettings?.api_key_secret && twilioSettings?.phone_number) {
      return {
        accountSid: twilioSettings.account_sid,
        apiKey: twilioSettings.api_key,
        apiKeySecret: twilioSettings.api_key_secret,
        phoneNumber: twilioSettings.phone_number
      };
    }
  } catch (error) {
    console.log('[TWILIO] Failed to get credentials from connector:', error);
  }

  return null;
}

/**
 * Make an automated voice call to a landline with a text-to-speech message
 */
export async function makeVoiceCall(
  phoneNumber: string,
  message: string
): Promise<VoiceCallResult> {
  const credentials = await getTwilioCredentials();

  if (!credentials) {
    console.log('[VOICE CALL] Twilio not configured - skipping voice call');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Create TwiML for text-to-speech
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="alice" language="en-GB">${escapeXml(message)}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-GB">${escapeXml(message)}</Say>
  <Pause length="2"/>
</Response>`;

    // Make API call to Twilio using API key authentication
    const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiKeySecret}`).toString('base64');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: credentials.phoneNumber,
          Twiml: twiml,
        }).toString(),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`[VOICE CALL] Successfully initiated call to ${phoneNumber}, SID: ${result.sid}`);
      return { success: true, callSid: result.sid };
    } else {
      console.error(`[VOICE CALL] Failed to call ${phoneNumber}:`, result);
      return { success: false, error: result.message || 'Call failed' };
    }
  } catch (error) {
    console.error(`[VOICE CALL] Error calling ${phoneNumber}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Make emergency voice calls to all landline contacts
 */
export async function sendVoiceAlerts(
  contacts: Contact[],
  user: User,
  alertType: 'missed_checkin' | 'emergency'
): Promise<{ callsMade: number; callsFailed: number }> {
  // For emergencies, call ALL contacts with phone numbers
  // For missed check-ins, only call landline contacts
  const contactsToCall = alertType === 'emergency' 
    ? contacts.filter(c => c.phone)
    : contacts.filter(c => c.phone && c.phoneType === 'landline');
  
  if (contactsToCall.length === 0) {
    console.log(`[VOICE ALERT] No contacts to call for ${alertType}`);
    return { callsMade: 0, callsFailed: 0 };
  }

  const credentials = await getTwilioCredentials();
  if (!credentials) {
    console.log('[VOICE ALERT] Twilio not configured - skipping voice calls');
    return { callsMade: 0, callsFailed: 0 };
  }

  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : user.name;

  const message = alertType === 'emergency'
    ? `This is an urgent emergency alert from A O K. ${identifier} has triggered an emergency alert and needs immediate assistance. Please try to contact them immediately. If you cannot reach them, consider contacting emergency services.`
    : `This is an alert from A O K. ${identifier} has missed their scheduled safety check-in. Please try to reach out to ensure their safety.`;

  let callsMade = 0;
  let callsFailed = 0;

  for (const contact of contactsToCall) {
    if (!contact.phone) continue;
    
    const result = await makeVoiceCall(contact.phone, message);
    if (result.success) {
      callsMade++;
      console.log(`[VOICE ALERT] Call initiated to ${contact.name} at ${contact.phone}`);
    } else {
      callsFailed++;
      console.error(`[VOICE ALERT] Failed to call ${contact.name} at ${contact.phone}: ${result.error}`);
    }
  }

  return { callsMade, callsFailed };
}

export async function sendLogoutNotification(
  primaryContact: Contact,
  user: User,
  location?: { latitude: number; longitude: number }
): Promise<{ sent: boolean; error?: string }> {
  const result = { sent: false, error: undefined as string | undefined };

  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `${user.name} (Reference ID: ${user.referenceId})`
    : user.name;

  const subject = `aok Alert: ${identifier} has signed out`;
  
  // Include location information if available
  const locationSection = location 
    ? `

LAST KNOWN LOCATION:
Google Maps: https://www.google.com/maps?q=${location.latitude},${location.longitude}
Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
`
    : "";
  
  const body = `Hello ${primaryContact.name},

This is an automated notification from aok.

${identifier} has signed out of their aok safety check-in account.
${locationSection}
IMPORTANT: While they are signed out, you will NOT receive any alerts if they miss a check-in or trigger an emergency.

This means their safety check-ins are currently paused and no notifications will be sent to you or any other emergency contacts.

If you are concerned about ${isOrganization ? "this user's" : `${user.name}'s`} wellbeing, please reach out to them directly.

---
This notification was sent because you are listed as their primary emergency contact.
aok - Personal Safety Check-In`;

  try {
    await sendEmail(primaryContact.email, subject, body);
    result.sent = true;
    console.log(`[LOGOUT NOTIFICATION] Sent to primary contact ${primaryContact.name} (${primaryContact.email})`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    console.error(`[LOGOUT NOTIFICATION] Failed to send to ${primaryContact.email}:`, error);
  }

  return result;
}

// Send push notification to user's subscribed devices
export async function sendPushNotification(
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: { title: string; body: string; tag?: string; url?: string; requireInteraction?: boolean }
): Promise<{ sent: number; failed: number }> {
  const webpush = await import('web-push');
  
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[PUSH] VAPID keys not configured');
    return { sent: 0, failed: subscriptions.length };
  }
  
  webpush.setVapidDetails(
    'mailto:support@aok.app',
    vapidPublicKey,
    vapidPrivateKey
  );
  
  let sent = 0;
  let failed = 0;
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      sent++;
      console.log(`[PUSH] Notification sent to ${sub.endpoint.substring(0, 50)}...`);
    } catch (error: any) {
      failed++;
      console.error(`[PUSH] Failed to send notification:`, error.message);
    }
  }
  
  return { sent, failed };
}
