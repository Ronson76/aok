import { useState } from "react";
import { useLocation } from "wouter";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, BookOpen, Database,
  FileText, CheckCircle, Clock, Users, Download, Printer,
  Server, Wifi, WifiOff, Phone, ClipboardList, Shield,
  GraduationCap, Target, BarChart3, Lock, Eye,
  Hash, RefreshCw, Layers, HeartHandshake, Landmark,
  AlertOctagon, Radio, UserCheck, Zap, Scale
} from "lucide-react";

const DOWNTIME_PROTOCOLS = [
  {
    id: "dt1",
    severity: "Planned Maintenance",
    badge: "low",
    procedure: [
      "72-hour advance notice sent to all organisation administrators via email",
      "In-app banner displayed to all staff 48 hours before maintenance window",
      "Maintenance conducted outside peak hours (typically 02:00–05:00 GMT)",
      "Manual logging packs pre-distributed to team leads before window opens",
      "System restored and verified before start of business day",
    ],
  },
  {
    id: "dt2",
    severity: "Unplanned Outage (< 2 hours)",
    badge: "medium",
    procedure: [
      "Automated health monitoring detects outage and alerts aok operations team",
      "Status page updated within 15 minutes with estimated resolution time",
      "Staff switch to Manual Fallback Pack — paper forms, printed contact lists",
      "Safeguarding lead notified automatically via SMS and email",
      "All manual records digitised and back-entered within 24 hours of restoration",
      "Incident summary sent to administrators with timeline and root cause",
    ],
  },
  {
    id: "dt3",
    severity: "Extended Outage (> 2 hours)",
    badge: "high",
    procedure: [
      "Emergency protocol activated — designated safeguarding lead takes manual coordination",
      "Printed Resident Contact Cards used for all welfare checks and interactions",
      "Phone tree activated for urgent support signals and safeguarding concerns",
      "Manual Incident Log Book opened — tamper-evident numbered pages",
      "Hourly status updates to administrators until resolution",
      "Full post-incident review within 48 hours, shared with board/trustees",
      "All manual records digitised, reconciled, and hash-chain verified on restoration",
    ],
  },
];

const FALLBACK_MATERIALS = [
  {
    id: "fb1",
    title: "Manual Interaction Log Sheet",
    description: "Pre-formatted A4 sheets for recording resident interactions during system downtime. Includes fields for date/time, resident name/reference, interaction category, notes, staff name, and follow-up required. Designed to match digital categories for seamless back-entry.",
    icon: ClipboardList,
    downloadable: true,
  },
  {
    id: "fb2",
    title: "Resident Contact Card Pack",
    description: "Printable cards with resident name, reference code, key worker assignment, last known engagement status, and emergency contacts. Updated automatically — always print fresh before planned maintenance.",
    icon: Users,
    downloadable: true,
  },
  {
    id: "fb3",
    title: "Safeguarding Concern Form",
    description: "Standalone paper form for logging safeguarding concerns when the system is unavailable. Mirrors the digital welfare concern structure: category, risk indicators, immediate actions taken, referral details, and DSL notification confirmation.",
    icon: Shield,
    downloadable: true,
  },
  {
    id: "fb4",
    title: "Emergency Phone Tree",
    description: "Printed cascade call list for reaching staff, managers, safeguarding leads, and emergency services. Automatically generated from your team structure with role-based ordering.",
    icon: Phone,
    downloadable: true,
  },
  {
    id: "fb5",
    title: "Daily Attendance Register",
    description: "Paper sign-in sheet for drop-in services and shelters when kiosk check-in is unavailable. Pre-printed with resident names and reference codes for quick tick-box attendance logging.",
    icon: UserCheck,
    downloadable: true,
  },
  {
    id: "fb6",
    title: "Support Signal Response Card",
    description: "Laminated quick-reference card for staff showing how to handle urgent support requests manually. Includes escalation thresholds, manager contact details, and documentation requirements.",
    icon: Radio,
    downloadable: true,
  },
];

const TRAINING_MODULES = [
  {
    id: "tm1",
    title: "Platform Orientation",
    description: "Introduction to aok — navigating the dashboard, understanding client status indicators, and using the interactive guided tour.",
    duration: "30 mins",
    role: "All Staff",
    topics: ["Dashboard navigation", "Client status indicators (Safe/Pending/Overdue)", "Using the Help Centre", "Guided tour walkthrough"],
    assessedBy: "Guided tour completion + Help Centre quiz",
  },
  {
    id: "tm2",
    title: "Frontline Quick Logging",
    description: "Hands-on training for the Quick Log interface — selecting residents, choosing categories, adding notes, and understanding the 10-second logging target.",
    duration: "20 mins",
    role: "Frontline Staff",
    topics: ["Quick Log workflow", "10 interaction categories", "When to add notes vs. tap-and-go", "Follow-up flagging", "Mobile vs. desktop use"],
    assessedBy: "Supervised logging of 5 practice interactions",
  },
  {
    id: "tm3",
    title: "Data Capture & Risk Assessment",
    description: "Structured training on the Data Capture tool — risk tier assignment, risk indicators, contact types, escalation triggers, and when to flag safeguarding referrals.",
    duration: "45 mins",
    role: "Key Workers, Safeguarding Staff",
    topics: ["Risk tier framework (Low/Medium/High)", "Risk indicator selection", "Automatic safeguarding escalation", "Programme tagging", "CSV import/export"],
    assessedBy: "Scenario-based assessment — 3 case studies with correct risk tiering",
  },
  {
    id: "tm4",
    title: "Safeguarding Hub Operations",
    description: "Managing welfare concerns, logging investigations, updating outcomes, and generating safeguarding reports for compliance and external agencies.",
    duration: "60 mins",
    role: "Safeguarding Leads, Managers",
    topics: ["Creating and categorising welfare concerns", "Investigation logging", "Outcome recording", "DBS and training record management", "Compliance reporting"],
    assessedBy: "End-to-end safeguarding scenario completion",
  },
  {
    id: "tm5",
    title: "Support Signal Response",
    description: "Understanding the Support Signal system — how residents raise signals, staff acknowledgement workflow, escalation timers, and resolution documentation.",
    duration: "25 mins",
    role: "All Staff",
    topics: ["Signal levels (I'm OK, Need Support, Urgent Help)", "Acknowledgement and response workflow", "Escalation timers and manager alerts", "Resolution and notes", "Trauma-informed response principles"],
    assessedBy: "Simulated signal response drill",
  },
  {
    id: "tm6",
    title: "Manual Fallback Procedures",
    description: "Training on business continuity — using paper fallback packs, recording interactions manually, and back-entering data when the system is restored.",
    duration: "30 mins",
    role: "All Staff",
    topics: ["When to activate manual fallback", "Using the Manual Interaction Log Sheet", "Paper safeguarding forms", "Phone tree activation", "Data back-entry process"],
    assessedBy: "Timed fallback drill — complete 3 manual logs in under 5 minutes",
  },
  {
    id: "tm7",
    title: "Manager Dashboard & Reporting",
    description: "Using analytics, engagement metrics, CSV exports, and the Assurance Dashboard for board reporting and commissioner evidence.",
    duration: "40 mins",
    role: "Service Managers, Directors",
    topics: ["Engagement rate interpretation", "Category breakdown analysis", "Staff activity monitoring", "CSV export for funders", "Assurance Dashboard walkthrough"],
    assessedBy: "Generate and interpret a sample monthly report",
  },
];

const DATA_QUALITY_MEASURES = [
  {
    id: "dq1",
    title: "Tamper-Evident Audit Trail",
    icon: Hash,
    description: "Every action in aok is recorded with a SHA-256 hash chain. Each entry references the previous entry's hash, creating a cryptographically verifiable chain. Any attempt to modify or delete a historical record would break the chain, which is automatically detected by the Assurance Dashboard's integrity checks.",
    evidence: "Audit chain integrity score shown on Assurance Dashboard",
  },
  {
    id: "dq2",
    title: "Role-Based Access Control (RBAC)",
    icon: Lock,
    description: "8-tier permission system ensures staff only access and modify data appropriate to their role. Viewers cannot log interactions. Staff cannot access manager analytics. Only safeguarding leads can manage welfare concerns. Every permission boundary is enforced server-side, not just in the UI.",
    evidence: "Permission matrix documented in Help Centre",
  },
  {
    id: "dq3",
    title: "Validated Data Entry",
    icon: CheckCircle,
    description: "All data entry points use Zod schema validation. Risk tiers must be from the defined set. Interaction categories are constrained to the 10 approved types. Reference codes follow the organisation's format. Free-text fields are sanitised. Invalid submissions are rejected with clear error messages.",
    evidence: "Schema validation enforced at API level",
  },
  {
    id: "dq4",
    title: "Immutable Records",
    icon: Shield,
    description: "Critical records — safeguarding concerns, welfare investigations, support signals, and audit entries — cannot be deleted. Records can only be archived with a documented reason. Original data is preserved alongside any amendments, creating a full revision history.",
    evidence: "Archive-only policy enforced in storage layer",
  },
  {
    id: "dq5",
    title: "Automated Engagement Monitoring",
    icon: Eye,
    description: "The RAG (Red/Amber/Green) engagement status system continuously monitors contact frequency per resident. Green requires contact within 3 days, Amber within 4-7 days, Red triggers after 7+ days or any open safeguarding concern. This automated monitoring ensures no resident falls through the cracks.",
    evidence: "RAG indicators visible on Residents tab and Needs Contact alerts",
  },
  {
    id: "dq6",
    title: "Structured Reporting Pipeline",
    icon: BarChart3,
    description: "All reporting draws from the same validated data source. CSV exports, manager dashboards, assurance reports, and funding evidence all reference identical underlying records. There is no separate 'reporting database' — what you log is what appears in reports, eliminating data inconsistency.",
    evidence: "Single-source data architecture",
  },
  {
    id: "dq7",
    title: "Configurable Retention Policies",
    icon: Clock,
    description: "Data retention periods are configurable from 1 to 10 years, aligned with the Limitation Act 1980 and sector-specific guidance. Automated cleanup runs on schedule, with advance notice before any data is removed. Retention settings are audit-logged.",
    evidence: "Retention configuration in organisation settings",
  },
  {
    id: "dq8",
    title: "Staff Attribution & Accountability",
    icon: UserCheck,
    description: "Every interaction, log entry, and data modification is tagged with the staff member who created it. Team member interactions include loggedByMemberId for complete accountability. The Manager Dashboard tracks individual staff activity, enabling supervision and quality assurance.",
    evidence: "Staff name on every timeline entry, staff activity in Manager Dashboard",
  },
];

const COMPLIANCE_STANDARDS = [
  { standard: "UK GDPR", status: "Compliant", detail: "Data Processing Addendum, PII redaction in logs, configurable retention" },
  { standard: "Care Act 2014", status: "Aligned", detail: "Safeguarding Hub, welfare concerns, DSL notifications, investigation tracking" },
  { standard: "CQC Key Lines of Enquiry", status: "Evidenced", detail: "Safe, Effective, Caring, Responsive, Well-led — mapped to platform features" },
  { standard: "Supporting People QAF", status: "Evidenced", detail: "Engagement metrics, outcomes tracking, resident empowerment (Support Signal)" },
  { standard: "Limitation Act 1980", status: "Compliant", detail: "Configurable 1–10 year retention with automated cleanup" },
  { standard: "Housing Ombudsman Code", status: "Aligned", detail: "Complaint tracking, audit trails, response time monitoring" },
];

export default function OrgResilience() {
  useInactivityLogout();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("continuity");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background print:bg-white" data-testid="resilience-page">
      <header className="bg-card border-b sticky top-0 z-40 print:static print:border-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/org/dashboard")} className="print:hidden" data-testid="button-back-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Operations & Resilience
              </h1>
              <p className="text-xs text-muted-foreground">Business continuity, training framework & data quality assurance</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-green-800 dark:text-green-300 mb-1">Operational Resilience Statement</p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  aok is designed so that safeguarding and support services are never solely reliant on the digital platform. 
                  Documented contingency procedures, manual fallback processes, and structured staff training ensure that service 
                  delivery continues uninterrupted during any period of system unavailability. All data quality measures are built 
                  into the platform architecture to maintain the reliability and evidential weight of information used for reporting, 
                  accountability, and funding evidence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:block">
          <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 mb-6 print:hidden" data-testid="resilience-tabs">
            <TabsTrigger value="continuity" className="text-xs sm:text-sm" data-testid="tab-continuity">
              <Server className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Business </span>Continuity
            </TabsTrigger>
            <TabsTrigger value="fallback" className="text-xs sm:text-sm" data-testid="tab-fallback">
              <WifiOff className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Manual </span>Fallback
            </TabsTrigger>
            <TabsTrigger value="training" className="text-xs sm:text-sm" data-testid="tab-training">
              <GraduationCap className="h-4 w-4 mr-1" />
              Training
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs sm:text-sm" data-testid="tab-quality">
              <Database className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Data </span>Quality
            </TabsTrigger>
          </TabsList>

          <TabsContent value="continuity" className="print:block">
            <ContinuityTab />
          </TabsContent>
          <TabsContent value="fallback" className="print:block">
            <FallbackTab />
          </TabsContent>
          <TabsContent value="training" className="print:block">
            <TrainingTab />
          </TabsContent>
          <TabsContent value="quality" className="print:block">
            <DataQualityTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ContinuityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Server className="h-5 w-5 text-blue-600" />
          Business Continuity Protocols
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Documented procedures for maintaining service delivery during planned maintenance and unplanned outages.
        </p>
      </div>

      <div className="space-y-4">
        {DOWNTIME_PROTOCOLS.map((protocol) => (
          <Card key={protocol.id} className={`border-l-4 ${
            protocol.badge === "high" ? "border-l-red-500" :
            protocol.badge === "medium" ? "border-l-amber-500" :
            "border-l-green-500"
          }`} data-testid={`protocol-${protocol.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{protocol.severity}</CardTitle>
                <Badge variant={protocol.badge === "high" ? "destructive" : protocol.badge === "medium" ? "secondary" : "outline"} className="text-xs">
                  {protocol.badge === "high" ? "Critical" : protocol.badge === "medium" ? "Moderate" : "Routine"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {protocol.procedure.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Data Reconciliation on Restoration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            When the platform is restored after any outage, the following reconciliation process ensures data integrity:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">1. Back-Entry</p>
              <p className="text-xs text-muted-foreground">All manual records are entered into the system within 24 hours, tagged with the original timestamp and a "manual entry" flag.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">2. Verification</p>
              <p className="text-xs text-muted-foreground">Service manager reviews back-entered records against paper originals. Discrepancies are flagged and resolved before sign-off.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">3. Audit Seal</p>
              <p className="text-xs text-muted-foreground">Reconciled records are sealed into the hash chain with a post-outage verification marker, maintaining audit trail integrity.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FallbackTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <WifiOff className="h-5 w-5 text-amber-600" />
          Manual Fallback Pack
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pre-prepared materials for maintaining safeguarding and support operations when the digital platform is unavailable.
          These materials should be printed and stored in a clearly marked, accessible location known to all staff.
        </p>
      </div>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-300 mb-1">Preparedness Checklist</p>
              <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Fallback Pack printed and stored in office/staff room</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> All staff know the location of the Fallback Pack</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Resident Contact Cards refreshed within last 30 days</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Phone tree tested within last quarter</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Manual fallback drill completed within last 6 months</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FALLBACK_MATERIALS.map((material) => {
          const Icon = material.icon;
          return (
            <Card key={material.id} className="hover:border-primary/30 transition-colors" data-testid={`fallback-${material.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">{material.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{material.description}</p>
                    {material.downloadable && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" data-testid={`download-${material.id}`}>
                          <Download className="h-3 w-3 mr-1" /> Download PDF
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          <Printer className="h-3 w-3 mr-1" /> Print
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TrainingTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-600" />
          Staff Training & Onboarding Framework
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Structured training programme ensuring all staff are competent in platform use, data quality, and manual fallback procedures.
          Training is role-based — staff complete only the modules relevant to their responsibilities.
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Training Pathway Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="font-bold text-sm text-blue-700 dark:text-blue-300 mb-1">Frontline Staff</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">3 modules · ~80 mins total</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Platform Orientation</li>
                <li>Frontline Quick Logging</li>
                <li>Support Signal Response</li>
                <li>Manual Fallback Procedures</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300 mb-1">Key Workers / Safeguarding</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2">5 modules · ~180 mins total</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>All Frontline Staff modules +</li>
                <li>Data Capture & Risk Assessment</li>
                <li>Safeguarding Hub Operations</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <p className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1">Managers / Directors</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">7 modules · ~250 mins total</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>All Key Worker modules +</li>
                <li>Manager Dashboard & Reporting</li>
                <li>Full platform oversight</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-2">
        {TRAINING_MODULES.map((module) => (
          <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4" data-testid={`training-${module.id}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{module.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{module.role}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {module.duration}
                    </span>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-10 space-y-3">
                <p className="text-sm text-muted-foreground">{module.description}</p>
                <div>
                  <p className="text-xs font-semibold mb-1.5">Topics Covered:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {module.topics.map((topic, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs"><span className="font-semibold">Assessment:</span> <span className="text-muted-foreground">{module.assessedBy}</span></p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Ongoing Quality Assurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">Supervised Practice</p>
              <p className="text-xs text-muted-foreground">New staff complete their first week of logging under supervision. Manager Dashboard staff activity tracking enables ongoing oversight of logging quality and frequency.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">Regular Refresher</p>
              <p className="text-xs text-muted-foreground">Quarterly refresher sessions covering new features, common data quality issues, and updated manual fallback procedures. Refresher completion is tracked alongside safeguarding training records.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">Interactive Help Centre</p>
              <p className="text-xs text-muted-foreground">In-app searchable knowledge base available at all times. Covers every feature with step-by-step instructions. Staff can self-serve answers without leaving their workflow.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-semibold text-sm mb-1">Guided Tour</p>
              <p className="text-xs text-muted-foreground">Re-runnable interactive walkthrough of the full dashboard. Available from the dashboard header at any time. Particularly useful for staff returning from absence or role changes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DataQualityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-600" />
          Data Quality Assurance Framework
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Built-in measures ensuring the reliability, integrity, and evidential weight of all data captured in the platform.
          These controls operate automatically — they are part of the platform architecture, not manual processes.
        </p>
      </div>

      <div className="space-y-3">
        {DATA_QUALITY_MEASURES.map((measure) => {
          const Icon = measure.icon;
          return (
            <Card key={measure.id} data-testid={`quality-${measure.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex-shrink-0">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{measure.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{measure.description}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        {measure.evidence}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-600" />
            Regulatory & Standards Alignment
          </CardTitle>
          <CardDescription className="text-xs">
            How aok's data quality measures map to key regulatory requirements and sector standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {COMPLIANCE_STANDARDS.map((std) => (
              <div key={std.standard} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Landmark className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{std.standard}</p>
                    <p className="text-xs text-muted-foreground truncate">{std.detail}</p>
                  </div>
                </div>
                <Badge variant={std.status === "Compliant" ? "default" : "secondary"} className="text-xs flex-shrink-0 ml-2">
                  {std.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 mb-1">Single Source of Truth Architecture</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                aok uses a unified data model where every interaction, concern, signal, and check-in feeds into the same
                underlying data layer. Whether a record appears in the Frontline Timeline, the Manager Dashboard CSV export,
                the Assurance Dashboard, or a funding evidence report — it references identical, validated, tamper-evident source data.
                There is no data duplication, no separate reporting database, and no manual aggregation step. What staff log is
                exactly what commissioners, funders, and regulators see.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
