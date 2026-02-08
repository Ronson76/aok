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
          <StepBox icon={CreditCard} label="Stripe Subscription" sublabel="7-day free trial, then monthly billing" badge="Stripe" />
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
          <StepBox icon={Mail} label="Primary Contact Notified" sublabel="Email sent to primary contact on every check-in" badge="Resend" />
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

        <WorkflowSection icon={Activity} title="Fitness Tracking (Strava)" description="OAuth2 Strava integration for activity tracking" color="orange">
          <StepBox icon={Activity} label="Connect Strava" sublabel="User authorises via Strava OAuth2" />
          <StepBox icon={Lock} label="Token Exchange" sublabel="Auth code exchanged for access + refresh tokens" />
          <StepBox icon={RefreshCw} label="Auto Token Refresh" sublabel="Tokens refreshed automatically when expired (6-hour expiry)" />
          <StepBox icon={Activity} label="Fetch Activities" sublabel="Recent activities displayed with distance, duration, elevation" />
          <StepBox icon={Layers} label="Athlete Stats" sublabel="All-time and 4-week summaries for rides, runs, swims" />
          <StepBox icon={Unlink} label="Disconnect" sublabel="Deauthorise and remove stored tokens" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Users} title="Contact Management" description="Emergency contact lifecycle" color="blue">
          <StepBox icon={UserPlus} label="Add Contact" sublabel="Name, email, phone, relationship" />
          <StepBox icon={Mail} label="Confirmation Email" sublabel="Contact must confirm within 10 minutes" badge="Resend" />
          <StepBox icon={CheckCircle} label="Contact Confirmed" sublabel="Contact is now active and receives alerts" />
          <StepBox icon={RefreshCw} label="Reminder System" sublabel="Auto-reminder for unconfirmed contacts every 24 hours" />
          <StepBox icon={Shield} label="Primary Contact" sublabel="One contact designated to receive all check-in notifications" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={CreditCard} title="Subscription & Payment" description="Stripe billing and subscription management" color="purple">
          <StepBox icon={CreditCard} label="Checkout" sublabel="Stripe Checkout with Apple Pay / Google Pay" badge="Stripe" />
          <StepBox icon={Clock} label="7-Day Free Trial" sublabel="Full access during trial period" />
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

        <WorkflowSection icon={Radio} title="Lone Worker Sessions" description="7-phase lone worker protection" color="teal">
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
          <StepBox icon={CheckCircle} label="Normal Incoming Call" sublabel="Supervisor answers on their phone — no app needed" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Brain} title="Wellbeing AI Chat" description="AI-powered emotional support" color="pink">
          <StepBox icon={Brain} label="Chat Session" sublabel="GPT-4o powered conversational support" badge="OpenAI" />
          <StepBox icon={Heart} label="Mood Detection" sublabel="AI analyses mood patterns from conversations" />
          <StepBox icon={Phone} label="Voice Chat" sublabel="Speech-to-text and text-to-speech" badge="OpenAI" />
          <StepBox icon={Shield} label="Ephemeral Data" sublabel="Chat history not permanently stored (GDPR)" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Clock} title="Background Schedulers" description="Automated server-side processes" color="amber">
          <StepBox icon={AlertTriangle} label="Emergency Alert Scheduler" sublabel="Checks every 60 seconds for overdue alerts" badge="60s" />
          <StepBox icon={Bell} label="Push Notification Scheduler" sublabel="Checks every 30 seconds for pending notifications" badge="30s" />
          <StepBox icon={Mail} label="Contact Reminder Scheduler" sublabel="Checks every 5 minutes for unconfirmed contacts" badge="5m" />
          <StepBox icon={MessageSquare} label="SMS Check-in Scheduler" sublabel="Checks every 2 minutes for overdue check-ins" badge="2m" />
          <StepBox icon={RefreshCw} label="Data Cleanup" sublabel="Removes expired contacts and stale sessions" />
        </WorkflowSection>

        <FlowArrow />

        <WorkflowSection icon={Smartphone} title="Native App Features" description="Capacitor-powered mobile capabilities" color="green">
          <StepBox icon={Smartphone} label="Shake to SOS" sublabel="Motion detection triggers emergency" />
          <StepBox icon={Bell} label="Push Notifications" sublabel="Native push via Capacitor" />
          <StepBox icon={MapPin} label="Background Location" sublabel="GPS sharing during emergencies" />
          <StepBox icon={Layers} label="PWA Support" sublabel="Service worker for offline access" />
        </WorkflowSection>

        <div className="py-6 text-center text-xs text-muted-foreground">
          aok Site Workflows Overview
        </div>
      </div>
    </div>
  );
}
