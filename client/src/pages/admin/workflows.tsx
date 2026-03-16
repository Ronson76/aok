import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowDown,
  ShieldCheck,
  UserPlus,
  LogIn,
  Bell,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  CreditCard,
  KeyRound,
  Users,
  Building2,
  Shield,
  Brain,
  Smartphone,
  MapPin,
  Heart,
  PawPrint,
  FileText,
  Send,
  CheckCircle,
  Timer,
  Siren,
  Radio,
  RefreshCw,
  Layers,
  Video,
  Lock,
  Activity,
  Unlink,
} from "lucide-react";

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="w-5 h-5 text-muted-foreground/60" />
    </div>
  );
}

function StepBox({ icon: Icon, label, sublabel, badge }: { icon: typeof ShieldCheck; label: string; sublabel?: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-md bg-background" data-testid={`step-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground leading-tight">{sublabel}</p>}
      </div>
      {badge && <Badge variant="outline" className="flex-shrink-0 text-xs">{badge}</Badge>}
    </div>
  );
}

function WorkflowSection({ icon: Icon, title, description, color, children }: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600", border: "" },
    blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600", border: "" },
    red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600", border: "border-red-200 dark:border-red-800" },
    amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600", border: "border-amber-200 dark:border-amber-800" },
    purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600", border: "border-purple-200 dark:border-purple-800" },
    indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600", border: "border-indigo-200 dark:border-indigo-800" },
    emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600", border: "border-emerald-200 dark:border-emerald-800" },
    pink: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600", border: "border-pink-200 dark:border-pink-800" },
    teal: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600", border: "border-teal-200 dark:border-teal-800" },
    orange: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600", border: "border-orange-200 dark:border-orange-800" },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <Card className={c.border} data-testid={`workflow-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${c.bg}`}>
            <Icon className={`w-6 h-6 ${c.text}`} />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

export default function AdminWorkflows() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" data-testid="link-back-admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-green-600" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">aok Site Workflows</h1>
          </div>
          <Badge variant="outline" className="ml-auto" data-testid="badge-live-system">Live System</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">

        <WorkflowSection icon={UserPlus} title="User Registration" description="New user onboarding and account setup" color="green">
          <StepBox icon={UserPlus} label="Sign Up" sublabel="Name, email, password, DOB, mobile, address" />
          <StepBox icon={FileText} label="Terms Acceptance" sublabel="User agrees to terms and conditions" />
          <StepBox icon={CheckCircle} label="Account Created" sublabel="User record stored in database" />
          <StepBox icon={Users} label="Add Emergency Contacts" sublabel="Name, email, phone, relationship" />
          <StepBox icon={Mail} label="Contact Confirmation Emails" sublabel="10-minute expiry window via Resend" badge="Resend" />
          <StepBox icon={CreditCard} label="Stripe Subscription" sublabel="Choose plan (Basic/Essential/Complete), monthly billing" badge="Stripe" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={LogIn} title="Authentication" description="Login, logout, and session management" color="blue">
          <StepBox icon={LogIn} label="Login" sublabel="Email + password, secure session cookie" />
          <StepBox icon={Shield} label="Session Management" sublabel="14-day cookies for users, 12-hour for admins" />
          <StepBox icon={Timer} label="Inactivity Timeout" sublabel="5-minute auto-logout on admin/org dashboards" />
          <StepBox icon={KeyRound} label="Password Reset" sublabel="Email link via Resend, token-based reset" badge="Resend" />
          <StepBox icon={Building2} label="Org Login" sublabel="Staff and team member authentication" />
          <StepBox icon={Shield} label="Admin Login" sublabel="Separate auth with role-based access" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={CheckCircle} title="Check-in Flow" description="Core safety check-in cycle" color="emerald">
          <StepBox icon={Clock} label="Schedule Set" sublabel="User configures 1-48 hour check-in interval" />
          <StepBox icon={Bell} label="Push Notification" sublabel="Reminder sent when check-in is due" badge="Push" />
          <StepBox icon={MessageSquare} label="SMS Reminder" sublabel="Automatic SMS fallback with tokenised check-in link" badge="Twilio" />
          <StepBox icon={CheckCircle} label="User Checks In" sublabel="Manual check-in via dashboard or SMS link" />
          <StepBox icon={Mail} label="Primary Contact/Carer Notified" sublabel="Email sent to primary contact/carer on every check-in" badge="Resend" />
          <StepBox icon={RefreshCw} label="Timer Resets" sublabel="Next check-in window begins" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={AlertTriangle} title="Missed Check-in Alert" description="What happens when a check-in is missed" color="red">
          <StepBox icon={Clock} label="Check-in Overdue" sublabel="Timer expires without user check-in" />
          <StepBox icon={AlertTriangle} label="Missed Check-in Logged" sublabel="Record created with timestamp" />
          <StepBox icon={Mail} label="Email Alerts" sublabel="All confirmed contacts notified via email" badge="Resend" />
          <StepBox icon={Phone} label="Voice Call Alerts" sublabel="Automated voice calls to emergency contacts" badge="Twilio" />
          <StepBox icon={MessageSquare} label="SMS Alerts" sublabel="Text messages to emergency contacts" badge="Twilio" />
          <StepBox icon={Bell} label="Push Notifications" sublabel="Browser push to subscribed contacts" badge="Push" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Siren} title="Emergency Alert" description="Panic button and emergency broadcast" color="red">
          <StepBox icon={Siren} label="Emergency Triggered" sublabel="User presses emergency button or shakes device" />
          <StepBox icon={MapPin} label="Location Captured" sublabel="GPS coordinates + what3words address" badge="what3words" />
          <StepBox icon={Mail} label="Emergency Emails" sublabel="All contacts receive emergency notification" badge="Resend" />
          <StepBox icon={Phone} label="Emergency Voice Calls" sublabel="Automated calls to all emergency contacts" badge="Twilio" />
          <StepBox icon={MessageSquare} label="Emergency SMS" sublabel="Text alerts with location link" badge="Twilio" />
          <StepBox icon={CheckCircle} label="Safety Confirmation" sublabel="Contacts can confirm user is safe via web link" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Video} title="Emergency Recording" description="Opt-in camera and microphone capture during emergencies" color="red">
          <StepBox icon={Shield} label="Recording Enabled" sublabel="User opts in via Settings, or org admin enables for client" />
          <StepBox icon={Siren} label="Emergency Triggered" sublabel="SOS button, shake-to-SOS, or missed check-in activates recording" />
          <StepBox icon={Video} label="Permission Request" sublabel="App requests camera and microphone access if not already granted" />
          <StepBox icon={Video} label="Recording Starts" sublabel="Camera and microphone capture begins automatically" />
          <StepBox icon={Lock} label="Encrypted Upload" sublabel="Recording uploaded to secure Object Storage" />
          <StepBox icon={Send} label="Shared with Contacts" sublabel="Recording shared only with confirmed emergency contacts" />
          <StepBox icon={Clock} label="90-Day Retention" sublabel="Recordings auto-deleted after 90 days" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Activity} title="Fitness Tracking (Built-in)" description="GPS-based activity recording with social features" color="orange">
          <StepBox icon={Activity} label="Start Recording" sublabel="User selects run/walk/cycle and starts GPS tracking" />
          <StepBox icon={MapPin} label="GPS Capture" sublabel="Location points captured every few seconds during recording" />
          <StepBox icon={Clock} label="Pause / Resume" sublabel="User can pause and resume recording at any time" />
          <StepBox icon={Activity} label="Stop & Save" sublabel="Activity saved with distance, duration, pace, steps, calories, route map" />
          <StepBox icon={Users} label="Social Feed" sublabel="Follow users, view feed, like and comment on activities" />
          <StepBox icon={Shield} label="Safety Link" sublabel="Live sharing toggle, route attached to emergency alerts" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={MapPin} title="Route Planning" description="Plan and share routes before heading out" color="orange">
          <StepBox icon={MapPin} label="Set Start & End" sublabel="Tap map to place markers, route calculated via OSRM" badge="OSRM" />
          <StepBox icon={Clock} label="Time Estimates" sublabel="Walk, run, and cycle times at easy/moderate/fast pace" />
          <StepBox icon={Activity} label="Weather Snapshot" sublabel="Temperature, rain probability, and wind at route location" badge="Open-Meteo" />
          <StepBox icon={AlertTriangle} label="Safety Cues" sublabel="Sunset warning if route could finish after dark" />
          <StepBox icon={CheckCircle} label="Pre-Start Checklist" sublabel="Phone charged, headphones, weather checked, keys" />
          <StepBox icon={Shield} label="Save & Share" sublabel="Save route, mark as usual, share with contacts via email" badge="Resend" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Timer} title="Activities Tracker" description="Log everyday activities with GPS and auto-alert" color="teal">
          <StepBox icon={Timer} label="Start Activity" sublabel="Select type, set expected duration, add custom label" />
          <StepBox icon={MapPin} label="GPS Tracking" sublabel="Location tracked throughout activity session" />
          <StepBox icon={Clock} label="Countdown Timer" sublabel="Visual timer shows remaining time" />
          <StepBox icon={AlertTriangle} label="Grace Period" sublabel="10-minute grace if time expires, extend or complete" badge="10 min" />
          <StepBox icon={Siren} label="Auto-Alert" sublabel="Contacts notified if grace period expires without check-in" badge="Resend" />
          <StepBox icon={CheckCircle} label="Complete Activity" sublabel="Session saved to history with status and GPS data" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Users} title="Contact Management" description="Emergency contact lifecycle" color="blue">
          <StepBox icon={UserPlus} label="Add Contact" sublabel="Name, email, phone, relationship" />
          <StepBox icon={Mail} label="Confirmation Email" sublabel="Contact must confirm within 10 minutes" badge="Resend" />
          <StepBox icon={CheckCircle} label="Contact Confirmed" sublabel="Contact is now active and receives alerts" />
          <StepBox icon={RefreshCw} label="Reminder System" sublabel="Auto-reminder for unconfirmed contacts every 24 hours" />
          <StepBox icon={Shield} label="Primary Contact/Carer" sublabel="One contact designated to receive all check-in notifications" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={CreditCard} title="Subscription & Payment" description="Stripe billing and subscription management" color="purple">
          <StepBox icon={CreditCard} label="Checkout" sublabel="Stripe Checkout with Apple Pay / Google Pay" badge="Stripe" />
          <StepBox icon={Clock} label="Plan Selection" sublabel="Basic £2.99 / Essential £9.99 / Complete £16.99" />
          <StepBox icon={CreditCard} label="Monthly Billing" sublabel="Automatic recurring charges" badge="Stripe" />
          <StepBox icon={RefreshCw} label="Cancel / Reactivate" sublabel="Self-service subscription management" />
          <StepBox icon={Layers} label="Webhook Processing" sublabel="Real-time payment event handling" badge="Stripe" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Building2} title="Organisation Client Management" description="How organisations manage their clients" color="indigo">
          <StepBox icon={UserPlus} label="Add Client" sublabel="By email, assign to bundle seat" />
          <StepBox icon={Send} label="Client Invite" sublabel="Email or SMS invite to activate account" badge="Resend" />
          <StepBox icon={CheckCircle} label="Client Activation" sublabel="Client sets password and activates account" />
          <StepBox icon={Layers} label="Feature Control" sublabel="Org toggles wellness features per client" />
          <StepBox icon={Clock} label="Schedule Management" sublabel="Org sets check-in frequency for clients" />
          <StepBox icon={Shield} label="Monitoring" sublabel="Real-time Safe/Pending/Overdue status" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Shield} title="Safeguarding Hub" description="Incident reporting and case management" color="indigo">
          <StepBox icon={AlertTriangle} label="Report Incident" sublabel="Log safeguarding incident with details" />
          <StepBox icon={Heart} label="Report Welfare Concern" sublabel="Flag welfare issues for a client" />
          <StepBox icon={FileText} label="Case File Management" sublabel="Create and track ongoing cases" />
          <StepBox icon={Layers} label="Escalation Rules" sublabel="Automatic escalation based on severity" />
          <StepBox icon={Mail} label="Confirmation Emails" sublabel="Notification of reports and actions" badge="Resend" />
          <StepBox icon={Shield} label="Audit Trail" sublabel="Full history of all safeguarding actions" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Radio} title="Lone Worker Sessions" description="7-phase lone worker session management" color="teal">
          <StepBox icon={Radio} label="Start Session" sublabel="Worker logs job type, location, expected duration" />
          <StepBox icon={Clock} label="Periodic Check-ins" sublabel="Worker confirms safety at intervals" />
          <StepBox icon={Timer} label="Overdue Detection" sublabel="System flags unresponsive workers" />
          <StepBox icon={Siren} label="Panic Button" sublabel="Worker triggers immediate emergency alert" />
          <StepBox icon={MapPin} label="Location Tracking" sublabel="GPS coordinates shared with org" badge="what3words" />
          <StepBox icon={CheckCircle} label="Session Complete" sublabel="Worker ends session, logged to history" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Phone} title="Call Supervisor" description="Org clients ring their supervisor directly" color="indigo">
          <StepBox icon={Phone} label="Client Taps Call Supervisor" sublabel="Button visible on org-managed client dashboard" />
          <StepBox icon={Shield} label="Confirmation Dialog" sublabel="Client confirms they want to place the call" />
          <StepBox icon={Phone} label="Twilio Voice Call" sublabel="Call placed to organisation's phone number" badge="Twilio" />
          <StepBox icon={MessageSquare} label="Voice Message" sublabel="Supervisor hears client name and request to speak" />
          <StepBox icon={CheckCircle} label="Normal Incoming Call" sublabel="Supervisor answers on their phone -  no app needed" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Brain} title="Wellbeing AI Chat" description="AI-powered emotional support" color="pink">
          <StepBox icon={Brain} label="Chat Session" sublabel="GPT-4o powered conversational support" badge="OpenAI" />
          <StepBox icon={Heart} label="Mood Detection" sublabel="AI analyses mood patterns from conversations" />
          <StepBox icon={Phone} label="Voice Chat" sublabel="Speech-to-text and text-to-speech" badge="OpenAI" />
          <StepBox icon={Shield} label="Ephemeral Data" sublabel="Chat history not permanently stored (GDPR)" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={CreditCard} title="Revenue Dashboard" description="Pricing tabs and projection modelling" color="purple">
          <StepBox icon={Layers} label="Pricing Tabs" sublabel="Tier 1, Tier 2, Tier 3, Organisation, Annual" />
          <StepBox icon={CheckCircle} label="Toggle Tiers" sublabel="Click tabs to include/exclude from projections" />
          <StepBox icon={CreditCard} label="Edit Prices" sublabel="Super admins double-click tabs to edit monthly/yearly prices" />
          <StepBox icon={Users} label="Annual Seats" sublabel="Set number of seats for flat annual fee calculations" />
          <StepBox icon={Activity} label="Revenue Projections" sublabel="Calculations update based on active tiers and seat count" />
          <StepBox icon={Shield} label="Cost Analysis" sublabel="Per-unit costs, hosting tiers, margin calculations" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Heart} title="Frontline Support" description="Support signal and interaction logging for vulnerable people" color="pink">
          <StepBox icon={UserPlus} label="Resident Onboarding" sublabel="Org registers resident with reference number" />
          <StepBox icon={Heart} label="Support Signal" sublabel="Resident taps to request support (urgent or routine)" />
          <StepBox icon={Clock} label="Auto-Escalation" sublabel="Urgent: 2min/5min, routine: 5min/10min reminders" badge="Auto" />
          <StepBox icon={Mail} label="Staff Notification" sublabel="Email/SMS alert to assigned staff members" badge="Resend" />
          <StepBox icon={CheckCircle} label="Quick Log" sublabel="Staff logs interaction: type, mood, notes, follow-up" />
          <StepBox icon={Activity} label="Unified Timeline" sublabel="All interactions, signals, check-ins in one view" />
          <StepBox icon={Shield} label="Engagement RAG" sublabel="Green ≤3d, Amber 4-7d, Red 7d+ or open concern" badge="Auto" />
          <StepBox icon={FileText} label="Evidence Reports" sublabel="Exportable safeguarding evidence for funders/regulators" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Building2} title="Kiosk Mode" description="Tablet-based check-in for care settings" color="indigo">
          <StepBox icon={Smartphone} label="Kiosk Setup" sublabel="Organisation enables kiosk mode on shared tablet" />
          <StepBox icon={Users} label="Resident Selection" sublabel="Resident picks their name from the list" />
          <StepBox icon={CheckCircle} label="Tap to Check In" sublabel="Simple one-tap check-in, no password needed" />
          <StepBox icon={RefreshCw} label="Auto-Reset" sublabel="Screen returns to resident list after check-in" />
          <StepBox icon={Shield} label="Audit Logged" sublabel="All kiosk check-ins recorded in audit trail" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Clock} title="Background Schedulers" description="Automated server-side processes" color="amber">
          <StepBox icon={AlertTriangle} label="Emergency Alert Scheduler" sublabel="Checks every 60 seconds for overdue alerts" badge="60s" />
          <StepBox icon={Bell} label="Push Notification Scheduler" sublabel="Checks every 30 seconds for pending notifications" badge="30s" />
          <StepBox icon={Mail} label="Contact Reminder Scheduler" sublabel="Checks every 5 minutes for unconfirmed contacts" badge="5m" />
          <StepBox icon={MessageSquare} label="SMS Check-in Scheduler" sublabel="Checks every 2 minutes for overdue check-ins" badge="2m" />
          <StepBox icon={Heart} label="Signal Escalation Monitor" sublabel="Checks every 60 seconds for unresolved support signals" badge="60s" />
          <StepBox icon={Timer} label="Errand Session Monitor" sublabel="Checks every 60 seconds for overdue activities" badge="60s" />
          <StepBox icon={Radio} label="Lone Worker Monitor" sublabel="Checks every 30 seconds for unresponsive workers" badge="30s" />
          <StepBox icon={Lock} label="Recording Retention" sublabel="Cleans up expired recordings every 24 hours" badge="24h" />
          <StepBox icon={Shield} label="Audit Retention Cleanup" sublabel="Removes expired audit records every 24 hours" badge="24h" />
          <StepBox icon={RefreshCw} label="Data Cleanup" sublabel="Removes expired contacts and stale sessions" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Smartphone} title="Native App (Android & iOS)" description="Capacitor-powered mobile app with Firebase" color="green">
          <StepBox icon={Smartphone} label="Bundled Frontend" sublabel="Full UI packaged inside the app, loads instantly" />
          <StepBox icon={Smartphone} label="Shake to SOS" sublabel="Motion detection triggers emergency alert" />
          <StepBox icon={Bell} label="Firebase Push Notifications" sublabel="Native push via Firebase Cloud Messaging" badge="Firebase" />
          <StepBox icon={MapPin} label="GPS Location" sublabel="Native geolocation during emergencies and activities" />
          <StepBox icon={Activity} label="Haptic Feedback" sublabel="Vibration feedback on check-ins and alerts" />
          <StepBox icon={Shield} label="Status Bar Control" sublabel="Native status bar styling and colour" />
          <StepBox icon={Layers} label="API Connection" sublabel="All data synced with aok.care live server" badge="HTTPS" />
          <StepBox icon={Lock} label="Secure Transport" sublabel="HTTPS-only, CORS-protected API calls" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Shield} title="Operations & Resilience" description="Business continuity and training framework" color="teal">
          <StepBox icon={AlertTriangle} label="Downtime Protocols" sublabel="3 severity levels with defined response procedures" />
          <StepBox icon={FileText} label="Manual Fallback Pack" sublabel="6 downloadable materials for operating during outages" />
          <StepBox icon={Users} label="Staff Training Framework" sublabel="7 role-based modules across 3 pathways" />
          <StepBox icon={Shield} label="Data Quality Assurance" sublabel="8 built-in measures with regulatory alignment" />
        </WorkflowSection>

        <div className="py-6 text-center text-xs text-muted-foreground">
          aok Site Workflows Overview
        </div>
      </div>
    </div>
  );
}
