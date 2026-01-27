import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Fingerprint } from "lucide-react";
import { SHAKE_CONSTANTS } from "@/lib/shake-detector";

// Check if biometric authentication is available
async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

// Attempt biometric authentication for cancel
async function authenticateBiometric(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  
  try {
    // Use a simple challenge-response to verify user presence
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "aok", id: window.location.hostname },
        user: {
          id: new Uint8Array(16),
          name: "cancel-verification",
          displayName: "Cancel Verification",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    });
    
    return !!credential;
  } catch {
    return false;
  }
}

interface EmergencyConfirmOverlayProps {
  isOpen: boolean;
  onConfirm: () => void;
  onAutoSend: () => void;
  onCancel: () => void;
  triggerType?: "shake" | "button";
  isPending?: boolean;
}

export function EmergencyConfirmOverlay({
  isOpen,
  onConfirm,
  onAutoSend,
  onCancel,
  triggerType = "shake",
  isPending = false,
}: EmergencyConfirmOverlayProps) {
  const [hasSent, setHasSent] = useState(false);
  const [countdown, setCountdown] = useState(SHAKE_CONSTANTS.countdownSeconds);
  const [cancelProgress, setCancelProgress] = useState(0);
  const [isCancelPressed, setIsCancelPressed] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [attemptingBiometric, setAttemptingBiometric] = useState(false);
  const cancelStartTimeRef = useRef<number | null>(null);
  const cancelAnimationRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for biometric availability on mount
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Reset state when overlay opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(SHAKE_CONSTANTS.countdownSeconds);
      setCancelProgress(0);
      setIsCancelPressed(false);
      setHasSent(false);
      cancelStartTimeRef.current = null;

      // Vibrate on open
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || hasSent) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-send when countdown reaches 0
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setHasSent(true);
          onAutoSend();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isOpen, onAutoSend, hasSent]);

  // Long press cancel animation
  const updateCancelProgress = useCallback(() => {
    if (cancelStartTimeRef.current === null) return;

    const elapsed = Date.now() - cancelStartTimeRef.current;
    const progress = Math.min((elapsed / SHAKE_CONSTANTS.longPressCancelMs) * 100, 100);
    setCancelProgress(progress);

    if (progress >= 100) {
      // Cancel successful
      if (cancelAnimationRef.current) {
        cancelAnimationFrame(cancelAnimationRef.current);
      }
      onCancel();
      return;
    }

    cancelAnimationRef.current = requestAnimationFrame(updateCancelProgress);
  }, [onCancel]);

  const handleCancelStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsCancelPressed(true);
    cancelStartTimeRef.current = Date.now();
    cancelAnimationRef.current = requestAnimationFrame(updateCancelProgress);
  }, [updateCancelProgress]);

  const handleCancelEnd = useCallback(() => {
    setIsCancelPressed(false);
    cancelStartTimeRef.current = null;
    setCancelProgress(0);
    if (cancelAnimationRef.current) {
      cancelAnimationFrame(cancelAnimationRef.current);
    }
  }, []);

  // Biometric cancel handler
  const handleBiometricCancel = useCallback(async () => {
    if (attemptingBiometric) return;
    
    setAttemptingBiometric(true);
    try {
      const success = await authenticateBiometric();
      if (success) {
        onCancel();
      }
    } finally {
      setAttemptingBiometric(false);
    }
  }, [attemptingBiometric, onCancel]);

  // Prevent escape key from closing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent back navigation
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (cancelAnimationRef.current) {
        cancelAnimationFrame(cancelAnimationRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center p-6"
      data-testid="emergency-confirm-overlay"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-red-800">
        <div 
          className="h-full bg-white transition-all duration-1000 ease-linear"
          style={{ width: `${((SHAKE_CONSTANTS.countdownSeconds - countdown) / SHAKE_CONSTANTS.countdownSeconds) * 100}%` }}
        />
      </div>

      <div className="flex flex-col items-center text-white text-center max-w-sm">
        <AlertTriangle className="h-20 w-20 mb-6 animate-pulse" />
        
        <h1 className="text-3xl font-bold mb-2" data-testid="text-emergency-title">
          EMERGENCY ALERT
        </h1>
        
        <p className="text-lg mb-2 opacity-90">
          {triggerType === "shake" ? "Shake detected!" : "Emergency triggered!"}
        </p>
        
        <div className="text-7xl font-bold mb-6" data-testid="text-countdown">
          {countdown}
        </div>
        
        <p className="text-sm opacity-80 mb-8">
          Alert will be sent automatically in {countdown} second{countdown !== 1 ? 's' : ''}
        </p>

        <Button
          size="lg"
          onClick={() => {
            if (!hasSent && !isPending) {
              setHasSent(true);
              onConfirm();
            }
          }}
          disabled={hasSent || isPending}
          className="w-full h-16 text-xl font-bold bg-white text-red-600 hover:bg-red-100 mb-4 disabled:opacity-50"
          data-testid="button-send-emergency"
        >
          {isPending || hasSent ? "SENDING..." : "YES – SEND EMERGENCY"}
        </Button>

        {biometricAvailable && (
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg font-medium border-2 border-white/50 bg-transparent text-white mb-2"
            onClick={handleBiometricCancel}
            disabled={attemptingBiometric}
            data-testid="button-cancel-emergency-biometric"
          >
            <Fingerprint className="h-5 w-5 mr-2" />
            {attemptingBiometric ? "VERIFYING..." : "USE BIOMETRIC TO CANCEL"}
          </Button>
        )}
        
        <div className="relative w-full">
          <Button
            size="lg"
            variant="outline"
            className={`w-full h-14 text-lg font-medium border-2 border-white/50 bg-transparent text-white transition-all ${
              isCancelPressed ? 'scale-95' : ''
            }`}
            onMouseDown={handleCancelStart}
            onMouseUp={handleCancelEnd}
            onMouseLeave={handleCancelEnd}
            onTouchStart={handleCancelStart}
            onTouchEnd={handleCancelEnd}
            onTouchCancel={handleCancelEnd}
            data-testid="button-cancel-emergency"
          >
            <X className="h-5 w-5 mr-2" />
            {isCancelPressed 
              ? `Hold ${Math.ceil((SHAKE_CONSTANTS.longPressCancelMs - (cancelProgress / 100 * SHAKE_CONSTANTS.longPressCancelMs)) / 1000)}s to cancel...`
              : 'HOLD TO CANCEL'
            }
          </Button>
          
          {isCancelPressed && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-white rounded-b-md transition-none"
              style={{ width: `${cancelProgress}%` }}
            />
          )}
        </div>

        <p className="text-xs opacity-60 mt-4">
          {biometricAvailable 
            ? "Use biometric or hold Cancel for 3 seconds to dismiss" 
            : "Press and hold Cancel for 3 seconds to dismiss"
          }
        </p>
      </div>
    </div>
  );
}
