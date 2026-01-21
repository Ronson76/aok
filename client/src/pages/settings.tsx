import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Clock, Bell, Loader2, Info, LogOut, ShieldAlert, AlertTriangle, Smartphone, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import type { Settings as SettingsType } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";

// Allowed interval values: 5 mins for testing, then 1-48 hours
const INTERVAL_VALUES = [
  0.0833, // 5 minutes (for testing)
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
  // Handle 5 minutes for testing
  if (hours < 0.1) {
    return "5 mins";
  }
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

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [localInterval, setLocalInterval] = useState<number>(24);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  
  const [logoutStep, setLogoutStep] = useState<"none" | "confirm" | "password">("none");
  const [logoutPassword, setLogoutPassword] = useState("");
  const [showLogoutPassword, setShowLogoutPassword] = useState(false);
  const [logoutLocation, setLogoutLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [showIntervalPasswordDialog, setShowIntervalPasswordDialog] = useState(false);
  const [intervalPassword, setIntervalPassword] = useState("");
  const [pendingInterval, setPendingInterval] = useState<number | null>(null);
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [showDisablePushDialog, setShowDisablePushDialog] = useState(false);
  
  const [showRedAlertConfirmDialog, setShowRedAlertConfirmDialog] = useState(false);
  const [showRedAlertDisableDialog, setShowRedAlertDisableDialog] = useState(false);
  
  const [scheduleStartInput, setScheduleStartInput] = useState("");
  const [pendingScheduleStart, setPendingScheduleStart] = useState<string | null>(null);
  
  const isOrganization = user?.accountType === "organization";

  const { data: settings, isLoading, isFetching } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });
  
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

  const updateMutation = useMutation({
    mutationFn: (data: { intervalHours?: number; alertsEnabled?: boolean; scheduleStartTime?: string; password?: string; redAlertEnabled?: boolean }) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      setShowDisableDialog(false);
      setDisablePassword("");
      setShowIntervalPasswordDialog(false);
      setIntervalPassword("");
      setPendingInterval(null);
      setPendingScheduleStart(null);
      setScheduleStartInput("");
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

  const handleAlertsToggle = (checked: boolean) => {
    if (checked) {
      updateMutation.mutate({ alertsEnabled: true });
    } else {
      setShowDisableDialog(true);
    }
  };

  const handleConfirmDisable = () => {
    if (!disablePassword.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to disable alerts.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ alertsEnabled: false, password: disablePassword });
  };

  const handleIntervalChange = (value: number[]) => {
    // Slider uses index, convert to hours for display
    const hours = indexToHours(value[0]);
    setLocalInterval(hours);
    setIsChangingInterval(true); // Prevent server sync while dragging
  };

  const handleIntervalCommit = (value: number[]) => {
    // Slider uses index, convert to hours for API
    const hours = indexToHours(value[0]);
    if (isOrganization) {
      setPendingInterval(hours);
      setShowIntervalPasswordDialog(true);
    } else {
      updateMutation.mutate({ intervalHours: hours }, {
        onSettled: () => setIsChangingInterval(false)
      });
    }
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
    } else if (pendingScheduleStart !== null) {
      updateMutation.mutate({ scheduleStartTime: pendingScheduleStart, password: intervalPassword }, {
        onSettled: () => setIsChangingInterval(false)
      });
    }
  };

  const handleCancelIntervalChange = () => {
    setShowIntervalPasswordDialog(false);
    setIntervalPassword("");
    setPendingInterval(null);
    setPendingScheduleStart(null);
    setIsChangingInterval(false);
    // Reset slider to current saved value
    if (settings?.intervalHours) {
      setLocalInterval(settings.intervalHours);
    }
  };

  const handleScheduleStartSubmit = () => {
    if (!scheduleStartInput) return;
    
    // Convert time-only input (HH:MM) to full datetime using today's date
    const [hours, minutes] = scheduleStartInput.split(':').map(Number);
    const scheduleDate = new Date();
    scheduleDate.setHours(hours, minutes, 0, 0);
    const fullDateTime = scheduleDate.toISOString();
    
    // Require password if schedule is already set (for all users) or if organization
    if (isOrganization || settings?.scheduleStartTime) {
      setPendingInterval(null);
      setPendingScheduleStart(fullDateTime);
      setShowIntervalPasswordDialog(true);
    } else {
      updateMutation.mutate({ scheduleStartTime: fullDateTime });
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
        Customize how aok works for you.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Check-In Interval
          </CardTitle>
          <CardDescription>
            How long between check-ins before an alert is sent?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="schedule-start" className="font-medium">
                Schedule Start Time
              </Label>
              <p className="text-xs text-muted-foreground">
                Set the time of day your check-in schedule starts from.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                id="schedule-start"
                type="time"
                value={scheduleStartInput}
                onChange={(e) => setScheduleStartInput(e.target.value)}
                className="flex-1"
                data-testid="input-schedule-start"
              />
              <Button
                onClick={handleScheduleStartSubmit}
                disabled={!scheduleStartInput || updateMutation.isPending}
                data-testid="button-set-schedule"
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
              </Button>
            </div>
            {settings?.scheduleStartTime && (
              <p className="text-xs text-muted-foreground">
                Current schedule: {new Date(settings.scheduleStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">5 mins</span>
              <span className="text-lg font-semibold text-primary">
                {formatInterval(localInterval)}
              </span>
              <span className="text-sm text-muted-foreground">48 hours</span>
            </div>
            <Slider
              value={[hoursToIndex(localInterval)]}
              onValueChange={handleIntervalChange}
              onValueCommit={handleIntervalCommit}
              min={0}
              max={INTERVAL_VALUES.length - 1}
              step={1}
              className="w-full"
              data-testid="slider-interval"
            />
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              If you don't check in within {formatInterval(localInterval)}, your emergency contacts will be notified.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control how alerts are sent to your contacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="alerts-enabled" className="font-medium">
                Alert Contacts
              </Label>
              <p className="text-sm text-muted-foreground">
                Notify contacts when you miss a check-in
              </p>
            </div>
            <Switch
              id="alerts-enabled"
              checked={settings?.alertsEnabled ?? true}
              onCheckedChange={handleAlertsToggle}
              data-testid="switch-alerts-enabled"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              When enabled, all your emergency contacts will receive an alert if you miss a check-in. When disabled, only your primary contact will be notified.
            </p>
          </div>
        </CardContent>
      </Card>

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

      <Card className={settings?.redAlertEnabled ? "border-red-500 dark:border-red-600" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className={`h-4 w-4 ${settings?.redAlertEnabled ? "text-red-500" : "text-muted-foreground"}`} />
            Continuous Location Tracking
          </CardTitle>
          <CardDescription>
            Enhanced emergency alert with ongoing location updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="red-alert-enabled" className="font-medium">
                Enable 5-Minute Location Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Share your location every 5 minutes during emergencies
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

          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              When enabled and you press the emergency button, your location will be sent to all your emergency contacts every 5 minutes until you enter your password to deactivate it.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Customize the look of the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              As an organization account, changing the check-in timer requires password verification 
              to protect the safety settings of monitored individuals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="interval-password">Password</Label>
              <Input
                id="interval-password"
                type="password"
                placeholder="Enter your password"
                value={intervalPassword}
                onChange={(e) => setIntervalPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmIntervalChange();
                }}
                autoComplete="off"
                data-testid="input-interval-password"
              />
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

      <Dialog open={showDisableDialog} onOpenChange={(open) => {
        setShowDisableDialog(open);
        if (!open) setDisablePassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Disable Safety Alerts?
            </DialogTitle>
            <DialogDescription>
              This will stop your emergency contacts from being notified if you miss a check-in. 
              For your safety, please enter your password to confirm this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmDisable();
                }}
                autoComplete="off"
                data-testid="input-disable-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setDisablePassword("");
              }}
              data-testid="button-cancel-disable"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDisable}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-disable"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disable Alerts
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
                Your primary contact will be notified that you have signed out and will no longer receive safety alerts.
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
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Enable Continuous Location Tracking
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="block font-medium">
                Are you sure you want to enable continuous location tracking?
              </span>
              <span className="block">
                When you press the emergency button with this enabled:
              </span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your location will be sent to all emergency contacts immediately</li>
                <li>Your location will continue to be shared every 5 minutes</li>
                <li>Location sharing only stops when you enter your password to deactivate</li>
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
              variant="destructive"
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
              Enable Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRedAlertDisableDialog} onOpenChange={setShowRedAlertDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              Disable Continuous Location Tracking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disable continuous location tracking? When disabled, pressing the emergency button will send a single alert without ongoing location updates.
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
    </div>
  );
}
