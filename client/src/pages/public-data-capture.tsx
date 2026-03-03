import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  User, AlertOctagon, UserPlus, Phone, Lock, Eye,
  Tablet, UserCheck, HandHelping, Info, ArrowRight
} from "lucide-react";
import type { InteractionProgramme, InteractionContactType, RiskTier, RiskIndicator, InteractionAction } from "@shared/schema";

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
  other: "Other",
};

const COUNTRY_CODES = [
  { code: "+44", label: "+44 UK" },
  { code: "+353", label: "+353 IE" },
  { code: "+1", label: "+1 US" },
];

type Tab = "log" | "recent" | "overdue" | "lost";

interface ClientOption {
  id: string;
  clientName: string | null;
  referenceCode: string | null;
  seatType: string;
  dateOfBirth: string | null;
}

interface InteractionWithClient {
  interaction: any;
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
  client: ClientOption;
  profile: { dateOfBirth: string } | null;
  recentInteractions: any[];
}

type AppMode = "select" | "staff" | "self_checkin";
type PageStep = "identify" | "register" | "interaction";

function calculateAge(dob: string): number {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export default function PublicDataCapturePage({ token }: { token: string }) {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [appMode, setAppMode] = useState<AppMode>("select");
  const [selfCheckinName, setSelfCheckinName] = useState("");
  const [selfCheckinWorker, setSelfCheckinWorker] = useState(false);
  const [selfCheckinSuccess, setSelfCheckinSuccess] = useState<{ clientName: string; workerRequested: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [step, setStep] = useState<PageStep>("identify");
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpInteractionId, setFollowUpInteractionId] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");

  const [lookupName, setLookupName] = useState("");
  const [lookupDob, setLookupDob] = useState("");
  const [showDobField, setShowDobField] = useState(false);
  const [resolvedClient, setResolvedClient] = useState<LookupResult | null>(null);
  const [selectedClient, setSelectedClient] = useState("");

  const [regCountryCode, setRegCountryCode] = useState("+44");
  const [regPhone, setRegPhone] = useState("");
  const [regSupervisorName, setRegSupervisorName] = useState("");
  const [regSupervisorEmail, setRegSupervisorEmail] = useState("");
  const [regSupervisorCountryCode, setRegSupervisorCountryCode] = useState("+44");
  const [regSupervisorPhone, setRegSupervisorPhone] = useState("");
  const [regEmergencyNotes, setRegEmergencyNotes] = useState("");

  const [staffName, setStaffName] = useState("");
  const [programme, setProgramme] = useState<InteractionProgramme | "">("");
  const [contactType, setContactType] = useState<InteractionContactType | "">("");
  const [riskTier, setRiskTier] = useState<RiskTier | "">("");
  const [selectedIndicators, setSelectedIndicators] = useState<RiskIndicator[]>([]);
  const [actionTaken, setActionTaken] = useState<InteractionAction | "">("");
  const [actionTakenOther, setActionTakenOther] = useState("");
  const [referralAgency, setReferralAgency] = useState("");
  const [noActionRationale, setNoActionRationale] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpStaffName, setFollowUpStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{ lat: string; lng: string } | null>(null);

  const apiPrefix = `/api/dc/${token}`;

  const { data: verifyData, isLoading: verifyLoading, isError: verifyError } = useQuery<{ valid: boolean; organizationName: string; requiresPassword: boolean }>({
    queryKey: [`${apiPrefix}/verify`],
    retry: false,
  });

  const authenticateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `${apiPrefix}/authenticate`, { password: loginPassword });
      return response.json();
    },
    onSuccess: () => {
      setAuthenticated(true);
      setLoginError("");
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/verify`] });
    },
    onError: (error: any) => {
      setLoginError(error.message || "Incorrect password");
    },
  });

  const needsPassword = verifyData?.valid && verifyData.requiresPassword && !authenticated;

  const { data: clientsData } = useQuery<{ clients: ClientOption[] }>({
    queryKey: [`${apiPrefix}/clients-list`],
    refetchInterval: 5000,
    enabled: !!verifyData?.valid && !needsPassword,
  });

  const { data: statsData } = useQuery<Stats>({
    queryKey: [`${apiPrefix}/interactions/stats`],
    refetchInterval: 5000,
    enabled: !!verifyData?.valid && !needsPassword,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery<{ interactions: InteractionWithClient[] }>({
    queryKey: [`${apiPrefix}/interactions`],
    refetchInterval: 5000,
    enabled: !!verifyData?.valid && !needsPassword,
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery<{ overdue: InteractionWithClient[] }>({
    queryKey: [`${apiPrefix}/interactions/overdue-followups`],
    refetchInterval: 5000,
    enabled: !!verifyData?.valid && !needsPassword,
  });

  const { data: lostData, isLoading: lostLoading } = useQuery<{ lostContacts: LostContact[] }>({
    queryKey: [`${apiPrefix}/interactions/lost-contacts`],
    refetchInterval: 5000,
    enabled: !!verifyData?.valid && !needsPassword,
  });

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const body: any = { clientName: lookupName.trim() };
      if (lookupDob) body.dateOfBirth = lookupDob;
      const response = await apiRequest("POST", `${apiPrefix}/interactions/lookup`, body);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.found) {
        setResolvedClient(data as LookupResult);
        setSelectedClient(data.client.id);
        if (data.recentInteractions?.length > 0) {
          const last = data.recentInteractions[0];
          setRiskTier(last.riskTier);
          if (last.riskIndicators?.length) {
            setSelectedIndicators(last.riskIndicators);
          }
        }
        toast({ title: "Client Found", description: `${data.client.clientName} - ${data.client.referenceCode}` });
        setShowDobField(false);
        setStep("interaction");
      } else if (data.duplicates) {
        setShowDobField(true);
        toast({ title: "Multiple Matches", description: `${data.count} clients share this name. Please enter date of birth to identify.`, variant: "destructive" });
      } else {
        toast({ title: "New Individual", description: "Not found in system. Please complete registration." });
        setStep("register");
      }
    },
    onError: (error: any) => {
      toast({ title: "Lookup Failed", description: error.message || "Could not search for client", variant: "destructive" });
    },
  });

  const isUnder16 = lookupDob ? calculateAge(lookupDob) < 16 : false;

  const registerMutation = useMutation({
    mutationFn: async () => {
      const clientPhone = isUnder16 ? undefined : `${regCountryCode}${regPhone}`;
      const response = await apiRequest("POST", `${apiPrefix}/clients/register`, {
        clientName: lookupName.trim(),
        clientPhone,
        dateOfBirth: lookupDob,
        supervisorName: regSupervisorName,
        supervisorPhone: `${regSupervisorCountryCode}${regSupervisorPhone}`,
        supervisorEmail: regSupervisorEmail,
        emergencyNotes: regEmergencyNotes || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Client Registered", description: `${lookupName.trim()} has been registered and synced to the org dashboard` });
      setSelectedClient(data.orgClient?.id || data.id || "");
      setResolvedClient({
        found: true,
        client: {
          id: data.orgClient?.id || data.id || "",
          clientName: lookupName.trim(),
          referenceCode: data.orgClient?.referenceCode || data.referenceCode || "",
          seatType: isUnder16 ? "safeguarding" : "check_in",
          dateOfBirth: lookupDob,
        },
        profile: { dateOfBirth: lookupDob },
        recentInteractions: [],
      });
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/clients-list`] });
      setStep("interaction");
    },
    onError: (error: any) => {
      toast({ title: "Registration Failed", description: error.message || "Could not register client", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `${apiPrefix}/interactions`, {
        orgClientId: selectedClient,
        staffName,
        programme,
        contactType,
        riskTier,
        riskIndicators: selectedIndicators,
        actionTaken,
        actionTakenOther: actionTaken === "other" ? actionTakenOther : undefined,
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
    onSuccess: (data) => {
      if (data.welfareConcernCreated) {
        toast({ title: "Interaction Logged + Welfare Concern Created", description: "Escalation detected - a welfare concern has been automatically added to the Safeguarding Hub" });
      } else {
        toast({ title: "Interaction Logged", description: "Record saved to audit trail and synced to org dashboard" });
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions`] });
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions/stats`] });
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions/overdue-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions/lost-contacts`] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to log interaction", variant: "destructive" });
    },
  });

  const selfCheckinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `${apiPrefix}/self-checkin`, {
        nameOrReference: selfCheckinName.trim(),
        requestWorker: selfCheckinWorker,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSelfCheckinSuccess({ clientName: data.clientName, workerRequested: data.workerRequested });
      setSelfCheckinName("");
      setSelfCheckinWorker(false);
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions`] });
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions/stats`] });
    },
    onError: (error: any) => {
      toast({ title: "Check-in Failed", description: error.message || "Could not check in. Please ask a staff member for help.", variant: "destructive" });
    },
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `${apiPrefix}/interactions/${followUpInteractionId}/complete-followup`, {
        notes: followUpNotes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Follow-up Completed", description: "Follow-up marked as done" });
      setShowFollowUpDialog(false);
      setFollowUpInteractionId(null);
      setFollowUpNotes("");
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions/overdue-followups`] });
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/interactions/stats`] });
    },
  });

  const resetForm = () => {
    setLookupName("");
    setLookupDob("");
    setShowDobField(false);
    setResolvedClient(null);
    setSelectedClient("");
    setStep("identify");
    setRegPhone("");
    setRegSupervisorName("");
    setRegSupervisorEmail("");
    setRegSupervisorPhone("");
    setRegEmergencyNotes("");
    setProgramme("");
    setContactType("");
    setRiskTier("");
    setSelectedIndicators([]);
    setActionTaken("");
    setActionTakenOther("");
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

  const canLookup = lookupName.trim().length >= 2 && (!showDobField || lookupDob);

  const canRegister = regSupervisorName && regSupervisorEmail && regSupervisorPhone.length >= 7 &&
    (isUnder16 || regPhone.length >= 7);

  const canSubmit =
    selectedClient && staffName && programme && contactType && riskTier && actionTaken &&
    !(actionTaken === "other" && !actionTakenOther.trim()) &&
    !(actionTaken === "referral_made" && !referralAgency) &&
    !(riskTier === "high" && actionTaken === "no_action_required" && !noActionRationale) &&
    !(followUpRequired && !followUpDate);

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "log" as Tab, label: "Log", icon: Plus },
    { key: "recent", label: "Recent", icon: ClipboardList },
    { key: "overdue", label: "Overdue", icon: AlertTriangle, badge: statsData?.overdueFollowUps },
    { key: "lost", label: "Lost Contact", icon: AlertOctagon },
  ];

  if (verifyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading Data Capture...</p>
        </div>
      </div>
    );
  }

  if (verifyError || !verifyData?.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Invalid Link</h2>
            <p className="text-sm text-muted-foreground">
              This Data Capture link is invalid or has been deactivated. Please contact your organisation manager for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="dc-password-landing">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Data Capture</h1>
              <p className="text-sm text-muted-foreground">{verifyData.organizationName}</p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Enter Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter access password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && loginPassword) authenticateMutation.mutate(); }}
                  className="pl-10 pr-10"
                  autoFocus
                  data-testid="input-dc-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              {loginError && (
                <p className="text-sm text-destructive" data-testid="text-login-error">{loginError}</p>
              )}
            </div>

            <Button
              className="w-full py-5"
              disabled={!loginPassword || authenticateMutation.isPending}
              onClick={() => authenticateMutation.mutate()}
              data-testid="button-dc-login"
            >
              {authenticateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Open Data Capture
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your organisation manager should have shared the password with you separately from this link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appMode === "select") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="dc-mode-select">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2 mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Data Capture</h1>
            <p className="text-sm text-muted-foreground">{verifyData.organizationName}</p>
          </div>

          <Card
            className="cursor-pointer border-2 hover:border-primary transition-colors"
            onClick={() => setAppMode("staff")}
            data-testid="button-mode-staff"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base">Staff Assisted</h2>
                <p className="text-xs text-muted-foreground">Full structured interaction logging with risk assessment, actions, follow-ups, and client registration</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 hover:border-green-500 transition-colors"
            onClick={() => setAppMode("self_checkin")}
            data-testid="button-mode-self-checkin"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Tablet className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base">Self Check-In</h2>
                <p className="text-xs text-muted-foreground">Simplified tablet mode for service users to check in at shelters and drop-ins</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>

          <div className="mt-6 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-muted-foreground space-y-1">
                <p><strong>This is not an emergency monitoring tool.</strong> AOK Data Capture is a structured safeguarding interaction logging system. It does not provide real-time crisis monitoring.</p>
                <p>Escalation responsibility sits with the organisation. All records are time-stamped, tamper-evident, and maintained in a full audit trail.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === "self_checkin") {
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="dc-self-checkin">
        <div className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => { setAppMode("select"); setSelfCheckinSuccess(null); }} className="text-muted-foreground hover:text-foreground" data-testid="button-back-mode">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Tablet className="h-5 w-5 text-green-600" />
                Self Check-In
              </h1>
              <p className="text-xs text-muted-foreground">{verifyData.organizationName}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full">
            {selfCheckinSuccess ? (
              <Card className="border-green-500/50">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold">Checked In</h2>
                  <p className="text-sm text-muted-foreground">
                    Welcome, <strong>{selfCheckinSuccess.clientName}</strong>
                  </p>
                  {selfCheckinSuccess.workerRequested && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium">A worker has been notified and will see you shortly.</p>
                    </div>
                  )}
                  <Button
                    className="w-full py-5 mt-4"
                    onClick={() => setSelfCheckinSuccess(null)}
                    data-testid="button-another-checkin"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Next Person
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center space-y-2">
                    <UserCheck className="h-10 w-10 mx-auto text-green-600" />
                    <h2 className="text-xl font-bold">Check In</h2>
                    <p className="text-sm text-muted-foreground">Enter your name or reference code to check in</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Your Name or Reference Code</Label>
                    <Input
                      placeholder="e.g. John Smith or AOK-1234"
                      value={selfCheckinName}
                      onChange={(e) => setSelfCheckinName(e.target.value)}
                      className="text-lg py-6"
                      autoFocus
                      data-testid="input-self-checkin-name"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Would you like to see a worker?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelfCheckinWorker(true)}
                        className={`py-4 rounded-lg text-sm font-bold transition-all border-2 flex flex-col items-center gap-1 ${
                          selfCheckinWorker
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        }`}
                        data-testid="button-worker-yes"
                      >
                        <HandHelping className="h-5 w-5" />
                        Yes please
                      </button>
                      <button
                        onClick={() => setSelfCheckinWorker(false)}
                        className={`py-4 rounded-lg text-sm font-bold transition-all border-2 flex flex-col items-center gap-1 ${
                          !selfCheckinWorker
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-border bg-card text-muted-foreground hover:border-green-500/50"
                        }`}
                        data-testid="button-worker-no"
                      >
                        <CheckCircle className="h-5 w-5" />
                        No thanks
                      </button>
                    </div>
                  </div>

                  <Button
                    className="w-full py-6 text-lg"
                    size="lg"
                    disabled={!selfCheckinName.trim() || selfCheckinMutation.isPending}
                    onClick={() => selfCheckinMutation.mutate()}
                    data-testid="button-self-checkin-submit"
                  >
                    {selfCheckinMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    Check In
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground">
                    This creates a contact record only. Risk assessments are completed by staff.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-start gap-2 max-w-sm mx-auto">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              This is not an emergency service. If you need immediate help, please speak to a member of staff or call 999.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="public-data-capture-page">
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setAppMode("select")} className="text-muted-foreground hover:text-foreground" data-testid="button-back-mode-staff">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-dc-title">
              <Shield className="h-5 w-5 text-primary" />
              Staff Data Capture
            </h1>
            <p className="text-xs text-muted-foreground">
              {verifyData.organizationName}
              <span className="ml-2">
                Syncs every 5s
                {gpsLocation && (
                  <span className="ml-1 inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3 inline" /> GPS
                  </span>
                )}
              </span>
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
            {step === "identify" && (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-4">
                  <div className="text-center mb-2">
                    <User className="h-8 w-8 mx-auto mb-1 text-primary" />
                    <h2 className="text-base font-bold">Identify Individual</h2>
                    <p className="text-xs text-muted-foreground">Enter the individual's name. If they exist in the system, their data will be pulled. If new, you will be asked to register them.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Full Name</Label>
                    <Input
                      placeholder="Enter full name"
                      value={lookupName}
                      onChange={(e) => { setLookupName(e.target.value); if (showDobField) { setShowDobField(false); setLookupDob(""); } }}
                      data-testid="input-lookup-name"
                    />
                    {lookupName.trim().length >= 2 && !showDobField && clientMatches().length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        {clientMatches().map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setLookupName(c.clientName || "");
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

                  {showDobField && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Date of Birth</Label>
                      <p className="text-xs text-muted-foreground">Multiple clients share this name. Enter date of birth to identify the correct person.</p>
                      <Input
                        type="date"
                        value={lookupDob}
                        onChange={(e) => setLookupDob(e.target.value)}
                        data-testid="input-lookup-dob"
                      />
                    </div>
                  )}

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
                    Find Individual
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "register" && (
              <Card className="border-green-500/50">
                <CardContent className="p-4 space-y-4">
                  <div className="text-center mb-2">
                    <UserPlus className="h-8 w-8 mx-auto mb-1 text-green-600" />
                    <h2 className="text-base font-bold">Register New Client</h2>
                    <p className="text-xs text-muted-foreground">
                      {isUnder16
                        ? "Under 16 - will be registered as a Safeguarding Seat (dashboard only, no SMS/app)"
                        : "Client will receive an SMS with a link to the app and their reference code"
                      }
                    </p>
                    {isUnder16 && (
                      <Badge className="mt-2 bg-amber-500 text-white">Safeguarding Seat (Under 16)</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Full Name</Label>
                      <Input value={lookupName} disabled className="bg-muted" data-testid="reg-name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Date of Birth</Label>
                      <Input value={lookupDob} disabled className="bg-muted" data-testid="reg-dob" />
                    </div>
                  </div>

                  {!isUnder16 && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Mobile Number *</Label>
                      <div className="flex gap-2">
                        <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                          <SelectTrigger className="w-28" data-testid="reg-country-code">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map((cc) => (
                              <SelectItem key={cc.code} value={cc.code}>{cc.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="7XXX XXXXXX"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ""))}
                          data-testid="reg-phone"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-semibold">Supervisor (Primary Contact/Carer) *</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">The supervisor is the primary contact/carer and will be notified of missed check-ins.</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Name *</Label>
                        <Input
                          placeholder="Jane Doe"
                          value={regSupervisorName}
                          onChange={(e) => setRegSupervisorName(e.target.value)}
                          data-testid="reg-supervisor-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Email *</Label>
                        <Input
                          placeholder="supervisor@example.com"
                          type="email"
                          value={regSupervisorEmail}
                          onChange={(e) => setRegSupervisorEmail(e.target.value)}
                          data-testid="reg-supervisor-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 mt-3">
                      <Label className="text-xs font-semibold">Mobile *</Label>
                      <div className="flex gap-2">
                        <Select value={regSupervisorCountryCode} onValueChange={setRegSupervisorCountryCode}>
                          <SelectTrigger className="w-28" data-testid="reg-supervisor-country-code">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map((cc) => (
                              <SelectItem key={cc.code} value={cc.code}>{cc.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="7XXX XXXXXX"
                          value={regSupervisorPhone}
                          onChange={(e) => setRegSupervisorPhone(e.target.value.replace(/[^0-9]/g, ""))}
                          data-testid="reg-supervisor-phone"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Emergency Notes</Label>
                    <p className="text-[10px] text-muted-foreground">These notes will be included in all alert messages sent to contacts (e.g. medical conditions, access instructions).</p>
                    <Textarea
                      placeholder="e.g. Client has diabetes and uses insulin. Key safe code: 1234."
                      value={regEmergencyNotes}
                      onChange={(e) => setRegEmergencyNotes(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      data-testid="reg-emergency-notes"
                    />
                    <p className="text-[10px] text-right text-muted-foreground">{regEmergencyNotes.length}/1000</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("identify")}
                      data-testid="button-back-identify"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <Button
                      className="flex-1 py-5"
                      disabled={!canRegister || registerMutation.isPending}
                      onClick={() => registerMutation.mutate()}
                      data-testid="button-register-client"
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      {isUnder16 ? "Register Safeguarding Seat" : "Register & Send SMS"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "interaction" && resolvedClient && (
              <>
                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm" data-testid="text-resolved-name">{resolvedClient.client.clientName}</p>
                        <p className="text-xs text-muted-foreground">Ref: {resolvedClient.client.referenceCode}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {resolvedClient.client.seatType === "safeguarding" ? "Safeguarding" : "Check-in"} Seat
                      </Badge>
                    </div>
                    {resolvedClient.recentInteractions?.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Last interaction:</p>
                        <div className="text-xs text-muted-foreground">
                          <span className="mr-2">
                            Risk: <Badge className={`${RISK_TIER_LABELS[resolvedClient.recentInteractions[0].riskTier as RiskTier]?.color} text-[10px] py-0`}>
                              {RISK_TIER_LABELS[resolvedClient.recentInteractions[0].riskTier as RiskTier]?.label}
                            </Badge>
                          </span>
                          <span className="mr-2">{resolvedClient.recentInteractions[0].actionTaken === "other" && resolvedClient.recentInteractions[0].actionTakenOther ? `Other: ${resolvedClient.recentInteractions[0].actionTakenOther}` : (ACTION_LABELS[resolvedClient.recentInteractions[0].actionTaken as InteractionAction] || resolvedClient.recentInteractions[0].actionTaken)}</span>
                          <span>{new Date(resolvedClient.recentInteractions[0].createdAt).toLocaleDateString("en-GB")}</span>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => resetForm()}
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

                {actionTaken === "other" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Please specify</Label>
                    <Input
                      placeholder="Describe the action taken"
                      value={actionTakenOther}
                      onChange={(e) => setActionTakenOther(e.target.value)}
                      data-testid="input-action-other"
                    />
                  </div>
                )}

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

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={followUpRequired}
                      onCheckedChange={(v) => setFollowUpRequired(v === true)}
                      data-testid="checkbox-followup"
                    />
                    <span className="text-sm font-semibold">Follow-up Required</span>
                  </label>
                  {followUpRequired && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Follow-up Date</Label>
                        <Input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          data-testid="input-followup-date"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Assigned To</Label>
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
                  <Label className="text-sm font-semibold">Notes</Label>
                  <Textarea
                    placeholder="Additional notes about this interaction..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    data-testid="input-notes"
                  />
                </div>

                {gpsLocation && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>GPS: {gpsLocation.lat}, {gpsLocation.lng}</span>
                  </div>
                )}

                <Button
                  className="w-full py-5"
                  size="lg"
                  disabled={!canSubmit || submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                  data-testid="button-submit-interaction"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Log Interaction
                </Button>
              </>
            )}
          </div>
        )}

        {activeTab === "recent" && (
          <div className="space-y-3 max-w-lg mx-auto pb-20">
            {recentLoading ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : recentData?.interactions && recentData.interactions.length > 0 ? (
              recentData.interactions.map((item) => (
                <Card key={item.interaction.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{item.clientName}</span>
                      <Badge className={`${RISK_TIER_LABELS[item.interaction.riskTier as RiskTier]?.color} text-[10px] py-0`}>
                        {RISK_TIER_LABELS[item.interaction.riskTier as RiskTier]?.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{CONTACT_TYPE_LABELS[item.interaction.contactType as InteractionContactType] || item.interaction.contactType} - {PROGRAMME_LABELS[item.interaction.programme as InteractionProgramme] || item.interaction.programme}</p>
                      <p>Action: {item.interaction.actionTaken === "other" && item.interaction.actionTakenOther ? `Other: ${item.interaction.actionTakenOther}` : (ACTION_LABELS[item.interaction.actionTaken as InteractionAction] || item.interaction.actionTaken)}</p>
                      <p>Staff: {item.interaction.staffName} - {new Date(item.interaction.createdAt).toLocaleDateString("en-GB")} {new Date(item.interaction.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                      {item.interaction.escalationTriggered && (
                        <Badge variant="destructive" className="text-[10px] mt-1">Escalation</Badge>
                      )}
                      {item.interaction.notes && (
                        <p className="mt-1 italic">{item.interaction.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No interactions recorded yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "overdue" && (
          <div className="space-y-3 max-w-lg mx-auto pb-20">
            {overdueLoading ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : overdueData?.overdue && overdueData.overdue.length > 0 ? (
              overdueData.overdue.map((item) => (
                <Card key={item.interaction.id} className="border-amber-500/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{item.clientName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        Due: {new Date(item.interaction.followUpDate).toLocaleDateString("en-GB")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Assigned to: {item.interaction.followUpStaffName || "Unassigned"}</p>
                      <p>Original: {item.interaction.actionTaken === "other" && item.interaction.actionTakenOther ? `Other: ${item.interaction.actionTakenOther}` : (ACTION_LABELS[item.interaction.actionTaken as InteractionAction] || item.interaction.actionTaken)}</p>
                    </div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setFollowUpInteractionId(item.interaction.id);
                        setFollowUpNotes("");
                        setShowFollowUpDialog(true);
                      }}
                      data-testid={`button-complete-followup-${item.interaction.id}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Complete Follow-up
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No overdue follow-ups</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "lost" && (
          <div className="space-y-3 max-w-lg mx-auto pb-20">
            {lostLoading ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : lostData?.lostContacts && lostData.lostContacts.length > 0 ? (
              lostData.lostContacts.map((contact) => (
                <Card key={contact.id} className="border-red-500/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{contact.clientName}</span>
                      {contact.lastRiskTier && (
                        <Badge className={`${RISK_TIER_LABELS[contact.lastRiskTier as RiskTier]?.color} text-[10px] py-0`}>
                          {RISK_TIER_LABELS[contact.lastRiskTier as RiskTier]?.label}
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
                        setStep("identify");
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

      <div className="p-3 border-t bg-muted/30">
        <div className="flex items-start gap-2 max-w-lg mx-auto">
          <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p><strong>This is not an emergency monitoring tool.</strong> AOK Data Capture provides structured safeguarding interaction logging. Escalation responsibility sits with the organisation.</p>
            <p>All entries are time-stamped, staff-attributed, and maintained in a tamper-evident audit trail. Records cannot be deleted, only archived.</p>
          </div>
        </div>
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
