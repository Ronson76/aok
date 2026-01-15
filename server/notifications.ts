import type { Contact, User } from "@shared/schema";

interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
}

export async function sendContactAddedNotification(
  contact: Contact,
  user: User
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
  };

  const userName = user.name;
  const contactName = contact.name;

  // Email notification
  const emailSubject = `You've been added as an emergency contact on CheckMate`;
  const emailBody = `Hi ${contactName},

${userName} has added you as their emergency contact on CheckMate.

CheckMate is a personal safety check-in app. If ${userName} misses a check-in, you will be notified automatically.

This means ${userName} trusts you to help ensure their safety. You don't need to do anything right now - you'll only be contacted if they miss a scheduled check-in.

Thank you for being there for ${userName}.

- The CheckMate Team`;

  // SMS notification (shorter message)
  const smsBody = `Hi ${contactName}, ${userName} has added you as their emergency contact on CheckMate. You'll be notified if they miss a check-in.`;

  // Try to send email
  try {
    await sendEmail(contact.email, emailSubject, emailBody);
    result.email.sent = true;
    console.log(`[NOTIFICATION] Email sent to ${contact.email} for contact ${contactName}`);
  } catch (error) {
    result.email.error = error instanceof Error ? error.message : "Failed to send email";
    console.log(`[NOTIFICATION] Email would be sent to ${contact.email}:`);
    console.log(`  Subject: ${emailSubject}`);
    console.log(`  Body: ${emailBody.substring(0, 100)}...`);
  }

  // Try to send SMS if phone number provided
  if (contact.phone) {
    try {
      await sendSMS(contact.phone, smsBody);
      result.sms.sent = true;
      console.log(`[NOTIFICATION] SMS sent to ${contact.phone} for contact ${contactName}`);
    } catch (error) {
      result.sms.error = error instanceof Error ? error.message : "Failed to send SMS";
      console.log(`[NOTIFICATION] SMS would be sent to ${contact.phone}:`);
      console.log(`  Body: ${smsBody}`);
    }
  }

  return result;
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // TODO: Integrate with SendGrid, Resend, or other email service
  // For now, we log the email and throw to indicate it wasn't actually sent
  if (process.env.SENDGRID_API_KEY) {
    // SendGrid integration would go here
    throw new Error("SendGrid integration not yet implemented");
  }
  
  if (process.env.RESEND_API_KEY) {
    // Resend integration would go here
    throw new Error("Resend integration not yet implemented");
  }

  throw new Error("No email service configured");
}

async function sendSMS(to: string, body: string): Promise<void> {
  // TODO: Integrate with Twilio
  // Check for Twilio credentials
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromPhone) {
    // Twilio integration would go here
    // For now, just log that credentials exist but integration isn't complete
    throw new Error("Twilio integration not yet implemented");
  }

  throw new Error("No SMS service configured");
}

export async function sendMissedCheckInAlert(
  contacts: Contact[],
  user: User
): Promise<void> {
  const userName = user.name;
  
  for (const contact of contacts) {
    const emailSubject = `ALERT: ${userName} missed their CheckMate check-in`;
    const emailBody = `Hi ${contact.name},

This is an automated alert from CheckMate.

${userName} has missed their scheduled check-in. This may indicate they need assistance.

${userName}'s registered address:
${user.addressLine1}
${user.addressLine2 ? user.addressLine2 + '\n' : ''}${user.city}, ${user.postalCode}
${user.country}

Please try to reach out to ${userName} to ensure they are safe.

- The CheckMate Team`;

    const smsBody = `ALERT: ${userName} missed their CheckMate check-in. Address: ${user.addressLine1}, ${user.city}, ${user.postalCode}. Please check on them.`;

    // Log notifications (would be sent via email/SMS services)
    console.log(`[ALERT] Would send to ${contact.name} (${contact.email}):`);
    console.log(`  Email Subject: ${emailSubject}`);
    
    if (contact.phone) {
      console.log(`[ALERT] Would send SMS to ${contact.phone}: ${smsBody}`);
    }
  }
}
