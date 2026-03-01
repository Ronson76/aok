import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Clock, Bell, Loader2, Info, LogOut, AlertTriangle, Smartphone, Eye, EyeOff, ExternalLink, CreditCard, AlertCircle, MapPin, Vibrate, Video, Trash2, Download, Play, FileVideo, Shield, ShieldCheck, BatteryLow } from "lucide-react";
import ShakeDetector from "@/lib/shake-detector";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import type { Settings as SettingsType, EmergencyRecording } from "@shared/schema";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { useState, useEffect, useCallback } from "react";

// Allowed interval values: 1-48 hours
const INTERVAL_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48
];

// Convert hours value to slider index
function hoursToIndex(hours: number): number {
  const idx = INTERVAL_VALUES.findIndex(v => Math.abs(v - hours) < 0.01);
  return idx >= 0 ? idx : 1; // Default to 1 hour if not found
}

// Convert slider index to hours value
function indexToHours(index: number): number {
  return INTERVAL_VALUES[Math.min(index, INTERVAL_VALUES.length - 1)];
}

function formatInterval(hours: number): string {
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${Math.round(hours)} hours`;
  if (hours === 24) return "1 day";
  if (hours === 48) return "2 days";
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days} days`;
  return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
}

// Helper to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface SubscriptionData {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  productName: string;
  unitAmount: number;
  currency: string;
  interval: string;
}

function SubscriptionCard() {
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelPassword, setCancelPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: subscriptionData, isLoading } = useQuery<{ subscription: SubscriptionData | null }>({
    queryKey: ["/api/stripe/subscription"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/stripe/cancel-subscription", { password });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
      setShowCancelDialog(false);
      setCancelPassword("");
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will end at the end of your billing period",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/reactivate-subscription", {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reactivate subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
      toast({
        title: "Subscription reactivated",
        description: "Your subscription will continue",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reactivate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const subscription = subscriptionData?.subscription;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Plan</span>
            <Badge variant="secondary" data-testid="badge-free-plan">Free Plan</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = () => {
    if (subscription.cancelAtPeriodEnd) {
      return <Badge variant="secondary" data-testid="badge-subscription-cancelling">Cancelling</Badge>;
    }
    switch (subscription.status) {
      case 'trialing':
        return <Badge variant="default" className="bg-blue-500" data-testid="badge-subscription-trial">Free Trial</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-emerald-500" data-testid="badge-subscription-active">Active</Badge>;
      case 'past_due':
        return <Badge variant="destructive" data-testid="badge-subscription-past-due">Past Due</Badge>;
      default:
        return <Badge variant="secondary" data-testid="badge-subscription-status">{subscription.status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium" data-testid="text-subscription-plan">
                {subscription.status === 'trialing' ? 'Complete Wellbeing (Trial)' : 'Complete Wellbeing'}
              </span>
            </div>
            {subscription.status === 'trialing' && subscription.trialEnd && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trial ends</span>
                <span data-testid="text-trial-end">{format(new Date(subscription.trialEnd), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {subscription.currentPeriodEnd && !subscription.cancelAtPeriodEnd && subscription.status !== 'trialing' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Renews</span>
                <span data-testid="text-period-end">{format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Access until</span>
                <span data-testid="text-period-end">{format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {subscription.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="w-full"
              data-testid="button-reactivate"
            >
              {reactivateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reactivate Subscription
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="w-full text-destructive hover:text-destructive"
              data-testid="button-cancel-subscription"
            >
              {subscription.status === 'trialing' ? 'Cancel Trial' : 'Cancel Subscription'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCancelDialog} onOpenChange={(open) => {
        setShowCancelDialog(open);
        if (!open) setCancelPassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {subscription.status === 'trialing' ? 'Cancel Trial' : 'Cancel Subscription'}
            </DialogTitle>
            <DialogDescription>
              {subscription.status === 'trialing' 
                ? "Your trial will be cancelled immediately and you won't be charged."
                : "Your subscription will remain active until the end of your billing period. You can reactivate anytime before then."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-password">Confirm with your password</Label>
              <div className="relative">
                <Input
                  id="cancel-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={cancelPassword}
                  onChange={(e) => setCancelPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && cancelPassword) {
                      cancelMutation.mutate(cancelPassword);
                    }
                  }}
                  autoComplete="off"
                  data-testid="input-cancel-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-cancel-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelPassword("");
              }}
              data-testid="button-cancel-dialog-close"
            >
              {subscription.status === 'trialing' ? 'Keep Trial' : 'Keep Subscription'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate(cancelPassword)}
              disabled={cancelMutation.isPending || !cancelPassword}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {subscription.status === 'trialing' ? 'Cancel Trial' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [localInterval, setLocalInterval] = useState<number>(24);
  
  const [logoutStep, setLogoutStep] = useState<"none" | "confirm" | "password">("none");
  const [logoutPassword, setLogoutPassword] = useState("");
  const [showLogoutPassword, setShowLogoutPassword] = useState(false);
  const [logoutLocation, setLogoutLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [showIntervalPasswordDialog, setShowIntervalPasswordDialog] = useState(false);
  const [intervalPassword, setIntervalPassword] = useState("");
  const [showIntervalPasswordVisible, setShowIntervalPasswordVisible] = useState(false);
  const [pendingInterval, setPendingInterval] = useState<number | null>(null);
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [showDisablePushDialog, setShowDisablePushDialog] = useState(false);
  
  const [showRedAlertConfirmDialog, setShowRedAlertConfirmDialog] = useState(false);
  const [showRedAlertDisableDialog, setShowRedAlertDisableDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordVisible, setDeletePasswordVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  
  
  const isOrganization = user?.accountType === "organization";

  const { data: settings, isLoading, isFetching } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  // Fetch feature availability (for org clients)
  const { data: features } = useQuery<{
    featureWellbeingAi: boolean;
    featureMoodTracking: boolean;
    featurePetProtection: boolean;
    featureDigitalWill: boolean;
    isOrgAccount: boolean;
    isOrgClient: boolean;
  }>({
    queryKey: ["/api/features"],
  });
  
  const { data: recordings, isLoading: recordingsLoading } = useQuery<EmergencyRecording[]>({
    queryKey: ["/api/emergency/recordings"],
    enabled: !!settings?.emergencyRecordingEnabled,
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: async (recordingId: string) => {
      const res = await apiRequest("DELETE", `/api/emergency/recordings/${recordingId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/recordings"] });
      toast({ title: "Recording deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete recording", variant: "destructive" });
    },
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  // Track if user is actively changing the interval
  const [isChangingInterval, setIsChangingInterval] = useState(false);

  useEffect(() => {
    // Only sync from server if not currently changing and not fetching stale data
    if (settings?.intervalHours && !isChangingInterval && !isFetching) {
      setLocalInterval(settings.intervalHours);
    }
  }, [settings?.intervalHours, isChangingInterval, isFetching]);

  // Check push notification support and current status
  useEffect(() => {
    const checkPushSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setPushSupported(true);
        try {
          const response = await fetch('/api/push/subscription', { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            setPushEnabled(data.hasSubscription);
          }
        } catch (error) {
          console.error('Failed to check push subscription:', error);
        }
      }
      setPushLoading(false);
    };
    checkPushSupport();
  }, []);

  // Handle enabling push notifications
  const enablePushNotifications = useCallback(async () => {
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
        setPushLoading(false);
        return;
      }

      const keyResponse = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
      if (!keyResponse.ok) throw new Error('Failed to get VAPID key');
      const { publicKey } = await keyResponse.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!response.ok) throw new Error('Failed to save subscription');
      
      setPushEnabled(true);
      toast({
        title: "Notifications enabled",
        description: "You'll receive alerts when check-ins are due.",
      });
    } catch (error) {
      console.error('Push enable error:', error);
      toast({
        title: "Failed to enable notifications",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setPushLoading(false);
  }, [toast]);

  // Handle disabling push notifications (after confirmation)
  const disablePushNotifications = useCallback(async () => {
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      setPushEnabled(false);
      toast({
        title: "Notifications disabled",
        description: "You will no longer receive push notifications on this device.",
      });
    } catch (error) {
      console.error('Push disable error:', error);
      toast({
        title: "Failed to disable notifications",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setPushLoading(false);
    setShowDisablePushDialog(false);
  }, [toast]);

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await enablePushNotifications();
    } else {
      // Show confirmation dialog before disabling
      setShowDisablePushDialog(true);
    }
  }, [enablePushNotifications]);

  // Handle Red Alert Mode toggle
  const handleRedAlertToggle = useCallback((enabled: boolean) => {
    if (enabled) {
      // Show confirmation dialog before enabling
      setShowRedAlertConfirmDialog(true);
    } else {
      // Show confirmation dialog before disabling
      setShowRedAlertDisableDialog(true);
    }
  }, []);

  const handleDataExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/gdpr/export", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aok-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Data exported", description: "Your data has been downloaded." });
    } catch (error) {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const deleteAccountMutation = useMutation({
    mutationFn: (data: { password: string }) =>
      apiRequest("POST", "/api/gdpr/delete-account", data),
    onSuccess: () => {
      setShowDeleteAccountDialog(false);
      setDeletePassword("");
      toast({ title: "Account deleted", description: "Your account has been deleted. You will be logged out." });
      setTimeout(() => { window.location.href = "/"; }, 2000);
    },
    onError: (error: any) => {
      const message = error?.message || "Please try again.";
      toast({ title: "Deletion failed", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { intervalHours?: number; alertsEnabled?: boolean; scheduleStartTime?: string; password?: string; redAlertEnabled?: boolean; shakeToSOSEnabled?: boolean; emergencyRecordingEnabled?: boolean; lowBatteryAlertEnabled?: boolean }) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      setShowIntervalPasswordDialog(false);
      setIntervalPassword("");
      setShowIntervalPasswordVisible(false);
      setPendingInterval(null);
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Please try again.";
      toast({
        title: "Failed to update settings",
        description: message.includes("password") ? "Incorrect password" : message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async ({ password, location }: { password: string; location?: { latitude: number; longitude: number } | null }) => {
      const res = await apiRequest("POST", "/api/auth/logout-confirmed", { password, location });
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLogoutStep("none");
      setLogoutPassword("");
      // Clear splash flag so it shows on next visit
      sessionStorage.removeItem("splashShown");
      // Force a full page navigation to ensure clean logout
      window.location.href = "/";
    },
    onError: (error: any) => {
      const message = error?.message || "Please try again.";
      toast({
        title: "Failed to sign out",
        description: message.includes("password") ? "Incorrect password" : message,
        variant: "destructive",
      });
    },
  });


  const handleIntervalChange = (value: number[]) => {
    // Slider uses index, convert to hours for display
    const hours = indexToHours(value[0]);
    setLocalInterval(hours);
    setIsChangingInterval(true); // Prevent server sync while dragging
  };

  const handleIntervalCommit = (value: number[]) => {
    // Slider uses index, convert to hours for API
    const hours = indexToHours(value[0]);
    // Always require password to change check-in interval
    setPendingInterval(hours);
    setShowIntervalPasswordDialog(true);
  };

  const handleConfirmIntervalChange = () => {
    if (!intervalPassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to make this change.",
        variant: "destructive",
      });
      return;
    }
    if (pendingInterval !== null) {
      updateMutation.mutate({ intervalHours: pendingInterval, password: intervalPassword }, {
        onSettled: () => setIsChangingInterval(false)
      });
    }
  };

  const handleCancelIntervalChange = () => {
    setShowIntervalPasswordDialog(false);
    setIntervalPassword("");
    setShowIntervalPasswordVisible(false);
    setPendingInterval(null);
    setIsChangingInterval(false);
    // Reset slider to current saved value
    if (settings?.intervalHours) {
      setLocalInterval(settings.intervalHours);
    }
  };


  const handleLogoutClick = () => {
    setLogoutStep("confirm");
    setLogoutLocation(null);
    
    // Start capturing location when logout is initiated
    if ("geolocation" in navigator) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGettingLocation(false);
          setLogoutLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('[GPS] Location error during logout:', error.message);
          setGettingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    }
  };

  const handleLogoutConfirm = () => {
    setLogoutStep("password");
  };

  const handleLogoutSubmit = () => {
    if (!logoutPassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to sign out.",
        variant: "destructive",
      });
      return;
    }
    logoutMutation.mutate({ password: logoutPassword, location: logoutLocation });
  };

  const handleLogoutCancel = () => {
    setLogoutStep("none");
    setLogoutPassword("");
    setLogoutLocation(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-2">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Customise how aok works for you.
      </p>

      {pushSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Get notified on your phone when check-ins are due.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="push-enabled" className="font-medium">
                  Phone Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications when overdue
                </p>
              </div>
              <Switch
                id="push-enabled"
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading}
                data-testid="switch-push-enabled"
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                When enabled, you'll receive a notification on this device when your check-in becomes overdue.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={settings?.redAlertEnabled ? "border-emerald-500 dark:border-emerald-600" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${settings?.redAlertEnabled ? "text-emerald-500" : "text-muted-foreground"}`} />
            Location Sharing
          </CardTitle>
          <CardDescription>
            Share your location with emergency contacts during alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="red-alert-enabled" className="font-medium">
                Enable Location Sharing
              </Label>
              <p className="text-sm text-muted-foreground">
                Include your location in emergency and missed check-in alerts
              </p>
            </div>
            <Switch
              id="red-alert-enabled"
              checked={settings?.redAlertEnabled ?? false}
              onCheckedChange={handleRedAlertToggle}
              disabled={updateMutation.isPending}
              data-testid="switch-red-alert-enabled"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
            <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>When enabled:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Your what3words location will be included in all emergency alerts</li>
                <li>Missed check-in alerts will include your last known location</li>
                <li>Emergency button sends your location every 5 minutes until deactivated</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={settings?.shakeToSOSEnabled ? "border-orange-500 dark:border-orange-600" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Vibrate className={`h-4 w-4 ${settings?.shakeToSOSEnabled ? "text-orange-500" : "text-muted-foreground"}`} />
            Shake-to-SOS
          </CardTitle>
          <CardDescription>
            Shake your phone to manually trigger an emergency alert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!ShakeDetector.isSupported() ? (
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Shake detection is not supported on this device or browser.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="shake-to-sos-enabled" className="font-medium">
                    Enable Shake-to-SOS
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Shake your phone vigorously to trigger an emergency alert
                  </p>
                </div>
                <Switch
                  id="shake-to-sos-enabled"
                  checked={settings?.shakeToSOSEnabled ?? false}
                  onCheckedChange={async (checked) => {
                    if (checked && ShakeDetector.requiresPermission()) {
                      const permission = await ShakeDetector.requestPermission();
                      if (permission === 'denied') {
                        toast({
                          title: "Permission Denied",
                          description: "Motion sensor permission is required for shake detection.",
                          variant: "destructive",
                        });
                        return;
                      }
                      // Store permission in localStorage so the hook knows permission was granted
                      localStorage.setItem('motionPermission', 'granted');
                    }
                    updateMutation.mutate({ shakeToSOSEnabled: checked });
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="switch-shake-to-sos-enabled"
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/30">
                <Vibrate className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>How it works:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>Shake your phone vigorously 3 times</li>
                    <li>A 5-second countdown will appear</li>
                    <li>Confirm to send alert, or hold Cancel for 3 seconds to dismiss</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={settings?.emergencyRecordingEnabled ? "border-red-500 dark:border-red-600" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video className={`h-4 w-4 ${settings?.emergencyRecordingEnabled ? "text-red-500" : "text-muted-foreground"}`} />
            Emergency Recording
          </CardTitle>
          <CardDescription>
            Record audio and video for documentation during user-initiated emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="emergency-recording-enabled" className="font-medium">
                Enable Emergency Recording
              </Label>
              <p className="text-sm text-muted-foreground">
                Capture audio and video for documentation when you trigger an emergency alert
              </p>
            </div>
            <Switch
              id="emergency-recording-enabled"
              checked={settings?.emergencyRecordingEnabled ?? false}
              onCheckedChange={(checked) => {
                updateMutation.mutate({ emergencyRecordingEnabled: checked });
              }}
              disabled={updateMutation.isPending}
              data-testid="switch-emergency-recording-enabled"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              By enabling this feature, you consent to audio/video recording during emergencies for documentation purposes only. Recordings are not monitored in real time.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30">
            <Video className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>When you trigger an emergency alert, your phone's camera and microphone activate</li>
                <li>A visible indicator shows when recording is active</li>
                <li>Recordings are stored securely and encrypted for documentation</li>
                <li>Accessed only by authorised parties according to your settings</li>
                <li>This is not monitored in real time</li>
                <li>You maintain full control and can disable at any time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={settings?.lowBatteryAlertEnabled ? "border-amber-500 dark:border-amber-600" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BatteryLow className={`h-4 w-4 ${settings?.lowBatteryAlertEnabled ? "text-amber-500" : "text-muted-foreground"}`} />
            Low Battery Alert
          </CardTitle>
          <CardDescription>
            Notify your primary contact/carer when your device battery drops below 20%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="low-battery-alert-enabled" className="font-medium">
                Enable Low Battery Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Your primary contact/carer will be emailed if your battery falls to 20% or below
              </p>
            </div>
            <Switch
              id="low-battery-alert-enabled"
              checked={settings?.lowBatteryAlertEnabled ?? true}
              onCheckedChange={(checked) => {
                updateMutation.mutate({ lowBatteryAlertEnabled: checked });
              }}
              disabled={updateMutation.isPending}
              data-testid="switch-low-battery-alert-enabled"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>When your device battery reaches 20% or below, aok will automatically email your confirmed primary contact/carer to let them know.</p>
              <p>This alert is sent at most once every 4 hours to avoid repeated notifications.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {settings?.emergencyRecordingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileVideo className="h-4 w-4 text-muted-foreground" />
              Saved Recordings
            </CardTitle>
            <CardDescription>
              Emergency recordings are stored securely for 90 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recordingsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !recordings || recordings.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>No recordings yet</p>
                <p className="text-xs mt-1">Recordings will appear here when created during an emergency</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border"
                    data-testid={`recording-item-${recording.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {format(new Date(recording.createdAt!), "dd MMM yyyy, HH:mm")}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {recording.durationSeconds ? `${Math.floor(recording.durationSeconds / 60)}m ${recording.durationSeconds % 60}s` : "Unknown duration"}
                          </span>
                          {recording.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              {(recording.fileSize / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          )}
                          <Badge variant={recording.status === "ready" ? "secondary" : recording.status === "uploading" ? "outline" : "destructive"}>
                            {recording.status === "ready" ? "saved" : recording.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {recording.status === "ready" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPlayingRecordingId(recording.id)}
                            data-testid={`button-play-recording-${recording.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              window.open(`/api/emergency/recordings/${recording.id}/download`, "_blank");
                            }}
                            data-testid={`button-download-recording-${recording.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(recording.id)}
                        data-testid={`button-delete-recording-${recording.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Shield className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Recordings are encrypted and only accessible by you and your confirmed emergency contacts. They are automatically deleted after 90 days.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recording</DialogTitle>
            <DialogDescription>
              This will permanently delete this emergency recording. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete-recording">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId !== null) {
                  deleteRecordingMutation.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              disabled={deleteRecordingMutation.isPending}
              data-testid="button-confirm-delete-recording"
            >
              {deleteRecordingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={playingRecordingId !== null} onOpenChange={(open) => !open && setPlayingRecordingId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Emergency Recording</DialogTitle>
            <DialogDescription>
              {playingRecordingId && recordings?.find(r => r.id === playingRecordingId) && (
                <>Recorded {format(new Date(recordings.find(r => r.id === playingRecordingId)!.createdAt!), "dd MMM yyyy, HH:mm")}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full">
            {playingRecordingId && (
              <video
                key={playingRecordingId}
                controls
                autoPlay
                playsInline
                className="w-full rounded-md bg-black"
                style={{ maxHeight: "60vh" }}
                data-testid="video-recording-player"
              >
                <source src={`/api/emergency/recordings/${playingRecordingId}/stream`} type="video/webm" />
                <source src={`/api/emergency/recordings/${playingRecordingId}/stream`} type="video/mp4" />
                Your browser does not support video playback.
              </video>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPlayingRecordingId(null)} data-testid="button-close-player">
              Close
            </Button>
            {playingRecordingId && (
              <Button
                onClick={() => {
                  window.open(`/api/emergency/recordings/${playingRecordingId}/download`, "_blank");
                }}
                data-testid="button-download-from-player"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="font-medium">Status</Label>
              <p className="text-sm text-muted-foreground">
                {user?.twoFactorEnabled ? "2FA is currently enabled" : "2FA is not enabled"}
              </p>
            </div>
            <Badge variant={user?.twoFactorEnabled ? "default" : "secondary"} data-testid="badge-2fa-status">
              {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShow2FADialog(true)}
            data-testid="button-manage-2fa"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {user?.twoFactorEnabled ? "Manage 2FA" : "Set Up 2FA"}
          </Button>
        </CardContent>
      </Card>

      <TwoFactorSetup
        isOpen={show2FADialog}
        onClose={() => setShow2FADialog(false)}
        isEnabled={user?.twoFactorEnabled || false}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="font-medium">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Toggle dark mode on or off
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {!(user as any)?.isStaffMember && <SubscriptionCard />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogoutClick}
            className="w-full"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showIntervalPasswordDialog} onOpenChange={(open) => {
        if (!open) handleCancelIntervalChange();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Confirm Timer Change
            </DialogTitle>
            <DialogDescription>
              Please confirm your password to change your check-in timer. This helps keep your safety settings secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="interval-password">Password</Label>
              <div className="relative">
                <Input
                  id="interval-password"
                  type={showIntervalPasswordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  value={intervalPassword}
                  onChange={(e) => setIntervalPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmIntervalChange();
                  }}
                  autoComplete="off"
                  data-testid="input-interval-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowIntervalPasswordVisible(!showIntervalPasswordVisible)}
                  data-testid="button-toggle-interval-password"
                >
                  {showIntervalPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelIntervalChange}
              data-testid="button-cancel-interval"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmIntervalChange}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-interval"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={showDisablePushDialog} onOpenChange={(open) => {
        setShowDisablePushDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-destructive" />
              Disable Push Notifications?
            </DialogTitle>
            <DialogDescription>
              If you disable push notifications, you will no longer receive alerts on this device when your check-in is overdue. 
              Your emergency contacts will still be notified via email and phone if you miss a check-in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisablePushDialog(false)}
              data-testid="button-cancel-disable-push"
            >
              Keep Enabled
            </Button>
            <Button
              variant="destructive"
              onClick={disablePushNotifications}
              disabled={pushLoading}
              data-testid="button-confirm-disable-push"
            >
              {pushLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disable Notifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logoutStep === "confirm"} onOpenChange={(open) => {
        if (!open) handleLogoutCancel();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-muted-foreground" />
              Sign Out?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of aok?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleLogoutCancel}
              data-testid="button-cancel-logout"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutConfirm}
              data-testid="button-confirm-logout-step1"
            >
              Yes, Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logoutStep === "password"} onOpenChange={(open) => {
        if (!open) handleLogoutCancel();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Important Warning
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="block font-medium text-destructive">
                Once you sign out, your emergency contacts will NOT be notified of any missed check-ins or emergencies.
              </span>
              <span className="block">
                Your primary contact/carer will be notified that you have signed out and will no longer receive safety alerts.
              </span>
              <span className="block">
                Enter your password to confirm sign out.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="logout-password">Password</Label>
              <div className="relative">
                <Input
                  id="logout-password"
                  type={showLogoutPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={logoutPassword}
                  onChange={(e) => setLogoutPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogoutSubmit();
                  }}
                  className="pr-10"
                  autoComplete="off"
                  data-testid="input-logout-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowLogoutPassword(!showLogoutPassword)}
                  data-testid="button-toggle-logout-password"
                >
                  {showLogoutPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleLogoutCancel}
              data-testid="button-cancel-logout-final"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutSubmit}
              disabled={logoutMutation.isPending}
              data-testid="button-confirm-logout-final"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRedAlertConfirmDialog} onOpenChange={setShowRedAlertConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              Enable Location Sharing
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="block font-medium">
                Are you sure you want to enable location sharing?
              </span>
              <span className="block">
                When enabled:
              </span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your what3words location will be included in all emergency alerts</li>
                <li>Missed check-in alerts will include your last known location</li>
                <li>Emergency button sends your location every 5 minutes until deactivated</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRedAlertConfirmDialog(false)}
              data-testid="button-cancel-red-alert-enable"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateMutation.mutate({ redAlertEnabled: true });
                setShowRedAlertConfirmDialog(false);
              }}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-red-alert-enable"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enable Location Sharing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Your Data &amp; Privacy
          </CardTitle>
          <CardDescription>
            Manage your personal data under UK GDPR. You have the right to access, export, and delete your data at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="font-medium">Download Your Data</Label>
              <p className="text-sm text-muted-foreground">
                Export all your personal data in a portable format (JSON file)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDataExport}
              disabled={isExporting}
              data-testid="button-export-data"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="font-medium text-red-600 dark:text-red-400">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAccountDialog(true)}
                data-testid="button-delete-account"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Under UK GDPR you have the right to access, correct, export, and delete your personal data. For any data requests, you can also contact us at <strong>help@aok.care</strong>.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 rounded-lg bg-muted/50 text-center" data-testid="text-service-limitation">
        <p className="text-xs text-muted-foreground">
          aok may not function in all circumstances. Network coverage, device settings, battery life, or software issues may prevent features from working. aok does not provide medical advice and is not a substitute for emergency services.
        </p>
      </div>

      <Dialog open={showRedAlertDisableDialog} onOpenChange={setShowRedAlertDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              Disable Location Sharing
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disable location sharing? Your location will no longer be included in emergency alerts or missed check-in notifications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRedAlertDisableDialog(false)}
              data-testid="button-cancel-red-alert-disable"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateMutation.mutate({ redAlertEnabled: false });
                setShowRedAlertDisableDialog(false);
              }}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-red-alert-disable"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disable Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteAccountDialog} onOpenChange={(open) => {
        setShowDeleteAccountDialog(open);
        if (!open) { setDeletePassword(""); setDeletePasswordVisible(false); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data including check-in history, emergency contacts, mood entries, pet profiles, documents, and fitness data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                Your data will be permanently removed within 30 days. Your emergency contacts will no longer be notified if you miss a check-in.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={deletePasswordVisible ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your account password"
                  data-testid="input-delete-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setDeletePasswordVisible(!deletePasswordVisible)}
                  aria-label={deletePasswordVisible ? "Hide password" : "Show password"}
                >
                  {deletePasswordVisible ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowDeleteAccountDialog(false); setDeletePassword(""); }}
              data-testid="button-cancel-delete-account"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate({ password: deletePassword })}
              disabled={!deletePassword || deleteAccountMutation.isPending}
              data-testid="button-confirm-delete-account"
            >
              {deleteAccountMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
