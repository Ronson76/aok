import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, ArrowLeft, Shield, Heart, AlertTriangle,
  CheckCircle, Building2, Users, Clock, Gift,
  BarChart3, ShieldCheck, ChevronRight, Mail,
  Home as HomeIcon, Coins, Star, Award, Target,
  FileCheck, Wallet, PoundSterling
} from "lucide-react";

const rewardStructure = [
  { behaviour: "On-time rent payment", reward: "200 points", icon: CheckCircle },
  { behaviour: "6 months consistent", reward: "£20 voucher", icon: Award },
  { behaviour: "12 months consistent", reward: "£50 voucher", icon: Star },
  { behaviour: "Maintenance reporting", reward: "50 points", icon: FileCheck },
  { behaviour: "Check-ins / wellbeing engagement", reward: "30 points", icon: Heart },
];

const rewardTypes = [
  "Supermarket vouchers",
  "Travel cards",
  "Phone credit",
  "Council tax credit",
  "Rent discount after milestones",
];

export default function RentScore() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className="gap-2" asChild data-testid="button-back-home">
            <Link href="/organisations">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-lg" data-testid="text-rentscore-brand">RentScore</span>
            <Badge variant="secondary" className="text-xs">by aok</Badge>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild data-testid="button-register-interest-nav">
            <a href="mailto:help@aok.care?subject=RentScore%20-%20Register%20Interest">
              Register Interest
            </a>
          </Button>
        </div>
      </nav>

      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100" data-testid="badge-trademark">
            Coming Soon
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" data-testid="text-hero-title">
            RentScore<span className="text-emerald-600">™</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Rewarding Responsible Tenancy
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Paying rent on time should mean more than avoiding arrears. With RentScore, tenants build a digital reliability score, unlock real rewards, and create a positive tenancy record that supports financial stability and wellbeing.
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-10">
            For housing providers, RentScore generates real-time governance data, improving safeguarding visibility, tenant engagement, and funding transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto" asChild data-testid="button-register-interest-hero">
              <a href="mailto:help@aok.care?subject=RentScore%20-%20Register%20Interest">
                <Mail className="h-5 w-5" />
                Register Interest
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" asChild data-testid="button-learn-more">
              <a href="#how-it-works">
                <ChevronRight className="h-5 w-5" />
                See How It Works
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Core Idea</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every time rent is paid, the system generates a tenant reliability score, reward points, and a compliance record. That data feeds directly into the aok safeguarding and governance dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="rounded-full bg-emerald-500/10 p-3 w-fit mx-auto mb-4">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-1" data-testid="text-core-payment">Payment History</h3>
                <p className="text-sm text-muted-foreground">Full digital record of every payment made</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="rounded-full bg-blue-500/10 p-3 w-fit mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-1" data-testid="text-core-engagement">Engagement Score</h3>
                <p className="text-sm text-muted-foreground">Behavioural stability indicators</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1" data-testid="text-core-safeguarding">Safeguarding Footprint</h3>
                <p className="text-sm text-muted-foreground">Digital safeguarding and compliance record</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="rounded-full bg-orange-500/10 p-3 w-fit mx-auto mb-4">
                  <Gift className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-1" data-testid="text-core-rewards">Reward Points</h3>
                <p className="text-sm text-muted-foreground">Real rewards for responsible tenancy</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100">
              Tenant View
            </Badge>
            <h2 className="text-3xl font-bold mb-4">What the Tenant Sees</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Inside the aok app, tenants have a clear view of their score, rewards, and progress.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <Card className="shadow-xl border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">Tenant Dashboard</CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100">
                    Demo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-6 rounded-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <p className="text-sm text-muted-foreground mb-1">Your RentScore</p>
                  <p className="text-5xl font-bold text-emerald-600" data-testid="text-demo-rentscore">742</p>
                  <p className="text-sm text-muted-foreground mt-1">out of 850</p>
                  <div className="w-48 h-2 bg-muted rounded-full mx-auto mt-3">
                    <div className="h-2 bg-emerald-500 rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border p-4 text-center">
                    <Clock className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold" data-testid="text-demo-months">11</p>
                    <p className="text-xs text-muted-foreground">Months on time</p>
                  </div>
                  <div className="rounded-md border p-4 text-center">
                    <Coins className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold" data-testid="text-demo-points">2,400</p>
                    <p className="text-xs text-muted-foreground">Reward points</p>
                  </div>
                </div>

                <div className="rounded-md border p-4 flex items-center gap-4">
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
                    <Gift className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm" data-testid="text-demo-next-reward">Next Reward Unlock</p>
                    <p className="text-muted-foreground text-sm">£25 grocery voucher — 100 points away</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold">How Points Are Earned</h3>
              <div className="space-y-3">
                {rewardStructure.map((item, index) => (
                  <Card key={index} className="border shadow-sm">
                    <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-sm" data-testid={`text-reward-behaviour-${index}`}>{item.behaviour}</span>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700" data-testid={`text-reward-value-${index}`}>
                        {item.reward}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">Rewards Include</h3>
                <div className="flex flex-wrap gap-2">
                  {rewardTypes.map((reward, index) => (
                    <Badge key={index} variant="secondary" className="text-sm py-1" data-testid={`badge-reward-type-${index}`}>
                      {reward}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100">
              Housing Provider View
            </Badge>
            <h2 className="text-3xl font-bold mb-4">What the Housing Association Sees</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              In the aok GRC dashboard, housing providers get tenant reliability metrics that feed directly into governance and funding reports.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <Card className="shadow-lg border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-semibold">Tenant Trust Score</h3>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100" data-testid="badge-trust-green">
                    Green — Stable
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-muted-foreground">Green — Stable, consistent behaviour</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-muted-foreground">Amber — Inconsistent, monitor closely</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">Red — Risk, intervention needed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Payment Reliability</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">On-time rate</span>
                    <span className="font-bold text-emerald-600" data-testid="text-demo-ontime">96%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full">
                    <div className="h-2 bg-emerald-500 rounded-full" style={{ width: "96%" }} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Missed payments</span>
                    <span className="font-medium text-amber-600" data-testid="text-demo-missed">3</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Vulnerability flags</span>
                    <span className="font-medium text-red-600" data-testid="text-demo-flags">2</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Engagement Metrics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">RentScore</span>
                    <span className="font-bold" data-testid="text-demo-score-grc">742 / 850</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Engagement score</span>
                    <span className="font-bold text-blue-600">High</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Safeguarding alerts</span>
                    <span className="font-bold text-emerald-600">0 active</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Financial vulnerability</span>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">Low</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 shadow-lg">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3 shrink-0">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">This Becomes Funding Evidence</h3>
                  <p className="text-sm text-muted-foreground">
                    Local authorities and commissioners value this data because it proves tenant engagement, digital inclusion, safeguarding oversight, and financial behaviour improvement — all in one auditable system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-100">
              Safeguarding Intelligence
            </Badge>
            <h2 className="text-3xl font-bold mb-4">The Safeguarding Angle</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Missed rent often correlates with mental health decline, substance misuse, domestic issues, and financial distress. RentScore turns payment data into early-warning safeguarding intelligence.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <Card className="shadow-xl border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Automatic Safeguarding Trigger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium mb-3">If:</p>
                  <div className="space-y-2 ml-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-sm">Rent missed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-sm">AND no aok activity for 10 days</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2">Then:</p>
                  <div className="ml-4">
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100" data-testid="badge-soft-alert">
                      Soft safeguarding alert created
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  A soft alert suggests a wellbeing check without escalating — giving key workers the prompt to intervene early, before a situation deteriorates.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Designed For</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "Hostels", icon: HomeIcon },
                  { name: "YMCA", icon: Building2 },
                  { name: "Supported Housing", icon: Shield },
                  { name: "Care Leavers", icon: Heart },
                  { name: "Homelessness Services", icon: Users },
                  { name: "Social Housing", icon: Building2 },
                ].map((org, index) => (
                  <Card key={index} className="border shadow-sm">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <org.icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium" data-testid={`text-org-type-${index}`}>{org.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="py-4">
                  <h4 className="font-semibold text-sm mb-2">Why This Matters</h4>
                  <p className="text-sm text-muted-foreground">
                    Most rent apps only do payments and reminders. RentScore combines payment data with safeguarding intelligence and governance reporting. That's what makes organisations adopt it.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-100">
              Funding
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Funding Opportunity</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Housing providers can position RentScore as a digital tenancy stability programme, unlocking multiple funding streams.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Supported Housing Improvement Programme",
              "Social Housing Digitalisation Fund",
              "Safeguarding Innovation Grants",
              "Homelessness Prevention Funding",
            ].map((fund, index) => (
              <Card key={index} className="border-0 shadow-lg text-center">
                <CardContent className="pt-6">
                  <div className="rounded-full bg-purple-500/10 p-3 w-fit mx-auto mb-4">
                    <PoundSterling className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium" data-testid={`text-funding-${index}`}>{fund}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-10 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 shadow-lg">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Because you're proving behaviour change and safeguarding oversight — exactly what funding bodies and commissioners need to see.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100">
              Commercial Model
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              RentScore is a bolt-on module to the aok Safeguarding Platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg">aok Safeguarding Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <span className="text-4xl font-bold" data-testid="text-price-platform">£19.99</span>
                  <span className="text-muted-foreground"> / user / month</span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Full safeguarding, check-in, alerting, and governance platform for your organisation.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-500/20">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">RentScore Module</CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100">
                    Add-on
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <span className="text-4xl font-bold text-emerald-600" data-testid="text-price-rentscore">£3</span>
                  <span className="text-muted-foreground"> / tenant / month</span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Tenant reliability scoring, rewards, and safeguarding intelligence.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-10 max-w-3xl mx-auto shadow-lg border-0 bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-center">Example: Housing Association with 2,000 Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 py-2 border-b">
                  <span className="text-sm">Base platform (£19.99 x 2,000 users)</span>
                  <span className="font-bold" data-testid="text-calc-base">£39,980/month</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2 border-b">
                  <span className="text-sm">RentScore module (£3 x 2,000 tenants)</span>
                  <span className="font-bold text-emerald-600" data-testid="text-calc-rentscore">£6,000/month</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-xl font-bold" data-testid="text-calc-total">~£45,980/month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-cta-title">
            Interested in RentScore?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            We're building RentScore for forward-thinking housing providers who want to combine tenant engagement with safeguarding intelligence. Register your interest and we'll be in touch.
          </p>
          <Button size="lg" variant="secondary" className="gap-2 text-emerald-800" asChild data-testid="button-register-interest-cta">
            <a href="mailto:help@aok.care?subject=RentScore%20-%20Register%20Interest&body=Organisation%20name:%0ATenants%20managed:%0AContact%20name:%0APhone%20number:%0A%0APlease%20send%20me%20more%20information%20about%20RentScore.">
              <Mail className="h-5 w-5" />
              Register Interest — help@aok.care
            </a>
          </Button>
          <p className="text-sm opacity-70 mt-4">
            Or email us directly at help@aok.care
          </p>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium">RentScore by aok</span>
          </div>
          <p className="text-xs text-muted-foreground">
            RentScore is a concept by aok.care. All features described are subject to development.
          </p>
          <Button variant="ghost" size="sm" asChild data-testid="button-back-footer">
            <Link href="/organisations">
              Back to aok
            </Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
