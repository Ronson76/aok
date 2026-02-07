import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, X, Users, UserPlus, Radio, Shield, FileText,
  Building2, ChevronRight, ArrowLeft, CheckCircle,
  Clock, AlertTriangle, Settings, Eye, Bell, Phone,
  HelpCircle
} from "lucide-react";

interface HelpTopic {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string[];
  relatedTopics?: string[];
}

const HELP_CATEGORIES = [
  { id: "clients", label: "Clients", icon: Users, color: "text-blue-600" },
  { id: "staff", label: "Staff", icon: UserPlus, color: "text-green-600" },
  { id: "lone-worker", label: "Lone Worker", icon: Radio, color: "text-orange-600" },
  { id: "safeguarding", label: "Safeguarding", icon: Shield, color: "text-red-600" },
  { id: "reports", label: "Reports", icon: FileText, color: "text-muted-foreground" },
  { id: "account", label: "Account & Settings", icon: Settings, color: "text-indigo-600" },
];

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "add-client",
    title: "Adding a new client",
    category: "clients",
    keywords: ["add", "new", "client", "create", "register", "enrol", "enroll", "invite"],
    content: [
      "From your organisation dashboard, tap the **Add Client** button.",
      "Enter the client's email address and optionally give them a nickname for easy identification.",
      "Select which bundle to assign them to — each bundle has a set number of seats.",
      "The client will receive an SMS with a login link and unique reference number.",
      "Clients log in using their reference number — no complex email/password needed.",
    ],
  },
  {
    id: "monitor-status",
    title: "Monitoring client check-in status",
    category: "clients",
    keywords: ["monitor", "status", "check-in", "checkin", "safe", "pending", "overdue", "dashboard", "view"],
    content: [
      "Your dashboard shows each client's check-in status at a glance:",
      "**Safe** (green) — the client checked in on time.",
      "**Pending** (yellow) — check-in is due soon but not yet overdue.",
      "**Overdue** (red) — the client missed their check-in window.",
      "Click on any client to see their full details, emergency contacts, and check-in history.",
    ],
  },
  {
    id: "client-features",
    title: "Enabling or disabling client features",
    category: "clients",
    keywords: ["feature", "toggle", "enable", "disable", "wellbeing", "ai", "shake", "mood", "pet", "will", "control"],
    content: [
      "You can customise which features each client has access to:",
      "**Wellbeing AI** — AI chat companion for emotional support.",
      "**Shake to SOS** — shake the phone to trigger an emergency alert.",
      "**Mood Tracking** — daily mood logging and pattern tracking.",
      "**Pet Protection** — store pet care details for emergencies.",
      "**Digital Will** — secure document storage.",
      "Toggle these on or off from the client's detail view on your dashboard.",
    ],
  },
  {
    id: "edit-client",
    title: "Editing a client's details",
    category: "clients",
    keywords: ["edit", "update", "change", "nickname", "name", "phone", "modify", "client details"],
    content: [
      "Click on the client card on your dashboard, then tap the **Edit** button.",
      "You can update their nickname, name, and phone number.",
      "Changes take effect immediately — the client doesn't need to do anything.",
    ],
  },
  {
    id: "client-schedule",
    title: "Changing a client's check-in schedule",
    category: "clients",
    keywords: ["schedule", "interval", "frequency", "time", "hours", "check-in", "change schedule"],
    content: [
      "Open the client's details from your dashboard.",
      "Tap the **Schedule** or **Edit Schedule** option.",
      "Set the start time (when their daily schedule begins) and the interval (1 to 48 hours).",
      "For example: start at 10:00, every 24 hours means they check in once daily at 10am.",
      "The new schedule takes effect from the next check-in cycle.",
    ],
  },
  {
    id: "pause-client",
    title: "Pausing or resuming a client",
    category: "clients",
    keywords: ["pause", "resume", "stop", "start", "monitoring", "suspend", "deactivate", "activate"],
    content: [
      "You can temporarily pause monitoring for a client — for example, if they're on holiday or in hospital.",
      "While paused, no check-ins are expected and no alerts will be triggered.",
      "From the client's detail view, tap **Pause** to pause or **Resume** to restart monitoring.",
      "All their settings and contacts are preserved while paused.",
    ],
  },
  {
    id: "emergency-contacts-client",
    title: "Managing a client's emergency contacts",
    category: "clients",
    keywords: ["emergency", "contact", "contacts", "add contact", "client contact", "notification"],
    content: [
      "You can view and manage emergency contacts for any client from their detail view.",
      "Tap the **Emergency Contacts** button to see their current contacts.",
      "Each contact must confirm they're willing to be an emergency contact via email before they receive alerts.",
      "Contacts can be mobile (SMS + email alerts) or landline (voice call + email alerts).",
    ],
  },
  {
    id: "client-archive",
    title: "Archiving and restoring clients",
    category: "clients",
    keywords: ["archive", "remove", "delete", "restore", "soft delete", "archived"],
    content: [
      "When you remove a client, they are **archived** rather than permanently deleted.",
      "This preserves their data and history for your records.",
      "Archived clients appear in the **Archived** tab on your dashboard.",
      "You can restore an archived client at any time using the **Restore** button — they'll be brought back with their original settings.",
    ],
  },
  {
    id: "send-ref-reminder",
    title: "Sending a reference number reminder",
    category: "clients",
    keywords: ["reference", "number", "reminder", "sms", "forgot", "login", "ref"],
    content: [
      "If a client has forgotten their reference number, you can resend it to them.",
      "From the client's detail view, tap the **Send Ref Reminder** option.",
      "They'll receive an SMS with their reference number and a direct login link.",
    ],
  },
  {
    id: "invite-staff",
    title: "Inviting staff members",
    category: "staff",
    keywords: ["invite", "staff", "new", "add", "lone worker", "register", "sms"],
    content: [
      "Go to the **Staff Hub** (or **Lone Worker Hub**) from your dashboard navigation.",
      "Tap the **Invite Staff** button.",
      "Enter the staff member's name and phone number.",
      "They'll receive an SMS with a unique invite link to create their account.",
      "Staff registration is free — their seat is covered by your organisation's bundle.",
      "You can track, resend, or revoke invitations at any time.",
    ],
  },
  {
    id: "team-roles",
    title: "Team roles and permissions",
    category: "staff",
    keywords: ["role", "roles", "permission", "permissions", "owner", "manager", "staff", "viewer", "team", "access"],
    content: [
      "Your organisation has four team roles, each with different levels of access:",
      "**Owner** — full control over everything, including billing, bundles, and team management.",
      "**Manager** — can manage clients, staff, view reports, and access safeguarding.",
      "**Staff** — can view clients and use lone worker features for their own sessions.",
      "**Viewer** — read-only access to dashboards and reports.",
      "Invite team members from the **Team** page and assign them the appropriate role.",
    ],
  },
  {
    id: "team-invite",
    title: "Inviting team members",
    category: "staff",
    keywords: ["team", "invite", "member", "join", "code", "link"],
    content: [
      "Go to the **Team** page from your dashboard navigation.",
      "Tap **Invite Team Member** and enter their details.",
      "They'll receive an invite code and link to join your organisation.",
      "Once they join, they'll have access based on the role you assign them.",
    ],
  },
  {
    id: "lone-worker-overview",
    title: "How lone worker sessions work",
    category: "lone-worker",
    keywords: ["lone worker", "session", "how", "overview", "what", "explain", "about"],
    content: [
      "The Lone Worker System protects staff who work alone — during home visits, inspections, patrols, and other solo activities.",
      "A staff member starts a session before heading out, setting their expected duration and check-in interval.",
      "During the session, they must check in at regular intervals.",
      "If they don't check in, the system escalates through phases:",
      "**Active** — session is running, all check-ins on time.",
      "**Check-in Due** — a check-in is expected soon.",
      "**Unresponsive** — check-in was missed, no response.",
      "**Panic** — the worker manually triggered a panic alert.",
      "Managers can monitor all active sessions in real time from the **Live Monitor**.",
    ],
  },
  {
    id: "lone-worker-monitor",
    title: "Using the live monitor",
    category: "lone-worker",
    keywords: ["monitor", "live", "real time", "watch", "active sessions", "view", "track"],
    content: [
      "The **Live Monitor** tab in the Lone Worker Hub shows all currently active sessions.",
      "Sessions are colour-coded by status — panic alerts appear at the top with a red border.",
      "For each session, you can see:",
      "The worker's name, job type, and current location.",
      "Their last check-in time and next expected check-in.",
      "Their phone number for direct contact.",
      "The monitor refreshes automatically so you always see the latest status.",
    ],
  },
  {
    id: "lone-worker-audit",
    title: "Viewing the audit trail",
    category: "lone-worker",
    keywords: ["audit", "trail", "log", "history", "record", "activity", "compliance"],
    content: [
      "Every action in the lone worker system is automatically logged in the **Audit Trail** tab.",
      "Records are grouped by person — tap a name to expand and see their full activity history.",
      "The audit trail includes:",
      "Session starts and completions.",
      "Each check-in with timestamp.",
      "Panic alerts and resolutions.",
      "Invitation sends, accepts, and revocations.",
      "You can filter by **All**, **Sessions**, or **Invites** to narrow down what you're looking for.",
      "This is essential for compliance and incident review.",
    ],
  },
  {
    id: "lone-worker-history",
    title: "Reviewing session history",
    category: "lone-worker",
    keywords: ["history", "past", "previous", "completed", "sessions", "review"],
    content: [
      "The **History** section in the Lone Worker Hub shows all completed sessions.",
      "Sessions are grouped by worker name so you can easily review each person's activity.",
      "Tap a worker's name to expand and see all their past sessions with details including:",
      "Job type, start and end times, duration.",
      "Number of check-ins completed during the session.",
      "Whether any panic alerts were triggered.",
    ],
  },
  {
    id: "safeguarding-incidents",
    title: "Reporting safeguarding incidents",
    category: "safeguarding",
    keywords: ["incident", "report", "log", "safety", "concern", "abuse", "neglect", "harm"],
    content: [
      "The **Safeguarding Hub** lets you log safety and safeguarding incidents.",
      "When reporting an incident, you can specify:",
      "**Type** — abuse, neglect, self-harm risk, medical issue, harassment, lone worker danger, or missing person concern.",
      "**Severity** — how serious the incident is.",
      "**Location** — precise location using what3words for accurate positioning.",
      "You can also log welfare concerns from third parties, with the option to report anonymously.",
    ],
  },
  {
    id: "safeguarding-cases",
    title: "Case files and risk levels",
    category: "safeguarding",
    keywords: ["case", "file", "risk", "level", "red", "amber", "green", "rag", "notes", "status"],
    content: [
      "Each client has a safeguarding case file where you can track their overall risk status.",
      "Risk levels use a RAG (Red, Amber, Green) system:",
      "**Red** — immediate concern, high risk.",
      "**Amber** — some concern, needs monitoring.",
      "**Green** — no current concerns.",
      "You can add case notes, update the risk level, and review the full incident history.",
      "All safeguarding actions are fully audited for compliance and regulatory requirements.",
    ],
  },
  {
    id: "safeguarding-escalation",
    title: "Automatic escalation rules",
    category: "safeguarding",
    keywords: ["escalation", "automatic", "trigger", "rule", "alert", "missed", "sos", "threshold"],
    content: [
      "You can set up automated escalation rules that trigger when certain thresholds are met.",
      "For example, escalation can be triggered by:",
      "A certain number of missed check-ins.",
      "SOS or emergency alerts being triggered.",
      "A specified number of logged incidents.",
      "When an escalation triggers, the system automatically creates a risk report for review.",
    ],
  },
  {
    id: "reports-overview",
    title: "Available reports",
    category: "reports",
    keywords: ["report", "reports", "overview", "available", "what", "types", "list"],
    content: [
      "Your organisation dashboard includes several report types:",
      "**Missed Check-ins Report** — see which clients missed their check-ins, when, and how often.",
      "**Emergency Alerts Report** — review all emergency alerts triggered by your clients, including location data.",
      "Reports can be filtered by date range and exported as PDF for your records and compliance requirements.",
    ],
  },
  {
    id: "report-export",
    title: "Exporting reports as PDF",
    category: "reports",
    keywords: ["export", "pdf", "download", "print", "save", "compliance", "record"],
    content: [
      "All reports can be exported as PDF documents.",
      "Open the report you need, set your desired date range and filters.",
      "Tap the **Export PDF** button to generate and download the report.",
      "PDFs are formatted for professional presentation and are suitable for compliance records, management reviews, and audit submissions.",
    ],
  },
  {
    id: "bundles-seats",
    title: "Understanding bundles and seats",
    category: "account",
    keywords: ["bundle", "bundles", "seat", "seats", "capacity", "usage", "how many", "limit"],
    content: [
      "Your organisation purchases **bundles** of seats from the aok team.",
      "Each seat allows one client or staff member to use the platform at no cost to them.",
      "You can view your bundle usage on the dashboard — how many seats are used vs. available.",
      "If you need more seats, contact the aok team to add more bundles to your organisation.",
    ],
  },
  {
    id: "org-login-options",
    title: "Login options for your organisation",
    category: "account",
    keywords: ["login", "sign in", "access", "portal", "client login", "staff login", "team login"],
    content: [
      "The organisation portal has three login options:",
      "**I'm a Client** — for people being looked after by your organisation. They log in with their unique reference number.",
      "**I'm from an Organisation** — for managers and owners. Log in with email and password.",
      "**I'm a Team Member** — for invited team members who help manage the organisation.",
    ],
  },
  {
    id: "change-password",
    title: "Changing your password",
    category: "account",
    keywords: ["password", "change", "reset", "forgot", "security", "update"],
    content: [
      "You can change your password from the **Settings** or **Account** section of your dashboard.",
      "Passwords must be at least 8 characters — special characters are allowed.",
      "If you've forgotten your password, use the **Forgot Password** link on the login page to receive a reset email.",
    ],
  },
  {
    id: "emergency-deactivate",
    title: "Deactivating a client emergency alert",
    category: "clients",
    keywords: ["deactivate", "emergency", "alert", "cancel", "stop", "alarm", "active emergency"],
    content: [
      "If a client has triggered an emergency alert and the situation has been resolved, you can deactivate it.",
      "Clients with active emergencies show a flashing red alert icon on the dashboard.",
      "Open the client's details and tap **Deactivate Emergency** to stop the alert.",
      "This will be logged in the audit trail for your records.",
    ],
  },
];

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

function renderMarkdown(text: string, query: string): JSX.Element {
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

  const combined = parts.map((p, i) =>
    typeof p === "string" ? <span key={`t${i}`}>{highlightMatch(p, query)}</span> : p
  );

  return <>{combined}</>;
}

export function OrgHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-indigo-600 border-indigo-700 text-white"
        data-testid="button-org-help"
      >
        <Search className="w-5 h-5" />
      </Button>
      <OrgHelpDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function OrgHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedCategory(null);
      setSelectedTopic(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredTopics = useMemo(() => {
    let topics = HELP_TOPICS;

    if (selectedCategory) {
      topics = topics.filter((t) => t.category === selectedCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      const words = q.split(/\s+/);
      topics = topics.filter((t) => {
        const searchable = `${t.title} ${t.keywords.join(" ")} ${t.content.join(" ")} ${t.category}`.toLowerCase();
        return words.every((word) => searchable.includes(word));
      });
    }

    return topics;
  }, [query, selectedCategory]);

  const getCategoryIcon = (catId: string) => {
    const cat = HELP_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return null;
    const Icon = cat.icon;
    return <Icon className={`w-4 h-4 ${cat.color}`} />;
  };

  const getCategoryLabel = (catId: string) => {
    return HELP_CATEGORIES.find((c) => c.id === catId)?.label || catId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {selectedTopic ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTopic(null)}
                data-testid="button-help-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            )}
            {selectedTopic ? selectedTopic.title : "Help Centre"}
          </DialogTitle>
        </DialogHeader>

        {!selectedTopic && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search for help... e.g. 'add client' or 'audit trail'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
                data-testid="input-help-search"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery("")}
                  data-testid="button-help-clear"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {!selectedTopic && !query.trim() && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {selectedCategory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                data-testid="button-help-all-categories"
              >
                <X className="w-3 h-3 mr-1" /> All Topics
              </Button>
            )}
            {HELP_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  data-testid={`button-help-cat-${cat.id}`}
                >
                  <Icon className="w-3 h-3 mr-1" /> {cat.label}
                </Button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {selectedTopic ? (
            <div className="space-y-3">
              <Badge variant="secondary" className="mb-2" data-testid="badge-help-category">
                {getCategoryIcon(selectedTopic.category)}
                <span className="ml-1">{getCategoryLabel(selectedTopic.category)}</span>
              </Badge>
              <div className="space-y-2">
                {selectedTopic.content.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {renderMarkdown(line, query)}
                  </p>
                ))}
              </div>
              {selectedTopic.relatedTopics && selectedTopic.relatedTopics.length > 0 && (
                <div className="pt-4 border-t mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Related topics</p>
                  <div className="space-y-1">
                    {selectedTopic.relatedTopics.map((relId) => {
                      const rel = HELP_TOPICS.find((t) => t.id === relId);
                      if (!rel) return null;
                      return (
                        <Button
                          key={relId}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => setSelectedTopic(rel)}
                          data-testid={`button-help-related-${relId}`}
                        >
                          <ChevronRight className="w-3 h-3 mr-2 shrink-0" />
                          <span className="text-sm">{rel.title}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse the categories above</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="w-full text-left rounded-md px-3 py-3 hover-elevate transition-colors flex items-center gap-3 group"
                  data-testid={`button-help-topic-${topic.id}`}
                >
                  {getCategoryIcon(topic.category)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {highlightMatch(topic.title, query)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCategoryLabel(topic.category)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
