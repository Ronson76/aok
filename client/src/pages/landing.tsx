import { useState } from "react";
import { Link } from "wouter";
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
  MessageCircle, MessageSquare
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

import checkInVideo from "@assets/generated_videos/safety_check-in_confirmation_animation.mp4";
import alertsVideo from "@assets/generated_videos/english_sms_alert_notification.mp4";
import locationVideo from "@assets/generated_videos/uk_streets_gps_map_tracking.mp4";

const MONTHLY_PRICE = 6.99;
const YEARLY_PRICE = 69.99;

export default function Landing() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      name: "Complete Protection",
      description: "Everything you need to stay safe and connected.",
      monthlyPrice: MONTHLY_PRICE,
      yearlyPrice: YEARLY_PRICE,
      features: [
        { text: "Flexible check-in timer (5 mins to 48 hours)", icon: Clock },
        { text: "Up to 5 emergency contacts", icon: Users },
        { text: "Email, SMS & voice call alerts", icon: Bell },
        { text: "Emergency alert button", icon: AlertTriangle },
        { text: "GPS location with what3words", icon: MapPin },
        { text: "Push notifications", icon: Smartphone },
        { text: "Primary contact updates", icon: Heart },
        { text: "Mood & wellness tracking", icon: TrendingUp },
        { text: "Pet protection profiles", icon: PawPrint },
        { text: "Digital will storage", icon: Scroll },
        { text: "Wellbeing AI (Exclusive)", icon: Sparkles },
      ],
      cta: "Get Started",
      ctaLink: "/onboarding",
      highlight: true,
      badge: "All Features Included",
      launchNote: "Launch pricing - Lock in today's rate forever",
      priceProtected: true,
    },
    {
      name: "Organisations",
      description: "Protect your staff, clients, or residents.",
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        { text: "All Complete Protection features", icon: Check },
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

  const handleShare = async () => {
    const shareUrl = "https://aok.care";
    const shareText = "Stay safe with aok - a personal safety check-in app that alerts your emergency contacts if something happens to you.";
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "aok - Personal Safety Check-in",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Unable to share",
        description: "Please copy this link: " + shareUrl,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-9 w-9 text-green-600" />
              <span className="text-2xl font-bold text-green-600">aok</span>
            </div>
            <div className="h-8 w-px bg-muted-foreground/30" />
            <a 
              href="https://health-insight-engine.replit.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-start"
              data-testid="link-health-insight"
            >
              <div className="relative h-7 w-7 flex items-center justify-center mb-0.5">
                <div className="w-5 h-2 bg-green-600 absolute rounded-sm" />
                <div className="w-2 h-5 bg-green-600 absolute rounded-sm" />
                <Heart className="h-2.5 w-2.5 text-green-600 absolute -bottom-0.5 -right-0.5" fill="currentColor" />
              </div>
              <span className="text-xs font-semibold text-green-600 leading-none whitespace-nowrap">wellbeing-ai</span>
            </a>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-features">Features</a>
            <a href="#how-it-works" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">How It Works</a>
            <a href="#use-cases" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-use-cases">Who Uses aok</a>
            <a href="#pricing" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-pricing">Pricing</a>
            <a href="#faq" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <a href="#" className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border hover-elevate" data-testid="link-app-store-header">
                <SiApple className="h-5 w-5 text-black dark:text-white" />
                <span className="sr-only">App Store</span>
              </a>
              <a href="#" className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border hover-elevate" data-testid="link-play-store-header">
                <SiGoogleplay className="h-5 w-5 text-[#414141] dark:text-[#34A853]" />
                <span className="sr-only">Google Play</span>
              </a>
            </div>
            {user ? (
              <Button 
                onClick={handleLogout} 
                disabled={isLoggingOut}
                variant="outline"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </Button>
            ) : (
              <Link href="/login">
                <Button size="sm" data-testid="button-sign-in">Sign In</Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-menu">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild className="md:hidden">
                  <a href="#features" data-testid="link-nav-features-mobile">Features</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <a href="#how-it-works" data-testid="link-nav-how-it-works-mobile">How It Works</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <a href="#use-cases" data-testid="link-nav-use-cases-mobile">Who Uses aok</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <a href="#pricing" data-testid="link-nav-pricing-mobile">Pricing</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
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
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Shield className="h-4 w-4" />
                Personal Safety Made Simple
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Stay Safe.<br />
                <span className="text-primary">Stay Connected.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                The personal safety check-in app that alerts your emergency contacts 
                via email, SMS, and phone calls if something happens to you — with unlimited access to our AI-powered health assistant.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/onboarding">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-get-started">
                    Get Started Free
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="w-full flex justify-center mt-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>Free trial</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>No commitment</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>Easy set up</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative mx-auto w-64 md:w-80">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
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

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Stay Safe</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive safety features designed to give you and your loved ones complete peace of mind.
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

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-amber-500/10 p-3 w-fit mb-4">
                  <Users className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multiple Contacts</h3>
                <p className="text-muted-foreground text-sm">
                  Add family, friends, neighbors, or anyone you trust. Set a primary contact for regular updates.
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
                <h3 className="text-lg font-semibold mb-2">Digital Will Storage</h3>
                <p className="text-muted-foreground text-sm">
                  Securely store important documents like wills, power of attorney, and healthcare directives.
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
              See how aok keeps you safe — the only safety app with built-in wellbeing support.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="text-center">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl mb-4 max-w-[200px] mx-auto flex flex-col items-center justify-center p-6">
                <div className="animate-pulse">
                  <Check className="h-20 w-20 text-green-600 mb-4 animate-bounce" strokeWidth={3} style={{ animationDuration: '2s' }} />
                </div>
                <span className="text-gray-800 dark:text-gray-200 font-semibold text-lg animate-pulse" style={{ animationDuration: '3s' }}>you're aok</span>
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-checkin">Easy Check-Ins</h4>
              <p className="text-xs md:text-sm text-muted-foreground">One tap to confirm you're aok</p>
            </div>
            
            <div className="text-center">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl mb-4 max-w-[200px] mx-auto flex flex-col items-center justify-center p-4 gap-3">
                <div className="flex items-center gap-3 w-full px-2 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg animate-pulse" style={{ animationDelay: '0s', animationDuration: '2s' }}>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">WhatsApp Alert</span>
                </div>
                <div className="flex items-center gap-3 w-full px-2 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '2s' }}>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">SMS Alert</span>
                </div>
                <div className="flex items-center gap-3 w-full px-2 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '2s' }}>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Email Alert</span>
                </div>
                <div className="flex items-center gap-3 w-full px-2 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '2s' }}>
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Phone Call</span>
                </div>
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-alerts">Multi-Channel Alerts</h4>
              <p className="text-xs md:text-sm text-muted-foreground">Email, SMS, WhatsApp, and calls</p>
            </div>
            
            <div className="text-center">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-card border shadow-xl mb-4 max-w-[200px] mx-auto">
                <video 
                  src={locationVideo} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  aria-label="Demo video showing GPS location tracking and sharing"
                  className="w-full h-full object-cover pointer-events-none"
                  data-testid="video-location"
                />
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-location">GPS Location Sharing</h4>
              <p className="text-xs md:text-sm text-muted-foreground">Precise what3words addresses</p>
            </div>
            
            <div className="text-center">
              <a 
                href="https://health-insight-engine.replit.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
                data-testid="link-wellbeing-feature"
              >
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-green-600/30 shadow-xl mb-4 max-w-[200px] mx-auto flex flex-col items-center justify-center p-6">
                  <div className="relative h-16 w-16 mb-4 flex items-center justify-center animate-pulse" style={{ animationDuration: '2s' }}>
                    <div className="w-14 h-4 bg-green-600 absolute rounded-md" />
                    <div className="w-4 h-14 bg-green-600 absolute rounded-md" />
                    <Heart className="h-4 w-4 text-green-600 absolute -bottom-1 -right-1 animate-bounce" style={{ animationDuration: '1.5s' }} fill="currentColor" />
                  </div>
                  <p className="text-gray-400 text-xs text-center leading-relaxed animate-pulse" style={{ animationDuration: '3s' }}>AI-powered health advice at your fingertips</p>
                </div>
              </a>
              <h4 className="font-semibold mb-1 text-sm md:text-base" data-testid="text-feature-wellbeing">Built-in Wellbeing App</h4>
              <p className="text-xs md:text-sm text-muted-foreground">AI health advice included</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg md:scale-105" : ""}`}
                data-testid={`card-landing-plan-${plan.name.toLowerCase()}`}
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
                          <feature.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
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
                The app gives you 7 days free and then we charge a nominal fee of £{MONTHLY_PRICE.toFixed(2)} per month 
                for our Complete Protection package, which includes all features.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-lg border px-6" data-testid="faq-item-2">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-2">
                What happens if I miss a check-in?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-2">
                If you miss a check-in, your primary contact is alerted by email and your location is shared 
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
            <Link href="/org/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground" data-testid="button-org-signup">
                Organisation Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="font-bold text-primary">aok</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your personal safety check-in companion. Stay safe, stay connected.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors" data-testid="link-footer-features">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors" data-testid="link-footer-how-it-works">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors" data-testid="link-footer-pricing">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors" data-testid="link-footer-faq">FAQ</a></li>
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
                <li><Link href="/org/login"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-org-login">Organisation Login</span></Link></li>
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
              &copy; {new Date().getFullYear()} aok by Ghuman. All rights reserved.
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
        </div>
      </footer>
    </div>
  );
}
