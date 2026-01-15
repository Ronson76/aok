import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings as SettingsIcon, Clock, Bell, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Settings as SettingsType, CheckInFrequency } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: { frequency?: CheckInFrequency; alertsEnabled?: boolean }) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update settings",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

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
        Customize how CheckMate works for you.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Check-In Frequency
          </CardTitle>
          <CardDescription>
            How often do you want to check in?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings?.frequency || "daily"}
            onValueChange={(value: CheckInFrequency) => updateMutation.mutate({ frequency: value })}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer">
              <RadioGroupItem value="daily" id="daily" data-testid="radio-daily" />
              <Label htmlFor="daily" className="flex-1 cursor-pointer">
                <div className="font-medium">Daily</div>
                <p className="text-sm text-muted-foreground">
                  Check in every 24 hours
                </p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer">
              <RadioGroupItem value="every_two_days" id="every_two_days" data-testid="radio-every-two-days" />
              <Label htmlFor="every_two_days" className="flex-1 cursor-pointer">
                <div className="font-medium">Every Two Days</div>
                <p className="text-sm text-muted-foreground">
                  Check in every 48 hours
                </p>
              </Label>
            </div>
          </RadioGroup>
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
              onCheckedChange={(checked) => updateMutation.mutate({ alertsEnabled: checked })}
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
    </div>
  );
}
