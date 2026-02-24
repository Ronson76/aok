import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Check, Lock, Phone, FileText, Heart, Users, Clock, Mail, Bell, AlertTriangle, MapPin, Smartphone, Building2, TrendingUp, PawPrint, Scroll, ArrowLeft, Mic, TreePine, Shield, Headphones } from "lucide-react";

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "7 Day Trial",
      description: "Try all features free for 7 days. No commitment required.",
      note: "After your trial ends, you'll automatically continue unless you cancel.",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        { text: "Full access to all features", icon: Check },
        { text: "No payment details required upfront", icon: Lock },
        { text: "Cancel anytime during trial", icon: Clock },
      ],
      cta: "Start Free Trial",
      ctaLink: "/onboarding",
      highlight: false,
      isTrial: true,
    },
    {
      name: "Essential",
      description: "Core check-in and alert tools for peace of mind.",
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      features: [
        { text: "Flexible check-in timer (5 minutes to 48 hours)", icon: Clock },
        { text: "Up to 5 emergency contacts", icon: Users },
        { text: "Email alerts for missed check-ins", icon: Mail },
        { text: "SMS text message alerts", icon: Smartphone },
        { text: "Automated voice call alerts", icon: Phone },
        { text: "Emergency alert button with one-tap activation", icon: AlertTriangle },
        { text: "Shake to SOS", icon: Smartphone },
        { text: "GPS location sharing with what3words", icon: MapPin },
        { text: "Push notifications & SMS reminders", icon: Bell },
        { text: "Primary contact/carer updates on every check-in", icon: Heart },
        { text: "Privacy protection with auto session timeout", icon: Lock },
        { text: "Offline emergency overlay", icon: Shield },
        { text: "Offline SMS check-in backup", icon: Smartphone },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: false,
      launchNote: "Launch pricing - Lock in today's special rate forever",
      priceProtected: true,
    },
    {
      name: "Complete Wellbeing",
      description: "Everything in Essential plus wellness, AI, and more.",
      monthlyPrice: 16.99,
      yearlyPrice: 169.99,
      features: [
        { text: "Everything in Essential", icon: Check },
        { text: "Emergency recording (opt-in)", icon: Mic },
        { text: "Mood & wellness tracking", icon: TrendingUp },
        { text: "Pet protection profiles with vet info", icon: PawPrint },
        { text: "Important document storage (travel insurance, wills & more)", icon: Scroll },
        { text: "Wellbeing AI chat with voice mode", icon: Headphones },
        { text: "Tree planted via Ecologi on signup", icon: TreePine },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: true,
      badge: "Most Popular",
      launchNote: "Launch pricing - Lock in today's special rate forever",
      priceProtected: true,
    },
    {
      name: "Organisations",
      description: "Support your staff, clients, or residents with comprehensive wellbeing tools.",
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        { text: "Everything in Complete Wellbeing", icon: Check },
        { text: "Dedicated organisation dashboard", icon: Building2 },
        { text: "Bulk client management & Excel import", icon: Users },
        { text: "Staff roles & team management", icon: Users },
        { text: "Safeguarding hub with case files", icon: Shield },
        { text: "Lone worker monitoring", icon: MapPin },
        { text: "Per-client feature toggles", icon: TrendingUp },
        { text: "Emergency alerts & missed check-in reports", icon: FileText },
        { text: "Call Supervisor — clients ring their supervisor directly", icon: Phone },
        { text: "In-dashboard help centre", icon: Headphones },
        { text: "Volume discounts on seat bundles", icon: TrendingUp },
      ],
      cta: "Contact Us",
      ctaLink: "mailto:help@aok.care?subject=Organisation%20Enquiry%20-%20aok%20Bundles%20%26%20Packages",
      highlight: false,
      isOrganisation: true,
    },
  ];

  const comparisonFeatures = [
    { name: "Check-in timer (5 min to 48 hours)", trial: true, essential: true, complete: true, org: true },
    { name: "Up to 5 emergency contacts", trial: true, essential: true, complete: true, org: true },
    { name: "Email alerts", trial: true, essential: true, complete: true, org: true },
    { name: "SMS text alerts", trial: true, essential: true, complete: true, org: true },
    { name: "Automated voice calls", trial: true, essential: true, complete: true, org: true },
    { name: "Emergency alert button", trial: true, essential: true, complete: true, org: true },
    { name: "Shake to SOS", trial: true, essential: true, complete: true, org: true },
    { name: "GPS + what3words location", trial: true, essential: true, complete: true, org: true },
    { name: "SMS check-in reminders", trial: true, essential: true, complete: true, org: true },
    { name: "Offline emergency overlay", trial: true, essential: true, complete: true, org: true },
    { name: "Primary contact/carer notifications", trial: true, essential: true, complete: true, org: true },
    { name: "Emergency recording (opt-in)", trial: true, essential: false, complete: true, org: true },
    { name: "Mood & wellness tracking", trial: true, essential: false, complete: true, org: true },
    { name: "Pet protection profiles", trial: true, essential: false, complete: true, org: true },
    { name: "Important document storage", trial: true, essential: false, complete: true, org: true },
    { name: "Wellbeing AI chat + voice mode", trial: true, essential: false, complete: true, org: true },
    { name: "Ecologi tree planting", trial: false, essential: false, complete: true, org: true },
    { name: "Organisation dashboard", trial: false, essential: false, complete: false, org: true },
    { name: "Bulk client management", trial: false, essential: false, complete: false, org: true },
    { name: "Staff roles & team management", trial: false, essential: false, complete: false, org: true },
    { name: "Safeguarding hub", trial: false, essential: false, complete: false, org: true },
    { name: "Lone worker monitoring", trial: false, essential: false, complete: false, org: true },
    { name: "Per-client feature controls", trial: false, essential: false, complete: false, org: true },
    { name: "Call Supervisor (one-tap calling)", trial: false, essential: false, complete: false, org: true },
    { name: "Reports & analytics", trial: false, essential: false, complete: false, org: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/onboarding">
              <Button data-testid="link-register">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground mb-4">Get Peace of Mind Today</p>
          <p className="text-muted-foreground">Start with a 7-day free trial. Cancel anytime. No hidden fees.</p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">SSL Secured</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
            data-testid="switch-billing-toggle"
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yearly
            </Label>
            <Badge variant="secondary" className="text-xs">2 months OFF!</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg" : ""}`}
              data-testid={`card-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid="badge-most-popular">
                  {plan.badge}
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  {plan.isTrial ? (
                    <div className="text-4xl font-bold">Free<span className="text-lg font-normal text-muted-foreground"> for 7 days</span></div>
                  ) : plan.isOrganisation ? (
                    <div className="text-2xl font-bold">Contact us<span className="text-lg font-normal text-muted-foreground block">for bundles & packages</span></div>
                  ) : (
                    <div className="text-4xl font-bold">
                      £{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      <span className="text-lg font-normal text-muted-foreground">/{isYearly ? "year" : "month"}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {plan.launchNote && (
                  <p className="text-sm text-primary mb-4">{plan.launchNote}</p>
                )}
                {plan.priceProtected && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Lock className="h-4 w-4" />
                    Price-protected for life
                  </div>
                )}
                <CardDescription className="mb-4">{plan.description}</CardDescription>
                {plan.note && (
                  <p className="text-sm text-muted-foreground mb-4">{plan.note}</p>
                )}
                {plan.features.length > 0 && (
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <feature.icon className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter>
                {plan.ctaLink.startsWith("mailto:") ? (
                  <a href={plan.ctaLink} className="w-full">
                    <Button 
                      variant={plan.highlight ? "default" : "outline"} 
                      className="w-full"
                      data-testid={`button-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link href={plan.ctaLink} className="w-full">
                    <Button 
                      variant={plan.highlight ? "default" : "outline"} 
                      className="w-full"
                      data-testid={`button-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-comparison-title">Feature Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Feature</th>
                      <th className="text-center py-3 px-4 font-medium">7 Day Trial</th>
                      <th className="text-center py-3 px-4 font-medium">Essential</th>
                      <th className="text-center py-3 px-4 font-medium text-primary">Complete Wellbeing</th>
                      <th className="text-center py-3 px-4 font-medium">Organisations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2 flex-wrap">
                            {feature.name}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {feature.trial ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {feature.essential ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {feature.complete ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {feature.org ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-faq-title">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What happens after my free trial?", a: "After 7 days, choose from Essential at £9.99/month (£99.99/year) or Complete Wellbeing at £16.99/month (£169.99/year). You can cancel anytime during the trial without being charged." },
              { q: "Can I cancel at any time?", a: "Yes, you can cancel your subscription at any time from Settings. Your account stays active until the end of your current billing period." },
              { q: "What payment methods do you accept?", a: "We accept all major debit and credit cards, Apple Pay, and Google Pay for quick and easy payment." },
              { q: "How does the organisation plan work?", a: "Organisations purchase bundles of seats and manage clients through a dedicated dashboard. Contact us for custom pricing based on your team size." },
              { q: "Is my data safe?", a: "Absolutely. We use encryption for all data, location is only shared during emergencies, AI conversations are never stored, and emergency contacts must give consent before receiving alerts. Our IP Ownership Agreement and NDA protect all confidential information. View our full legal documents including Privacy Policy, EULA, IP Ownership Agreement, and NDA from the footer links." },
              { q: "How am I helping the environment by using aok?", a: "Every time a new subscriber joins aok, we plant a tree on their behalf through our partnership with Ecologi. It's our small way of giving back to the planet and helping offset carbon emissions — just by being part of aok, you're making a positive impact." },
            ].map((faq, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <h3 className="font-medium mb-2" data-testid={`text-faq-q-${i}`}>{faq.q}</h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-faq-a-${i}`}>{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} aok. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}