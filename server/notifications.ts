import type { Contact, User } from "@shared/schema";
import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

// Helper to format date in British format (DD/MM/YYYY HH:mm)
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} at ${hours}:${minutes}`;
}

// SVG shield icons for email templates (base64 encoded for email compatibility)
// Red shield with exclamation mark for alerts
const redShieldSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L3 6V12C3 17.55 7.16 22.74 12 24C16.84 22.74 21 17.55 21 12V6L12 2Z" fill="#DC2626"/>
  <path d="M12 2L3 6V12C3 17.55 7.16 22.74 12 24C16.84 22.74 21 17.55 21 12V6L12 2Z" stroke="white" stroke-width="0.5"/>
  <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">!</text>
</svg>`;

// Green shield with tick for confirmations/success
const greenShieldSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L3 6V12C3 17.55 7.16 22.74 12 24C16.84 22.74 21 17.55 21 12V6L12 2Z" fill="#16A34A"/>
  <path d="M12 2L3 6V12C3 17.55 7.16 22.74 12 24C16.84 22.74 21 17.55 21 12V6L12 2Z" stroke="white" stroke-width="0.5"/>
  <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Orange shield for general/password reset
const orangeShieldSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L3 6V12C3 17.55 7.16 22.74 12 24C16.84 22.74 21 17.55 21 12V6L12 2Z" fill="#F97316"/>
  <path d="M12 2L3 6V12C3 17.55 7.16 22.74 12 24C16.84 22.74 21 17.55 21 12V6L12 2Z" stroke="white" stroke-width="0.5"/>
  <path d="M12 8V12M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function getShieldDataUri(alertType: string): string {
  let svg: string;
  if (alertType === 'emergency' || alertType === 'missed_checkin') {
    svg = redShieldSvg;
  } else if (alertType === 'checkin_success' || alertType === 'confirmation' || alertType === 'welcome') {
    svg = greenShieldSvg;
  } else {
    svg = orangeShieldSvg;
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Professional HTML email template with aok branding
function createBrandedEmail(options: {
  recipientName: string;
  subject: string;
  alertType: 'missed_checkin' | 'emergency' | 'checkin_success' | 'confirmation' | 'password_reset' | 'general' | 'welcome';
  mainContent: string;
  locationSection?: string;
  additionalInfo?: string;
  ctaButton?: { text: string; url: string };
  customFooterNote?: string;
}): string {
  const { recipientName, alertType, mainContent, locationSection, additionalInfo, ctaButton, customFooterNote } = options;
  
  // Determine header colour based on alert type
  const headerColor = alertType === 'emergency' || alertType === 'missed_checkin' 
    ? '#DC2626' // Red for alerts
    : alertType === 'checkin_success' || alertType === 'confirmation' || alertType === 'welcome'
    ? '#16A34A' // Green for success/welcome
    : '#F97316'; // Orange for regular communications
  
  const shieldDataUri = getShieldDataUri(alertType);
  
  const alertBanner = alertType === 'emergency' 
    ? `<div style="background-color: #DC2626; color: white; text-align: center; padding: 12px; font-weight: bold; font-size: 16px;">EMERGENCY ALERT</div>`
    : alertType === 'missed_checkin'
    ? `<div style="background-color: #F59E0B; color: white; text-align: center; padding: 12px; font-weight: bold; font-size: 16px;">MISSED CHECK-IN ALERT</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with shield icon -->
          <tr>
            <td style="background-color: ${headerColor}; padding: 24px; text-align: center;">
              <img src="${shieldDataUri}" alt="aok" style="height: 64px; width: 64px;" />
            </td>
          </tr>
          
          ${alertBanner ? `<tr><td>${alertBanner}</td></tr>` : ''}
          
          <!-- Main content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #18181b;">Hi ${recipientName},</p>
              
              <div style="margin: 0 0 24px 0; font-size: 16px; color: #3f3f46;">
                ${mainContent}
              </div>
              
              ${locationSection ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Location Information</h3>
                <div style="font-size: 14px; color: #78350f; white-space: pre-line;">${locationSection}</div>
              </div>
              ` : ''}
              
              ${additionalInfo ? `
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #52525b; text-transform: uppercase; letter-spacing: 0.5px;">Additional Information</h3>
                <div style="font-size: 14px; color: #3f3f46; white-space: pre-line;">${additionalInfo}</div>
              </div>
              ` : ''}
              
              ${ctaButton ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${ctaButton.url}" style="display: inline-block; background-color: #F97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">${ctaButton.text}</a>
              </div>
              ` : ''}
              
              ${customFooterNote ? `
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #71717a;">
                ${customFooterNote}
              </p>
              ` : alertType === 'emergency' || alertType === 'missed_checkin' ? `
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #71717a;">
                Please try to reach out to ensure their safety.
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">
                Sent with care by the aok Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                <a href="https://aok.care" style="color: #F97316; text-decoration: none;">aok.care</a> - Personal safety made simple
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer note -->
        <p style="text-align: center; font-size: 12px; color: #a1a1aa; margin: 24px 0 0 0;">
          This is an automated message. Please do not reply directly to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper to get a display name for a user with fallbacks
function getUserDisplayName(user: User): string {
  if (user.name && user.name.trim()) {
    return user.name.trim();
  }
  if (user.referenceId) {
    return `Client ${user.referenceId}`;
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'aok User';
}

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

    console.log(`[OUTLOOK] Sending email to ${to} with subject: ${subject}`);
    const result = await client.api('/me/sendMail').post({ message });
    console.log(`[OUTLOOK] API response:`, JSON.stringify(result));
    console.log(`[OUTLOOK] Successfully sent email to ${to}`);
    return true;
  } catch (error: any) {
    console.error('[OUTLOOK] Failed to send email:', error?.message || error);
    console.error('[OUTLOOK] Full error:', JSON.stringify(error, null, 2));
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
  console.log(`[RESEND] Checking credentials - API key ${apiKey ? 'found (starts with ' + apiKey.substring(0, 8) + '...)' : 'not found'}`);
  if (apiKey) {
    return { 
      apiKey, 
      fromEmail: 'aok <support@aok.care>' 
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
  
  // Use Resend as primary email provider (support@aok.care)
  try {
    const { client, fromEmail } = await getResendClient();
    console.log(`[EMAIL] Got Resend client, fromEmail: ${fromEmail}`);
    
    const emailData: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html?: string;
      headers?: Record<string, string>;
    } = {
      from: fromEmail || 'aok <support@aok.care>',
      to: [to],
      subject: subject,
      text: body
    };
    
    if (html) {
      emailData.html = html;
    }
    
    console.log(`[EMAIL] Sending email from ${emailData.from} to ${to}...`);
    const result = await client.emails.send(emailData);
    console.log(`[EMAIL] Resend API response:`, JSON.stringify(result));
    
    console.log(`[EMAIL] Successfully sent email via Resend to ${to}`);
  } catch (error: any) {
    console.error(`[EMAIL] Failed to send email to ${to}:`, error);
    console.error(`[EMAIL] Error details - message: ${error?.message}, statusCode: ${error?.statusCode}, name: ${error?.name}`);
    if (error?.response) {
      console.error(`[EMAIL] Response body:`, JSON.stringify(error.response));
    }
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
  const userName = escapeHtml(getUserDisplayName(user));
  const referenceId = escapeHtml(user.referenceId || '');
  
  const confirmUrl = `${baseUrl}/api/contacts/confirm?token=${confirmationToken}&action=accept`;
  const declineUrl = `${baseUrl}/api/contacts/confirm?token=${confirmationToken}&action=decline`;
  const confirmPageUrl = `${baseUrl}/confirm-contact?token=${confirmationToken}`;
  
  const emailSubject = `Please confirm: Emergency contact request from aok`;
  
  // Plain text version (fallback)
  const emailBody = isOrganization 
    ? `Hi ${contact.name},

${userName} would like to add you as an emergency contact for a person they are monitoring on aok.

Reference ID: ${user.referenceId}

aok is a personal safety check-in app. If this person misses a check-in, you will be notified automatically via email, SMS, or phone call.

IMPORTANT: You must confirm within 24 hours to become an emergency contact.

To ACCEPT and become an emergency contact, click this link:
${confirmUrl}

To DECLINE and remove yourself, click this link:
${declineUrl}

If you do nothing, this request will expire automatically.

Thank you,
- The aok Team`
    : `Hi ${contact.name},

${userName} would like to add you as their emergency contact on aok.

aok is a personal safety check-in app. If ${userName} misses a check-in, you will be notified automatically via email, SMS, or phone call.

This means ${userName} trusts you to help ensure their safety.

IMPORTANT: You must confirm within 24 hours to become an emergency contact.

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
    <strong style="color: #92400e;">IMPORTANT:</strong> You must confirm within 24 hours to become an emergency contact.
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
    
    // SMS fallback only if email fails and contact has a mobile number
    if (contact.phone && contact.phoneType !== "landline") {
      console.log(`[NOTIFICATION] Attempting SMS fallback for ${contactName}`);
      const smsBody = isOrganization
        ? `aok: ${userName} wants to add you as an emergency contact (Ref: ${user.referenceId}). Tap to respond: ${confirmPageUrl}`
        : `aok: ${userName} wants to add you as their emergency contact. Tap to respond: ${confirmPageUrl}`;
      
      const smsResult = await sendSMS(contact.phone, smsBody);
      smsSent = smsResult.success;
      if (smsResult.success) {
        console.log(`[NOTIFICATION] Confirmation SMS fallback sent to ${contact.phone} for contact ${contactName}`);
      }
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
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `${displayName} (Reference ID: ${user.referenceId})`
    : displayName;
  const contactName = contact.name;

  const emailSubject = `You are now an emergency contact on aok`;
  const emailBody = isOrganization 
    ? `Hi ${contactName},

Thank you for confirming! You are now an emergency contact for a person monitored by ${displayName} on aok.

Reference ID: ${user.referenceId}

You will be notified if this person misses a scheduled check-in.

Thank you for your support.

- The aok Team`
    : `Hi ${contactName},

Thank you for confirming! You are now an emergency contact for ${displayName} on aok.

You will be notified if ${displayName} misses a scheduled check-in.

Thank you for being there for ${displayName}.

- The aok Team`;

  const smsBody = isOrganization
    ? `You're now an emergency contact for Reference ${user.referenceId} on aok. You'll be notified if they miss a check-in.`
    : `You're now an emergency contact for ${displayName} on aok. You'll be notified if they miss a check-in.`;

  // Send email only for contact added notification (to save cost)
  try {
    await sendEmail(contact.email, emailSubject, emailBody);
    result.email.sent = true;
    console.log(`[NOTIFICATION] Email sent to ${contact.email} for contact ${contactName}`);
  } catch (error) {
    result.email.error = error instanceof Error ? error.message : "Failed to send email";
    console.log(`[NOTIFICATION] Email failed for ${contact.email}: ${result.email.error}`);
  }

  return result;
}

export async function sendPrimaryContactPromotionNotification(
  contact: Contact,
  user: User
): Promise<boolean> {
  const isOrganization = user.accountType === "organization";
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;
  const contactName = contact.name;

  const emailSubject = `You are now the PRIMARY emergency contact on aok`;
  const emailBody = isOrganization 
    ? `Hi ${contactName},

You have been promoted to PRIMARY emergency contact for a person monitored by ${displayName} on aok.

Reference ID: ${user.referenceId}

As the primary contact, you will receive a notification for every successful check-in, as well as any alerts if a check-in is missed.

Thank you for your continued support.

- The aok Team`
    : `Hi ${contactName},

You have been promoted to PRIMARY emergency contact for ${displayName} on aok.

As the primary contact, you will receive a notification for every successful check-in, as well as any alerts if a check-in is missed.

Thank you for being there for ${displayName}.

- The aok Team`;

  try {
    await sendEmail(contact.email, emailSubject, emailBody);
    console.log(`[NOTIFICATION] Primary promotion email sent to ${contact.email} for contact ${contactName}`);
    return true;
  } catch (error) {
    console.error(`[NOTIFICATION] Failed to send primary promotion email to ${contact.email}:`, error);
    return false;
  }
}

export async function sendContactRemovedNotification(
  contact: Contact,
  user: User
): Promise<boolean> {
  const isOrganization = user.accountType === "organization";
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;
  const contactName = contact.name;

  const emailSubject = `You have been removed as an emergency contact on aok`;
  const emailBody = isOrganization 
    ? `Hi ${contactName},

This is to inform you that you have been removed as an emergency contact for a person monitored by ${displayName} on aok.

Reference ID: ${user.referenceId}

You will no longer receive any check-in notifications or alerts for this person.

Thank you for your support.

- The aok Team`
    : `Hi ${contactName},

This is to inform you that you have been removed as an emergency contact for ${displayName} on aok.

You will no longer receive any check-in notifications or alerts for ${displayName}.

Thank you for being there.

- The aok Team`;

  try {
    await sendEmail(contact.email, emailSubject, emailBody);
    console.log(`[NOTIFICATION] Contact removed email sent to ${contact.email} for contact ${contactName}`);
    return true;
  } catch (error) {
    console.error(`[NOTIFICATION] Failed to send contact removed email to ${contact.email}:`, error);
    return false;
  }
}

// Helper function to format additional info for alerts
function formatAdditionalInfo(additionalInfoJson: string | null): string {
  if (!additionalInfoJson) return "";
  
  try {
    const info = JSON.parse(additionalInfoJson);
    const sections: string[] = [];
    
    // Pets info
    if (info.pets && info.pets.length > 0) {
      const petDetails = info.pets.map((pet: any) => {
        let detail = `${pet.name || 'Pet'}`;
        if (pet.type) detail += ` (${pet.type})`;
        const extras: string[] = [];
        if (pet.nutritionNeeds) extras.push(`Nutrition: ${pet.nutritionNeeds}`);
        if (pet.vetInfo) extras.push(`Vet: ${pet.vetInfo}`);
        if (pet.emergencyInstructions) extras.push(`Emergency: ${pet.emergencyInstructions}`);
        if (extras.length > 0) detail += ` - ${extras.join(', ')}`;
        return detail;
      }).join('\n  ');
      sections.push(`PETS:\n  ${petDetails}`);
    }
    
    // Children info
    if (info.children) {
      const childDetails: string[] = [];
      if (info.children.numberOfChildren) childDetails.push(`Number: ${info.children.numberOfChildren}`);
      if (info.children.agesDescription) childDetails.push(`Ages: ${info.children.agesDescription}`);
      if (info.children.emergencyDetails) childDetails.push(`Emergency contact: ${info.children.emergencyDetails}`);
      if (childDetails.length > 0) {
        sections.push(`CHILDREN:\n  ${childDetails.join('\n  ')}`);
      }
    }
    
    // Partner travel info
    if (info.partnerTravel) {
      const travelDetails: string[] = [];
      if (info.partnerTravel.typicalDestinations) travelDetails.push(`Typical destinations: ${info.partnerTravel.typicalDestinations}`);
      if (info.partnerTravel.address) travelDetails.push(`Address when away: ${info.partnerTravel.address}`);
      if (info.partnerTravel.phone) travelDetails.push(`Phone when away: ${info.partnerTravel.phone}`);
      if (travelDetails.length > 0) {
        sections.push(`PARTNER TRAVEL INFO:\n  ${travelDetails.join('\n  ')}`);
      }
    }
    
    // Rural access info
    if (info.rural) {
      const ruralDetails: string[] = [];
      if (info.rural.accessInstructions) ruralDetails.push(`Access instructions: ${info.rural.accessInstructions}`);
      if (info.rural.gateCode) ruralDetails.push(`Gate code: ${info.rural.gateCode}`);
      if (info.rural.additionalNotes) ruralDetails.push(`Notes: ${info.rural.additionalNotes}`);
      if (ruralDetails.length > 0) {
        sections.push(`RURAL ACCESS INFO:\n  ${ruralDetails.join('\n  ')}`);
      }
    }
    
    // Solo travel info
    if (info.soloTravel) {
      const soloDetails: string[] = [];
      if (info.soloTravel.typicalDestinations) soloDetails.push(`Typical destinations: ${info.soloTravel.typicalDestinations}`);
      if (info.soloTravel.localAddress) soloDetails.push(`Local address: ${info.soloTravel.localAddress}`);
      if (info.soloTravel.localPhone) soloDetails.push(`Local phone: ${info.soloTravel.localPhone}`);
      if (soloDetails.length > 0) {
        sections.push(`SOLO TRAVEL INFO:\n  ${soloDetails.join('\n  ')}`);
      }
    }
    
    // Lone worker info
    if (info.loneWorker) {
      const workerDetails: string[] = [];
      if (info.loneWorker.companyName) workerDetails.push(`Company: ${info.loneWorker.companyName}`);
      if (info.loneWorker.supervisorName) workerDetails.push(`Supervisor: ${info.loneWorker.supervisorName}`);
      if (info.loneWorker.emergencyContact) workerDetails.push(`Work emergency contact: ${info.loneWorker.emergencyContact}`);
      if (workerDetails.length > 0) {
        sections.push(`LONE WORKER INFO:\n  ${workerDetails.join('\n  ')}`);
      }
    }
    
    // Health conditions info
    if (info.healthConditions) {
      const healthDetails: string[] = [];
      const conditionLabels: Record<string, string> = {
        "fall-concerns": "Fall concerns",
        "chronic-condition": "Chronic health condition",
        "surgery": "Recent surgery or recovery",
        "mobility": "Limited mobility",
        "other": "Other"
      };
      
      if (info.healthConditions.conditions && info.healthConditions.conditions.length > 0) {
        const conditionNames = info.healthConditions.conditions
          .filter((c: string) => c !== "other")
          .map((c: string) => conditionLabels[c] || c);
        if (conditionNames.length > 0) {
          healthDetails.push(`Conditions: ${conditionNames.join(', ')}`);
        }
      }
      
      if (info.healthConditions.other) {
        healthDetails.push(`Other details: ${info.healthConditions.other}`);
      }
      
      if (healthDetails.length > 0) {
        sections.push(`HEALTH CONDITIONS:\n  ${healthDetails.join('\n  ')}`);
      }
    }
    
    if (sections.length > 0) {
      return `\n\n--- ADDITIONAL INFORMATION ---\n${sections.join('\n\n')}`;
    }
  } catch (error) {
    console.error('[ALERT] Failed to parse additional info:', error);
  }
  
  return "";
}

export async function sendMissedCheckInAlert(
  contacts: Contact[],
  user: User,
  additionalInfo?: string | null
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number; whatsappSent: number; whatsappFailed: number }> {
  const isOrganization = user.accountType === "organization";
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ID: ${user.referenceId}` 
    : displayName;
  const subjectIdentifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;
  
  let emailsSent = 0;
  let emailsFailed = 0;
  let smsSent = 0;
  let smsFailed = 0;
  let whatsappSent = 0;
  let whatsappFailed = 0;
  
  // Only send to primary contacts for missed check-in alerts
  const primaryContacts = contacts.filter(c => c.isPrimary);
  
  // Get what3words location if user has GPS coordinates
  let what3wordsAddress: string | null = null;
  if (user.latitude && user.longitude) {
    try {
      what3wordsAddress = await getWhat3WordsAddress(
        parseFloat(user.latitude), 
        parseFloat(user.longitude)
      );
    } catch (error) {
      console.error('[ALERT] Failed to get what3words address:', error);
    }
  }
  
  for (const contact of primaryContacts) {
    // Only alert confirmed contacts
    if (!contact.confirmedAt) {
      console.log(`[ALERT] Skipping unconfirmed contact ${contact.name}`);
      continue;
    }
    
    const emailSubject = `ALERT: ${subjectIdentifier} missed their aok check-in`;
    
    // Build location section for HTML email
    const locationTimestamp = user.lastLocationUpdatedAt 
      ? ` (recorded ${formatDate(new Date(user.lastLocationUpdatedAt))})`
      : '';
    
    let locationHtml = "";
    
    if (what3wordsAddress) {
      const w3wUrl = `https://what3words.com/${what3wordsAddress}`;
      locationHtml += `<p style="margin: 0 0 8px 0;"><strong>Last known GPS location${locationTimestamp}:</strong></p>`;
      locationHtml += `<p style="margin: 0 0 4px 0;">what3words: <strong>///${what3wordsAddress}</strong></p>`;
      locationHtml += `<p style="margin: 0 0 12px 0;"><a href="${w3wUrl}" style="color: #F97316;">View on map</a></p>`;
    } else if (user.latitude && user.longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${user.latitude},${user.longitude}`;
      locationHtml += `<p style="margin: 0 0 8px 0;"><strong>Last known GPS location${locationTimestamp}:</strong></p>`;
      locationHtml += `<p style="margin: 0 0 4px 0;">Coordinates: ${user.latitude}, ${user.longitude}</p>`;
      locationHtml += `<p style="margin: 0 0 12px 0;"><a href="${googleMapsUrl}" style="color: #F97316;">View on map</a></p>`;
    } else {
      locationHtml += `<p style="margin: 0 0 8px 0; color: #92400e;">GPS location not available (location permission may not be enabled)</p>`;
    }
    
    if (user.addressLine1) {
      locationHtml += `<p style="margin: 12px 0 4px 0;"><strong>Registered address:</strong></p>`;
      locationHtml += `<p style="margin: 0;">${user.addressLine1}`;
      if (user.addressLine2) locationHtml += `<br/>${user.addressLine2}`;
      locationHtml += `<br/>${user.city || ""}, ${user.postalCode || ""}`;
      if (user.country) locationHtml += `<br/>${user.country}`;
      locationHtml += `</p>`;
    }
    
    if (user.mobileNumber) {
      locationHtml += `<p style="margin: 12px 0 0 0;"><strong>Mobile:</strong> <a href="tel:${user.mobileNumber.replace(/[^+\d]/g, '')}" style="color: #F97316;">${user.mobileNumber}</a></p>`;
    }
    
    // Format additional info for HTML
    let additionalHtml = "";
    if (additionalInfo) {
      const parsed = JSON.parse(additionalInfo);
      if (parsed.healthConditions?.length) {
        additionalHtml += `<p style="margin: 0 0 8px 0;"><strong>Health Conditions:</strong> ${parsed.healthConditions.join(', ')}</p>`;
      }
      if (parsed.medications?.length) {
        additionalHtml += `<p style="margin: 0 0 8px 0;"><strong>Medications:</strong> ${parsed.medications.join(', ')}</p>`;
      }
      if (parsed.allergies?.length) {
        additionalHtml += `<p style="margin: 0 0 8px 0;"><strong>Allergies:</strong> ${parsed.allergies.join(', ')}</p>`;
      }
      if (parsed.notes) {
        additionalHtml += `<p style="margin: 0;"><strong>Notes:</strong> ${parsed.notes}</p>`;
      }
    }
    
    // Create branded HTML email
    const htmlEmail = createBrandedEmail({
      recipientName: contact.name,
      subject: emailSubject,
      alertType: 'missed_checkin',
      mainContent: `<p style="margin: 0;"><strong>${identifier}</strong> has missed their scheduled check-in. This may indicate they need assistance.</p>`,
      locationSection: locationHtml,
      additionalInfo: additionalHtml || undefined
    });
    
    // Plain text fallback
    const additionalInfoText = formatAdditionalInfo(additionalInfo || null);
    const emailBody = `Hi ${contact.name},

This is an automated alert from aok.

${identifier} has missed their scheduled check-in. This may indicate they need assistance.

LOCATION INFORMATION:
${what3wordsAddress ? `Last known GPS location${locationTimestamp}: ///${what3wordsAddress}\nView on map: https://what3words.com/${what3wordsAddress}` : user.latitude && user.longitude ? `Last known GPS location${locationTimestamp}: ${user.latitude}, ${user.longitude}\nView on map: https://www.google.com/maps?q=${user.latitude},${user.longitude}` : 'GPS location not available'}
${user.addressLine1 ? `Registered address: ${user.addressLine1}${user.addressLine2 ? ', ' + user.addressLine2 : ''}, ${user.city || ''}, ${user.postalCode || ''} ${user.country || ''}` : ''}
${user.mobileNumber ? `Mobile: ${user.mobileNumber}` : ''}
${additionalInfoText}

Please try to reach out to ensure their safety.

- The aok Team`;

    // Send email with HTML and plain text
    try {
      await sendEmail(contact.email, emailSubject, emailBody, htmlEmail);
      emailsSent++;
      console.log(`[ALERT] Email sent to primary contact ${contact.name} (${contact.email})`);
    } catch (error) {
      emailsFailed++;
      console.error(`[ALERT] Failed to send email to ${contact.email}:`, error);
    }
    
    // Send SMS if contact has a mobile phone
    if (contact.phone && contact.phoneType === 'mobile') {
      const smsLocationInfo = what3wordsAddress 
        ? `Location: ///${what3wordsAddress}` 
        : (user.latitude && user.longitude 
          ? `Map: https://maps.google.com/?q=${user.latitude},${user.longitude}` 
          : '');
      const smsBody = `MISSED CHECK-IN from aok: ${identifier} has missed their scheduled check-in. ${smsLocationInfo} ${user.mobileNumber ? `Call them: ${user.mobileNumber}` : 'Please try to contact them.'}`.trim();
      
      const smsResult = await sendSMS(contact.phone, smsBody);
      if (smsResult.success) {
        smsSent++;
        console.log(`[ALERT] SMS sent to primary contact ${contact.name} (${contact.phone})`);
      } else {
        smsFailed++;
        console.error(`[ALERT] Failed to send SMS to ${contact.phone}:`, smsResult.error);
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
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;
  
  const now = new Date();
  const checkInTime = now.toLocaleString('en-GB', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });
  
  // Get what3words location if user has GPS coordinates
  let locationInfo = "";
  if (user.latitude && user.longitude) {
    try {
      const what3wordsAddress = await getWhat3WordsAddress(
        parseFloat(user.latitude), 
        parseFloat(user.longitude)
      );
      if (what3wordsAddress) {
        const w3wUrl = `https://what3words.com/${what3wordsAddress}`;
        locationInfo = `
Location: ///${what3wordsAddress}
View on map: ${w3wUrl}
`;
      }
    } catch (error) {
      console.error('[CHECK-IN NOTIFICATION] Failed to get what3words address:', error);
    }
  }
  
  const subject = `aok: ${identifier} checked in successfully`;
  const body = `Hi ${primaryContact.name},

Good news! ${identifier} has completed their scheduled check-in on aok.

Check-in time: ${checkInTime}
${locationInfo}
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
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;
  
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
  isLocationUpdate: boolean = false,
  additionalInfo?: string | null
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number; whatsappSent: number; whatsappFailed: number }> {
  const isOrganization = user.accountType === "organization";
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ID: ${user.referenceId}` 
    : displayName;
  const subjectIdentifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;
  
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
      if (what3wordsAddress) {
        const w3wUrl = `https://what3words.com/${what3wordsAddress}`;
        locationInfo = `
CURRENT GPS LOCATION:
what3words: ///${what3wordsAddress}
View on map: ${w3wUrl}
`;
        smsLocationInfo = `Location: ///${what3wordsAddress} (${w3wUrl})`;
      } else {
        // Fallback to Google Maps only if what3words is unavailable
        const mapsUrl = `https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`;
        locationInfo = `
CURRENT GPS LOCATION:
Coordinates: ${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}
View on map: ${mapsUrl}
`;
        smsLocationInfo = `Location: ${mapsUrl}`;
      }
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
    
    const additionalInfoText = formatAdditionalInfo(additionalInfo || null);
    
    const emailBody = isLocationUpdate 
      ? `*** LOCATION UPDATE ***

Hi ${contact.name},

This is an automatic LOCATION UPDATE for ${identifier}'s ongoing emergency alert as of ${alertTime}.

The emergency alert is still active. Updated location information below:
${locationInfo}${additionalInfoText}

PLEASE CONTINUE TRYING TO REACH THEM.

If you cannot reach them, consider contacting local emergency services.

- The aok Team`
      : `URGENT - EMERGENCY ALERT

Hi ${contact.name},

${identifier} has triggered an EMERGENCY ALERT on aok at ${alertTime}.

This is NOT a routine missed check-in. They have manually pressed the emergency button indicating they need immediate assistance.
${locationInfo}${additionalInfoText}

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

// Sent when client requests emergency end - asks contacts to confirm they've spoken to client
// ALERTS CONTINUE until a contact confirms
export async function sendEmergencyConfirmationRequest(
  contacts: Contact[],
  user: User,
  gpsLocation?: { latitude: number; longitude: number },
  confirmationLinks?: Map<string, string>
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number }> {
  const displayName = getUserDisplayName(user);
  
  let emailsSent = 0;
  let emailsFailed = 0;
  let smsSent = 0;
  let smsFailed = 0;
  
  let what3wordsAddress: string | null = null;
  if (gpsLocation) {
    what3wordsAddress = await getWhat3WordsAddress(gpsLocation.latitude, gpsLocation.longitude);
  }
  
  const now = new Date();
  const requestTime = now.toLocaleString('en-GB', { 
    dateStyle: 'full', 
    timeStyle: 'long' 
  });
  
  for (const contact of contacts) {
    const confirmationUrl = confirmationLinks?.get(contact.email);
    if (!confirmationUrl) continue;
    
    const emailSubject = `URGENT: ${displayName} has requested to end their emergency - confirmation needed`;
    
    let locationInfo = "";
    let smsLocationInfo = "";
    
    if (gpsLocation) {
      if (what3wordsAddress) {
        const w3wUrl = `https://what3words.com/${what3wordsAddress}`;
        locationInfo = `<p style="margin: 0;"><strong>Last known location:</strong></p>
        <p style="margin: 5px 0;"><a href="${w3wUrl}" style="color: #22c55e; font-weight: bold;">///&zwj;${what3wordsAddress}</a></p>`;
        smsLocationInfo = `Location: ///${what3wordsAddress}`;
      } else {
        const mapsUrl = `https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`;
        locationInfo = `<p style="margin: 0;"><strong>Last known location:</strong></p>
        <p style="margin: 5px 0;"><a href="${mapsUrl}" style="color: #22c55e;">View on map</a></p>`;
        smsLocationInfo = `Map: ${mapsUrl}`;
      }
    }
    
    const emailBody = `*** CONFIRMATION REQUIRED ***

${displayName} has requested to end their emergency alert.

IMPORTANT: Emergency alerts are STILL ACTIVE until you confirm.

Request time: ${requestTime}
${gpsLocation ? `Location: ${what3wordsAddress ? `///${what3wordsAddress}` : `${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}`}` : ''}

To stop the emergency alerts, you must:
1. Speak directly to ${displayName}
2. Confirm they have asked for the emergency to end
3. Click the confirmation link below

Confirm here: ${confirmationUrl}

If you cannot reach ${displayName}, DO NOT confirm. Emergency alerts will continue.

- The aok Team`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-flex; align-items: center; gap: 8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span style="font-size: 28px; font-weight: bold; color: #22c55e;">aok</span>
    </div>
  </div>
  
  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 24px;">CONFIRMATION REQUIRED</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">${displayName} has requested to end their emergency</p>
  </div>
  
  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0; color: #92400e; font-weight: bold;">Emergency alerts are STILL ACTIVE until you confirm.</p>
  </div>
  
  <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 10px 0;"><strong>Request time:</strong> ${requestTime}</p>
    ${locationInfo}
  </div>
  
  <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 12px 0; color: #166534;">Before confirming, you must:</h3>
    <ul style="margin: 0; padding-left: 20px; color: #166534;">
      <li style="margin-bottom: 8px;">Speak directly to ${displayName}</li>
      <li style="margin-bottom: 8px;">Confirm they have asked for the emergency to end</li>
      <li>Understand this will stop all further alerts</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin-bottom: 20px;">
    <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 18px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Confirm I have spoken to ${displayName}
    </a>
  </div>
  
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>If you cannot reach ${displayName}, DO NOT confirm.</strong> Emergency alerts will continue until confirmed.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
    <p>This notification was sent by aok - Personal Safety Check-In</p>
  </div>
</body>
</html>`;

    // Send email
    if (contact.email) {
      try {
        await sendEmail(contact.email, emailSubject, emailBody, emailHtml);
        emailsSent++;
        console.log(`[CONFIRM-REQUEST] Email sent to ${contact.email}`);
      } catch (error: any) {
        emailsFailed++;
        console.error(`[CONFIRM-REQUEST] Failed to send email to ${contact.email}:`, error?.message || error);
      }
    }
    
    // Send SMS
    if (contact.phone) {
      const smsMessage = `aok URGENT: ${displayName} requests emergency end. ALERTS CONTINUE until you confirm. Speak to them first, then confirm: ${confirmationUrl} ${smsLocationInfo}`.trim();
      const smsResult = await sendSMS(contact.phone, smsMessage);
      if (smsResult.success) {
        smsSent++;
        console.log(`[CONFIRM-REQUEST] SMS sent to ${contact.phone}`);
      } else {
        smsFailed++;
        console.error(`[CONFIRM-REQUEST] Failed to send SMS to ${contact.phone}:`, smsResult.error);
      }
    }
  }

  console.log(`[CONFIRM-REQUEST] Notifications sent - Emails: ${emailsSent}/${emailsSent + emailsFailed}, SMS: ${smsSent}/${smsSent + smsFailed}`);
  return { emailsSent, emailsFailed, smsSent, smsFailed };
}

// Sent to ALL contacts AFTER a contact confirms - final notification
export async function sendEmergencyEndedNotification(
  contacts: Contact[],
  user: User,
  confirmedByName: string,
  confirmationTime: Date
): Promise<{ emailsSent: number; emailsFailed: number; smsSent: number; smsFailed: number }> {
  const displayName = getUserDisplayName(user);
  
  let emailsSent = 0;
  let emailsFailed = 0;
  let smsSent = 0;
  let smsFailed = 0;
  
  const endTime = confirmationTime.toLocaleString('en-GB', { 
    dateStyle: 'full', 
    timeStyle: 'long' 
  });
  
  for (const contact of contacts) {
    const emailSubject = `Emergency ended for ${displayName}`;
    
    const emailBody = `Emergency ended at ${endTime} following confirmation by a trusted contact.

No further action is required.

- The aok Team`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-flex; align-items: center; gap: 8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 12 15 15 10"></polyline>
      </svg>
      <span style="font-size: 28px; font-weight: bold; color: #22c55e;">aok</span>
    </div>
  </div>
  
  <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 24px;">Emergency Ended</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">for ${displayName}</p>
  </div>
  
  <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
    <p style="margin: 0; font-size: 16px;">Emergency ended at <strong>${endTime}</strong></p>
    <p style="margin: 10px 0 0 0; color: #166534;">following confirmation by a trusted contact.</p>
  </div>
  
  <p style="color: #666; text-align: center;">No further action is required.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
    <p>This notification was sent by aok - Personal Safety Check-In</p>
  </div>
</body>
</html>`;

    // Send email
    if (contact.email) {
      try {
        await sendEmail(contact.email, emailSubject, emailBody, emailHtml);
        emailsSent++;
        console.log(`[EMERGENCY-ENDED] Email sent to ${contact.email}`);
      } catch (error: any) {
        emailsFailed++;
        console.error(`[EMERGENCY-ENDED] Failed to send email to ${contact.email}:`, error?.message || error);
      }
    }
    
    // Send SMS
    if (contact.phone) {
      const smsMessage = `aok: Emergency ended for ${displayName} at ${confirmationTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} following confirmation by a trusted contact.`;
      const smsResult = await sendSMS(contact.phone, smsMessage);
      if (smsResult.success) {
        smsSent++;
        console.log(`[EMERGENCY-ENDED] SMS sent to ${contact.phone}`);
      } else {
        smsFailed++;
        console.error(`[EMERGENCY-ENDED] Failed to send SMS to ${contact.phone}:`, smsResult.error);
      }
    }
  }

  console.log(`[EMERGENCY-ENDED] Notifications sent - Emails: ${emailsSent}/${emailsSent + emailsFailed}, SMS: ${smsSent}/${smsSent + smsFailed}`);
  return { emailsSent, emailsFailed, smsSent, smsFailed };
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string,
  userType: 'admin' | 'organisation' | 'individual' = 'individual'
): Promise<boolean> {
  const typeLabel = userType === 'admin' ? 'admin' : userType === 'organisation' ? 'organisation' : 'individual';
  const subject = `Reset your aok ${typeLabel} password`;
  const body = `Hi ${userName},

You requested to reset your aok ${typeLabel} password. Click the link below to set a new password:

${resetUrl}

This link will expire in 24 hours.

If you didn't request this, you can safely ignore this email.

- The aok Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-flex; align-items: center; gap: 8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M9 12l2 2 4-4"></path>
      </svg>
      <span style="font-size: 28px; font-weight: bold; color: #22c55e;">aok</span>
    </div>
  </div>
  
  <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} Password</h2>
  
  <p>Hi ${escapeHtml(userName)},</p>
  
  <p>You requested to reset your aok ${typeLabel} password. Click the button below to set a new password:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #22c55e;"><a href="${resetUrl}" style="color: #22c55e;">${resetUrl}</a></p>
  
  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
  
  <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    - The aok Team<br>
    Stay Connected, Stay Safe, Stay Well
  </p>
</body>
</html>`;

  try {
    await sendEmail(email, subject, body, html);
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
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `Reference ${user.referenceId}` 
    : displayName;

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
  const displayName = getUserDisplayName(user);
  const identifier = isOrganization 
    ? `${displayName} (Reference ID: ${user.referenceId})`
    : displayName;

  const subject = `aok Alert: ${identifier} has signed out`;
  
  // Include location information if available - use what3words
  let locationSection = "";
  if (location) {
    let what3wordsAddress: string | null = null;
    try {
      what3wordsAddress = await getWhat3WordsAddress(location.latitude, location.longitude);
    } catch (error) {
      console.error('[LOGOUT NOTIFICATION] Failed to get what3words address:', error);
    }
    
    if (what3wordsAddress) {
      const w3wUrl = `https://what3words.com/${what3wordsAddress}`;
      locationSection = `

LAST KNOWN LOCATION:
what3words: ///${what3wordsAddress}
View on map: ${w3wUrl}
`;
    } else {
      // Fallback to Google Maps only if what3words is unavailable
      const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      locationSection = `

LAST KNOWN LOCATION:
Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
View on map: ${mapsUrl}
`;
    }
  }
  
  const body = `Hello ${primaryContact.name},

This is an automated notification from aok.

${identifier} has signed out of their aok safety check-in account.
${locationSection}
IMPORTANT: While they are signed out, you will NOT receive any alerts if they miss a check-in or trigger an emergency.

This means their safety check-ins are currently paused and no notifications will be sent to you or any other emergency contacts.

If you are concerned about ${isOrganization ? "this user's" : `${displayName}'s`} wellbeing, please reach out to them directly.

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
  const directLoginUrl = `https://aok.care/org/client-login?ref=${referenceCode}`;
  
  const message = `Hi! ${organizationName} has registered you for aok safety check-ins.

Your code: ${referenceCode}

Get started: ${directLoginUrl}

After signing in, add aok to your home screen for the best experience.`;

  console.log(`[SMS INVITE] Sending app invite to ${phoneNumber} with code ${referenceCode}`);
  return await sendSMS(phoneNumber, message);
}

export async function sendStaffInviteSMS(
  phoneNumber: string,
  inviteCode: string,
  organizationName: string
): Promise<{ success: boolean; error?: string }> {
  const signUpUrl = `https://aok.care/register?staff=${inviteCode}`;
  
  const message = `Hi! ${organizationName} has invited you to join the aok safety app as a staff member.

Sign up here: ${signUpUrl}

No payment required - your access is covered by your organisation.`;

  console.log(`[SMS STAFF INVITE] Sending staff invite to ${phoneNumber} with code ${inviteCode}`);
  return await sendSMS(phoneNumber, message);
}

export async function sendEmergencyContactConfirmationForStaffInvite(
  contactName: string,
  contactEmail: string,
  staffName: string,
  organizationName: string
): Promise<{ sent: boolean; error?: string }> {
  const escapedContactName = escapeHtml(contactName);
  const escapedStaffName = escapeHtml(staffName);
  const escapedOrgName = escapeHtml(organizationName);

  const emailSubject = `Please confirm: Emergency contact request from aok`;

  const emailBody = `Hi ${contactName},

${organizationName} has invited ${staffName} to join aok, a personal safety check-in app, and has listed you as their emergency contact.

If ${staffName} misses a check-in during a lone working shift, you will be notified automatically via email, SMS, or phone call so you can check on their safety.

Once ${staffName} completes their registration, you will receive a separate confirmation email with a link to formally accept or decline this role.

If you have any questions, please contact ${organizationName} directly.

Thank you,
- The aok Team`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">Emergency Contact Notification</h2>
  
  <p>Hi ${escapedContactName},</p>
  
  <p><strong>${escapedOrgName}</strong> has invited <strong>${escapedStaffName}</strong> to join <strong>aok</strong>, a personal safety check-in app, and has listed you as their emergency contact.</p>
  
  <p>If ${escapedStaffName} misses a check-in during a lone working shift, you will be notified automatically via email, SMS, or phone call so you can check on their safety.</p>
  
  <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0;">
    <strong style="color: #1e40af;">What happens next?</strong>
    <p style="margin: 8px 0 0 0; color: #1e3a5f;">Once ${escapedStaffName} completes their registration, you will receive a separate confirmation email with a link to formally accept or decline this role.</p>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact ${escapedOrgName} directly.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 14px;">Thank you,<br>- The aok Team</p>
</body>
</html>`;

  try {
    await sendEmail(contactEmail, emailSubject, emailBody, htmlBody);
    console.log(`[NOTIFICATION] Staff invite EC confirmation email sent to ${contactEmail} for staff ${staffName}`);
    return { sent: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send email";
    console.error(`[NOTIFICATION] Failed to send staff invite EC confirmation to ${contactEmail}: ${errorMsg}`);
    return { sent: false, error: errorMsg };
  }
}

// Send reference code reminder SMS to org-managed client
export async function sendReferenceCodeSMS(
  phoneNumber: string,
  referenceCode: string,
  organizationName: string
): Promise<{ success: boolean; error?: string }> {
  const directLoginUrl = `https://aok.care/org/client-login?ref=${referenceCode}`;
  const message = `Hi from ${organizationName}. Your aok code is: ${referenceCode}

Sign in here: ${directLoginUrl}

If you have any issues, please contact your organisation.`;

  console.log(`[SMS REFERENCE] Sending reference code to ${phoneNumber}: ${referenceCode}`);
  return await sendSMS(phoneNumber, message);
}

/**
 * Send confirmation reminder SMS to contact approaching expiry
 */
export async function sendContactConfirmationReminder(
  contactPhone: string,
  contactName: string,
  userName: string,
  contactEmail: string
): Promise<{ success: boolean; error?: string }> {
  const message = `REMINDER: ${userName} has added you as an emergency contact on aok. You have less than 1 hour to confirm or the request will expire.

Please check the email sent to ${contactEmail} and click the confirmation link.

If you did not expect this, you can ignore this message.`;

  console.log(`[SMS REMINDER] Sending confirmation reminder to ${contactName} at ${contactPhone}`);
  return await sendSMS(contactPhone, message);
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

export async function sendPaymentFailedEmails(userEmail: string, userName: string): Promise<void> {
  const appName = "aok";
  const settingsUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://aok.replit.app'}/app/settings`;
  
  const userSubject = `${appName} - Action Required: Update Your Payment Details`;
  const userBody = `Hi ${userName || 'there'},

We were unable to process your payment for your ${appName} Complete Protection subscription.

To continue using ${appName} and keep your loved ones updated on your safety, please update your payment details as soon as possible.

Your account will remain blocked until payment details are updated.

Update payment details: ${settingsUrl}

If you have any questions, please don't hesitate to contact us.

Stay safe,
The ${appName} Team`;

  const userHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Action Required: Update Your Payment Details</h2>
      <p>Hi ${userName || 'there'},</p>
      <p>We were unable to process your payment for your <strong>${appName} Complete Protection</strong> subscription.</p>
      <p>To continue using ${appName} and keep your loved ones updated on your safety, please update your payment details as soon as possible.</p>
      <p style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
        <strong>Your account will remain blocked until payment details are updated.</strong>
      </p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${settingsUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Update Payment Details</a>
      </p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Stay safe,<br>The ${appName} Team</p>
    </div>`;

  try {
    await sendEmail(userEmail, userSubject, userBody, userHtml);
    console.log(`[PAYMENT FAILED] Sent payment failure email to user: ${userEmail}`);
  } catch (error) {
    console.error(`[PAYMENT FAILED] Failed to send email to user ${userEmail}:`, error);
  }

  try {
    const { storage } = await import('./storage');
    const user = await storage.getUserByEmail(userEmail);
    if (user) {
      const contacts = await storage.getContacts(user.id);
      const primaryContact = contacts.find((c: any) => c.isPrimary && c.isConfirmed);
      
      if (primaryContact && primaryContact.email) {
        const contactSubject = `${appName} - ${userName || 'Your contact'}'s payment requires attention`;
        const contactBody = `Hi ${primaryContact.name},

You are the primary emergency contact for ${userName || 'a user'} on ${appName}.

We wanted to let you know that their payment for ${appName} Complete Protection was unsuccessful. Their account will be temporarily blocked until payment details are updated.

This means they may not be able to check in or send emergency alerts during this time.

If you're in contact with them, please remind them to update their payment details.

Best regards,
The ${appName} Team`;

        const contactHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Payment Attention Required</h2>
            <p>Hi ${primaryContact.name},</p>
            <p>You are the primary emergency contact for <strong>${userName || 'a user'}</strong> on ${appName}.</p>
            <p>We wanted to let you know that their payment for ${appName} Complete Protection was unsuccessful. Their account will be temporarily blocked until payment details are updated.</p>
            <p style="background-color: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <strong>This means they may not be able to check in or send emergency alerts during this time.</strong>
            </p>
            <p>If you're in contact with them, please remind them to update their payment details.</p>
            <p>Best regards,<br>The ${appName} Team</p>
          </div>`;

        await sendEmail(primaryContact.email, contactSubject, contactBody, contactHtml);
        console.log(`[PAYMENT FAILED] Sent payment failure email to primary contact: ${primaryContact.email}`);
      }
    }
  } catch (error) {
    console.error(`[PAYMENT FAILED] Failed to send email to primary contact:`, error);
  }
}

/**
 * Send a welcome email to a new individual subscriber
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string | null
): Promise<boolean> {
  const recipientName = name?.trim() || 'there';
  const subject = 'Welcome to aok - Your Personal Safety Companion';
  
  const htmlEmail = createBrandedEmail({
    recipientName,
    subject,
    alertType: 'welcome',
    mainContent: `
      <p style="margin: 0 0 16px 0;">Thank you for joining <strong>aok</strong> - we're thrilled to have you!</p>
      
      <p style="margin: 0 0 16px 0;">aok is designed to give you and your loved ones peace of mind through simple, reliable safety check-ins.</p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #166534;">Here's how to get started:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #15803d;">
          <li style="margin-bottom: 12px;"><strong>Set your check-in schedule</strong> - Choose how often you'd like to check in (1-48 hours)</li>
          <li style="margin-bottom: 12px;"><strong>Add your emergency contacts</strong> - They'll be notified if you miss a check-in or trigger an SOS</li>
          <li style="margin-bottom: 12px;"><strong>Mark up to 3 as Primary</strong> - Primary contacts receive every successful check-in notification</li>
          <li style="margin-bottom: 0;"><strong>Complete your first check-in</strong> - Just tap the check-in button when prompted</li>
        </ol>
      </div>
      
      <p style="margin: 0 0 16px 0;"><strong>Need help?</strong> Visit our FAQ section or reach out to our support team at any time.</p>
      
      <p style="margin: 0;">Stay safe!</p>
    `,
    ctaButton: {
      text: 'Open aok Dashboard',
      url: 'https://aok.care/app'
    },
    customFooterNote: "We're here to help you stay connected and protected."
  });
  
  const plainBody = `Hi ${recipientName},

Thank you for joining aok - we're thrilled to have you!

aok is designed to give you and your loved ones peace of mind through simple, reliable safety check-ins.

HERE'S HOW TO GET STARTED:

1. Set your check-in schedule - Choose how often you'd like to check in (1-48 hours)
2. Add your emergency contacts - They'll be notified if you miss a check-in or trigger an SOS
3. Mark up to 3 as Primary - Primary contacts receive every successful check-in notification
4. Complete your first check-in - Just tap the check-in button when prompted

Need help? Visit our FAQ section or reach out to our support team at any time.

Stay safe!

- The aok Team
https://aok.care/app`;

  try {
    await sendEmail(email, subject, plainBody, htmlEmail);
    console.log(`[WELCOME] Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[WELCOME] Failed to send welcome email to ${email}:`, error);
    return false;
  }
}

export async function sendSmsCheckinLink(
  phoneNumber: string,
  userName: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const checkinUrl = `https://aok.care/sms-checkin/${token}`;

  const message = `Hi ${userName.split(' ')[0]}, your aok check-in is overdue.

Tap here to check in now:
${checkinUrl}

This link expires in 48 hours. If you're safe, just tap the button.`;

  console.log(`[SMS CHECK-IN] Sending check-in link to ${phoneNumber}`);
  return await sendSMS(phoneNumber, message);
}

export async function sendTeamMemberInviteEmail(
  email: string,
  name: string,
  inviteCode: string
): Promise<boolean> {
  try {
    const acceptUrl = `https://aok.care/org/team-invite?code=${inviteCode}`;
    const firstName = name.split(" ")[0];

    await sendEmail(
      email,
      `You've been invited to join an aok organisation`,
      `You've been invited to join an organisation on aok. Visit ${acceptUrl} to accept.`,
      `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">aok</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">Personal Safety Platform</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">Hello ${firstName},</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
            You've been invited to join an organisation on aok as a team member.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
            Click the button below to set up your account and get started:
          </p>
          <div style="text-align: center;">
            <a href="${acceptUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
              Accept Invite
            </a>
          </div>
        </div>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
      `
    );

    console.log(`[TEAM INVITE] Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[TEAM INVITE] Failed to send invite email to ${email}:`, error);
    return false;
  }
}

export async function sendAdminInviteEmail(
  email: string,
  name: string,
  inviteCode: string
): Promise<boolean> {
  try {
    const acceptUrl = `https://aok.care/admin/invite?code=${inviteCode}`;
    const firstName = name.split(" ")[0];

    await sendEmail(
      email,
      `You've been invited to join the aok admin team`,
      `You've been invited to join the aok admin team. Visit ${acceptUrl} to accept.`,
      `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">aok</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">Admin Platform</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 16px 0;">Hello ${firstName},</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
            You've been invited to join the aok admin team. Click the button below to set up your account:
          </p>
          <div style="text-align: center;">
            <a href="${acceptUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
              Accept Admin Invite
            </a>
          </div>
        </div>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
      `
    );

    console.log(`[ADMIN INVITE] Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[ADMIN INVITE] Failed to send invite email to ${email}:`, error);
    return false;
  }
}
