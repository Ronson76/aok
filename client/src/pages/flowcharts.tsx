import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowLeft, Shield, User, Building2, HardHat, AlertTriangle, Phone, Mail, Bell, MapPin, Clock, CheckCircle, XCircle, Siren, MessageSquare, Activity, Play, Timer, Battery, ShieldCheck } from "lucide-react";

type FlowTab = "individual" | "organisation" | "loneworker" | "activity";

function FlowStep({ icon: Icon, title, description, variant = "default" }: {
  icon: typeof User;
  title: string;
  description: string;
  variant?: "default" | "trigger" | "action" | "alert" | "success" | "danger";
}) {
  const variants: Record<string, string> = {
    default: "border-border bg-card",
    trigger: "border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/30",
    action: "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30",
    alert: "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950/30",
    success: "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950/30",
    danger: "border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-950/30",
  };

  return (
    <div className={`rounded-md border-2 p-3 ${variants[variant]} max-w-md mx-auto w-full`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      {label && <span className="text-[10px] text-muted-foreground font-medium">{label}</span>}
      <ArrowDown className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function FlowBranch({ leftLabel, rightLabel, left, right }: {
  leftLabel: string;
  rightLabel: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2">
        <ArrowDown className="h-4 w-4 text-muted-foreground -rotate-45" />
        <span className="text-[10px] text-muted-foreground font-medium px-1">OR</span>
        <ArrowDown className="h-4 w-4 text-muted-foreground rotate-45" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{leftLabel}</span>
          {left}
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{rightLabel}</span>
          {right}
        </div>
      </div>
    </div>
  );
}

function IndividualFlowchart() {
  return (
    <div className="space-y-0">
      <h3 className="text-base font-semibold mb-4 text-center">Missed Check-in Flow</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Clock} title="Check-in becomes overdue" description="The user's scheduled check-in time passes without a check-in." variant="trigger" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={Bell} title="Push notification sent" description="If the user has notifications enabled, a push alert is sent to their device every 30 seconds." variant="action" />
        <FlowArrow label="After 5 minutes" />
        <FlowStep icon={MessageSquare} title="SMS check-in link sent" description="A text message with a one-tap check-in link is sent to the user's mobile number. No login needed." variant="action" />
        <FlowArrow label="After 5 minutes overdue" />
        <FlowStep icon={Mail} title="First alert to contacts" description="Email, SMS, and voice call alerts are sent to all confirmed emergency contacts with the user's name and overdue status." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Phone} title="Voice calls to contacts" description="Automated voice calls are made to all emergency contacts, reading out the missed check-in details." variant="alert" />
        <FlowArrow label="Every 15 minutes" />
        <FlowStep icon={Bell} title="Repeat alerts" description="Email, SMS, and voice call alerts repeat every 15 minutes until the user checks in." variant="alert" />
        <FlowArrow label="User checks in" />
        <FlowStep icon={CheckCircle} title="Check-in received — alerts stop" description="The user checks in via the app, SMS link, or push notification. All alerts cease and contacts are notified." variant="success" />
      </div>

      <div className="border-t my-8" />

      <h3 className="text-base font-semibold mb-4 text-center">Emergency Alert Flow (SOS Button)</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Siren} title="User presses SOS button" description="The user taps the emergency alert button on their dashboard or shakes their phone (Shake to SOS)." variant="danger" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={MapPin} title="GPS location captured" description="The user's current GPS location is recorded. A what3words address is generated for precise location sharing." variant="action" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={Mail} title="Email + SMS alerts to contacts" description="All confirmed emergency contacts receive an email and SMS with the user's name, location, and what3words address." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Phone} title="Voice calls to contacts" description="Automated voice calls are made to all contacts, reading out the emergency message with location details." variant="alert" />
        <FlowArrow />
        <FlowBranch
          leftLabel="Continuous tracking ON"
          rightLabel="Continuous tracking OFF"
          left={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={MapPin} title="Location updates every 5 mins" description="Updated GPS coordinates are sent to contacts via email/SMS every 5 minutes." variant="alert" />
              <FlowArrow label="Until cancelled" />
              <FlowStep icon={CheckCircle} title="Contact confirms safety" description="A contact clicks the confirmation link and verifies they've spoken to the user." variant="success" />
            </div>
          }
          right={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={AlertTriangle} title="One-time alert sent" description="A single round of alerts is sent. No follow-up location tracking." variant="action" />
              <FlowArrow />
              <FlowStep icon={CheckCircle} title="Contact confirms safety" description="A contact clicks the confirmation link and verifies they've spoken to the user." variant="success" />
            </div>
          }
        />
      </div>
    </div>
  );
}

function OrganisationFlowchart() {
  return (
    <div className="space-y-0">
      <h3 className="text-base font-semibold mb-4 text-center">Missed Check-in Flow (Org Client)</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Clock} title="Client's check-in becomes overdue" description="The organisation-managed client's scheduled check-in time passes without a check-in." variant="trigger" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={Bell} title="Push notification to client" description="A push notification is sent to the client's device reminding them to check in." variant="action" />
        <FlowArrow label="After 5 minutes" />
        <FlowStep icon={MessageSquare} title="SMS check-in link sent" description="A text message with a one-tap check-in link is sent to the client's mobile." variant="action" />
        <FlowArrow label="After 5 minutes overdue" />
        <FlowStep icon={Mail} title="Alert to client's emergency contacts" description="Email, SMS, and voice call alerts sent to the client's confirmed emergency contacts (set by the client or org)." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Phone} title="Voice calls to contacts" description="Automated voice calls are made to all emergency contacts, reading out the missed check-in details and client information." variant="alert" />
        <FlowArrow label="Every 15 minutes" />
        <FlowStep icon={Bell} title="Repeat alerts" description="Email, SMS, and voice call alerts continue every 15 minutes until the client checks in." variant="alert" />
        <FlowArrow />
        <FlowStep icon={Building2} title="Org dashboard updates" description="The organisation's dashboard shows the client as 'overdue' in real-time. Staff can view status from the client management screen." variant="action" />
        <FlowArrow label="Client checks in" />
        <FlowStep icon={CheckCircle} title="Check-in received — alerts stop" description="The client checks in via app, SMS link, or push notification. Status updates across the org dashboard." variant="success" />
      </div>

      <div className="border-t my-8" />

      <h3 className="text-base font-semibold mb-4 text-center">Emergency Alert Flow (Org Client SOS)</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Siren} title="Client presses SOS button" description="The organisation-managed client taps the emergency alert button or uses Shake to SOS." variant="danger" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={MapPin} title="GPS + what3words captured" description="GPS coordinates and a what3words address are recorded for the client's location." variant="action" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Mail} title="Email + SMS to emergency contacts" description="All confirmed emergency contacts receive alerts with the client's name, location, and what3words." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Phone} title="Voice calls to contacts" description="Automated voice calls made to all emergency contacts with the emergency details." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Building2} title="Safeguarding incident created" description="An incident is automatically logged in the organisation's safeguarding system with severity 'Immediate Danger'." variant="danger" />
        <FlowArrow />
        <FlowStep icon={Building2} title="Org dashboard shows active SOS" description="The emergency appears on the organisation's analytics dashboard under 'Active SOS Alerts' with live location." variant="alert" />
        <FlowArrow label="If continuous tracking ON" />
        <FlowStep icon={MapPin} title="Location updates every 5 mins" description="Updated GPS coordinates sent to contacts via email/SMS every 5 minutes until resolved." variant="alert" />
        <FlowArrow label="Contact confirms safety" />
        <FlowStep icon={CheckCircle} title="Emergency resolved" description="A contact confirms the client is safe. The incident is updated and the emergency alert is deactivated." variant="success" />
      </div>
    </div>
  );
}

function LoneWorkerFlowchart() {
  return (
    <div className="space-y-0">
      <h3 className="text-base font-semibold mb-4 text-center">Missed Check-in Flow (Lone Worker)</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Clock} title="Lone worker's check-in becomes due" description="During an active shift, the worker's next check-in time arrives based on their check-in interval." variant="trigger" />
        <FlowArrow label="Check-in window passes" />
        <FlowStep icon={AlertTriangle} title="Status changes to 'Check-in Due'" description="The worker's status on the Live Monitor changes from 'Active' to 'Check-in Due' (amber)." variant="trigger" />
        <FlowArrow label="Grace period expires (2 mins)" />
        <FlowStep icon={XCircle} title="Status changes to 'Unresponsive'" description="The worker is marked as 'Unresponsive' (red) on the Live Monitor. Escalation begins." variant="danger" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={Phone} title="Supervisor alerted (primary)" description="The worker's designated supervisor receives an SMS, email, and voice call with the worker's name, job type, and last known GPS location." variant="alert" />
        <FlowArrow />
        <FlowStep icon={Building2} title="Audit trail entry created" description="A 'missed_checkin_alert' entry is logged in the organisation's audit trail with full details of the escalation." variant="action" />
        <FlowArrow />
        <FlowStep icon={MapPin} title="Live Monitor shows location" description="The supervisor can view the worker's last known GPS position on the Live Monitor map with a pulsing red marker." variant="action" />

        <FlowArrow />
        <FlowBranch
          leftLabel="Worker checks in"
          rightLabel="Worker remains unresponsive"
          left={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={CheckCircle} title="Worker checks in" description="The worker taps 'Check In' on their shift screen. Status returns to 'Active' (green)." variant="success" />
            </div>
          }
          right={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={Phone} title="Supervisor calls worker" description="Supervisor calls the worker directly to verify their safety." variant="alert" />
              <FlowArrow />
              <FlowStep icon={Shield} title="Supervisor cancels emergency" description="Supervisor enters the organisation password on the Live Monitor and confirms they've spoken to the worker." variant="success" />
            </div>
          }
        />
      </div>

      <div className="border-t my-8" />

      <h3 className="text-base font-semibold mb-4 text-center">Emergency Alert Flow (Lone Worker Panic)</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Siren} title="Lone worker triggers panic" description="The worker presses the SOS/Panic button during an active shift, or uses Shake to SOS." variant="danger" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={MapPin} title="GPS + what3words captured" description="The worker's GPS coordinates and what3words address are captured from their device." variant="action" />
        <FlowArrow label="Immediately" />
        <FlowStep icon={AlertTriangle} title="Status changes to 'Panic'" description="The worker's status on the Live Monitor changes to 'Panic' (flashing red). All supervisors see the alert." variant="danger" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Mail} title="Email + SMS to emergency contacts" description="All confirmed emergency contacts and the supervisor receive email and SMS alerts with location." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Phone} title="Voice calls to contacts" description="Automated voice calls are made to emergency contacts and the supervisor." variant="alert" />
        <FlowArrow label="Simultaneously" />
        <FlowStep icon={Building2} title="Safeguarding incident created" description="An 'Immediate Danger' incident is auto-logged in the organisation's safeguarding system." variant="danger" />
        <FlowArrow />
        <FlowStep icon={Building2} title="Audit trail entry created" description="Full details of the panic alert are logged in the organisation's tamper-evident audit trail." variant="action" />
        <FlowArrow label="If continuous tracking ON" />
        <FlowStep icon={MapPin} title="Location updates every 5 mins" description="Updated GPS coordinates sent to contacts and visible on the Live Monitor map." variant="alert" />
        <FlowArrow />
        <FlowBranch
          leftLabel="Supervisor resolves"
          rightLabel="Contact confirms safety"
          left={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={Phone} title="Supervisor calls worker" description="Supervisor contacts the worker to verify their safety." variant="action" />
              <FlowArrow />
              <FlowStep icon={ShieldCheck} title="Organisation password verified" description="Supervisor enters the organisation dashboard password and confirms they've spoken to the worker." variant="success" />
            </div>
          }
          right={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={CheckCircle} title="Contact confirms via link" description="An emergency contact clicks the safety confirmation link in their email." variant="success" />
            </div>
          }
        />
        <FlowArrow />
        <FlowStep icon={CheckCircle} title="Emergency resolved — shift continues" description="The emergency is deactivated. All alerts stop. The worker's shift remains active and they can continue working." variant="success" />
      </div>
    </div>
  );
}

function ActivityFlowchart() {
  return (
    <div className="space-y-0">
      <h3 className="text-base font-semibold mb-4 text-center">Activity Tracker Flow</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Activity} title="User selects an activity" description="The user chooses an activity type (walking, shopping, errands, dog walking, exercise, first date, etc.) from the activities grid." variant="default" />
        <FlowArrow />
        <FlowStep icon={Timer} title="Duration and label set" description="The user sets how long they expect to be and optionally adds a custom label (e.g. 'Walking to the pharmacy')." variant="default" />
        <FlowArrow label="Tap 'Start Activity'" />
        <FlowStep icon={Play} title="Activity session begins" description="A countdown timer starts. GPS tracking begins recording the user's location throughout the session." variant="action" />
        <FlowArrow label="GPS active" />
        <FlowStep icon={MapPin} title="Location tracked continuously" description="The user's GPS position is recorded throughout the activity. Primary contact and 999 quick-dial buttons are available on screen." variant="action" />
        <FlowArrow />
        <FlowBranch
          leftLabel="Completes on time"
          rightLabel="Timer runs out"
          left={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={CheckCircle} title="User taps 'I'm Done'" description="The user completes the activity before time runs out. Session is marked as completed." variant="success" />
            </div>
          }
          right={
            <div className="flex flex-col items-center gap-0 w-full">
              <FlowStep icon={AlertTriangle} title="Grace period begins (10 mins)" description="The expected time has passed. A 10-minute grace period starts with an on-screen warning." variant="trigger" />
              <FlowArrow />
              <FlowBranch
                leftLabel="User responds"
                rightLabel="Grace expires"
                left={
                  <div className="flex flex-col items-center gap-0 w-full">
                    <FlowStep icon={CheckCircle} title="'I'm OK — Need More Time'" description="The user taps to extend their session or completes the activity." variant="success" />
                  </div>
                }
                right={
                  <div className="flex flex-col items-center gap-0 w-full">
                    <FlowStep icon={Mail} title="Emergency contacts alerted" description="All confirmed emergency contacts are automatically notified with the user's name and last known GPS location." variant="alert" />
                  </div>
                }
              />
            </div>
          }
        />
      </div>

      <div className="border-t my-8" />

      <h3 className="text-base font-semibold mb-4 text-center">Low Battery Alert Flow</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Activity} title="Activity session is active" description="The user has an active activity session running with GPS tracking." variant="action" />
        <FlowArrow label="Battery drops below 20%" />
        <FlowStep icon={Battery} title="Low battery detected" description="The device battery level falls below 20% during an active activity session." variant="trigger" />
        <FlowArrow label="Immediately (once per session)" />
        <FlowStep icon={Mail} title="Primary contacts emailed" description="An automatic email is sent to the user's primary emergency contacts warning that the user's battery is low during an active activity." variant="alert" />
        <FlowArrow />
        <FlowStep icon={AlertTriangle} title="On-screen warning displayed" description="A visual low-battery warning appears on the user's activity screen. This alert only triggers once per session." variant="trigger" />
      </div>

      <div className="border-t my-8" />

      <h3 className="text-base font-semibold mb-4 text-center">Activity Cancellation Flow</h3>
      <div className="flex flex-col items-center gap-0">
        <FlowStep icon={Activity} title="Activity session is active" description="The user has an active activity session running." variant="action" />
        <FlowArrow label="User taps 'Cancel'" />
        <FlowStep icon={XCircle} title="Activity cancelled" description="The user cancels the activity before it completes. No alerts are sent to emergency contacts." variant="default" />
        <FlowArrow />
        <FlowStep icon={CheckCircle} title="Session saved as cancelled" description="The session is saved to the user's activity history with a 'cancelled' status badge. GPS tracking stops." variant="success" />
      </div>
    </div>
  );
}

export default function Flowcharts() {
  const [activeTab, setActiveTab] = useState<FlowTab>("individual");

  const tabs: { id: FlowTab; label: string; icon: typeof User }[] = [
    { id: "individual", label: "Individual User", icon: User },
    { id: "organisation", label: "Organisation Client", icon: Building2 },
    { id: "loneworker", label: "Lone Worker", icon: HardHat },
    { id: "activity", label: "Activity Flow", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Alert Flowcharts</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            How missed check-ins, emergency alerts, and activity tracking are handled for each user type.
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap" data-testid="flowchart-tabs">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className="toggle-elevate"
            >
              <tab.icon className="h-4 w-4 mr-1.5" />
              {tab.label}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 pb-8">
            {activeTab === "individual" && <IndividualFlowchart />}
            {activeTab === "organisation" && <OrganisationFlowchart />}
            {activeTab === "loneworker" && <LoneWorkerFlowchart />}
            {activeTab === "activity" && <ActivityFlowchart />}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          All times are approximate and may vary depending on network conditions and service availability.
        </p>
      </div>
    </div>
  );
}
