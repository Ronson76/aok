import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronRight, Shield, Zap, Globe, Lock, Share2, Plus, TrendingUp, PawPrint, Scroll
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import checkInVideo from "@assets/generated_videos/safety_check-in_confirmation_animation.mp4";
import alertsVideo from "@assets/generated_videos/english_sms_alert_notification.mp4";
import locationVideo from "@assets/generated_videos/uk_streets_gps_map_tracking.mp4";

export default function Landing() {
  const { toast } = useToast();

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
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-green-600">aok</span>
            </div>
            <div className="h-8 w-px bg-muted-foreground/30" />
            <a 
              href="https://health-insight-engine.replit.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center"
              data-testid="link-health-insight"
            >
              <div className="relative h-6 w-6 flex items-center justify-center">
                <div className="w-5 h-1.5 bg-green-600 absolute rounded-sm" />
                <div className="w-1.5 h-5 bg-green-600 absolute rounded-sm" />
                <Heart className="h-2.5 w-2.5 text-green-600 absolute -bottom-1 -right-1" fill="currentColor" />
              </div>
              <span className="text-[10px] font-medium text-green-600 mt-0.5">wellbeing-ai</span>
            </a>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-features">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">How It Works</a>
            <a href="#video" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-tutorial">Tutorial</a>
            <a href="#use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-use-cases">Use Cases</a>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-pricing">Pricing</Link>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button data-testid="button-sign-in">Sign In</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-menu">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare} data-testid="button-share">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share aok
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="mailto:support@aok.app" className="flex items-center gap-2" data-testid="link-contact-us">
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
                via email, SMS, and phone calls if something happens to you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-get-started">
                    Get Started Free
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#video">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" data-testid="button-watch-demo">
                    <Play className="h-4 w-4" />
                    Watch Tutorial
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Free to use
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No credit card
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Setup in 2 mins
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
                  Screenshot protection on contacts, automatic session timeout, and secure data handling.
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
              <h3 className="text-lg font-semibold mb-2">Create Account</h3>
              <p className="text-sm text-muted-foreground">
                Sign up with your email and create a secure password. Add your personal details.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Add Contacts</h3>
              <p className="text-sm text-muted-foreground">
                Enter your emergency contacts' details. They'll confirm via email to receive alerts.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Timer</h3>
              <p className="text-sm text-muted-foreground">
                Choose how often you want to check in - from every 5 minutes to every 48 hours.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">Check In</h3>
              <p className="text-sm text-muted-foreground">
                Tap the button when reminded. If you miss it, your contacts are automatically notified.
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
              See how aok keeps you safe with these core features.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-card border shadow-xl mb-4 max-w-[240px] mx-auto">
                <video 
                  src={checkInVideo} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  controls
                  aria-label="Demo video showing how easy check-ins work in the aok app"
                  className="w-full h-full object-cover"
                  data-testid="video-checkin"
                />
              </div>
              <h4 className="font-semibold mb-1" data-testid="text-feature-checkin">Easy Check-Ins</h4>
              <p className="text-sm text-muted-foreground">One tap to confirm you're aok</p>
            </div>
            
            <div className="text-center">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-card border shadow-xl mb-4 max-w-[240px] mx-auto">
                <video 
                  src={alertsVideo} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  controls
                  aria-label="Demo video showing multi-channel alert notifications"
                  className="w-full h-full object-cover"
                  data-testid="video-alerts"
                />
              </div>
              <h4 className="font-semibold mb-1" data-testid="text-feature-alerts">Multi-Channel Alerts</h4>
              <p className="text-sm text-muted-foreground">Email, SMS, and phone calls</p>
            </div>
            
            <div className="text-center">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-card border shadow-xl mb-4 max-w-[240px] mx-auto">
                <video 
                  src={locationVideo} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  controls
                  aria-label="Demo video showing GPS location tracking and sharing"
                  className="w-full h-full object-cover"
                  data-testid="video-location"
                />
              </div>
              <h4 className="font-semibold mb-1" data-testid="text-feature-location">GPS Location Sharing</h4>
              <p className="text-sm text-muted-foreground">Precise what3words addresses</p>
            </div>
          </div>
        </div>
      </section>

      <section id="video" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See aok in Action</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch our tutorial to learn how to set up and use the aok app.
            </p>
          </div>
          
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-card border shadow-2xl" data-testid="video-tutorial-placeholder">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
              <button 
                type="button"
                className="rounded-full bg-primary/10 p-6 mb-4 hover-elevate transition-colors"
                aria-label="Play tutorial video (coming soon)"
                data-testid="button-play-tutorial"
              >
                <Play className="h-12 w-12 text-primary" />
              </button>
              <p className="text-lg font-medium mb-2" data-testid="text-tutorial-status">Video Tutorial Coming Soon</p>
              <p className="text-sm text-muted-foreground max-w-md text-center px-4">
                A step-by-step guide showing you how to sign up, add contacts, and use all the features of aok.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-4">
              <div className="rounded-full bg-primary/10 p-3 w-fit mx-auto mb-3">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">Account Setup</h4>
              <p className="text-sm text-muted-foreground">Learn how to create your account and personalise your settings.</p>
            </div>
            <div className="text-center p-4">
              <div className="rounded-full bg-primary/10 p-3 w-fit mx-auto mb-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">Adding Contacts</h4>
              <p className="text-sm text-muted-foreground">See how easy it is to add and manage your emergency contacts.</p>
            </div>
            <div className="text-center p-4">
              <div className="rounded-full bg-primary/10 p-3 w-fit mx-auto mb-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">Daily Check-Ins</h4>
              <p className="text-sm text-muted-foreground">Discover the quick check-in process and alert system.</p>
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
                Yes! aok is completely free for individual users. You can add emergency contacts, 
                set up check-in schedules, and receive all notifications at no cost.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-lg border px-6" data-testid="faq-item-2">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-2">
                What happens if I miss a check-in?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-2">
                If you miss a check-in, your emergency contacts are automatically notified via email. 
                They'll receive your registered address and information to help locate you. You'll also 
                hear an alert sound on your phone to remind you to check in.
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
                Yes! We take security seriously. Your data is encrypted, passwords are hashed, and we 
                implement automatic session timeouts. Location data from emergency alerts is automatically 
                deleted after 30 days. The contacts page also has screenshot protection.
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
            <Link href="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" data-testid="button-start-now">
                Create Free Account
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
                <li><a href="#video" className="hover:text-foreground transition-colors" data-testid="link-footer-tutorial">Tutorial</a></li>
                <li><Link href="/pricing"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-pricing">Pricing</span></Link></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors" data-testid="link-footer-faq">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Users</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-signup">Sign Up</span></Link></li>
                <li><Link href="/login"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-signin">Sign In</span></Link></li>
                <li><Link href="/forgot-password"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-reset">Reset Password</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Organisations</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/org/login"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-org-login">Organisation Login</span></Link></li>
                <li><a href="mailto:support@aok.app" className="hover:text-foreground transition-colors" data-testid="link-footer-sales">Contact Sales</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-copyright">
              &copy; {new Date().getFullYear()} aok by Ghuman. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Link href="/admin/login">
                <span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-admin">Admin</span>
              </Link>
              <a href="mailto:support@aok.app" className="hover:text-foreground transition-colors" data-testid="link-footer-support">
                support@aok.app
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
