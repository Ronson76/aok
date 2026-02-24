import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck, Bell, Users, Clock, CheckCircle, Heart, MoreVertical, Mail,
  Smartphone, MapPin, Phone, AlertTriangle, Play, Building2, User,
  ChevronRight, Shield, Zap, Globe, Lock, Share2, Plus, TrendingUp, PawPrint, Scroll, Check, LogOut, Sparkles,
  MessageCircle, MessageSquare, ArrowLeft, TreeDeciduous, Leaf, Timer,
  Map, HardHat, Flame, Moon, BatteryLow
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

import isoBadgeImg from "@/assets/images/iso-27001-badge.png";

const TIER1_MONTHLY_PRICE = 9.99;
const TIER1_YEARLY_PRICE = 99.99;
const TIER2_MONTHLY_PRICE = 16.99;
const TIER2_YEARLY_PRICE = 169.99;

interface EcologiImpact {
  trees: number;
  carbonOffset: number;
  testMode?: boolean;
}

export default function LandingLoneWorker() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: ecologiImpact } = useQuery<EcologiImpact>({
    queryKey: ["/api/ecologi/impact"],
    staleTime: 1000 * 60 * 5,
  });

  const handleShare = async () => {
    const shareData = {
      title: 'aok - Lone Worker Protection',
      text: 'Protect those who work alone with automatic check-ins, real-time monitoring, and instant escalation.',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied",
          description: "The aok link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied",
          description: "The aok link has been copied to your clipboard.",
        });
      }
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const pricingPlans = [
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
      monthlyPrice: TIER1_MONTHLY_PRICE,
      yearlyPrice: TIER1_YEARLY_PRICE,
      features: [
        { text: "Shake to Alert - instant emergency help", icon: Zap },
        { text: "Flexible check-in timer (5 mins to 48 hours)", icon: Clock },
        { text: "Up to 5 emergency contacts", icon: Users },
        { text: "Email, SMS & voice call alerts", icon: Bell },
        { text: "Emergency alert button", icon: AlertTriangle },
        { text: "GPS location with what3words", icon: MapPin },
        { text: "Push notifications", icon: Smartphone },
        { text: "Primary contact/carer updates", icon: Heart },
        { text: "Offline SMS check-in backup", icon: MessageSquare },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: false,
      launchNote: "Launch pricing - Lock in today's rate forever",
      priceProtected: true,
    },
    {
      name: "Complete Wellbeing",
      description: "Everything in Essential plus wellness, AI, and more.",
      monthlyPrice: TIER2_MONTHLY_PRICE,
      yearlyPrice: TIER2_YEARLY_PRICE,
      features: [
        { text: "Everything in Essential", icon: Check },
        { text: "Emergency recording (opt-in)", icon: Lock },
        { text: "Mood & wellness tracking", icon: TrendingUp },
        { text: "Pet protection profiles", icon: PawPrint },
        { text: "Important document storage", icon: Scroll },
        { text: "Wellbeing AI (Exclusive)", icon: Sparkles },
        { text: "Activities tracker", icon: MapPin },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: true,
      badge: "Most Popular",
      launchNote: "Launch pricing - Lock in today's rate forever",
      priceProtected: true,
    },
    {
      name: "Organisations",
      description: "Support your staff, clients, or residents with wellbeing tools.",
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        { text: "All Complete Wellbeing features", icon: Check },
        { text: "Dedicated organisation dashboard", icon: Building2 },
        { text: "Bulk user management", icon: Users },
        { text: "Custom bundles & packages", icon: Heart },
      ],
      cta: "Contact Us",
      ctaLink: "mailto:help@aok.care?subject=Organisation%20Enquiry%20-%20aok%20Bundles%20%26%20Packages",
      highlight: false,
      isOrganisation: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-entry">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity" data-testid="link-logo-home">
              <ShieldCheck className="h-7 w-7 sm:h-9 sm:w-9 text-green-600" aria-label="aok shield logo" />
              <span className="text-lg sm:text-2xl font-bold text-green-600">aok</span>
            </Link>
          </div>
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-features">Features</a>
            <a href="#how-it-works" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">How It Works</a>
            <a href="#pricing" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-pricing">Pricing</a>
            <a href="#faq" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                size="sm"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isLoggingOut ? "Logging out..." : "Log Out"}</span>
              </Button>
            ) : (
              <Link href="/login">
                <Button size="sm" data-testid="button-sign-in">Sign In</Button>
              </Link>
            )}
            <Button size="icon" variant="outline" onClick={handleShare} data-testid="button-share-aok">
              <Share2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button size="icon" variant="ghost" data-testid="button-menu">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href="#features" data-testid="link-nav-features-mobile">Features</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#how-it-works" data-testid="link-nav-how-it-works-mobile">How It Works</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#pricing" data-testid="link-nav-pricing-mobile">Pricing</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#faq" data-testid="link-nav-faq-mobile">FAQ</a>
                </DropdownMenuItem>
                {user && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2" data-testid="link-go-to-dashboard">
                        <User className="h-4 w-4" />
                        Go to Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} data-testid="menu-logout">
                      <LogOut className="h-4 w-4 mr-2" />
                      {isLoggingOut ? "Logging out..." : "Log Out"}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={handleShare} data-testid="button-share">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share aok
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="mailto:help@aok.care?subject=Support%20Enquiry" className="flex items-center gap-2" data-testid="link-contact-us">
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-primary/10 text-primary text-sm md:text-lg font-medium mb-6">
                <HardHat className="h-4 w-4 md:h-5 md:w-5" />
                Lone Worker Protection
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Protecting Those Who<br />
                <span className="text-primary">Work Alone.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto md:mx-0">
                UK Health &amp; Safety Executive compliant lone worker monitoring. Automatic check-ins, real-time GPS tracking, and instant escalation when something goes wrong.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/onboarding">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-get-started">
                    Get Started Free
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" data-testid="button-view-demo">
                    See Demo
                    <Play className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="w-full flex justify-center md:justify-start mt-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 md:gap-6 text-xs md:text-base text-muted-foreground">
                  <div className="flex items-center gap-1 md:gap-2">
                    <CheckCircle className="h-3 w-3 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    <span className="md:font-medium">Free trial</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <CheckCircle className="h-3 w-3 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    <span className="md:font-medium">HSE Compliant</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <CheckCircle className="h-3 w-3 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    <span className="md:font-medium">2 min set up</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative mx-auto w-64 md:w-80">
                <div className="absolute -inset-4 bg-green-500/30 rounded-3xl blur-2xl animate-[glow_3s_ease-in-out_infinite]" />
                <div className="relative bg-card border rounded-3xl p-6 shadow-2xl">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                      <HardHat className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-500">Shift Active</h3>
                    <p className="text-sm text-muted-foreground mt-1">Next check-in: 28 min</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Auto check-in</p>
                        <p className="text-xs text-muted-foreground">Every 30 minutes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Supervisor notified</p>
                        <p className="text-xs text-muted-foreground">Real-time monitoring</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {ecologiImpact && (
        <section className="py-12 px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-y border-green-200 dark:border-green-800/50">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TreeDeciduous className="h-8 w-8 text-green-600" />
                  <span className="text-4xl font-bold text-green-700 dark:text-green-400">
                    {ecologiImpact.trees.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500 font-medium">Trees Planted</p>
              </div>
              <div className="hidden md:block h-12 w-px bg-green-300 dark:bg-green-700" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Leaf className="h-8 w-8 text-emerald-600" />
                  <span className="text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                    {ecologiImpact.carbonOffset.toFixed(1)}t
                  </span>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-500 font-medium">CO₂ Offset</p>
              </div>
              <div className="hidden md:block h-12 w-px bg-green-300 dark:bg-green-700" />
              <div className="text-center max-w-xs">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Every new subscriber plants a tree. We're proud to partner with{" "}
                  <a
                    href="https://ecologi.com/nghuman18"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-green-800 dark:hover:text-green-300"
                  >
                    Ecologi
                  </a>{" "}
                  to protect our planet.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Lone Worker Safety</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive monitoring and escalation tools designed to protect people who work alone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-blue-500/10 p-3 w-fit mb-4">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Automatic Check-In Schedules</h3>
                <p className="text-muted-foreground text-sm">
                  Set recurring check-in intervals from 5 minutes to 48 hours. Workers are prompted automatically throughout their shift.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-indigo-500/10 p-3 w-fit mb-4">
                  <Building2 className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Supervisor Monitoring Dashboard</h3>
                <p className="text-muted-foreground text-sm">
                  Real-time oversight of all lone workers. See check-in status, location, and escalation history from one central dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mb-4">
                  <MapPin className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-Time GPS Tracking</h3>
                <p className="text-muted-foreground text-sm">
                  Live location tracking with what3words precision. Know exactly where your workers are at all times during their shift.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-red-500/10 p-3 w-fit mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Missed Check-In Escalation</h3>
                <p className="text-muted-foreground text-sm">
                  Automatic escalation when a worker misses a check-in. Supervisors are alerted immediately via email, SMS, and voice call.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg ring-2 ring-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-red-500/10 p-3 w-fit">
                    <Zap className="h-6 w-6 text-red-500" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">Featured</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">Shake to Alert</h3>
                <p className="text-muted-foreground text-sm">
                  In danger? Just shake your phone to instantly trigger an emergency alert. No need to unlock or find the app.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-orange-500/10 p-3 w-fit mb-4">
                  <Phone className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Voice Call Alerts</h3>
                <p className="text-muted-foreground text-sm">
                  Automated voice calls to supervisors and emergency contacts ensure critical alerts are never missed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-teal-500/10 p-3 w-fit">
                    <MessageSquare className="h-6 w-6 text-teal-500" />
                  </div>
                  <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 border-0">Offline Safe</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">SMS Check-In When Offline</h3>
                <p className="text-muted-foreground text-sm">
                  No signal? Workers can check in via SMS text message even without internet. Essential for remote locations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-cyan-500/10 p-3 w-fit mb-4">
                  <Smartphone className="h-6 w-6 text-cyan-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
                <p className="text-muted-foreground text-sm">
                  Instant push notifications for check-in reminders, escalation alerts, and emergency situations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-red-500/10 p-3 w-fit mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Emergency Alert Button</h3>
                <p className="text-muted-foreground text-sm">
                  One-tap emergency button instantly alerts all contacts and supervisors with your live GPS location.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mb-4">
                  <MapPin className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">GPS with what3words</h3>
                <p className="text-muted-foreground text-sm">
                  Pinpoint location accuracy to within 3 metres using what3words addressing. Perfect for field workers in unmarked locations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-yellow-500/10 p-3 w-fit">
                    <BatteryLow className="h-6 w-6 text-yellow-500" />
                  </div>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-0">New</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">Low Battery Alert</h3>
                <p className="text-muted-foreground text-sm">
                  Automatic notification to supervisors when a worker's phone battery drops below critical levels during a shift.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-green-500/10 p-3 w-fit">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0">Enterprise</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">Audit Trail &amp; Compliance</h3>
                <p className="text-muted-foreground text-sm">
                  Complete audit trail of every check-in, alert, and escalation. Export-ready reports for HSE compliance and inspections.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-orange-500/10 p-3 w-fit mb-4">
                  <Phone className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Call Supervisor</h3>
                <p className="text-muted-foreground text-sm">
                  One-tap call to supervisor directly from the app. Quick communication when workers need guidance or support.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <img src={isoBadgeImg} alt="ISO 27001" className="h-10 w-10 object-contain" />
                </div>
                <h3 className="text-lg font-semibold mb-2">ISO 27001 Infrastructure</h3>
                <p className="text-muted-foreground text-sm">
                  Built on ISO 27001-compliant, UK GDPR-ready infrastructure. Your workers' data is secure and protected.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Get your team protected in four simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "Organisation Creates Profile", description: "Set up your organisation account and configure check-in schedules for your team.", icon: Building2 },
              { step: 2, title: "Worker Starts Shift", description: "Workers log in and start their shift. The automatic check-in timer begins.", icon: HardHat },
              { step: 3, title: "Automatic Check-Ins Run", description: "Workers are prompted to check in at scheduled intervals throughout their shift.", icon: Clock },
              { step: 4, title: "Missed Check-Ins Escalate", description: "If a worker misses a check-in, supervisors are alerted instantly with GPS location.", icon: AlertTriangle },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Uses aok for Lone Worker</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Trusted by employers across industries to protect workers who operate alone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Field Engineers", description: "Protect engineers working alone on remote sites, construction projects, and maintenance jobs.", icon: HardHat },
              { title: "Social Workers", description: "Keep social workers safe during home visits and community outreach in unfamiliar areas.", icon: Heart },
              { title: "Estate Agents", description: "Protect agents showing properties alone to unknown clients with automatic check-ins.", icon: Building2 },
              { title: "Delivery Drivers", description: "Monitor drivers on their routes with GPS tracking and automated check-in schedules.", icon: Map },
              { title: "Night Shift Workers", description: "Keep overnight workers safe with regular check-ins and instant escalation if they go silent.", icon: Moon },
              { title: "Healthcare Visitors", description: "Protect nurses and care workers making home visits to patients and vulnerable clients.", icon: Users },
            ].map((useCase, index) => (
              <Card key={index} className="border-0 shadow-lg" data-testid={`card-use-case-${index}`}>
                <CardContent className="pt-6">
                  <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                    <useCase.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground text-sm">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start protecting your lone workers today. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">SSL Secured</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Label htmlFor="lw-billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="lw-billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-toggle"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="lw-billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
                Yearly
              </Label>
              <Badge variant="secondary" className="text-xs">2 months OFF!</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, index) => (
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
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    {plan.isTrial ? (
                      <div className="text-4xl font-bold">Free<span className="text-lg font-normal text-muted-foreground"> for 7 days</span></div>
                    ) : plan.isOrganisation ? (
                      <div className="text-2xl font-bold">Contact us<span className="text-lg font-normal text-muted-foreground block">for bundles &amp; packages</span></div>
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
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <feature.icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
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
        </div>
      </section>

      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about lone worker protection with aok.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-lg border px-6" data-testid="faq-item-1">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-1">
                What is a lone worker?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-1">
                A lone worker is anyone who works by themselves without close or direct supervision. This includes field engineers, social workers, estate agents, delivery drivers, night shift workers, and healthcare visitors. UK law requires employers to assess and manage the risks faced by lone workers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-card rounded-lg border px-6" data-testid="faq-item-2">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-2">
                How does automatic check-in work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-2">
                Once a worker starts their shift, aok automatically prompts them to check in at scheduled intervals. The worker simply taps the check-in button to confirm they are safe. If they don't respond within the grace period, the system automatically escalates to their supervisor.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-card rounded-lg border px-6" data-testid="faq-item-3">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-3">
                What happens if a worker misses a check-in?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-3">
                If a worker misses a check-in, aok immediately alerts their supervisor and designated emergency contacts via email, SMS, and automated voice calls. The worker's last known GPS location is shared using what3words for precise identification within 3 metres.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-card rounded-lg border px-6" data-testid="faq-item-4">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-4">
                Is it compliant with UK lone working regulations?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-4">
                Yes. aok is designed to help employers meet their duties under the Health and Safety at Work Act 1974 and the Management of Health and Safety at Work Regulations 1999. Our audit trails and reporting features provide the documentation needed for HSE compliance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-card rounded-lg border px-6" data-testid="faq-item-5">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-5">
                Do workers need to download the app?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-5">
                aok works as a progressive web app (PWA), so workers can use it directly from their browser or install it to their home screen. No app store download is required, making deployment fast and simple across your entire team.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-card rounded-lg border px-6" data-testid="faq-item-6">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-6">
                Can supervisors monitor multiple workers?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-6">
                Yes. The organisation dashboard gives supervisors a real-time overview of all their lone workers. They can see who has checked in, who is overdue, and respond to escalations — all from one central screen.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-card rounded-lg border px-6" data-testid="faq-item-7">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-7">
                How does GPS tracking work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-7">
                When a worker checks in or triggers an emergency alert, their GPS coordinates are captured and converted to a what3words address for easy identification. During an active emergency, location updates are sent every 5 minutes until the alert is deactivated.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-card rounded-lg border px-6" data-testid="faq-item-8">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-8">
                Is data secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-8">
                Absolutely. aok is built on ISO 27001-compliant, UK GDPR-ready infrastructure. All data is encrypted in transit and at rest. Passwords are hashed, and location data from emergency alerts is automatically deleted after 30 days.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <HardHat className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Protect Your Lone Workers Today
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            It takes less than 2 minutes to set up. Give your team the protection they deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" data-testid="button-start-now">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity" data-testid="link-footer-logo-home">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <span className="font-bold text-green-600">aok</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Your personal check-in companion. Stay connected, stay in touch.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors" data-testid="link-footer-features">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors" data-testid="link-footer-how-it-works">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors" data-testid="link-footer-pricing">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors" data-testid="link-footer-faq">FAQ</a></li>
                <li><Link href="/guide"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-guide">How-to Guide</span></Link></li>
                <li><Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-terms">Terms and Conditions</span></Link></li>
                <li><Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-privacy">Privacy Policy</span></Link></li>
                <li><Link href="/security"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-security">Security &amp; Compliance</span></Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Users</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/onboarding"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-signup">Sign Up</span></Link></li>
                <li><Link href="/login"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-signin">Sign In</span></Link></li>
                <li><Link href="/forgot-password"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-reset">Reset Password</span></Link></li>
                <li><a href="mailto:help@aok.care?subject=Support%20Enquiry" className="hover:text-foreground transition-colors" data-testid="link-footer-contact">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Organisations</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:help@aok.care?subject=Organisation%20Enquiry" className="hover:text-foreground transition-colors" data-testid="link-footer-sales">Contact Sales</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Download the App</h4>
              <div className="flex flex-col gap-3">
                <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border hover-elevate transition-colors" data-testid="link-app-store-footer">
                  <SiApple className="h-6 w-6 text-black dark:text-white" />
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border hover-elevate transition-colors" data-testid="link-play-store-footer">
                  <SiGoogleplay className="h-6 w-6 text-[#414141] dark:text-[#34A853]" />
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Get it on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-copyright">
              &copy; {new Date().getFullYear()} aok by NaiyaTech. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/login">
                <Button variant="outline" size="sm" data-testid="link-footer-admin">
                  Admin Login
                </Button>
              </Link>
              <Link href="/org/login">
                <Button variant="outline" size="sm" data-testid="link-footer-org">
                  Organisation Login
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              data-testid="button-back-to-top"
            >
              Back to Top
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
