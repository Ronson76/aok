import type { Contact, User } from "@shared/schema";
import { Resend } from 'resend';

interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
}

let connectionSettings: any;

async function getResendCredentials() {
  // First try environment variable (user's own API key)
  const apiKey = process.env.RESEND_API_KEY2 || process.env.RESEND_API_KEY;
  if (apiKey) {
    return { 
      apiKey, 
      fromEmail: 'CheckMate <onboarding@resend.dev>' 
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
      from: fromEmail || 'CheckMate <onboarding@resend.dev>',
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

async function sendSMS(to: string, body: string): Promise<void> {
  console.log(`[SMS] SMS not configured. Would send to ${to}: ${body.substring(0, 50)}...`);
  throw new Error("SMS service not configured");
}

export async function sendContactAddedNotification(
  contact: Contact,
  user: User
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
  };

  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `${user.name} (Reference ID: ${user.referenceId})`
    : user.name;
  const contactName = contact.name;

  const emailSubject = `You've been added as an emergency contact on CheckMate`;
  const emailBody = isOrganization 
    ? `Hi ${contactName},

${user.name} has added you as an emergency contact for a person they are monitoring on CheckMate.

Reference ID: ${user.referenceId}

CheckMate is a personal safety check-in app. If this person misses a check-in, you will be notified automatically.

You don't need to do anything right now - you'll only be contacted if they miss a scheduled check-in.

Thank you for your support.

- The CheckMate Team`
    : `Hi ${contactName},

${user.name} has added you as their emergency contact on CheckMate.

CheckMate is a personal safety check-in app. If ${user.name} misses a check-in, you will be notified automatically.

This means ${user.name} trusts you to help ensure their safety. You don't need to do anything right now - you'll only be contacted if they miss a scheduled check-in.

Thank you for being there for ${user.name}.

- The CheckMate Team`;

  const smsBody = isOrganization
    ? `Hi ${contactName}, you've been added as an emergency contact for Reference ${user.referenceId} on CheckMate. You'll be notified if they miss a check-in.`
    : `Hi ${contactName}, ${user.name} has added you as their emergency contact on CheckMate. You'll be notified if they miss a check-in.`;

  try {
    await sendEmail(contact.email, emailSubject, emailBody);
    result.email.sent = true;
    console.log(`[NOTIFICATION] Email sent to ${contact.email} for contact ${contactName}`);
  } catch (error) {
    result.email.error = error instanceof Error ? error.message : "Failed to send email";
    console.log(`[NOTIFICATION] Email failed for ${contact.email}: ${result.email.error}`);
  }

  if (contact.phone) {
    try {
      await sendSMS(contact.phone, smsBody);
      result.sms.sent = true;
    } catch (error) {
      result.sms.error = error instanceof Error ? error.message : "Failed to send SMS";
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
    const emailSubject = `ALERT: ${subjectIdentifier} missed their CheckMate check-in`;
    
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

This is an automated alert from CheckMate.

${identifier} has missed their scheduled check-in. This may indicate they need assistance.
${locationInfo}

Please try to reach out to ensure their safety.

- The CheckMate Team`;

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
  
  const subject = `CheckMate: ${identifier} checked in successfully`;
  const body = `Hi ${primaryContact.name},

Good news! ${identifier} has completed their scheduled check-in on CheckMate.

Check-in time: ${checkInTime}

This is an automated notification confirming their safety. No action is required from you.

- The CheckMate Team`;

  try {
    await sendEmail(primaryContact.email, subject, body);
    console.log(`[CHECK-IN NOTIFICATION] Sent to primary contact ${primaryContact.name} (${primaryContact.email})`);
    return true;
  } catch (error) {
    console.error(`[CHECK-IN NOTIFICATION] Failed to send to ${primaryContact.email}:`, error);
    return false;
  }
}

export async function sendEmergencyAlert(
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
    const emailSubject = `EMERGENCY ALERT: ${subjectIdentifier} needs help!`;
    
    let locationInfo = "";
    if (user.addressLine1) {
      locationInfo = `
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

${identifier} has triggered an EMERGENCY ALERT on CheckMate at ${alertTime}.

This is NOT a routine missed check-in. They have manually pressed the emergency button indicating they need immediate assistance.
${locationInfo}

PLEASE CONTACT THEM IMMEDIATELY.

If you cannot reach them, consider contacting local emergency services.

- The CheckMate Team`;

    try {
      await sendEmail(contact.email, emailSubject, emailBody);
      emailsSent++;
      console.log(`[EMERGENCY ALERT] Email sent to ${contact.name} (${contact.email})`);
    } catch (error) {
      emailsFailed++;
      console.error(`[EMERGENCY ALERT] Failed to send email to ${contact.email}:`, error);
    }
  }

  return { emailsSent, emailsFailed };
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string
): Promise<boolean> {
  const subject = "Reset your CheckMate password";
  const body = `Hi ${userName},

You requested to reset your CheckMate password. Click the link below to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

- The CheckMate Team`;

  try {
    await sendEmail(email, subject, body);
    console.log(`[PASSWORD RESET] Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[PASSWORD RESET] Failed to send email to ${email}:`, error);
    return false;
  }
}
