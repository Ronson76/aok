import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Volume2, VolumeX } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StatusData } from "@shared/schema";

export default function OverdueAlert() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [alarmMuted, setAlarmMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: status } = useQuery<StatusData>({
    queryKey: ["/api/status"],
    refetchInterval: 5000,
  });

  const checkInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/checkins"),
    onSuccess: () => {
      stopAlarm();
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge();
      }
      toast({
        title: "Check-in successful!",
        description: "Your loved ones know you're safe.",
      });
      setLocation("/app");
    },
    onError: () => {
      toast({
        title: "Check-in failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const playAlarm = () => {
    if (audioContextRef.current || alarmMuted) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      
      const playBeep = () => {
        if (!audioContextRef.current || alarmMuted) return;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.stop(ctx.currentTime + 0.5);
      };
      
      playBeep();
      alarmIntervalRef.current = setInterval(playBeep, 2000);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const toggleMute = () => {
    if (alarmMuted) {
      setAlarmMuted(false);
      playAlarm();
    } else {
      setAlarmMuted(true);
      stopAlarm();
    }
  };

  useEffect(() => {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(1);
    }
    
    if (!alarmMuted) {
      playAlarm();
    }
    
    return () => {
      stopAlarm();
    };
  }, []);

  useEffect(() => {
    if (status && status.status !== 'overdue') {
      stopAlarm();
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge();
      }
      setLocation("/app");
    }
  }, [status?.status, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-destructive animate-pulse">
            Check-In Overdue!
          </h1>
          <p className="text-muted-foreground">
            Your check-in time has passed. Please check in now to let your contacts know you're safe.
          </p>
        </div>

        <Button
          size="lg"
          className="w-full max-w-xs h-32 text-2xl font-bold bg-green-500 hover:bg-green-600 text-white animate-pulse shadow-lg shadow-green-500/50"
          onClick={() => checkInMutation.mutate()}
          disabled={checkInMutation.isPending}
          data-testid="button-overdue-check-in"
        >
          {checkInMutation.isPending ? (
            "Checking In..."
          ) : (
            <>
              <CheckCircle className="h-8 w-8 mr-3" />
              Check In Now
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          className="text-muted-foreground"
          data-testid="button-toggle-alarm"
        >
          {alarmMuted ? (
            <>
              <VolumeX className="h-4 w-4 mr-2" />
              Unmute Alarm
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 mr-2" />
              Mute Alarm
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
