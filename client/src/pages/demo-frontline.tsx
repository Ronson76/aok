import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Home, Users, Zap, Clock, BarChart3, ArrowLeft, Search,
  Heart, MessageSquare, Shield, Pill, TrendingUp, Building,
  Phone, UserCheck, AlertTriangle, CheckCircle, CircleDot,
  ChevronRight, Download, AlertOctagon, Activity, User,
  X, HandHeart, Users2, Siren, ClipboardList,
  Play, Pause, SkipForward, SkipBack, ChevronDown, ChevronUp
} from "lucide-react";

const DEMO_RESIDENTS = [
  { id: "1", clientName: "Sarah Johnson", referenceCode: "SJ-2024-001", engagementStatus: "green", lastContact: new Date(Date.now() - 2 * 3600000).toISOString(), openConcerns: 0 },
  { id: "2", clientName: "Marcus Williams", referenceCode: "MW-2024-002", engagementStatus: "amber", lastContact: new Date(Date.now() - 5 * 86400000).toISOString(), openConcerns: 0 },
  { id: "3", clientName: "Priya Patel", referenceCode: "PP-2024-003", engagementStatus: "red", lastContact: new Date(Date.now() - 12 * 86400000).toISOString(), openConcerns: 1 },
  { id: "4", clientName: "James O'Brien", referenceCode: "JO-2024-004", engagementStatus: "green", lastContact: new Date(Date.now() - 12 * 3600000).toISOString(), openConcerns: 0 },
  { id: "5", clientName: "Aisha Mohammed", referenceCode: "AM-2024-005", engagementStatus: "amber", lastContact: new Date(Date.now() - 6 * 86400000).toISOString(), openConcerns: 0 },
  { id: "6", clientName: "David Chen", referenceCode: "DC-2024-006", engagementStatus: "green", lastContact: new Date(Date.now() - 8 * 3600000).toISOString(), openConcerns: 0 },
];

const DEMO_SIGNALS = [
  { id: "s1", level: "urgent_help", clientName: "Priya Patel", referenceCode: "PP-2024-003", createdAt: new Date(Date.now() - 8 * 60000).toISOString(), escalationLevel: 1, notes: "Not feeling safe tonight", preferStaffVisit: true, requestLaterCheckin: false },
  { id: "s2", level: "need_support", clientName: "Marcus Williams", referenceCode: "MW-2024-002", createdAt: new Date(Date.now() - 25 * 60000).toISOString(), escalationLevel: 0, notes: "", preferStaffVisit: false, requestLaterCheckin: true },
];

const DEMO_TIMELINE = [
  { id: "t1", type: "quick_log", category: "wellbeing_check", timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), staffName: "Emma R.", notes: "In good spirits today, asked about gym membership" },
  { id: "t2", type: "support_signal", category: "im_ok", timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), respondedByName: null, notes: "" },
  { id: "t3", type: "quick_log", category: "key_worker_session", timestamp: new Date(Date.now() - 26 * 3600000).toISOString(), staffName: "Tom H.", notes: "Discussed move-on plan goals, on track", followUpRequired: true },
  { id: "t4", type: "kiosk_checkin", category: null, timestamp: new Date(Date.now() - 28 * 3600000).toISOString(), staffName: null, notes: "" },
  { id: "t5", type: "data_capture", category: "Housing Support", timestamp: new Date(Date.now() - 50 * 3600000).toISOString(), staffName: "Emma R.", riskTier: "low", notes: "Housing application submitted for 2-bed property" },
  { id: "t6", type: "quick_log", category: "medication", timestamp: new Date(Date.now() - 74 * 3600000).toISOString(), staffName: "Tom H.", notes: "Medication collected on time" },
  { id: "t7", type: "support_signal", category: "need_support", timestamp: new Date(Date.now() - 96 * 3600000).toISOString(), respondedByName: "Emma R.", notes: "Feeling anxious about appointment" },
  { id: "t8", type: "safeguarding", category: "Wellbeing concern", timestamp: new Date(Date.now() - 120 * 3600000).toISOString(), staffName: "Tom H.", status: "resolved", notes: "Initial assessment completed, no further action" },
];

const DEMO_DASHBOARD = {
  stats: { todayInteractions: 14, weekInteractions: 67, openConcerns: 2, totalClients: 24 },
  needsContact: [
    { id: "3", clientName: "Priya Patel" },
    { id: "nc2", clientName: "Liam Foster" },
  ],
  overdueFollowups: [
    { id: "of1", clientName: "James O'Brien", followUpDate: "12 Mar" },
  ],
  recentActivity: [
    { id: "ra1", category: "wellbeing_check", clientName: "Sarah Johnson", staffName: "Emma R.", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "ra2", category: "medication", clientName: "David Chen", staffName: "Tom H.", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: "ra3", category: "support_conversation", clientName: "Aisha Mohammed", staffName: "Emma R.", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: "ra4", category: "housing_support", clientName: "Marcus Williams", staffName: "Jess W.", createdAt: new Date(Date.now() - 8 * 3600000).toISOString() },
  ],
};

const DEMO_MANAGER = {
  engagementRate: { rate: 79, contacted: 19, total: 24 },
  categoryBreakdown: [
    { category: "wellbeing_check", count: 28 },
    { category: "support_conversation", count: 19 },
    { category: "key_worker_session", count: 15 },
    { category: "medication", count: 12 },
    { category: "housing_support", count: 9 },
    { category: "general_contact", count: 8 },
    { category: "safeguarding_concern", count: 4 },
    { category: "crisis_intervention", count: 2 },
    { category: "move_on_planning", count: 6 },
    { category: "group_activity", count: 11 },
  ],
  staffActivity: [
    { staffName: "Emma R.", count: 42, lastActive: new Date(Date.now() - 2 * 3600000).toISOString() },
    { staffName: "Tom H.", count: 35, lastActive: new Date(Date.now() - 4 * 3600000).toISOString() },
    { staffName: "Jess W.", count: 28, lastActive: new Date(Date.now() - 8 * 3600000).toISOString() },
    { staffName: "Kai L.", count: 9, lastActive: new Date(Date.now() - 24 * 3600000).toISOString() },
  ],
  riskDistribution: [
    { riskTier: "low", count: 38 },
    { riskTier: "medium", count: 14 },
    { riskTier: "high", count: 4 },
  ],
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  wellbeing_check: { label: "Wellbeing Check", icon: Heart, color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
  support_conversation: { label: "Support Conversation", icon: MessageSquare, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
  safeguarding_concern: { label: "Safeguarding Concern", icon: Shield, color: "text-red-600 bg-red-50 dark:bg-red-900/30" },
  medication: { label: "Medication", icon: Pill, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30" },
  move_on_planning: { label: "Move-on Planning", icon: TrendingUp, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
  housing_support: { label: "Housing Support", icon: Building, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30" },
  general_contact: { label: "General Contact", icon: Phone, color: "text-gray-600 bg-gray-50 dark:bg-gray-900/30" },
  key_worker_session: { label: "Key Worker Session", icon: UserCheck, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
  crisis_intervention: { label: "Crisis Intervention", icon: Siren, color: "text-red-700 bg-red-100 dark:bg-red-900/40" },
  group_activity: { label: "Group Activity", icon: Users2, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
};

const STATUS_COLORS: Record<string, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const SIGNAL_LABELS: Record<string, { label: string; color: string }> = {
  need_support: { label: "Needs Support", color: "border-amber-400 bg-amber-50 dark:bg-amber-900/20" },
  urgent_help: { label: "URGENT HELP", color: "border-red-400 bg-red-50 dark:bg-red-900/20" },
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "No contact";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface TourStep {
  id: string;
  tab: string;
  title: string;
  description: string;
  highlight?: string;
  action?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    tab: "home",
    title: "Welcome to Frontline Support",
    description: "This is your central hub for supporting vulnerable people. Designed for hostels, shelters, supported living, and outreach services. Let's walk through the key features.",
  },
  {
    id: "signals",
    tab: "home",
    title: "Live Support Signals",
    description: "When a resident taps 'Urgent Help' or 'Need Support' on their device, it appears here instantly. Staff can acknowledge signals with one tap. Automated escalation alerts managers if no one responds within minutes.",
    highlight: "signals-panel",
  },
  {
    id: "stats",
    tab: "home",
    title: "At-a-Glance Stats",
    description: "See today's interaction count, weekly totals, open safeguarding concerns, and total residents. These update in real-time as your team logs interactions throughout the day.",
    highlight: "stats-panel",
  },
  {
    id: "needs-contact",
    tab: "home",
    title: "Needs Contact Alerts",
    description: "Residents who haven't had any contact in 7+ days are automatically flagged here. One tap to log an interaction. Nobody falls through the cracks.",
    highlight: "needs-contact-panel",
  },
  {
    id: "residents",
    tab: "residents",
    title: "Resident List with RAG Status",
    description: "Every resident has a Red / Amber / Green engagement indicator. Green = contacted within 3 days. Amber = 4-7 days. Red = 7+ days or open safeguarding concern. Search by name or reference code.",
    highlight: "residents-list",
  },
  {
    id: "quicklog",
    tab: "quicklog",
    title: "Quick Log: Under 10 Seconds",
    description: "The core of Frontline Support. Select a resident, tap a category, optionally add a note, and submit. 10 categories cover everything from wellbeing checks to crisis interventions. Designed for busy staff who can't spend time on paperwork.",
    highlight: "quicklog-panel",
  },
  {
    id: "quicklog-categories",
    tab: "quicklog",
    title: "10 Interaction Categories",
    description: "Wellbeing Check, Support Conversation, Safeguarding Concern, Medication, Move-on Planning, Housing Support, General Contact, Key Worker Session, Crisis Intervention, and Group Activity. Each is colour-coded and icon-tagged for instant recognition.",
    highlight: "categories-grid",
    action: "select-resident",
  },
  {
    id: "timeline",
    tab: "timeline",
    title: "Unified Resident Timeline",
    description: "Every interaction, from every source, in one place. Quick logs, data capture entries, safeguarding concerns, kiosk check-ins, and support signals — all merged chronologically. This is your complete picture of each resident's journey.",
    highlight: "timeline-panel",
  },
  {
    id: "manager",
    tab: "manager",
    title: "Manager Dashboard",
    description: "Service managers see engagement rates, interaction category breakdowns, individual staff activity, and risk distribution. Export everything as CSV for commissioners, funders, and CQC inspections.",
    highlight: "manager-panel",
  },
  {
    id: "signal-resident",
    tab: "signal",
    title: "Resident Support Signal",
    description: "This is what residents see on their device. Three large, clear buttons: 'I'm OK' (a passive wellbeing check), 'Need Support' (staff alert), or 'Urgent Help' (immediate escalation). Trauma-informed design — they stay in control, no monitoring.",
    highlight: "signal-panel",
  },
  {
    id: "closing",
    tab: "signal",
    title: "Ready for Your Organisation?",
    description: "Frontline Support works alongside AOK's existing safeguarding hub, data capture, and kiosk check-in. All data feeds into unified timelines and compliance reports. Contact us to get started.",
  },
];

export default function DemoFrontline() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedDemoResident, setSelectedDemoResident] = useState(false);
  const [tourMinimized, setTourMinimized] = useState(false);
  const [quickLogDemoCategory, setQuickLogDemoCategory] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (step) {
      setActiveTab(step.tab);
      if (step.action === "select-resident") {
        setSelectedDemoResident(true);
      }
    }
  }, [currentStep]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setQuickLogDemoCategory(null);
      if (currentStep - 1 < 7) setSelectedDemoResident(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(nextStep, 8000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, currentStep, nextStep]);

  const progressPercent = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background relative" data-testid="demo-frontline-page">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/organisations")} data-testid="button-demo-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-primary" />
                Frontline Support
                <Badge variant="secondary" className="text-[10px] ml-1">DEMO</Badge>
              </h1>
              <p className="text-xs text-muted-foreground">Interactive guided tour</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">Emma R. (Staff)</Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 pb-48">
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {[
            { key: "home", label: "Home", icon: Home },
            { key: "residents", label: "Residents", icon: Users },
            { key: "quicklog", label: "Quick Log", icon: Zap },
            { key: "timeline", label: "Timeline", icon: Clock },
            { key: "manager", label: "Manager", icon: BarChart3 },
            { key: "signal", label: "Signal", icon: Heart },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`demo-tab-${tab.key}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={step?.highlight ? "" : ""}>
          {activeTab === "home" && <DemoHomeTab highlight={step?.highlight} />}
          {activeTab === "residents" && <DemoResidentsTab highlight={step?.highlight} />}
          {activeTab === "quicklog" && <DemoQuickLogTab selectedResident={selectedDemoResident} highlight={step?.highlight} selectedCategory={quickLogDemoCategory} onSelectCategory={setQuickLogDemoCategory} />}
          {activeTab === "timeline" && <DemoTimelineTab highlight={step?.highlight} />}
          {activeTab === "manager" && <DemoManagerTab highlight={step?.highlight} />}
          {activeTab === "signal" && <DemoSignalTab highlight={step?.highlight} />}
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${tourMinimized ? "translate-y-[calc(100%-48px)]" : ""}`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-card border-2 border-primary/30 rounded-t-2xl shadow-2xl overflow-hidden" data-testid="tour-panel">
            <button
              className="w-full flex items-center justify-center py-1.5 hover:bg-muted/50 transition-colors"
              onClick={() => setTourMinimized(!tourMinimized)}
              data-testid="button-toggle-tour"
            >
              {tourMinimized ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>

            <div className="px-5 pb-2">
              <Progress value={progressPercent} className="h-1.5 mb-3" />
            </div>

            <div className="px-5 pb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                  <HandHeart className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Step {currentStep + 1} of {TOUR_STEPS.length}</p>
                  <h3 className="font-bold text-base leading-tight mb-1" data-testid="tour-title">{step?.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="tour-description">{step?.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={prevStep} disabled={currentStep === 0} className="h-9 w-9" data-testid="button-prev-step">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isPlaying ? "secondary" : "default"}
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="h-9 w-9"
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={nextStep} disabled={currentStep === TOUR_STEPS.length - 1} className="h-9 w-9" data-testid="button-next-step">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isPlaying ? "Auto-playing" : "Manual"}</span>
                  <Button variant="outline" size="sm" onClick={() => navigate("/organisations")} data-testid="button-exit-demo">
                    Exit Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightWrapper({ id, activeId, children }: { id: string; activeId?: string; children: React.ReactNode }) {
  const isHighlighted = id === activeId;
  return (
    <div className={`transition-all duration-500 rounded-xl ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-[1.01]" : ""}`}>
      {children}
    </div>
  );
}

function DemoHomeTab({ highlight }: { highlight?: string }) {
  return (
    <div className="space-y-6">
      <HighlightWrapper id="signals-panel" activeId={highlight}>
        <Card className="border-2 border-red-400 shadow-lg animate-in fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
              <Siren className="h-5 w-5 animate-pulse" />
              Active Support Signals (2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEMO_SIGNALS.map((signal) => {
                const config = SIGNAL_LABELS[signal.level] || SIGNAL_LABELS.need_support;
                return (
                  <div key={signal.id} className={`p-3 rounded-lg border ${config.color}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={signal.level === "urgent_help" ? "destructive" : "secondary"} className="text-xs">
                            {config.label}
                          </Badge>
                          {signal.escalationLevel > 0 && (
                            <Badge variant="outline" className="text-xs border-red-300">Escalation {signal.escalationLevel}</Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm">{signal.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {signal.referenceCode} · {formatTime(signal.createdAt)}
                          {signal.preferStaffVisit && " · Prefers staff visit"}
                          {signal.requestLaterCheckin && " · Requests later check-in"}
                        </p>
                        {signal.notes && <p className="text-xs mt-1 italic">"{signal.notes}"</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="default">Responding</Button>
                        <Button size="sm" variant="outline">Resolve</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </HighlightWrapper>

      <HighlightWrapper id="stats-panel" activeId={highlight}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Zap} label="Today" value={DEMO_DASHBOARD.stats.todayInteractions} color="text-blue-600" />
          <StatCard icon={Activity} label="This Week" value={DEMO_DASHBOARD.stats.weekInteractions} color="text-green-600" />
          <StatCard icon={AlertTriangle} label="Open Concerns" value={DEMO_DASHBOARD.stats.openConcerns} color="text-red-600" />
          <StatCard icon={Users} label="Total Residents" value={DEMO_DASHBOARD.stats.totalClients} color="text-purple-600" />
        </div>
      </HighlightWrapper>

      <HighlightWrapper id="needs-contact-panel" activeId={highlight}>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertOctagon className="h-4 w-4" />
              Needs Contact (No interaction in 7+ days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEMO_DASHBOARD.needsContact.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">{client.clientName}</span>
                  </div>
                  <Button size="sm" variant="outline">
                    <Zap className="h-3 w-3 mr-1" /> Log
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </HighlightWrapper>

      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
            <Clock className="h-4 w-4" />
            Overdue Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DEMO_DASHBOARD.overdueFollowups.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div>
                  <span className="text-sm font-medium">{f.clientName}</span>
                  <span className="text-xs text-muted-foreground ml-2">Due: {f.followUpDate}</span>
                </div>
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DEMO_DASHBOARD.recentActivity.map((a) => {
              const config = CATEGORY_CONFIG[a.category];
              const Icon = config?.icon || CircleDot;
              return (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config?.color || "bg-gray-100"}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{config?.label || a.category}</span>
                      <span className="text-xs text-muted-foreground ml-2">- {a.clientName}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(a.createdAt)} {a.staffName}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DemoResidentsTab({ highlight }: { highlight?: string }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or reference..." className="pl-10" readOnly />
      </div>

      <HighlightWrapper id="residents-list" activeId={highlight}>
        <div className="space-y-2">
          {DEMO_RESIDENTS.map((client) => (
            <Card key={client.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`h-3 w-3 rounded-full flex-shrink-0 ${STATUS_COLORS[client.engagementStatus]}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{client.clientName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{client.referenceCode}</span>
                        <span>·</span>
                        <span>{timeAgo(client.lastContact)}</span>
                        {client.openConcerns > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">{client.openConcerns} concern</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost"><Zap className="h-4 w-4" /></Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </HighlightWrapper>
    </div>
  );
}

function DemoQuickLogTab({ selectedResident, highlight, selectedCategory, onSelectCategory }: { selectedResident: boolean; highlight?: string; selectedCategory: string | null; onSelectCategory: (c: string | null) => void }) {
  if (!selectedResident) {
    return (
      <div className="space-y-4">
        <HighlightWrapper id="quicklog-panel" activeId={highlight}>
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-semibold text-sm">Quick Interaction Log</p>
              <p className="text-xs text-muted-foreground">Select a resident to begin logging</p>
            </CardContent>
          </Card>
        </HighlightWrapper>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search resident..." className="pl-10" readOnly />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEMO_RESIDENTS.slice(0, 4).map((client) => (
            <Card key={client.id} className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[client.engagementStatus]}`} />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{client.clientName}</p>
                  <p className="text-xs text-muted-foreground">{client.referenceCode} · {timeAgo(client.lastContact)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const resident = DEMO_RESIDENTS[0];

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">{resident.clientName}</p>
              <p className="text-xs text-muted-foreground">{resident.referenceCode}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm"><X className="h-4 w-4 mr-1" /> Change</Button>
        </CardContent>
      </Card>

      {!selectedCategory ? (
        <HighlightWrapper id="categories-grid" activeId={highlight}>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Tap to log interaction:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    className={`p-3 rounded-xl border-2 border-transparent hover:border-primary/30 transition-all text-left ${config.color}`}
                    onClick={() => onSelectCategory(key)}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <p className="text-sm font-medium">{config.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </HighlightWrapper>
      ) : (
        <div className="space-y-4">
          <Card className={`${CATEGORY_CONFIG[selectedCategory]?.color || ""}`}>
            <CardContent className="p-3 flex items-center justify-between">
              {(() => {
                const config = CATEGORY_CONFIG[selectedCategory];
                const Icon = config?.icon || CircleDot;
                return (
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold text-sm">{config?.label}</span>
                  </div>
                );
              })()}
              <Button variant="ghost" size="sm" onClick={() => onSelectCategory(null)}>Change</Button>
            </CardContent>
          </Card>
          <Textarea placeholder="Notes (optional) — add context if needed" className="min-h-[80px]" readOnly />
          <Button className="w-full h-12 text-base font-semibold">
            <CheckCircle className="h-5 w-5 mr-2" />
            Log Interaction
          </Button>
        </div>
      )}
    </div>
  );
}

function DemoTimelineTab({ highlight }: { highlight?: string }) {
  const grouped: Record<string, typeof DEMO_TIMELINE> = {};
  DEMO_TIMELINE.forEach(item => {
    const key = formatDate(item.timestamp);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const typeConfig: Record<string, { label: string; icon: any; bgColor: string }> = {
    quick_log: { label: "Quick Log", icon: Zap, bgColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    data_capture: { label: "Data Capture", icon: ClipboardList, bgColor: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
    safeguarding: { label: "Safeguarding", icon: Shield, bgColor: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
    kiosk_checkin: { label: "Kiosk Check-in", icon: CheckCircle, bgColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
    support_signal: { label: "Support Signal", icon: Heart, bgColor: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-semibold">Sarah Johnson</p>
            <p className="text-xs text-muted-foreground">SJ-2024-001</p>
          </div>
        </div>
        <Button size="sm"><Zap className="h-4 w-4 mr-1" /> Log</Button>
      </div>

      <HighlightWrapper id="timeline-panel" activeId={highlight}>
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">{dateLabel}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const config = typeConfig[item.type] || typeConfig.quick_log;
                  const Icon = config.icon;
                  const categoryConfig = item.type === "quick_log" ? CATEGORY_CONFIG[item.category!] : null;
                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${config.bgColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                {item.type === "quick_log" ? (categoryConfig?.label || item.category) :
                                 item.type === "data_capture" ? `${item.category} (${(item as any).riskTier || "N/A"} risk)` :
                                 item.type === "safeguarding" ? `${item.category} — ${(item as any).status}` :
                                 item.type === "support_signal" ? `Support Signal: ${item.category === "urgent_help" ? "Urgent Help" : item.category === "need_support" ? "Needs Support" : "I'm OK"}${(item as any).respondedByName ? ` — responded by ${(item as any).respondedByName}` : ""}` :
                                 "Kiosk Check-in"}
                              </span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(item.timestamp)}</span>
                            </div>
                            {item.notes && <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                            {item.staffName && <p className="text-xs text-muted-foreground mt-1">by {item.staffName}</p>}
                            {(item as any).followUpRequired && (
                              <Badge variant="outline" className="text-xs mt-1 border-amber-300 text-amber-700">Follow-up required</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </HighlightWrapper>
    </div>
  );
}

function DemoManagerTab({ highlight }: { highlight?: string }) {
  const categoryLabels: Record<string, string> = {
    wellbeing_check: "Wellbeing Check",
    support_conversation: "Support Conversation",
    safeguarding_concern: "Safeguarding Concern",
    medication: "Medication",
    move_on_planning: "Move-on Planning",
    housing_support: "Housing Support",
    general_contact: "General Contact",
    key_worker_session: "Key Worker Session",
    crisis_intervention: "Crisis Intervention",
    group_activity: "Group Activity",
  };
  const maxCategory = Math.max(...DEMO_MANAGER.categoryBreakdown.map(c => c.count), 1);

  return (
    <HighlightWrapper id="manager-panel" activeId={highlight}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Manager Dashboard</h2>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weekly Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-primary">{DEMO_MANAGER.engagementRate.rate}%</div>
              <div className="text-xs text-muted-foreground">
                <p>{DEMO_MANAGER.engagementRate.contacted} of {DEMO_MANAGER.engagementRate.total} residents contacted this week</p>
              </div>
            </div>
            <Progress value={DEMO_MANAGER.engagementRate.rate} className="mt-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Interaction Categories (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DEMO_MANAGER.categoryBreakdown.map(cat => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <span className="text-xs w-32 truncate">{categoryLabels[cat.category] || cat.category}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(cat.count / maxCategory) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{cat.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Staff Activity (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DEMO_MANAGER.staffActivity.map(staff => (
                  <div key={staff.staffName} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{staff.staffName}</p>
                      <p className="text-xs text-muted-foreground">Last active: {timeAgo(staff.lastActive)}</p>
                    </div>
                    <Badge variant="secondary">{staff.count} logs</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Distribution (Data Capture, 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {DEMO_MANAGER.riskDistribution.map(r => (
                <div key={r.riskTier} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${r.riskTier === "high" ? "bg-red-500" : r.riskTier === "medium" ? "bg-amber-500" : "bg-green-500"}`} />
                  <span className="text-sm capitalize">{r.riskTier}: {r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </HighlightWrapper>
  );
}

function DemoSignalTab({ highlight }: { highlight?: string }) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const signalOptions = [
    { level: "im_ok", label: "I'm OK", description: "Let your support team know you're doing well", icon: CheckCircle, color: "bg-green-500 hover:bg-green-600 text-white", activeColor: "bg-green-500 ring-4 ring-green-200 dark:ring-green-800" },
    { level: "need_support", label: "Need Support", description: "Request a check-in from your support worker", icon: HandHeart, color: "bg-amber-500 hover:bg-amber-600 text-white", activeColor: "bg-amber-500 ring-4 ring-amber-200 dark:ring-amber-800" },
    { level: "urgent_help", label: "Urgent Help", description: "Get immediate attention from available staff", icon: AlertTriangle, color: "bg-red-500 hover:bg-red-600 text-white", activeColor: "bg-red-500 ring-4 ring-red-200 dark:ring-red-800" },
  ];

  return (
    <HighlightWrapper id="signal-panel" activeId={highlight}>
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold">How are you doing?</h2>
          <p className="text-xs text-muted-foreground">You're in control — signal when you want to</p>
        </div>

        <div className="space-y-3">
          {signalOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedLevel === option.level;
            return (
              <button
                key={option.level}
                className={`w-full p-5 rounded-2xl text-left transition-all ${
                  isSelected ? `${option.activeColor} text-white` : option.color
                }`}
                onClick={() => setSelectedLevel(option.level)}
              >
                <div className="flex items-center gap-4">
                  <Icon className="h-8 w-8 flex-shrink-0" />
                  <div>
                    <p className="text-xl font-bold">{option.label}</p>
                    <p className="text-sm opacity-90">{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedLevel && selectedLevel !== "im_ok" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-4 w-4 border-2 rounded" />
              <span className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Prefer to speak to staff</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-4 w-4 border-2 rounded" />
              <span className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Request check-in later</span>
            </div>
            <Textarea placeholder="Add a note (optional)" className="min-h-[60px]" readOnly />
          </div>
        )}

        {selectedLevel && (
          <Button
            className={`w-full h-14 text-lg font-bold ${
              selectedLevel === "urgent_help" ? "bg-red-600 hover:bg-red-700" :
              selectedLevel === "need_support" ? "bg-amber-600 hover:bg-amber-700" :
              "bg-green-600 hover:bg-green-700"
            }`}
          >
            {selectedLevel === "im_ok" ? "Send I'm OK" : "Send Signal"}
          </Button>
        )}

        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This is not an emergency service. If you are in immediate danger, please contact emergency services by dialling 999.
            </p>
          </div>
        </div>
      </div>
    </HighlightWrapper>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
