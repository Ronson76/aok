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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

import checkInVideo from "@assets/generated_videos/safety_check-in_confirmation_animation.mp4";
import alertsVideo from "@assets/generated_videos/english_sms_alert_notification.mp4";
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

export default function Landing() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Fetch Ecologi environmental impact stats
  const { data: ecologiImpact } = useQuery<EcologiImpact>({
    queryKey: ["/api/ecologi/impact"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleShare = async () => {
    const shareData = {
      title: 'aok - Personal Check-In App',
      text: 'Stay connected with your loved ones. Check in regularly and get help when you need it.',
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
      ctaLink: "mailto:organisations@aok.care?subject=Organisation%20Enquiry%20-%20aok%20Bundles%20%26%20Packages",
      highlight: false,
      isOrganisation: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity" data-testid="link-logo-home">
              <ShieldCheck className="h-7 w-7 sm:h-9 sm:w-9 text-green-600" aria-label="aok shield logo" />
              <span className="text-lg sm:text-2xl font-bold text-green-600">aok</span>
            </Link>
            <div className="hidden sm:block h-8 w-px bg-muted-foreground/30" />
            <Link 
              href="/app/wellbeing-ai"
              className="hidden sm:flex flex-col items-start"
              data-testid="link-health-insight"
            >
              <div className="relative h-7 w-7 flex items-center justify-center mb-0.5">
                <div className="w-5 h-2 bg-green-600 absolute rounded-sm" />
                <div className="w-2 h-5 bg-green-600 absolute rounded-sm" />
                <Heart className="h-2.5 w-2.5 text-green-600 absolute -bottom-0.5 -right-0.5" fill="currentColor" />
              </div>
              <span className="text-xs font-semibold text-green-600 leading-none whitespace-nowrap">Wellbeing AI</span>
            </Link>
          </div>
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/funder-ready" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-funder-ready">Funder Ready</Link>
            <a href="#features" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-features">Features</a>
            <a href="#how-it-works" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">How It Works</a>
            <a href="#use-cases" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-use-cases">Who Uses aok</a>
            <a href="#pricing" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-pricing">Pricing</a>
            <a href="#faq" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <a href="#" className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border hover-elevate" data-testid="link-app-store-header">
                <SiApple className="h-5 w-5 text-black dark:text-white" />
                <span className="text-sm font-medium">App Store</span>
              </a>
              <a href="#" className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border hover-elevate" data-testid="link-play-store-header">
                <SiGoogleplay className="h-5 w-5 text-[#414141] dark:text-[#34A853]" />
                <span className="text-sm font-medium">Google Play</span>
              </a>
            </div>
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
                  <a href="#use-cases" data-testid="link-nav-use-cases-mobile">Who Uses aok</a>
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
                  <a href="mailto:support@aok.care?subject=Support%20Enquiry" className="flex items-center gap-2" data-testid="link-contact-us">
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
                <Shield className="h-4 w-4 md:h-5 md:w-5" />
                Personal Wellbeing Made Simple
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Where safeguarding becomes<br />
                <span className="text-primary">measurable assurance.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto md:mx-0">
                Continuous control monitoring, automated missed check-in alerts, and funder-ready audit trails — delivered on ISO 27001-compliant, UK GDPR-ready infrastructure. With real-time assurance for your GRC framework.
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
                    <span className="md:font-medium">No commitment</span>
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
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-500">You're aok</h3>
                    <p className="text-sm text-muted-foreground mt-1">Last check-in: Just now</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Next check-in</p>
                        <p className="text-xs text-muted-foreground">Tomorrow at 9:00 AM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">3 contacts protected</p>
                        <p className="text-xs text-muted-foreground">Ready to be notified</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecologi Environmental Impact Section */}
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Stay Connected</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive check-in and wellbeing tools designed to give you and your loved ones peace of mind.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-blue-500/10 p-3 w-fit mb-4">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Flexible Check-In Timer</h3>
                <p className="text-muted-foreground text-sm">
                  Set your check-in schedule from 5 minutes to 48 hours. Perfect for any lifestyle or activity.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-green-500/10 p-3 w-fit mb-4">
                  <Bell className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multi-Channel Alerts</h3>
                <p className="text-muted-foreground text-sm">
                  Your contacts receive alerts via email, SMS text messages, and automated phone calls.
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
                  In danger? Just shake your phone to instantly trigger an emergency alert. No need to unlock or find the app - help is just a shake away.
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
                  Instantly alert all your contacts in an emergency with one tap. Your location is shared automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mb-4">
                  <MapPin className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">GPS Location Sharing</h3>
                <p className="text-muted-foreground text-sm">
                  Share your precise location using what3words addresses. Updated every 5 minutes during emergencies.
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
                  Automated phone calls to landline and mobile numbers ensure your message gets through.
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
                  Never miss a check-in with persistent push notifications that work even when your phone is idle.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg ring-2 ring-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-teal-500/10 p-3 w-fit">
                    <MessageSquare className="h-6 w-6 text-teal-500" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">Offline Safe</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">SMS Check-In When Offline</h3>
                <p className="text-muted-foreground text-sm">
                  No internet? No problem. If you miss a check-in, we text you a reminder. Simply reply to confirm you're safe — no app or data connection needed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-amber-500/10 p-3 w-fit mb-4">
                  <Users className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multiple Contacts</h3>
                <p className="text-muted-foreground text-sm">
                  Add family, friends, neighbours, or anyone you trust. Set a primary contact/carer for regular updates.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-pink-500/10 p-3 w-fit mb-4">
                  <Lock className="h-6 w-6 text-pink-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Privacy Protected</h3>
                <p className="text-muted-foreground text-sm">
                  Screenshot protection on contacts and secure data handling.
                </p>
              </CardContent>
            </Card>

            <Link href="/security">
              <Card className="border-0 shadow-lg ring-2 ring-green-500/20 cursor-pointer hover:shadow-xl transition-shadow" data-testid="card-feature-iso">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <img src={isoBadgeImg} alt="ISO 27001" className="h-12 w-12 object-contain" />
                    <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-0">Verified</Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">ISO 27001 Infrastructure</h3>
                  <p className="text-muted-foreground text-sm">
                    Built on ISO 27001-certified cloud infrastructure with SOC 2 Type 2 compliance. UK GDPR compliant with 2FA, encrypted data, and tamper-evident audit trails.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-indigo-500/10 p-3 w-fit mb-4">
                  <Building2 className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Organisation Support</h3>
                <p className="text-muted-foreground text-sm">
                  Care homes and organisations can monitor multiple clients with dedicated dashboards and alerts.
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
                  Organisation clients can ring their supervisor directly from the app. No app needed on the other end — it's a normal phone call.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-emerald-500/10 p-3 w-fit mb-4">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Wellness Tracking</h3>
                <p className="text-muted-foreground text-sm">
                  Log your mood after check-ins to track your wellbeing over time. Great for spotting patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-rose-500/10 p-3 w-fit mb-4">
                  <PawPrint className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Pet Protection</h3>
                <p className="text-muted-foreground text-sm">
                  Store pet profiles with vet info and care instructions. Your contacts can care for your pets if needed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-slate-500/10 p-3 w-fit mb-4">
                  <Scroll className="h-6 w-6 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Important Documents</h3>
                <p className="text-muted-foreground text-sm">
                  Securely store travel insurance, wills, power of attorney, healthcare directives, and other important documents.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-red-500/10 p-3 w-fit mb-4">
                  <Play className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Emergency Recording</h3>
                <p className="text-muted-foreground text-sm">
                  Opt-in feature that activates your camera and microphone during emergencies. Recordings are encrypted, shared only with your contacts, and deleted after 90 days.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-teal-500/10 p-3 w-fit mb-4">
                  <Timer className="h-6 w-6 text-teal-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Activities Tracker</h3>
                <p className="text-muted-foreground text-sm">
                  Log everyday activities like walking, shopping, or appointments with a built-in timer and grace period. If you don't check back in, your contacts are alerted.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg ring-2 ring-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-yellow-500/10 p-3 w-fit">
                    <BatteryLow className="h-6 w-6 text-yellow-500" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">New</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid="text-feature-low-battery">Low Battery Alert</h3>
                <p className="text-muted-foreground text-sm">
                  If your phone battery drops below 20% during an active activity, your primary contacts/carers are automatically emailed so they know to keep a closer eye. Only fires once per session.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-violet-500/10 p-3 w-fit mb-4">
                  <Sparkles className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Wellbeing AI</h3>
                <p className="text-muted-foreground text-sm">
                  Chat with your personal AI companion about how you're feeling. Get supportive responses, mood insights, and voice chat — all private and built into the app.
                </p>
              </CardContent>
            </Card>


            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-amber-500/10 p-3 w-fit mb-4">
                  <HardHat className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Lone Worker Protection</h3>
                <p className="text-muted-foreground text-sm">
                  Designed for people who work alone. Organisations can monitor lone worker sessions, set automatic check-in schedules, and receive real-time safety alerts.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-orange-500/10 p-3 w-fit mb-4">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Check-in Streaks</h3>
                <p className="text-muted-foreground text-sm">
                  Build healthy habits by maintaining your check-in streak. Track how many consecutive check-ins you've completed on time and stay motivated.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-rose-500/10 p-3 w-fit mb-4">
                  <Heart className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Primary Contact/Carer</h3>
                <p className="text-muted-foreground text-sm">
                  Designate a primary contact/carer who receives a notification for every successful check-in — giving them ongoing peace of mind that you're safe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in less than 2 minutes. No complicated setup required.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Your Onboarding Journey</h3>
              <p className="text-sm text-muted-foreground">
                Begin our simple guided setup to create your account and personalise your safety settings.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Insert Your Details</h3>
              <p className="text-sm text-muted-foreground">
                Add your personal information and emergency contacts who'll be notified if needed.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Your Check-In Time</h3>
              <p className="text-sm text-muted-foreground">
                Choose how often you want to check in - from every 5 minutes to every 48 hours.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">You're All Set</h3>
              <p className="text-sm text-muted-foreground">
                Start checking in and stay connected with your loved ones. We've got your back.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features in Motion</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See aok in action — personal wellbeing and safety tools, all in one place.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {/* Phone 1: Easy Check-Ins - Silver frame, black background */}
            <div className="text-center">
              <div className="relative aspect-[9/19] rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-gray-300 to-gray-400 border-[3px] border-gray-300 shadow-xl mb-4 max-w-[200px] mx-auto">
                {/* Silver notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full z-10" />
                {/* Screen content - black background */}
                <div className="absolute inset-1 rounded-[2rem] bg-black flex flex-col items-center justify-center p-4">
                  {/* aok logo flashing */}
                  <div className="animate-pulse" style={{ animationDuration: '2s' }}>
                    <div className="text-4xl font-bold text-primary mb-2">aok</div>
                  </div>
                  <div className="animate-pulse">
                    <Check className="h-16 w-16 text-green-500 mb-3 animate-bounce" strokeWidth={3} style={{ animationDuration: '2s' }} />
                  </div>
                  <span className="text-white font-semibold text-base animate-pulse" style={{ animationDuration: '3s' }}>you're aok</span>
                </div>
                {/* Glass reflection overlay */}
                <div className="absolute inset-1 rounded-[2rem] pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-transparent" />
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-checkin">Easy Check-Ins</h4>
              <p className="text-xs md:text-sm text-muted-foreground">One tap to confirm you're aok</p>
            </div>
            
            {/* Phone 2: Multi-Channel Alerts - Silver frame, white background */}
            <div className="text-center">
              <div className="relative aspect-[9/19] rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-gray-300 to-gray-400 border-[3px] border-gray-300 shadow-xl mb-4 max-w-[200px] mx-auto">
                {/* Silver notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full z-10" />
                {/* Screen content - white background */}
                <div className="absolute inset-1 rounded-[2rem] bg-white flex flex-col items-center justify-center p-3 gap-2">
                  <div className="w-full px-2 py-1.5 bg-green-100 rounded-lg animate-pulse border-l-4 border-green-500" style={{ animationDelay: '0s', animationDuration: '2s' }}>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span className="text-[9px] text-gray-800 font-bold">aok alert</span>
                    </div>
                    <p className="text-[8px] text-gray-600 mt-0.5">WhatsApp message received</p>
                  </div>
                  <div className="w-full px-2 py-1.5 bg-blue-100 rounded-lg animate-pulse border-l-4 border-blue-500" style={{ animationDelay: '0.5s', animationDuration: '2s' }}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-[9px] text-gray-800 font-bold">aok alert</span>
                    </div>
                    <p className="text-[8px] text-gray-600 mt-0.5">SMS message received</p>
                  </div>
                  <div className="w-full px-2 py-1.5 bg-purple-100 rounded-lg animate-pulse border-l-4 border-purple-500" style={{ animationDelay: '1s', animationDuration: '2s' }}>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <span className="text-[9px] text-gray-800 font-bold">aok alert</span>
                    </div>
                    <p className="text-[8px] text-gray-600 mt-0.5">Email alert received</p>
                  </div>
                  <div className="w-full px-2 py-1.5 bg-orange-100 rounded-lg animate-pulse border-l-4 border-orange-500" style={{ animationDelay: '1.5s', animationDuration: '2s' }}>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-600" />
                      <span className="text-[9px] text-gray-800 font-bold">aok alert</span>
                    </div>
                    <p className="text-[8px] text-gray-600 mt-0.5">Incoming phone call</p>
                  </div>
                </div>
                {/* Glass reflection overlay */}
                <div className="absolute inset-1 rounded-[2rem] pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-transparent" />
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-alerts">Multi-Channel Alerts</h4>
              <p className="text-xs md:text-sm text-muted-foreground">Email, SMS, WhatsApp, and calls</p>
            </div>
            
            {/* Phone 3: GPS Location - Silver frame */}
            <div className="text-center">
              <div className="relative aspect-[9/19] rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-gray-300 to-gray-400 border-[3px] border-gray-300 shadow-xl mb-4 max-w-[200px] mx-auto">
                {/* Silver notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full z-10" />
                {/* Screen content - Map mockup */}
                <div className="absolute inset-1 rounded-[2rem] overflow-hidden bg-green-100">
                  {/* Map background pattern */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-[20%] left-0 right-0 h-[2px] bg-amber-400" />
                    <div className="absolute top-[40%] left-0 right-0 h-[2px] bg-amber-400" />
                    <div className="absolute top-[60%] left-0 right-0 h-[2px] bg-amber-400" />
                    <div className="absolute top-[80%] left-0 right-0 h-[2px] bg-amber-400" />
                    <div className="absolute left-[25%] top-0 bottom-0 w-[2px] bg-amber-400" />
                    <div className="absolute left-[50%] top-0 bottom-0 w-[2px] bg-amber-400" />
                    <div className="absolute left-[75%] top-0 bottom-0 w-[2px] bg-amber-400" />
                  </div>
                  {/* Location pin */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="animate-bounce" style={{ animationDuration: '2s' }}>
                      <MapPin className="h-12 w-12 text-red-500 drop-shadow-lg" fill="currentColor" />
                    </div>
                    <div className="w-6 h-6 bg-blue-400/50 rounded-full animate-ping absolute top-6" style={{ animationDuration: '2s' }} />
                  </div>
                  {/* what3words address */}
                  <div className="absolute bottom-4 left-2 right-2 bg-white rounded-lg p-2 shadow-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">///</span>
                      </div>
                      <span className="text-[9px] text-gray-800 font-semibold">what3words</span>
                    </div>
                    <p className="text-[10px] text-red-500 font-medium">///filled.count.soap</p>
                    <p className="text-[8px] text-gray-500 mt-0.5">London, United Kingdom</p>
                  </div>
                  {/* Street labels */}
                  <div className="absolute top-8 left-4 bg-white/80 px-1 py-0.5 rounded text-[7px] text-gray-700">High Street</div>
                  <div className="absolute top-16 right-3 bg-white/80 px-1 py-0.5 rounded text-[7px] text-gray-700">Queen's Road</div>
                </div>
                {/* Glass reflection overlay */}
                <div className="absolute inset-1 rounded-[2rem] pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-transparent" />
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-location">GPS Location Sharing</h4>
              <p className="text-xs md:text-sm text-muted-foreground">Precise what3words addresses</p>
            </div>
            
            {/* Phone 4: Shake to Alert - Red frame */}
            <div className="text-center">
              <div 
                className="relative aspect-[9/19] rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-red-400 to-red-600 border-[3px] border-red-400 shadow-xl mb-4 max-w-[200px] mx-auto animate-[shake_0.5s_ease-in-out_infinite]"
                style={{ 
                  animation: 'shake 0.5s ease-in-out infinite',
                }}
                data-testid="phone-shake-to-alert"
              >
                {/* Red notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gradient-to-b from-red-500 to-red-700 rounded-full z-10" />
                {/* Screen content */}
                <div className="absolute inset-1 rounded-[2rem] bg-black flex flex-col items-center justify-center p-6">
                  <div className="relative mb-4">
                    <div className="h-16 w-16 rounded-full bg-red-600/20 flex items-center justify-center animate-pulse">
                      <Zap className="h-10 w-10 text-red-500" fill="currentColor" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <p className="text-red-400 text-xs text-center font-bold uppercase tracking-wider">Shake Detected!</p>
                  <p className="text-gray-500 text-xs text-center mt-2">Sending emergency alert...</p>
                </div>
                {/* Glass reflection overlay */}
                <div className="absolute inset-1 rounded-[2rem] pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-transparent" />
              </div>
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: translateX(0) rotate(0deg); }
                  25% { transform: translateX(-3px) rotate(-2deg); }
                  75% { transform: translateX(3px) rotate(2deg); }
                }
              `}</style>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-shake-to-alert">Shake to Alert</h4>
              <p className="text-xs md:text-sm text-muted-foreground">Instant emergency help</p>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Uses aok?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              People from all walks of life trust aok to keep them connected to their loved ones.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Seniors Living Independently",
                description: "Give your family peace of mind knowing you're checking in regularly. Perfect for those who value their independence.",
                icon: Heart
              },
              {
                title: "People Living Alone",
                description: "Whether you're single, recently moved, or just prefer solitude, stay connected without compromising your privacy.",
                icon: User
              },
              {
                title: "Solo Travellers",
                description: "Exploring the world alone? Let someone know you're aok no matter where your adventures take you.",
                icon: Globe
              },
              {
                title: "Remote Workers",
                description: "Working from isolated locations or doing fieldwork? Stay connected even when you're off the grid.",
                icon: MapPin
              },
              {
                title: "People with Health Conditions",
                description: "Managing a health condition? Regular check-ins ensure help arrives quickly if you need it.",
                icon: Shield
              },
              {
                title: "Care Homes & Organisations",
                description: "Monitor multiple vulnerable individuals with our organisation dashboard and bundle system.",
                icon: Building2
              }
            ].map((useCase, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <useCase.icon className="h-8 w-8 text-primary mb-4" />
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
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground mb-2">Get Peace of Mind Today</p>
            <p className="text-muted-foreground">Start with a 7-day free trial. Cancel anytime.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">SSL Secured</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Label htmlFor="landing-billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="landing-billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-landing-billing-toggle"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="landing-billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
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
                data-testid={`card-landing-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid="badge-landing-most-popular">
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
                        data-testid={`button-landing-plan-${plan.name.toLowerCase()}`}
                      >
                        {plan.cta}
                      </Button>
                    </a>
                  ) : (
                    <Link href={plan.ctaLink} className="w-full">
                      <Button 
                        variant={plan.highlight ? "default" : "outline"} 
                        className="w-full"
                        data-testid={`button-landing-plan-${plan.name.toLowerCase()}`}
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
              Everything you need to know about aok.
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-lg border px-6" data-testid="faq-item-1">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-1">
                Is aok free to use?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-1">
                The app gives you 7 days free. After that, our Essential plan starts at £{TIER1_MONTHLY_PRICE.toFixed(2)} per month, 
                or upgrade to Complete Wellbeing at £{TIER2_MONTHLY_PRICE.toFixed(2)} per month for wellness, AI, and more.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-lg border px-6" data-testid="faq-item-2">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-2">
                What happens if I miss a check-in?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-2">
                If you miss a check-in, your primary contact/carer is alerted by email and your location is shared 
                through what3words - a simple three-word address that pinpoints your exact location to within 
                3 metres. You'll also hear an alert sound on your phone to remind you to check in.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bg-card rounded-lg border px-6" data-testid="faq-item-3">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-3">
                How do emergency alerts work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-3">
                When you activate an emergency alert, all your confirmed contacts are immediately notified 
                via email, SMS text message, and automated phone calls. Your GPS location is shared and 
                updated every 5 minutes until you deactivate the alert with your password.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="bg-card rounded-lg border px-6" data-testid="faq-item-4">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-4">
                Do my contacts need to download the app?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-4">
                No! Your emergency contacts don't need to download anything. They'll receive alerts via 
                email, SMS, and phone calls. They just need to confirm they accept being your emergency 
                contact when you add them.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="bg-card rounded-lg border px-6" data-testid="faq-item-5">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-5">
                How often can I check in?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-5">
                You can set your check-in interval anywhere from 5 minutes (great for testing) to 48 hours. 
                Choose what works best for your lifestyle - daily check-ins are popular for most users.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6" className="bg-card rounded-lg border px-6" data-testid="faq-item-6">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-6">
                Is my data secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-6">
                Yes! We take security seriously. Your data is encrypted and passwords are hashed. 
                Location data from emergency alerts is automatically deleted after 30 days. 
                The contacts page also has screenshot protection.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-7" className="bg-card rounded-lg border px-6" data-testid="faq-item-7">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-7">
                Can organisations use aok?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-7">
                Yes! We offer organisation accounts for care homes, housing associations, and other 
                organisations that need to monitor multiple individuals. Contact us for organisation 
                bundles and pricing.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-8" className="bg-card rounded-lg border px-6" data-testid="faq-item-8">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-8">
                Who is contacted in an emergency?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-8">
                <p className="mb-4">You can designate up to 3 primary contacts/carers who receive more frequent updates. Here's how notifications work:</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse mb-4">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Alert Type</th>
                        <th className="text-center py-2 px-2 font-semibold text-foreground">Email</th>
                        <th className="text-center py-2 px-2 font-semibold text-foreground">SMS</th>
                        <th className="text-center py-2 px-2 font-semibold text-foreground">Voice Call</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td colSpan={4} className="py-2 font-semibold text-foreground">Primary Contacts/Carers (up to 3)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Successful Check-in</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Missed Check-in</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Emergency SOS</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td colSpan={4} className="py-2 font-semibold text-foreground">Non-Primary Contacts</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Successful Check-in</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Missed Check-in</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 pl-4">Emergency SOS</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <p>Non-primary contacts are only alerted in genuine emergencies, reducing notification fatigue while ensuring critical alerts always get through.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <Heart className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Protecting Yourself Today
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            It takes less than 2 minutes to set up. Give yourself and your loved ones peace of mind.
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
                <li><Link href="/security"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-security">Security & Compliance</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Users</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/onboarding"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-signup">Sign Up</span></Link></li>
                <li><Link href="/login"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-signin">Sign In</span></Link></li>
                <li><Link href="/forgot-password"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-reset">Reset Password</span></Link></li>
                <li><a href="mailto:support@aok.care?subject=Support%20Enquiry" className="hover:text-foreground transition-colors" data-testid="link-footer-contact">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Organisations</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:organisations@aok.care?subject=Organisation%20Enquiry" className="hover:text-foreground transition-colors" data-testid="link-footer-sales">Contact Sales</a></li>
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
