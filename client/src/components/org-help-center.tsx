import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, X, Users, UserPlus, Radio, Shield, FileText,
  ChevronRight, ArrowLeft, Settings, HelpCircle, BarChart3
} from "lucide-react";

interface HelpTopic {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string[];
  relatedTopics?: string[];
}

const HELP_CATEGORIES = [
  { id: "clients", label: "Clients", icon: Users, color: "text-blue-600" },
  { id: "staff", label: "Staff", icon: UserPlus, color: "text-green-600" },
  { id: "lone-worker", label: "Lone Worker", icon: Radio, color: "text-orange-600" },
  { id: "safeguarding", label: "Safeguarding", icon: Shield, color: "text-red-600" },
  { id: "analytics", label: "Analytics", icon: BarChart3, color: "text-purple-600" },
  { id: "reports", label: "Reports", icon: FileText, color: "text-muted-foreground" },
  { id: "account", label: "Account & Settings", icon: Settings, color: "text-indigo-600" },
];

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "add-client",
    title: "Adding a new client",
    category: "clients",
    keywords: ["add", "new", "client", "create", "register", "enrol", "enroll", "invite"],
    content: [
      "From your organisation dashboard, tap the **Add Client** button.",
      "Enter the client's email address and optionally give them a nickname for easy identification.",
      "Select which bundle to assign them to — each bundle has a set number of seats.",
      "The client will receive an SMS with a login link and unique reference number.",
      "Clients log in using their reference number — no complex email/password needed.",
    ],
    relatedTopics: ["bundles-seats", "client-archive", "send-ref-reminder"],
  },
  {
    id: "alerts-emergency",
    title: "Alerts — how emergency notifications work",
    category: "clients",
    keywords: ["alert", "notification", "emergency", "sms", "email", "call", "voice", "notify", "missed"],
    content: [
      "When a client misses a check-in or triggers an emergency, aok sends alerts through multiple channels:",
      "**Email** — all confirmed contacts receive an email with the client's details and, for emergencies, their GPS location and what3words address.",
      "**SMS** — mobile contacts receive a text message alert.",
      "**Voice call** — landline contacts receive an automated voice call explaining the situation.",
      "Alerts are only sent to contacts who have confirmed their willingness to be an emergency contact (GDPR requirement).",
      "All alerts are logged in the system for your records.",
    ],
    relatedTopics: ["emergency-contacts-client", "emergency-deactivate"],
  },
  {
    id: "audit-trail-overview",
    title: "Audit trail — what gets logged",
    category: "account",
    keywords: ["audit", "trail", "log", "record", "compliance", "gdpr", "history", "actions", "activity log", "filter", "search", "hash", "integrity", "export", "csv", "pdf", "retention"],
    content: [
      "aok automatically logs all significant actions for compliance and accountability. You can view the full **Activity Log** on your main dashboard by clicking the **Show** button.",
      "**Client actions** — adding, archiving, restoring, editing details, updating emergency contacts, resetting passwords, resetting schedulers, updating schedules, changing status, toggling features, and deactivating emergency alerts.",
      "**Staff actions** — team invitations sent, accepted, revoked, role changes, status changes, and removals.",
      "**Lone worker** — session starts, check-ins, completions, panic alerts, and resolutions.",
      "**Safeguarding** — incidents reported, welfare concerns raised, case files and notes created, escalation rules managed, risk reports generated.",
      "**Admin actions** — bundle assignments, tier permission changes, organisation feature default changes.",
      "Every audit record includes who performed the action, when, what type of action it was, and the details of what changed.",
      "You can **filter** by type (client management, emergency contacts, incidents, welfare concerns, etc.) and by action (created, updated, deleted, archived, etc.). You can also **search** by keyword across all records.",
      "Click the expand arrow on any entry to see the full detail of what was changed, including previous values where applicable.",
      "Audit records use **tamper-evident hash chains** — every entry is cryptographically linked to the previous one using SHA-256 hashing. If any record is altered, the chain breaks and is immediately detectable.",
      "You can **export** your audit trail as a **CSV** file or generate a **Summary PDF** report directly from the Activity Log section. Use the **Export CSV** and **Summary PDF** buttons in the toolbar.",
      "Use the **Verify Integrity** button to run a full hash chain check across all your audit records. This confirms no records have been tampered with.",
      "**Retention policies** let you control how long audit data is kept. Configure your retention period (1 to 10 years) from the **Retention Policy** button in the Activity Log. Expired records are automatically cleaned up daily.",
      "The Activity Log supports **pagination** for browsing through large numbers of records efficiently.",
    ],
    relatedTopics: ["lone-worker-audit", "audit-integrity", "audit-retention", "audit-exports"],
  },
  {
    id: "audit-integrity",
    title: "Audit trail — integrity verification",
    category: "account",
    keywords: ["audit", "integrity", "verify", "hash", "chain", "tamper", "check", "sha256", "cryptographic", "broken"],
    content: [
      "Every audit record in aok is protected by a **tamper-evident hash chain** using SHA-256 cryptographic hashing.",
      "Each new entry is linked to the one before it. If any entry is altered, moved, or deleted, the chain breaks and the system detects it immediately.",
      "To verify your audit trail, open the **Activity Log** on your dashboard, click **Show**, then tap the **Verify Integrity** button.",
      "The system checks every record in the chain and reports whether the trail is intact or if any issues were found.",
      "If the chain is valid, you'll see a confirmation message with the total number of records checked.",
      "If an issue is found, the system identifies the first record where the chain broke, including its date and ID.",
      "This feature is designed for **board-level assurance** — providing evidence that your safeguarding records have not been tampered with.",
      "Integrity verification is particularly important for regulatory audits, insurer reviews, and legal proceedings.",
    ],
    relatedTopics: ["audit-trail-overview", "audit-retention", "safeguarding-compliance-framework"],
  },
  {
    id: "audit-retention",
    title: "Audit trail — retention policies",
    category: "account",
    keywords: ["audit", "retention", "policy", "days", "years", "delete", "cleanup", "purge", "data", "gdpr", "limitation act"],
    content: [
      "aok allows you to configure how long audit trail data is retained to meet your regulatory requirements.",
      "Open the **Activity Log** on your dashboard, click **Show**, then tap the **Retention Policy** button.",
      "Choose a retention period from the dropdown — options range from **1 year** to **10 years**.",
      "The default retention period is **6 years**, aligned with the Limitation Act 1980 for general records.",
      "Longer retention periods (7-10 years) are available for regulated environments, children's services, or where extended record-keeping is required.",
      "Once set, expired audit records are **automatically cleaned up daily**. Records older than your chosen retention period are permanently removed.",
      "The hash chain integrity system handles retention purges gracefully — verification continues to work correctly even after older records have been removed.",
      "Changes to retention settings are themselves recorded in the audit trail for accountability.",
    ],
    relatedTopics: ["audit-trail-overview", "audit-integrity", "gdpr-compliance"],
  },
  {
    id: "audit-exports",
    title: "Audit trail — CSV and PDF exports",
    category: "reports",
    keywords: ["audit", "export", "csv", "pdf", "download", "report", "summary", "spreadsheet", "evidence", "compliance"],
    content: [
      "You can export your audit trail data in two formats for compliance, reporting, and evidence purposes.",
      "**CSV Export** — tap the **Export CSV** button in the Activity Log toolbar to download a spreadsheet of all audit records. This includes timestamps, actions, user details, and change data. Ideal for detailed analysis in Excel or similar tools.",
      "**Summary PDF** — tap the **Summary PDF** button to generate a formatted PDF report summarising your organisation's audit activity. Suitable for board reports, compliance reviews, and insurer submissions.",
      "Both exports respect any active filters or date ranges you've applied in the Activity Log.",
      "Exported files are generated on demand and downloaded directly to your device.",
      "These exports provide the evidential documentation required for regulatory audits, legal proceedings, and organisational governance reviews.",
    ],
    relatedTopics: ["audit-trail-overview", "report-export", "reports-available"],
  },
  {
    id: "safeguarding-compliance-framework",
    title: "Safeguarding Compliance Framework",
    category: "account",
    keywords: ["safeguarding", "compliance", "framework", "board", "governance", "audit", "retention", "escalation", "evidence", "legal", "insurer", "regulatory"],
    content: [
      "The **Board-Level Safeguarding, Audit & Compliance Framework** is a comprehensive document outlining the structural safeguarding architecture underpinning aok.",
      "It is prepared for **Supported Housing Providers, Housing Associations, Charitable Organisations, Universities, Local Authorities, and Regulated Care Environments**.",
      "The framework covers eight key areas:",
      "1. **Strategic Safeguarding Positioning** — aok as compliance-enabling infrastructure with demonstrable duty-of-care evidence.",
      "2. **Audit Architecture & Record Integrity** — server-side timestamping, append-only logs, tamper-evident hashing, and full traceability.",
      "3. **Activity Monitoring & Escalation Controls** — structured activity lifecycle tracking, GPS capture, automated escalation, and resolution recording.",
      "4. **Governance & Organisational Oversight** — dashboard visibility, role-based access, export logging, and organisation-wide reporting.",
      "5. **Reporting & Evidential Documentation** — PDF and CSV exports, incident reports, monthly summaries, and date-range filtered extractions.",
      "6. **Data Security & Compliance Controls** — encryption, controlled export permissions, integrity verification, and GDPR-aligned processing.",
      "7. **Data Retention Framework** — minimum 6 years aligned with Limitation Act 1980, configurable policies, and structured anonymisation.",
      "8. **Organisational Risk Mitigation** — evidential safeguarding trail, insurer confidence, reduced negligence exposure, and transparent governance.",
      "The full document can be viewed and exported as PDF from the **Admin Dashboard** under the **Documents** tab.",
    ],
    relatedTopics: ["audit-trail-overview", "audit-integrity", "audit-retention", "gdpr-compliance"],
  },
  {
    id: "analytics-overview",
    title: "Analytics dashboard",
    category: "analytics",
    keywords: ["analytics", "dashboard", "charts", "data", "insights", "patterns", "statistics", "overview"],
    content: [
      "The **Analytics** page gives you a clear picture of safety patterns and active emergencies across your clients.",
      "Access it by tapping the **Analytics** button on your organisation dashboard.",
      "The page has three tabs: **Peak Times**, **Alert Heatmap**, and **Active SOS Alerts**.",
      "All data updates automatically when you visit the page. No setup is needed.",
    ],
    relatedTopics: ["analytics-peak-times", "analytics-heatmap", "analytics-active-sos"],
  },
  {
    id: "analytics-peak-times",
    title: "Analytics — peak times",
    category: "analytics",
    keywords: ["peak", "times", "hours", "days", "patterns", "emergency", "alerts", "missed", "check-ins", "bar chart", "graph"],
    content: [
      "The **Peak Times** tab shows bar charts breaking down when emergency alerts and missed check-ins happen most often.",
      "Charts are shown for both **hour of day** (0-23) and **day of week** (Mon-Sun).",
      "Use this to identify patterns — for example, if emergencies cluster in evenings or missed check-ins spike on weekends.",
      "This can help you adjust staffing, schedule more check-ins during risky periods, or provide additional support at peak times.",
    ],
    relatedTopics: ["analytics-overview", "analytics-heatmap"],
  },
  {
    id: "analytics-heatmap",
    title: "Analytics — alert heatmap",
    category: "analytics",
    keywords: ["heatmap", "map", "location", "geography", "where", "hotspot", "gps", "markers", "emergency"],
    content: [
      "The **Alert Heatmap** tab shows a map with markers for each location where an emergency alert has been triggered.",
      "Red circles represent alert locations. Larger circles indicate more alerts from that area.",
      "Tap a marker to see how many alerts occurred there and the what3words address if available.",
      "Use this to spot geographic hotspots and take preventative action — such as reviewing routes or arranging transport in high-risk areas.",
    ],
    relatedTopics: ["analytics-overview", "analytics-active-sos"],
  },
  {
    id: "analytics-active-sos",
    title: "Analytics — active SOS alerts",
    category: "analytics",
    keywords: ["active", "sos", "emergency", "live", "current", "real-time", "alerts", "urgent"],
    content: [
      "The **Active SOS Alerts** tab shows any currently active emergency alerts from your clients.",
      "Each alert card displays the client name, reference code, phone number, how long ago it was triggered, and the GPS coordinates.",
      "If a what3words address is available, you can tap the link to view the precise location.",
      "When there are no active alerts, you'll see a reassuring confirmation that all clients are safe.",
    ],
    relatedTopics: ["analytics-overview", "analytics-heatmap"],
  },
  {
    id: "bulk-import-clients",
    title: "Bulk import — adding clients via spreadsheet",
    category: "clients",
    keywords: ["bulk", "import", "spreadsheet", "excel", "upload", "multiple", "batch", "csv", "mass"],
    content: [
      "You can add multiple clients at once by uploading an Excel spreadsheet.",
      "From your organisation dashboard, tap the **Bulk Import** option.",
      "Prepare a spreadsheet with columns for client name, phone number, date of birth, emergency contacts, and optional feature settings.",
      "Upload the file and the system will process each row, creating client records and sending SMS invitations.",
      "You'll see a summary of successful imports and any errors (e.g. duplicate phone numbers or invalid data).",
      "This is useful when onboarding a large group of clients at once.",
    ],
    relatedTopics: ["add-client", "bundles-seats"],
  },
  {
    id: "bulk-import-staff",
    title: "Bulk import — adding staff via spreadsheet",
    category: "staff",
    keywords: ["bulk", "import", "spreadsheet", "excel", "upload", "staff", "batch", "mass", "invite"],
    content: [
      "You can invite multiple staff members at once by uploading an Excel spreadsheet.",
      "From the **Lone Worker Hub**, tap **Bulk Import** to upload a file.",
      "Prepare a spreadsheet with columns for staff name, phone number, and optionally email address.",
      "Each row will generate an SMS invitation with a unique invite link.",
      "You'll see a summary of successful invitations and any errors.",
    ],
    relatedTopics: ["invite-staff", "team-roles"],
  },
  {
    id: "bundles-seats",
    title: "Bundles and seats — how they work",
    category: "account",
    keywords: ["bundle", "bundles", "seat", "seats", "capacity", "usage", "how many", "limit", "purchase", "buy"],
    content: [
      "Your organisation purchases **bundles** of seats from the aok team.",
      "Each seat allows one client or staff member to use the platform at no cost to them.",
      "You can view your bundle usage on the dashboard — how many seats are used vs. available.",
      "When a client is archived, their seat is freed up for another person.",
      "If you need more seats, contact the aok team to add more bundles to your organisation.",
    ],
    relatedTopics: ["add-client", "client-archive"],
  },
  {
    id: "client-archive",
    title: "Client archiving and restoring",
    category: "clients",
    keywords: ["archive", "remove", "delete", "restore", "soft delete", "archived", "unarchive"],
    content: [
      "When you remove a client, they are **archived** rather than permanently deleted.",
      "This preserves their data and history for your records.",
      "Archived clients appear in the **Archived** tab on your dashboard.",
      "You can restore an archived client at any time using the **Restore** button — they'll be brought back with their original settings.",
      "Archiving a client frees up their seat in the bundle for another person.",
    ],
    relatedTopics: ["add-client", "bundles-seats"],
  },
  {
    id: "client-features",
    title: "Client feature toggles",
    category: "clients",
    keywords: ["feature", "toggle", "enable", "disable", "wellbeing", "ai", "shake", "mood", "pet", "will", "control", "customise"],
    content: [
      "You can customise which features each client has access to:",
      "**Wellbeing AI** — AI chat companion for emotional support.",
      "**Shake to SOS** — shake the phone to trigger an emergency alert.",
      "**Mood Tracking** — daily mood logging and pattern tracking.",
      "**Pet Protection** — store pet care details for emergencies. Clients can also upload insurance documents (PDF, JPG, PNG, DOC) for each pet — viewable, downloadable, and removable from the expanded pet card.",
      "**Important Documents** — securely store travel insurance, wills, healthcare directives, and any other important paperwork.",
      "**Fitness Tracking** — record runs, walks, and rides with GPS tracking, route maps, and social features. For personal wellbeing only — does not provide medical advice or health monitoring.",
      "**Route Planning** — plan walks, runs, and cycle routes with weather forecasts, safety cues, and sharing with contacts. Part of Fitness Tracking.",
      "**Activities Tracker** — log everyday activities (walking, shopping, errands, appointments, visiting, commuting, dog walking, exercise, first dates) with GPS tracking and automatic contact notification if the expected duration plus 10-minute grace period expires. A **low battery alert** is automatically sent to primary contacts if the client's device drops below 20% during an active activity.",
      "**Emergency Recording** — activate camera and microphone during emergency alerts (opt-in, off by default).",
      "Toggle these on or off from the client's detail view on your dashboard.",
      "Changes take effect immediately — the client will see features appear or disappear on their next visit.",
    ],
    relatedTopics: ["edit-client"],
  },
  {
    id: "client-schedule",
    title: "Check-in schedule — setting and changing",
    category: "clients",
    keywords: ["schedule", "interval", "frequency", "time", "hours", "check-in", "change schedule", "daily", "custom"],
    content: [
      "Open the client's details from your dashboard.",
      "Tap the **Schedule** or **Edit Schedule** option.",
      "Set the start time (when their daily schedule begins) and the interval (1 to 48 hours).",
      "For example: start at 10:00, every 24 hours means they check in once daily at 10am.",
      "For higher-risk clients, you might set a shorter interval such as every 4 or 8 hours.",
      "The new schedule takes effect from the next check-in cycle.",
    ],
    relatedTopics: ["monitor-status", "pause-client"],
  },
  {
    id: "compliance-consent",
    title: "Compliance consent — what clients agree to",
    category: "clients",
    keywords: ["compliance", "consent", "onboarding", "disclaimer", "fitness", "emergency", "limitation", "checkbox", "legal"],
    content: [
      "Every client must complete a **compliance consent** step during account creation.",
      "This is a non-skippable onboarding step that includes three separate checkboxes:",
      "1. **Fitness disclaimer** — acknowledges that fitness and activity tracking is for personal wellbeing only and does not provide medical advice or health monitoring.",
      "2. **No-reliance clause** — acknowledges that aok is a communication and check-in tool, not a safety guarantee.",
      "3. **Emergency limitation** — acknowledges that aok relies on network, device, battery, GPS, and software updates and may not function in all circumstances.",
      "All three must be accepted before the account is created. The date and time of consent are recorded for your compliance records.",
      "For organisation-managed clients registered via your dashboard, consent is captured when the client first activates their account.",
    ],
    relatedTopics: ["service-limitation", "gdpr-compliance"],
  },
  {
    id: "contact-confirmation",
    title: "Contact confirmation process",
    category: "clients",
    keywords: ["confirm", "confirmation", "email", "verify", "10 minutes", "expired", "resend", "gdpr"],
    content: [
      "For GDPR compliance, each emergency contact must confirm they agree to receive alerts.",
      "When added, the contact receives an email with a confirmation link.",
      "They have **10 minutes** to confirm. If it expires, you can resend the confirmation.",
      "Contacts will not receive any alerts until they have confirmed.",
      "This applies to both individual user contacts and organisation-managed client contacts.",
    ],
    relatedTopics: ["emergency-contacts-client"],
  },
  {
    id: "dashboard-overview",
    title: "Dashboard — understanding the overview",
    category: "clients",
    keywords: ["dashboard", "overview", "home", "main", "summary", "at a glance"],
    content: [
      "Your organisation dashboard gives you an at-a-glance view of all your clients.",
      "**Client cards** show each person's name, check-in status, and key details.",
      "**Status indicators** — green (safe), yellow (pending), red (overdue), flashing red (active emergency).",
      "**Bundle usage** shows how many seats are used out of your total allocation.",
      "**Navigation** along the top or side lets you access Lone Worker, Safeguarding, Team, and Reports.",
      "Use the tabs to switch between **Active**, **Paused**, and **Archived** clients.",
    ],
    relatedTopics: ["monitor-status", "bundles-seats"],
  },
  {
    id: "edit-client",
    title: "Editing a client's details",
    category: "clients",
    keywords: ["edit", "update", "change", "nickname", "name", "phone", "modify", "client details"],
    content: [
      "Click on the client card on your dashboard, then tap the **Edit** button.",
      "You can update their nickname, name, and phone number.",
      "Changes take effect immediately — the client doesn't need to do anything.",
    ],
    relatedTopics: ["client-schedule", "client-features"],
  },
  {
    id: "emergency-contacts-client",
    title: "Emergency contacts — managing for clients",
    category: "clients",
    keywords: ["emergency", "contact", "contacts", "add contact", "client contact", "notification", "mobile", "landline"],
    content: [
      "You can view and manage emergency contacts for any client from their detail view.",
      "Tap the **Emergency Contacts** button to see their current contacts.",
      "Each contact must confirm they're willing to be an emergency contact via email before they receive alerts.",
      "Contact types:",
      "**Mobile** — receives alerts via SMS and email.",
      "**Landline** — receives alerts via automated voice call and email.",
      "You can add, edit, or remove contacts on behalf of clients.",
    ],
    relatedTopics: ["contact-confirmation", "alerts-emergency"],
  },
  {
    id: "emergency-deactivate",
    title: "Emergency alert — deactivating",
    category: "clients",
    keywords: ["deactivate", "emergency", "alert", "cancel", "stop", "alarm", "active emergency", "resolve"],
    content: [
      "If a client has triggered an emergency alert and the situation has been resolved, you can deactivate it.",
      "Clients with active emergencies show a flashing red alert icon on the dashboard.",
      "When a client requests to end their emergency (by holding the deactivate button), their emergency contacts receive a confirmation request. The emergency only fully ends once a contact confirms they have spoken to the client and they are safe.",
      "Organisation admins can also deactivate a client's emergency from the dashboard by opening the client's details and tapping **Deactivate Emergency**.",
      "All deactivations are logged in the audit trail for your records.",
    ],
    relatedTopics: ["alerts-emergency", "safeguarding-incidents"],
  },
  {
    id: "emergency-recording",
    title: "Emergency recording — enabling for clients",
    category: "clients",
    keywords: ["emergency", "recording", "camera", "microphone", "video", "audio", "record", "capture", "evidence", "opt-in"],
    content: [
      "Emergency recording is an opt-in feature that activates a client's phone camera and microphone when an emergency alert is triggered.",
      "This feature is **off by default** and must be explicitly enabled.",
      "To enable it for a client, open their detail view on your dashboard, tap **Manage Features**, and toggle on **Emergency Recording**.",
      "When enabled, if the client triggers an emergency alert, their device will automatically begin recording audio and video.",
      "Recordings are **encrypted** and stored securely in the cloud — they are **not saved to the client's phone camera roll or gallery**. They are only shared with the client's confirmed emergency contacts.",
      "Recordings are retained for **90 days** and then automatically deleted.",
      "Clients can view, download, and delete their saved recordings from their **Settings** page under **Saved Recordings**. They can also enable or disable this feature from there.",
      "This feature is designed to capture evidence during emergencies while respecting privacy — recordings are never accessible to organisation staff, only to the client's own emergency contacts.",
    ],
    relatedTopics: ["client-features", "alerts-emergency", "gdpr-compliance"],
  },
  {
    id: "escalation-rules",
    title: "Escalation rules — automatic triggers",
    category: "safeguarding",
    keywords: ["escalation", "automatic", "trigger", "rule", "alert", "missed", "sos", "threshold", "auto"],
    content: [
      "You can set up automated escalation rules that trigger when certain thresholds are met.",
      "For example, escalation can be triggered by:",
      "A certain number of missed check-ins within a time period.",
      "SOS or emergency alerts being triggered.",
      "A specified number of logged safeguarding incidents.",
      "When an escalation triggers, the system automatically creates a risk report for review.",
      "Configure rules from the **Safeguarding Hub** under the **Escalation Rules** section.",
    ],
    relatedTopics: ["safeguarding-cases", "safeguarding-incidents"],
  },
  {
    id: "feature-control",
    title: "Feature control — what you can manage",
    category: "account",
    keywords: ["feature", "manage", "control", "settings", "organisation", "options", "capabilities"],
    content: [
      "As an organisation, you have control over several aspects of the platform:",
      "**Per-client feature toggles** — enable or disable individual features for each client.",
      "**Check-in schedules** — set custom intervals and start times per client.",
      "**Emergency contacts** — add, edit, and manage contacts on behalf of clients.",
      "**Staff invitations** — invite and manage lone worker staff.",
      "**Safeguarding** — log incidents, manage case files, set escalation rules.",
      "**Reports** — generate and export PDF reports for compliance.",
    ],
    relatedTopics: ["client-features", "client-schedule"],
  },
  {
    id: "gdpr-compliance",
    title: "GDPR and data compliance",
    category: "account",
    keywords: ["gdpr", "data", "privacy", "compliance", "regulation", "protection", "consent", "legal"],
    content: [
      "aok is built with GDPR compliance at its core:",
      "**Contact consent** — emergency contacts must actively confirm before receiving any alerts.",
      "**Data minimisation** — only essential information is collected and stored.",
      "**AI privacy** — wellbeing AI conversations are ephemeral and not stored.",
      "**Audit trail** — all actions are logged but cannot be tampered with.",
      "**Archiving** — client data can be archived and restored, with full control over retention.",
      "**Right to access** — client data can be viewed and exported at any time.",
    ],
    relatedTopics: ["ip-ownership-agreement", "nda-confidentiality"],
  },
  {
    id: "getting-started-org",
    title: "Getting started as an organisation",
    category: "account",
    keywords: ["getting started", "setup", "begin", "first", "new organisation", "onboarding", "start"],
    content: [
      "Welcome to aok. Here's how to get your organisation set up:",
      "1. Log in to your organisation portal using the credentials provided by the aok team.",
      "2. Review your **bundle allocation** — how many seats you have available.",
      "3. **Add your first clients** by tapping the Add Client button on the dashboard.",
      "4. **Set check-in schedules** for each client based on their needs.",
      "5. **Manage emergency contacts** for each client.",
      "6. Optionally, **invite staff** for lone worker protection.",
      "7. Explore the **Safeguarding Hub** for incident reporting and case management.",
    ],
    relatedTopics: ["add-client", "bundles-seats", "invite-staff"],
  },
  {
    id: "help-centre-about",
    title: "Help centre — about this guide",
    category: "account",
    keywords: ["help", "guide", "support", "information", "about", "how to use"],
    content: [
      "This help centre is your quick reference for managing your organisation on aok.",
      "**Search** — type any keyword to find relevant topics instantly.",
      "**A-Z index** — tap any letter to jump straight to topics starting with that letter.",
      "**Categories** — filter by area (Clients, Staff, Lone Worker, Safeguarding, Reports, Account).",
      "**Related topics** — at the bottom of each topic, find links to related subjects.",
      "This guide is kept up to date with the latest platform features and changes.",
    ],
  },
  {
    id: "ip-ownership-agreement",
    title: "IP Ownership Agreement",
    category: "account",
    keywords: ["ip", "intellectual property", "ownership", "agreement", "legal", "licence", "rights", "naiyatech"],
    content: [
      "The **IP Ownership Agreement** is a legal document that governs intellectual property rights between Naiyatech Ltd and licensees of the A-OK platform.",
      "All intellectual property relating to A-OK — including software, workflows, UI/UX, logic, data structures, analytics, reports, trademarks, and branding — remains the exclusive property of Naiyatech Ltd.",
      "Licensees are granted a limited, non-exclusive, non-transferable, revocable licence solely to use A-OK.",
      "Feedback, suggestions, or derivative works provided by the Licensee automatically vest in Naiyatech Ltd.",
      "Restrictions include not developing competing products, not disclosing technical or commercial details, and not granting access to third parties.",
      "IP ownership and restriction clauses survive termination indefinitely.",
      "This agreement is governed by the laws of **England and Wales**.",
      "View the full document at **/ip-ownership** from the site footer.",
    ],
    relatedTopics: ["nda-confidentiality", "gdpr-compliance"],
  },
  {
    id: "invite-staff",
    title: "Inviting staff members",
    category: "staff",
    keywords: ["invite", "staff", "new", "add", "lone worker", "register", "sms", "invitation", "supervisor", "country code", "international"],
    content: [
      "Go to the **Lone Worker Hub** from your dashboard navigation.",
      "Tap the **Invite Staff** button.",
      "Enter the staff member's name and phone number. Use the country code selector to set the correct international prefix (UK +44 is the default).",
      "Leading zeros are automatically removed — so you can enter '07700 900123' and it will be stored as '+447700900123'.",
      "They'll receive an SMS with a unique invite link to create their account.",
      "Staff registration is free — their seat is covered by your organisation's bundle.",
      "You can track, resend, or revoke invitations at any time.",
    ],
    relatedTopics: ["team-roles", "lone-worker-overview", "lone-worker-supervisor"],
  },
  {
    id: "lone-worker-supervisor",
    title: "Supervisor details and SMS verification",
    category: "lone-worker",
    keywords: ["supervisor", "edit", "sms", "verify", "verification", "phone", "primary contact", "details", "name", "email", "update"],
    content: [
      "Each lone worker can have a designated **supervisor** — this is the person who receives alerts if the worker misses a check-in or triggers a panic alert.",
      "Supervisors act as the **primary contact** for missed check-ins and emergencies. Emergency contacts are secondary and only receive alerts during emergencies.",
      "To add or edit supervisor details, go to the **Lone Worker Hub** and open the **Staff** tab.",
      "Find the staff member and tap the **Edit** button on their card.",
      "You can set the supervisor's name, phone number, and email address.",
      "When entering a supervisor phone number, use the country code selector to set the correct international prefix.",
      "Supervisor phone numbers must be **verified via SMS** before they can be saved. Tap **Send Code**, enter the 6-digit code received, then tap **Verify**.",
      "Once verified, the supervisor's details are saved and they will receive alerts for that worker.",
    ],
    relatedTopics: ["invite-staff", "lone-worker-monitor", "call-supervisor", "lone-worker-checkin-alarm"],
  },
  {
    id: "lone-worker-checkin-alarm",
    title: "Lone worker check-in alarm and missed check-in protocol",
    category: "lone-worker",
    keywords: ["alarm", "check-in", "missed", "overdue", "unresponsive", "tone", "sound", "beep", "grace period", "alert", "notification", "protocol"],
    content: [
      "When a lone worker's scheduled check-in becomes due, their device plays an **audible alarm** — a two-tone beep that repeats every few seconds.",
      "This is the same alarm protocol used for individual users. It plays through the device speaker to get the worker's attention.",
      "The worker should press the **I'm OK** button to confirm they are safe. Once checked in, the alarm stops and the next check-in is scheduled automatically.",
      "If the worker does not check in within the **grace window** (default 2 minutes), their status changes to **Unresponsive**.",
      "When a worker becomes unresponsive, the system automatically alerts their **supervisor** via **email**, **SMS**, and a **voice call**.",
      "The supervisor is the primary contact for missed check-ins. Emergency contacts are secondary.",
      "The alarm continues sounding on the worker's device during the unresponsive state as a continued reminder.",
      "All missed check-in events are logged in the **audit trail** and visible in the **Live Monitor** with an orange status marker.",
      "Organisations can adjust the check-in interval (15 mins to 2 hours) and grace window when creating a shift.",
    ],
    relatedTopics: ["lone-worker-supervisor", "lone-worker-monitor"],
  },
  {
    id: "invitation-management",
    title: "Invitation management — tracking and revoking",
    category: "staff",
    keywords: ["invitation", "track", "resend", "revoke", "delete", "pending", "accepted", "expired"],
    content: [
      "From the **Lone Worker Hub**, you can see all invitations and their status:",
      "**Pending** — invitation sent but not yet accepted.",
      "**Accepted** — the staff member has created their account.",
      "**Revoked** — the invitation was cancelled before being accepted.",
      "You can **resend** an invitation if the staff member didn't receive it.",
      "You can **revoke** a pending invitation if you no longer want that person to join.",
      "You can **delete** an invitation record permanently if needed.",
      "All invitation actions are recorded in the audit trail.",
    ],
    relatedTopics: ["invite-staff", "lone-worker-audit"],
  },
  {
    id: "job-types",
    title: "Job types for lone worker sessions",
    category: "lone-worker",
    keywords: ["job", "type", "visit", "home visit", "inspection", "patrol", "category", "work type"],
    content: [
      "When a staff member starts a lone worker session, they select a **job type** to categorise the work:",
      "Common job types include home visit, inspection, patrol, client meeting, and maintenance.",
      "The job type is recorded in the session details and audit trail.",
      "Managers can see the job type for each active session on the Live Monitor.",
      "This helps with reporting and understanding what activities your staff are doing.",
    ],
    relatedTopics: ["lone-worker-overview"],
  },
  {
    id: "key-contacts",
    title: "Key contacts and escalation paths",
    category: "safeguarding",
    keywords: ["key", "contact", "escalation", "path", "who to call", "emergency service", "police", "social services"],
    content: [
      "For safeguarding purposes, ensure your organisation has clear escalation paths:",
      "**Internal contacts** — designated safeguarding lead, line managers, and on-call staff.",
      "**External contacts** — local authority safeguarding team, police (101/999), social services.",
      "Document these contacts so all team members know who to reach in an emergency.",
      "aok's automated alerts handle client-level emergencies, but organisational escalation should also be planned.",
    ],
    relatedTopics: ["escalation-rules", "safeguarding-incidents"],
  },
  {
    id: "lone-worker-audit",
    title: "Lone worker audit trail",
    category: "lone-worker",
    keywords: ["audit", "trail", "log", "history", "record", "activity", "compliance", "lone worker"],
    content: [
      "Every action in the lone worker system is automatically logged in the **Audit Trail** tab.",
      "Records are grouped by person — tap a name to expand and see their full activity history.",
      "The audit trail includes:",
      "Session starts and completions.",
      "Each check-in with timestamp.",
      "Panic alerts and resolutions.",
      "Invitation sends, accepts, and revocations.",
      "You can filter by **All**, **Sessions**, or **Invites** to narrow down what you're looking for.",
      "This is essential for compliance and incident review.",
    ],
    relatedTopics: ["lone-worker-overview", "lone-worker-history"],
  },
  {
    id: "lone-worker-history",
    title: "Lone worker session history",
    category: "lone-worker",
    keywords: ["history", "past", "previous", "completed", "sessions", "review"],
    content: [
      "The **History** section in the Lone Worker Hub shows all completed sessions.",
      "Sessions are grouped by worker name so you can easily review each person's activity.",
      "Tap a worker's name to expand and see all their past sessions with details including:",
      "Job type, start and end times, duration.",
      "Number of check-ins completed during the session.",
      "Whether any panic alerts were triggered.",
    ],
    relatedTopics: ["lone-worker-audit", "lone-worker-overview"],
  },
  {
    id: "lone-worker-monitor",
    title: "Lone worker live monitor",
    category: "lone-worker",
    keywords: ["monitor", "live", "real time", "watch", "active sessions", "view", "track", "map", "location", "gps"],
    content: [
      "The **Live Monitor** tab in the Lone Worker Hub shows all currently active sessions.",
      "Sessions are colour-coded by status — panic alerts appear at the top with a red border.",
      "For each session, you can see:",
      "The worker's name, job type, and current status.",
      "Their last check-in time and next expected check-in.",
      "Their phone number for direct contact.",
      "Tap the **Location** button on any session card to open a **live map** showing the worker's real-time GPS position.",
      "The map displays a pulsing marker colour-coded by status — green for active, orange for unresponsive, red for panic.",
      "Below the map you'll see the worker's exact coordinates, when the location was last updated, and a link to open the position in Google Maps.",
      "Location data is sent from the worker's device every 60 seconds during an active shift and the first position is sent immediately when the shift starts.",
      "The monitor refreshes automatically every 10 seconds so you always see the latest status and position.",
    ],
    relatedTopics: ["lone-worker-overview", "panic-alerts", "lone-worker-supervisor"],
  },
  {
    id: "call-supervisor",
    title: "Call Supervisor feature for clients",
    category: "lone-worker",
    keywords: ["call", "supervisor", "phone", "ring", "contact", "speak", "talk", "twilio", "voice"],
    content: [
      "Organisation-managed clients can tap a **Call Supervisor** button on their dashboard to ring your phone directly.",
      "When a client taps the button, Twilio places a call to the organisation's phone number and plays a message identifying who is trying to reach you.",
      "The supervisor does **not** need to be in the app — the call comes through as a normal incoming phone call.",
      "This uses the mobile number set on your organisation account. Make sure it's up to date in your account settings.",
      "A confirmation dialog prevents accidental calls — the client must tap **Call Now** to proceed.",
    ],
    relatedTopics: ["lone-worker-overview", "alerts-emergency"],
  },
  {
    id: "lone-worker-overview",
    title: "Lone worker sessions — how they work",
    category: "lone-worker",
    keywords: ["lone worker", "session", "how", "overview", "what", "explain", "about", "phases"],
    content: [
      "The Lone Worker System supports staff who work alone — during home visits, inspections, patrols, and other solo activities.",
      "A staff member starts a session before heading out, setting their expected duration and check-in interval.",
      "During the session, they must check in at regular intervals.",
      "If they don't check in, the system escalates through phases:",
      "**Active** — session is running, all check-ins on time.",
      "**Check-in Due** — a check-in is expected soon.",
      "**Overdue** — check-in was missed.",
      "**Unresponsive** — multiple check-ins missed, no response.",
      "**Panic** — the worker manually triggered a panic alert.",
      "Managers can monitor all active sessions in real time from the **Live Monitor**.",
    ],
    relatedTopics: ["lone-worker-monitor", "lone-worker-audit", "invite-staff"],
  },
  {
    id: "login-options",
    title: "Login options for your organisation",
    category: "account",
    keywords: ["login", "sign in", "access", "portal", "client login", "staff login", "team login", "reference number", "2fa"],
    content: [
      "The organisation portal has three login options:",
      "**I'm a Client** — for people being looked after by your organisation. They log in with their unique reference number.",
      "**I'm from an Organisation** — for managers and owners. Log in with email and password.",
      "**I'm a Team Member** — for invited team members who help manage the organisation.",
      "Clients use a simple reference number for easy, passwordless access.",
      "If you have **two-factor authentication (2FA)** enabled, you will be asked for a 6-digit code from your authenticator app after entering your password.",
    ],
    relatedTopics: ["send-ref-reminder", "password-management", "two-factor-authentication"],
  },
  {
    id: "monitor-status",
    title: "Viewing client check-in status",
    category: "clients",
    keywords: ["monitor", "status", "check-in", "checkin", "safe", "pending", "overdue", "dashboard", "view", "colour"],
    content: [
      "Your dashboard shows each client's check-in status at a glance:",
      "**Safe** (green) — the client checked in on time.",
      "**Pending** (yellow) — check-in is due soon but not yet overdue.",
      "**Overdue** (red) — the client missed their check-in window.",
      "**Emergency** (flashing red) — the client has triggered an emergency alert.",
      "Click on any client to see their full details, emergency contacts, and check-in history.",
    ],
    relatedTopics: ["dashboard-overview", "alerts-emergency"],
  },
  {
    id: "nda-confidentiality",
    title: "NDA (Non-Disclosure Agreement)",
    category: "account",
    keywords: ["nda", "non-disclosure", "confidentiality", "confidential", "agreement", "legal", "secret", "naiyatech"],
    content: [
      "The **NDA (Mutual Non-Disclosure Agreement)** governs disclosure of confidential information relating to the A-OK platform.",
      "It applies to evaluation, pilot use, licensing, or ongoing commercial use of A-OK.",
      "**Confidential information** includes all non-public information: software, source code concepts, system architecture, workflows, safeguarding logic, data models, commercial terms, pricing, roadmaps, pilot results, user data, screenshots, recordings, and documentation.",
      "Recipients must keep all confidential information strictly confidential, not disclose to third parties, limit access to employees on a need-to-know basis, and apply appropriate security measures.",
      "Recipients shall not reverse engineer, replicate, benchmark, publish, white-label, or disclose any part of A-OK.",
      "Confidentiality obligations survive for **five (5) years** following termination.",
      "Breach constitutes irreparable harm — the Company is entitled to injunctive relief in addition to damages.",
      "This agreement is governed by the laws of **England and Wales**.",
      "View the full document at **/nda** from the site footer.",
    ],
    relatedTopics: ["ip-ownership-agreement", "gdpr-compliance"],
  },
  {
    id: "notifications-org",
    title: "Notifications for organisations",
    category: "account",
    keywords: ["notification", "notifications", "email", "alert", "organisation", "receive", "updates"],
    content: [
      "As an organisation manager, you are kept informed through the dashboard:",
      "**Dashboard status** — real-time view of all client check-in statuses.",
      "**Emergency alerts** — visible on the dashboard with flashing indicators.",
      "**Lone worker alerts** — panic and overdue sessions highlighted on the Live Monitor.",
      "**Reports** — review missed check-ins and emergency alerts with date filters.",
      "Client-level alerts (email, SMS, voice) go directly to the client's emergency contacts, not to the organisation unless a contact is also an org team member.",
    ],
  },
  {
    id: "offline-sms-checkin",
    title: "Offline and SMS check-in for clients",
    category: "clients",
    keywords: ["offline", "sms", "text", "no internet", "no data", "check in", "link", "fallback"],
    content: [
      "If a client's check-in is overdue and they don't have the app open, aok sends them an SMS with a secure link.",
      "The client simply taps the link to check in — no need to log in or have a data connection at that moment.",
      "The page waits for signal and checks them in as soon as it connects.",
      "This ensures clients can still check in even without reliable internet access.",
    ],
    relatedTopics: ["monitor-status", "alerts-emergency"],
  },
  {
    id: "panic-alerts",
    title: "Panic alerts — lone worker emergency",
    category: "lone-worker",
    keywords: ["panic", "alert", "emergency", "sos", "lone worker", "danger", "help", "trigger"],
    content: [
      "During a lone worker session, staff can trigger a **panic alert** if they feel unsafe.",
      "This immediately escalates the session to **Panic** status on the Live Monitor.",
      "Panic sessions appear at the top of the monitor with a red border and flashing indicator.",
      "Managers can see the worker's last known location and phone number for immediate contact.",
      "The panic alert is permanently recorded in the audit trail.",
      "Once the situation is resolved, the manager can acknowledge and close the alert.",
    ],
    relatedTopics: ["lone-worker-monitor", "lone-worker-overview"],
  },
  {
    id: "two-factor-authentication",
    title: "Two-factor authentication (2FA)",
    category: "account",
    keywords: ["2fa", "two factor", "authenticator", "totp", "security", "qr code", "verification", "login"],
    content: [
      "Two-factor authentication adds an extra layer of security to your organisation account.",
      "When enabled, you will need to enter a 6-digit code from an authenticator app (such as Google Authenticator or Authy) each time you log in.",
      "To set up 2FA, go to your account settings and tap **Set Up 2FA**.",
      "Scan the QR code with your authenticator app, then enter the code displayed to verify.",
      "To disable 2FA, enter your password to confirm.",
      "We strongly recommend enabling 2FA for all organisation accounts to protect client data.",
    ],
    relatedTopics: ["password-management"],
  },
  {
    id: "language-accessibility",
    title: "Language and accessibility",
    category: "account",
    keywords: ["language", "welsh", "cymraeg", "spanish", "espanol", "accessibility", "screen reader", "keyboard"],
    content: [
      "aok is available in **English**, **Cymraeg (Welsh)**, and **Espanol (Spanish)**.",
      "The language selector is available in the app settings area.",
      "The app supports keyboard navigation, screen readers, and high-contrast themes.",
      "All interactive elements have accessible labels and the app includes skip-to-content links.",
      "Touch targets on mobile are at least 44px for comfortable tapping.",
    ],
  },
  {
    id: "password-management",
    title: "Password management",
    category: "account",
    keywords: ["password", "change", "reset", "forgot", "security", "update", "8 characters"],
    content: [
      "You can change your password from the **Settings** or **Account** section of your dashboard.",
      "Passwords must be at least 8 characters — special characters are allowed.",
      "If you've forgotten your password, use the **Forgot Password** link on the login page to receive a reset email.",
      "For client password resets, you can trigger a reset from their detail view on your dashboard.",
    ],
    relatedTopics: ["login-options"],
  },
  {
    id: "pause-client",
    title: "Pausing and resuming a client",
    category: "clients",
    keywords: ["pause", "resume", "stop", "start", "monitoring", "suspend", "deactivate", "activate", "holiday"],
    content: [
      "You can temporarily pause check-ins for a client — for example, if they're on holiday or in hospital.",
      "While paused, no check-ins are expected and no alerts will be triggered.",
      "From the client's detail view, tap **Pause** to pause or **Resume** to restart check-ins.",
      "All their settings and contacts are preserved while paused.",
      "Paused clients appear in the **Paused** tab on your dashboard.",
    ],
    relatedTopics: ["monitor-status", "client-archive"],
  },
  {
    id: "quick-actions",
    title: "Quick actions on the dashboard",
    category: "clients",
    keywords: ["quick", "action", "shortcut", "fast", "one click", "tap"],
    content: [
      "From the main dashboard, you can quickly access common tasks:",
      "**Tap a client card** to view their full details, contacts, and history.",
      "**Add Client** button to register a new person.",
      "**Tab switches** to move between Active, Paused, and Archived clients.",
      "**Navigation menu** to jump to Lone Worker, Safeguarding, Team, or Reports.",
      "**Help button** (bottom right) to search this guide at any time.",
    ],
    relatedTopics: ["dashboard-overview", "add-client"],
  },
  {
    id: "org-feature-defaults",
    title: "Organisation feature defaults",
    category: "account",
    keywords: ["feature", "default", "defaults", "organisation", "org", "toggle", "preset", "new client", "create"],
    content: [
      "When the aok team creates your organisation, they set **default feature toggles** that apply to every new client you add.",
      "These defaults control which of the 14 features are turned on by default for new clients:",
      "Check-in, Shake to SOS, Emergency Alert, GPS Location, Push Notifications, Primary Contact, SMS Backup, Emergency Recording, Mood Tracking, Pet Protection, Important Documents, Wellbeing AI, Fitness Tracking, and Activities Tracker.",
      "You can change feature settings for individual clients at any time from their detail view, overriding the defaults.",
      "If you need to change the default feature set for your entire organisation, contact the aok team.",
    ],
    relatedTopics: ["client-features", "tier-permissions"],
  },
  {
    id: "reports-available",
    title: "Reports available to your organisation",
    category: "reports",
    keywords: ["report", "reports", "overview", "available", "what", "types", "list", "missed", "emergency", "audit", "csv", "summary"],
    content: [
      "Your organisation dashboard includes several report types:",
      "**Missed Check-ins Report** — see which clients missed their check-ins, when, and how often.",
      "**Emergency Alerts Report** — review all emergency alerts triggered by your clients, including location data and what3words addresses.",
      "**Audit Trail CSV** — download a full spreadsheet of all audit records for detailed analysis or external compliance tools.",
      "**Summary PDF** — a formatted summary report of your organisation's audit activity, suitable for board meetings, compliance reviews, and insurer submissions.",
      "Reports can be filtered by date range (last 7 days, 30 days, 90 days, or custom range).",
      "All reports can be exported as PDF or CSV for your records and compliance requirements.",
    ],
    relatedTopics: ["report-export", "report-date-filtering", "audit-exports"],
  },
  {
    id: "report-date-filtering",
    title: "Report date filtering",
    category: "reports",
    keywords: ["date", "filter", "range", "period", "7 days", "30 days", "90 days", "custom", "from", "to"],
    content: [
      "All reports support flexible date filtering:",
      "**Last 7 days** — quick view of the past week.",
      "**Last 30 days** — monthly overview.",
      "**Last 90 days** — quarterly review.",
      "**Custom range** — pick specific start and end dates.",
      "The filter applies to both the on-screen view and PDF exports.",
    ],
    relatedTopics: ["reports-available", "report-export"],
  },
  {
    id: "report-export",
    title: "Report PDF and CSV export",
    category: "reports",
    keywords: ["export", "pdf", "csv", "download", "print", "save", "compliance", "record", "generate", "spreadsheet"],
    content: [
      "All reports can be exported as **PDF** documents or **CSV** spreadsheets.",
      "Open the report you need, set your desired date range and filters.",
      "Tap the **Export PDF** or **Export CSV** button to generate and download the report.",
      "**PDFs** are formatted for professional presentation and are suitable for compliance records, board-level reviews, insurer submissions, and regulatory audits.",
      "**CSVs** provide raw data in spreadsheet format, ideal for detailed analysis in Excel, importing into external tools, or archiving.",
      "The audit trail also supports a **Summary PDF** — a high-level overview of audit activity suitable for board meetings and governance reporting.",
      "All exports include the date range, filtered data, and your organisation's name.",
    ],
    relatedTopics: ["reports-available", "report-date-filtering", "audit-exports"],
  },
  {
    id: "reset-client-password",
    title: "Resetting a client's password",
    category: "clients",
    keywords: ["reset", "password", "client", "forgot", "change", "login", "locked out"],
    content: [
      "If a client has forgotten their password or is locked out, you can reset it on their behalf.",
      "Open the client's details from your dashboard.",
      "Tap **Reset Password** and enter a new password for them.",
      "You'll need to confirm with your own organisation password for security.",
      "The client's existing sessions will be invalidated for security. They'll need to log in again with the new password.",
      "This action is logged in the audit trail.",
    ],
    relatedTopics: ["edit-client", "send-ref-reminder"],
  },
  {
    id: "reset-client-scheduler",
    title: "Resetting a client's check-in scheduler",
    category: "clients",
    keywords: ["reset", "scheduler", "check-in", "overdue", "stuck", "restart", "fix"],
    content: [
      "If a client's check-in cycle appears stuck or out of sync, you can reset their scheduler.",
      "Open the client's details from your dashboard.",
      "Tap **Reset Scheduler** to recalculate their next check-in time based on their current interval.",
      "This is useful if a client has been paused/resumed or if their schedule needs a fresh start.",
      "The new check-in time is calculated from the current time plus their configured interval.",
      "This action is logged in the audit trail.",
    ],
    relatedTopics: ["client-schedule", "pause-client"],
  },
  {
    id: "route-planning-clients",
    title: "Route planning — client feature",
    category: "clients",
    keywords: ["route", "planning", "plan", "map", "walk", "run", "cycle", "weather", "safety", "share", "osrm"],
    content: [
      "Route planning lets clients plan walks, runs, and cycle routes before heading out.",
      "Clients can tap a map to set start and end points, and the route is calculated automatically using road and path data.",
      "The planner shows **estimated times** for walking, running, and cycling at three pace levels (easy, moderate, fast).",
      "A **weather snapshot** displays current temperature, rain probability, and wind speed at the route location.",
      "A **safety cue** warns if the route could finish after sunset based on estimated travel time.",
      "Clients can **save routes** for later, mark favourites as 'usual routes', and **share** route details with emergency contacts via email.",
      "Routes can be **attached to emergency profiles** so contacts know where the client planned to go.",
      "Route planning is part of the GPS Fitness Tracking feature — it must be enabled for route planning to be available.",
      "Route distances and times are estimates only and should not be relied upon for safety-critical decisions.",
      "When viewing a route, clients can tap the **Places** button to discover nearby **Places of Interest** — cafes, shops, pubs, fuel stations, pharmacies, and tourist attractions along the path.",
      "Places are filterable by category and can be shown directly on the route map.",
    ],
    relatedTopics: ["client-features", "alerts-emergency"],
  },
  {
    id: "activity-memories",
    title: "Activity memories — client feature",
    category: "clients",
    keywords: ["memory", "memories", "photo", "picture", "journal", "capture", "location", "gps", "tag"],
    content: [
      "Activity Memories lets clients capture photos during their activities to build a visual journal.",
      "Found in the **Memories** tab under Fitness Tracking, clients can take a photo or choose one from their gallery.",
      "Location is automatically tagged via GPS and the address is looked up and displayed on the photo.",
      "Clients can add notes to each memory describing what they were doing or how they felt.",
      "Memories are displayed in a timeline grouped by month, showing the photo, location name, date, and note.",
      "Clients can edit notes or delete memories at any time.",
      "This feature is part of GPS Fitness Tracking and follows the same feature toggle.",
      "Memories are stored securely and only visible to the individual client.",
    ],
    relatedTopics: ["client-features", "route-planning-clients"],
  },
  {
    id: "safeguarding-cases",
    title: "Safeguarding case files and risk levels",
    category: "safeguarding",
    keywords: ["case", "file", "risk", "level", "red", "amber", "green", "rag", "notes", "status"],
    content: [
      "Each client has a safeguarding case file where you can track their overall risk status.",
      "Risk levels use a RAG (Red, Amber, Green) system:",
      "**Red** — immediate concern, high risk.",
      "**Amber** — some concern, needs monitoring.",
      "**Green** — no current concerns.",
      "You can add case notes, update the risk level, and review the full incident history.",
      "All safeguarding actions are fully audited for compliance and regulatory requirements.",
      "aok supports safeguarding procedures but does not replace supervision, policies, or emergency response frameworks.",
    ],
    relatedTopics: ["safeguarding-incidents", "escalation-rules"],
  },
  {
    id: "safeguarding-incidents",
    title: "Safeguarding incident reporting",
    category: "safeguarding",
    keywords: ["incident", "report", "log", "safety", "concern", "abuse", "neglect", "harm", "welfare"],
    content: [
      "The **Safeguarding Hub** lets you log safety and safeguarding incidents.",
      "When reporting an incident, you can specify:",
      "**Type** — abuse, neglect, self-harm risk, medical issue, harassment, lone worker danger, or missing person concern.",
      "**Severity** — how serious the incident is.",
      "**Location** — precise location using what3words for accurate positioning.",
      "You can also log welfare concerns from third parties, with the option to report anonymously.",
      "All incidents are timestamped and permanently recorded in the audit trail.",
    ],
    relatedTopics: ["safeguarding-cases", "escalation-rules", "welfare-concerns"],
  },
  {
    id: "service-limitation",
    title: "Service limitation notice",
    category: "account",
    keywords: ["service", "limitation", "disclaimer", "notice", "not a substitute", "network", "gps", "battery", "emergency"],
    content: [
      "aok includes a visible **service limitation notice** in the Settings page and during onboarding.",
      "This notice states that aok may not function in all circumstances due to network connectivity, device battery, GPS availability, or software issues.",
      "aok is **not** a substitute for emergency services (999/112) or professional medical advice.",
      "aok does **not** automatically detect danger, injury, falls, health events, or emergencies. All alerts are user-initiated or triggered by a missed check-in schedule.",
      "GPS accuracy varies depending on the environment, device, and signal conditions.",
      "As an organisation, you should ensure your staff and clients understand these limitations as part of your duty of care and risk assessment processes.",
    ],
    relatedTopics: ["compliance-consent", "gdpr-compliance"],
  },
  {
    id: "send-ref-reminder",
    title: "Sending a reference number reminder",
    category: "clients",
    keywords: ["reference", "number", "reminder", "sms", "forgot", "login", "ref", "resend"],
    content: [
      "If a client has forgotten their reference number, you can resend it to them.",
      "From the client's detail view, tap the **Send Ref Reminder** option.",
      "They'll receive an SMS with their reference number and a direct login link.",
      "This is useful when a client contacts you saying they can't log in.",
    ],
    relatedTopics: ["login-options", "add-client"],
  },
  {
    id: "step-counting-calories",
    title: "Step counting and calorie estimates",
    category: "clients",
    keywords: ["step", "steps", "counting", "calories", "calorie", "fitness", "motion", "sensor", "accelerometer", "estimate"],
    content: [
      "When GPS fitness tracking is enabled, clients can track **steps** and **estimated calories** during walks and runs.",
      "Step counting uses the phone's motion sensors (accelerometer) when available. If motion sensors are unavailable, steps are estimated from GPS distance.",
      "Calorie estimates are calculated using standard MET (Metabolic Equivalent of Task) values based on activity type and duration.",
      "Step counts and calorie figures appear on the activity summary after recording.",
      "These are **estimates only** — they vary by device and should not be used for medical or clinical purposes.",
      "Step counting and calorie estimation are part of the fitness tracking feature and follow the same feature toggle.",
    ],
    relatedTopics: ["client-features"],
  },
  {
    id: "tier-permissions",
    title: "Tier permissions — Tier 1 and Tier 2",
    category: "account",
    keywords: ["tier", "tier 1", "tier 2", "essential", "complete", "wellbeing", "permission", "feature", "plan", "level"],
    content: [
      "aok has two feature tiers that control which features are available:",
      "**Tier 1 — Essential** includes core safety features: Check-in, Shake to SOS, Emergency Alert, GPS Location Sharing, Push Notifications, Primary Contact Notifications, SMS Check-in Fallback, and Emergency Recording.",
      "**Tier 2 — Complete Wellbeing** includes everything in Tier 1 plus: Mood Tracking, Pet Protection, Important Document Storage, Wellbeing AI Chat, GPS Fitness Tracking, and Activities Tracker.",
      "The aok admin team manages which features are enabled at each tier level.",
      "Your organisation's clients receive features based on the tier assigned to your organisation and any per-client feature overrides you configure.",
      "You can always enable or disable individual features for specific clients from their detail view, regardless of their tier.",
    ],
    relatedTopics: ["client-features", "org-feature-defaults"],
  },
  {
    id: "team-invite",
    title: "Team member invitations",
    category: "staff",
    keywords: ["team", "invite", "member", "join", "code", "link", "organisation"],
    content: [
      "Go to the **Team** page from your dashboard navigation.",
      "Tap **Invite Team Member** and enter their details.",
      "Choose their role: Owner, Manager, Staff, or Viewer.",
      "They'll receive an invite code and link to join your organisation.",
      "Once they join, they'll have access based on the role you assign them.",
    ],
    relatedTopics: ["team-roles", "invite-staff"],
  },
  {
    id: "team-roles",
    title: "Team roles and permissions",
    category: "staff",
    keywords: ["role", "roles", "permission", "permissions", "owner", "manager", "staff", "viewer", "team", "access"],
    content: [
      "Your organisation has four team roles, each with different levels of access:",
      "**Owner** — full control over everything, including billing, bundles, and team management.",
      "**Manager** — can manage clients, staff, view reports, and access safeguarding.",
      "**Staff** — can view clients and use lone worker features for their own sessions.",
      "**Viewer** — read-only access to dashboards and reports.",
      "Invite team members from the **Team** page and assign them the appropriate role.",
    ],
    relatedTopics: ["team-invite", "invite-staff"],
  },
  {
    id: "understanding-check-ins",
    title: "Understanding check-ins",
    category: "clients",
    keywords: ["check-in", "checkin", "how", "work", "what", "understand", "frequency", "interval", "missed"],
    content: [
      "Check-ins are the core wellbeing tool in aok.",
      "Each client has a set schedule — for example, check in every 24 hours starting at 10am.",
      "When the check-in time arrives, the client opens the app and taps the **Check In** button.",
      "If they miss their check-in window:",
      "1. They receive an SMS reminder with a secure check-in link.",
      "2. If still no response, all confirmed emergency contacts are alerted via email, SMS, and voice calls.",
      "You can monitor all client check-in statuses in real time on your dashboard.",
    ],
    relatedTopics: ["monitor-status", "client-schedule", "offline-sms-checkin"],
  },
  {
    id: "viewing-client-history",
    title: "Viewing a client's check-in history",
    category: "clients",
    keywords: ["history", "past", "previous", "check-in", "log", "record", "view", "timeline"],
    content: [
      "Open a client's details from the dashboard by tapping their card.",
      "You'll see their full check-in history, including:",
      "**Successful check-ins** — with date, time, and whether it was on time or via SMS fallback.",
      "**Missed check-ins** — showing when it was due and what alerts were sent.",
      "**Emergency alerts** — any SOS triggers with location data.",
      "This history is useful for reviews, safeguarding assessments, and compliance reporting.",
    ],
    relatedTopics: ["monitor-status", "reports-available"],
  },
  {
    id: "welfare-concerns",
    title: "Welfare concerns and third-party reports",
    category: "safeguarding",
    keywords: ["welfare", "concern", "third party", "anonymous", "report", "external", "referral"],
    content: [
      "The Safeguarding Hub allows you to log welfare concerns raised by third parties.",
      "These might come from neighbours, family members, other professionals, or anonymous sources.",
      "When logging a concern, you can:",
      "Record the source (or mark as anonymous).",
      "Link it to a specific client.",
      "Set a severity level and add detailed notes.",
      "The concern is added to the client's safeguarding case file for ongoing review.",
    ],
    relatedTopics: ["safeguarding-incidents", "safeguarding-cases"],
  },
  {
    id: "what3words-location",
    title: "what3words location sharing",
    category: "clients",
    keywords: ["what3words", "location", "gps", "address", "three words", "precise", "w3w", "where"],
    content: [
      "aok uses **what3words** to share precise locations during emergencies.",
      "what3words divides the world into 3m x 3m squares, each with a unique three-word address.",
      "When a client triggers an emergency alert, their location is converted to a what3words address.",
      "This three-word address is included in all alert notifications sent to emergency contacts.",
      "It's especially useful in areas without traditional addresses — parks, rural locations, large buildings.",
      "Emergency services increasingly recognise what3words addresses for faster response.",
    ],
    relatedTopics: ["alerts-emergency", "emergency-deactivate"],
  },
  {
    id: "troubleshooting-org",
    title: "Troubleshooting common issues",
    category: "account",
    keywords: ["troubleshooting", "problem", "issue", "fix", "help", "not working", "error", "broken", "can't"],
    content: [
      "**Can't log in?** — check your email and password are correct. If you have 2FA enabled, make sure you're entering the correct 6-digit code from your authenticator app. Use **Forgot Password** if needed.",
      "**Client can't log in?** — resend their reference number from their detail view on your dashboard. You can also reset their password.",
      "**Alerts not being sent?** — ensure the client has at least one confirmed emergency contact. Contacts must confirm via the email link within 10 minutes.",
      "**Dashboard not loading?** — try refreshing the page, clearing your browser cache, or logging out and back in.",
      "**SMS not arriving to clients?** — verify the client's phone number is correct in their details.",
      "**Language wrong?** — use the language selector in settings to choose English, Cymraeg, or Espa\u00f1ol.",
      "**App showing offline?** — check your internet connection. aok caches recent pages so you can still view previously loaded content when offline.",
    ],
    relatedTopics: ["login-options", "two-factor-authentication", "send-ref-reminder"],
  },
  {
    id: "offline-pwa",
    title: "Offline support and app installation",
    category: "account",
    keywords: ["offline", "pwa", "install", "app", "home screen", "cache", "service worker", "native"],
    content: [
      "aok works as a **Progressive Web App (PWA)** that can be installed directly on any device.",
      "On **iPhone**: open aok in Safari, tap the Share button, then **Add to Home Screen**.",
      "On **Android**: open aok in Chrome, tap the menu (three dots), then **Add to Home Screen** or **Install App**.",
      "Once installed, aok works like a native app with offline support, full-screen display, and cached pages.",
      "If a client's device loses internet, aok shows an **emergency overlay** with quick-dial buttons for their primary contact and 999.",
      "Previously loaded pages are available offline through the app's caching system.",
      "aok also supports safe-area insets for devices with a notch or rounded corners.",
      "A native iOS and Android app is available via **Capacitor** for organisations requiring app store distribution.",
    ],
    relatedTopics: ["offline-sms-checkin", "troubleshooting-org"],
  },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function highlightMatch(text: string, query: string): JSX.Element {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function renderMarkdown(text: string, query: string): JSX.Element {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  const combined = parts.map((p, i) =>
    typeof p === "string" ? <span key={`t${i}`}>{highlightMatch(p, query)}</span> : p
  );

  return <>{combined}</>;
}

export function OrgHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        data-testid="button-org-help"
      >
        <Search className="w-4 h-4 mr-2" />
        Help
      </Button>
      <OrgHelpDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function OrgHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedCategory(null);
      setSelectedLetter(null);
      setSelectedTopic(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sortedTopics = useMemo(() => {
    return [...HELP_TOPICS].sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  const filteredTopics = useMemo(() => {
    let topics = sortedTopics;

    if (selectedCategory) {
      topics = topics.filter((t) => t.category === selectedCategory);
    }

    if (selectedLetter) {
      topics = topics.filter((t) => t.title.charAt(0).toUpperCase() === selectedLetter);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      const words = q.split(/\s+/);
      topics = topics.filter((t) => {
        const searchable = `${t.title} ${t.keywords.join(" ")} ${t.content.join(" ")} ${t.category}`.toLowerCase();
        return words.every((word) => searchable.includes(word));
      });
    }

    return topics;
  }, [query, selectedCategory, selectedLetter, sortedTopics]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    let topics = sortedTopics;
    if (selectedCategory) {
      topics = topics.filter((t) => t.category === selectedCategory);
    }
    topics.forEach((t) => letters.add(t.title.charAt(0).toUpperCase()));
    return letters;
  }, [selectedCategory, sortedTopics]);

  const groupedByLetter = useMemo(() => {
    const groups: Record<string, HelpTopic[]> = {};
    filteredTopics.forEach((t) => {
      const letter = t.title.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }, [filteredTopics]);

  const getCategoryIcon = (catId: string) => {
    const cat = HELP_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return null;
    const Icon = cat.icon;
    return <Icon className={`w-4 h-4 ${cat.color}`} />;
  };

  const getCategoryLabel = (catId: string) => {
    return HELP_CATEGORIES.find((c) => c.id === catId)?.label || catId;
  };

  const handleLetterClick = (letter: string) => {
    if (selectedLetter === letter) {
      setSelectedLetter(null);
      return;
    }
    setSelectedLetter(letter);
    setQuery("");
    setTimeout(() => {
      const el = document.getElementById(`help-letter-${letter}`);
      if (el && scrollRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const clearAll = () => {
    setQuery("");
    setSelectedCategory(null);
    setSelectedLetter(null);
  };

  const isFiltering = query.trim() || selectedCategory || selectedLetter;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {selectedTopic ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTopic(null)}
                data-testid="button-help-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            )}
            {selectedTopic ? selectedTopic.title : "Help Centre A\u2013Z"}
          </DialogTitle>
        </DialogHeader>

        {!selectedTopic && (
          <>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search for help... e.g. 'add client' or 'audit trail'"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedLetter(null); }}
                  className="pl-9 pr-9"
                  data-testid="input-help-search"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setQuery("")}
                    data-testid="button-help-clear"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-0.5 justify-center" data-testid="az-letter-bar">
                {ALPHABET.map((letter) => {
                  const hasTopics = availableLetters.has(letter);
                  const isActive = selectedLetter === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => hasTopics && handleLetterClick(letter)}
                      disabled={!hasTopics}
                      className={`w-7 h-7 text-xs font-semibold rounded transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : hasTopics
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/30 cursor-default"
                      }`}
                      data-testid={`button-help-letter-${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>

            {!query.trim() && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {isFiltering && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    data-testid="button-help-clear-all"
                  >
                    <X className="w-3 h-3 mr-1" /> Clear filters
                  </Button>
                )}
                {HELP_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <Button
                      key={cat.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setSelectedCategory(isActive ? null : cat.id); setSelectedLetter(null); }}
                      data-testid={`button-help-cat-${cat.id}`}
                    >
                      <Icon className="w-3 h-3 mr-1" /> {cat.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4" ref={scrollRef}>
          {selectedTopic ? (
            <div className="space-y-3">
              <Badge variant="secondary" className="mb-2" data-testid="badge-help-category">
                {getCategoryIcon(selectedTopic.category)}
                <span className="ml-1">{getCategoryLabel(selectedTopic.category)}</span>
              </Badge>
              <div className="space-y-2">
                {selectedTopic.content.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {renderMarkdown(line, query)}
                  </p>
                ))}
              </div>
              {selectedTopic.relatedTopics && selectedTopic.relatedTopics.length > 0 && (
                <div className="pt-4 border-t mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Related topics</p>
                  <div className="space-y-1">
                    {selectedTopic.relatedTopics.map((relId) => {
                      const rel = HELP_TOPICS.find((t) => t.id === relId);
                      if (!rel) return null;
                      return (
                        <Button
                          key={relId}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => setSelectedTopic(rel)}
                          data-testid={`button-help-related-${relId}`}
                        >
                          <ChevronRight className="w-3 h-3 mr-2 shrink-0" />
                          <span className="text-sm">{rel.title}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No results found{query ? ` for "${query}"` : ""}</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords, another letter, or browse the categories</p>
              {isFiltering && (
                <Button variant="outline" size="sm" className="mt-3" onClick={clearAll} data-testid="button-help-reset">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : query.trim() ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">{filteredTopics.length} result{filteredTopics.length !== 1 ? "s" : ""}</p>
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="w-full text-left rounded-md px-3 py-3 hover-elevate transition-colors flex items-center gap-3 group"
                  data-testid={`button-help-topic-${topic.id}`}
                >
                  {getCategoryIcon(topic.category)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {highlightMatch(topic.title, query)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCategoryLabel(topic.category)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedByLetter).sort().map((letter) => (
                <div key={letter} id={`help-letter-${letter}`}>
                  <div className="sticky top-0 z-10 bg-background py-1">
                    <h3 className="text-sm font-bold text-indigo-600 border-b pb-1">{letter}</h3>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {groupedByLetter[letter].map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic)}
                        className="w-full text-left rounded-md px-3 py-2.5 hover-elevate transition-colors flex items-center gap-3 group"
                        data-testid={`button-help-topic-${topic.id}`}
                      >
                        {getCategoryIcon(topic.category)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{topic.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getCategoryLabel(topic.category)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-center pt-2 pb-1">
                <p className="text-xs text-muted-foreground">{sortedTopics.length} topics available</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
