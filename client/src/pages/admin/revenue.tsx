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
  ShieldCheck, ArrowLeft, LogOut, TrendingUp, Users,
  PoundSterling, TreePine, Phone, Mail, Headphones,
  Server, CreditCard, Calculator, BarChart3, Percent,
  Save, RotateCcw, Settings2, Pencil, Check, Building2,
  Crown, Star, CalendarDays
} from "lucide-react";
import type { DashboardStats, PricingConfig } from "@shared/schema";

interface CostModel {
  sms_per_unit: number;
  voice_call_per_unit: number;
  email_per_unit: number;
  emergency_alert_per_unit: number;
  ai_chat_per_conversation: number;
  ai_voice_per_session: number;
  ecologi_per_signup: number;
  stripe_fee_percent: number;
  stripe_fee_fixed: number;
  tier1_monthly: number;
  tier1_yearly: number;
  tier2_monthly: number;
  tier2_yearly: number;
  tier3_monthly: number;
  tier3_yearly: number;
  org_monthly: number;
  org_yearly: number;
  individual_monthly: number;
  individual_yearly: number;
  org_seat_average: number;
}

const DEFAULT_COST_MODEL: CostModel = {
  sms_per_unit: 0.04,
  voice_call_per_unit: 0.12,
  email_per_unit: 0.001,
  emergency_alert_per_unit: 0.20,
  ai_chat_per_conversation: 0.03,
  ai_voice_per_session: 0.04,
  ecologi_per_signup: 0.60,
  stripe_fee_percent: 1.4,
  stripe_fee_fixed: 0.20,
  tier1_monthly: 9.99,
  tier1_yearly: 99.99,
  tier2_monthly: 16.99,
  tier2_yearly: 169.99,
  tier3_monthly: 14.99,
  tier3_yearly: 149.99,
  org_monthly: 7.99,
  org_yearly: 79.99,
  individual_monthly: 8.49,
  individual_yearly: 84.99,
  org_seat_average: 4.99,
};

function buildCostModel(pricingData: PricingConfig[] | undefined): CostModel {
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

type PricingTab = "tier1" | "tier2" | "tier3" | "org" | "annual";

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
    emailHosting: number;
    total: number;
  };
  ecologiOneOff: number;
  annualCosts: number;
  annualProfit: number;
  grossMargin: number;
  revenuePerUser: number;
}

type TierPcts = { tier1: number; tier2: number; tier3: number; org: number };

function calculateProjection(
  totalUsers: number,
  tierPcts: TierPcts,
  missedCheckinRate: number,
  aiUsageRate: number,
  supervisorCallRate: number,
  costModel: CostModel,
  activeTabs: Set<PricingTab>,
  annualSeats: number = 2000,
  annualFlatFee: number = 10000
): ProjectionResult {
  const useAnnual = activeTabs.has("annual");

  const t1Users = activeTabs.has("tier1") ? Math.round(totalUsers * (tierPcts.tier1 / 100)) : 0;
  const t2Users = activeTabs.has("tier2") ? Math.round(totalUsers * (tierPcts.tier2 / 100)) : 0;
  const t3Users = activeTabs.has("tier3") ? Math.round(totalUsers * (tierPcts.tier3 / 100)) : 0;
  const orgSeats = activeTabs.has("org") ? Math.round(totalUsers * (tierPcts.org / 100)) : 0;
  const individualUsers = t1Users + t2Users + t3Users;

  let monthlyRevenue: number;
  let annualRevenue: number;

  monthlyRevenue =
    t1Users * costModel.tier1_monthly +
    t2Users * costModel.tier2_monthly +
    t3Users * costModel.tier3_monthly +
    orgSeats * costModel.org_monthly;

  if (useAnnual && annualSeats > 0) {
    const perSeatMonthly = annualFlatFee / annualSeats;
    monthlyRevenue += perSeatMonthly * totalUsers;
  }

  annualRevenue = monthlyRevenue * 12;

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
  const emailHostingMonthly = 11.99;

  const totalMonthlyCosts = hosting.cost + twilioMonthly + resendMonthly + openaiMonthly + stripeMonthly + emailHostingMonthly;
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
      emailHosting: emailHostingMonthly,
      total: totalMonthlyCosts,
    },
    ecologiOneOff,
    annualCosts,
    annualProfit,
    grossMargin,
    revenuePerUser: totalUsers > 0 ? monthlyRevenue / totalUsers : 0,
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

const TAB_CONFIG: { id: PricingTab; label: string; icon: React.ElementType; monthlyKey: string; yearlyKey: string; color: string }[] = [
  { id: "tier1", label: "Tier 1", icon: Check, monthlyKey: "tier1_monthly", yearlyKey: "tier1_yearly", color: "text-green-600" },
  { id: "tier2", label: "Tier 2", icon: Star, monthlyKey: "tier2_monthly", yearlyKey: "tier2_yearly", color: "text-blue-600" },
  { id: "tier3", label: "Tier 3", icon: Crown, monthlyKey: "tier3_monthly", yearlyKey: "tier3_yearly", color: "text-purple-600" },
  { id: "org", label: "Organisation", icon: Building2, monthlyKey: "org_monthly", yearlyKey: "org_yearly", color: "text-indigo-600" },
  { id: "annual", label: "Annual", icon: CalendarDays, monthlyKey: "individual_monthly", yearlyKey: "individual_yearly", color: "text-amber-600" },
];

function PricingTabs({
  costModel,
  activeTabs,
  setActiveTabs,
  pricingData,
  isSuperAdmin,
  annualSeatsStr,
  setAnnualSeatsStr,
  annualFlatFeeStr,
  setAnnualFlatFeeStr,
  annualSeats,
  annualFlatFee,
}: {
  costModel: CostModel;
  activeTabs: Set<PricingTab>;
  setActiveTabs: (tabs: Set<PricingTab>) => void;
  pricingData: PricingConfig[] | undefined;
  isSuperAdmin: boolean;
  annualSeatsStr: string;
  setAnnualSeatsStr: (s: string) => void;
  annualFlatFeeStr: string;
  setAnnualFlatFeeStr: (s: string) => void;
  annualSeats: number;
  annualFlatFee: number;
}) {
  const { toast } = useToast();
  const [editingTab, setEditingTab] = useState<PricingTab | null>(null);
  const [editMonthly, setEditMonthly] = useState("");
  const [editYearly, setEditYearly] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (updates: { key: string; value: number }[]) => {
      const res = await apiRequest("PUT", "/api/admin/pricing", { updates });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
      toast({ title: "Pricing updated", description: "Price saved successfully." });
      setEditingTab(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pricing.", variant: "destructive" });
    },
  });

  const toggleTab = (tabId: PricingTab) => {
    const next = new Set(activeTabs);
    if (next.has(tabId)) {
      next.delete(tabId);
    } else {
      next.add(tabId);
    }
    setActiveTabs(next);
  };

  const startEditing = (tab: typeof TAB_CONFIG[0]) => {
    setEditMonthly((costModel as any)[tab.monthlyKey]?.toString() || "0");
    setEditYearly((costModel as any)[tab.yearlyKey]?.toString() || "0");
    setEditingTab(tab.id);
  };

  const handleSave = (tab: typeof TAB_CONFIG[0]) => {
    const monthlyVal = parseFloat(editMonthly);
    if (isNaN(monthlyVal) || monthlyVal < 0) {
      toast({ title: "Invalid value", description: "Please enter a valid number.", variant: "destructive" });
      return;
    }
    const updates: { key: string; value: number }[] = [];
    if ((costModel as any)[tab.monthlyKey] !== monthlyVal) {
      updates.push({ key: tab.monthlyKey, value: monthlyVal });
    }
    if (updates.length === 0) {
      setEditingTab(null);
      return;
    }
    saveMutation.mutate(updates);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-pricing-config">
            <Settings2 className="w-5 h-5" />
            Revenue Pricing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select pricing tiers to model revenue. Click a tab to include it in projections. {isSuperAdmin ? "Double-click to edit prices." : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTabs.has(tab.id);
          const isEditing = editingTab === tab.id;
          const Icon = tab.icon;

          const monthlyPrice = tab.monthlyKey ? (costModel as any)[tab.monthlyKey] : 0;

          return (
            <Card
              key={tab.id}
              className={`cursor-pointer transition-all relative ${
                isActive
                  ? "ring-2 ring-primary border-primary"
                  : "opacity-60 hover:opacity-80"
              }`}
              onClick={() => {
                if (!isEditing) toggleTab(tab.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isSuperAdmin && tab.id !== "annual") startEditing(tab);
              }}
              data-testid={`tab-pricing-${tab.id}`}
            >
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              )}
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span className="text-sm font-semibold">{tab.label}</span>
                </div>

                {tab.id === "annual" ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <Label className="text-xs text-muted-foreground">Flat Monthly Fee</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">£</span>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={annualFlatFeeStr}
                          onChange={(e) => setAnnualFlatFeeStr(e.target.value)}
                          className="h-7 text-sm"
                          data-testid="input-annual-flat-fee"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Seats</Label>
                      <Input
                        type="number"
                        min="1"
                        value={annualSeatsStr}
                        onChange={(e) => setAnnualSeatsStr(e.target.value)}
                        className="h-7 text-sm mt-1"
                        data-testid="input-annual-seats"
                      />
                    </div>
                    <div className="pt-1 border-t">
                      <div className="text-lg font-bold" data-testid="text-annual-per-seat">
                        {formatCurrency(annualSeats > 0 ? annualFlatFee / annualSeats : 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">/month per user</div>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Price</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editMonthly}
                          onChange={(e) => setEditMonthly(e.target.value)}
                          className="h-7 text-sm"
                          data-testid={`input-pricing-${tab.monthlyKey}`}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={(e) => { e.stopPropagation(); handleSave(tab); }}
                        disabled={saveMutation.isPending}
                        data-testid={`button-pricing-save-${tab.id}`}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1"
                        onClick={(e) => { e.stopPropagation(); setEditingTab(null); }}
                        data-testid={`button-pricing-cancel-${tab.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-bold" data-testid={`text-pricing-value-${tab.monthlyKey}`}>
                      {formatCurrency(monthlyPrice)}
                    </div>
                    <div className="text-xs text-muted-foreground">/month per user</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Active:</span>
        {Array.from(activeTabs).map((tabId) => {
          const tab = TAB_CONFIG.find(t => t.id === tabId);
          return tab ? (
            <Badge key={tabId} variant="secondary" className="text-xs">
              {tab.label}
            </Badge>
          ) : null;
        })}
        {activeTabs.size === 0 && <span className="italic">No tiers selected — using default individual pricing</span>}
      </div>
    </div>
  );
}

function CostEditor({
  pricingData,
  isSuperAdmin,
}: {
  pricingData: PricingConfig[] | undefined;
  isSuperAdmin: boolean;
}) {
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
      toast({ title: "Costs updated", description: "All cost changes have been saved." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update costs.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const costItems = pricingData?.filter(p => p.category === "costs") || [];
    const updates: { key: string; value: number }[] = [];
    for (const item of costItems) {
      const numVal = parseFloat(editValues[item.key] || "0");
      if (isNaN(numVal) || numVal < 0) {
        toast({ title: "Invalid value", description: "Please enter valid numbers.", variant: "destructive" });
        return;
      }
      if (item.value !== numVal) {
        updates.push({ key: item.key, value: numVal });
      }
    }
    if (updates.length === 0) {
      setIsEditing(false);
      return;
    }
    saveMutation.mutate(updates);
  };

  if (!pricingData) return null;

  const costItems = pricingData.filter(p => p.category === "costs");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Per-Unit Costs
        </CardTitle>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); if (pricingData) { const v: Record<string, string> = {}; for (const item of pricingData) v[item.key] = item.value.toString(); setEditValues(v); } }} data-testid="button-costs-cancel">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-costs-save">
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-costs-edit">
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {costItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-2">
              <Label className="text-sm flex-1 min-w-0" data-testid={`label-pricing-${item.key}`}>
                {item.label}
                {item.key === "stripe_fee_percent" && <span className="text-muted-foreground ml-1">(%)</span>}
              </Label>
              <div className="flex items-center gap-1">
                {item.key !== "stripe_fee_percent" && <span className="text-xs text-muted-foreground">£</span>}
                {isEditing ? (
                  <Input
                    type="number"
                    step={item.key === "email_per_unit" ? "0.001" : "0.01"}
                    min="0"
                    value={editValues[item.key] || ""}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                    className="w-20 text-right text-sm"
                    data-testid={`input-pricing-${item.key}`}
                  />
                ) : (
                  <span className="text-sm font-semibold w-20 text-right inline-block" data-testid={`text-pricing-value-${item.key}`}>
                    {item.key === "stripe_fee_percent" ? `${item.value}%` : item.value.toFixed(item.key === "email_per_unit" ? 3 : 2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminRevenue() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [customUsersStr, setCustomUsersStr] = useState("1000");
  const customUsers = parseInt(customUsersStr) || 0;
  const [tierPctStrs, setTierPctStrs] = useState({ tier1: "30", tier2: "30", tier3: "10", org: "30" });
  const tierPcts: TierPcts = {
    tier1: parseFloat(tierPctStrs.tier1) || 0,
    tier2: parseFloat(tierPctStrs.tier2) || 0,
    tier3: parseFloat(tierPctStrs.tier3) || 0,
    org: parseFloat(tierPctStrs.org) || 0,
  };
  const [missedRateStr, setMissedRateStr] = useState("0.05");
  const missedRate = parseFloat(missedRateStr) || 0;
  const [aiUsageRateStr, setAiUsageRateStr] = useState("0.1");
  const aiUsageRate = parseFloat(aiUsageRateStr) || 0;
  const [supervisorCallRateStr, setSupervisorCallRateStr] = useState("0.05");
  const supervisorCallRate = parseFloat(supervisorCallRateStr) || 0;
  const [activeTabs, setActiveTabs] = useState<Set<PricingTab>>(() => new Set<PricingTab>(["tier1", "tier2"]));
  const [annualSeatsStr, setAnnualSeatsStr] = useState("2000");
  const [annualFlatFeeStr, setAnnualFlatFeeStr] = useState("13000");
  const annualSeats = parseInt(annualSeatsStr) || 0;
  const annualFlatFee = parseFloat(annualFlatFeeStr) || 0;

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const isSuperAdmin = admin?.role === "super_admin";

  const { data: pricingData } = useQuery<PricingConfig[]>({
    queryKey: ["/api/admin/pricing"],
  });

  const costModel = useMemo(() => buildCostModel(pricingData), [pricingData]);

  const liveOverview = useMemo(() => {
    if (!stats) return null;
    const total = stats.totalUsers || 1;
    const orgPct = total > 0 ? ((stats.totalSeatsUsed || 0) / total) * 100 : 0;
    const missRate = stats.totalCheckIns > 0
      ? (stats.totalMissedCheckIns / (stats.totalCheckIns + stats.totalMissedCheckIns))
      : 0.05;
    const noRevenueTabs = new Set<PricingTab>();
    const livePcts: TierPcts = { tier1: 100 - orgPct, tier2: 0, tier3: 0, org: orgPct };
    return calculateProjection(total, livePcts, missRate, aiUsageRate, supervisorCallRate, costModel, noRevenueTabs, 0, 0);
  }, [stats, aiUsageRate, supervisorCallRate, costModel]);

  const scaleProjections = useMemo(() => {
    return [500, 1000, 2500, 5000, 10000, 25000, 50000].map(
      (n) => calculateProjection(n, tierPcts, missedRate, aiUsageRate, supervisorCallRate, costModel, activeTabs, annualSeats, annualFlatFee)
    );
  }, [tierPcts, missedRate, aiUsageRate, supervisorCallRate, costModel, activeTabs, annualSeats, annualFlatFee]);

  const customProjection = useMemo(() => {
    return calculateProjection(customUsers, tierPcts, missedRate, aiUsageRate, supervisorCallRate, costModel, activeTabs, annualSeats, annualFlatFee);
  }, [customUsers, tierPcts, missedRate, aiUsageRate, supervisorCallRate, costModel, activeTabs, annualSeats, annualFlatFee]);

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
        <PricingTabs
          costModel={costModel}
          activeTabs={activeTabs}
          setActiveTabs={setActiveTabs}
          pricingData={pricingData}
          isSuperAdmin={isSuperAdmin}
          annualSeatsStr={annualSeatsStr}
          setAnnualSeatsStr={setAnnualSeatsStr}
          annualFlatFeeStr={annualFlatFeeStr}
          setAnnualFlatFeeStr={setAnnualFlatFeeStr}
          annualSeats={annualSeats}
          annualFlatFee={annualFlatFee}
        />

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
          ) : stats && liveOverview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                subtitle={`${stats.totalIndividuals} individual, ${stats.totalSeatsUsed || 0} org seats`}
                icon={Users}
              />
              <StatCard
                title="Actual Monthly Revenue"
                value={formatCurrency(liveOverview.monthlyRevenue)}
                subtitle={liveOverview.monthlyRevenue === 0 ? "All users on free accounts" : `${formatCurrency(liveOverview.annualRevenue)}/year`}
                icon={PoundSterling}
              />
              <StatCard
                title="Actual Monthly Costs"
                value={formatCurrency(liveOverview.monthlyCosts.total)}
                subtitle={liveOverview.monthlyCosts.hostingDesc}
                icon={Server}
              />
              <StatCard
                title="Net Position"
                value={formatCurrency(liveOverview.monthlyRevenue - liveOverview.monthlyCosts.total)}
                subtitle={`${formatCurrency(liveOverview.annualProfit)}/year`}
                icon={Percent}
                trend={liveOverview.annualProfit >= 0 ? "up" : "neutral"}
              />
            </div>
          ) : null}
        </section>

        {stats && liveOverview && (
          <section>
            <h2 className="text-lg font-semibold mb-4" data-testid="text-current-costs">Current Monthly Cost Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Hosting</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(liveOverview.monthlyCosts.hosting)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{liveOverview.monthlyCosts.hostingDesc}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Twilio (SMS + Voice)</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(liveOverview.monthlyCosts.twilio)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Missed check-in alerts + Call Supervisor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Resend (Email)</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(liveOverview.monthlyCosts.resend)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Alerts & notifications</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">OpenAI (AI Chat)</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(liveOverview.monthlyCosts.openai)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Wellbeing AI + voice</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Stripe Fees</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(liveOverview.monthlyCosts.stripe)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{costModel.stripe_fee_percent}% + {formatCurrency(costModel.stripe_fee_fixed)} per transaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Email Hosting</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(liveOverview.monthlyCosts.emailHosting)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Business mailboxes (aok.care)</p>
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

        {isSuperAdmin && (
          <section>
            <CostEditor pricingData={pricingData} isSuperAdmin={isSuperAdmin} />
          </section>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4" data-testid="text-projections">Revenue Projections at Scale</h2>
          <Card className="mb-6">
            <CardContent className="pt-4">
              {(() => {
                const activeKeys = (["tier1", "tier2", "tier3", "org"] as const).filter(k => activeTabs.has(k));
                const pctTotal = activeKeys.reduce((sum, k) => sum + tierPcts[k], 0);
                const isValid = Math.abs(pctTotal - 100) < 0.01;
                const pctLabels: Record<string, string> = { tier1: "T1 %", tier2: "T2 %", tier3: "T3 %", org: "Org %" };
                return activeKeys.length > 0 ? (
                  <div className="mb-4">
                    <Label className="text-sm font-medium">User distribution across active tiers</Label>
                    <div className="flex items-center flex-wrap gap-3 mt-2">
                      {activeKeys.map(k => (
                        <div key={k} className="flex items-center gap-1">
                          <Label htmlFor={`pct-${k}`} className="text-xs text-muted-foreground whitespace-nowrap">{pctLabels[k]}</Label>
                          <Input
                            id={`pct-${k}`}
                            type="text"
                            inputMode="numeric"
                            value={tierPctStrs[k]}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setTierPctStrs(prev => ({ ...prev, [k]: raw }));
                            }}
                            className="w-20"
                            data-testid={`input-pct-${k}`}
                          />
                        </div>
                      ))}
                      <span className={`text-sm font-medium ${isValid ? "text-green-600 dark:text-green-400" : "text-destructive"}`} data-testid="text-pct-total">
                        = {pctTotal.toFixed(0)}%{!isValid && " (must equal 100%)"}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="missed-rate" className="text-sm">Daily missed check-in rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="missed-rate"
                      type="text"
                      inputMode="decimal"
                      value={missedRateStr}
                      onChange={(e) => setMissedRateStr(e.target.value.replace(/[^0-9.]/g, ""))}
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
                      type="text"
                      inputMode="decimal"
                      value={aiUsageRateStr}
                      onChange={(e) => setAiUsageRateStr(e.target.value.replace(/[^0-9.]/g, ""))}
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
                      type="text"
                      inputMode="decimal"
                      value={supervisorCallRateStr}
                      onChange={(e) => setSupervisorCallRateStr(e.target.value.replace(/[^0-9.]/g, ""))}
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
                  type="text"
                  inputMode="numeric"
                  value={customUsersStr}
                  onChange={(e) => setCustomUsersStr(e.target.value.replace(/[^0-9]/g, ""))}
                  data-testid="input-custom-users"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Using {(["tier1", "tier2", "tier3", "org"] as const).filter(k => activeTabs.has(k)).map(k => `${k === "org" ? "Org" : k.toUpperCase()}: ${tierPcts[k]}%`).join(", ") || "no tiers selected"}, {(missedRate * 100).toFixed(0)}% missed rate, {(aiUsageRate * 100).toFixed(0)}% AI usage, {(supervisorCallRate * 100).toFixed(0)}% supervisor calls
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
                  Organisation seats at {formatCurrency(costModel.org_monthly)}/month vs individual tiers (T1: {formatCurrency(costModel.tier1_monthly)}, T2: {formatCurrency(costModel.tier2_monthly)}, T3: {formatCurrency(costModel.tier3_monthly)}). Organisations
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
