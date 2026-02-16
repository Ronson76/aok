import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck, ArrowLeft, ChevronDown, ChevronUp,
  Search, X
} from "lucide-react";

interface GuideTopic {
  id: string;
  title: string;
  content: string[];
}

const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "account-creation",
    title: "Account creation",
    content: [
      "Tap **Create Account** on the home page to get started.",
      "You'll set your name, date of birth, and phone number during a short onboarding flow.",
      "Choose your check-in frequency (how often you want to check in, from every 1 to 48 hours).",
      "Add at least one emergency contact — someone you'd like notified if you miss a check-in.",
      "Before completing your account, you must acknowledge the **compliance consent** step — three separate checkboxes covering the fitness disclaimer, no-reliance clause, and emergency limitation notice. All three must be accepted before your account is created.",
      "Complete payment (7-day free trial, then just £9.99/month). Apple Pay and Google Pay are supported.",
      "You must be 16 or over to use aok.",
    ],
  },
  {
    id: "alerts-how-they-work",
    title: "Alerts — how they work",
    content: [
      "When you miss a check-in or trigger an emergency, aok sends alerts to your confirmed emergency contacts.",
      "**Email** — all confirmed contacts receive an email with your details and, for emergencies, your GPS location.",
      "**SMS** — mobile contacts receive a text message alert.",
      "**Voice call** — landline contacts receive an automated voice call explaining the situation.",
      "Alerts are only ever sent to contacts who have confirmed they agree to be your emergency contact.",
    ],
  },
  {
    id: "apple-pay-google-pay",
    title: "Apple Pay and Google Pay",
    content: [
      "aok supports Apple Pay and Google Pay for quick and easy subscription payments.",
      "During signup, you'll see the option to pay with your device's built-in payment method.",
      "You can also use a debit or credit card if you prefer.",
    ],
  },
  {
    id: "audit-trail",
    title: "Audit trail (organisations)",
    content: [
      "If you're managed by an organisation, all your check-ins, alerts, and account changes are automatically logged in a secure audit trail.",
      "Your organisation uses this to meet regulatory and safeguarding requirements.",
      "Every audit record is protected by a **tamper-evident hash chain** — a system that detects if any record has been changed or removed.",
      "Your organisation can export audit data as **CSV** spreadsheets or **Summary PDF** reports for compliance reviews and board meetings.",
      "They can also verify the integrity of the audit trail at any time, proving records haven't been tampered with.",
      "Retention policies control how long records are kept — typically 6 years, in line with the Limitation Act 1980.",
    ],
  },
  {
    id: "cancelling-subscription",
    title: "Cancelling your subscription",
    content: [
      "Go to **Settings** and find the subscription section.",
      "Tap **Cancel Subscription** and confirm with your password.",
      "Your account will remain active until the end of your current billing period.",
      "You can reactivate at any time before the period ends.",
    ],
  },
  {
    id: "check-ins",
    title: "Check-ins — how they work",
    content: [
      "Check-ins are the heart of aok. You set a schedule (e.g. every 24 hours starting at 10am), and when it's time, you simply open the app and tap the **Check In** button.",
      "If you miss your check-in, aok will:",
      "1. Send you an SMS reminder with a link to check in (even without the app open).",
      "2. Wait a short while, then alert your emergency contacts by email and phone call.",
      "Your check-in streak tracks how many consecutive check-ins you've completed on time.",
    ],
  },
  {
    id: "check-in-schedule",
    title: "Check-in schedule — changing it",
    content: [
      "Go to **Settings** to update how often you check in and what time your schedule starts.",
      "You can set any interval from 1 to 48 hours.",
      "For example: daily at 10am, or every 12 hours starting at 8am.",
      "The new schedule takes effect from your next check-in cycle.",
    ],
  },
  {
    id: "check-in-streaks",
    title: "Check-in streaks",
    content: [
      "Your check-in streak counts how many consecutive check-ins you've completed on time.",
      "It appears on your dashboard as a motivating tracker.",
      "If you miss a check-in, the streak resets to zero.",
      "Building a streak is a great way to maintain consistent check-in habits.",
    ],
  },
  {
    id: "call-supervisor",
    title: "Call Supervisor (organisation clients)",
    content: [
      "If you're managed by an organisation, you'll see a **Call Supervisor** button on your dashboard.",
      "Tapping it will ring your supervisor's phone and play a message letting them know you need to speak with them.",
      "Your supervisor doesn't need to be in the app — their phone rings like a normal incoming call.",
      "A confirmation dialog appears before the call is placed, so you won't accidentally call them.",
      "This feature is only available if your organisation has set up a contact phone number.",
    ],
  },
  {
    id: "compliance-consent",
    title: "Compliance consent",
    content: [
      "During account creation, you must complete a **compliance consent** step before your account is activated.",
      "This step includes three separate checkboxes that must all be acknowledged:",
      "1. **Fitness disclaimer** — aok fitness and activity tracking is for personal wellbeing only and does not provide medical advice, diagnosis, or health monitoring.",
      "2. **No-reliance clause** — aok is a communication and check-in tool, not a safety guarantee. It does not monitor, detect, or respond to health events, falls, or emergencies automatically.",
      "3. **Emergency limitation** — aok relies on network connectivity, device power, GPS availability, and software updates. It may not function in all circumstances and is not a substitute for emergency services.",
      "These checkboxes cannot be skipped. The date and time of your consent are recorded for compliance purposes.",
    ],
  },
  {
    id: "contact-adding",
    title: "Contacts — adding emergency contacts",
    content: [
      "Go to the **Contacts** tab and tap **Add Contact**.",
      "Enter their name, phone number, email address, and relationship to you.",
      "Choose the contact type:",
      "**Mobile** — alerts sent via SMS and email.",
      "**Landline** — alerts sent via automated voice call and email.",
    ],
  },
  {
    id: "contact-confirmation",
    title: "Contacts — confirmation process",
    content: [
      "For your safety, each contact must confirm they agree to be your emergency contact.",
      "They'll receive an email with a confirmation link.",
      "They have **10 minutes** to confirm. If it expires, you can resend the confirmation from the Contacts page.",
      "Contacts won't receive any alerts until they've confirmed.",
    ],
  },
  {
    id: "contact-primary",
    title: "Contacts — primary contact",
    content: [
      "You can mark one contact as your **primary contact**.",
      "This person receives a notification every time you successfully check in — so they always know you're safe.",
      "All other contacts are only notified when you miss a check-in or trigger an emergency.",
    ],
  },
  {
    id: "dark-mode",
    title: "Dark mode",
    content: [
      "aok supports dark mode for comfortable use in low-light conditions.",
      "Toggle between light and dark mode from the **Settings** page or the theme toggle in the header.",
      "Your preference is saved and applied automatically on your next visit.",
    ],
  },
  {
    id: "demo",
    title: "Demo page",
    content: [
      "Visit the **Demo** page at **/demo** to see a guided walkthrough of how aok works.",
      "The demo covers three sections: **Individual** users, **Organisation** accounts, and **Lone Worker** features.",
      "Click a section tab to see a step-by-step breakdown of the key features and how they protect you.",
      "The demo also explains how the protection net works across four layers.",
      "You can access the demo from the landing page by clicking **See Demo**, or go directly to **/demo**.",
    ],
  },
  {
    id: "digital-will",
    title: "Important documents",
    content: [
      "Securely store important documents like travel insurance, wills, healthcare directives, power of attorney, and any other vital paperwork.",
      "Go to **Wellbeing > Documents** to upload and manage your important documents.",
      "Documents are encrypted and stored securely.",
      "This feature can be enabled or disabled by your organisation if you're managed by one.",
    ],
  },
  {
    id: "ecologi",
    title: "Ecologi — environmental impact",
    content: [
      "aok partners with Ecologi to track environmental impact.",
      "When you subscribe, a tree is planted automatically on your behalf.",
      "You can view the collective impact (trees planted, carbon offset) on the landing page.",
      "This is our way of making a positive difference alongside personal safety.",
    ],
  },
  {
    id: "emergency-alert-button",
    title: "Emergency alert button",
    content: [
      "On your dashboard, there's a red **Emergency Alert** button. Tap it if you need immediate help.",
      "This will:",
      "Share your GPS location with your emergency contacts.",
      "Send your location as a what3words address for precise positioning.",
      "Alert all confirmed contacts via email, SMS, and phone calls.",
      "Sound an alarm on your device.",
      "To end an emergency, press and hold the **Hold to Deactivate** button for 10 seconds. This sends a confirmation request to your contacts — the emergency will only fully end once one of your contacts confirms they have spoken to you and you are safe.",
      "If you entered the wrong password during setup, you can also use the **password method** to cancel instantly.",
      "Emergency alerts are user-initiated and do not replace emergency services. aok does not automatically detect danger, injury, or health events.",
    ],
  },
  {
    id: "emergency-recording",
    title: "Emergency recording",
    content: [
      "Emergency recording is an opt-in feature that activates your phone's camera and microphone when an emergency alert is triggered.",
      "This feature is **off by default** — you must enable it manually before it will activate.",
      "To enable it, go to **Settings** and toggle on **Emergency Recording**.",
      "When an emergency alert is triggered (via the emergency button, Shake to SOS, or a missed check-in escalation), your device will automatically begin recording audio and video.",
      "Recordings are **encrypted** and stored securely. They are only shared with your confirmed emergency contacts.",
      "Recordings are retained for **90 days** and then automatically deleted.",
      "While recording, a **red indicator** appears on your dashboard showing the recording duration.",
      "Once the emergency ends (you deactivate or hold to cancel), the recording is automatically saved and uploaded to secure cloud storage — it is **not saved to your phone's camera roll or gallery**.",
      "To find your saved recordings, go to **Settings** and scroll to the **Saved Recordings** section. From there you can **play**, **download to your phone**, or **delete** each recording.",
      "You can disable emergency recording at any time by returning to **Settings** and toggling it off.",
      "If you're managed by an organisation, your organisation admin may also enable or disable this feature on your behalf.",
    ],
  },
  {
    id: "ip-ownership-agreement",
    title: "IP Ownership Agreement",
    content: [
      "The **IP Ownership Agreement** is a legal document that governs intellectual property rights between Naiyatech Ltd and licensees of the A-OK platform.",
      "All intellectual property relating to A-OK — including software, workflows, UI/UX, logic, data structures, analytics, reports, trademarks, and branding — remains the exclusive property of Naiyatech Ltd.",
      "Licensees are granted a limited, non-exclusive, non-transferable, revocable licence solely to use A-OK.",
      "Feedback, suggestions, enhancements, or derivative works provided by the Licensee automatically vest in Naiyatech Ltd.",
      "This agreement applies to **organisations and pilot participants** accessing the A-OK platform.",
      "You can read the full agreement at **IP Ownership Agreement** linked from the site footer.",
    ],
  },
  {
    id: "forgot-password",
    title: "Forgot password",
    content: [
      "If you've forgotten your password, tap **Forgot Password** on the login page.",
      "Enter your email address and you'll receive a reset link.",
      "The link will let you create a new password.",
      "Passwords must be at least 8 characters — special characters are allowed.",
    ],
  },
  {
    id: "free-trial",
    title: "Free trial",
    content: [
      "Every new aok account starts with a **7-day free trial**.",
      "During the trial, you have full access to all features.",
      "After 7 days, your subscription automatically begins at £9.99/month.",
      "You can cancel at any time during the trial without being charged.",
    ],
  },
  {
    id: "gps-location",
    title: "GPS location sharing",
    content: [
      "When you trigger an emergency alert, aok captures your GPS location.",
      "Your precise coordinates are shared with your emergency contacts.",
      "The location is also converted to a **what3words** address — a unique three-word combination that pinpoints your exact 3m x 3m square.",
      "This is especially useful in places without traditional addresses like parks, fields, or large buildings.",
    ],
  },
  {
    id: "history",
    title: "History — viewing your check-in history",
    content: [
      "Your check-in history is available on the **History** tab of your dashboard.",
      "It shows all your past check-ins with dates, times, and whether they were on time or late.",
      "Missed check-ins are highlighted so you can see your patterns.",
      "This helps you stay accountable and track your check-in habits.",
    ],
  },
  {
    id: "international-phone-numbers",
    title: "International phone numbers",
    content: [
      "aok supports international phone numbers across the platform.",
      "When entering a phone number — for your account, emergency contacts, or supervisor details — use the **country code selector** to pick the correct prefix.",
      "Supported country codes include UK (+44), Ireland (+353), Germany (+49), France (+33), and USA (+1). UK (+44) is the default.",
      "Leading zeros are automatically removed — so if you type '07700 900123', it will be stored correctly as '+447700900123'.",
      "This applies to all phone fields including staff invitations, supervisor phone numbers, and emergency contact numbers.",
    ],
  },
  {
    id: "installing-app",
    title: "Installing the app",
    content: [
      "aok works as a web app that can be installed on your phone's home screen.",
      "On **iPhone**: open aok in Safari, tap the Share button, then **Add to Home Screen**.",
      "On **Android**: open aok in Chrome, tap the menu (three dots), then **Add to Home Screen** or **Install App**.",
      "Once installed, it works just like a native app with offline support, push notifications, and full-screen display.",
      "aok also supports safe-area insets on devices with a notch or rounded corners, so the interface never gets cut off.",
      "A native iOS and Android app is also available via Capacitor for organisations requiring app store distribution.",
    ],
  },
  {
    id: "live-location-tracking",
    title: "Live location tracking (lone workers)",
    content: [
      "If you're using the lone worker feature, your device automatically sends your GPS location to your supervisor during an active shift.",
      "Your first position is sent as soon as the shift starts, then updated every 60 seconds.",
      "Your supervisor can see your live position on a map in the **Live Monitor** — including your exact coordinates and when the location was last updated.",
      "The map marker changes colour based on your status — green for active, orange if you've missed a check-in, red if you've triggered a panic alert.",
      "Location data helps your supervisor find you quickly if something goes wrong.",
    ],
  },
  {
    id: "lone-worker-check-in-alarm",
    title: "Lone worker check-in alarm",
    content: [
      "During an active shift, your device will sound an audible alarm when your scheduled check-in is due.",
      "The alarm repeats every few seconds until you check in by pressing the **I'm OK** button.",
      "This is the same protocol used for individual users — a two-tone beep plays through your device speaker to get your attention.",
      "If you don't check in within the grace window (default 2 minutes), your status changes to **Unresponsive** and your supervisor is automatically alerted via **email**, **SMS**, and a **voice call**.",
      "The alarm also sounds during the unresponsive state to remind you to check in.",
      "Once you check in, the alarm stops and your next check-in is scheduled automatically.",
    ],
  },
  {
    id: "login",
    title: "Logging in",
    content: [
      "Open aok and enter your email address and password.",
      "You can also log in using **Google** for a quicker sign-in experience.",
      "If you're managed by an organisation, you may log in using your unique **reference number** instead.",
      "If you've enabled **two-factor authentication (2FA)**, you'll be asked for a 6-digit code from your authenticator app after entering your password.",
      "If you've forgotten your password, use the **Forgot Password** link.",
    ],
  },
  {
    id: "nda-confidentiality",
    title: "NDA (Non-Disclosure Agreement)",
    content: [
      "The **NDA (Mutual Non-Disclosure Agreement)** governs disclosure of confidential information relating to the A-OK platform.",
      "It applies to evaluation, pilot use, licensing, or ongoing commercial use of A-OK.",
      "**Confidential information** includes all non-public information: software, source code concepts, system architecture, workflows, safeguarding logic, data models, commercial terms, pricing, roadmaps, pilot results, user data, screenshots, recordings, and documentation.",
      "Recipients must keep all confidential information strictly confidential, not disclose to third parties, limit access to employees on a need-to-know basis, and apply appropriate security measures.",
      "Confidentiality obligations survive for **five (5) years** following termination.",
      "This agreement applies to **organisations and pilot participants** accessing the A-OK platform.",
      "You can read the full agreement at **NDA** linked from the site footer.",
    ],
  },
  {
    id: "mood-tracking",
    title: "Mood tracking",
    content: [
      "Track how you're feeling each day. Go to **Wellbeing > Mood Tracking** from the bottom menu.",
      "Rate your mood on a scale, add optional notes about how you're feeling.",
      "View your mood patterns over time with charts and trends.",
      "This is completely private to you — no one else can see your mood data.",
      "The wellbeing AI can review mood patterns you share and offer supportive suggestions.",
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    content: [
      "aok sends you notifications to remind you when a check-in is due.",
      "If you have push notifications enabled, you'll get a reminder on your phone.",
      "If your check-in is overdue, you'll also receive an SMS as a fallback.",
      "Make sure notifications are enabled in your phone's settings for the best experience.",
    ],
  },
  {
    id: "organisation-managed-account",
    title: "Organisation-managed account",
    content: [
      "If your account is managed by an organisation (such as an employer, care provider, or support service), some aspects of your experience may differ.",
      "Your organisation sets your **check-in schedule** and can adjust it on your behalf.",
      "Your organisation can **enable or disable features** such as mood tracking, pet protection, important documents, fitness tracking, activities tracker, wellbeing AI, and emergency recording.",
      "You may have a **Call Supervisor** button on your dashboard to quickly ring your supervisor.",
      "You log in using a unique **reference number** sent to you via SMS, rather than an email/password.",
      "Your subscription is covered by your organisation at no cost to you.",
      "Your organisation can view your check-in status but cannot read your private wellbeing data (mood entries, AI conversations).",
      "**Note:** The Call Supervisor button is only available for lone worker staff members, not organisation clients.",
    ],
  },
  {
    id: "offline-safety",
    title: "Offline safety",
    content: [
      "If your phone loses internet connection, aok displays an emergency overlay.",
      "The overlay shows quick-dial buttons for your **primary contact** and **999**.",
      "The overlay disappears automatically when your connection is restored.",
      "This provides access to emergency calling even without data.",
      "aok also caches your app data so you can still view previously loaded pages while offline.",
      "If you navigate to a page while offline, you will see a dedicated offline screen with a **Try Again** button and an emergency call option.",
    ],
  },
  {
    id: "two-factor-authentication",
    title: "Two-factor authentication (2FA)",
    content: [
      "Two-factor authentication adds an extra layer of security to your account.",
      "When enabled, you will need to enter a 6-digit code from an authenticator app (such as Google Authenticator or Authy) each time you log in.",
      "To set up 2FA, go to **Settings** and tap **Set Up 2FA**.",
      "You will be shown a QR code to scan with your authenticator app, plus a secret key you can copy for manual entry.",
      "Enter the 6-digit code displayed in your authenticator app to verify and enable 2FA.",
      "To disable 2FA, go to **Settings**, tap **Manage 2FA**, and enter your password to confirm.",
      "We strongly recommend enabling 2FA for extra account protection, especially if you use aok for safety monitoring.",
    ],
  },
  {
    id: "language-settings",
    title: "Language settings",
    content: [
      "aok is available in multiple languages: **English**, **Cymraeg (Welsh)**, and **Espa\u00f1ol (Spanish)**.",
      "To change your language, look for the language selector in the app settings or navigation area.",
      "The app will remember your language preference and apply it automatically next time you visit.",
      "If your browser is set to Welsh or Spanish, the app will automatically use that language on your first visit.",
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    content: [
      "aok is designed to be accessible to everyone.",
      "You can use keyboard navigation throughout the app. Press **Tab** to move between elements and **Enter** to activate them.",
      "A **Skip to main content** link is available at the top of every page for screen reader and keyboard users.",
      "All interactive elements have descriptive labels for screen readers.",
      "The app supports both light and dark modes for comfortable viewing in any lighting condition.",
      "Touch targets on mobile are at least 44px for comfortable tapping.",
    ],
  },
  {
    id: "password-changing",
    title: "Password — changing it",
    content: [
      "Change your password in **Settings**.",
      "Passwords must be at least 8 characters — special characters are allowed.",
      "You'll need to enter your current password and then your new password twice to confirm.",
    ],
  },
  {
    id: "pet-protection",
    title: "Pet protection",
    content: [
      "Store details about your pets so emergency contacts know who needs looking after if something happens to you.",
      "Go to **Wellbeing > Pet Protection** to add your pets.",
      "You can include their name, species, breed, vet details, and care instructions.",
      "**Insurance documents** — Expand any pet's card and use the **Upload Insurance Document** button to attach their insurance policy (PDF, JPG, PNG, or DOC). Once uploaded you can view it inline, download it, or remove it.",
      "This information is shared with your emergency contacts if an alert is triggered.",
    ],
  },
  {
    id: "fitness-tracking",
    title: "Fitness tracking",
    content: [
      "Record your runs, walks, and rides directly inside aok using your phone's GPS and motion sensors as part of your overall wellbeing picture.",
      "Go to **Wellbeing > Fitness Tracking** from the bottom menu.",
      "Choose an activity type (run, walk, or cycle), select your privacy level, and tap **Start** to begin recording.",
      "While recording you can **pause**, **resume**, and **stop** your activity. GPS points are captured automatically to map your route.",
      "**Step counting**: For runs and walks, aok uses your phone's motion sensors (accelerometer) to count steps in real time. If motion sensors are unavailable, steps are estimated from GPS distance.",
      "**Calorie estimation**: Calories burned are estimated based on the activity type and duration using standard MET values. These are estimates only and should not be used for medical purposes.",
      "After stopping, your activity is saved with distance, duration, pace (or speed for cycling), steps, calories, and a route map.",
      "View your full activity history and stats in the **History** tab, including total steps and calories across all activities.",
      "Toggle **Share live activity with contacts** while recording to let your emergency contacts see your current route.",
      "If you trigger an emergency while recording, your route and last known location are automatically attached to the alert.",
      "If your organisation manages your account, fitness tracking may be enabled or disabled by your organisation administrator.",
      "Fitness tracking is for personal wellbeing only and does not provide medical advice, diagnosis, or health monitoring. Step counts and calorie estimates are approximate and vary by device.",
    ],
  },
  {
    id: "route-planning",
    title: "Route planning",
    content: [
      "Plan your routes before heading out using the built-in map planner.",
      "Go to **Wellbeing > Fitness Tracking** and tap the **Routes** tab.",
      "Tap the map to set your **start point** (green dot), then tap again to set your **end point** (red dot). The route is calculated automatically.",
      "The planner shows estimated times for **walking**, **running**, and **cycling** at your chosen pace. Use the **Easy**, **Moderate**, or **Fast** toggle to adjust.",
      "Routes are categorised by distance: **Short** (0-2 km), **Medium** (2-5 km), or **Long** (5+ km).",
      "A **weather snapshot** shows current temperature, rain probability, and wind speed for your route location.",
      "A **safety cue** warns you if your route could finish after sunset based on estimated travel time — for example, 'Route will finish after sunset'. This is for awareness only.",
      "Use the **Save Route** button to keep a route for later. Toggle **Mark as usual route** to star frequently used routes.",
      "Toggle **Attach to emergency if needed** to link the route to your emergency profile.",
      "Use the **Share** button to send your saved route to any of your emergency contacts by email.",
      "Use the **Repeat** button on any saved route to reload it into the planner.",
      "Before heading out, open the **Pre-start checklist**: phone charged, headphones on, weather checked, keys.",
      "Route planning does not use GPS recording or background tracking. It is for planning purposes only.",
      "Route distances and times are estimates and should not be relied upon for safety-critical decisions.",
      "When viewing a route, tap the **Places** button to discover nearby **Places of Interest** along your path — including cafes, shops, pubs, fuel stations, pharmacies, and tourist attractions.",
      "Use the category buttons to filter by type. Tap **Show on map** to see place markers directly on the route map. Tap any marker for the place name.",
    ],
  },
  {
    id: "activity-memories",
    title: "Activity memories",
    content: [
      "Capture photos during your activities to build a visual journal of your fitness journey.",
      "Go to **Wellbeing > Fitness Tracking** and tap the **Memories** tab.",
      "Tap **Capture a Moment** to take a photo or choose one from your gallery.",
      "Your location is automatically tagged using GPS when you take the photo. The location name is looked up and shown on the image.",
      "Add a note to describe what you were doing, how you felt, or anything you want to remember.",
      "Tap **Save Memory** to add it to your timeline.",
      "Your memories are displayed in a timeline grouped by month, with the most recent first.",
      "Each memory card shows the photo, location, date, and your note.",
      "Use the **edit** button on any memory to update the note, or the **delete** button to remove it.",
      "Memories are stored securely and only visible to you.",
    ],
  },
  {
    id: "activities",
    title: "Activities tracker",
    content: [
      "The Activities tracker lets you log everyday activities — walking, shopping, errands, appointments, visiting, commuting, dog walking, exercise, first dates, or anything else — and automatically notifies your emergency contacts if you don't check back in on time.",
      "Go to **Wellbeing > Activities** from the bottom menu.",
      "Choose an activity type from the grid, set how long you expect to be, and optionally add a custom label (e.g. 'Walking to the pharmacy').",
      "Tap **Start Activity** to begin your session. Your phone's GPS tracks your location throughout.",
      "A countdown timer shows how much time you have left. When you're done, tap **I'm Done — Complete Activity**.",
      "If your expected time runs out, a **10-minute grace period** begins. During grace you can tap **I'm OK — Need More Time** to extend, or **Complete** to finish.",
      "If the grace period expires without a check-in, your emergency contacts are automatically notified with your last known location.",
      "While active, you can quickly **call your primary contact** or **call 999** from the session screen.",
      "Your activity history is displayed below the active session with status badges showing completed, cancelled, or overdue sessions.",
      "**Low battery alert**: If your phone battery drops below 20% during an active activity, your primary contacts are automatically emailed a warning. This only happens once per session, and only during activities — not at any other time. A visual warning also appears on your screen.",
      "Activities tracking does not provide safety guarantees and depends on network, device, and GPS availability. It is not a substitute for emergency services.",
    ],
  },
  {
    id: "pricing",
    title: "Pricing and plans",
    content: [
      "aok offers simple, transparent pricing with all features included:",
      "**7-Day Free Trial** — full access to every feature, no payment details required upfront. Cancel anytime during the trial.",
      "**Complete Wellbeing** — £16.99/month or £169.99/year (save 2 months). Includes check-ins, emergency alerts, SMS and voice call alerts, GPS location sharing, wellbeing AI chat, mood tracking, pet protection, important document storage, GPS fitness tracking, activities tracker, and a tree planted via Ecologi.",
      "**Organisations** — custom pricing for bundles of seats. Includes everything in Complete Wellbeing plus a dedicated organisation dashboard, bulk client management, staff roles, safeguarding hub, lone worker session management, Call Supervisor, reports, analytics dashboard, and emergency recording per-client controls.",
      "Apple Pay and Google Pay are supported for quick and easy payment.",
      "You can cancel at any time — your account stays active until the end of your billing period.",
      "If you're managed by an organisation, your access is included at no cost to you.",
      "Visit the **Pricing** page from the home screen to see a full feature comparison table.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy and data protection",
    content: [
      "aok is built with your privacy in mind:",
      "**Emergency contacts** must confirm consent before receiving any alerts (GDPR compliance).",
      "**AI conversations** are ephemeral — they are never stored or saved.",
      "**Location data** is only shared when you trigger an emergency alert.",
      "**Emergency recordings** are encrypted, shared only with contacts, and automatically deleted after 90 days.",
      "**Mood tracking** is completely private to you.",
      "Organisations are covered by our **IP Ownership Agreement** and **NDA** for full confidentiality protection.",
      "You can view and manage your data at any time in Settings.",
    ],
  },
  {
    id: "quick-start",
    title: "Quick start guide",
    content: [
      "Here's how to get up and running with aok in 5 minutes:",
      "1. Create your account with your name, date of birth, and phone number.",
      "2. Set your check-in frequency (we suggest starting with every 24 hours).",
      "3. Add at least one emergency contact.",
      "4. Wait for your contact to confirm via email.",
      "5. Complete payment (free for 7 days).",
      "6. You're all set — check in on time each day to support your wellbeing.",
    ],
  },
  {
    id: "reference-number-login",
    title: "Reference number login (organisation clients)",
    content: [
      "If your account is managed by an organisation, you log in using a **reference number** instead of an email and password.",
      "Your reference number is sent to you via SMS when your organisation registers you.",
      "On the login page, tap **Log in with Reference Number** and enter your unique code.",
      "If you've forgotten your reference number, ask your organisation to resend it to you. They can do this from their dashboard.",
    ],
  },
  {
    id: "reactivating",
    title: "Reactivating your subscription",
    content: [
      "If you've cancelled your subscription, you can reactivate it before the current billing period ends.",
      "Go to **Settings** and tap **Reactivate Subscription**.",
      "Your service will continue without interruption.",
    ],
  },
  {
    id: "safeguarding-compliance-framework",
    title: "Safeguarding Compliance Framework (organisations)",
    content: [
      "The **Board-Level Safeguarding, Audit & Compliance Framework** is a comprehensive document outlining how aok supports safeguarding governance.",
      "It covers audit architecture, activity monitoring, data security, retention policies, and organisational risk mitigation.",
      "The framework is designed for housing providers, charitable organisations, universities, local authorities, and regulated care environments.",
      "Your organisation can view and export the full document as a PDF from the Admin Dashboard.",
      "It provides the evidential basis for demonstrating duty of care to regulators, insurers, and governance boards.",
    ],
  },
  {
    id: "analytics-dashboard",
    title: "Analytics dashboard (organisations)",
    content: [
      "The **Analytics** page gives organisations a clear picture of safety patterns and active emergencies across their clients.",
      "Access it from the **Analytics** button on your organisation dashboard.",
      "**Peak Times** — bar charts showing when emergency alerts and missed check-ins happen most often, broken down by hour of day and day of week. Use this to identify patterns and adjust staffing or support schedules.",
      "**Alert Heatmap** — a map view showing where emergency alerts have been triggered. Locations are marked with red circles sized by frequency, helping you spot geographic hotspots.",
      "**Active SOS Alerts** — a live view of any currently active emergency alerts from your clients. Each card shows the client name, reference code, phone number, how long ago it was triggered, and the GPS location.",
      "All data updates automatically when you visit the page. No setup is needed — analytics are generated from your existing check-in and emergency alert activity.",
    ],
  },
  {
    id: "service-limitation-notice",
    title: "Service limitation notice",
    content: [
      "aok includes a visible disclaimer in **Settings** about the limitations of the service.",
      "aok relies on network connectivity, device battery, GPS availability, and software updates to function. It may not work in all circumstances.",
      "aok is **not** a substitute for emergency services (999/112) or professional medical advice.",
      "aok does not automatically detect danger, injury, falls, health events, or emergencies. All alerts are user-initiated or schedule-based.",
      "GPS accuracy varies depending on environment, device, and signal conditions. Locations shared during emergencies are approximate.",
      "By using aok, you acknowledge these limitations as part of the compliance consent during account creation.",
    ],
  },
  {
    id: "shake-to-sos",
    title: "Shake to SOS",
    content: [
      "Shake your phone firmly to trigger an SOS alert — no need to unlock or find the button.",
      "This is enabled by default but can be turned off in **Settings** if you prefer.",
      "When triggered, a confirmation screen appears for a few seconds so you can cancel if it was accidental.",
      "If not cancelled, it works exactly like the emergency alert button — sending your location to all contacts.",
    ],
  },
  {
    id: "sms-check-in",
    title: "SMS check-in (no data needed)",
    content: [
      "If your check-in is overdue and you don't have the app open, aok sends you a text message with a secure link.",
      "Simply tap the link in the text and it will check you in automatically — no need to log in.",
      "The page will wait for signal and check you in as soon as it connects.",
      "This means you can check in even without a reliable internet connection.",
    ],
  },
  {
    id: "staff-registration",
    title: "Staff registration (lone workers)",
    content: [
      "If your organisation has invited you to join as a lone worker, you'll receive an SMS with a unique invite link.",
      "Tap the link to open the registration page. Your name, phone number, and organisation will already be filled in.",
      "Set your email, login password, and complete the onboarding steps.",
      "During registration, you'll also be asked to create a **cancellation password**. This is a separate password (at least 4 characters) used only for emergency cancellations.",
      "If you ever become unresponsive during a shift, your supervisor will call you and ask for this password to verify you're safe before cancelling the emergency.",
      "Keep your cancellation password memorable but don't share it with anyone except your supervisor during a live safety check.",
      "Once registered, your account is linked to your organisation and you can start lone worker shifts from your dashboard.",
    ],
  },
  {
    id: "subscription-tiers",
    title: "Subscription tiers",
    content: [
      "aok offers two feature tiers for individual users:",
      "**Tier 1 — Essential** includes core safety features: check-ins, emergency alerts, SMS and voice call alerts, GPS location sharing, push notifications, primary contact notifications, SMS check-in fallback, and Shake to SOS.",
      "**Tier 2 — Complete Wellbeing** includes everything in Tier 1 plus: mood tracking, pet protection, important document storage, wellbeing AI chat, GPS fitness tracking, activities tracker, and emergency recording.",
      "All individual subscribers get Tier 2 (Complete Wellbeing) by default at £16.99/month.",
      "If you're managed by an organisation, your available features may vary depending on what your organisation has enabled for your account.",
    ],
  },
  {
    id: "supervisor-details",
    title: "Supervisor details (lone workers)",
    content: [
      "If you're part of an organisation's lone worker programme, you may have a designated **supervisor**.",
      "Your supervisor is the primary person alerted if you miss a check-in or trigger a panic alert during a shift.",
      "Your organisation sets up your supervisor's details — including their name, phone number, and email address.",
      "Supervisor phone numbers are verified via SMS to make sure alerts reach the right person.",
      "You may have a **Call Supervisor** button on your dashboard to quickly ring your supervisor.",
    ],
  },
  {
    id: "cancellation-password",
    title: "Cancellation password (lone workers)",
    content: [
      "When you register as a lone worker staff member, you'll be asked to create a **cancellation password**.",
      "This is a separate password from your login password — it's used as a security measure for **emergency cancellations**.",
      "If you become unresponsive during a shift, your supervisor can cancel the emergency by confirming they've spoken to you and entering your cancellation password.",
      "Your supervisor will ask you for this password over the phone to verify that you're genuinely safe.",
      "This prevents anyone from cancelling an emergency without your knowledge.",
      "The cancellation password must be at least 4 characters long. Choose something memorable but not easily guessable.",
    ],
  },
  {
    id: "subscription-status",
    title: "Subscription status",
    content: [
      "View your subscription status in **Settings**.",
      "You can see whether you're on a free trial, active subscription, or if your plan is set to cancel.",
      "Your next billing date is also displayed.",
      "Cancel or reactivate your subscription at any time.",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting common issues",
    content: [
      "**Can't log in?** — check your email and password are correct, or use Forgot Password. If you have 2FA enabled, make sure you're entering the correct 6-digit code from your authenticator app.",
      "**Contacts not receiving alerts?** — make sure they've confirmed via the email link within 10 minutes.",
      "**Missed check-in not triggering alerts?** — ensure you have at least one confirmed emergency contact.",
      "**SMS not arriving?** — check your phone number is correct in Settings.",
      "**App not loading?** — try refreshing, clearing your browser cache, or reinstalling from your home screen.",
      "**App showing offline?** — check your internet connection. aok will show an emergency overlay with quick-dial buttons when offline. The app caches recent pages so you can still view previously loaded content.",
      "**Language wrong?** — go to Settings and use the language selector to choose English, Cymraeg, or Español. Your browser's language is detected automatically on first visit.",
    ],
  },
  {
    id: "understanding-status",
    title: "Understanding your status",
    content: [
      "Your dashboard shows your current check-in status:",
      "**Safe** (green) — you're checked in and all is well.",
      "**Due Soon** (yellow) — your next check-in is approaching.",
      "**Overdue** (red) — you've missed your check-in window.",
      "Keep your status green by checking in on time.",
    ],
  },
  {
    id: "voice-chat",
    title: "Voice chat with wellbeing AI",
    content: [
      "The wellbeing AI includes a voice chat mode.",
      "Tap the microphone icon to speak instead of typing.",
      "Your speech is converted to text using secure speech-to-text technology.",
      "The AI's response is read aloud to you.",
      "This is useful if you prefer speaking or find typing difficult.",
    ],
  },
  {
    id: "wellbeing-ai",
    title: "Wellbeing AI chat",
    content: [
      "Chat with our AI companion for emotional support and wellbeing advice. Find it under **Wellbeing > AI Chat**.",
      "Key features:",
      "Completely private — no conversations are stored (GDPR compliant).",
      "Reviews mood patterns you share and offers supportive suggestions.",
      "Voice chat mode — speak instead of typing, and hear responses read aloud.",
      "Signposts to crisis helplines when appropriate.",
      "The AI is here to listen and support — it is not a replacement for professional help.",
    ],
  },
  {
    id: "what3words",
    title: "what3words — how it works",
    content: [
      "what3words divides the world into 3m x 3m squares, each with a unique three-word address.",
      "For example, a location might be ///filled.count.soap.",
      "When you trigger an emergency alert, your location is sent as a what3words address.",
      "This helps emergency contacts and services find you quickly and precisely.",
      "It's especially useful in places without street addresses.",
    ],
  },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function renderMarkdown(text: string): JSX.Element {
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

  return <>{parts}</>;
}

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

export default function Guide() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedTopics = useMemo(() => {
    return [...GUIDE_TOPICS].sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  const filteredTopics = useMemo(() => {
    let topics = sortedTopics;

    if (selectedLetter) {
      topics = topics.filter((t) => t.title.charAt(0).toUpperCase() === selectedLetter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const words = q.split(/\s+/);
      topics = topics.filter((t) => {
        const searchable = `${t.title} ${t.content.join(" ")}`.toLowerCase();
        return words.every((word) => searchable.includes(word));
      });
    }

    return topics;
  }, [searchQuery, selectedLetter, sortedTopics]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    sortedTopics.forEach((t) => letters.add(t.title.charAt(0).toUpperCase()));
    return letters;
  }, [sortedTopics]);

  const groupedByLetter = useMemo(() => {
    const groups: Record<string, GuideTopic[]> = {};
    filteredTopics.forEach((t) => {
      const letter = t.title.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }, [filteredTopics]);

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLetterClick = (letter: string) => {
    if (selectedLetter === letter) {
      setSelectedLetter(null);
      return;
    }
    setSelectedLetter(letter);
    setSearchQuery("");
    setTimeout(() => {
      const el = document.getElementById(`guide-letter-${letter}`);
      if (el && scrollRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const clearAll = () => {
    setSearchQuery("");
    setSelectedLetter(null);
  };

  const isFiltering = searchQuery.trim() || selectedLetter;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-600">aok</span>
          </div>
          <span className="text-sm text-muted-foreground">How-to Guide</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-4" ref={scrollRef}>
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-guide-title">How to Use aok</h1>
          <p className="text-muted-foreground text-sm">
            Everything you need to know about using aok. Browse A-Z or search for any topic.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search the guide... e.g. 'emergency' or 'contacts'"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedLetter(null); }}
              className="pl-9 pr-9"
              data-testid="input-guide-search"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
                data-testid="button-guide-clear-search"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="py-3 px-3">
              <div className="flex flex-wrap gap-0.5 justify-center" data-testid="az-guide-letter-bar">
                {ALPHABET.map((letter) => {
                  const hasTopics = availableLetters.has(letter);
                  const isActive = selectedLetter === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => hasTopics && handleLetterClick(letter)}
                      disabled={!hasTopics}
                      className={`w-8 h-8 text-xs font-semibold rounded transition-colors ${
                        isActive
                          ? "bg-green-600 text-white"
                          : hasTopics
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/30 cursor-default"
                      }`}
                      data-testid={`button-guide-letter-${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
              {isFiltering && (
                <div className="flex justify-center mt-2">
                  <Button variant="outline" size="sm" onClick={clearAll} data-testid="button-guide-clear-all">
                    <X className="w-3 h-3 mr-1" /> Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No results found{searchQuery ? ` for "${searchQuery}"` : ""}</p>
            <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse using the letters above</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={clearAll} data-testid="button-guide-reset">
              Clear all filters
            </Button>
          </div>
        ) : searchQuery.trim() ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filteredTopics.length} result{filteredTopics.length !== 1 ? "s" : ""}</p>
            {filteredTopics.map((topic) => (
              <Card key={topic.id}>
                <CardContent className="py-0 px-0">
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover-elevate rounded-md"
                    data-testid={`button-guide-topic-${topic.id}`}
                  >
                    <span className="text-sm font-medium">{highlightMatch(topic.title, searchQuery)}</span>
                    {expandedTopics.has(topic.id) ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expandedTopics.has(topic.id) && (
                    <div className="px-4 pb-4 space-y-2">
                      {topic.content.map((line, i) => (
                        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                          {renderMarkdown(line)}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedByLetter).sort().map((letter) => (
              <div key={letter} id={`guide-letter-${letter}`}>
                <div className="sticky top-14 z-10 bg-background py-1">
                  <h2 className="text-lg font-bold text-green-600 border-b pb-1">{letter}</h2>
                </div>
                <div className="space-y-2 mt-2">
                  {groupedByLetter[letter].map((topic) => (
                    <Card key={topic.id}>
                      <CardContent className="py-0 px-0">
                        <button
                          onClick={() => toggleTopic(topic.id)}
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover-elevate rounded-md"
                          data-testid={`button-guide-topic-${topic.id}`}
                        >
                          <span className="text-sm font-medium">{topic.title}</span>
                          {expandedTopics.has(topic.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                        {expandedTopics.has(topic.id) && (
                          <div className="px-4 pb-4 space-y-2">
                            {topic.content.map((line, i) => (
                              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                                {renderMarkdown(line)}
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">{sortedTopics.length} topics available</p>
            </div>
          </div>
        )}

        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            Need more help? Get in touch with us.
          </p>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-to-home">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
