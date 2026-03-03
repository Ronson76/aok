import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardList, AlertTriangle, Clock, Users, ArrowLeft,
  MapPin, CheckCircle, Shield, Plus, Loader2, Search,
  User, AlertOctagon
} from "lucide-react";
import type { HomelessInteraction, InteractionProgramme, InteractionContactType, RiskTier, RiskIndicator, InteractionAction } from "@shared/schema";

const PROGRAMME_LABELS: Record<InteractionProgramme, string> = {
  outreach: "Outreach",
  hostel: "Hostel",
  drop_in: "Drop-in",
};

const CONTACT_TYPE_LABELS: Record<InteractionContactType, string> = {
  outreach_visit: "Outreach Visit",
  shelter_checkin: "Shelter Check-in (Staff Confirmed)",
  drop_in_meeting: "Drop-in Meeting",
  phone_contact: "Phone Contact",
  multi_agency_discussion: "Multi-Agency Discussion",
};

const RISK_TIER_LABELS: Record<RiskTier, { label: string; color: string }> = {
  high: { label: "High", color: "bg-red-500 text-white" },
  medium: { label: "Medium", color: "bg-amber-500 text-white" },
  low: { label: "Low", color: "bg-green-600 text-white" },
};

const RISK_INDICATOR_LABELS: Record<RiskIndicator, string> = {
  rough_sleeping: "Rough Sleeping",
  exploitation_risk: "Exploitation Risk",
  domestic_abuse: "Domestic Abuse",
  substance_misuse: "Substance Misuse",
  mental_health: "Mental Health Concern",
  violence_risk: "Violence Risk",
  self_harm: "Self-Harm Concern",
  missing_contact: "Missing Contact Pattern",
};

const ACTION_LABELS: Record<InteractionAction, string> = {
  advice_provided: "Advice Provided",
  referral_made: "Referral Made",
  emergency_accommodation: "Emergency Accommodation Arranged",
  dsl_informed: "DSL Informed",
  safeguarding_referral: "Safeguarding Referral Submitted",
  no_action_required: "No Action Required",
  follow_up_planned: "Follow-up Planned",
};

type Tab = "log" | "recent" | "overdue" | "lost";

interface ClientOption {
  id: string;
  clientName: string | null;
  referenceCode: string | null;
  seatType: string;
  dateOfBirth: string | null;
}

interface InteractionWithClient {
  interaction: HomelessInteraction;
  clientName: string | null;
  referenceCode: string | null;
}

interface LostContact {
  id: string;
  clientName: string | null;
  referenceCode: string | null;
  lastRiskTier: string | null;
  lastContactAt: string | null;
  daysSinceContact: number | null;
  expectedFrequencyDays: number | null;
}

interface Stats {
  totalInteractions: number;
  escalations: number;
  overdueFollowUps: number;
  highRiskInteractions: number;
}

interface LookupResult {
  found: boolean;
  isNew: boolean;
  client: ClientOption;
  profile: { dateOfBirth: string } | null;
  recentInteractions: any[];
}

export default function DataCapturePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpInteractionId, setFollowUpInteractionId] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");

  const [lookupName, setLookupName] = useState("");
  const [lookupDob, setLookupDob] = useState("");
  const [resolvedClient, setResolvedClient] = useState<LookupResult | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [staffName, setStaffName] = useState("");
  const [programme, setProgramme] = useState<InteractionProgramme | "">("");
  const [contactType, setContactType] = useState<InteractionContactType | "">("");
  const [riskTier, setRiskTier] = useState<RiskTier | "">("");
  const [selectedIndicators, setSelectedIndicators] = useState<RiskIndicator[]>([]);
  const [actionTaken, setActionTaken] = useState<InteractionAction | "">("");
  const [referralAgency, setReferralAgency] = useState("");
  const [noActionRationale, setNoActionRationale] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpStaffName, setFollowUpStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{ lat: string; lng: string } | null>(null);

  const { data: clientsData } = useQuery<{ clients: ClientOption[] }>({
    queryKey: ["/api/org/interactions/clients-list"],
    refetchInterval: 5000,
  });

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["/api/org/interactions/stats"],
    refetchInterval: 5000,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery<{ interactions: InteractionWithClient[] }>({
    queryKey: ["/api/org/interactions"],
    refetchInterval: 5000,
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery<{ overdue: InteractionWithClient[] }>({
    queryKey: ["/api/org/interactions/overdue-followups"],
    refetchInterval: 5000,
  });

  const { data: lostData, isLoading: lostLoading } = useQuery<{ lostContacts: LostContact[] }>({
    queryKey: ["/api/org/interactions/lost-contacts"],
    refetchInterval: 5000,
  });

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/org/interactions/lookup-or-create", {
        clientName: lookupName.trim(),
        dateOfBirth: lookupDob,
      });
      return response.json() as Promise<LookupResult>;
    },
    onSuccess: (data) => {
      setResolvedClient(data);
      setSelectedClient(data.client.id);
      if (data.isNew) {
        toast({ title: "New Client Registered", description: `${data.client.clientName} added to your organisation (ref: ${data.client.referenceCode})` });
        queryClient.invalidateQueries({ queryKey: ["/api/org/interactions/clients-list"] });
        queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      } else {
        toast({ title: "Client Found", description: `${data.client.clientName} - ${data.client.referenceCode}` });
        if (data.recentInteractions.length > 0) {
          const last = data.recentInteractions[0];
          setRiskTier(last.riskTier);
          if (last.riskIndicators?.length) {
            setSelectedIndicators(last.riskIndicators);
          }
        }
      }
    },
    onError: (error: any) => {
      toast({ title: "Lookup Failed", description: error.message || "Could not find or create client", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/org/interactions", {
        orgClientId: selectedClient,
        staffName,
        programme,
        contactType,
        riskTier,
        riskIndicators: selectedIndicators,
        actionTaken,
        referralAgency: actionTaken === "referral_made" ? referralAgency : undefined,
        noActionRationale: riskTier === "high" && actionTaken === "no_action_required" ? noActionRationale : undefined,
        followUpRequired,
        followUpDate: followUpRequired ? followUpDate : undefined,
        followUpStaffName: followUpRequired ? (followUpStaffName || staffName) : undefined,
        latitude: gpsLocation?.lat,
        longitude: gpsLocation?.lng,
        notes: notes || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Interaction Logged", description: "Record saved to audit trail" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/org/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/interactions/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/interactions/overdue-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/interactions/lost-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to log interaction", variant: "destructive" });
    },
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/org/interactions/${followUpInteractionId}/complete-followup`, {
        notes: followUpNotes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Follow-up Completed", description: "Follow-up marked as done" });
      setShowFollowUpDialog(false);
      setFollowUpInteractionId(null);
      setFollowUpNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/org/interactions/overdue-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/interactions/stats"] });
    },
  });

  const resetForm = () => {
    setLookupName("");
    setLookupDob("");
    setResolvedClient(null);
    setSelectedClient("");
    setProgramme("");
    setContactType("");
    setRiskTier("");
    setSelectedIndicators([]);
    setActionTaken("");
    setReferralAgency("");
    setNoActionRationale("");
    setFollowUpRequired(false);
    setFollowUpDate("");
    setFollowUpStaffName("");
    setNotes("");
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const toggleIndicator = (indicator: RiskIndicator) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator]
    );
  };

  const clientMatches = useCallback(() => {
    if (!lookupName.trim() || !clientsData?.clients) return [];
    const q = lookupName.trim().toLowerCase();
    return clientsData.clients.filter((c) =>
      c.clientName?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [lookupName, clientsData]);

  const canLookup = lookupName.trim().length >= 2 && lookupDob;
  const canSubmit =
    selectedClient && staffName && programme && contactType && riskTier && actionTaken &&
    !(actionTaken === "referral_made" && !referralAgency) &&
    !(riskTier === "high" && actionTaken === "no_action_required" && !noActionRationale) &&
    !(followUpRequired && !followUpDate);

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "log", label: "Log", icon: Plus },
    { key: "recent", label: "Recent", icon: ClipboardList },
    { key: "overdue", label: "Overdue", icon: AlertTriangle, badge: statsData?.overdueFollowUps },
    { key: "lost", label: "Lost Contact", icon: AlertOctagon },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="data-capture-page">
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/org/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-data-capture-title">
              <Shield className="h-5 w-5 text-primary" />
              Data Capture
            </h1>
            <p className="text-xs text-muted-foreground">
              Syncs with org dashboard every 5s
              {gpsLocation && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 inline" /> GPS locked
                </span>
              )}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs gap-1 animate-pulse" data-testid="badge-live">
          <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Live
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3">
        <Card className="col-span-1">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold" data-testid="stat-total">{statsData?.totalInteractions || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-red-500" data-testid="stat-escalations">{statsData?.escalations || 0}</p>
            <p className="text-[10px] text-muted-foreground">Escalations</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-amber-500" data-testid="stat-overdue">{statsData?.overdueFollowUps || 0}</p>
            <p className="text-[10px] text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-orange-500" data-testid="stat-high-risk">{statsData?.highRiskInteractions || 0}</p>
            <p className="text-[10px] text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex border-b px-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge ? (
              <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">{tab.badge}</Badge>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "log" && (
          <div className="space-y-4 max-w-lg mx-auto pb-20">
            {!resolvedClient ? (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-4">
                  <div className="text-center mb-2">
                    <User className="h-8 w-8 mx-auto mb-1 text-primary" />
                    <h2 className="text-base font-bold">Identify Individual</h2>
                    <p className="text-xs text-muted-foreground">Enter name and date of birth. If they exist in the system, their data will be pulled. If new, they will be registered automatically.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Full Name</Label>
                    <Input
                      placeholder="Enter full name"
                      value={lookupName}
                      onChange={(e) => setLookupName(e.target.value)}
                      data-testid="input-lookup-name"
                    />
                    {lookupName.trim().length >= 2 && !lookupDob && clientMatches().length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        {clientMatches().map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setLookupName(c.clientName || "");
                              if (c.dateOfBirth) setLookupDob(c.dateOfBirth);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between border-b last:border-b-0"
                            data-testid={`suggest-client-${c.id}`}
                          >
                            <span>{c.clientName}</span>
                            <span className="text-xs text-muted-foreground">{c.referenceCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Date of Birth</Label>
                    <Input
                      type="date"
                      value={lookupDob}
                      onChange={(e) => setLookupDob(e.target.value)}
                      data-testid="input-lookup-dob"
                    />
                  </div>

                  <Button
                    className="w-full py-5"
                    disabled={!canLookup || lookupMutation.isPending}
                    onClick={() => lookupMutation.mutate()}
                    data-testid="button-lookup"
                  >
                    {lookupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Find or Register
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className={resolvedClient.isNew ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-primary/30"}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm" data-testid="text-resolved-name">{resolvedClient.client.clientName}</p>
                        <p className="text-xs text-muted-foreground">Ref: {resolvedClient.client.referenceCode}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {resolvedClient.isNew && (
                          <Badge className="bg-green-600 text-white text-xs">New</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {resolvedClient.client.seatType === "safeguarding" ? "Safeguarding" : "Check-in"} Seat
                        </Badge>
                      </div>
                    </div>
                    {resolvedClient.recentInteractions.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Last interaction:</p>
                        <div className="text-xs text-muted-foreground">
                          <span className="mr-2">
                            Risk: <Badge className={`${RISK_TIER_LABELS[resolvedClient.recentInteractions[0].riskTier as RiskTier]?.color} text-[10px] py-0`}>
                              {RISK_TIER_LABELS[resolvedClient.recentInteractions[0].riskTier as RiskTier]?.label}
                            </Badge>
                          </span>
                          <span className="mr-2">{ACTION_LABELS[resolvedClient.recentInteractions[0].actionTaken as InteractionAction] || resolvedClient.recentInteractions[0].actionTaken}</span>
                          <span>{new Date(resolvedClient.recentInteractions[0].createdAt).toLocaleDateString("en-GB")}</span>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => { setResolvedClient(null); setSelectedClient(""); }}
                      data-testid="button-change-client"
                    >
                      Change individual
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Your Name (Staff)</Label>
                  <Input
                    placeholder="Enter your name"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    data-testid="input-staff-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Programme</Label>
                    <Select value={programme} onValueChange={(v) => setProgramme(v as InteractionProgramme)}>
                      <SelectTrigger data-testid="select-programme">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROGRAMME_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Contact Type</Label>
                    <Select value={contactType} onValueChange={(v) => setContactType(v as InteractionContactType)}>
                      <SelectTrigger data-testid="select-contact-type">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Risk Tier (Mandatory)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(RISK_TIER_LABELS) as [RiskTier, { label: string; color: string }][]).map(([key, { label, color }]) => (
                      <button
                        key={key}
                        onClick={() => setRiskTier(key)}
                        className={`py-3 rounded-lg text-sm font-bold transition-all border-2 ${
                          riskTier === key
                            ? `${color} border-transparent ring-2 ring-offset-2 ring-primary`
                            : "bg-muted text-muted-foreground border-transparent hover:border-border"
                        }`}
                        data-testid={`risk-tier-${key}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Risk Indicators</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(RISK_INDICATOR_LABELS) as [RiskIndicator, string][]).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                          selectedIndicators.includes(key)
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                        }`}
                        data-testid={`indicator-${key}`}
                      >
                        <Checkbox
                          checked={selectedIndicators.includes(key)}
                          onCheckedChange={() => toggleIndicator(key)}
                        />
                        <span className="text-xs">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Action Taken (Mandatory)</Label>
                  <Select value={actionTaken} onValueChange={(v) => setActionTaken(v as InteractionAction)}>
                    <SelectTrigger data-testid="select-action">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {actionTaken === "referral_made" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Referral Agency</Label>
                    <Input
                      placeholder="Name of agency referred to"
                      value={referralAgency}
                      onChange={(e) => setReferralAgency(e.target.value)}
                      data-testid="input-referral-agency"
                    />
                  </div>
                )}

                {riskTier === "high" && actionTaken === "no_action_required" && (
                  <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <Label className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Rationale Required - High Risk / No Action
                    </Label>
                    <Textarea
                      placeholder="Explain why no action was taken for this high-risk case"
                      value={noActionRationale}
                      onChange={(e) => setNoActionRationale(e.target.value)}
                      rows={3}
                      data-testid="input-no-action-rationale"
                    />
                  </div>
                )}

                {(actionTaken === "safeguarding_referral" || actionTaken === "dsl_informed") && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Escalation will be logged automatically</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={followUpRequired}
                      onCheckedChange={(v) => setFollowUpRequired(!!v)}
                      data-testid="checkbox-followup"
                    />
                    <Label className="text-sm font-semibold">Follow-up Required</Label>
                  </div>
                  {followUpRequired && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Review Date</Label>
                        <Input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          data-testid="input-followup-date"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Responsible Staff</Label>
                        <Input
                          placeholder="Staff name"
                          value={followUpStaffName}
                          onChange={(e) => setFollowUpStaffName(e.target.value)}
                          data-testid="input-followup-staff"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Notes (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes if necessary"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    data-testid="input-notes"
                  />
                </div>

                <Button
                  className="w-full py-6 text-base font-bold"
                  disabled={!canSubmit || submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                  data-testid="button-submit-interaction"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  Log Interaction
                </Button>

                <p className="text-[10px] text-center text-muted-foreground">
                  This record is tamper-evident. Once submitted, it cannot be deleted or silently edited.
                </p>
              </>
            )}
          </div>
        )}

        {activeTab === "recent" && (
          <div className="space-y-3 max-w-lg mx-auto">
            {recentLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentData?.interactions?.length ? (
              recentData.interactions.map(({ interaction, clientName, referenceCode }) => (
                <Card key={interaction.id} data-testid={`interaction-${interaction.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{clientName || "Unknown"}</p>
                        {referenceCode && <p className="text-xs text-muted-foreground">{referenceCode}</p>}
                      </div>
                      <Badge className={RISK_TIER_LABELS[interaction.riskTier as RiskTier]?.color || ""}>
                        {RISK_TIER_LABELS[interaction.riskTier as RiskTier]?.label || interaction.riskTier}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>{CONTACT_TYPE_LABELS[interaction.contactType as InteractionContactType] || interaction.contactType}</span>
                      <span>{PROGRAMME_LABELS[interaction.programme as InteractionProgramme] || interaction.programme}</span>
                      <span>{ACTION_LABELS[interaction.actionTaken as InteractionAction] || interaction.actionTaken}</span>
                      <span>{new Date(interaction.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {interaction.escalationTriggered && (
                      <Badge variant="destructive" className="mt-2 text-xs">Escalation Logged</Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Staff: {interaction.staffName}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No interactions logged yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "overdue" && (
          <div className="space-y-3 max-w-lg mx-auto">
            {overdueLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : overdueData?.overdue?.length ? (
              overdueData.overdue.map(({ interaction, clientName, referenceCode }) => (
                <Card key={interaction.id} className="border-amber-500/50" data-testid={`overdue-${interaction.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{clientName || "Unknown"}</p>
                        {referenceCode && <p className="text-xs text-muted-foreground">{referenceCode}</p>}
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Due {interaction.followUpDate}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Assigned to: {interaction.followUpStaffName || "Not assigned"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Original: {ACTION_LABELS[interaction.actionTaken as InteractionAction] || interaction.actionTaken} - {CONTACT_TYPE_LABELS[interaction.contactType as InteractionContactType] || interaction.contactType}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFollowUpInteractionId(interaction.id);
                        setFollowUpNotes("");
                        setShowFollowUpDialog(true);
                      }}
                      data-testid={`button-complete-followup-${interaction.id}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
                <p className="text-sm">No overdue follow-ups</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "lost" && (
          <div className="space-y-3 max-w-lg mx-auto">
            <div className="p-3 bg-muted/50 rounded-lg mb-4">
              <p className="text-xs text-muted-foreground">
                Lost contacts are flagged when no interaction has been logged within the expected timeframe based on risk tier.
                High risk: 2 days. Medium: 7 days. Low: 14 days.
              </p>
            </div>
            {lostLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lostData?.lostContacts?.length ? (
              lostData.lostContacts.map((contact) => (
                <Card key={contact.id} className="border-red-500/50" data-testid={`lost-contact-${contact.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{contact.clientName || "Unknown"}</p>
                        {contact.referenceCode && <p className="text-xs text-muted-foreground">{contact.referenceCode}</p>}
                      </div>
                      {contact.lastRiskTier && (
                        <Badge className={RISK_TIER_LABELS[contact.lastRiskTier as RiskTier]?.color || ""}>
                          {RISK_TIER_LABELS[contact.lastRiskTier as RiskTier]?.label || contact.lastRiskTier}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {contact.daysSinceContact !== null ? (
                        <p className="text-red-500 font-medium">
                          {contact.daysSinceContact} days since last contact (expected every {contact.expectedFrequencyDays} days)
                        </p>
                      ) : (
                        <p className="text-red-500 font-medium">No interactions ever logged</p>
                      )}
                      {contact.lastContactAt && (
                        <p>Last contact: {new Date(contact.lastContactAt).toLocaleDateString("en-GB")}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setLookupName(contact.clientName || "");
                        setResolvedClient(null);
                        setSelectedClient("");
                        setActiveTab("log");
                      }}
                      data-testid={`button-log-contact-${contact.id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Log Interaction
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No lost contacts detected</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
            <DialogDescription>Record what was done for this follow-up</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Follow-up Notes</Label>
              <Textarea
                placeholder="What action was taken?"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={3}
                data-testid="input-followup-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>Cancel</Button>
            <Button
              onClick={() => completeFollowUpMutation.mutate()}
              disabled={completeFollowUpMutation.isPending}
              data-testid="button-confirm-followup"
            >
              {completeFollowUpMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
