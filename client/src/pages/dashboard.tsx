import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertTriangle, ShieldCheck, Loader2, AlertOctagon, Users } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { StatusData } from "@shared/schema";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { useState, useEffect } from "react";

function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diffInSeconds = differenceInSeconds(targetDate, now);
  
  if (diffInSeconds <= 0) {
    return "Due now";
  }
  
  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function getStatusIcon(status: StatusData["status"]) {
  switch (status) {
    case "safe":
      return <CheckCircle className="h-16 w-16 text-primary" />;
    case "pending":
      return <Clock className="h-16 w-16 text-yellow-500" />;
    case "overdue":
      return <AlertTriangle className="h-16 w-16 text-destructive" />;
  }
}

function getStatusLabel(status: StatusData["status"]) {
  switch (status) {
    case "safe":
      return { text: "You're Safe", variant: "default" as const };
    case "pending":
      return { text: "Check-In Due Soon", variant: "secondary" as const };
    case "overdue":
      return { text: "Check-In Overdue", variant: "destructive" as const };
  }
}

export default function Dashboard() {
  const { toast } = useToast();
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [cachedLocation, setCachedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  const { data: status, isLoading } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    refetchInterval: 30000,
  });

  // Live countdown timer
  useEffect(() => {
    if (!status?.nextCheckInDue) {
      setCountdown("");
      return;
    }

    const targetDate = new Date(status.nextCheckInDue);
    
    const updateCountdown = () => {
      setCountdown(formatCountdown(targetDate));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [status?.nextCheckInDue]);

  const checkInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/checkins"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      toast({
        title: "Check-in successful!",
        description: "Your loved ones know you're safe.",
      });
    },
    onError: () => {
      toast({
        title: "Check-in failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const emergencyMutation = useMutation({
    mutationFn: async (location?: { latitude: number; longitude: number }) => {
      const response = await apiRequest("POST", "/api/emergency", { location });
      return response.json();
    },
    onSuccess: (data: any) => {
      setShowEmergencyDialog(false);
      toast({
        title: "Emergency alert sent!",
        description: data.message || "All your contacts have been notified.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to send emergency alert";
      toast({
        title: "Alert failed",
        description: message.includes("No emergency contacts") 
          ? "Please add emergency contacts first." 
          : message,
        variant: "destructive",
      });
    },
  });

  // Start getting location when dialog opens
  const handleOpenEmergencyDialog = () => {
    setShowEmergencyDialog(true);
    setCachedLocation(null);
    
    if ("geolocation" in navigator) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGettingLocation(false);
          setCachedLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('[GPS] Location error:', error.message);
          setGettingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    }
  };

  // Send alert with cached location (or without if not available)
  const handleEmergencyAlert = () => {
    emergencyMutation.mutate(cachedLocation || undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusInfo = status ? getStatusLabel(status.status) : { text: "Loading", variant: "secondary" as const };
  const isOverdue = status?.status === "overdue";

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <Card className={`border-2 ${isOverdue ? "border-destructive bg-destructive/5" : ""}`}>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className={`rounded-full p-4 ${isOverdue ? "bg-destructive/10" : "bg-primary/10"}`}>
            <ShieldCheck className={`h-16 w-16 ${isOverdue ? "text-destructive" : "text-primary"}`} />
          </div>
          
          <div className="text-center space-y-2">
            <Badge variant={statusInfo.variant} className="text-sm px-4 py-1">
              {statusInfo.text}
            </Badge>
            
            {status?.streak !== undefined && status.streak > 0 && (
              <p className="text-sm text-muted-foreground">
                {status.streak} day streak
              </p>
            )}
          </div>

          {status?.contactCount === 0 ? (
            <div className="text-center space-y-4 w-full max-w-xs">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <p className="text-sm">Add an emergency contact to check in</p>
              </div>
              <Link href="/contacts">
                <Button
                  size="lg"
                  className="w-full px-8 py-6 text-lg font-semibold"
                  data-testid="button-add-contacts"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Add Contact
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full max-w-xs px-8 py-6 text-lg font-semibold"
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              data-testid="button-check-in"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              Check In Now
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Last Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.lastCheckIn ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {format(new Date(status.lastCheckIn), "h:mm a")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(status.lastCheckIn), "MMMM d, yyyy")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No check-ins yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Next Check-In Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.nextCheckInDue ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold font-mono tracking-tight" data-testid="text-countdown">
                  {countdown || "Due now"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(status.nextCheckInDue), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Check in to start tracking</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertOctagon className="h-8 w-8 text-destructive" />
            <div className="space-y-1">
              <h3 className="font-semibold">Emergency Alert</h3>
              <p className="text-sm text-muted-foreground">
                Immediately notify all your contacts if you need help
              </p>
            </div>
            {status?.contactCount === 0 ? (
              <Link href="/contacts">
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full max-w-xs"
                  data-testid="button-emergency-add-contact"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Add Contact First
                </Button>
              </Link>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                className="w-full max-w-xs"
                onClick={handleOpenEmergencyDialog}
                data-testid="button-emergency"
              >
                <AlertOctagon className="h-5 w-5 mr-2" />
                Emergency Alert
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="h-5 w-5" />
              Send Emergency Alert?
            </DialogTitle>
            <DialogDescription>
              This will immediately send an urgent alert to ALL your emergency contacts. 
              They will be notified that you need immediate help.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Only use this in a real emergency. Your contacts will receive an urgent email asking them to contact you immediately.
            </p>
            <div className="flex items-center gap-2 text-sm">
              {gettingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Getting your location...</span>
                </>
              ) : cachedLocation ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Location ready to send</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">Location unavailable - will send without</span>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmergencyDialog(false)}
              data-testid="button-cancel-emergency"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmergencyAlert}
              disabled={emergencyMutation.isPending}
              data-testid="button-confirm-emergency"
            >
              {emergencyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending Alert...
                </>
              ) : (
                <>
                  <AlertOctagon className="h-4 w-4 mr-2" />
                  Yes, Send Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
