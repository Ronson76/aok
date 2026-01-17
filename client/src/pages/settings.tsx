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
import { Settings as SettingsIcon, Clock, Bell, Loader2, Info, LogOut, ShieldAlert, AlertTriangle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import type { Settings as SettingsType } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";

function formatInterval(hours: number): string {
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${hours} hours`;
  if (hours === 24) return "1 day";
  if (hours === 48) return "2 days";
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
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
  const [logoutLocation, setLogoutLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [showIntervalPasswordDialog, setShowIntervalPasswordDialog] = useState(false);
  const [intervalPassword, setIntervalPassword] = useState("");
  const [pendingInterval, setPendingInterval] = useState<number | null>(null);
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  
  const [scheduleStartInput, setScheduleStartInput] = useState("");
  const [pendingScheduleStart, setPendingScheduleStart] = useState<string | null>(null);
  
  const isOrganization = user?.accountType === "organization";

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings?.intervalHours) {
      setLocalInterval(settings.intervalHours);
    }
  }, [settings?.intervalHours]);

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

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    setPushLoading(true);
    try {
      if (enabled) {
        // Request permission and subscribe
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

        // Get VAPID public key
        const keyResponse = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
        if (!keyResponse.ok) throw new Error('Failed to get VAPID key');
        const { publicKey } = await keyResponse.json();

        // Subscribe to push
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Send subscription to server
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
      } else {
        // Unsubscribe
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
          description: "You won't receive push notifications.",
        });
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      toast({
        title: "Failed to update notifications",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setPushLoading(false);
  }, [toast]);

  const updateMutation = useMutation({
    mutationFn: (data: { intervalHours?: number; alertsEnabled?: boolean; scheduleStartTime?: string; password?: string }) =>
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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.clear();
      setLogoutStep("none");
      setLogoutPassword("");
      setLocation("/");
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
    setLocalInterval(value[0]);
  };

  const handleIntervalCommit = (value: number[]) => {
    if (isOrganization) {
      setPendingInterval(value[0]);
      setShowIntervalPasswordDialog(true);
    } else {
      updateMutation.mutate({ intervalHours: value[0] });
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
      updateMutation.mutate({ intervalHours: pendingInterval, password: intervalPassword });
    } else if (pendingScheduleStart !== null) {
      updateMutation.mutate({ scheduleStartTime: pendingScheduleStart, password: intervalPassword });
    }
  };

  const handleCancelIntervalChange = () => {
    setShowIntervalPasswordDialog(false);
    setIntervalPassword("");
    setPendingInterval(null);
    setPendingScheduleStart(null);
    // Reset slider to current saved value
    if (settings?.intervalHours) {
      setLocalInterval(settings.intervalHours);
    }
  };

  const handleScheduleStartSubmit = () => {
    if (!scheduleStartInput) return;
    
    if (isOrganization) {
      setPendingInterval(null);
      setPendingScheduleStart(scheduleStartInput);
      setShowIntervalPasswordDialog(true);
    } else {
      updateMutation.mutate({ scheduleStartTime: scheduleStartInput });
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">1 hour</span>
              <span className="text-lg font-semibold text-primary">
                {formatInterval(localInterval)}
              </span>
              <span className="text-sm text-muted-foreground">48 hours</span>
            </div>
            <Slider
              value={[localInterval]}
              onValueChange={handleIntervalChange}
              onValueCommit={handleIntervalCommit}
              min={1}
              max={48}
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

          <div className="border-t pt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="schedule-start" className="font-medium">
                Schedule Start Time
              </Label>
              <p className="text-xs text-muted-foreground">
                Set when your check-in schedule begins. The timer will calculate from this time.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                id="schedule-start"
                type="datetime-local"
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
                Current schedule started: {new Date(settings.scheduleStartTime).toLocaleString()}
              </p>
            )}
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
              <Input
                id="logout-password"
                type="password"
                placeholder="Enter your password"
                value={logoutPassword}
                onChange={(e) => setLogoutPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogoutSubmit();
                }}
                data-testid="input-logout-password"
              />
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
    </div>
  );
}
