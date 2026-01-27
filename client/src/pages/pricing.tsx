import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Check, Lock, Phone, FileText, Heart, Users, Clock, Mail, Bell, AlertTriangle, MapPin, Smartphone, Building2, TrendingUp, PawPrint, Scroll, ArrowLeft } from "lucide-react";

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
      name: "Complete Protection",
      description: "Everything you need to stay safe and connected with your loved ones.",
      monthlyPrice: 6.99,
      yearlyPrice: 69.99,
      features: [
        { text: "Flexible check-in timer (5 minutes to 48 hours)", icon: Clock },
        { text: "Up to 5 emergency contacts", icon: Users },
        { text: "Email alerts for missed check-ins", icon: Mail },
        { text: "SMS text message alerts", icon: Smartphone },
        { text: "Automated voice call alerts", icon: Phone },
        { text: "Emergency alert button with one-tap activation", icon: AlertTriangle },
        { text: "GPS location sharing with what3words", icon: MapPin },
        { text: "Push notifications", icon: Bell },
        { text: "Primary contact updates on every check-in", icon: Heart },
        { text: "Privacy protection with auto session timeout", icon: Lock },
        { text: "Mood & wellness tracking", icon: TrendingUp },
        { text: "Pet protection profiles with vet info", icon: PawPrint },
        { text: "Digital will & document storage", icon: Scroll },
        { text: "Wellbeing AI integration (Health Insight)", icon: Heart },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: true,
      badge: "All Features Included",
      launchNote: "Launch pricing - Lock in today's special rate forever",
      priceProtected: true,
    },
    {
      name: "Organisations",
      description: "Protect your staff, clients, or residents with our comprehensive safety solution.",
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        { text: "Flexible check-in timer (5 minutes to 48 hours)", icon: Clock },
        { text: "Up to 5 emergency contacts per user", icon: Users },
        { text: "Email alerts for missed check-ins", icon: Mail },
        { text: "SMS text message alerts", icon: Smartphone },
        { text: "Automated voice call alerts", icon: Phone },
        { text: "Emergency alert button with one-tap activation", icon: AlertTriangle },
        { text: "GPS location sharing with what3words", icon: MapPin },
        { text: "Push notifications", icon: Bell },
        { text: "Primary contact updates on every check-in", icon: Heart },
        { text: "Privacy protection with auto session timeout", icon: Lock },
        { text: "Mood & wellness tracking", icon: TrendingUp },
        { text: "Pet protection profiles with vet info", icon: PawPrint },
        { text: "Digital will & document storage", icon: Scroll },
        { text: "Wellbeing AI integration (Health Insight)", icon: Heart },
        { text: "Dedicated organisation dashboard", icon: Building2 },
        { text: "Bulk user management", icon: Users },
      ],
      cta: "Contact Us",
      ctaLink: "mailto:organisations@aok.care?subject=Organisation%20Enquiry%20-%20aok%20Bundles%20%26%20Packages",
      highlight: false,
      isOrganisation: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-green-600">aok</span>
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
          <p className="text-xl text-muted-foreground mb-8">Get Peace of Mind Today</p>
          <p className="text-muted-foreground">Start with a 7-day free trial. Cancel anytime.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg md:scale-105" : ""}`}
              data-testid={`card-plan-${plan.name.toLowerCase()}`}
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
                        <feature.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
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
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link href={plan.ctaLink} className="w-full">
                    <Button 
                      variant={plan.highlight ? "default" : "outline"} 
                      className="w-full"
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
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
