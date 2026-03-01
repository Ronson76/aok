import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  MessageCircle, MessageSquare, ArrowLeft, Home, TreeDeciduous, Leaf, Timer,
  Map, HardHat, Flame, Moon, BatteryLow, FileCheck, ClipboardCheck, Eye, Handshake, GraduationCap
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

import checkInVideo from "@assets/generated_videos/safety_check-in_confirmation_animation.mp4";
import alertsVideo from "@assets/generated_videos/english_sms_alert_notification.mp4";
import isoBadgeImg from "@/assets/images/iso-27001-badge.png";


interface EcologiImpact {
  trees: number;
  carbonOffset: number;
  testMode?: boolean;
}

export default function Landing() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
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
            <a href="#features" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-features">Challenges</a>
            <a href="#how-it-works" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">Referral Pathway</a>
            <a href="#use-cases" className="text-base font-semibold text-foreground/80 hover:text-foreground transition-colors" data-testid="link-nav-use-cases">Who We Work With</a>
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
                  <a href="#features" data-testid="link-nav-features-mobile">Challenges</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#how-it-works" data-testid="link-nav-how-it-works-mobile">Referral Pathway</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#use-cases" data-testid="link-nav-use-cases-mobile">Who We Work With</a>
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
                A Proactive Safeguarding & Wellbeing Partner
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Working With<br />
                <span className="text-primary">Organisations</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto md:mx-0">
                aok helps organisations move from reactive incident management to continuous, auditable safeguarding oversight. Real-time visibility, structured escalation, and a defensible audit trail — so you can demonstrate duty of care, reduce risk, and protect the people you support.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a href="mailto:help@aok.care?subject=Organisation%20Enquiry">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-get-started">
                    Get a Quote
                    <Mail className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/demo?type=organisation">
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
                    <span className="md:font-medium">Tailored pricing</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <CheckCircle className="h-3 w-3 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    <span className="md:font-medium">Dedicated support</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <CheckCircle className="h-3 w-3 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    <span className="md:font-medium">Full onboarding</span>
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

      {/* Ecologi Environmental Impact & Net Zero Section */}
      {ecologiImpact && (
        <section className="py-16 px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-y border-green-200 dark:border-green-800/50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700 mb-3">Net Zero Commitment</Badge>
              <h3 className="text-2xl md:text-3xl font-bold text-green-800 dark:text-green-300 mb-2">Your Organisation's Environmental Impact</h3>
              <p className="text-sm text-green-700 dark:text-green-400 max-w-2xl mx-auto">
                Every aok subscription contributes to verified tree planting and carbon offsetting through our partnership with{" "}
                <a href="https://ecologi.com/nghuman18" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-green-800 dark:hover:text-green-300">Ecologi</a>.
                Demonstrate your organisation's commitment to net zero with auditable environmental certificates suitable for board reporting and ESG compliance.
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-8">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                <Leaf className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Verified Certificates</p>
                <p className="text-[11px] text-green-700 dark:text-green-400 mt-1">Board-ready environmental impact certificates for ESG reporting and funder submissions</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                <TreeDeciduous className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Automatic Contribution</p>
                <p className="text-[11px] text-green-700 dark:text-green-400 mt-1">Every client and staff account contributes to verified tree planting and carbon offset projects</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                <Shield className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Net Zero Pathway</p>
                <p className="text-[11px] text-green-700 dark:text-green-400 mt-1">Demonstrate measurable progress towards your net zero targets with quantifiable outcomes</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Challenges We Help Solve</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Organisations come to aok when they need to move beyond reactive incident management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-red-500/10 p-3 w-fit mb-4">
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Prevent Safeguarding Incidents</h3>
                <p className="text-muted-foreground text-sm">
                  Shift from responding to incidents after the fact to preventing them through continuous monitoring and early-warning alerts.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-blue-500/10 p-3 w-fit mb-4">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Maintain Stable Tenancies</h3>
                <p className="text-muted-foreground text-sm">
                  Support high-risk or vulnerable individuals safely with structured check-ins that maintain placement stability.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-green-500/10 p-3 w-fit mb-4">
                  <FileCheck className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Evidence Wellbeing Oversight</h3>
                <p className="text-muted-foreground text-sm">
                  Demonstrate duty of care to commissioners and regulators with auditable, time-stamped safeguarding records.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-orange-500/10 p-3 w-fit mb-4">
                  <ClipboardCheck className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Reduce Manual Record-Keeping</h3>
                <p className="text-muted-foreground text-sm">
                  Replace fragmented notes and spreadsheets with automated, real-time safeguarding records that reduce human error.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-500/10 p-3 w-fit mb-4">
                  <CheckCircle className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Demonstrate Compliance</h3>
                <p className="text-muted-foreground text-sm">
                  Be inspection-ready at all times with exportable audit trails that show what was known, when, what action was taken, and by whom.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="rounded-full bg-teal-500/10 p-3 w-fit mb-4">
                  <Users className="h-6 w-6 text-teal-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Coordinate Across Teams</h3>
                <p className="text-muted-foreground text-sm">
                  Multi-agency response support ensures the right people are informed at the right time across multiple teams and partner agencies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Proactive Safeguarding Model</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              aok creates a live, organisation-level safeguarding timeline — moving safeguarding from reactive to preventative, assumed to evidenced, manual to automated.
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-6">
            {[
              { step: "1", title: "Early Visibility", description: "Structured check-ins confirm wellbeing, location, and activity in real time.", icon: Eye },
              { step: "2", title: "Risk Identification", description: "Missed check-ins and behavioural changes are automatically flagged.", icon: AlertTriangle },
              { step: "3", title: "Controlled Escalation", description: "Alerts follow a defined pathway — ensuring the right people are informed at the right time.", icon: Bell },
              { step: "4", title: "Multi-Agency Response", description: "Authorised partners can be included in the safeguarding loop.", icon: Users },
              { step: "5", title: "Full Audit Trail", description: "Every action is securely time-stamped and exportable.", icon: FileCheck },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <item.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
            <Card className="border-primary/20 bg-primary/5 text-center">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground line-through mb-1">Reactive</p>
                <p className="text-lg font-bold text-primary">Preventative</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5 text-center">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground line-through mb-1">Assumed</p>
                <p className="text-lg font-bold text-primary">Evidenced</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5 text-center">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground line-through mb-1">Manual</p>
                <p className="text-lg font-bold text-primary">Automated</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Your Organisation Can See</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              True operational oversight through the aok dashboard — not fragmented notes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Real-Time Wellbeing Status", description: "Live status across all your service users or staff, updated continuously.", icon: Heart },
              { title: "Missed Check-ins & Active Alerts", description: "Instant visibility into who needs attention right now.", icon: AlertTriangle },
              { title: "Response & Resolution Timelines", description: "Track how quickly your team responds and resolves issues.", icon: Clock },
              { title: "Engagement & Support Trends", description: "Identify patterns in user engagement and emerging support needs.", icon: TrendingUp },
              { title: "Historical Safeguarding Records", description: "Complete, searchable history of every check-in, alert, and action taken.", icon: Scroll },
              { title: "Exportable Reports", description: "Generate funder-ready PDF and CSV reports for commissioners, boards, and regulators.", icon: FileCheck },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <item.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Governance & Quality Assurance</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              aok is designed to support safeguarding accountability, inspection readiness, internal audit processes, risk management frameworks, and data protection.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Every Interaction Is:</h3>
                <ul className="space-y-3">
                  {["Time-stamped", "Role-attributed", "Securely stored", "Exportable for review"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">So You Can Evidence:</h3>
                <ul className="space-y-3">
                  {["What was known", "When it was known", "What action was taken", "Who took it"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Referral Pathway</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From initial conversation to scaled deployment — a structured, measured approach.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Initial Conversation</h3>
              <p className="text-sm text-muted-foreground">
                We map your service model, risk profile, and safeguarding structure to understand your needs.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Pilot Setup</h3>
              <p className="text-sm text-muted-foreground">
                A controlled rollout with agreed cohorts and measurable outcomes so you can evaluate impact before scaling.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Dashboard Activation</h3>
              <p className="text-sm text-muted-foreground">
                Your organisation receives live oversight, real-time reporting, and full access to safeguarding tools.
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">Review &amp; Scale</h3>
              <p className="text-sm text-muted-foreground">
                Measured impact review and service expansion across your organisation based on demonstrated outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Your Clients Experience</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what your service users and staff interact with — simple, accessible tools that drive the data behind your dashboard.
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who We Work With</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Organisations across the UK trust aok to safeguard their clients, residents, and staff.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Local Authorities",
                description: "Deliver duty-of-care obligations with measurable assurance, real-time monitoring dashboards, and defensible decision-making.",
                icon: Shield
              },
              {
                title: "Housing Associations & Supported Housing",
                description: "Support tenants and residents in supported housing with configurable safety schedules and structured escalation workflows.",
                icon: Building2
              },
              {
                title: "Charities & Third Sector",
                description: "Safeguard vulnerable clients with funder-ready audit trails, compliance reporting, and measurable outcomes for commissioners.",
                icon: Users
              },
              {
                title: "Universities & Student Accommodation",
                description: "Protect students in independent living environments with automated wellbeing check-ins and early intervention alerts.",
                icon: GraduationCap
              },
              {
                title: "Care & Support Providers",
                description: "Monitor service users across care homes, domiciliary care, and supported living with continuous, auditable safeguarding oversight.",
                icon: Heart
              },
              {
                title: "Lone-Worker Employers & Community Services",
                description: "Protect staff who work alone or in the community with automatic check-ins, GPS tracking, and real-time supervisor alerts.",
                icon: HardHat
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

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who We Support</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              aok is suitable for a wide range of individuals across your services.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              "Vulnerable adults",
              "Young people and care leavers",
              "Residents in supported housing",
              "Individuals in dispersed accommodation",
              "Lone workers and community-based staff",
              "Students and independent living environments"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card border">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Outcomes for Organisations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our partners use aok to deliver measurable improvements across their services.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Reduce Safeguarding Escalations", icon: Shield },
              { title: "Prevent Crisis Situations", icon: AlertTriangle },
              { title: "Strengthen Commissioning Confidence", icon: FileCheck },
              { title: "Protect Organisational Reputation", icon: Building2 },
              { title: "Improve Staff Efficiency", icon: TrendingUp },
              { title: "Increase Service User Stability", icon: Heart },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-lg bg-card border shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partnership & Communication</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We work as an extension of your safeguarding structure.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              "Defined implementation support",
              "Clear escalation mapping aligned to your policies",
              "Regular data insight reviews",
              "Ongoing development in line with your service needs"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                <Handshake className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-primary/30 shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Built for the Future of Commissioning</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Funding and regulatory environments increasingly require demonstrable safeguarding oversight, measurable outcomes, real-time reporting, and defensible decision-making. aok provides the data structure that enables this.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
                {[
                  "Demonstrable oversight",
                  "Measurable outcomes",
                  "Real-time reporting",
                  "Defensible decisions"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 justify-center p-3 rounded-lg bg-primary/10">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <a href="mailto:help@aok.care?subject=Pilot%20Discussion">
                <Button size="lg" className="gap-2" data-testid="button-start-pilot">
                  <Mail className="h-4 w-4" />
                  Start a Pilot
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                Contact us to discuss your service and pilot availability.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tailored to your organisation. No one-size-fits-all.
            </p>
          </div>

          <Card className="border-primary shadow-lg" data-testid="card-pricing-contact">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Contact Us for Pricing</CardTitle>
              <CardDescription className="text-base mt-2">
                Organisation pricing depends on the number of clients, staff, and the features your service requires. We'll work with you to build a package that fits your organisation and budget.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Core Platform
                  </p>
                  <ul className="space-y-3 ml-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Flexible pricing based on organisation size</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Custom bundle allocations and seat packages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Volume discounts for larger organisations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Dedicated onboarding, training, and account management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Full access to safeguarding, audit trails, and compliance tools</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-indigo-500" />
                    Funder Ready
                  </p>
                  <ul className="space-y-3 ml-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-500" />
                      <span className="text-sm">Tamper-evident audit trails with hash-chain verification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-500" />
                      <span className="text-sm">Exportable PDF and CSV compliance reports for funders and regulators</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-500" />
                      <span className="text-sm">Measurable outcomes and evidence of safeguarding impact</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Assurance Dashboard
                  </p>
                  <ul className="space-y-3 ml-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-sm">Real-time assurance scoring across your client base</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-sm">Board-level reporting with RAG status indicators</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-sm">Trend analysis and early-warning indicators for at-risk clients</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-blue-500" />
                    GRC (Governance, Risk & Compliance)
                  </p>
                  <ul className="space-y-3 ml-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-sm">Role-based access control with 8-tier permission hierarchy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-sm">Full security audit logging with PII redaction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-sm">UK GDPR-compliant data handling and retention policies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="text-sm">Two-factor authentication (TOTP) for all accounts</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-600" />
                    Environmental Impact & Net Zero
                  </p>
                  <ul className="space-y-3 ml-6">
                    <li className="flex items-start gap-2">
                      <TreeDeciduous className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span className="text-sm">Verified tree planting and carbon offsetting via Ecologi for every account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span className="text-sm">Board-ready environmental impact certificates for ESG and funder reporting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span className="text-sm">Demonstrate measurable progress towards your organisation's net zero targets</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Infrastructure
                  </p>
                  <ul className="space-y-3 ml-6">
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">ISO 27001-compliant, UK GDPR-ready infrastructure</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">External API access available for integration with existing systems</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Circuit breaker resilience with multi-provider notification fallback</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <a href="mailto:help@aok.care?subject=Organisation%20Pricing%20Enquiry" className="w-full">
                <Button className="w-full" size="lg" data-testid="button-contact-pricing">
                  <Mail className="h-4 w-4 mr-2" />
                  Get a Quote
                </Button>
              </a>
              <p className="text-xs text-muted-foreground text-center">
                Email help@aok.care or use the button above. We typically respond within 24 hours.
              </p>
            </CardFooter>
          </Card>
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
                How much does aok cost for organisations?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-1">
                Organisation pricing is tailored to your needs — it depends on the number of clients, staff members, 
                and features you require. Contact us at help@aok.care for a personalised quote.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-lg border px-6" data-testid="faq-item-2">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-2">
                What happens when a client misses a check-in?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-2">
                Your organisation dashboard updates in real time. When a client misses a check-in, their status changes immediately 
                and designated staff members are alerted via email. The client's location is shared through what3words — a simple 
                three-word address that pinpoints their location to within 3 metres — so your team can respond quickly.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bg-card rounded-lg border px-6" data-testid="faq-item-3">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-3">
                How do emergency alerts work for organisations?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-3">
                When a client triggers an emergency alert, your organisation's designated staff are immediately notified 
                via email, SMS, and automated phone calls. The client's GPS location is shared on the dashboard and 
                updated every 5 minutes until the alert is resolved. Your team can monitor all active alerts from a single view.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="bg-card rounded-lg border px-6" data-testid="faq-item-4">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-4">
                How do we onboard clients?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-4">
                You can add clients individually from the dashboard or bulk import them via Excel spreadsheet. 
                Once added, clients receive an SMS invitation to set up their account. Your staff can also 
                register clients directly on their behalf and manage their check-in schedules and emergency contacts.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="bg-card rounded-lg border px-6" data-testid="faq-item-5">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-5">
                Can we customise check-in schedules per client?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-5">
                Yes. Each client can have their own check-in schedule tailored to their needs — from every hour 
                to every 48 hours. Your staff can set and adjust schedules directly from the organisation dashboard, 
                so higher-risk clients can be monitored more frequently.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6" className="bg-card rounded-lg border px-6" data-testid="faq-item-6">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-6">
                Is client data secure and compliant?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-6">
                Yes. All data is encrypted in transit and at rest. Passwords are hashed and location data from 
                emergency alerts is automatically deleted after 30 days. The platform includes full audit trails, 
                role-based access controls, and safeguarding features to help your organisation meet regulatory 
                and compliance requirements.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-7" className="bg-card rounded-lg border px-6" data-testid="faq-item-7">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-7">
                What types of organisations use aok?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-7">
                aok is used by care homes, housing associations, charities, local authorities, domiciliary care providers, 
                and supported living services. Any organisation responsible for the safety and wellbeing of vulnerable 
                individuals or lone workers can benefit from aok's monitoring and safeguarding tools.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-8" className="bg-card rounded-lg border px-6" data-testid="faq-item-8">
              <AccordionTrigger className="text-left font-semibold" data-testid="button-faq-8">
                How are staff and roles managed?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid="text-faq-answer-8">
                <p className="mb-4">Organisation administrators can invite staff members and assign roles with different permission levels. Here's how notifications are routed to your team:</p>
                
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
                        <td colSpan={4} className="py-2 font-semibold text-foreground">Designated Staff / Key Workers</td>
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
                        <td colSpan={4} className="py-2 font-semibold text-foreground">Other Staff</td>
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
                
                <p>This ensures key workers stay informed about their assigned clients, while broader staff are only alerted during genuine emergencies — reducing notification fatigue across your team.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <Shield className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start a Pilot
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            We recommend beginning with a defined pilot so your organisation can measure risk reduction, evidence operational value, and demonstrate impact to commissioners and boards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:help@aok.care?subject=Organisation%20Enquiry">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2" data-testid="button-start-now">
                <Mail className="h-4 w-4" />
                Get a Quote
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
                Enterprise safeguarding and compliance for care organisations.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors" data-testid="link-footer-features">Challenges</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors" data-testid="link-footer-how-it-works">Referral Pathway</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors" data-testid="link-footer-pricing">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors" data-testid="link-footer-faq">FAQ</a></li>
                <li><Link href="/guide"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-guide">How-to Guide</span></Link></li>
                <li><Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-terms">Terms and Conditions</span></Link></li>
                <li><Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-privacy">Privacy Policy</span></Link></li>
                <li><Link href="/security"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-security">Security & Compliance</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Organisations</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/org/login"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-org-login">Organisation Login</span></Link></li>
                <li><a href="mailto:help@aok.care?subject=Organisation%20Enquiry" className="hover:text-foreground transition-colors" data-testid="link-footer-sales">Contact Sales</a></li>
                <li><Link href="/org/help"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-org-help">Help Centre</span></Link></li>
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
