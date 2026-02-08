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
      "Complete payment (7-day free trial, then just £6.99/month). Apple Pay and Google Pay are supported.",
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
      "Building a streak is a great way to maintain consistent safety habits.",
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
    id: "digital-will",
    title: "Digital will",
    content: [
      "Securely store important documents like your will, insurance details, or other vital information.",
      "Go to **Wellbeing > Digital Will** to upload and manage your documents.",
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
      "You can cancel the alert if it was triggered accidentally.",
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
      "Once the emergency ends (you deactivate or hold to cancel), the recording is automatically saved and uploaded.",
      "You can view, download, and delete your saved recordings in **Settings** under **Saved Recordings**.",
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
      "After 7 days, your subscription automatically begins at £6.99/month.",
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
      "This helps you stay accountable and track your safety habits.",
    ],
  },
  {
    id: "installing-app",
    title: "Installing the app",
    content: [
      "aok works as a web app that can be installed on your phone's home screen.",
      "On **iPhone**: open aok in Safari, tap the Share button, then **Add to Home Screen**.",
      "On **Android**: open aok in Chrome, tap the menu (three dots), then **Add to Home Screen** or **Install App**.",
      "Once installed, it works just like a native app with offline support.",
    ],
  },
  {
    id: "login",
    title: "Logging in",
    content: [
      "Open aok and enter your email address and password.",
      "You can also log in using **Google** for a quicker sign-in experience.",
      "If you're managed by an organisation, you may log in using your unique **reference number** instead.",
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
      "The wellbeing AI can detect mood patterns and offer proactive support.",
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
    id: "offline-safety",
    title: "Offline safety",
    content: [
      "If your phone loses internet connection, aok displays an emergency overlay.",
      "The overlay shows quick-dial buttons for your **primary contact** and **999**.",
      "The overlay disappears automatically when your connection is restored.",
      "This ensures you always have access to emergency calling even without data.",
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
      "This information is shared with your emergency contacts if an alert is triggered.",
    ],
  },
  {
    id: "fitness-tracking",
    title: "Fitness tracking",
    content: [
      "Record your runs, walks, and rides directly inside aok using your phone's GPS as part of your overall wellbeing picture.",
      "Go to **Wellbeing > Fitness Tracking** from the bottom menu.",
      "Choose an activity type (run, walk, or cycle), select your privacy level, and tap **Start** to begin recording.",
      "While recording you can **pause**, **resume**, and **stop** your activity. GPS points are captured automatically to map your route.",
      "After stopping, your activity is saved with distance, duration, pace (or speed for cycling), and a route map.",
      "View your activity history in the **History** tab with filters by type. Tap any activity to see full stats and a route map.",
      "Use the **Feed** tab to see public and friends' activities. Like and comment on activities to stay connected.",
      "Use the **Social** tab to search for and follow other aok users.",
      "Toggle **Share live activity with contacts** while recording to let your emergency contacts see your current route.",
      "If you trigger an emergency while recording, your route and last known location are automatically attached to the alert.",
      "If your organisation manages your account, fitness tracking may be enabled or disabled by your organisation administrator.",
    ],
  },
  {
    id: "pricing",
    title: "Pricing and plans",
    content: [
      "aok offers simple, transparent pricing with all features included:",
      "**7-Day Free Trial** — full access to every feature, no payment details required upfront. Cancel anytime during the trial.",
      "**Complete Protection** — £6.99/month or £69.99/year (save 2 months). Includes check-ins, emergency alerts, SMS and voice call alerts, GPS location sharing, wellbeing AI chat, mood tracking, pet protection, digital will storage, GPS fitness tracking, and a tree planted via Ecologi.",
      "**Organisations** — custom pricing for bundles of seats. Includes everything in Complete Protection plus a dedicated organisation dashboard, bulk client management, staff roles, safeguarding hub, lone worker monitoring, Call Supervisor, reports, and emergency recording per-client controls.",
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
      "6. You're all set — check in on time each day to stay safe.",
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
      "**Can't log in?** — check your email and password are correct, or use Forgot Password.",
      "**Contacts not receiving alerts?** — make sure they've confirmed via the email link within 10 minutes.",
      "**Missed check-in not triggering alerts?** — ensure you have at least one confirmed emergency contact.",
      "**SMS not arriving?** — check your phone number is correct in Settings.",
      "**App not loading?** — try refreshing, clearing your browser cache, or reinstalling from your home screen.",
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
      "Detects mood patterns from your tracking and offers proactive support.",
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
            Everything you need to know about staying safe with aok. Browse A-Z or search for any topic.
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
