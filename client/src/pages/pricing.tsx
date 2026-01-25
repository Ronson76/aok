import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Check, Lock, HeadphonesIcon, Phone, FileText, Heart, Users, Clock, Mail, Bell, AlertTriangle, MapPin, Smartphone, Building2, TrendingUp, PawPrint, Scroll, ArrowLeft } from "lucide-react";

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Free",
      description: "We would love to offer this service for free to everyone, but we are a small company and we need to pay the bills.",
      note: "If you cannot afford it, please contact us and we will do our best to help you.",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [],
      cta: "Contact Us",
      ctaLink: "mailto:support@aok.app",
      highlight: false,
      asterisk: true,
    },
    {
      name: "Base",
      description: "Everything you need to stay safe and connected with your loved ones.",
      monthlyPrice: 4.99,
      yearlyPrice: 49.99,
      features: [
        { text: "Flexible check-in timer (5 minutes to 48 hours)", icon: Clock },
        { text: "Add up to five emergency contacts", icon: Users },
        { text: "Email alerts for missed check-ins", icon: Mail },
        { text: "SMS text message alerts", icon: Smartphone },
        { text: "Automated voice call alerts", icon: Phone },
        { text: "Emergency alert button with one-tap activation", icon: AlertTriangle },
        { text: "GPS location sharing with what3words", icon: MapPin },
        { text: "Push notifications to never miss a check-in", icon: Bell },
        { text: "Primary contact gets every check-in update", icon: Heart },
        { text: "Privacy protected with auto session timeout", icon: Lock },
      ],
      cta: "Choose Plan",
      ctaLink: "/register",
      highlight: true,
      badge: "Most Popular",
      launchNote: "Launch pricing - Lock in today's special rate forever",
      priceProtected: true,
    },
    {
      name: "Plus",
      description: "Enhanced features for complete peace of mind, including wellness and legacy planning.",
      monthlyPrice: 8.99,
      yearlyPrice: 89.99,
      features: [
        { text: "Everything in Base", icon: Check },
        { text: "Priority support", icon: HeadphonesIcon },
        { text: "Mood & wellness tracking", icon: TrendingUp },
        { text: "Pet protection profiles with vet info", icon: PawPrint },
        { text: "Digital will & document storage", icon: Scroll },
        { text: "Wellbeing AI integration (Health Insight)", icon: Heart },
      ],
      cta: "Choose Plan",
      ctaLink: "/register",
      highlight: false,
      launchNote: "Launch price. We will keep the price low for a limited time.",
    },
  ];

  const testimonials = [
    {
      quote: "Living alone at 72, this app gives me and my children peace of mind. The check-ins are so simple and reassuring.",
      name: "Margaret",
      age: 72,
    },
    {
      quote: "As a single mum working late shifts, knowing someone will check on me gives me a sense of security I never had before.",
      name: "Rachel",
      role: "Single Parent",
    },
    {
      quote: "After my husband passed away, my kids were worried about me living alone. This app has been a blessing for all of us.",
      name: "Patricia",
      age: 68,
    },
    {
      quote: "The daily check-ins are perfect for my lifestyle. Simple to use and my family only gets notified if something is wrong.",
      name: "James",
      age: 70,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">aok</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button data-testid="link-register">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground mb-8">Get Peace of Mind Today</p>
          <p className="text-muted-foreground">Start with a 3-day free trial. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                <p className="text-sm font-medium">
                  {testimonial.name}, {testimonial.age || testimonial.role}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">SSL Secured</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
            <Check className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">100% Money Back</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
            <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">24/7 Support</span>
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
                <CardTitle className="text-2xl flex items-center gap-2">
                  {plan.name}
                  {plan.asterisk && <span className="text-muted-foreground">*</span>}
                </CardTitle>
                <div className="mt-4">
                  {plan.monthlyPrice === 0 ? (
                    <div className="text-4xl font-bold">£0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
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
                {plan.asterisk && (
                  <p className="text-xs text-muted-foreground mt-4">*if you drop us a line</p>
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
