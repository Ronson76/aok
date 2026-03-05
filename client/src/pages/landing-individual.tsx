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
  ChevronRight, Shield, Zap, Lock, Share2, TrendingUp, PawPrint, Scroll, Check, LogOut, Sparkles,
  MessageSquare, ArrowLeft, Home, TreeDeciduous, Leaf, Timer, Flame, BatteryLow
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

import checkInVideo from "@assets/generated_videos/safety_check-in_confirmation_animation.mp4";
import alertsVideo from "@assets/generated_videos/english_sms_alert_notification.mp4";
import isoBadgeImg from "@/assets/images/iso-27001-badge.png";

const BASIC_MONTHLY_PRICE = 2.99;
const BASIC_YEARLY_PRICE = 29.99;
const TIER1_MONTHLY_PRICE = 9.99;
const TIER1_YEARLY_PRICE = 99.99;
const TIER2_MONTHLY_PRICE = 16.99;
const TIER2_YEARLY_PRICE = 169.99;

interface EcologiImpact {
  trees: number;
  carbonOffset: number;
  testMode?: boolean;
}

export default function LandingIndividual() {
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
      name: "Basic",
      description: "Essential safety check-ins with email alerts.",
      monthlyPrice: BASIC_MONTHLY_PRICE,
      yearlyPrice: BASIC_YEARLY_PRICE,
      features: [
        { text: "Flexible check-in timer (1 hour to 48 hours)", icon: Clock },
        { text: "1 primary + 1 secondary contact", icon: Users },
        { text: "Email alerts for missed check-ins", icon: Mail },
        { text: "SOS emergency alerts (all channels)", icon: AlertTriangle },
        { text: "Emergency alert button", icon: AlertTriangle },
        { text: "Primary contact/carer updates", icon: Heart },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: false,
    },
    {
      name: "Essential",
      description: "Core check-in and alert tools for peace of mind.",
      monthlyPrice: TIER1_MONTHLY_PRICE,
      yearlyPrice: TIER1_YEARLY_PRICE,
      features: [
        { text: "Everything in Basic", icon: Check },
        { text: "Shake to Alert - instant emergency help", icon: Zap },
        { text: "Up to 5 emergency contacts", icon: Users },
        { text: "Email, SMS & voice call alerts", icon: Bell },
        { text: "GPS location with what3words", icon: MapPin },
        { text: "Push notifications", icon: Smartphone },
        { text: "Offline SMS check-in backup", icon: MessageSquare },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: false,
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
      trialNote: `£${TIER2_MONTHLY_PRICE.toFixed(2)}/month. All features included. Cancel anytime.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => {
                localStorage.removeItem("aok_landing_type");
                window.location.href = "/";
              }}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              data-testid="button-home"
              aria-label="Back to home"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
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
                <Shield className="h-4 w-4 md:h-5 md:w-5" />
                Personal Wellbeing Made Simple
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Stay Connected With<br />
                <span className="text-primary">Your Loved Ones</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto md:mx-0">
                Personal check-ins and emergency alerts that give you and your family peace of mind. Set your own schedule, add trusted contacts, and know that help is always just a tap away.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a href="#pricing">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-get-started">
                    Get Started
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/demo?type=individual">
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
                    <span className="md:font-medium">From £2.99/month</span>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Stay Safe</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive personal safety and wellbeing tools designed to give you and your loved ones peace of mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg" data-testid="card-feature-checkin-timer">
              <CardContent className="pt-6">
                <div className="rounded-full bg-blue-500/10 p-3 w-fit mb-4">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Flexible Check-In Timer</h3>
                <p className="text-muted-foreground text-sm">
                  Set your check-in schedule from 1 hour to 48 hours. Perfect for any lifestyle or activity.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-multi-channel">
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

            <Card className="border-0 shadow-lg ring-2 ring-primary/20" data-testid="card-feature-shake">
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

            <Card className="border-0 shadow-lg" data-testid="card-feature-emergency">
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

            <Card className="border-0 shadow-lg" data-testid="card-feature-gps">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mb-4">
                  <MapPin className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">GPS Location with what3words</h3>
                <p className="text-muted-foreground text-sm">
                  Share your precise location using what3words addresses. Updated every 5 minutes during emergencies.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-voice">
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

            <Card className="border-0 shadow-lg" data-testid="card-feature-push">
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

            <Card className="border-0 shadow-lg ring-2 ring-primary/20" data-testid="card-feature-sms-offline">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-teal-500/10 p-3 w-fit">
                    <MessageSquare className="h-6 w-6 text-teal-500" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">Offline Safe</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">SMS Check-In When Offline</h3>
                <p className="text-muted-foreground text-sm">
                  No internet? No problem. If you miss a check-in, we text you a reminder. Simply reply to confirm you're safe.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-mood">
              <CardContent className="pt-6">
                <div className="rounded-full bg-emerald-500/10 p-3 w-fit mb-4">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Mood & Wellness Tracking</h3>
                <p className="text-muted-foreground text-sm">
                  Log your mood after check-ins to track your wellbeing over time. Great for spotting patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-pets">
              <CardContent className="pt-6">
                <div className="rounded-full bg-rose-500/10 p-3 w-fit mb-4">
                  <PawPrint className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Pet Protection Profiles</h3>
                <p className="text-muted-foreground text-sm">
                  Store pet profiles with vet info and care instructions. Your contacts can care for your pets if needed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-documents">
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

            <Card className="border-0 shadow-lg" data-testid="card-feature-recording">
              <CardContent className="pt-6">
                <div className="rounded-full bg-red-500/10 p-3 w-fit mb-4">
                  <Play className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Emergency Recording</h3>
                <p className="text-muted-foreground text-sm">
                  Opt-in feature that activates your camera and microphone during emergencies. Recordings are encrypted and shared only with your contacts.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-activities">
              <CardContent className="pt-6">
                <div className="rounded-full bg-teal-500/10 p-3 w-fit mb-4">
                  <Timer className="h-6 w-6 text-teal-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Activities Tracker</h3>
                <p className="text-muted-foreground text-sm">
                  Log everyday activities like walking, shopping, or appointments with a built-in timer. If you don't check back in, your contacts are alerted.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg ring-2 ring-primary/20" data-testid="card-feature-battery">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-yellow-500/10 p-3 w-fit">
                    <BatteryLow className="h-6 w-6 text-yellow-500" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">New</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">Low Battery Alert</h3>
                <p className="text-muted-foreground text-sm">
                  If your phone battery drops below 20% during an active activity, your primary contacts are automatically emailed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-ai">
              <CardContent className="pt-6">
                <div className="rounded-full bg-violet-500/10 p-3 w-fit mb-4">
                  <Sparkles className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Wellbeing AI</h3>
                <p className="text-muted-foreground text-sm">
                  Chat with your personal AI companion about how you're feeling. Get supportive responses, mood insights, and voice chat.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-streaks">
              <CardContent className="pt-6">
                <div className="rounded-full bg-orange-500/10 p-3 w-fit mb-4">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Check-in Streaks</h3>
                <p className="text-muted-foreground text-sm">
                  Build healthy habits by maintaining your check-in streak. Track how many consecutive check-ins you've completed on time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-feature-primary-contact">
              <CardContent className="pt-6">
                <div className="rounded-full bg-rose-500/10 p-3 w-fit mb-4">
                  <Heart className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Primary Contact/Carer</h3>
                <p className="text-muted-foreground text-sm">
                  Designate a primary contact/carer who receives a notification for every successful check-in -  giving them ongoing peace of mind.
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
              <h3 className="text-lg font-semibold mb-2">Start Onboarding</h3>
              <p className="text-sm text-muted-foreground">
                Begin our simple guided setup to create your account and personalise your safety settings.
              </p>
            </div>

            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Add Your Details</h3>
              <p className="text-sm text-muted-foreground">
                Add your personal information and emergency contacts who'll be notified if needed.
              </p>
            </div>

            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Check-In Time</h3>
              <p className="text-sm text-muted-foreground">
                Choose how often you want to check in - from every hour to every 48 hours.
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

      <section id="use-cases" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Uses aok?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed for anyone who wants peace of mind for themselves and their loved ones.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg" data-testid="card-usecase-seniors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-blue-500/10 p-3 w-fit mb-4">
                  <Heart className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Seniors Living Independently</h3>
                <p className="text-muted-foreground text-sm">
                  Stay safe at home with regular check-ins that give your family peace of mind without losing your independence.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-usecase-alone">
              <CardContent className="pt-6">
                <div className="rounded-full bg-green-500/10 p-3 w-fit mb-4">
                  <User className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">People Living Alone</h3>
                <p className="text-muted-foreground text-sm">
                  Whether you're new to a city or simply live alone, aok ensures someone always knows you're safe.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-usecase-travellers">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mb-4">
                  <MapPin className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Solo Travellers</h3>
                <p className="text-muted-foreground text-sm">
                  Exploring the world on your own? Keep your family updated with regular check-ins and GPS sharing.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-usecase-remote">
              <CardContent className="pt-6">
                <div className="rounded-full bg-indigo-500/10 p-3 w-fit mb-4">
                  <Smartphone className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Remote Workers</h3>
                <p className="text-muted-foreground text-sm">
                  Working from home or co-working spaces? Stay connected with your household and check in regularly.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-usecase-health">
              <CardContent className="pt-6">
                <div className="rounded-full bg-red-500/10 p-3 w-fit mb-4">
                  <TrendingUp className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">People with Health Conditions</h3>
                <p className="text-muted-foreground text-sm">
                  Track your wellness, store important medical documents, and ensure your carers are notified if you need help.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" data-testid="card-usecase-pets">
              <CardContent className="pt-6">
                <div className="rounded-full bg-rose-500/10 p-3 w-fit mb-4">
                  <PawPrint className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Pet Owners</h3>
                <p className="text-muted-foreground text-sm">
                  Store pet profiles with vet info and care instructions so your contacts can care for your pets if something happens.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works for you. No free trial — pay as you go.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">SSL Secured</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Label htmlFor="individual-billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="individual-billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-toggle"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="individual-billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
                Yearly
              </Label>
              <Badge variant="secondary" className="text-xs">2 months OFF!</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg" : ""}`}
                data-testid={`card-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-sm" data-testid="badge-most-popular">
                    {(plan as any).trialNote ? "⭐ " : ""}{plan.badge}
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    {(plan as any).isOrganisation ? (
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
                  {(plan as any).trialNote && (
                    <div className="bg-muted/50 border border-border rounded-lg p-3 mt-4">
                      <p className="text-xs text-muted-foreground">{(plan as any).trialNote}</p>
                    </div>
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
        </div>
      </section>

      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about aok for personal use.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-lg border px-6" data-testid="faq-item-1">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-1">
                Is aok free to use?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-1">
                aok has three plans: Basic at £{BASIC_MONTHLY_PRICE.toFixed(2)}/month, Essential at £{TIER1_MONTHLY_PRICE.toFixed(2)}/month, and Complete at £{TIER2_MONTHLY_PRICE.toFixed(2)}/month.
                There is no free trial — you choose and pay for your plan when you sign up. You can upgrade or cancel anytime.
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
                How does Shake to Alert work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-5">
                When enabled, simply shake your phone vigorously to trigger an emergency alert. This works even
                when the screen is locked or the app is in the background. It's designed for situations where
                you can't safely tap the screen.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-card rounded-lg border px-6" data-testid="faq-item-6">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-6">
                Can I track my mood and wellness?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-6">
                Yes! With the Complete Wellbeing plan, you can log your mood after each check-in and track
                your wellbeing over time. You also get access to our Wellbeing AI companion for supportive
                conversations and insights.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-card rounded-lg border px-6" data-testid="faq-item-7">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-7">
                Is my data secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-7">
                Yes! We take security seriously. Your data is encrypted and passwords are hashed.
                Location data from emergency alerts is automatically deleted after 30 days.
                We operate on ISO 27001-certified infrastructure and are UK GDPR compliant.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-card rounded-lg border px-6" data-testid="faq-item-8">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-8">
                What about my pets?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-8">
                With the Complete Wellbeing plan, you can store detailed pet profiles including vet information,
                feeding schedules, and care instructions. If something happens to you, your emergency contacts
                will have everything they need to look after your pets.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="bg-card rounded-lg border px-6" data-testid="faq-item-9">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-9">
                Who gets notified and how?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-9">
                <p className="mb-4">Your contacts are notified through different channels depending on what happens. Here's how it works:</p>
                
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
                        <td colSpan={4} className="py-2 font-semibold text-foreground">Primary Contact / Carer</td>
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
                        <td colSpan={4} className="py-2 font-semibold text-foreground">Other Contacts</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Successful Check-in</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">No</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 pl-4">Missed Check-in</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
                        <td className="text-center py-2 px-2 text-green-600">Yes</td>
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
                
                <p className="mb-4">Your primary contact or carer is kept informed with every successful check-in, so they always know you're safe. All your contacts are alerted during missed check-ins and emergencies.</p>
                
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="font-semibold text-foreground mb-2">On the Basic plan (£2.99/month)</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-medium mt-px">✓</span>
                      <span>1 primary contact + 1 secondary contact</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-medium mt-px">✓</span>
                      <span>Check-in alerts via <strong>email only</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-medium mt-px">✓</span>
                      <span>SOS emergency alerts via <strong>email, SMS & voice call</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-medium mt-px">✓</span>
                      <span>GPS location shared in emergencies</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3">Upgrade to Essential or Complete for up to 5 contacts, SMS/voice check-in alerts, wellness tracking, and more.</p>
                </div>
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
            <a href="#pricing">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" data-testid="button-start-now">
                Get Started
              </Button>
            </a>
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
                <li><a href="mailto:help@aok.care?subject=Support%20Enquiry" className="hover:text-foreground transition-colors" data-testid="link-footer-contact">Contact Us</a></li>
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