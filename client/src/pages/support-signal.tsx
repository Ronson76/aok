import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle, Heart, HandHeart, AlertTriangle,
  Loader2, Phone, Clock, ArrowLeft, Shield
} from "lucide-react";
import { useLocation } from "wouter";

const SIGNAL_OPTIONS = [
  {
    level: "im_ok",
    label: "I'm OK",
    description: "Let your support team know you're doing well",
    icon: CheckCircle,
    color: "bg-green-500 hover:bg-green-600 text-white",
    activeColor: "bg-green-500 ring-4 ring-green-200 dark:ring-green-800",
  },
  {
    level: "need_support",
    label: "Need Support",
    description: "Request a check-in from your support worker",
    icon: HandHeart,
    color: "bg-amber-500 hover:bg-amber-600 text-white",
    activeColor: "bg-amber-500 ring-4 ring-amber-200 dark:ring-amber-800",
  },
  {
    level: "urgent_help",
    label: "Urgent Help",
    description: "Get immediate attention from available staff",
    icon: AlertTriangle,
    color: "bg-red-500 hover:bg-red-600 text-white",
    activeColor: "bg-red-500 ring-4 ring-red-200 dark:ring-red-800",
  },
] as const;

export default function SupportSignal() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [preferStaffVisit, setPreferStaffVisit] = useState(false);
  const [requestLaterCheckin, setRequestLaterCheckin] = useState(false);
  const [sent, setSent] = useState(false);

  const activeSignalQuery = useQuery<any>({
    queryKey: ["/api/support-signal/active"],
  });

  const sendSignalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/support-signal", data);
      return res.json();
    },
    onSuccess: (data) => {
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["/api/support-signal/active"] });
      if (data.level === "im_ok") {
        toast({ title: "Signal sent", description: "Your team has been notified you're OK" });
      } else {
        toast({ title: "Signal sent", description: "Your support team has been alerted" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send signal. Please try again.", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!selectedLevel) return;
    sendSignalMutation.mutate({
      level: selectedLevel,
      notes: notes || undefined,
      preferStaffVisit,
      requestLaterCheckin,
    });
  };

  if (activeSignalQuery.data && !sent) {
    const active = activeSignalQuery.data;
    const levelConfig = SIGNAL_OPTIONS.find(s => s.level === active.level);
    const Icon = levelConfig?.icon || Heart;
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="support-signal-active">
        <header className="bg-card border-b p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} data-testid="button-back-app">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Support Signal</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${active.level === "urgent_help" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                <Icon className={`h-8 w-8 ${active.level === "urgent_help" ? "text-red-600" : "text-amber-600"}`} />
              </div>
              <h2 className="text-xl font-bold mb-2">Signal Active</h2>
              <p className="text-muted-foreground mb-4">
                Your <strong>{levelConfig?.label}</strong> signal has been sent. Staff have been alerted and will respond as soon as possible.
              </p>
              {active.respondedByName && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {active.respondedByName} is responding
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Sent at {new Date(active.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sent) {
    const levelConfig = SIGNAL_OPTIONS.find(s => s.level === selectedLevel);
    const isOk = selectedLevel === "im_ok";
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="support-signal-sent">
        <header className="bg-card border-b p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} data-testid="button-back-app-sent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Support Signal</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${isOk ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                {isOk ? <CheckCircle className="h-10 w-10 text-green-600" /> : <Heart className="h-10 w-10 text-amber-600" />}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {isOk ? "Thank You" : "Help is on the way"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isOk
                  ? "Your team has been notified that you're doing well."
                  : "Your support team has been alerted and will be with you as soon as possible."
                }
              </p>
              <Button onClick={() => navigate("/app")} className="w-full" data-testid="button-return-home">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="support-signal-page">
      <header className="bg-card border-b p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")} data-testid="button-back-app-main">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">How are you doing?</h1>
            <p className="text-xs text-muted-foreground">You're in control — signal when you want to</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
        <div className="space-y-3">
          {SIGNAL_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedLevel === option.level;
            return (
              <button
                key={option.level}
                className={`w-full p-5 rounded-2xl text-left transition-all ${
                  isSelected ? `${option.activeColor} text-white` : `${option.color}`
                }`}
                onClick={() => setSelectedLevel(option.level)}
                data-testid={`signal-${option.level}`}
              >
                <div className="flex items-center gap-4">
                  <Icon className="h-8 w-8 flex-shrink-0" />
                  <div>
                    <p className="text-xl font-bold">{option.label}</p>
                    <p className="text-sm opacity-90">{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedLevel && selectedLevel !== "im_ok" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="prefer-staff"
                checked={preferStaffVisit}
                onCheckedChange={(v) => { setPreferStaffVisit(!!v); if (v) setRequestLaterCheckin(false); }}
                data-testid="checkbox-prefer-staff"
              />
              <label htmlFor="prefer-staff" className="text-sm cursor-pointer flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" /> Prefer to speak to staff
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="later-checkin"
                checked={requestLaterCheckin}
                onCheckedChange={(v) => { setRequestLaterCheckin(!!v); if (v) setPreferStaffVisit(false); }}
                data-testid="checkbox-later-checkin"
              />
              <label htmlFor="later-checkin" className="text-sm cursor-pointer flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Request check-in later
              </label>
            </div>

            <Textarea
              placeholder="Add a note (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
              data-testid="input-signal-notes"
            />
          </div>
        )}

        {selectedLevel && (
          <Button
            className={`w-full h-14 text-lg font-bold ${
              selectedLevel === "urgent_help" ? "bg-red-600 hover:bg-red-700" :
              selectedLevel === "need_support" ? "bg-amber-600 hover:bg-amber-700" :
              "bg-green-600 hover:bg-green-700"
            }`}
            onClick={handleSend}
            disabled={sendSignalMutation.isPending}
            data-testid="button-send-signal"
          >
            {sendSignalMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            {selectedLevel === "im_ok" ? "Send I'm OK" : "Send Signal"}
          </Button>
        )}

        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This is not an emergency service. If you are in immediate danger, please contact emergency services by dialling 999.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
