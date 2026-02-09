import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { SplashScreen } from "@/components/splash-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AdminProvider, useAdmin } from "@/contexts/admin-context";
import { HeartbeatProvider } from "@/contexts/heartbeat-context";
import { OfflineEmergencyOverlay } from "@/components/offline-emergency-overlay";
import { Loader2, ShieldCheck, Volume2, MoreVertical, Mail, QrCode, Share2, Plus, Heart, Search } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import type { StatusData, Settings as SettingsType } from "@shared/schema";
import { useShakeDetector } from "@/hooks/use-shake-detector";
import { EmergencyConfirmOverlay } from "@/components/emergency-confirm-overlay";
import { shakeDetector } from "@/lib/shake-detector";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import LoginSelect from "@/pages/login-select";
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
import AdminForgotPassword from "@/pages/admin/forgot-password";
import AdminResetPassword from "@/pages/admin/reset-password";
import AdminUsersReport from "@/pages/admin/users-report";
import AdminRegistrationsReport from "@/pages/admin/registrations-report";
import AdminEmergencyAlertsReport from "@/pages/admin/emergency-alerts-report";
import AdminMissedCheckInsReport from "@/pages/admin/missed-checkins-report";
import OrganizationDashboard from "@/pages/org/dashboard";
import OrgLoginSelect from "@/pages/org/login-select";
import OrganizationClientLogin from "@/pages/org/client-login";
import OrganizationStaffLogin from "@/pages/org/staff-login";
import OrgTeamLogin from "@/pages/org/team-login";
import OrgForgotPassword from "@/pages/org/forgot-password";
import OrgResetPassword from "@/pages/org/reset-password";
import OrgSetupPassword from "@/pages/org/setup-password";
import OrgSafeguarding from "@/pages/org/safeguarding";
import OrgLoneWorkerHub from "@/pages/org/lone-worker-hub";
import OrgMissedCheckInsReport from "@/pages/org/missed-checkins-report";
import OrgEmergencyAlertsReport from "@/pages/org/emergency-alerts-report";
import OrgTeamInvite from "@/pages/org/team-invite";
import OrgTeam from "@/pages/org/team";
import AdminTeam from "@/pages/admin/team";
import AdminInvite from "@/pages/admin/invite";
import AdminArchitecture from "@/pages/admin/architecture";
import AdminWorkflows from "@/pages/admin/workflows";
import AdminRevenue from "@/pages/admin/revenue";
import AdminPermissions from "@/pages/admin/permissions";
import AdminServiceHealth from "@/pages/admin/service-health";
import Activate from "@/pages/activate";
import Pricing from "@/pages/pricing";
import Onboarding from "@/pages/onboarding";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import EULA from "@/pages/eula";
import EnterpriseLicence from "@/pages/enterprise-licence";
import DataProcessingAddendum from "@/pages/data-processing-addendum";
import SLA from "@/pages/sla";
import LoneWorkerAddendum from "@/pages/lone-worker-addendum";
import IPOwnership from "@/pages/ip-ownership";
import NDA from "@/pages/nda";
import AdminLicenceAgreements from "@/pages/admin/licence-agreements";
import Guide from "@/pages/guide";
import ConfirmContact from "@/pages/confirm-contact";
import WellbeingAI from "@/pages/wellbeing-ai";
import LoneWorker from "@/pages/lone-worker";
import Errands from "@/pages/errands";
import Demo from "@/pages/demo";
import { TermsModal } from "@/components/terms-modal";

function PaymentBlockedScreen() {
  const { logout } = useAuth();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Payment Required</h2>
          <p className="text-muted-foreground">
            Your payment could not be processed. Please update your payment details to continue using aok.
          </p>
          <p className="text-sm text-muted-foreground">
            We've sent an email with instructions on how to update your payment.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Link href="/app/settings">
              <Button className="w-full" data-testid="button-update-payment">
                Update Payment Details
              </Button>
            </Link>
            <Button variant="outline" onClick={logout} className="w-full" data-testid="button-logout-payment">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtectedRoute({ component: Component, allowPaymentBlocked = false }: { component: React.ComponentType, allowPaymentBlocked?: boolean }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  const { data: paymentStatus } = useQuery<{ blocked: boolean; reason: string | null }>({
    queryKey: ["/api/stripe/payment-status"],
    enabled: isAuthenticated && !isLoading,
    refetchInterval: 60000,
  });
  
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

  // Check payment status - block access if payment failed (except for settings page)
  if (!allowPaymentBlocked && paymentStatus?.blocked) {
    return <PaymentBlockedScreen />;
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
  const isStaff = !!(user as any)?.isStaffMember;

  return (
    <Switch>
      <Route path="/app" component={() => <ProtectedRoute component={isOrganization ? OrganizationDashboard : isStaff ? LoneWorker : Dashboard} />} />
      <Route path="/app/lone-worker" component={() => <ProtectedRoute component={LoneWorker} />} />
      <Route path="/app/org" component={() => <ProtectedRoute component={OrganizationDashboard} />} />
      <Route path="/org/dashboard" component={() => <ProtectedRoute component={OrganizationDashboard} />} />
      <Route path="/org/safeguarding" component={() => <ProtectedRoute component={OrgSafeguarding} />} />
      <Route path="/org/lone-worker" component={() => <ProtectedRoute component={OrgLoneWorkerHub} />} />
      <Route path="/org/team" component={() => <ProtectedRoute component={OrgTeam} />} />
      <Route path="/org/missed-checkins" component={() => <ProtectedRoute component={OrgMissedCheckInsReport} />} />
      <Route path="/org/emergency-alerts" component={() => <ProtectedRoute component={OrgEmergencyAlertsReport} />} />
      <Route path="/app/contacts" component={() => <ProtectedRoute component={Contacts} />} />
      <Route path="/app/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/app/settings" component={() => <ProtectedRoute component={Settings} allowPaymentBlocked={true} />} />
      <Route path="/app/mood" component={() => <ProtectedRoute component={Mood} />} />
      <Route path="/app/pets" component={() => <ProtectedRoute component={Pets} />} />
      <Route path="/app/documents" component={() => <ProtectedRoute component={Documents} />} />

      <Route path="/app/errands" component={() => <ProtectedRoute component={Errands} />} />
      <Route path="/app/wellbeing-ai" component={() => <ProtectedRoute component={WellbeingAI} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = "https://aok.care";
  const showMenu = ['/', '/login', '/app'].includes(location);
  const isOrgManagedClient = !!user?.referenceId;

  const handleShareLink = async () => {
    const shareText = "Stay connected with aok — a personal check-in app that notifies your emergency contacts if you miss a check-in.";
    
    // Try Web Share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "aok - Personal Check-in App",
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

  // Fetch settings for shake-to-SOS
  const { data: settings } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  // Shake-to-SOS state
  const [showShakeOverlay, setShowShakeOverlay] = useState(false);
  const [shakeLocation, setShakeLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Emergency mutation for shake-triggered alerts
  const shakeEmergencyMutation = useMutation({
    mutationFn: async (data: { location?: { latitude: number; longitude: number }; isAutoSend?: boolean }) => {
      const response = await apiRequest("POST", "/api/emergency", { 
        location: data.location,
        trigger_type: "shake",
        created_at: new Date().toISOString(),
      });
      return response;
    },
    onSuccess: () => {
      setShowShakeOverlay(false);
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/status"] });
      toast({
        title: "Emergency Alert Sent",
        description: "Your emergency contacts have been notified.",
      });
    },
    onError: (error: any) => {
      setShowShakeOverlay(false);
      toast({
        title: "Alert Failed",
        description: error?.message || "Failed to send emergency alert",
        variant: "destructive",
      });
    },
  });

  // Handle shake detection
  const handleShakeDetected = useCallback(() => {
    if (showShakeOverlay) return; // Already showing overlay
    
    // Try to get current location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setShakeLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          setShakeLocation(null); // Location failed, continue without it
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
    
    setShowShakeOverlay(true);
  }, [showShakeOverlay]);

  // Use shake detector hook
  useShakeDetector({
    enabled: isAuthenticated && (settings?.shakeToSOSEnabled ?? false),
    onShakeDetected: handleShakeDetected,
  });

  const handleShakeConfirm = useCallback(() => {
    shakeDetector.recordConfirmed();
    shakeEmergencyMutation.mutate({ location: shakeLocation || undefined, isAutoSend: false });
  }, [shakeLocation, shakeEmergencyMutation]);

  const handleShakeAutoSend = useCallback(() => {
    shakeDetector.recordAutoSent();
    shakeEmergencyMutation.mutate({ location: shakeLocation || undefined, isAutoSend: true });
  }, [shakeLocation, shakeEmergencyMutation]);

  const handleShakeCancel = useCallback(() => {
    shakeDetector.recordCancellation();
    setShowShakeOverlay(false);
    setShakeLocation(null);
  }, []);

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
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center relative">
          {/* Centered logo and wellbeing-ai */}
          <div className="flex items-center gap-4">
            <Link href="/app">
              <div className="flex items-center gap-2 cursor-pointer relative hover:opacity-80 transition-opacity" data-testid="link-home-logo">
                <ShieldCheck className="h-9 w-9 text-green-600" />
                <span className="text-2xl font-bold text-green-600">aok</span>
                {isOverdue && (
                  <span className="absolute -top-1 -right-3 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    1
                  </span>
                )}
              </div>
            </Link>
            {!isOrgManagedClient && (
              <>
                <div className="h-8 w-px bg-muted-foreground/30" />
                {user?.termsAcceptedAt ? (
                  <Link 
                    href="/app/wellbeing-ai"
                    className="flex flex-col items-center hover:opacity-80 transition-opacity"
                    data-testid="link-wellbeing-ai"
                  >
                    <div className="relative h-6 w-6 flex items-center justify-center">
                      <div className="w-5 h-1.5 bg-green-600 absolute rounded-sm" />
                      <div className="w-1.5 h-5 bg-green-600 absolute rounded-sm" />
                      <Heart className="h-2.5 w-2.5 text-green-600 absolute -bottom-1 -right-1" fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-medium text-green-600 mt-0.5">Wellbeing AI</span>
                  </Link>
                ) : (
                  <div 
                    className="flex flex-col items-center cursor-not-allowed"
                    title="Complete registration to access"
                    data-testid="link-wellbeing-ai-disabled"
                  >
                    <div className="relative h-6 w-6 flex items-center justify-center">
                      <div className="w-5 h-1.5 bg-green-600 absolute rounded-sm" />
                      <div className="w-1.5 h-5 bg-green-600 absolute rounded-sm" />
                      <Heart className="h-2.5 w-2.5 text-green-600 absolute -bottom-1 -right-1" fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-medium text-green-600 mt-0.5">Wellbeing AI</span>
                  </div>
                )}
                <div className="h-8 w-px bg-muted-foreground/30" />
                <Link 
                  href="/guide"
                  className="flex flex-col items-center hover:opacity-80 transition-opacity"
                  data-testid="link-help"
                >
                  <Search className="h-5 w-5 text-green-600" />
                  <span className="text-[10px] font-medium text-green-600 mt-0.5">Help</span>
                </Link>
              </>
            )}
          </div>
          {/* Menu positioned absolutely on the right */}
          {showMenu && (
            <div className="absolute right-4">
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
            </div>
          )}
        </div>
      </header>
      
      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share aok</DialogTitle>
            <DialogDescription>
              Scan this QR code to download the aok app and stay connected with your loved ones.
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
      
      {/* Shake-to-SOS Emergency Overlay */}
      <EmergencyConfirmOverlay
        isOpen={showShakeOverlay}
        onConfirm={handleShakeConfirm}
        onAutoSend={handleShakeAutoSend}
        onCancel={handleShakeCancel}
        triggerType="shake"
        isPending={shakeEmergencyMutation.isPending}
      />
    </div>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin/users-report" component={() => <AdminProtectedRoute component={AdminUsersReport} />} />
      <Route path="/admin/registrations-report" component={() => <AdminProtectedRoute component={AdminRegistrationsReport} />} />
      <Route path="/admin/emergency-alerts-report" component={() => <AdminProtectedRoute component={AdminEmergencyAlertsReport} />} />
      <Route path="/admin/missed-checkins-report" component={() => <AdminProtectedRoute component={AdminMissedCheckInsReport} />} />
      <Route path="/admin/users" component={() => <AdminProtectedRoute component={AdminUsers} />} />
      <Route path="/admin/architecture" component={() => <AdminProtectedRoute component={AdminArchitecture} />} />
      <Route path="/admin/workflows" component={() => <AdminProtectedRoute component={AdminWorkflows} />} />
      <Route path="/admin/revenue" component={() => <AdminProtectedRoute component={AdminRevenue} />} />
      <Route path="/admin/licence-agreements" component={() => <AdminProtectedRoute component={AdminLicenceAgreements} />} />
      <Route path="/admin/permissions" component={() => <AdminProtectedRoute component={AdminPermissions} />} />
      <Route path="/admin/service-health" component={() => <AdminProtectedRoute component={AdminServiceHealth} />} />
      <Route path="/admin/bundles" component={() => <AdminProtectedRoute component={AdminBundles} />} />
      <Route path="/admin/dashboard" component={() => <AdminProtectedRoute component={AdminDashboard} />} />
      <Route path="/admin" component={() => <AdminProtectedRoute component={AdminDashboard} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const isOrganization = user?.accountType === "organization";

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
    return <AuthRoute component={LoginSelect} />;
  }

  if (location === "/login/individual") {
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
    return <OrgLoginSelect />;
  }

  if (location === "/org/client-login") {
    return <OrganizationClientLogin />;
  }

  if (location === "/org/staff-login") {
    return <OrganizationStaffLogin />;
  }

  if (location === "/org/team-login") {
    return <OrgTeamLogin />;
  }

  if (location === "/org/forgot-password") {
    return <OrgForgotPassword />;
  }

  if (location.startsWith("/org/reset-password")) {
    return <OrgResetPassword />;
  }

  if (location.startsWith("/org/setup-password")) {
    return <OrgSetupPassword />;
  }

  if (location.startsWith("/org/team-invite")) {
    return <OrgTeamInvite />;
  }

  if (location === "/demo") {
    return <Demo />;
  }

  if (location === "/guide") {
    return <Guide />;
  }

  if (location === "/pricing") {
    return <Pricing />;
  }

  if (location === "/onboarding") {
    return <Onboarding />;
  }

  if (location === "/terms") {
    return <Terms />;
  }

  if (location === "/privacy") {
    return <Privacy />;
  }

  if (location === "/eula") {
    return <EULA />;
  }

  if (location === "/enterprise-licence") {
    return <EnterpriseLicence />;
  }

  if (location === "/data-processing-addendum") {
    return <DataProcessingAddendum />;
  }

  if (location === "/sla") {
    return <SLA />;
  }

  if (location === "/lone-worker-addendum") {
    return <LoneWorkerAddendum />;
  }

  if (location === "/ip-ownership") {
    return <IPOwnership />;
  }

  if (location === "/nda") {
    return <NDA />;
  }

  if (location.startsWith("/confirm-contact")) {
    return <ConfirmContact />;
  }

  if (location === "/admin/login") {
    return (
      <AdminProvider>
        <AdminAuthRoute component={AdminLogin} />
      </AdminProvider>
    );
  }

  if (location === "/admin/forgot-password") {
    return <AdminForgotPassword />;
  }

  if (location.startsWith("/admin/reset-password")) {
    return <AdminResetPassword />;
  }

  if (location.startsWith("/admin/invite")) {
    return <AdminInvite />;
  }

  if (location.startsWith("/admin")) {
    return (
      <AdminProvider>
        <AdminRoutes />
      </AdminProvider>
    );
  }

  // Org pages have their own layout/header, don't use AppLayout
  if (location.startsWith("/org/dashboard") || location.startsWith("/org/safeguarding") || location.startsWith("/org/lone-worker") || location.startsWith("/org/team") || location.startsWith("/org/missed-checkins") || location.startsWith("/org/emergency-alerts")) {
    return <AppRoutes />;
  }

  // Organization users on /app also skip AppLayout (they have their own header)
  if (isOrganization && location.startsWith("/app")) {
    return <AppRoutes />;
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
            <HeartbeatProvider>
              {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
              <Router />
              <OfflineEmergencyOverlay />
              <Toaster />
            </HeartbeatProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
