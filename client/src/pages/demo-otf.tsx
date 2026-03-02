import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Bell, Users, Clock, CheckCircle, Mail,
  MapPin, Phone, AlertTriangle, Building2,
  ChevronRight, Shield, Lock, TrendingUp, ArrowRight,
  ArrowLeft, HardHat, Eye, FileCheck,
  ClipboardCheck, BarChart3, BookOpen,
  UserCheck, Siren, Activity,
  GraduationCap, HandHeart, Home,
  MessageCircle, Briefcase, ChevronDown, ChevronUp
} from "lucide-react";

const PLATFORM_FEATURES = [
  {
    name: "Client Registration",
    icon: <UserCheck className="h-5 w-5" />,
    description: "Register individuals with assigned supervisors, personalised check-in schedules, and reference codes. Bulk import via Excel for onboarding at scale.",
    examples: [
      "Women referred for crisis support",
      "Students paired with mentors",
      "Rough sleepers engaging with outreach",
      "Employees registered by their employer",
    ],
  },
  {
    name: "Scheduled Check-ins",
    icon: <Bell className="h-5 w-5" />,
    description: "Configurable welfare check-ins from every hour to every 48 hours. Clients confirm they are safe via app, SMS, or email. Missed check-ins trigger automatic escalation.",
    examples: [
      "Daily welfare prompts for vulnerable adults",
      "Weekly engagement tracking for mentored students",
      "Hourly safety confirmations for lone workers",
      "Session attendance tracking at drop-in centres",
    ],
  },
  {
    name: "Overdue Alerts",
    icon: <AlertTriangle className="h-5 w-5" />,
    description: "When a check-in is missed, AOK automatically notifies the assigned supervisor via SMS and email. The dashboard flags overdue clients in real time so no one falls through the gaps.",
    examples: [
      "Key worker notified when a client stops responding",
      "Team leader alerted when a student disengages",
      "Manager flagged when a lone worker misses a timed check-in",
    ],
  },
  {
    name: "Emergency SOS",
    icon: <Siren className="h-5 w-5" />,
    description: "One-tap emergency alert with GPS location. Instantly notifies all designated contacts with the person's exact coordinates. Works anywhere with a mobile signal.",
    examples: [
      "Outreach worker encountering danger on the streets",
      "Lone worker in an isolated or hostile environment",
      "Client in immediate crisis needing urgent support",
    ],
  },
  {
    name: "Safeguarding Hub",
    icon: <Shield className="h-5 w-5" />,
    description: "Log safeguarding concerns with full details, categorisation, evidence, and escalation to designated safeguarding leads. Every action recorded in a tamper-evident audit trail.",
    examples: [
      "Domestic abuse disclosure during a support session",
      "Child protection concern raised during mentoring",
      "Self-harm disclosure in a group workshop",
      "Welfare concern about a rough sleeper",
    ],
  },
  {
    name: "Lone Worker Hub",
    icon: <HardHat className="h-5 w-5" />,
    description: "Real-time safety monitoring for staff working alone or in isolated environments. Timed sessions with automatic escalation if a worker fails to check in.",
    examples: [
      "Evening street outreach delivering supplies",
      "Home visits to vulnerable individuals",
      "Staff working alone in community centres",
      "Field workers in remote locations",
    ],
  },
  {
    name: "Activity Log and Audit Trail",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Every interaction, check-in, alert, and action is logged with timestamps in a tamper-evident record. Export to PDF or CSV for governance, inspections, and compliance.",
    examples: [
      "Evidencing key worker interactions for commissioners",
      "Ofsted-ready safeguarding records",
      "Trustee governance reporting",
      "Grant application outcome evidence",
    ],
  },
  {
    name: "Analytics and Funding Dashboard",
    icon: <BarChart3 className="h-5 w-5" />,
    description: "Visualise engagement rates, check-in compliance, safeguarding actions, and client outcomes. Generate funder-ready reports that evidence impact with real data.",
    examples: [
      "Quarterly outcomes reports for grant funders",
      "Anonymised engagement data for partner schools",
      "Commissioner evidence packs",
      "Trustee impact summaries",
    ],
  },
  {
    name: "Team Management",
    icon: <Users className="h-5 w-5" />,
    description: "Role-based access for staff across multiple programmes. Assign supervisors, manage seats, and control who sees what. All under one organisation account.",
    examples: [
      "Separate teams for different programmes",
      "Supervisor-level access for key workers",
      "Read-only access for managers and trustees",
      "Multi-site organisations with shared governance",
    ],
  },
];

function FeatureCard({ feature, index }: { feature: typeof PLATFORM_FEATURES[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border" data-testid={`card-feature-${index}`}>
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-start gap-3">
          <div className="bg-green-50 dark:bg-green-950 p-2 rounded-lg flex-shrink-0">
            {feature.icon}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold" data-testid={`text-feature-name-${index}`}>{feature.name}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-green-700 dark:text-green-400 font-medium"
              data-testid={`button-examples-${index}`}
            >
              {expanded ? "Hide" : "Show"} examples
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {feature.examples.map((example, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PROCESS_STEPS = [
  {
    step: "1",
    title: "Organisation account created",
    description: "Your organisation gets a single AOK account. You choose which modules to activate - check-ins, safeguarding, lone worker, analytics - based on what your teams need.",
  },
  {
    step: "2",
    title: "Teams and programmes set up",
    description: "Create separate bundles for each programme or team. Assign staff with role-based access. Each programme operates independently under one account.",
  },
  {
    step: "3",
    title: "Clients registered",
    description: "Register individuals one by one or bulk import via Excel. Each client gets a reference code, an assigned supervisor, and a personalised check-in schedule.",
  },
  {
    step: "4",
    title: "Welfare monitoring begins",
    description: "Clients receive check-in prompts on schedule. Missed check-ins trigger automatic alerts to supervisors. Safeguarding concerns are logged as they arise.",
  },
  {
    step: "5",
    title: "Evidence and reporting",
    description: "Every interaction is captured in a tamper-evident audit trail. Generate compliance reports, funder evidence packs, and governance summaries on demand.",
  },
];

export default function DemoOTF() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-demo-otf">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/demo">
              <Button variant="ghost" size="sm" data-testid="button-back-demo">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              <span className="text-lg font-bold text-green-600">aok</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs" data-testid="badge-demo-label">For Organisations</Badge>
        </div>
      </header>

      <section className="py-12 px-4 bg-gradient-to-b from-green-50 to-background dark:from-green-950 dark:to-background">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-demo-title">
            How Organisations Work With AOK
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            AOK is a safeguarding, welfare, and lone worker platform used by organisations to monitor client wellbeing, protect staff, and evidence impact - all from one account.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Safeguarding</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4 text-green-600" />
              <span>Welfare check-ins</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardHat className="h-4 w-4 text-green-600" />
              <span>Lone worker safety</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-green-600" />
              <span>Funder reporting</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-green-600" />
              <span>Audit compliance</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-3" data-testid="text-how-it-works">How It Works</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            Every organisation follows the same structured process. The platform stays consistent - you configure it to match your programmes.
          </p>
          <div className="space-y-4">
            {PROCESS_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg border" data-testid={`step-${i}`}>
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-3" data-testid="text-platform-features">Platform Features</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            The same core features are available to every organisation. Expand each one to see how different types of organisations use them.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_FEATURES.map((feature, i) => (
              <FeatureCard key={i} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <Badge className="bg-green-600 text-white mb-3" data-testid="badge-case-study">Pilot Partner</Badge>
            <h2 className="text-2xl font-bold" data-testid="text-case-study-title">Case Study: Off The Fence</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              Off The Fence is a Brighton and Hove charity tackling poverty and homelessness. They run three programmes - each using AOK's standard platform features configured to their needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border" data-testid="card-case-gateway">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <HandHeart className="h-5 w-5 text-pink-600" />
                  <CardTitle className="text-base">Gateway Women's Centre</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Support for women facing crisis</p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>One-to-one emotional, practical, and spiritual support. Essentials Hub for food, toiletries, and clothing. Workshops on budgeting, employability, and healthy relationships.</p>
                <div className="border-t pt-3">
                  <p className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">AOK features used</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Client Registration
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Scheduled Check-ins
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Safeguarding Hub
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Funding Dashboard
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border" data-testid="card-case-schools">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base">Schools and Youth</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Standing by our young people</p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>One-to-one mentoring, transition support for Year 6 students, 'Where's Your Head At?' courses on anxiety, bereavement, and self-esteem, and safe lunch clubs.</p>
                <div className="border-t pt-3">
                  <p className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">AOK features used</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Client Registration
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Scheduled Check-ins
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Safeguarding Hub
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Analytics Dashboard
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border" data-testid="card-case-antifreeze">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base">Antifreeze</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Supporting individuals out of homelessness</p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Street outreach delivering essential supplies, drop-in sessions with meals and clothing, shower and laundry facilities, and one-to-one key worker support for housing and welfare.</p>
                <div className="border-t pt-3">
                  <p className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">AOK features used</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Lone Worker Hub
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Emergency SOS
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Scheduled Check-ins
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      Funding Dashboard
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-4 rounded-lg border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              Off The Fence uses the same AOK platform as every other organisation - three programmes, one account, standard features configured to their needs. No custom build required.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-3" data-testid="text-who-uses">Who Uses AOK</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            The platform works across any organisation that needs to monitor welfare, protect staff, or evidence safeguarding.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <HandHeart className="h-6 w-6 text-pink-600" />, title: "Charities", desc: "Crisis support, homelessness services, women's centres, food banks" },
              { icon: <GraduationCap className="h-6 w-6 text-indigo-600" />, title: "Education", desc: "Schools, youth mentoring, transition support, pastoral care" },
              { icon: <Building2 className="h-6 w-6 text-blue-600" />, title: "Employers", desc: "Lone workers, field staff, remote employees, site workers" },
              { icon: <Shield className="h-6 w-6 text-amber-600" />, title: "Care providers", desc: "Domiciliary care, supported housing, community outreach" },
            ].map((sector, i) => (
              <Card key={i} className="border text-center" data-testid={`card-sector-${i}`}>
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex justify-center mb-3">{sector.icon}</div>
                  <h4 className="text-sm font-semibold">{sector.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{sector.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-compliance-title">Built for Compliance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <Lock className="h-5 w-5 text-green-600" />, title: "End-to-end encryption", desc: "All data encrypted at rest and in transit" },
              { icon: <FileCheck className="h-5 w-5 text-green-600" />, title: "GDPR compliant", desc: "Data processing agreements and privacy by design" },
              { icon: <ClipboardCheck className="h-5 w-5 text-green-600" />, title: "Tamper-evident audit trail", desc: "Every action logged with timestamps - fully auditable" },
              { icon: <Shield className="h-5 w-5 text-green-600" />, title: "Governance ready", desc: "Reports aligned with trustee, Ofsted, and commissioner obligations" },
              { icon: <TrendingUp className="h-5 w-5 text-green-600" />, title: "Impact evidence", desc: "Quantifiable outcomes for funders, commissioners, and trustees" },
              { icon: <Building2 className="h-5 w-5 text-green-600" />, title: "Multi-programme support", desc: "Separate bundles per programme under one organisation account" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border" data-testid={`compliance-${i}`}>
                <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                <div>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-green-50 dark:bg-green-950">
        <div className="container mx-auto max-w-2xl text-center space-y-6">
          <ShieldCheck className="h-12 w-12 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold" data-testid="text-cta-title">Start a pilot with AOK</h2>
          <p className="text-muted-foreground">
            Get in touch to discuss how AOK can support your organisation. Same platform, configured to your programmes - no custom build, no bespoke development.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="mailto:hello@aok.uk?subject=AOK%20Organisation%20Pilot%20Request">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-green-600" data-testid="button-contact-pilot">
                <Mail className="h-4 w-4" />
                Request a Pilot
              </Button>
            </a>
            <Link href="/organisations">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" data-testid="button-learn-more">
                Learn More
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4" data-testid="footer-otf-demo">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-600">aok</span>
            <span className="text-sm text-muted-foreground">Safeguarding and Welfare Platform</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" data-testid="link-footer-privacy">Privacy</Link>
            <Link href="/terms" data-testid="link-footer-terms">Terms</Link>
            <Link href="/demo" data-testid="link-footer-demo">Main Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
