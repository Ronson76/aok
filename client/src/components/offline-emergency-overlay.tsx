import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHeartbeat } from "@/contexts/heartbeat-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WifiOff, Phone, AlertTriangle } from "lucide-react";
import type { Contact } from "@shared/schema";

export function OfflineEmergencyOverlay() {
  const { isOnline } = useHeartbeat();
  const { user } = useAuth();
  const [show999Confirmation, setShow999Confirmation] = useState(false);

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const primaryContact = contacts?.find((c) => c.isPrimary && c.confirmedAt);

  const handleCallContact = () => {
    if (primaryContact?.phone) {
      const cleanPhone = primaryContact.phone.replace(/[^+\d]/g, "");
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const handleCall999 = () => {
    setShow999Confirmation(true);
  };

  const confirmCall999 = () => {
    setShow999Confirmation(false);
    window.location.href = "tel:999";
  };

  if (isOnline) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6"
        data-testid="offline-emergency-overlay"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <WifiOff className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
          <p className="text-muted-foreground max-w-sm">
            We can't reach the server. If you're in an emergency, use one of the options below.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {primaryContact?.phone && (
            <Button
              onClick={handleCallContact}
              className="w-full h-20 text-lg bg-primary hover:bg-primary/90"
              data-testid="button-call-contact"
            >
              <Phone className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Call {primaryContact.name}</div>
                <div className="text-sm opacity-80">{primaryContact.phone}</div>
              </div>
            </Button>
          )}

          <Button
            onClick={handleCall999}
            variant="destructive"
            className="w-full h-20 text-lg bg-red-600 hover:bg-red-700"
            data-testid="button-call-999"
          >
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Emergency: 999</div>
              <div className="text-sm opacity-80">Police, Fire, Ambulance</div>
            </div>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center max-w-xs">
          The app will automatically reconnect when your connection is restored.
        </p>
      </div>

      <AlertDialog open={show999Confirmation} onOpenChange={setShow999Confirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Call Emergency Services?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to call 999 (UK Emergency Services). Only call if you have a genuine emergency requiring Police, Fire Brigade, or Ambulance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-999">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCall999}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-999"
            >
              Call 999 Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
