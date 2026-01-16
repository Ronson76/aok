import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Clock, Bell, Loader2, Info, LogOut, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import type { Settings as SettingsType } from "@shared/schema";
import { useState, useEffect } from "react";

function formatInterval(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${hours} hours`;
  if (hours === 24) return "1 day";
  if (hours === 48) return "2 days";
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) return `${days} days`;
  return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
}

const INTERVAL_PRESETS = [
  { label: "1 min", value: 1 / 60 },
  { label: "30 min", value: 0.5 },
  { label: "1 hour", value: 1 },
  { label: "2 hours", value: 2 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "48 hours", value: 48 },
];

export default function Settings() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [localInterval, setLocalInterval] = useState<number>(24);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings?.intervalHours) {
      setLocalInterval(settings.intervalHours);
    }
  }, [settings?.intervalHours]);

  const updateMutation = useMutation({
    mutationFn: (data: { intervalHours?: number; alertsEnabled?: boolean; password?: string }) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      setShowDisableDialog(false);
      setDisablePassword("");
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
            <div className="text-center">
              <span className="text-lg font-semibold text-primary">
                {formatInterval(localInterval)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {INTERVAL_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant={Math.abs(localInterval - preset.value) < 0.01 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLocalInterval(preset.value);
                    updateMutation.mutate({ intervalHours: preset.value });
                  }}
                  disabled={updateMutation.isPending}
                  data-testid={`button-interval-${preset.label.replace(/\s/g, '-')}`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
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
              When enabled, your emergency contacts will receive an alert via email if you don't check in on time.
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
            onClick={handleLogout}
            className="w-full"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

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
    </div>
  );
}
