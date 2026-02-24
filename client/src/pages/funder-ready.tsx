import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, Users, Clock, CheckCircle, Heart, Building2,
  ChevronRight, Shield, Globe, Lock, TrendingUp, Scroll, Check,
  AlertTriangle, ArrowLeft
} from "lucide-react";

export default function FunderReadyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShieldCheck className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-green-600">aok</span>
            </Link>
          </div>
          <Link href="/onboarding">
            <Button size="sm" className="gap-2" data-testid="button-header-get-started">
              Get Started Free
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Funder Ready Safeguarding</Badge>
              <h1 className="text-3xl md:text-5xl font-bold mb-6">GRC-Ready Safeguarding Starts With Evidence</h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-2">
                Policies don't protect people. <span className="font-semibold text-foreground">Operational control does.</span>
              </p>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                AOK turns everyday safeguarding activity into real-time assurance data — giving boards, regulators and funders continuous proof that risk is being actively managed.
              </p>
            </div>

            <Tabs defaultValue="standards" className="space-y-8">
              <div className="overflow-x-auto -mx-4 px-4">
                <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-6">
                  <TabsTrigger value="standards" data-testid="tab-funder-standards">Standards</TabsTrigger>
                  <TabsTrigger value="control" data-testid="tab-funder-control">Live Control</TabsTrigger>
                  <TabsTrigger value="assurance" data-testid="tab-funder-assurance">Assurance</TabsTrigger>
                  <TabsTrigger value="funder" data-testid="tab-funder-ready">Funder Ready</TabsTrigger>
                  <TabsTrigger value="security" data-testid="tab-funder-security">Security</TabsTrigger>
                  <TabsTrigger value="levels" data-testid="tab-funder-levels">Every Level</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="standards" className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-3">Built for the Standards That Matter</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Modern inspection frameworks no longer accept intent. They expect oversight, accountability, and auditable practice.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Ofsted
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Demonstrable safeguarding oversight</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Clear chronology of actions and decisions</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Leadership visibility of risk</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Evidence of safer working practices</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Heart className="h-5 w-5 text-primary" />
                        CQC
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Safe & well-led domains</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Real-time monitoring of risk</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Incident response tracking</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Organisational learning through data</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Charity Commission
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Trustee safeguarding duty</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Defensible governance</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Verifiable risk management</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Serious incident reporting readiness</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Funder Due Diligence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Proven safeguarding delivery</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Measurable control effectiveness</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Audit-ready assurance</li>
                        <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> Risk-managed service provision</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="control" className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-3">From Written Policy to Live Control Monitoring</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Most organisations can show a safeguarding policy. Far fewer can prove it's working.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <Card className="border-2 border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-700 dark:text-red-400">What most organisations can't prove</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> Welfare checks actually happened</li>
                        <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> Escalations followed the correct pathway</li>
                        <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> Response times met internal standards</li>
                        <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> Leadership had real oversight</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-700 dark:text-green-400">AOK makes this visible, measurable and exportable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Every check-in, alert, escalation and response becomes a time-stamped audit record.
                      </p>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Clock className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-400">Not retrospective.</p>
                          <p className="text-2xl font-bold text-green-800 dark:text-green-300">Live.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="assurance" className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-3">Continuous Assurance for Your GRC Framework</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    AOK provides the operational data your governance structure is missing.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">Board-Level Evidence</p>
                      <p className="text-sm text-muted-foreground">Evidence safeguarding at board level in real time</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">Pass Inspections</p>
                      <p className="text-sm text-muted-foreground">Pass inspections with confidence</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">Funding Applications</p>
                      <p className="text-sm text-muted-foreground">Strengthen funding applications</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Clock className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">Always Audit Ready</p>
                      <p className="text-sm text-muted-foreground">Maintain audit readiness at all times</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="text-center mt-4">
                  <p className="text-muted-foreground italic">
                    This is continuous safeguarding control monitoring — aligned to modern GRC expectations.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="funder" className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-3">Funder-Ready Safeguarding</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Funding is now risk-led. Without demonstrable safeguarding, grants are delayed, contracts are lost, and due diligence fails.
                  </p>
                </div>
                <Card className="max-w-2xl mx-auto border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">AOK gives funders and commissioners what they are looking for</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-lg">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <span>Verifiable activity</span>
                      </li>
                      <li className="flex items-center gap-3 text-lg">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <span>Clear accountability</span>
                      </li>
                      <li className="flex items-center gap-3 text-lg">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <span>Documented escalation</span>
                      </li>
                      <li className="flex items-center gap-3 text-lg">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <span>Measurable performance</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-3">Secure by Design</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Safeguarding demands the highest level of information governance. Your operational safeguarding is matched by enterprise-grade data protection.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">ISO 27001-Aligned</p>
                      <p className="text-sm text-muted-foreground">Infrastructure built to international security standards</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Globe className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">UK GDPR Compliance</p>
                      <p className="text-sm text-muted-foreground">Full data protection compliance built in</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Lock className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">Role-Based Access</p>
                      <p className="text-sm text-muted-foreground">Granular access controls for every user level</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Scroll className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold mb-1">Tamper-Resistant Trails</p>
                      <p className="text-sm text-muted-foreground">Audit trails protected against modification</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="levels" className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-3">Assurance at Every Level</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Frontline Teams
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>Simple check-ins. Automatic escalation. Total reliability.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Safeguarding Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>Live oversight. Response tracking. Inspection-ready reporting.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Executives & Trustees
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>Real-time visibility. Defensible governance. Continuous compliance.</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="max-w-3xl mx-auto mt-12 text-center space-y-6">
                  <div className="space-y-3">
                    <p className="text-muted-foreground">Organisations are no longer being asked:</p>
                    <p className="text-lg italic text-muted-foreground">"Do you have a safeguarding policy?"</p>
                    <p className="text-muted-foreground">They are being asked:</p>
                    <p className="text-lg font-semibold">"Can you prove your safeguarding controls are effective — right now?"</p>
                  </div>
                  <div className="pt-6 border-t space-y-2">
                    <p className="font-bold text-xl">AOK Makes That Proof Immediate</p>
                    <p className="text-muted-foreground">Operational safeguarding. Real-time assurance. GRC-ready by design.</p>
                  </div>
                  <div className="pt-6">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6 pb-6">
                        <p className="text-lg font-semibold mb-4">Be inspection-ready. Be funder-ready. Be continuously compliant.</p>
                        <Link href="/onboarding">
                          <Button size="lg" className="gap-2" data-testid="button-funder-cta">
                            Get Started Free
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
}
