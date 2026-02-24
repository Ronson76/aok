import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Bell, Users, Clock, CheckCircle, Heart, Mail,
  Smartphone, MapPin, Phone, AlertTriangle, Play, Building2, User,
  ChevronRight, Shield, Zap, Lock, TrendingUp, PawPrint, Scroll, Check,
  Sparkles, MessageSquare, ArrowLeft, Timer, Map, Camera, HardHat,
  ChevronDown, Globe, Share2, Eye, Mic, ArrowRight, FileCheck,
  ClipboardCheck, Key, BarChart3, TreeDeciduous, Leaf
} from "lucide-react";

type DemoSection = "overview" | "individual" | "organisation" | "lone-worker";

const DEMO_STEPS_INDIVIDUAL = [
  {
    id: "signup",
    title: "Create Your Account",
    description: "Sign up in under 2 minutes. Just your name, email, and a password. We'll guide you through the rest.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="text-sm font-bold text-green-600">aok</span>
          </div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Create Account</h3>
          <div className="space-y-2">
            <div className="h-8 rounded-md bg-muted border px-2 flex items-center">
              <span className="text-xs text-muted-foreground">Full name</span>
            </div>
            <div className="h-8 rounded-md bg-muted border px-2 flex items-center">
              <span className="text-xs text-muted-foreground">Email address</span>
            </div>
            <div className="h-8 rounded-md bg-muted border px-2 flex items-center">
              <span className="text-xs text-muted-foreground">Password</span>
            </div>
            <div className="h-8 rounded-md bg-green-600 flex items-center justify-center mt-2">
              <span className="text-xs text-white font-medium">Get Started</span>
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1 justify-center">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Encrypted &amp; Secure</span>
          </div>
        </div>
      )
    }
  },
  {
    id: "contacts",
    title: "Add Emergency Contacts",
    description: "Add the people you trust most. They'll receive alerts via email, SMS, and automated phone calls if you miss a check-in.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Emergency Contacts</h3>
          <div className="space-y-2">
            {[
              { name: "Mum", status: "Confirmed", color: "text-green-600" },
              { name: "Partner", status: "Confirmed", color: "text-green-600" },
              { name: "Best Friend", status: "Pending...", color: "text-amber-500" }
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{c.name}</p>
                  <p className={`text-[10px] ${c.color}`}>{c.status}</p>
                </div>
                <Heart className="h-3 w-3 text-muted-foreground" />
              </div>
            ))}
          </div>
          <div className="mt-3 h-8 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-1">
            <span className="text-xs text-muted-foreground">+ Add Contact</span>
          </div>
        </div>
      )
    }
  },
  {
    id: "checkin",
    title: "Check In With One Tap",
    description: "When it's time, just tap the button to let your contacts know you're safe. Build streaks and track your wellbeing over time.",
    phone: {
      bg: "bg-black dark:bg-black",
      content: (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="animate-pulse" style={{ animationDuration: '2s' }}>
            <div className="text-3xl font-bold text-green-500 mb-1">aok</div>
          </div>
          <div className="animate-pulse">
            <Check className="h-14 w-14 text-green-500 mb-2 animate-bounce" strokeWidth={3} style={{ animationDuration: '2s' }} />
          </div>
          <span className="text-white font-semibold text-sm animate-pulse" style={{ animationDuration: '3s' }}>you're aok</span>
          <div className="mt-4 flex items-center gap-4 text-gray-400">
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">14</p>
              <p className="text-[9px]">Day Streak</p>
            </div>
            <div className="h-6 w-px bg-gray-700" />
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">3</p>
              <p className="text-[9px]">Contacts</p>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "emergency",
    title: "Emergency? We've Got You",
    description: "Hit the emergency button or just shake your phone. Your GPS location is instantly shared with all contacts via email, SMS, and phone calls.",
    phone: {
      bg: "bg-black dark:bg-black",
      content: (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="relative mb-3">
            <div className="h-20 w-20 rounded-full bg-red-600/20 flex items-center justify-center animate-pulse" style={{ animationDuration: '1s' }}>
              <div className="h-14 w-14 rounded-full bg-red-600/40 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-ping" />
          </div>
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Emergency Alert Active</p>
          <p className="text-gray-500 text-[10px] text-center">Alerting 3 contacts...</p>
          <div className="mt-3 w-full space-y-1.5">
            <div className="flex items-center gap-2 px-2 py-1 bg-red-900/30 rounded">
              <Mail className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-300">Email sent</span>
              <Check className="h-3 w-3 text-green-400 ml-auto" />
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-red-900/30 rounded">
              <MessageSquare className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-300">SMS sent</span>
              <Check className="h-3 w-3 text-green-400 ml-auto" />
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-red-900/30 rounded animate-pulse">
              <Phone className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-300">Calling Mum...</span>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "wellness",
    title: "Track Your Wellbeing",
    description: "Log your mood, chat with the AI wellbeing assistant, and store important documents — all in one place.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Wellbeing Hub</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Mood", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "AI Chat", icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10" },
              { label: "Pets", icon: PawPrint, color: "text-rose-500", bg: "bg-rose-500/10" },
              { label: "Documents", icon: Scroll, color: "text-slate-500", bg: "bg-slate-500/10" },
              { label: "Routes", icon: Map, color: "text-sky-500", bg: "bg-sky-500/10" },
            ].map((item) => (
              <div key={item.label} className={`${item.bg} rounded-lg p-2 flex flex-col items-center gap-1`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-[10px] font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[10px] font-semibold text-foreground">Wellbeing AI</span>
            </div>
            <p className="text-[9px] text-muted-foreground">How are you feeling today? I'm here to listen and support you.</p>
          </div>
        </div>
      )
    }
  }
];

const DEMO_STEPS_ORG = [
  {
    id: "org-dashboard",
    title: "Organisation Dashboard",
    description: "See all your clients at a glance. Monitor check-in status, manage bundles, and respond to emergencies from one centralised view.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">Care Hub Ltd</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="bg-green-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-green-600">12</p>
              <p className="text-[8px] text-muted-foreground">Safe</p>
            </div>
            <div className="bg-amber-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-amber-600">3</p>
              <p className="text-[8px] text-muted-foreground">Pending</p>
            </div>
            <div className="bg-red-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-red-600">1</p>
              <p className="text-[8px] text-muted-foreground">Overdue</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "Sarah M.", status: "Safe", time: "2m ago", color: "bg-green-500" },
              { name: "James P.", status: "Pending", time: "Due now", color: "bg-amber-500" },
              { name: "Ruth W.", status: "Overdue", time: "15m late", color: "bg-red-500" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border">
                <div className={`h-2 w-2 rounded-full ${c.color}`} />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-foreground">{c.name}</p>
                  <p className="text-[8px] text-muted-foreground">{c.time}</p>
                </div>
                <Badge variant="outline" className="text-[7px] px-1 py-0">{c.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )
    }
  },
  {
    id: "org-safeguarding",
    title: "Safeguarding Hub",
    description: "Report incidents, track welfare concerns, manage case files, and set escalation rules. Built for care providers and regulated industries.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">Safeguarding Hub</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-[10px] font-semibold text-foreground">Active Incident</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Missed check-in escalated - Ruth W.</p>
              <p className="text-[8px] text-red-500 mt-1">Priority: High</p>
            </div>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Eye className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-semibold text-foreground">Welfare Concern</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Low mood pattern detected - James P.</p>
            </div>
            <div className="p-2 rounded bg-muted/50 border">
              <div className="flex items-center gap-1 mb-1">
                <Scroll className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-foreground">Case Files</span>
              </div>
              <p className="text-[9px] text-muted-foreground">4 open cases, 2 resolved this week</p>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "org-assurance",
    title: "Assurance Dashboard",
    description: "Real-time safeguarding position with KPI tiles, service risk heatmaps, RAG status indicators, and board governance reports. Inspection-ready at all times.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-foreground">Assurance Dashboard</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <div className="bg-green-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-green-600">94%</p>
              <p className="text-[7px] text-muted-foreground">Control Score</p>
            </div>
            <div className="bg-blue-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-blue-600">97%</p>
              <p className="text-[7px] text-muted-foreground">SLA Compliance</p>
            </div>
            <div className="bg-amber-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-amber-600">2</p>
              <p className="text-[7px] text-muted-foreground">Open Alerts</p>
            </div>
            <div className="bg-emerald-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-emerald-600">16</p>
              <p className="text-[7px] text-muted-foreground">Active Clients</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 rounded bg-muted/50 border">
              <span className="text-[9px] text-foreground">Risk Heatmap</span>
              <div className="flex gap-1">
                <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-muted/50 border">
              <span className="text-[9px] text-foreground">Board Report</span>
              <Badge variant="outline" className="text-[7px] px-1 py-0">Export</Badge>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-muted/50 border">
              <span className="text-[9px] text-foreground">Incident Timeline</span>
              <span className="text-[8px] text-muted-foreground">90 days</span>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "org-grc",
    title: "GRC — Governance, Risk & Compliance",
    description: "8-tier role-based access control, tamper-evident audit trails with hash-chain verification, security logging with PII redaction, and UK GDPR-compliant data handling.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold text-foreground">GRC</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-semibold text-foreground">RBAC — 8 Tiers</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Owner, Admin, Safeguarding Lead, Service Manager, Manager, Staff, Trustee, Viewer</p>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-semibold text-foreground">Audit Trail</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Hash-chain verified, tamper-evident, exportable PDF/CSV</p>
            </div>
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Lock className="h-3 w-3 text-indigo-500" />
                <span className="text-[10px] font-semibold text-foreground">Security</span>
              </div>
              <p className="text-[9px] text-muted-foreground">TOTP 2FA, PII redaction, UK GDPR compliant</p>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "org-funder",
    title: "Funder Ready Reporting",
    description: "Exportable PDF and CSV compliance reports, measurable outcomes with quantifiable metrics, board-level RAG status indicators, and trend analysis for funders and regulators.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">Funder Ready</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-[10px] font-semibold text-foreground mb-1">Board Governance Report</p>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-[7px] px-1 py-0">PDF</Badge>
                <Badge variant="outline" className="text-[7px] px-1 py-0">CSV</Badge>
                <Badge variant="outline" className="text-[7px] px-1 py-0">JSON</Badge>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Control Effectiveness", value: "94%", color: "bg-green-500" },
                { label: "SLA Compliance", value: "97%", color: "bg-green-500" },
                { label: "Response Time", value: "4.2m", color: "bg-green-500" },
                { label: "Open Alerts", value: "2", color: "bg-amber-500" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between p-1.5 rounded bg-muted/50 border">
                  <span className="text-[9px] text-foreground">{m.label}</span>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${m.color}`} />
                    <span className="text-[9px] font-semibold text-foreground">{m.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-1.5 rounded bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-[9px] text-green-600 font-medium">Trend: Improving over 90 days</p>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "org-api",
    title: "API Access for External Integration",
    description: "Create read-only API keys for integrating aok assurance data with third-party GRC platforms, board reporting tools, and funder monitoring systems.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-bold text-foreground">API Access</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-foreground">BoardEffect Key</span>
                <Badge className="text-[7px] px-1 py-0 bg-green-500">Active</Badge>
              </div>
              <p className="text-[8px] text-muted-foreground font-mono">aok_7f3a...x9k2</p>
              <p className="text-[8px] text-muted-foreground">142 requests today</p>
            </div>
            <div className="p-2 rounded bg-muted/50 border">
              <p className="text-[10px] font-semibold text-foreground mb-1">Endpoints</p>
              <div className="space-y-1">
                {["Overview", "Heatmap", "Manager", "Incidents"].map((e) => (
                  <div key={e} className="flex items-center gap-1">
                    <Check className="h-2.5 w-2.5 text-green-500" />
                    <span className="text-[8px] text-muted-foreground">/api/v1/assurance/{e.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-1.5 rounded bg-muted/50 border flex items-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[8px] text-muted-foreground">Read-only, rate-limited, audit-logged</span>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "org-features",
    title: "Control Client Features",
    description: "Toggle individual wellness features on or off for each client. Different clients may need different tools — you decide what they see.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <h3 className="text-xs font-semibold mb-2 text-foreground">Client Feature Control</h3>
          <p className="text-[9px] text-muted-foreground mb-3">Sarah M. - Feature Toggles</p>
          <div className="space-y-2">
            {[
              { label: "Check-in System", on: true, locked: true },
              { label: "Emergency Alerts", on: true, locked: true },
              { label: "Mood Tracking", on: true, locked: false },
              { label: "Pet Profiles", on: false, locked: false },
              { label: "AI Wellbeing Chat", on: false, locked: false },
              { label: "Document Storage", on: false, locked: false },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between px-2 py-1 rounded bg-muted/30">
                <span className="text-[10px] text-foreground">{f.label}</span>
                <div className={`h-4 w-7 rounded-full flex items-center px-0.5 ${f.on ? 'bg-green-500 justify-end' : 'bg-muted-foreground/30 justify-start'}`}>
                  <div className="h-3 w-3 rounded-full bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }
];

const DEMO_STEPS_LONE_WORKER = [
  {
    id: "lw-session",
    title: "Start a Lone Worker Session",
    description: "Workers clock in at the start of a shift. GPS tracking, automatic check-in reminders, and supervisor alerts activate immediately.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardHat className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold text-foreground">Lone Worker</span>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-600">Session Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Started 45 minutes ago</p>
            <p className="text-[10px] text-muted-foreground">Next check-in: 15 minutes</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <div>
                <p className="text-[10px] font-medium text-foreground">GPS Active</p>
                <p className="text-[8px] text-muted-foreground">Location shared with supervisor</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border">
              <Phone className="h-3.5 w-3.5 text-indigo-500" />
              <div>
                <p className="text-[10px] font-medium text-foreground">Call Supervisor</p>
                <p className="text-[8px] text-muted-foreground">Tap to call directly</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "lw-alert",
    title: "Missed Check-In? Instant Escalation",
    description: "If a lone worker doesn't check in on time, their supervisor is immediately alerted with their last known GPS location. No delays.",
    phone: {
      bg: "bg-black dark:bg-black",
      content: (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="w-full bg-red-900/40 rounded-lg p-3 mb-3 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs font-bold text-red-300">OVERDUE ALERT</span>
            </div>
            <p className="text-[10px] text-gray-400 mb-1">Worker: David K.</p>
            <p className="text-[10px] text-gray-400 mb-1">Last check-in: 32 minutes ago</p>
            <p className="text-[10px] text-gray-400">Location: ///brave.lucky.cake</p>
          </div>
          <div className="w-full space-y-1.5">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/30 rounded">
              <Phone className="h-3 w-3 text-red-400 animate-pulse" />
              <span className="text-[10px] text-red-300">Calling supervisor...</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/30 rounded">
              <Mail className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-300">Email alert sent</span>
              <Check className="h-3 w-3 text-green-400 ml-auto" />
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/30 rounded">
              <MessageSquare className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-300">SMS sent to worker</span>
              <Check className="h-3 w-3 text-green-400 ml-auto" />
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: "lw-monitor",
    title: "Supervisor Monitoring Dashboard",
    description: "Supervisors see all active lone workers in real time — who's checked in, who's overdue, and where they are. One view, full oversight.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">Lone Worker Monitor</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <div className="bg-green-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-green-600">4</p>
              <p className="text-[8px] text-muted-foreground">Active</p>
            </div>
            <div className="bg-red-500/10 rounded p-1.5 text-center">
              <p className="text-sm font-bold text-red-600">1</p>
              <p className="text-[8px] text-muted-foreground">Overdue</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "David K.", role: "Field Engineer", status: "Overdue", color: "bg-red-500" },
              { name: "Lisa R.", role: "Social Worker", status: "Active", color: "bg-green-500" },
              { name: "Tom M.", role: "Estate Agent", status: "Active", color: "bg-green-500" },
            ].map((w) => (
              <div key={w.name} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border">
                <div className={`h-2 w-2 rounded-full ${w.color}`} />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-foreground">{w.name}</p>
                  <p className="text-[8px] text-muted-foreground">{w.role}</p>
                </div>
                <Badge variant={w.status === "Overdue" ? "destructive" : "outline"} className="text-[7px] px-1 py-0">{w.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )
    }
  },
  {
    id: "lw-audit",
    title: "Audit Trail & Compliance",
    description: "Every check-in, escalation, and action is logged in a tamper-evident audit trail. Exportable reports for HSE compliance and lone worker risk assessments.",
    phone: {
      bg: "bg-card",
      content: (
        <div className="flex flex-col h-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-xs font-bold text-foreground">Audit Trail</span>
          </div>
          <div className="space-y-1.5">
            {[
              { time: "14:32", event: "Check-in confirmed", who: "David K.", icon: Check, color: "text-green-500" },
              { time: "14:02", event: "SMS reminder sent", who: "David K.", icon: MessageSquare, color: "text-blue-500" },
              { time: "14:00", event: "Check-in overdue", who: "David K.", icon: AlertTriangle, color: "text-amber-500" },
              { time: "13:30", event: "Session started", who: "David K.", icon: Play, color: "text-indigo-500" },
              { time: "13:28", event: "GPS tracking enabled", who: "System", icon: MapPin, color: "text-purple-500" },
            ].map((e, i) => (
              <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-muted/50 border">
                <e.icon className={`h-3 w-3 mt-0.5 ${e.color} flex-shrink-0`} />
                <div className="flex-1">
                  <p className="text-[9px] font-medium text-foreground">{e.event}</p>
                  <p className="text-[8px] text-muted-foreground">{e.who} · {e.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 p-1.5 rounded bg-green-500/10 border border-green-500/20 flex items-center gap-1">
            <Lock className="h-3 w-3 text-green-500" />
            <span className="text-[8px] text-green-600">Hash-chain verified</span>
          </div>
        </div>
      )
    }
  }
];

function PhoneMockup({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className="relative aspect-[9/19] rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 border-[3px] border-gray-300 dark:border-gray-600 shadow-xl max-w-[220px] mx-auto">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gradient-to-b from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600 rounded-full z-10" />
      <div className={`absolute inset-1 rounded-[2rem] overflow-hidden ${bg}`}>
        <div className="pt-7">
          {children}
        </div>
      </div>
      <div className="absolute inset-1 rounded-[2rem] pointer-events-none bg-gradient-to-br from-white/20 via-transparent to-transparent" />
    </div>
  );
}

function DemoStepCard({ step, index, isActive, onClick }: {
  step: typeof DEMO_STEPS_INDIVIDUAL[0];
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isActive
          ? 'border-green-500/50 bg-green-500/5 shadow-sm'
          : 'border-transparent hover-elevate'
      }`}
      data-testid={`button-demo-step-${step.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold ${
          isActive ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
        }`}>
          {index + 1}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">{step.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
      </div>
    </button>
  );
}

function DemoWalkthrough({ title, subtitle, steps }: {
  title: string;
  subtitle: string;
  steps: typeof DEMO_STEPS_INDIVIDUAL;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const current = steps[activeStep];

  return (
    <div className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground" data-testid={`text-demo-section-${title.toLowerCase().replace(/\s/g, '-')}`}>{title}</h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1 space-y-2">
            {steps.map((step, i) => (
              <DemoStepCard
                key={step.id}
                step={step}
                index={i}
                isActive={i === activeStep}
                onClick={() => setActiveStep(i)}
              />
            ))}
          </div>

          <div className="order-1 md:order-2 flex justify-center" data-testid="phone-mockup-container">
            <div className="w-[220px]">
              <PhoneMockup bg={current.phone.bg}>
                {current.phone.content}
              </PhoneMockup>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Demo() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get("type") as DemoSection | null;

  const initialSection: DemoSection = typeParam && ["individual", "organisation", "lone-worker"].includes(typeParam)
    ? typeParam
    : "overview";

  const [activeSection, setActiveSection] = useState<DemoSection>(initialSection);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("type") as DemoSection | null;
    if (t && ["individual", "organisation", "lone-worker"].includes(t)) {
      setActiveSection(t);
    }
  }, [location]);

  const isOrgOrLoneWorker = activeSection === "organisation" || activeSection === "lone-worker";

  const heroContent = {
    overview: {
      badge: "Interactive Product Demo",
      title: <>See How <span className="text-green-600">aok</span> Keeps<br />People Safe</>,
      subtitle: "Walk through the key features of aok and see how individuals, organisations, and lone workers stay connected and protected."
    },
    individual: {
      badge: "Personal Safety Demo",
      title: <>Your Safety Net,<br /><span className="text-green-600">Always On</span></>,
      subtitle: "See how aok keeps you connected with loved ones through automated check-ins, emergency alerts, and wellness tracking."
    },
    organisation: {
      badge: "Organisation & Safeguarding Demo",
      title: <>Safeguarding With<br /><span className="text-green-600">Measurable Assurance</span></>,
      subtitle: "See how aok delivers real-time safeguarding, GRC compliance, funder-ready reporting, and tamper-evident audit trails for your organisation."
    },
    "lone-worker": {
      badge: "Lone Worker Protection Demo",
      title: <>Protecting Those<br /><span className="text-green-600">Who Work Alone</span></>,
      subtitle: "See how aok provides automatic check-ins, GPS tracking, supervisor alerts, and HSE-compliant audit trails for lone workers."
    }
  };

  const hero = heroContent[activeSection];

  return (
    <div className="min-h-screen bg-background" data-testid="page-demo">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2" data-testid="link-demo-logo">
              <ShieldCheck className="h-7 w-7 text-green-600" />
              <span className="text-xl font-bold text-green-600">aok</span>
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex">Product Demo</Badge>
          </div>
          <div className="flex items-center gap-2">
            {isOrgOrLoneWorker ? (
              <a href="mailto:help@aok.care?subject=Organisation%20Enquiry%20-%20aok%20Demo">
                <Button size="sm" data-testid="button-demo-get-quote">
                  Get a Quote
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </a>
            ) : (
              <Link href="/onboarding">
                <Button size="sm" data-testid="button-demo-get-started">
                  Get Started Free
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="relative py-16 md:py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-green-500/10" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1 text-sm" data-testid="badge-demo">
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {hero.badge}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight text-foreground" data-testid="text-demo-title">
            {hero.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {hero.subtitle}
          </p>

          {activeSection === "overview" && (
            <div className="flex flex-wrap justify-center gap-2 mb-4" data-testid="demo-section-tabs">
              {[
                { id: "individual" as DemoSection, label: "Individuals", icon: User },
                { id: "organisation" as DemoSection, label: "Organisations", icon: Building2 },
                { id: "lone-worker" as DemoSection, label: "Lone Workers", icon: HardHat },
              ].map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection(s.id)}
                  className="gap-1.5"
                  data-testid={`button-tab-${s.id}`}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </section>

      {activeSection === "overview" && (
        <>
          <section className="py-16 px-4 bg-muted/30">
            <div className="container mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground" data-testid="text-what-is-aok">What is aok?</h2>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  aok is a check-in, safeguarding, and wellbeing platform. If you don't check in on time, your emergency contacts are automatically alerted via email, SMS, and phone calls with your GPS location.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="rounded-full bg-green-500/10 p-4 w-fit mx-auto mb-4">
                      <User className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2 text-foreground">For Individuals</h3>
                    <p className="text-sm text-muted-foreground">
                      People living alone, seniors, solo travellers, and anyone who wants their loved ones to know they're safe.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 gap-1"
                      onClick={() => setActiveSection("individual")}
                      data-testid="button-explore-individual"
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="rounded-full bg-indigo-500/10 p-4 w-fit mx-auto mb-4">
                      <Building2 className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="font-semibold mb-2 text-foreground">For Organisations</h3>
                    <p className="text-sm text-muted-foreground">
                      Care homes, charities, housing associations, and companies looking after vulnerable people or staff.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 gap-1"
                      onClick={() => setActiveSection("organisation")}
                      data-testid="button-explore-organisation"
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="rounded-full bg-amber-500/10 p-4 w-fit mx-auto mb-4">
                      <HardHat className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="font-semibold mb-2 text-foreground">For Lone Workers</h3>
                    <p className="text-sm text-muted-foreground">
                      Field engineers, delivery drivers, social workers, and anyone who works alone or in isolated locations.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 gap-1"
                      onClick={() => setActiveSection("lone-worker")}
                      data-testid="button-explore-lone-worker"
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="py-16 px-4">
            <div className="container mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">How the Protection Net Works</h2>
                <p className="text-base text-muted-foreground max-w-xl mx-auto">
                  Four layers of protection, working together seamlessly.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: "1",
                    title: "Check In",
                    desc: "Tap the button or shake your phone to confirm you're safe.",
                    icon: CheckCircle,
                    color: "bg-green-600"
                  },
                  {
                    step: "2",
                    title: "Timer Runs",
                    desc: "Your next check-in countdown starts. Reminders are sent as it approaches.",
                    icon: Clock,
                    color: "bg-blue-600"
                  },
                  {
                    step: "3",
                    title: "Missed?",
                    desc: "If you don't check in, we send you an SMS reminder with a one-tap link.",
                    icon: Bell,
                    color: "bg-amber-600"
                  },
                  {
                    step: "4",
                    title: "Alert Contacts",
                    desc: "Still no response? We alert all your contacts via email, SMS, and phone calls.",
                    icon: AlertTriangle,
                    color: "bg-red-600"
                  }
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div className={`${s.color} text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 text-lg font-bold`}>
                      {s.step}
                    </div>
                    <s.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-semibold mb-1 text-foreground">{s.title}</h4>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">Key Numbers</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: "4", label: "Alert channels (Email, SMS, Voice, Push)" },
                  { value: "5min", label: "Shortest check-in interval" },
                  { value: "48hr", label: "Longest check-in interval" },
                  { value: "12", label: "Monitored external services" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-3xl font-bold text-green-600 mb-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {activeSection === "individual" && (
        <DemoWalkthrough
          title="For Individuals"
          subtitle="See how aok protects people living alone, seniors, solo travellers, and anyone who wants peace of mind."
          steps={DEMO_STEPS_INDIVIDUAL}
        />
      )}

      {activeSection === "organisation" && (
        <DemoWalkthrough
          title="For Organisations"
          subtitle="Manage clients, monitor wellbeing, demonstrate GRC compliance, and generate funder-ready assurance reports — all from one platform."
          steps={DEMO_STEPS_ORG}
        />
      )}

      {activeSection === "lone-worker" && (
        <DemoWalkthrough
          title="For Lone Workers"
          subtitle="Protect staff who work alone with GPS tracking, automatic check-ins, instant supervisor alerts, and HSE-compliant audit trails."
          steps={DEMO_STEPS_LONE_WORKER}
        />
      )}

      {isOrgOrLoneWorker && (
        <section className="py-14 px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-y border-green-200 dark:border-green-800/50">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700 mb-3">Net Zero Commitment</Badge>
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">Making an Environmental Difference</h3>
              <p className="text-sm text-green-700 dark:text-green-400 max-w-2xl mx-auto">
                Every aok subscription contributes to verified tree planting and carbon offsetting through our partnership with{" "}
                <a href="https://ecologi.com/nghuman18" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-green-800 dark:hover:text-green-300">Ecologi</a>.
                Your organisation receives auditable environmental impact certificates suitable for board-level reporting and ESG compliance.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                <TreeDeciduous className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Verified Tree Planting</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">Every account plants a tree through certified carbon offset projects</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                <Leaf className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Board-Ready Certificates</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">Environmental impact certificates for ESG reporting and funder submissions</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Net Zero Pathway</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">Demonstrate measurable progress towards your organisation's net zero targets</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 px-4 bg-gradient-to-br from-green-600 to-green-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white" data-testid="text-demo-cta">
            {isOrgOrLoneWorker ? "Ready to Protect Your Team?" : "Ready to Get Started?"}
          </h2>
          <p className="text-green-100 mb-8 max-w-lg mx-auto">
            {isOrgOrLoneWorker
              ? "Contact us to discuss your organisation's requirements. We'll build a package tailored to your needs."
              : "Try aok free for 7 days. No payment details required. Set up in under 2 minutes."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isOrgOrLoneWorker ? (
              <a href="mailto:help@aok.care?subject=Organisation%20Enquiry%20-%20aok%20Demo">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2" data-testid="button-demo-get-quote-cta">
                  <Mail className="h-4 w-4" />
                  Get a Quote
                </Button>
              </a>
            ) : (
              <Link href="/onboarding">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2" data-testid="button-demo-start-trial">
                  Start Free Trial
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-600">aok</span>
            <span className="text-sm text-muted-foreground">Personal Check-In</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/guide" className="hover:text-foreground">Help Guide</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
