import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Bell, Users, Clock, CheckCircle, Mail,
  MapPin, Phone, AlertTriangle, Building2,
  ChevronRight, Shield, Lock, TrendingUp, ArrowRight,
  ArrowLeft, HardHat, FileCheck,
  ClipboardCheck, BarChart3,
  UserCheck, Siren, Activity,
  GraduationCap, HandHeart, Home,
  MessageCircle, Info
} from "lucide-react";

type Programme = "gateway" | "schools" | "antifreeze";

interface AokFit {
  label: string;
  aokFeature: string;
  description: string;
}

interface ProgrammeData {
  name: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  icon: React.ReactNode;
  whatTheyDo: string[];
  whereAokFits: AokFit[];
  honestNote: string;
  scenarios: Array<{
    title: string;
    aokFeature: string;
    theirContext: string;
    howAokHelps: string;
    mockup: React.ReactNode;
  }>;
}

const PROGRAMMES: Record<Programme, ProgrammeData> = {
  gateway: {
    name: "Gateway Women's Centre",
    tagline: "Support for women, by women",
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950",
    borderColor: "border-pink-200 dark:border-pink-800",
    badgeColor: "bg-pink-600",
    icon: <HandHeart className="h-6 w-6 text-pink-600" />,
    whatTheyDo: [
      "One-to-one emotional, practical, and spiritual support - in person, by phone, text, email, or Zoom",
      "Essentials Hub providing food, toiletries, cleaning supplies, and clothing",
      "Advice, information, paperwork support, IT help, and referrals to specialist services",
      "Workshops on budgeting, financial literacy, employability, and healthy relationships",
      "Open to all women facing crisis - self-referral available",
    ],
    whereAokFits: [
      {
        label: "Registering women and assigning key workers",
        aokFeature: "Client Registration",
        description: "When a woman is referred or self-refers to Gateway, staff register her on AOK with a reference code and assigned key worker. This creates a structured, auditable record from day one.",
      },
      {
        label: "Welfare check-ins between sessions",
        aokFeature: "Scheduled Check-ins",
        description: "Between face-to-face sessions, AOK sends welfare check-in prompts. If a woman doesn't respond, her key worker is automatically notified - ensuring no one slips through the gaps between appointments.",
      },
      {
        label: "Logging safeguarding concerns",
        aokFeature: "Safeguarding Hub",
        description: "When staff identify a safeguarding concern during support sessions, they log it through AOK with full details, categorisation, and escalation. Every action is recorded in a tamper-evident audit trail.",
      },
      {
        label: "Evidencing impact for funders",
        aokFeature: "Funding Dashboard",
        description: "Gateway needs to evidence engagement and outcomes to funders. AOK's Funding Dashboard generates compliance-ready reports showing check-in rates, client engagement, and safeguarding actions taken.",
      },
    ],
    honestNote: "Gateway is a direct fit for AOK. Women 16+ receiving ongoing support benefit from structured welfare monitoring, and staff benefit from auditable safeguarding records that satisfy funder and governance requirements.",
    scenarios: [
      {
        title: "A woman is referred to Gateway",
        aokFeature: "Client Registration",
        theirContext: "A woman in crisis is referred for one-to-one emotional and practical support.",
        howAokHelps: "Staff register her on AOK, creating a digital record with an assigned key worker and reference code. This is the auditable starting point for her engagement.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm font-bold text-green-600">aok</span>
              <Badge variant="outline" className="ml-auto text-[10px]">Gateway</Badge>
            </div>
            <h3 className="text-sm font-semibold">Register New Client</h3>
            <div className="space-y-2">
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center">
                <span className="text-xs text-muted-foreground">Sarah M.</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center">
                <span className="text-xs text-muted-foreground">Ref: GW-2026-0147</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Key Worker</span>
                <span className="text-xs text-foreground">Emma T.</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Check-in</span>
                <span className="text-xs text-foreground">Every 24 hours</span>
              </div>
            </div>
            <div className="h-8 rounded-md bg-green-600 flex items-center justify-center mt-1">
              <span className="text-xs text-white font-medium">Register Client</span>
            </div>
          </div>
        ),
      },
      {
        title: "Welfare check between sessions",
        aokFeature: "Scheduled Check-ins",
        theirContext: "Between face-to-face support sessions, Gateway needs to know their women are safe.",
        howAokHelps: "AOK sends a daily check-in prompt. One tap confirms she's OK. If she doesn't respond, her key worker Emma receives an automatic SMS and email alert.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm font-bold text-green-600">aok</span>
            </div>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Are you OK?</p>
              <p className="text-xs text-muted-foreground mt-1">Your daily check-in is due</p>
            </div>
            <div className="h-10 rounded-md bg-green-600 flex items-center justify-center">
              <span className="text-sm text-white font-medium">Yes, I'm OK</span>
            </div>
            <div className="h-10 rounded-md border border-red-300 flex items-center justify-center">
              <span className="text-sm text-red-600 font-medium">I need help</span>
            </div>
            <div className="mt-auto text-center">
              <span className="text-[10px] text-muted-foreground">Last check-in: Today, 09:15</span>
            </div>
          </div>
        ),
      },
      {
        title: "Safeguarding concern raised",
        aokFeature: "Safeguarding Hub",
        theirContext: "During a support session, a woman discloses domestic abuse. Staff need to log this properly.",
        howAokHelps: "The support worker logs the concern through AOK's Safeguarding Hub with category, details, and escalation to the safeguarding lead. The tamper-evident audit trail records exactly when and by whom.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold">Safeguarding Hub</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">New Concern - HIGH PRIORITY</p>
            </div>
            <div className="space-y-2">
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Client</span>
                <span className="text-xs">Sarah M. (GW-0147)</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-xs">Domestic abuse</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Escalated to</span>
                <span className="text-xs">Safeguarding Lead</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Tamper-evident audit trail active</span>
            </div>
            <div className="h-8 rounded-md bg-amber-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">Submit Concern</span>
            </div>
          </div>
        ),
      },
    ],
  },
  schools: {
    name: "Schools and Youth",
    tagline: "Standing by our young people",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    badgeColor: "bg-indigo-600",
    icon: <GraduationCap className="h-6 w-6 text-indigo-600" />,
    whatTheyDo: [
      "One-to-one mentoring to help students find positive ways of dealing with challenges",
      "Transition mentoring supporting students from primary to secondary school",
      "Nine 'Where's Your Head At?' small group courses tackling anxiety, bereavement, anger, and self-esteem",
      "Safe and welcoming lunch clubs for vulnerable students",
      "Interactive prayer and reflection spaces supporting SMSC and RE curricula",
    ],
    whereAokFits: [
      {
        label: "Registering young people as Safeguarding Seats",
        aokFeature: "Safeguarding Seats (Under-16s)",
        description: "Staff register young people under 16 on AOK as Safeguarding Seats using their date of birth. These are dashboard-only profiles with no SMS or app access - staff log welfare concerns, track engagement, and maintain auditable safeguarding records. When a young person turns 16, AOK automatically prompts staff to upgrade them to a full Check-in Seat with SMS welfare monitoring.",
      },
      {
        label: "Auditing safeguarding actions taken by staff",
        aokFeature: "Safeguarding Hub",
        description: "When a mentor or facilitator encounters a disclosure or concern, they log it through AOK. This creates a tamper-evident record of what was disclosed, when, by whom, and what action was taken - the audit trail schools and trustees require.",
      },
      {
        label: "Evidencing staff engagement and programme delivery",
        aokFeature: "Activity Log + Audit Trail",
        description: "AOK records when staff check in, what sessions were delivered, and what safeguarding actions were taken. This gives Off The Fence the governance evidence that their Schools and Youth programme is being delivered properly.",
      },
      {
        label: "Reporting outcomes to schools and funders",
        aokFeature: "Funding Dashboard",
        description: "Schools and funders want to see programme impact. AOK's Funding Dashboard generates reports showing engagement data, safeguarding compliance, and programme delivery metrics.",
      },
    ],
    honestNote: "Although AOK is a 16+ platform due to safeguarding best practices - we do not track, monitor, or send SMS to anyone under 16 - we also cater for under-16s through dedicated Safeguarding Seats. These are dashboard-only profiles where staff register young people with their date of birth, log welfare concerns, and maintain auditable records. There is no app access, no location tracking, and no direct communication with the young person. When a young person turns 16, AOK automatically prompts staff to upgrade them to a full Check-in Seat with SMS welfare monitoring. This means AOK helps both by maintaining safeguarding records for the young people and by digitally auditing the actions taken by Off The Fence staff - logging disclosures, evidencing governance, and generating the compliance records schools, Ofsted, and trustees need.",
    scenarios: [
      {
        title: "A disclosure during a WYHA session",
        aokFeature: "Safeguarding Hub",
        theirContext: "During a 'Where's Your Head At?' session on self-esteem, a student discloses self-harm to the facilitator.",
        howAokHelps: "The facilitator logs the concern through AOK's Safeguarding Hub - what was disclosed, the category, and the action taken (e.g. DSL notified). This creates the auditable safeguarding record the school and trustees require.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              <span className="text-sm font-bold">Safeguarding Hub</span>
            </div>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-2">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">URGENT - Safeguarding Concern</p>
            </div>
            <div className="space-y-2">
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Logged by</span>
                <span className="text-xs">David K. (Facilitator)</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-xs">Self-harm disclosure</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Action taken</span>
                <span className="text-xs">DSL notified</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Tamper-evident audit trail active</span>
            </div>
            <div className="h-8 rounded-md bg-red-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">Log and Escalate</span>
            </div>
          </div>
        ),
      },
      {
        title: "Governance evidence for trustees",
        aokFeature: "Audit Trail + Funding Dashboard",
        theirContext: "Off The Fence trustees need evidence that safeguarding is being handled properly across the Schools and Youth programme.",
        howAokHelps: "AOK's tamper-evident Audit Trail shows every safeguarding action taken by staff. The Funding Dashboard generates compliance reports showing programme delivery, engagement data, and governance metrics - exportable as PDF or CSV.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-bold">Governance Report</span>
            </div>
            <p className="text-xs text-muted-foreground">Schools Programme - Term 2</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-indigo-600">7</p>
                <p className="text-[10px] text-muted-foreground">Concerns logged</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-600">100%</p>
                <p className="text-[10px] text-muted-foreground">Escalated properly</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-600">34</p>
                <p className="text-[10px] text-muted-foreground">Sessions delivered</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-purple-600">5</p>
                <p className="text-[10px] text-muted-foreground">Staff active</p>
              </div>
            </div>
            <div className="h-8 rounded-md bg-indigo-600 flex items-center justify-center mt-1">
              <span className="text-xs text-white font-medium">Export PDF Report</span>
            </div>
          </div>
        ),
      },
    ],
  },
  antifreeze: {
    name: "Antifreeze",
    tagline: "Supporting individuals out of homelessness",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    badgeColor: "bg-orange-600",
    icon: <Home className="h-6 w-6 text-orange-600" />,
    whatTheyDo: [
      "Going out onto the streets of Brighton and Hove to deliver hot food, drink, sleeping bags, and clothes",
      "Drop-in sessions providing meals, hot drinks, clothing, and sleeping bags",
      "Shower and laundry facilities to protect human dignity and support routine",
      "One-to-one key worker support for housing, financial, and welfare needs",
      "Referrals to specialist agencies when required",
    ],
    whereAokFits: [
      {
        label: "Protecting outreach staff on the streets",
        aokFeature: "Lone Worker Hub",
        description: "Antifreeze staff go out onto Brighton's streets in the evenings. The Lone Worker Hub monitors their safety with timed check-ins - if a worker doesn't check in, their team leader is alerted automatically with their last known GPS location.",
      },
      {
        label: "Emergency alert during outreach",
        aokFeature: "Emergency SOS",
        description: "If an outreach worker encounters a dangerous situation, one tap on AOK's Emergency SOS alerts their team with their exact GPS location instantly. No fumbling, no delays.",
      },
      {
        label: "Digitally auditing safeguarding actions",
        aokFeature: "Safeguarding Hub",
        description: "Key workers encounter safeguarding concerns while supporting clients with housing and welfare. AOK provides the digital audit trail - logging what was identified, what action was taken, and when.",
      },
      {
        label: "Evidencing engagement for commissioners",
        aokFeature: "Funding Dashboard",
        description: "Local authority commissioners need evidence that Antifreeze is delivering outcomes. AOK captures engagement data and safeguarding compliance, generating the reports commissioners require.",
      },
    ],
    honestNote: "AOK is not a homelessness case management system, but it does more than just protect staff. Homeless adults supported by Antifreeze can be registered as AOK clients with full Check-in Seats - receiving SMS welfare check-ins, with missed check-in alerts going to their key worker. This gives Off The Fence a way to monitor the wellbeing of rough sleepers and vulnerable adults between outreach visits. On top of that, AOK protects the staff doing outreach (Lone Worker Hub and Emergency SOS), digitally audits safeguarding actions taken by key workers, and generates the evidence commissioners and funders need.",
    scenarios: [
      {
        title: "Evening street outreach",
        aokFeature: "Lone Worker Hub",
        theirContext: "Two outreach workers head out onto Brighton's streets in the evening to deliver essential supplies to rough sleepers.",
        howAokHelps: "Each worker starts a Lone Worker session on AOK. The system monitors their safety with timed check-ins. If they don't check in on time, their team leader is automatically alerted with their GPS location.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-bold">Lone Worker Hub</span>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Active Session</span>
                <Badge className="bg-green-600 text-white text-[10px]">LIVE</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Worker</span>
                <span className="text-xs">Mark R.</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Location</span>
                <span className="text-xs">North Laine area</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Next check-in</span>
                <span className="text-xs text-green-600">12 mins</span>
              </div>
            </div>
            <div className="h-8 rounded-md bg-red-600 flex items-center justify-center mt-auto">
              <span className="text-xs text-white font-medium">Emergency SOS</span>
            </div>
          </div>
        ),
      },
      {
        title: "Emergency during outreach",
        aokFeature: "Emergency SOS",
        theirContext: "During evening outreach delivering sleeping bags and hot food, a worker encounters a threatening situation.",
        howAokHelps: "One press of AOK's Emergency SOS button alerts the entire team with the worker's GPS location instantly. The team leader can respond immediately and call 999 with an exact location.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-2">
            <div className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-red-600" />
              <span className="text-sm font-bold text-red-600">EMERGENCY ALERT</span>
            </div>
            <div className="bg-red-50 dark:bg-red-950 border-2 border-red-400 rounded-lg p-3 text-center space-y-2">
              <AlertTriangle className="h-10 w-10 text-red-600 mx-auto animate-pulse" />
              <p className="text-sm font-bold text-red-700 dark:text-red-400">SOS Activated</p>
              <p className="text-xs text-red-600">Mark R. - Outreach Worker</p>
            </div>
            <div className="space-y-1.5">
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center gap-2">
                <MapPin className="h-3 w-3 text-red-600" />
                <span className="text-xs">North St, Brighton BN1</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">21:47 - Just now</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">Team leader notified</span>
              </div>
            </div>
            <div className="h-8 rounded-md bg-red-600 flex items-center justify-center mt-auto">
              <span className="text-xs text-white font-medium">Call 999</span>
            </div>
          </div>
        ),
      },
      {
        title: "Safeguarding during key worker support",
        aokFeature: "Safeguarding Hub",
        theirContext: "A key worker supporting a client with housing applications identifies signs of exploitation.",
        howAokHelps: "The key worker logs the safeguarding concern through AOK - what they observed, the category, and the action taken. This creates the digital audit trail that commissioners and trustees need to see.",
        mockup: (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold">Safeguarding Hub</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">New Concern</p>
            </div>
            <div className="space-y-2">
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Logged by</span>
                <span className="text-xs">Nigel P. (Key Worker)</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-xs">Suspected exploitation</span>
              </div>
              <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Action</span>
                <span className="text-xs">Referred to specialist</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Tamper-evident audit trail active</span>
            </div>
            <div className="h-8 rounded-md bg-amber-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">Submit Concern</span>
            </div>
          </div>
        ),
      },
    ],
  },
};

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[200px] h-[380px] rounded-[24px] border-4 border-gray-800 dark:border-gray-600 bg-card shadow-xl overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-800 dark:bg-gray-600 rounded-b-lg z-10" />
      <div className="h-full pt-5 pb-2 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function DemoOTF() {
  const [activeProgramme, setActiveProgramme] = useState<Programme>("gateway");
  const prog = PROGRAMMES[activeProgramme];

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
          <Badge variant="outline" className="text-xs" data-testid="badge-case-study">Case Study</Badge>
        </div>
      </header>

      <section className="py-12 px-4 bg-gradient-to-b from-green-50 to-background dark:from-green-950 dark:to-background">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <Badge className="bg-green-600 text-white" data-testid="badge-pilot">Pilot Partner</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-demo-title">
            Where AOK Fits for Off The Fence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Off The Fence tackles poverty and homelessness across Brighton and Hove through three programmes. AOK is a digital safeguarding and audit platform - here is exactly where it helps and where it doesn't.
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-10">
            {(["gateway", "schools", "antifreeze"] as Programme[]).map((key) => {
              const p = PROGRAMMES[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveProgramme(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    activeProgramme === key
                      ? `${p.bgColor} ${p.borderColor} ${p.color}`
                      : "border-border text-muted-foreground"
                  }`}
                  data-testid={`tab-${key}`}
                >
                  {p.icon}
                  {p.name}
                </button>
              );
            })}
          </div>

          <div className={`${prog.bgColor} ${prog.borderColor} border rounded-xl p-6 sm:p-8 mb-10`}>
            <div className="flex items-center gap-3 mb-4">
              {prog.icon}
              <div>
                <h2 className={`text-xl font-bold ${prog.color}`} data-testid="text-programme-title">{prog.name}</h2>
                <p className="text-sm text-muted-foreground">{prog.tagline}</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold mb-3">What they do</h3>
            <ul className="space-y-2 mb-6">
              {prog.whatTheyDo.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className={`${prog.borderColor} border-t pt-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="text-sm font-semibold">Honest assessment</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-honest-note">{prog.honestNote}</p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-lg font-semibold mb-6 text-center" data-testid="text-where-aok-fits">Where AOK fits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prog.whereAokFits.map((fit, i) => (
                <Card key={i} className="border" data-testid={`card-fit-${i}`}>
                  <CardContent className="pt-5 pb-4 px-4">
                    <h4 className="text-sm font-semibold mb-1">{fit.label}</h4>
                    <div className="flex items-center gap-1.5 mb-2">
                      <ArrowRight className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">AOK: {fit.aokFeature}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{fit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-center">See it in action</h3>
            <p className="text-sm text-muted-foreground text-center mb-8">Real scenarios showing where AOK helps {prog.name}</p>
            <div className="space-y-4 divide-y">
              {prog.scenarios.map((scenario, i) => (
                <div key={i} className={`flex flex-col md:flex-row items-center gap-8 py-8 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold" data-testid={`text-scenario-title-${i}`}>{scenario.title}</h3>
                        <Badge variant="secondary" className="text-[10px] font-medium mt-1">{scenario.aokFeature}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Their situation</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{scenario.theirContext}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">How AOK helps</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{scenario.howAokHelps}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <PhoneMockup>{scenario.mockup}</PhoneMockup>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-3" data-testid="text-compliance-title">Built for Compliance</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            The same safeguarding and audit standards apply to every organisation on AOK.
          </p>
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
            Get in touch to discuss how AOK can support your organisation's safeguarding audit, staff safety, and funder reporting - using the same platform every organisation uses.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="mailto:hello@aok.uk?subject=AOK%20Pilot%20Request">
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
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4" data-testid="footer-demo">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-600">aok</span>
            <span className="text-sm text-muted-foreground">Digital Safeguarding Platform</span>
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
