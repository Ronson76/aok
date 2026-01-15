import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History as HistoryIcon, CheckCircle, XCircle, Loader2, Calendar, Bell, AlertTriangle } from "lucide-react";
import type { CheckIn, AlertLog } from "@shared/schema";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

function formatDateHeader(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

function groupCheckInsByDate(checkIns: CheckIn[]) {
  const groups: { [key: string]: CheckIn[] } = {};
  
  checkIns.forEach((checkIn) => {
    const date = new Date(checkIn.timestamp);
    const key = format(date, "yyyy-MM-dd");
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(checkIn);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([date, items]) => ({
      date: new Date(date),
      items: items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }));
}

function CheckInsTab({ checkIns }: { checkIns: CheckIn[] }) {
  const groupedCheckIns = groupCheckInsByDate(checkIns);

  if (checkIns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No check-ins yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your check-in history will appear here. Head to the dashboard to make your first check-in!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedCheckIns.map((group) => (
        <div key={format(group.date, "yyyy-MM-dd")} className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
            {formatDateHeader(group.date)}
          </h2>
          
          <div className="space-y-2 relative">
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
            
            {group.items.map((checkIn) => (
              <Card key={checkIn.id} className="relative ml-10">
                <div
                  className={`absolute -left-[26px] top-1/2 -translate-y-1/2 rounded-full p-1 ${
                    checkIn.status === "success" ? "bg-primary" : "bg-destructive"
                  }`}
                >
                  {checkIn.status === "success" ? (
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive-foreground" />
                  )}
                </div>
                
                <CardContent className="py-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {checkIn.status === "success" ? "Checked In" : "Missed Check-In"}
                      </span>
                      <Badge
                        variant={checkIn.status === "success" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {checkIn.status === "success" ? "Safe" : "Missed"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(checkIn.timestamp), "h:mm a")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(checkIn.timestamp), { addSuffix: true })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsTab({ alerts }: { alerts: AlertLog[] }) {
  if (alerts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No alerts sent</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            When you miss a check-in, alerts sent to your contacts will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-destructive/10 p-2 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Alert Sent</span>
                  <Badge variant="destructive" className="text-xs">
                    Missed Check-In
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Notified: {alert.contactsNotified.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(alert.timestamp), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function History() {
  const { data: checkIns = [], isLoading: checkInsLoading } = useQuery<CheckIn[]>({
    queryKey: ["/api/checkins"],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<AlertLog[]>({
    queryKey: ["/api/alerts"],
  });

  if (checkInsLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-2">
        <HistoryIcon className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">History</h1>
      </div>

      <Tabs defaultValue="checkins" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="checkins" data-testid="tab-checkins">
            Check-Ins
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts {alerts.length > 0 && `(${alerts.length})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="checkins" className="mt-4">
          <CheckInsTab checkIns={checkIns} />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab alerts={alerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
