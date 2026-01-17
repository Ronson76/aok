import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History as HistoryIcon, CheckCircle, XCircle, Loader2, Calendar, Bell, AlertTriangle, ChevronDown } from "lucide-react";
import type { CheckIn, AlertLog } from "@shared/schema";
import { format, isToday, startOfDay, subDays, isSameDay } from "date-fns";
import { useState } from "react";

interface DayData {
  date: Date;
  checkIns: CheckIn[];
  alerts: AlertLog[];
}

function getTodayItems(checkIns: CheckIn[], alerts: AlertLog[]) {
  return {
    checkIns: checkIns.filter(c => isToday(new Date(c.timestamp))),
    alerts: alerts.filter(a => isToday(new Date(a.timestamp)))
  };
}

function getPreviousDays(checkIns: CheckIn[], alerts: AlertLog[]): DayData[] {
  const days: DayData[] = [];
  
  for (let i = 1; i <= 6; i++) {
    const date = startOfDay(subDays(new Date(), i));
    
    days.push({
      date,
      checkIns: checkIns.filter(c => isSameDay(new Date(c.timestamp), date)),
      alerts: alerts.filter(a => isSameDay(new Date(a.timestamp), date))
    });
  }
  
  return days;
}

function ActivityList({ checkIns, alerts }: { checkIns: CheckIn[], alerts: AlertLog[] }) {
  const sortedItems = [
    ...checkIns.map(c => ({ type: 'checkin' as const, data: c, time: new Date(c.timestamp) })),
    ...alerts.map(a => ({ type: 'alert' as const, data: a, time: new Date(a.timestamp) }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime());

  if (sortedItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2 text-center">No activity</p>
    );
  }
  
  return (
    <div className="space-y-2 pt-2">
      {sortedItems.map((item) => {
        if (item.type === 'checkin') {
          const checkIn = item.data as CheckIn;
          const isSuccess = checkIn.status === "success";
          return (
            <div key={`checkin-${checkIn.id}`} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50">
              <div className={`rounded-full p-1 ${isSuccess ? "bg-primary/20" : "bg-destructive/20"}`}>
                {isSuccess ? (
                  <CheckCircle className="h-3 w-3 text-primary" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
              <span className="text-sm flex-1">
                {isSuccess ? "Checked In" : "Missed Check-In"}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(checkIn.timestamp), "h:mm a")}
              </span>
            </div>
          );
        } else {
          const alert = item.data as AlertLog;
          const isEmergency = alert.message.includes("EMERGENCY");
          return (
            <div key={`alert-${alert.id}`} className={`flex items-center gap-3 py-2 px-3 rounded-md ${isEmergency ? "bg-red-500/10" : "bg-destructive/10"}`}>
              <div className={`rounded-full p-1 ${isEmergency ? "bg-red-500/20" : "bg-destructive/20"}`}>
                <AlertTriangle className={`h-3 w-3 ${isEmergency ? "text-red-500" : "text-destructive"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm">
                  {isEmergency ? "Emergency Alert" : "Alert Sent"}
                </span>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.contactsNotified.join(", ")}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(alert.timestamp), "h:mm a")}
              </span>
            </div>
          );
        }
      })}
    </div>
  );
}

function TodaySection({ checkIns, alerts }: { checkIns: CheckIn[], alerts: AlertLog[] }) {
  const hasActivity = checkIns.length > 0 || alerts.length > 0;
  
  if (!hasActivity) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">No activity today yet</p>
        </CardContent>
      </Card>
    );
  }
  
  const sortedItems = [
    ...checkIns.map(c => ({ type: 'checkin' as const, data: c, time: new Date(c.timestamp) })),
    ...alerts.map(a => ({ type: 'alert' as const, data: a, time: new Date(a.timestamp) }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime());
  
  return (
    <div className="space-y-2">
      {sortedItems.map((item) => {
        if (item.type === 'checkin') {
          const checkIn = item.data as CheckIn;
          const isSuccess = checkIn.status === "success";
          return (
            <Card key={`checkin-${checkIn.id}`}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className={`rounded-full p-1.5 ${isSuccess ? "bg-primary/10" : "bg-destructive/10"}`}>
                  {isSuccess ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-sm">
                    {isSuccess ? "Checked In" : "Missed Check-In"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(checkIn.timestamp), "h:mm a")}
                </span>
              </CardContent>
            </Card>
          );
        } else {
          const alert = item.data as AlertLog;
          const isEmergency = alert.message.includes("EMERGENCY");
          return (
            <Card key={`alert-${alert.id}`} className={isEmergency ? "border-red-500/50" : "border-destructive/50"}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className={`rounded-full p-1.5 ${isEmergency ? "bg-red-500/10" : "bg-destructive/10"}`}>
                  <AlertTriangle className={`h-4 w-4 ${isEmergency ? "text-red-500" : "text-destructive"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">
                    {isEmergency ? "Emergency Alert" : "Alert Sent"}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.contactsNotified.join(", ")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(alert.timestamp), "h:mm a")}
                </span>
              </CardContent>
            </Card>
          );
        }
      })}
    </div>
  );
}

function DayRow({ day }: { day: DayData }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const successCount = day.checkIns.filter(c => c.status === "success").length;
  const missedCount = day.checkIns.filter(c => c.status === "missed").length;
  const alertCount = day.alerts.length;
  const hasEmergency = day.alerts.some(a => a.message.includes("EMERGENCY"));
  const hasActivity = day.checkIns.length > 0 || day.alerts.length > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full" data-testid={`day-row-${format(day.date, "yyyy-MM-dd")}`}>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="text-left min-w-[80px]">
              <p className="font-medium text-sm">{format(day.date, "EEEE")}</p>
              <p className="text-xs text-muted-foreground">{format(day.date, "MMM d")}</p>
            </div>
            
            <div className="flex-1 flex items-center gap-3">
              {successCount > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary">{successCount}</span>
                </div>
              )}
              {missedCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs text-destructive">{missedCount}</span>
                </div>
              )}
              {alertCount > 0 && (
                <div className="flex items-center gap-1">
                  <Bell className={`h-3.5 w-3.5 ${hasEmergency ? "text-red-500" : "text-destructive"}`} />
                  <span className={`text-xs ${hasEmergency ? "text-red-500" : "text-destructive"}`}>{alertCount}</span>
                </div>
              )}
              {!hasActivity && (
                <span className="text-xs text-muted-foreground">No activity</span>
              )}
            </div>
            
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-3 border-t">
            <ActivityList checkIns={day.checkIns} alerts={day.alerts} />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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

  const todayItems = getTodayItems(checkIns, alerts);
  const previousDays = getPreviousDays(checkIns, alerts);
  
  const totalCheckIns = checkIns.filter(c => c.status === "success").length;
  const totalMissed = checkIns.filter(c => c.status === "missed").length;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-2">
        <HistoryIcon className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">History</h1>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-primary" data-testid="text-total-checkins">{totalCheckIns}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-bold text-destructive" data-testid="text-total-missed">{totalMissed}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-bold text-muted-foreground" data-testid="text-total-alerts">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">Today</h2>
        </div>
        <TodaySection checkIns={todayItems.checkIns} alerts={todayItems.alerts} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">Previous 6 Days</h2>
        </div>
        <div className="space-y-2">
          {previousDays.map((day) => (
            <DayRow key={format(day.date, "yyyy-MM-dd")} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}
