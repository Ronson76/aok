import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/contexts/admin-context";
import {
  ShieldCheck, ArrowLeft, LogOut, TrendingUp, Users, DollarSign,
  PoundSterling, TreePine, Phone, Mail, Smartphone, Headphones,
  Server, CreditCard, Calculator, BarChart3, Percent, KeyRound
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";

const COST_MODEL = {
  smsPerUnit: 0.04,
  voiceCallPerUnit: 0.12,
  emailPerUnit: 0.001,
  emergencyAlertPerUnit: 0.20,
  aiChatPerConversation: 0.03,
  aiVoicePerSession: 0.04,
  ecologiPerSignup: 0.60,
  stripeFeePercent: 1.4,
  stripeFeeFixed: 0.20,
  tier1MonthlyPrice: 6.99,
  tier1YearlyPrice: 69.99,
  tier2MonthlyPrice: 9.99,
  tier2YearlyPrice: 99.99,
  individualMonthlyPrice: 8.49,
  individualYearlyPrice: 84.99,
  orgSeatAveragePrice: 4.99,
};

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
  supervisorCallRate: number = 0.05
): ProjectionResult {
  const orgSeats = Math.round(totalUsers * (orgPercent / 100));
  const individualUsers = totalUsers - orgSeats;

  const monthlyRevenue =
    individualUsers * COST_MODEL.individualMonthlyPrice +
    orgSeats * COST_MODEL.orgSeatAveragePrice;

  const annualRevenue = monthlyRevenue * 12;

  const missedPerMonth = totalUsers * missedCheckinRate * 30;
  const twilioMonthlySms = missedPerMonth * COST_MODEL.smsPerUnit;
  const twilioMonthlyVoice = missedPerMonth * 0.3 * COST_MODEL.voiceCallPerUnit;
  const supervisorCallsPerMonth = orgSeats * supervisorCallRate * 30;
  const twilioSupervisor = supervisorCallsPerMonth * COST_MODEL.voiceCallPerUnit;
  const twilioMonthly = twilioMonthlySms + twilioMonthlyVoice + twilioSupervisor;

  const emailsPerMonth = missedPerMonth + totalUsers * 0.5;
  const resendMonthly = emailsPerMonth * COST_MODEL.emailPerUnit;

  const aiSessionsPerMonth = totalUsers * aiUsageRate * 30;
  const openaiMonthly =
    aiSessionsPerMonth * 0.8 * COST_MODEL.aiChatPerConversation +
    aiSessionsPerMonth * 0.2 * COST_MODEL.aiVoicePerSession;

  const stripeMonthly =
    monthlyRevenue * (COST_MODEL.stripeFeePercent / 100) +
    totalUsers * COST_MODEL.stripeFeeFixed;

  const hosting = getHostingCost(totalUsers);

  const totalMonthlyCosts = hosting.cost + twilioMonthly + resendMonthly + openaiMonthly + stripeMonthly;
  const ecologiOneOff = totalUsers * COST_MODEL.ecologiPerSignup;
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

export default function AdminRevenue() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();

  const [customUsers, setCustomUsers] = useState(1000);
  const [orgPercent, setOrgPercent] = useState(30);
  const [missedRate, setMissedRate] = useState(0.05);
  const [aiUsageRate, setAiUsageRate] = useState(0.1);
  const [supervisorCallRate, setSupervisorCallRate] = useState(0.05);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const currentProjection = useMemo(() => {
    if (!stats) return null;
    const total = stats.totalUsers || 1;
    const orgPct = total > 0 ? ((stats.totalSeatsUsed || 0) / total) * 100 : 30;
    const missRate = stats.totalCheckIns > 0
      ? (stats.totalMissedCheckIns / (stats.totalCheckIns + stats.totalMissedCheckIns))
      : 0.05;
    return calculateProjection(total, orgPct, missRate, aiUsageRate, supervisorCallRate);
  }, [stats, aiUsageRate, supervisorCallRate]);

  const scaleProjections = useMemo(() => {
    return [500, 1000, 2500, 5000, 10000, 25000, 50000].map(
      (n) => calculateProjection(n, orgPercent, missedRate, aiUsageRate, supervisorCallRate)
    );
  }, [orgPercent, missedRate, aiUsageRate, supervisorCallRate]);

  const customProjection = useMemo(() => {
    return calculateProjection(customUsers, orgPercent, missedRate, aiUsageRate, supervisorCallRate);
  }, [customUsers, orgPercent, missedRate, aiUsageRate, supervisorCallRate]);

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const isSuperAdmin = admin?.role === "super_admin";

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
                  <p className="text-xs text-muted-foreground mt-1">1.4% + 20p per transaction</p>
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
                      { feature: "SMS check-in reminder", driver: "Twilio SMS", cost: "£0.04" },
                      { feature: "Missed check-in voice call", driver: "Twilio Voice", cost: "£0.08 to £0.15" },
                      { feature: "Email alert", driver: "Resend", cost: "£0.001" },
                      { feature: "Emergency GPS alert", driver: "Twilio + Resend + w3w", cost: "£0.15 to £0.25" },
                      { feature: "Call Supervisor (org clients)", driver: "Twilio Voice", cost: "£0.08 to £0.15" },
                      { feature: "AI Wellbeing Chat", driver: "OpenAI GPT-4o", cost: "£0.01 to £0.05" },
                      { feature: "AI Voice Chat", driver: "OpenAI Whisper + TTS", cost: "£0.02 to £0.06" },
                      { feature: "Strava fitness tracking", driver: "Strava API (free)", cost: "£0.00" },
                      { feature: "Ecologi tree planting", driver: "Ecologi", cost: "£0.60 (one-off)" },
                      { feature: "Payment processing", driver: "Stripe", cost: "1.4% + 20p" },
                      { feature: "Essential Safety subscription", driver: "Tier 1", cost: "£6.99/mo or £69.99/yr" },
                      { feature: "Complete Protection subscription", driver: "Tier 2", cost: "£9.99/mo or £99.99/yr" },
                      { feature: "Organisation seat (avg.)", driver: "Custom bundles", cost: "£4.99/mo avg." },
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Revenue Projection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monthly revenue</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(customProjection.monthlyRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annual revenue</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(customProjection.annualRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ecologi (one-off)</span>
                  <span className="text-sm">{formatCurrency(customProjection.ecologiOneOff)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Profit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annual costs</span>
                  <span className="text-sm">{formatCurrency(customProjection.annualCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annual profit</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(customProjection.annualProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gross margin</span>
                  <Badge variant={customProjection.grossMargin >= 90 ? "default" : "secondary"}>
                    {customProjection.grossMargin.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Detailed Cost Breakdown for {customUsers.toLocaleString()} Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Hosting (Replit)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(customProjection.monthlyCosts.hosting)}/mo</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Twilio (SMS + Voice)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(customProjection.monthlyCosts.twilio)}/mo</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Resend (Email)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(customProjection.monthlyCosts.resend)}/mo</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">OpenAI (AI Chat)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(customProjection.monthlyCosts.openai)}/mo</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Stripe Fees</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(customProjection.monthlyCosts.stripe)}/mo</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <TreePine className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Ecologi (one-off)</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(customProjection.ecologiOneOff)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="font-medium">Total Monthly Running Cost</span>
                <span className="text-lg font-bold">{formatCurrency(customProjection.monthlyCosts.total)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-medium">Total Annual Running Cost</span>
                <span className="text-lg font-bold">{formatCurrency(customProjection.annualCosts)}</span>
              </div>
            </CardContent>
          </Card>
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
                  The £0.60 per tree is a one-time cost per new subscriber, not recurring.
                  It's a strong selling point for environmentally conscious customers and a modest cost relative to lifetime revenue.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-green-600" />
                  Biggest Variable Cost
                </h3>
                <p className="text-sm text-muted-foreground">
                  Twilio (SMS and voice calls) is the largest variable cost.
                  Consider setting check-in reminders to reduce missed check-ins, which directly reduces Twilio spend.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  Organisation Margins
                </h3>
                <p className="text-sm text-muted-foreground">
                  Organisation seats at £4.99/seat still deliver strong margins (over 90%).
                  Volume discounts work because per-user costs decrease at scale while revenue stays predictable.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="text-center py-6">
          <Link href="/admin">
            <Button variant="outline" className="gap-2" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}