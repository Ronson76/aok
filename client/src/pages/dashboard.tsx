import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StatusData } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

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

  const { data: status, isLoading } = useQuery<StatusData>({
    queryKey: ["/api/status"],
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusInfo = status ? getStatusLabel(status.status) : { text: "Loading", variant: "secondary" as const };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-2">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold">CheckMate</h1>
      </div>

      <Card className="border-2">
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {status && getStatusIcon(status.status)}
          
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
                  {formatDistanceToNow(new Date(status.lastCheckIn), { addSuffix: true })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(status.lastCheckIn), "MMMM d, yyyy 'at' h:mm a")}
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
                <p className="text-lg font-semibold">
                  {status.hoursUntilDue !== null && status.hoursUntilDue > 0
                    ? `In ${status.hoursUntilDue} hours`
                    : "Due now"}
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
    </div>
  );
}
