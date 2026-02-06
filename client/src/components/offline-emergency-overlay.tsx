import { useState, useEffect } from "react";
import { useHeartbeat } from "@/contexts/heartbeat-context";
import { useAuth } from "@/contexts/auth-context";
import { getCachedEmergencyContact, type CachedEmergencyContact } from "@/hooks/use-emergency-contact-cache";
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
import { WifiOff, Phone, AlertTriangle, MessageSquare } from "lucide-react";

export function OfflineEmergencyOverlay() {
  const { isOnline } = useHeartbeat();
  const { user } = useAuth();
  const [show999Confirmation, setShow999Confirmation] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState<CachedEmergencyContact | null>(null);

  // Load cached contact on mount and when coming online/offline
  useEffect(() => {
    const contact = getCachedEmergencyContact();
    setEmergencyContact(contact);
  }, [isOnline]);

  const handleCall999 = () => {
    setShow999Confirmation(true);
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

        <div className="w-full max-w-sm flex flex-col gap-4">
          {emergencyContact?.phone && (
            <a
              href={`tel:${emergencyContact.phone.replace(/[^+\d]/g, "")}`}
              className="flex items-center justify-center w-full h-20 px-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-md touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              data-testid="button-call-contact"
            >
              <Phone className="h-6 w-6 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold">Call {emergencyContact.name}</div>
                <div className="text-sm opacity-80">{emergencyContact.phone}</div>
              </div>
            </a>
          )}

          <button
            type="button"
            onClick={handleCall999}
            className="flex items-center justify-center w-full h-20 px-6 text-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-md touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            data-testid="button-call-999"
          >
            <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-semibold">Emergency: 999</div>
              <div className="text-sm opacity-80">Police, Fire, Ambulance</div>
            </div>
          </button>
        </div>

        <div className="mt-8 p-4 rounded-lg border border-border bg-card/50 max-w-sm w-full" data-testid="sms-checkin-info">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Check in via SMS</p>
              <p className="text-xs text-muted-foreground">
                If your check-in is overdue, we'll text you a link. Just tap the button in the SMS to let your contacts know you're safe.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
          The app will automatically reconnect when your connection is restored.
        </p>
      </div>

      <AlertDialog open={show999Confirmation} onOpenChange={setShow999Confirmation}>
        <AlertDialogContent className="z-[10000]">
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
            <a
              href="tel:999"
              onClick={() => setShow999Confirmation(false)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-999"
            >
              Call 999 Now
            </a>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
