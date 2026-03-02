import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, Bell, Users, Clock, CheckCircle, Heart, Mail,
  MapPin, Phone, AlertTriangle, Building2, User,
  ChevronRight, Shield, Lock, TrendingUp, ArrowRight,
  ArrowLeft, Map, HardHat, Eye, FileCheck,
  ClipboardCheck, BarChart3, Home, BookOpen,
  UserCheck, Siren, Activity, HandHeart,
  GraduationCap, Utensils, Shirt, ShowerHead,
  MessageCircle, CalendarCheck, Briefcase, AlertCircle
} from "lucide-react";

type Programme = "gateway" | "schools" | "antifreeze";

const GATEWAY_SCENARIOS = [
  {
    title: "Sarah arrives at Gateway",
    aokFeature: "Client Registration",
    description: "A woman is referred to Gateway for one-to-one emotional and practical support. Her support worker registers her using AOK's Client Registration, assigns a key worker, and sets up a regular welfare schedule.",
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
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Key Worker</span>
            <span className="text-xs text-foreground">Emma T.</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
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
    title: "Daily welfare check-in",
    aokFeature: "Scheduled Check-ins",
    description: "Gateway provides ongoing one-to-one support - in person, by phone, text, or Zoom. AOK's Scheduled Check-ins send Sarah a daily welfare prompt. If she doesn't respond, her key worker Emma is automatically notified via SMS and email.",
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
    title: "Safeguarding concern logged",
    aokFeature: "Safeguarding Hub",
    description: "Gateway staff provide advice, information, and referrals to specialist services. When a support worker identifies a safeguarding concern, they log it through AOK's Safeguarding Hub with full details, evidence, and escalation to the safeguarding lead.",
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
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Client</span>
            <span className="text-xs">Sarah M. (GW-0147)</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Category</span>
            <span className="text-xs">Domestic abuse</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Escalated to</span>
            <span className="text-xs">Safeguarding Lead</span>
          </div>
          <div className="h-12 rounded-md bg-muted border px-2 pt-1">
            <span className="text-[10px] text-muted-foreground">Client disclosed...</span>
          </div>
        </div>
        <div className="h-8 rounded-md bg-amber-600 flex items-center justify-center">
          <span className="text-xs text-white font-medium">Submit Concern</span>
        </div>
      </div>
    ),
  },
  {
    title: "Funder outcomes report",
    aokFeature: "Funding Dashboard",
    description: "Gateway needs to evidence the impact of their workshops on budgeting, financial literacy, employability, and healthy relationships. AOK's Funding Dashboard generates compliance-ready reports showing client engagement, check-in rates, safeguarding actions, and measurable outcomes.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-bold">Funding Dashboard</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-600">94%</p>
            <p className="text-[10px] text-muted-foreground">Check-in rate</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-600">127</p>
            <p className="text-[10px] text-muted-foreground">Women supported</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-purple-600">23</p>
            <p className="text-[10px] text-muted-foreground">Safeguarding cases</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">100%</p>
            <p className="text-[10px] text-muted-foreground">Audit compliance</p>
          </div>
        </div>
        <div className="h-8 rounded-md bg-blue-600 flex items-center justify-center mt-1">
          <span className="text-xs text-white font-medium">Export PDF Report</span>
        </div>
        <div className="h-8 rounded-md border flex items-center justify-center">
          <span className="text-xs text-foreground font-medium">Export CSV Data</span>
        </div>
      </div>
    ),
  },
];

const SCHOOLS_SCENARIOS = [
  {
    title: "One-to-one mentoring",
    aokFeature: "Client Registration + Scheduled Check-ins",
    description: "Off The Fence offers one-to-one mentoring to help students find positive ways of dealing with challenges in a non-judgmental and safe environment. AOK's Client Registration pairs each student with their mentor, and Scheduled Check-ins track ongoing engagement.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <span className="text-sm font-bold text-green-600">aok</span>
          <Badge variant="outline" className="ml-auto text-[10px]">Schools</Badge>
        </div>
        <h3 className="text-sm font-semibold">Student Mentoring</h3>
        <div className="space-y-2">
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Student</span>
            <span className="text-xs">Jamie P. (Year 9)</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Mentor</span>
            <span className="text-xs">David K.</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">School</span>
            <span className="text-xs">Brighton Academy</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Check-in</span>
            <span className="text-xs">Weekly</span>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-xs text-green-700 dark:text-green-400">Last session: 3 days ago</span>
        </div>
      </div>
    ),
  },
  {
    title: "Where's Your Head At? - disclosure",
    aokFeature: "Safeguarding Hub",
    description: "During one of the nine 'Where's Your Head At?' small group courses - covering anxiety, bereavement, anger, and self-esteem - a student discloses self-harm. The facilitator uses AOK's Safeguarding Hub to log the concern immediately with a full audit trail and DSL notification.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          <span className="text-sm font-bold">Safeguarding Alert</span>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-2">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">URGENT - Child Protection</p>
        </div>
        <div className="space-y-2">
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Student</span>
            <span className="text-xs">Anonymised</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Category</span>
            <span className="text-xs">Self-harm disclosure</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Action</span>
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
    title: "School partnership reporting",
    aokFeature: "Analytics Dashboard + Funding Dashboard",
    description: "Off The Fence works with schools to support SMSC and RE curricula through prayer and reflection spaces. AOK's Analytics Dashboard and Funding Dashboard share anonymised engagement data with partner schools - session counts, student wellbeing trends, and programme impact - without exposing personal details.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-bold">School Report</span>
        </div>
        <p className="text-xs text-muted-foreground">Brighton Academy - Term 2</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-indigo-600">34</p>
            <p className="text-[10px] text-muted-foreground">Sessions delivered</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-600">18</p>
            <p className="text-[10px] text-muted-foreground">Students mentored</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">9</p>
            <p className="text-[10px] text-muted-foreground">WYHA courses</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-purple-600">92%</p>
            <p className="text-[10px] text-muted-foreground">Attendance rate</p>
          </div>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">All data anonymised per GDPR</p>
        </div>
      </div>
    ),
  },
  {
    title: "Transition mentoring",
    aokFeature: "Scheduled Check-ins",
    description: "Off The Fence offers transition mentoring to support students through the move from primary to secondary school. AOK's Scheduled Check-ins send gentle welfare prompts to students during this period, keeping parents and the school informed of engagement.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <span className="text-sm font-bold text-green-600">aok</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <GraduationCap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Transition Check-in</p>
          <p className="text-xs text-muted-foreground mt-1">How are you feeling about secondary school?</p>
        </div>
        <div className="space-y-2">
          <div className="h-8 rounded-md bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 flex items-center justify-center">
            <span className="text-xs text-green-700 dark:text-green-400">Excited and ready</span>
          </div>
          <div className="h-8 rounded-md bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 flex items-center justify-center">
            <span className="text-xs text-amber-700 dark:text-amber-400">A bit nervous</span>
          </div>
          <div className="h-8 rounded-md bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 flex items-center justify-center">
            <span className="text-xs text-red-700 dark:text-red-400">Worried and need to talk</span>
          </div>
        </div>
      </div>
    ),
  },
];

const ANTIFREEZE_SCENARIOS = [
  {
    title: "'On the streets' care - staff safety",
    aokFeature: "Lone Worker Hub",
    description: "Antifreeze regularly goes out onto the streets of Brighton and Hove to deliver hot food, drink, sleeping bags, and clothes. AOK's Lone Worker Hub monitors outreach staff safety with timed check-ins and GPS location tracking during these evening sessions.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-orange-600" />
          <span className="text-sm font-bold">Lone Worker Hub</span>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Active Outreach Session</span>
            <Badge className="bg-green-600 text-white text-[10px]">LIVE</Badge>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Worker</span>
            <span className="text-xs">Mark R.</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Location</span>
            <span className="text-xs">North Laine area</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Next check-in</span>
            <span className="text-xs text-green-600">12 mins</span>
          </div>
          <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Safe</span>
          </div>
        </div>
        <div className="h-8 rounded-md bg-red-600 flex items-center justify-center mt-auto">
          <span className="text-xs text-white font-medium">Emergency SOS</span>
        </div>
      </div>
    ),
  },
  {
    title: "Drop-in sessions",
    aokFeature: "Scheduled Check-ins + Overdue Alerts",
    description: "Through drop-in sessions, Antifreeze clients receive meals, hot drinks, clothing, and sleeping bags. AOK's Scheduled Check-ins track attendance at each session, and Overdue Alerts automatically flag clients who stop attending so outreach workers can follow up.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <span className="text-sm font-bold text-green-600">aok</span>
          <Badge variant="outline" className="ml-auto text-[10px]">Antifreeze</Badge>
        </div>
        <h3 className="text-sm font-semibold">Today's Drop-in</h3>
        <div className="space-y-1.5">
          {["Tony B.", "Lisa F.", "Darren W.", "Joanne K.", "Raj P."].map((name, i) => (
            <div key={i} className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
              <span className="text-xs">{name}</span>
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">Today: 5 attended</span>
          <span className="text-xs text-amber-600">2 overdue</span>
        </div>
      </div>
    ),
  },
  {
    title: "1-to-1 key worker support",
    aokFeature: "Activity Log + Audit Trail",
    description: "Antifreeze key workers help support clients with practical needs such as housing, financial, and welfare applications, and refer to specialist agencies. AOK's Activity Log captures every interaction, and the tamper-evident Audit Trail creates the evidence base funders and commissioners require.",
    mockup: (
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-bold">Client Timeline</span>
        </div>
        <div className="h-7 rounded-md bg-muted border px-2 flex items-center justify-between">
          <span className="text-xs">Tony B. - AF-2026-0089</span>
        </div>
        <div className="space-y-2">
          <div className="border-l-2 border-green-400 pl-2">
            <p className="text-[10px] text-muted-foreground">Today, 14:30</p>
            <p className="text-xs">Check-in confirmed - safe</p>
          </div>
          <div className="border-l-2 border-blue-400 pl-2">
            <p className="text-[10px] text-muted-foreground">Yesterday, 11:00</p>
            <p className="text-xs">Housing application submitted</p>
          </div>
          <div className="border-l-2 border-purple-400 pl-2">
            <p className="text-[10px] text-muted-foreground">Mon, 09:45</p>
            <p className="text-xs">Benefits appointment attended</p>
          </div>
          <div className="border-l-2 border-green-400 pl-2">
            <p className="text-[10px] text-muted-foreground">Last Fri, 16:00</p>
            <p className="text-xs">Drop-in attended, shower used</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Emergency on the streets",
    aokFeature: "Emergency SOS",
    description: "During evening street outreach delivering essential supplies, a worker encounters a dangerous situation. One press of AOK's Emergency SOS button alerts the entire team with the worker's GPS location instantly - no fumbling, no delays.",
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
];

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

function ScenarioCard({ scenario, index }: { scenario: typeof GATEWAY_SCENARIOS[0]; index: number }) {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-8 py-8 ${index % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {index + 1}
          </div>
          <div>
            <h3 className="text-xl font-semibold" data-testid={`text-scenario-title-${index}`}>{scenario.title}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground">AOK feature:</span>
              <Badge variant="secondary" className="text-[10px] font-medium" data-testid={`badge-aok-feature-${index}`}>{scenario.aokFeature}</Badge>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">{scenario.description}</p>
      </div>
      <div className="flex-shrink-0">
        <PhoneMockup>{scenario.mockup}</PhoneMockup>
      </div>
    </div>
  );
}

export default function DemoOTF() {
  const [activeProgramme, setActiveProgramme] = useState<Programme>("gateway");

  const programmes = {
    gateway: {
      name: "Gateway Women's Centre",
      tagline: "Support for women, by women",
      description: "Gateway is dedicated to empowering women facing crisis, emotional hardship, or practical difficulties - offering one-to-one emotional, practical and spiritual support, an Essentials Hub for food, toiletries, and clothing, and workshops on budgeting, financial literacy, employability, and healthy relationships. AOK provides the digital backbone to track welfare, manage safeguarding, and report outcomes to funders.",
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950",
      borderColor: "border-pink-200 dark:border-pink-800",
      icon: <HandHeart className="h-6 w-6 text-pink-600" />,
      features: [
        { icon: <UserCheck className="h-5 w-5" />, theirWord: "Referral and key worker assignment", aokName: "Client Registration", desc: "Register women with assigned key workers and personalised check-in schedules" },
        { icon: <Bell className="h-5 w-5" />, theirWord: "Ongoing 1-to-1 welfare support", aokName: "Scheduled Check-ins", desc: "Automated daily prompts via SMS or app with escalation if a client doesn't respond" },
        { icon: <Shield className="h-5 w-5" />, theirWord: "Safeguarding and specialist referrals", aokName: "Safeguarding Hub", desc: "Log concerns with full audit trail, evidence uploads, and escalation workflows" },
        { icon: <Utensils className="h-5 w-5" />, theirWord: "Essentials Hub provisions", aokName: "Activity Log", desc: "Track food, clothing, toiletry, and cleaning supply provisions per client" },
        { icon: <MessageCircle className="h-5 w-5" />, theirWord: "Emotional and practical support", aokName: "Audit Trail", desc: "Secure, encrypted records of every support session - in person, phone, text, or Zoom" },
        { icon: <BarChart3 className="h-5 w-5" />, theirWord: "Impact reporting for funders", aokName: "Funding Dashboard", desc: "Compliance-ready reports showing workshop outcomes, engagement rates, and impact data" },
      ],
      scenarios: GATEWAY_SCENARIOS,
    },
    schools: {
      name: "Schools and Youth",
      tagline: "Standing by our young people",
      description: "The Schools and Youth programme supports young people's emotional, mental, and social development through one-to-one mentoring, safe and welcoming lunch clubs, nine 'Where's Your Head At?' courses tackling anxiety, bereavement, anger, and self-esteem, and interactive prayer and reflection spaces. AOK adds safeguarding rigour, session tracking, and school partnership reporting.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
      borderColor: "border-indigo-200 dark:border-indigo-800",
      icon: <GraduationCap className="h-6 w-6 text-indigo-600" />,
      features: [
        { icon: <BookOpen className="h-5 w-5" />, theirWord: "One-to-one mentoring", aokName: "Client Registration", desc: "Pair each student with their mentor and track sessions in a safe, non-judgmental record" },
        { icon: <Shield className="h-5 w-5" />, theirWord: "Child protection and disclosures", aokName: "Safeguarding Hub", desc: "Immediate concern logging with DSL notification and tamper-evident records" },
        { icon: <CalendarCheck className="h-5 w-5" />, theirWord: "WYHA courses and lunch clubs", aokName: "Scheduled Check-ins", desc: "Track the nine 'Where's Your Head At?' courses, lunch clubs, and reflection spaces" },
        { icon: <GraduationCap className="h-5 w-5" />, theirWord: "Transition mentoring (Year 6)", aokName: "Scheduled Check-ins", desc: "Support students through primary-to-secondary transition with gentle welfare prompts" },
        { icon: <Eye className="h-5 w-5" />, theirWord: "School partnership data sharing", aokName: "Analytics Dashboard", desc: "Share anonymised engagement data with partner schools without exposing personal details" },
        { icon: <ClipboardCheck className="h-5 w-5" />, theirWord: "Governance and compliance", aokName: "Assurance Dashboard", desc: "Full audit trail for Ofsted, DBS compliance, and trustee governance requirements" },
      ],
      scenarios: SCHOOLS_SCENARIOS,
    },
    antifreeze: {
      name: "Antifreeze",
      tagline: "Supporting individuals out of homelessness",
      description: "Since 1998, Antifreeze has been a safe and warm space for individuals experiencing homelessness - going out onto the streets to deliver essential supplies, running drop-in sessions with meals, hot drinks, and clothing, providing shower and laundry facilities, and offering one-to-one key worker support for housing, benefits, and welfare. AOK protects outreach staff, tracks client engagement, and provides the evidence base funders and commissioners need.",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      borderColor: "border-orange-200 dark:border-orange-800",
      icon: <Home className="h-6 w-6 text-orange-600" />,
      features: [
        { icon: <HardHat className="h-5 w-5" />, theirWord: "'On the streets' outreach safety", aokName: "Lone Worker Hub", desc: "Real-time safety monitoring for staff delivering supplies on Brighton's streets" },
        { icon: <Siren className="h-5 w-5" />, theirWord: "Emergency during outreach", aokName: "Emergency SOS", desc: "One-tap alert with GPS location when outreach workers face danger" },
        { icon: <Users className="h-5 w-5" />, theirWord: "Drop-in session attendance", aokName: "Scheduled Check-ins", desc: "Track who attends drop-in sessions and flag those who stop coming" },
        { icon: <Briefcase className="h-5 w-5" />, theirWord: "Key worker practical support", aokName: "Activity Log", desc: "Record housing applications, benefits support, and specialist referrals per client" },
        { icon: <Activity className="h-5 w-5" />, theirWord: "Meeting immediate need", aokName: "Overdue Alerts", desc: "Spot clients at risk of falling through the gaps when they stop engaging" },
        { icon: <FileCheck className="h-5 w-5" />, theirWord: "Commissioner and funder evidence", aokName: "Funding Dashboard", desc: "Evidence-based outcomes reporting for local authority commissioners and grant funders" },
      ],
      scenarios: ANTIFREEZE_SCENARIOS,
    },
  };

  const current = programmes[activeProgramme];

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
          <Badge variant="outline" className="text-xs" data-testid="badge-demo-label">Demo</Badge>
        </div>
      </header>

      <section className="py-12 px-4 bg-gradient-to-b from-green-50 to-background dark:from-green-950 dark:to-background">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <Badge className="bg-green-600 text-white" data-testid="badge-otf">Off The Fence</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-demo-title">
            AOK for Off The Fence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            One platform to safeguard clients, protect staff, and evidence impact across all three of your programmes - Gateway, Schools and Youth, and Antifreeze.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Safeguarding</span>
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
        <div className="container mx-auto max-w-5xl">
          <Tabs value={activeProgramme} onValueChange={(v) => setActiveProgramme(v as Programme)} className="space-y-8">
            <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto">
              <TabsTrigger value="gateway" data-testid="tab-gateway" className="text-xs sm:text-sm">Gateway</TabsTrigger>
              <TabsTrigger value="schools" data-testid="tab-schools" className="text-xs sm:text-sm">Schools</TabsTrigger>
              <TabsTrigger value="antifreeze" data-testid="tab-antifreeze" className="text-xs sm:text-sm">Antifreeze</TabsTrigger>
            </TabsList>

            {Object.entries(programmes).map(([key, prog]) => (
              <TabsContent key={key} value={key} className="space-y-10">
                <div className={`${prog.bgColor} ${prog.borderColor} border rounded-xl p-6 sm:p-8`}>
                  <div className="flex items-center gap-3 mb-4">
                    {prog.icon}
                    <div>
                      <h2 className={`text-xl font-bold ${prog.color}`} data-testid={`text-programme-title-${key}`}>{prog.name}</h2>
                      <p className="text-sm text-muted-foreground">{prog.tagline}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{prog.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-6 text-center">How AOK supports {prog.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prog.features.map((feature, i) => (
                      <Card key={i} className="border" data-testid={`card-feature-${key}-${i}`}>
                        <CardContent className="pt-5 pb-4 px-4">
                          <div className="flex items-start gap-3">
                            <div className={`${prog.bgColor} p-2 rounded-lg flex-shrink-0`}>
                              {feature.icon}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">{feature.theirWord}</h4>
                              <div className="flex items-center gap-1.5 mt-1 mb-1.5">
                                <ArrowRight className="h-3 w-3 text-green-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">AOK: {feature.aokName}</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-center">See it in action</h3>
                  <p className="text-sm text-muted-foreground text-center mb-8">Real scenarios showing how AOK works for {prog.name}</p>
                  <div className="space-y-4 divide-y">
                    {prog.scenarios.map((scenario, i) => (
                      <ScenarioCard key={i} scenario={scenario} index={i} />
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-unified-title">One Platform, Three Programmes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-pink-200 dark:border-pink-800" data-testid="card-summary-gateway">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <HandHeart className="h-5 w-5 text-pink-600" />
                  <CardTitle className="text-base">Gateway</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Empowering women facing crisis with emotional, practical, and spiritual support.</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>1-to-1 support and key worker assignment</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Client Registration + Scheduled Check-ins</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Safeguarding and specialist referrals</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Safeguarding Hub</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Essentials Hub provisions</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Activity Log</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Impact reporting for funders</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Funding Dashboard</span></span>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 dark:border-indigo-800" data-testid="card-summary-schools">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base">Schools and Youth</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Building resilience in young people through mentoring, courses, and safe spaces.</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>One-to-one and transition mentoring</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Client Registration + Scheduled Check-ins</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Child protection and disclosures</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Safeguarding Hub</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>WYHA courses and lunch clubs</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Scheduled Check-ins + Activity Log</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>School partnership data sharing</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Analytics Dashboard</span></span>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-800" data-testid="card-summary-antifreeze">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base">Antifreeze</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>A safe space for individuals experiencing homelessness since 1998.</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>'On the streets' outreach safety</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Lone Worker Hub + Emergency SOS</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Drop-in session attendance</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Scheduled Check-ins + Overdue Alerts</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Key worker practical support</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Activity Log + Audit Trail</span></span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Commissioner and funder evidence</span>
                      <span className="flex items-center gap-1 mt-0.5"><ArrowRight className="h-2.5 w-2.5 text-green-600" /><span className="text-[10px] font-medium text-green-700 dark:text-green-400">Funding Dashboard</span></span>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-compliance-title">Built for Charity Compliance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Lock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">End-to-end encryption</h4>
                <p className="text-xs text-muted-foreground mt-1">All client data encrypted at rest and in transit</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <FileCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">GDPR compliant</h4>
                <p className="text-xs text-muted-foreground mt-1">Data processing agreements and privacy by design</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <ClipboardCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Tamper-evident audit trail</h4>
                <p className="text-xs text-muted-foreground mt-1">Every action logged with timestamps - fully auditable</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Charity Commission ready</h4>
                <p className="text-xs text-muted-foreground mt-1">Governance reports aligned with trustee obligations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Impact evidence</h4>
                <p className="text-xs text-muted-foreground mt-1">Quantifiable outcomes for funders, commissioners, and trustees</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Building2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Multi-programme support</h4>
                <p className="text-xs text-muted-foreground mt-1">Separate bundles per programme under one organisation account</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-green-50 dark:bg-green-950">
        <div className="container mx-auto max-w-2xl text-center space-y-6">
          <ShieldCheck className="h-12 w-12 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold" data-testid="text-cta-title">Ready to see AOK in action?</h2>
          <p className="text-muted-foreground">
            Get in touch to arrange a live walkthrough tailored to Off The Fence's three programmes. We'll show you exactly how AOK can support your clients, protect your staff, and evidence your impact.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="mailto:hello@aok.uk?subject=Off%20The%20Fence%20-%20AOK%20Pilot%20Request">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-green-600" data-testid="button-contact-demo">
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
            <span className="text-sm text-muted-foreground">Personal Safety Platform</span>
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