import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/contexts/admin-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ShieldCheck, ArrowLeft, LogOut, TrendingUp, Users, DollarSign,
  PoundSterling, TreePine, Phone, Mail, Smartphone, Headphones,
  Server, CreditCard, Calculator, BarChart3, Percent, KeyRound,
  Save, RotateCcw, Settings2, Pencil
} from "lucide-react";
import type { DashboardStats, PricingConfig } from "@shared/schema";

const DEFAULT_COST_MODEL = {
  sms_per_unit: 0.04,
  voice_call_per_unit: 0.12,
  email_per_unit: 0.001,
  emergency_alert_per_unit: 0.20,
  ai_chat_per_conversation: 0.03,
  ai_voice_per_session: 0.04,
  ecologi_per_signup: 0.60,
  stripe_fee_percent: 1.4,
  stripe_fee_fixed: 0.20,
  tier1_monthly: 6.99,
  tier1_yearly: 69.99,
  tier2_monthly: 9.99,
  tier2_yearly: 99.99,
  individual_monthly: 8.49,
  individual_yearly: 84.99,
  org_seat_average: 4.99,
};

function buildCostModel(pricingData: PricingConfig[] | undefined): typeof DEFAULT_COST_MODEL {
  if (!pricingData || pricingData.length === 0) return DEFAULT_COST_MODEL;
  const model = { ...DEFAULT_COST_MODEL };
  for (const item of pricingData) {
    if (item.key in model) {
      (model as any)[item.key] = item.value;
    }
  }
  return model;
}

const HOSTING_TIERS: { maxUsers: number; monthlyCost: number; description: string }[] = [
  { maxUsers: 1000, monthlyCost: 10, description: "Autoscale / Small VM" },
  { maxUsers: 5000, monthlyCost: 40, description: "Reserved VM (1 vCPU / 4GB)" },
  { maxUsers: 10000, monthlyCost: 90, description: "Dedicated VM (2 vCPU / 8GB)" },
  { maxUsers: 25000, monthlyCost: 180, description: "Multiple instances" },
  { maxUsers: 50000, monthlyCost: 350, description: "Scaled cluster" },
];

function getHostingCost(users: number): { cost: number; description: string } {
  for (const tier of HOSTING_TIERS) {
    if (users <= tier.maxUsers) return { cost: tier.monthlyCost, description: tier.description };
  }
  return { cost: 500, description: "Enterprise cluster" };
}

interface ProjectionResult {
  totalUsers: number;
  individualUsers: number;
  orgSeats: number;
  monthlyRevenue: number;
  annualRevenue: number;
  monthlyCosts: {
    hosting: number;
    hostingDesc: string;
    twilio: number;
    resend: number;
    openai: number;
    stripe: number;
    total: number;
  };
  ecologiOneOff: number;
  annualCosts: number;
  annualProfit: number;
  grossMargin: number;
}

function calculateProjection(
  totalUsers: number,
  orgPercent: number,
  missedCheckinRate: number,
  aiUsageRate: number,
  supervisorCallRate: number = 0.05,
  costModel: typeof DEFAULT_COST_MODEL = DEFAULT_COST_MODEL
): ProjectionResult {
  const orgSeats = Math.round(totalUsers * (orgPercent / 100));
  const individualUsers = totalUsers - orgSeats;

  const monthlyRevenue =
    individualUsers * costModel.individual_monthly +
    orgSeats * costModel.org_seat_average;

  const annualRevenue = monthlyRevenue * 12;

  const missedPerMonth = totalUsers * missedCheckinRate * 30;
  const twilioMonthlySms = missedPerMonth * costModel.sms_per_unit;
  const twilioMonthlyVoice = missedPerMonth * 0.3 * costModel.voice_call_per_unit;
  const supervisorCallsPerMonth = orgSeats * supervisorCallRate * 30;
  const twilioSupervisor = supervisorCallsPerMonth * costModel.voice_call_per_unit;
  const twilioMonthly = twilioMonthlySms + twilioMonthlyVoice + twilioSupervisor;

  const emailsPerMonth = missedPerMonth + totalUsers * 0.5;
  const resendMonthly = emailsPerMonth * costModel.email_per_unit;

  const aiSessionsPerMonth = totalUsers * aiUsageRate * 30;
  const openaiMonthly =
    aiSessionsPerMonth * 0.8 * costModel.ai_chat_per_conversation +
    aiSessionsPerMonth * 0.2 * costModel.ai_voice_per_session;

  const stripeMonthly =
    monthlyRevenue * (costModel.stripe_fee_percent / 100) +
    totalUsers * costModel.stripe_fee_fixed;

  const hosting = getHostingCost(totalUsers);

  const totalMonthlyCosts = hosting.cost + twilioMonthly + resendMonthly + openaiMonthly + stripeMonthly;
  const ecologiOneOff = totalUsers * costModel.ecologi_per_signup;
  const annualCosts = totalMonthlyCosts * 12;
  const annualProfit = annualRevenue - annualCosts;
  const grossMargin = annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0;

  return {
    totalUsers,
    individualUsers,
    orgSeats,
    monthlyRevenue,
    annualRevenue,
    monthlyCosts: {
      hosting: hosting.cost,
      hostingDesc: hosting.description,
      twilio: twilioMonthly,
      resend: resendMonthly,
      openai: openaiMonthly,
      stripe: stripeMonthly,
      total: totalMonthlyCosts,
    },
    ecologiOneOff,
    annualCosts,
    annualProfit,
    grossMargin,
  };
}

function formatCurrency(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className={`text-xs mt-1 ${trend === "up" ? "text-green-600" : "text-muted-foreground"}`}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectionRow({ projection, highlight }: { projection: ProjectionResult; highlight?: boolean }) {
  return (
    <tr className={highlight ? "bg-primary/5 font-medium" : ""}>
      <td className="py-3 px-4 font-medium">{projection.totalUsers.toLocaleString()}</td>
      <td className="py-3 px-4">{projection.individualUsers.toLocaleString()}</td>
      <td className="py-3 px-4">{projection.orgSeats.toLocaleString()}</td>
      <td className="py-3 px-4 text-green-600">{formatCurrency(projection.monthlyRevenue)}</td>
      <td className="py-3 px-4 text-green-600 font-medium">{formatCurrency(projection.annualRevenue)}</td>
      <td className="py-3 px-4 text-muted-foreground">{formatCurrency(projection.monthlyCosts.total)}</td>
      <td className="py-3 px-4 text-muted-foreground">{formatCurrency(projection.annualCosts)}</td>
      <td className="py-3 px-4 text-green-600 font-medium">{formatCurrency(projection.annualProfit)}</td>
      <td className="py-3 px-4">
        <Badge variant={projection.grossMargin >= 90 ? "default" : projection.grossMargin >= 70 ? "secondary" : "outline"}>
          {projection.grossMargin.toFixed(1)}%
        </Badge>
      </td>
    </tr>
  );
}

function PricingEditor({ pricingData, isSuperAdmin }: { pricingData: PricingConfig[] | undefined; isSuperAdmin: boolean }) {
  const { toast } = useToast();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (pricingData) {
      const values: Record<string, string> = {};
      for (const item of pricingData) {
        values[item.key] = item.value.toString();
      }
      setEditValues(values);
    }
  }, [pricingData]);

  const saveMutation = useMutation({
    mutationFn: async (updates: { key: string; value: number }[]) => {
      const res = await apiRequest("PUT", "/api/admin/pricing", { updates });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
      toast({ title: "Pricing updated", description: "All pricing changes have been saved." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pricing.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const updates: { key: string; value: number }[] = [];
    for (const [key, val] of Object.entries(editValues)) {
      const numVal = parseFloat(val);
      if (isNaN(numVal) || numVal < 0) {
        toast({ title: "Invalid value", description: `Please enter a valid number for all fields.`, variant: "destructive" });
        return;
      }
      const original = pricingData?.find(p => p.key === key);
      if (original && original.value !== numVal) {
        updates.push({ key, value: numVal });
      }
    }
    if (updates.length === 0) {
      toast({ title: "No changes", description: "No pricing values were changed." });
      setIsEditing(false);
      return;
    }
    saveMutation.mutate(updates);
  };

  const handleReset = () => {
    if (pricingData) {
      const values: Record<string, string> = {};
      for (const item of pricingData) {
        values[item.key] = item.value.toString();
      }
      setEditValues(values);
    }
    setIsEditing(false);
  };

  if (!pricingData || pricingData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Skeleton className="h-4 w-4" />
            <span className="text-sm">Loading pricing configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const subscriptionItems = pricingData.filter(p => p.category === "subscription");
  const costItems = pricingData.filter(p => p.category === "costs");

  const hasChanges = pricingData.some(item => {
    const editVal = parseFloat(editValues[item.key] || "0");
    return item.value !== editVal;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-pricing-config">
            <Settings2 className="w-5 h-5" />
            Tier Pricing & Cost Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edit subscription prices and per-unit costs. Changes update all revenue projections.
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={saveMutation.isPending}
                  data-testid="button-pricing-cancel"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !hasChanges}
                  data-testid="button-pricing-save"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saveMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-pricing-edit"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit Pricing
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PoundSterling className="w-4 h-4" />
              Subscription Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4">
                <Label className="text-sm flex-1 min-w-0" data-testid={`label-pricing-${item.key}`}>
                  {item.label}
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">£</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValues[item.key] || ""}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                      className="w-24 text-right"
                      data-testid={`input-pricing-${item.key}`}
                    />
                  ) : (
                    <span className="text-sm font-semibold w-24 text-right inline-block" data-testid={`text-pricing-value-${item.key}`}>
                      {item.value.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Per-Unit Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {costItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4">
                <Label className="text-sm flex-1 min-w-0" data-testid={`label-pricing-${item.key}`}>
                  {item.label}
                  {item.key === "stripe_fee_percent" && <span className="text-muted-foreground ml-1">(%)</span>}
                </Label>
                <div className="flex items-center gap-1">
                  {item.key !== "stripe_fee_percent" && <span className="text-sm text-muted-foreground">£</span>}
                  {isEditing ? (
                    <Input
                      type="number"
                      step={item.key === "email_per_unit" ? "0.001" : "0.01"}
                      min="0"
                      value={editValues[item.key] || ""}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                      className="w-24 text-right"
                      data-testid={`input-pricing-${item.key}`}
                    />
                  ) : (
                    <span className="text-sm font-semibold w-24 text-right inline-block" data-testid={`text-pricing-value-${item.key}`}>
                      {item.key === "stripe_fee_percent" ? `${item.value}%` : item.value.toFixed(item.key === "email_per_unit" ? 3 : 2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isEditing && hasChanges && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You have unsaved changes. Changes will immediately update all revenue projections and cost calculations on this page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminRevenue() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [customUsers, setCustomUsers] = useState(1000);
  const [orgPercent, setOrgPercent] = useState(30);
  const [missedRate, setMissedRate] = useState(0.05);
  const [aiUsageRate, setAiUsageRate] = useState(0.1);
  const [supervisorCallRate, setSupervisorCallRate] = useState(0.05);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const isSuperAdmin = admin?.role === "super_admin";

  const { data: pricingData } = useQuery<PricingConfig[]>({
    queryKey: ["/api/admin/pricing"],
    enabled: isSuperAdmin,
  });

  const costModel = useMemo(() => buildCostModel(pricingData), [pricingData]);

  const currentProjection = useMemo(() => {
    if (!stats) return null;
    const total = stats.totalUsers || 1;
    const orgPct = total > 0 ? ((stats.totalSeatsUsed || 0) / total) * 100 : 30;
    const missRate = stats.totalCheckIns > 0
      ? (stats.totalMissedCheckIns / (stats.totalCheckIns + stats.totalMissedCheckIns))
      : 0.05;
    return calculateProjection(total, orgPct, missRate, aiUsageRate, supervisorCallRate, costModel);
  }, [stats, aiUsageRate, supervisorCallRate, costModel]);

  const scaleProjections = useMemo(() => {
    return [500, 1000, 2500, 5000, 10000, 25000, 50000].map(
      (n) => calculateProjection(n, orgPercent, missedRate, aiUsageRate, supervisorCallRate, costModel)
    );
  }, [orgPercent, missedRate, aiUsageRate, supervisorCallRate, costModel]);

  const customProjection = useMemo(() => {
    return calculateProjection(customUsers, orgPercent, missedRate, aiUsageRate, supervisorCallRate, costModel);
  }, [customUsers, orgPercent, missedRate, aiUsageRate, supervisorCallRate, costModel]);

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home-logo">
              <ArrowLeft className="h-5 w-5 text-green-600" />
              <ShieldCheck className="h-9 w-9 text-green-600" />
              <span className="text-2xl font-bold text-green-600">aok</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Revenue Dashboard</h1>
              <p className="text-sm text-muted-foreground">Projections & cost analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{admin?.role}</Badge>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {isSuperAdmin && (
          <PricingEditor pricingData={pricingData} isSuperAdmin={isSuperAdmin} />
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4" data-testid="text-current-overview">Current Overview</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                  <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                </Card>
              ))}
            </div>
          ) : stats && currentProjection ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                subtitle={`${stats.totalIndividuals} individual, ${stats.totalSeatsUsed || 0} org seats`}
                icon={Users}
              />
              <StatCard
                title="Est. Monthly Revenue"
                value={formatCurrency(currentProjection.monthlyRevenue)}
                subtitle={`${formatCurrency(currentProjection.annualRevenue)}/year projected`}
                icon={PoundSterling}
                trend="up"
              />
              <StatCard
                title="Est. Monthly Costs"
                value={formatCurrency(currentProjection.monthlyCosts.total)}
                subtitle={currentProjection.monthlyCosts.hostingDesc}
                icon={Server}
              />
              <StatCard
                title="Gross Margin"
                value={`${currentProjection.grossMargin.toFixed(1)}%`}
                subtitle={`${formatCurrency(currentProjection.annualProfit)}/year profit`}
                icon={Percent}
                trend="up"
              />
            </div>
          ) : null}
        </section>

        {stats && currentProjection && (
          <section>
            <h2 className="text-lg font-semibold mb-4" data-testid="text-current-costs">Current Monthly Cost Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Hosting</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(currentProjection.monthlyCosts.hosting)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{currentProjection.monthlyCosts.hostingDesc}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Twilio (SMS + Voice)</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(currentProjection.monthlyCosts.twilio)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Missed check-in alerts + Call Supervisor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Resend (Email)</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(currentProjection.monthlyCosts.resend)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Alerts & notifications</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">OpenAI (AI Chat)</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(currentProjection.monthlyCosts.openai)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Wellbeing AI + voice</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Stripe Fees</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(currentProjection.monthlyCosts.stripe)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{costModel.stripe_fee_percent}% + {formatCurrency(costModel.stripe_fee_fixed)} per transaction</p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-unit-economics">Per-Feature Cost Reference</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Feature</th>
                      <th className="text-left py-3 px-4 font-medium">Cost Driver</th>
                      <th className="text-right py-3 px-4 font-medium">Cost Per Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: "SMS check-in reminder", driver: "Twilio SMS", cost: formatCurrency(costModel.sms_per_unit) },
                      { feature: "Missed check-in voice call", driver: "Twilio Voice", cost: `${formatCurrency(costModel.voice_call_per_unit * 0.67)} to ${formatCurrency(costModel.voice_call_per_unit * 1.25)}` },
                      { feature: "Email alert", driver: "Resend", cost: formatCurrency(costModel.email_per_unit) },
                      { feature: "Emergency GPS alert", driver: "Twilio + Resend + w3w", cost: `${formatCurrency(costModel.emergency_alert_per_unit * 0.75)} to ${formatCurrency(costModel.emergency_alert_per_unit * 1.25)}` },
                      { feature: "Call Supervisor (org clients)", driver: "Twilio Voice", cost: `${formatCurrency(costModel.voice_call_per_unit * 0.67)} to ${formatCurrency(costModel.voice_call_per_unit * 1.25)}` },
                      { feature: "AI Wellbeing Chat", driver: "OpenAI GPT-4o", cost: `${formatCurrency(costModel.ai_chat_per_conversation * 0.33)} to ${formatCurrency(costModel.ai_chat_per_conversation * 1.67)}` },
                      { feature: "AI Voice Chat", driver: "OpenAI Whisper + TTS", cost: `${formatCurrency(costModel.ai_voice_per_session * 0.5)} to ${formatCurrency(costModel.ai_voice_per_session * 1.5)}` },
                      { feature: "GPS fitness tracking", driver: "Built-in (Leaflet/OSM)", cost: "£0.00" },
                      { feature: "Ecologi tree planting", driver: "Ecologi", cost: `${formatCurrency(costModel.ecologi_per_signup)} (one-off)` },
                      { feature: "Payment processing", driver: "Stripe", cost: `${costModel.stripe_fee_percent}% + ${formatCurrency(costModel.stripe_fee_fixed)}` },
                      { feature: "Essential subscription", driver: "Tier 1", cost: `${formatCurrency(costModel.tier1_monthly)}/mo or ${formatCurrency(costModel.tier1_yearly)}/yr` },
                      { feature: "Complete Wellbeing subscription", driver: "Tier 2", cost: `${formatCurrency(costModel.tier2_monthly)}/mo or ${formatCurrency(costModel.tier2_yearly)}/yr` },
                      { feature: "Organisation seat (avg.)", driver: "Custom bundles", cost: `${formatCurrency(costModel.org_seat_average)}/mo avg.` },
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="py-3 px-4 font-medium">{row.feature}</td>
                        <td className="py-3 px-4 text-muted-foreground">{row.driver}</td>
                        <td className="py-3 px-4 text-right">{row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4" data-testid="text-projections">Revenue Projections at Scale</h2>
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="org-percent" className="text-sm">Organisation seat % of total users</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="org-percent"
                      type="number"
                      min={0}
                      max={100}
                      value={orgPercent}
                      onChange={(e) => setOrgPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-24"
                      data-testid="input-org-percent"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="missed-rate" className="text-sm">Daily missed check-in rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="missed-rate"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={missedRate}
                      onChange={(e) => setMissedRate(Math.min(1, Math.max(0, Number(e.target.value))))}
                      className="w-24"
                      data-testid="input-missed-rate"
                    />
                    <span className="text-sm text-muted-foreground">(0.05 = 5%)</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="ai-rate" className="text-sm">Daily AI chat usage rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="ai-rate"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={aiUsageRate}
                      onChange={(e) => setAiUsageRate(Math.min(1, Math.max(0, Number(e.target.value))))}
                      className="w-24"
                      data-testid="input-ai-rate"
                    />
                    <span className="text-sm text-muted-foreground">(0.10 = 10%)</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="supervisor-rate" className="text-sm">Daily supervisor call rate (org)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="supervisor-rate"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={supervisorCallRate}
                      onChange={(e) => setSupervisorCallRate(Math.min(1, Math.max(0, Number(e.target.value))))}
                      className="w-24"
                      data-testid="input-supervisor-rate"
                    />
                    <span className="text-sm text-muted-foreground">(0.05 = 5%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Total Users</th>
                      <th className="text-left py-3 px-4 font-medium">Individual</th>
                      <th className="text-left py-3 px-4 font-medium">Org Seats</th>
                      <th className="text-left py-3 px-4 font-medium">Monthly Rev.</th>
                      <th className="text-left py-3 px-4 font-medium">Annual Rev.</th>
                      <th className="text-left py-3 px-4 font-medium">Monthly Costs</th>
                      <th className="text-left py-3 px-4 font-medium">Annual Costs</th>
                      <th className="text-left py-3 px-4 font-medium">Annual Profit</th>
                      <th className="text-left py-3 px-4 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaleProjections.map((p, i) => (
                      <ProjectionRow
                        key={i}
                        projection={p}
                        highlight={p.totalUsers === 1000 || p.totalUsers === 5000 || p.totalUsers === 10000}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-custom-calc">Custom Calculator</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Enter User Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={customUsers}
                  onChange={(e) => setCustomUsers(Math.max(1, Number(e.target.value)))}
                  data-testid="input-custom-users"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Using {orgPercent}% org seats, {(missedRate * 100).toFixed(0)}% missed rate, {(aiUsageRate * 100).toFixed(0)}% AI usage, {(supervisorCallRate * 100).toFixed(0)}% supervisor calls
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Projection for {customUsers.toLocaleString()} Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(customProjection.monthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Revenue</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(customProjection.annualRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Costs</p>
                    <p className="text-lg font-bold">{formatCurrency(customProjection.monthlyCosts.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gross Margin</p>
                    <p className="text-lg font-bold text-green-600">{customProjection.grossMargin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Profit</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(customProjection.annualProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hosting</p>
                    <p className="text-lg font-bold">{formatCurrency(customProjection.monthlyCosts.hosting)}/mo</p>
                    <p className="text-xs text-muted-foreground">{customProjection.monthlyCosts.hostingDesc}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Twilio</p>
                    <p className="text-lg font-bold">{formatCurrency(customProjection.monthlyCosts.twilio)}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ecologi (one-off)</p>
                    <p className="text-lg font-bold">{formatCurrency(customProjection.ecologiOneOff)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Cost Efficiency
                </h3>
                <p className="text-sm text-muted-foreground">
                  Most costs are event-driven. Users who check in on time cost almost nothing beyond hosting.
                  SMS and voice calls only trigger on missed check-ins, keeping variable costs low.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-green-600" />
                  Ecologi Investment
                </h3>
                <p className="text-sm text-muted-foreground">
                  At {formatCurrency(costModel.ecologi_per_signup)} per signup, Ecologi is a one-time cost per user. It's a marketing differentiator
                  that adds minimal impact to ongoing costs but boosts brand perception.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  Twilio is the Biggest Variable
                </h3>
                <p className="text-sm text-muted-foreground">
                  SMS ({formatCurrency(costModel.sms_per_unit)}/msg) and voice ({formatCurrency(costModel.voice_call_per_unit)}/call) are the largest per-event costs. Keeping missed check-in rates
                  below 5% is critical for maintaining healthy margins. The Call Supervisor feature adds voice costs per org seat.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Org Seats: Lower Revenue, Lower Cost
                </h3>
                <p className="text-sm text-muted-foreground">
                  Organisation seats average {formatCurrency(costModel.org_seat_average)}/month vs {formatCurrency(costModel.individual_monthly)} for individuals. However, organisations
                  have lower churn, higher lifetime value, and more predictable revenue. They also bring supervisor
                  call costs but provide the most scalable revenue stream.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}