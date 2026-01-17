import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, CheckCircle, XCircle, Loader2, Calendar, Bell, AlertTriangle } from "lucide-react";
import type { CheckIn, AlertLog } from "@shared/schema";
import { format, isToday, startOfDay, subDays, isSameDay } from "date-fns";

interface DaySummary {
  date: Date;
  checkIns: number;
  missed: number;
  alerts: number;
  hasEmergency: boolean;
}

function getTodayItems(checkIns: CheckIn[], alerts: AlertLog[]) {
  const today = new Date();
  return {
    checkIns: checkIns.filter(c => isToday(new Date(c.timestamp))),
    alerts: alerts.filter(a => isToday(new Date(a.timestamp)))
  };
}

function getWeekSummary(checkIns: CheckIn[], alerts: AlertLog[]): DaySummary[] {
  const days: DaySummary[] = [];
  
  for (let i = 1; i <= 6; i++) {
    const date = startOfDay(subDays(new Date(), i));
    
    const dayCheckIns = checkIns.filter(c => isSameDay(new Date(c.timestamp), date));
    const dayAlerts = alerts.filter(a => isSameDay(new Date(a.timestamp), date));
    
    days.push({
      date,
      checkIns: dayCheckIns.filter(c => c.status === "success").length,
      missed: dayCheckIns.filter(c => c.status === "missed").length,
      alerts: dayAlerts.length,
      hasEmergency: dayAlerts.some(a => a.message.includes("EMERGENCY"))
    });
  }
  
  return days;
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
      {sortedItems.map((item, index) => {
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

function CalendarDay({ summary }: { summary: DaySummary }) {
  const hasIssues = summary.missed > 0 || summary.alerts > 0;
  const dayName = format(summary.date, "EEE");
  const dayNum = format(summary.date, "d");
  
  return (
    <div 
      className={`flex flex-col items-center p-2 rounded-lg border ${
        summary.hasEmergency 
          ? "border-red-500/50 bg-red-500/5" 
          : hasIssues 
            ? "border-destructive/50 bg-destructive/5" 
            : summary.checkIns > 0 
              ? "border-primary/50 bg-primary/5"
              : "border-border"
      }`}
    >
      <span className="text-xs text-muted-foreground">{dayName}</span>
      <span className="text-lg font-semibold">{dayNum}</span>
      
      <div className="flex items-center gap-1 mt-1">
        {summary.checkIns > 0 && (
          <div className="flex items-center gap-0.5" title={`${summary.checkIns} check-ins`}>
            <CheckCircle className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary">{summary.checkIns}</span>
          </div>
        )}
        {summary.missed > 0 && (
          <div className="flex items-center gap-0.5" title={`${summary.missed} missed`}>
            <XCircle className="h-3 w-3 text-destructive" />
            <span className="text-xs text-destructive">{summary.missed}</span>
          </div>
        )}
      </div>
      
      {summary.alerts > 0 && (
        <div className="flex items-center gap-0.5 mt-0.5" title={`${summary.alerts} alerts sent`}>
          <Bell className={`h-3 w-3 ${summary.hasEmergency ? "text-red-500" : "text-destructive"}`} />
          <span className={`text-xs ${summary.hasEmergency ? "text-red-500" : "text-destructive"}`}>
            {summary.alerts}
          </span>
        </div>
      )}
      
      {summary.checkIns === 0 && summary.missed === 0 && summary.alerts === 0 && (
        <span className="text-xs text-muted-foreground mt-1">-</span>
      )}
    </div>
  );
}

function WeekCalendar({ summary }: { summary: DaySummary[] }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {summary.map((day) => (
        <CalendarDay key={format(day.date, "yyyy-MM-dd")} summary={day} />
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

  const todayItems = getTodayItems(checkIns, alerts);
  const weekSummary = getWeekSummary(checkIns, alerts);
  
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
              <p className="text-2xl font-bold text-primary">{totalCheckIns}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-bold text-destructive">{totalMissed}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{alerts.length}</p>
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
        <WeekCalendar summary={weekSummary} />
        
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span>Check-in</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-destructive" />
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bell className="h-3 w-3 text-destructive" />
            <span>Alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
