import type { Contact, User } from "@shared/schema";
import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

// Gmail integration (Replit connector)
let gmailConnectionSettings: any;

// Outlook integration (Replit connector)
let outlookConnectionSettings: any;

async function getGmailAccessToken(): Promise<string | null> {
  try {
    if (gmailConnectionSettings && gmailConnectionSettings.settings.expires_at && 
        new Date(gmailConnectionSettings.settings.expires_at).getTime() > Date.now()) {
      return gmailConnectionSettings.settings.access_token;
    }
    
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      console.log('[GMAIL] Missing hostname or token');
      return null;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    const data = await response.json();
    gmailConnectionSettings = data.items?.[0];

    const accessToken = gmailConnectionSettings?.settings?.access_token || 
                        gmailConnectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!gmailConnectionSettings || !accessToken) {
      console.log('[GMAIL] Not connected or no access token');
      return null;
    }
    
    return accessToken;
  } catch (error) {
    console.error('[GMAIL] Error getting access token:', error);
    return null;
  }
}

async function getGmailClient() {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) return null;

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function sendEmailViaGmail(to: string, subject: string, body: string, html?: string): Promise<boolean> {
  try {
    const gmail = await getGmailClient();
    if (!gmail) {
      console.log('[GMAIL] Client not available');
      return false;
    }

    // Get user's email address for the From field
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const fromEmail = profile.data.emailAddress;
    
    // Create email in RFC 2822 format
    const emailContent = html 
      ? [
          `From: ${fromEmail}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          html
        ].join('\r\n')
      : [
          `From: ${fromEmail}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          '',
          body
        ].join('\r\n');

    // Base64 encode the email
    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`[GMAIL] Successfully sent email to ${to}`);
    return true;
  } catch (error: any) {
    console.error('[GMAIL] Failed to send email:', error?.message || error);
    return false;
  }
}

// Outlook integration functions
async function getOutlookAccessToken(): Promise<string | null> {
  try {
    if (outlookConnectionSettings && outlookConnectionSettings.settings.expires_at && 
        new Date(outlookConnectionSettings.settings.expires_at).getTime() > Date.now()) {
      return outlookConnectionSettings.settings.access_token;
    }
    
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      console.log('[OUTLOOK] Missing hostname or token');
      return null;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    const data = await response.json();
    outlookConnectionSettings = data.items?.[0];

    const accessToken = outlookConnectionSettings?.settings?.access_token || 
                        outlookConnectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!outlookConnectionSettings || !accessToken) {
      console.log('[OUTLOOK] Not connected or no access token');
      return null;
    }
    
    return accessToken;
  } catch (error) {
    console.error('[OUTLOOK] Error getting access token:', error);
    return null;
  }
}

async function getOutlookClient(): Promise<Client | null> {
  const accessToken = await getOutlookAccessToken();
  if (!accessToken) return null;

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

async function sendEmailViaOutlook(to: string, subject: string, body: string, html?: string): Promise<boolean> {
  try {
    const client = await getOutlookClient();
    if (!client) {
      console.log('[OUTLOOK] Client not available');
      return false;
    }

    const message = {
      subject: subject,
      body: {
        contentType: html ? 'HTML' : 'Text',
        content: html || body
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    };

    await client.api('/me/sendMail').post({ message });
    console.log(`[OUTLOOK] Successfully sent email to ${to}`);
    return true;
  } catch (error: any) {
    console.error('[OUTLOOK] Failed to send email:', error?.message || error);
    return false;
  }
}

async function getWhat3WordsAddress(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.WHAT3WORDS_API_KEY;
  if (!apiKey) {
    console.log('[WHAT3WORDS] API key not configured');
    return null;
  }

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    console.log(`[WHAT3WORDS] Calling API for coordinates ${lat},${lng}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.words) {
      console.log(`[WHAT3WORDS] Converted to ///${data.words}`);
      return data.words;
    }
    
    if (data.error) {
      console.error(`[WHAT3WORDS] API error: ${data.error.code} - ${data.error.message}`);
    }
    return null;
  } catch (error) {
    console.error('[WHAT3WORDS] Error converting coordinates:', error);
    return null;
  }
}

interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
  whatsapp: { sent: boolean; error?: string };
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

// SendGrid integration
async function getSendGridCredentials() {
  // First check for direct environment variable (preferred)
  const envApiKey = process.env.SENDGRID_API_KEY;
  if (envApiKey && envApiKey.startsWith('SG.')) {
    console.log('[SENDGRID] Using SENDGRID_API_KEY from environment');
    // Use a default from email or get from env
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@aok.care';
    return { apiKey: envApiKey, fromEmail };
  }

  // Fallback to Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  console.log(`[SENDGRID] Checking connector credentials - hostname: ${hostname ? 'present' : 'missing'}, token: ${xReplitToken ? 'present' : 'missing'}`);

  if (!xReplitToken || !hostname) {
    console.log('[SENDGRID] Missing hostname or token, returning null');
    return null;
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    const data = await response.json();
    const settings = data.items?.[0];

    if (!settings || !settings.settings.api_key || !settings.settings.from_email) {
      console.log('[SENDGRID] Missing api_key or from_email in connector response');
      return null;
    }
    
    // Validate the API key format
    if (!settings.settings.api_key.startsWith('SG.')) {
      console.log('[SENDGRID] Invalid API key format in connector (should start with SG.)');
      return null;
    }
    
    console.log(`[SENDGRID] Got credentials from connector, from_email: ${settings.settings.from_email}`);
    return { apiKey: settings.settings.api_key, fromEmail: settings.settings.from_email };
  } catch (error) {
    console.error('[SENDGRID] Failed to get credentials:', error);
    return null;
  }
}

async function getSendGridClient() {
  const credentials = await getSendGridCredentials();
  if (!credentials) {
    return null;
  }
  sgMail.setApiKey(credentials.apiKey);
  return {
    client: sgMail,
    fromEmail: credentials.fromEmail
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendEmail(to: string, subject: string, body: string, html?: string): Promise<void> {
  console.log(`[EMAIL] Attempting to send email to ${to}, subject: ${subject}`);
  
  // Try Gmail first (primary)
  const gmailSent = await sendEmailViaGmail(to, subject, body, html);
  if (gmailSent) {
    return;
  }
  console.log(`[EMAIL] Gmail not available, trying Outlook`);
  
  // Try Outlook second (Microsoft's own servers - good for Hotmail recipients)
  const outlookSent = await sendEmailViaOutlook(to, subject, body, html);
  if (outlookSent) {
    return;
  }
  console.log(`[EMAIL] Outlook not available, trying SendGrid`);
  
  // Try SendGrid third
  const sendGridClient = await getSendGridClient();
  if (sendGridClient) {
    console.log(`[EMAIL] SendGrid client available, from: ${sendGridClient.fromEmail}`);
    try {
      const msg: {
        to: string;
        from: string;
        subject: string;
        text: string;
        html?: string;
      } = {
        to: to,
        from: sendGridClient.fromEmail,
        subject: subject,
        text: body,
      };
      
      if (html) {
        msg.html = html;
      }
      
      const result = await sendGridClient.client.send(msg);
      console.log(`[EMAIL] Successfully sent email via SendGrid to ${to}, status: ${result?.[0]?.statusCode}`);
      return;
    } catch (error: any) {
      console.error(`[EMAIL] SendGrid failed for ${to}, trying Resend fallback:`, error?.response?.body || error?.message || error);
    }
  } else {
    console.log(`[EMAIL] SendGrid client not available, will try Resend`);
  }
  
  // Fallback to Resend
  try {
    const { client, fromEmail } = await getResendClient();
    
    const emailData: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html?: string;
    } = {
      from: fromEmail || 'aok <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: body,
    };
    
    if (html) {
      emailData.html = html;
    }
    
    await client.emails.send(emailData);
    
    console.log(`[EMAIL] Successfully sent email via Resend to ${to}`);
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
    // Use official Twilio SDK with API Key authentication
    const client = twilio(credentials.apiKey, credentials.apiKeySecret, {
      accountSid: credentials.accountSid
    });
    
    const message = await client.messages.create({
      to: to,
      from: credentials.phoneNumber,
      body: body,
    });

    console.log(`[SMS] Successfully sent SMS to ${to}, SID: ${message.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[SMS] Error sending to ${to}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const credentials = await getTwilioCredentials();
  
  if (!credentials) {
    console.log(`[WHATSAPP] Twilio not configured. Would send to ${to}: ${body.substring(0, 50)}...`);
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const client = twilio(credentials.apiKey, credentials.apiKeySecret, {
      accountSid: credentials.accountSid
    });
    
    // WhatsApp messages use whatsapp: prefix
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const whatsappFrom = `whatsapp:${credentials.phoneNumber}`;
    
    const message = await client.messages.create({
      to: whatsappTo,
      from: whatsappFrom,
      body: body,
    });

    console.log(`[WHATSAPP] Successfully sent WhatsApp to ${to}, SID: ${message.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[WHATSAPP] Error sending to ${to}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

export async function sendContactConfirmationEmail(
  contact: Contact,
  user: User,
  confirmationToken: string,
  baseUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const isOrganization = user.accountType === "organization";
  const contactName = escapeHtml(contact.name);
  const userName = escapeHtml(user.name);
  const referenceId = escapeHtml(user.referenceId || '');
  
  const confirmUrl = `${baseUrl}/api/contacts/confirm?token=${confirmationToken}&action=accept`;
  const declineUrl = `${baseUrl}/api/contacts/confirm?token=${confirmationToken}&action=decline`;
  
  const emailSubject = `Please confirm: Emergency contact request from aok`;
  
  // Plain text version (fallback)
  const emailBody = isOrganization 
    ? `Hi ${contact.name},

${user.name} would like to add you as an emergency contact for a person they are monitoring on aok.

Reference ID: ${user.referenceId}

aok is a personal safety check-in app. If this person misses a check-in, you will be notified automatically via email, SMS, or phone call.

IMPORTANT: You must confirm within 10 minutes to become an emergency contact.

To ACCEPT and become an emergency contact, click this link:
${confirmUrl}

To DECLINE and remove yourself, click this link:
${declineUrl}

If you do nothing, this request will expire automatically.

Thank you,
- The aok Team`
    : `Hi ${contact.name},

${user.name} would like to add you as their emergency contact on aok.

aok is a personal safety check-in app. If ${user.name} misses a check-in, you will be notified automatically via email, SMS, or phone call.

This means ${user.name} trusts you to help ensure their safety.

IMPORTANT: You must confirm within 10 minutes to become an emergency contact.

To ACCEPT and become an emergency contact, click this link:
${confirmUrl}

To DECLINE and remove yourself, click this link:
${declineUrl}

If you do nothing, this request will expire automatically.

Thank you,
- The aok Team`;

  // HTML version with clickable buttons
  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">Emergency Contact Request</h2>
  
  <p>Hi ${contactName},</p>
  
  ${isOrganization 
    ? `<p><strong>${userName}</strong> would like to add you as an emergency contact for a person they are monitoring on aok.</p>
       <p><strong>Reference ID:</strong> ${referenceId}</p>`
    : `<p><strong>${userName}</strong> would like to add you as their emergency contact on aok.</p>
       <p>This means ${userName} trusts you to help ensure their safety.</p>`
  }
  
  <p><strong>aok</strong> is a personal safety check-in app. If ${isOrganization ? 'this person' : userName} misses a check-in, you will be notified automatically via email, SMS, or phone call.</p>
  
  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0;">
    <strong style="color: #92400e;">IMPORTANT:</strong> You must confirm within 10 minutes to become an emergency contact.
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="padding: 0 10px;">
          <a href="${confirmUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px;">Accept</a>
        </td>
        <td style="padding: 0 10px;">
          <a href="${declineUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px;">Decline</a>
        </td>
      </tr>
    </table>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">If you do nothing, this request will expire automatically.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 14px;">Thank you,<br>- The aok Team</p>
</body>
</html>`;

  let emailSent = false;
  let smsSent = false;
  
  try {
    await sendEmail(contact.email, emailSubject, emailBody, htmlBody);
    emailSent = true;
    console.log(`[NOTIFICATION] Confirmation email sent to ${contact.email} for contact ${contactName}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send email";
    console.log(`[NOTIFICATION] Confirmation email failed for ${contact.email}: ${errorMsg}`);
  }
  
  // Send SMS with confirmation link if contact has a phone number
  if (contact.phone && contact.phoneType !== "landline") {
    const smsBody = isOrganization
      ? `aok: ${user.name} wants to add you as an emergency contact for Reference ${user.referenceId}. Accept: ${confirmUrl} or Decline: ${declineUrl} (Expires in 10 mins)`
      : `aok: ${user.name} wants to add you as their emergency contact. Accept: ${confirmUrl} or Decline: ${declineUrl} (Expires in 10 mins)`;
    
    const smsResult = await sendSMS(contact.phone, smsBody);
    smsSent = smsResult.success;
    if (smsResult.success) {
      console.log(`[NOTIFICATION] Confirmation SMS with links sent to ${contact.phone} for contact ${contactName}`);
    }
  }
  
  // Success if either email or SMS was sent
  if (emailSent || smsSent) {
    return { sent: true };
  }
  
  return { sent: false, error: "Failed to send email and SMS" };
}

export async function sendContactAddedNotification(
  contact: Contact,
  user: User
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
    whatsapp: { sent: false },
    voiceCall: { sent: false },
  };

  const isOrganization = user.accountType === "organization";
  const identifier = isOrganization 
    ? `${user.name} (Reference ID: ${user.referenceId})`
    : user.name;
  const contactName = contact.name;

  const emailSubject = `You are now an emergency contact on aok`;
  const emailBody = isOrganization 
    ? `Hi ${contactName},

Thank you for confirming! You are now an emergency contact for a person monitored by ${user.name} on aok.

Reference ID: ${user.referenceId}

You will be notified if this person misses a scheduled check-in.

Thank you for your support.

- The aok Team`
    : `Hi ${contactName},

Thank you for confirming! You are now an emergency contact for ${user.name} on aok.

You will be notified if ${user.name} misses a scheduled check-in.

Thank you for being there for ${user.name}.

- The aok Team`;

  const smsBody = isOrganization
    ? `You're now an emergency contact for Reference ${user.referenceId} on aok. You'll be notified if they miss a check-in.`
    : `You're now an emergency contact for ${user.name} on aok. You'll be notified if they miss a check-in.`;

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
    
    // Also send WhatsApp message
    const whatsappResult = await sendWhatsApp(contact.phone, smsBody);
    result.whatsapp.sent = whatsappResult.success;
    if (!whatsappResult.success) {
      result.whatsapp.error = whatsappResult.error || "Failed to send WhatsApp";
    }
  }

  return result;
}

export async function sendMissedCheckInAlert(
  contacts: Contact[],
  user: User
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number; whatsappSent: number; whatsappFailed: number }> {
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
  let whatsappSent = 0;
  let whatsappFailed = 0;
  
  for (const contact of contacts) {
    // Only alert confirmed contacts
    if (!contact.confirmedAt) {
      console.log(`[ALERT] Skipping unconfirmed contact ${contact.name}`);
      continue;
    }
    
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

    // Send email
    try {
      await sendEmail(contact.email, emailSubject, emailBody);
      emailsSent++;
      console.log(`[ALERT] Email sent to ${contact.name} (${contact.email})`);
    } catch (error) {
      emailsFailed++;
      console.error(`[ALERT] Failed to send email to ${contact.email}:`, error);
    }
    
    // Send SMS and WhatsApp to contacts with mobile phones
    if (contact.phone && contact.phoneType !== 'landline') {
      const smsBody = `ALERT from aok: ${identifier} has missed their scheduled check-in. Please try to reach out to ensure their safety.`;
      
      const smsResult = await sendSMS(contact.phone, smsBody);
      if (smsResult.success) {
        smsSent++;
        console.log(`[ALERT] SMS sent to ${contact.name} (${contact.phone})`);
      } else {
        smsFailed++;
        console.log(`[ALERT] SMS failed for ${contact.name}: ${smsResult.error}`);
      }
      
      // Also send WhatsApp
      const whatsappResult = await sendWhatsApp(contact.phone, smsBody);
      if (whatsappResult.success) {
        whatsappSent++;
        console.log(`[ALERT] WhatsApp sent to ${contact.name} (${contact.phone})`);
      } else {
        whatsappFailed++;
        console.log(`[ALERT] WhatsApp failed for ${contact.name}: ${whatsappResult.error}`);
      }
    }
  }

  return { emailsSent, emailsFailed, smsSent, smsFailed, whatsappSent, whatsappFailed };
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
  gpsLocation?: { latitude: number; longitude: number },
  isLocationUpdate: boolean = false
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number; whatsappSent: number; whatsappFailed: number }> {
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
  let whatsappSent = 0;
  let whatsappFailed = 0;
  
  let what3wordsAddress: string | null = null;
  if (gpsLocation) {
    what3wordsAddress = await getWhat3WordsAddress(gpsLocation.latitude, gpsLocation.longitude);
  }
  
  for (const contact of contacts) {
    const emailSubject = isLocationUpdate 
      ? `LOCATION UPDATE: ${subjectIdentifier} - Emergency Alert Still Active`
      : `EMERGENCY ALERT: ${subjectIdentifier} needs help!`;
    
    let locationInfo = "";
    let smsLocationInfo = "";
    
    if (gpsLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`;
      const w3wUrl = what3wordsAddress ? `https://what3words.com/${what3wordsAddress}` : null;
      locationInfo = `
CURRENT GPS LOCATION:
Coordinates: ${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}${what3wordsAddress ? `
what3words: ///${what3wordsAddress}
what3words map: ${w3wUrl}` : ''}
View on Google Maps: ${mapsUrl}
`;
      smsLocationInfo = what3wordsAddress 
        ? `Location: ///${what3wordsAddress} (${w3wUrl})` 
        : `Location: ${mapsUrl}`;
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
    
    const emailBody = isLocationUpdate 
      ? `*** LOCATION UPDATE ***

Hi ${contact.name},

This is an automatic LOCATION UPDATE for ${identifier}'s ongoing emergency alert as of ${alertTime}.

The emergency alert is still active. Updated location information below:
${locationInfo}

PLEASE CONTINUE TRYING TO REACH THEM.

If you cannot reach them, consider contacting local emergency services.

- The aok Team`
      : `URGENT - EMERGENCY ALERT

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
      const smsBody = isLocationUpdate 
        ? `LOCATION UPDATE: ${identifier}'s emergency alert is still active. ${smsLocationInfo} ${user.mobileNumber ? `Call: ${user.mobileNumber}` : ""}`
        : `EMERGENCY ALERT from aok: ${identifier} needs immediate help! ${smsLocationInfo} ${user.mobileNumber ? `Call them: ${user.mobileNumber}` : "Contact them immediately."}`;
      
      const smsResult = await sendSMS(contact.phone, smsBody);
      if (smsResult.success) {
        smsSent++;
        console.log(`[EMERGENCY ALERT] SMS sent to ${contact.name} (${contact.phone})`);
      } else {
        smsFailed++;
        console.error(`[EMERGENCY ALERT] Failed to send SMS to ${contact.phone}:`, smsResult.error);
      }
      
      // Also send WhatsApp
      const whatsappResult = await sendWhatsApp(contact.phone, smsBody);
      if (whatsappResult.success) {
        whatsappSent++;
        console.log(`[EMERGENCY ALERT] WhatsApp sent to ${contact.name} (${contact.phone})`);
      } else {
        whatsappFailed++;
        console.error(`[EMERGENCY ALERT] Failed to send WhatsApp to ${contact.phone}:`, whatsappResult.error);
      }
    }
  }

  return { emailsSent, emailsFailed, smsSent, smsFailed, whatsappSent, whatsappFailed };
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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  // Priority 1: Auth Token authentication (simpler, more reliable)
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (accountSid && authToken && phoneNumber) {
    console.log('[TWILIO] Using Auth Token authentication');
    return { accountSid, apiKey: accountSid, apiKeySecret: authToken, phoneNumber };
  }
  
  // Priority 2: API Key authentication
  const apiKey = process.env.TWILIO_API_KEY;
  const apiKeySecret = process.env.TWILIO_API_SECRET;
  if (accountSid && apiKey && apiKeySecret && phoneNumber) {
    console.log('[TWILIO] Using API Key authentication');
    return { accountSid, apiKey, apiKeySecret, phoneNumber };
  }

  // Try Replit connector (uses API Key authentication)
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    console.log('[TWILIO] Connector check - hostname:', hostname ? 'present' : 'missing', 'token:', xReplitToken ? 'present' : 'missing');

    if (!xReplitToken || !hostname) {
      console.log('[TWILIO] Missing hostname or token for connector');
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
    console.log('[TWILIO] Connector response items:', data.items?.length || 0);
    const twilioSettings = data.items?.[0]?.settings;

    if (twilioSettings?.account_sid && twilioSettings?.api_key && twilioSettings?.api_key_secret && twilioSettings?.phone_number) {
      console.log('[TWILIO] Successfully got credentials from connector');
      return {
        accountSid: twilioSettings.account_sid,
        apiKey: twilioSettings.api_key,
        apiKeySecret: twilioSettings.api_key_secret,
        phoneNumber: twilioSettings.phone_number
      };
    } else {
      console.log('[TWILIO] Connector settings incomplete:', 
        'account_sid:', !!twilioSettings?.account_sid,
        'api_key:', !!twilioSettings?.api_key,
        'api_key_secret:', !!twilioSettings?.api_key_secret,
        'phone_number:', !!twilioSettings?.phone_number
      );
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

// Send app download invite SMS to org-managed client
export async function sendAppInviteSMS(
  phoneNumber: string,
  referenceCode: string,
  organizationName: string
): Promise<{ success: boolean; error?: string }> {
  const appStoreLink = "https://apps.apple.com/app/aok";
  const playStoreLink = "https://play.google.com/store/apps/details?id=com.aok";
  
  const message = `Hi! ${organizationName} has registered you for aok safety check-ins.

Download the app:
iPhone: ${appStoreLink}
Android: ${playStoreLink}

Your reference code: ${referenceCode}

Enter this code when you open the app to get started.`;

  console.log(`[SMS INVITE] Sending app invite to ${phoneNumber} with code ${referenceCode}`);
  return await sendSMS(phoneNumber, message);
}

/**
 * Diagnostic function to check Twilio credentials without sending
 */
export async function diagnoseTwilioCredentials(): Promise<{
  connectorFound: boolean;
  accountSid?: string;
  apiKeyPrefix?: string;
  apiSecretLength?: number;
  phoneNumber?: string;
  rawSettings?: any;
  error?: string;
}> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      return { connectorFound: false, error: "Missing hostname or token" };
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
    const settings = data.items?.[0]?.settings;

    if (!settings) {
      return { connectorFound: false, error: "No Twilio settings in connector", rawSettings: data };
    }

    return {
      connectorFound: true,
      accountSid: settings.account_sid ? `${settings.account_sid.substring(0, 8)}...` : undefined,
      apiKeyPrefix: settings.api_key ? `${settings.api_key.substring(0, 8)}...` : undefined,
      apiSecretLength: settings.api_key_secret ? settings.api_key_secret.length : 0,
      phoneNumber: settings.phone_number,
    };
  } catch (error) {
    return { connectorFound: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test SMS functionality - sends a test message to verify Twilio is working
 */
export async function testSMSDelivery(phoneNumber: string): Promise<{ 
  success: boolean; 
  credentialsFound: boolean;
  fromNumber?: string;
  error?: string;
  twilioResponse?: any;
  diagnostics?: any;
}> {
  console.log(`[TEST SMS] Starting test to ${phoneNumber}`);
  
  const credentials = await getTwilioCredentials();
  const diagnostics = await diagnoseTwilioCredentials();
  
  if (!credentials) {
    console.log('[TEST SMS] No Twilio credentials found');
    return { 
      success: false, 
      credentialsFound: false,
      error: "Twilio credentials not found. Check connector setup.",
      diagnostics
    };
  }
  
  console.log(`[TEST SMS] Credentials found - From number: ${credentials.phoneNumber}`);
  console.log(`[TEST SMS] Account SID starts with: ${credentials.accountSid.substring(0, 8)}`);
  console.log(`[TEST SMS] API Key starts with: ${credentials.apiKey.substring(0, 8)}`);
  console.log(`[TEST SMS] API Secret length: ${credentials.apiKeySecret.length}`);
  
  try {
    // Use official Twilio SDK with API Key authentication
    const client = twilio(credentials.apiKey, credentials.apiKeySecret, {
      accountSid: credentials.accountSid
    });
    
    const testMessage = `aok Test Message: Your SMS notifications are working correctly. Sent at ${new Date().toLocaleString('en-GB')}`;
    
    const message = await client.messages.create({
      to: phoneNumber,
      from: credentials.phoneNumber,
      body: testMessage,
    });

    console.log(`[TEST SMS] SUCCESS - SID: ${message.sid}, Status: ${message.status}`);
    return { 
      success: true, 
      credentialsFound: true,
      fromNumber: credentials.phoneNumber,
      twilioResponse: { sid: message.sid, status: message.status },
      diagnostics
    };
  } catch (error: any) {
    console.error(`[TEST SMS] Exception:`, error);
    return { 
      success: false, 
      credentialsFound: true,
      fromNumber: credentials.phoneNumber,
      error: error.message || 'Unknown error',
      twilioResponse: error.code ? { code: error.code, moreInfo: error.moreInfo } : undefined,
      diagnostics
    };
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendEmail(
      to,
      "Test Email from aok",
      `This is a test email from aok to verify email delivery is working.\n\nIf you received this, email sending is configured correctly!`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #22c55e;">Test Email from aok</h2>
        <p>This is a test email from <strong>aok</strong> to verify email delivery is working.</p>
        <p style="color: #22c55e; font-weight: bold;">If you received this, email sending is configured correctly!</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This was a test email sent at ${new Date().toLocaleString()}</p>
      </div>`
    );
    console.log(`[TEST EMAIL] Successfully sent test email to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[TEST EMAIL] Failed to send to ${to}:`, error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}
