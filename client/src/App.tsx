import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { SplashScreen } from "@/components/splash-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AdminProvider, useAdmin } from "@/contexts/admin-context";
import { Loader2, ShieldCheck, Volume2, MoreVertical, Mail, QrCode, Share2, Plus, Heart } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import type { StatusData } from "@shared/schema";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Mood from "@/pages/mood";
import Pets from "@/pages/pets";
import Documents from "@/pages/documents";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminBundles from "@/pages/admin/bundles";
import OrganizationDashboard from "@/pages/org/dashboard";
import OrganizationLogin from "@/pages/org/login";
import Activate from "@/pages/activate";
import { TermsModal } from "@/components/terms-modal";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Block access entirely until terms are accepted
  const hasAcceptedTerms = user?.termsAcceptedAt != null;

  if (!hasAcceptedTerms) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <TermsModal open={true} />
      </div>
    );
  }

  return <Component />;
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/app" />;
  }

  return <Component />;
}

function AdminProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAdmin();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function AdminAuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAdmin();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/admin" />;
  }

  return <Component />;
}

function AppRoutes() {
  const { user } = useAuth();
  const isOrganization = user?.accountType === "organization";

  return (
    <Switch>
      <Route path="/app" component={() => <ProtectedRoute component={isOrganization ? OrganizationDashboard : Dashboard} />} />
      <Route path="/app/org" component={() => <ProtectedRoute component={OrganizationDashboard} />} />
      <Route path="/org/dashboard" component={() => <ProtectedRoute component={OrganizationDashboard} />} />
      <Route path="/app/contacts" component={() => <ProtectedRoute component={Contacts} />} />
      <Route path="/app/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/app/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/app/mood" component={() => <ProtectedRoute component={Mood} />} />
      <Route path="/app/pets" component={() => <ProtectedRoute component={Pets} />} />
      <Route path="/app/documents" component={() => <ProtectedRoute component={Documents} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = "https://aok.care";
  const showMenu = ['/', '/login', '/app'].includes(location);

  const handleShareLink = async () => {
    const shareText = "Stay safe with aok - a personal safety check-in app that alerts your emergency contacts if something happens to you.";
    
    // Try Web Share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "aok - Personal Safety Check-in",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard. Paste it in a text or email.",
      });
    } catch (err) {
      toast({
        title: "Unable to share",
        description: "Please copy this link: " + shareUrl,
        variant: "destructive",
      });
    }
  };

  const { data: status } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  const isOverdue = status?.status === "overdue";

  const playAlarmSound = () => {
    if (audioContextRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      
      const playBeep = () => {
        if (!audioContextRef.current) return;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.stop(ctx.currentTime + 0.5);
      };
      
      playBeep();
      alarmIntervalRef.current = setInterval(playBeep, 120000);
      setAlarmPlaying(true);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAlarmPlaying(false);
  };

  useEffect(() => {
    if (isOverdue) {
      playAlarmSound();
      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(1);
      }
    } else {
      stopAlarmSound();
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge();
      }
    }
    
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isOverdue]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <div className="flex items-center gap-2 cursor-pointer relative" data-testid="link-home-logo">
                <ShieldCheck className="h-8 w-8 text-green-600" />
                <span className="text-xl font-bold text-green-600">aok</span>
                {isOverdue && (
                  <span className="absolute -top-1 -right-3 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    1
                  </span>
                )}
              </div>
            </Link>
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
          {showMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-menu">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareLink} data-testid="menu-share-link">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowQRDialog(true)} data-testid="menu-share-qr">
                  <QrCode className="h-4 w-4 mr-2" />
                  Share QR Code
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="mailto:support@aok.app" className="flex items-center gap-2" data-testid="link-contact-us">
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>
      
      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share aok</DialogTitle>
            <DialogDescription>
              Scan this QR code to download the aok app and stay safe with your loved ones.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG 
                value={appUrl} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {appUrl}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {alarmPlaying && (
        <div className="sticky top-[52px] z-30 max-w-md mx-auto px-4 py-2">
          <Card className="border-destructive bg-destructive/10 animate-pulse">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Check-In Overdue</p>
                  <p className="text-xs text-muted-foreground">Check in now to stop the alarm</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <main className="pb-16">
        <AppRoutes />
      </main>
      <BottomNav />
    </div>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin" component={() => <AdminProtectedRoute component={AdminDashboard} />} />
      <Route path="/admin/users" component={() => <AdminProtectedRoute component={AdminUsers} />} />
      <Route path="/admin/bundles" component={() => <AdminProtectedRoute component={AdminBundles} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (location === "/" && !isLoading && isAuthenticated) {
      setLocation("/app");
    }
  }, [location, isLoading, isAuthenticated, setLocation]);

  if (location === "/") {
    if (isLoading || isAuthenticated) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return <Landing />;
  }

  if (location === "/login") {
    return <AuthRoute component={Login} />;
  }

  if (location === "/register") {
    return <AuthRoute component={Register} />;
  }

  if (location === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (location.startsWith("/reset-password")) {
    return <ResetPassword />;
  }

  if (location === "/activate") {
    return <Activate />;
  }

  if (location === "/org/login") {
    return <AuthRoute component={OrganizationLogin} />;
  }

  if (location === "/admin/login") {
    return (
      <AdminProvider>
        <AdminAuthRoute component={AdminLogin} />
      </AdminProvider>
    );
  }

  if (location.startsWith("/admin")) {
    return (
      <AdminProvider>
        <AdminRoutes />
      </AdminProvider>
    );
  }

  return <AppLayout />;
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem("splashShown") !== "true";
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem("splashShown", "true");
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
