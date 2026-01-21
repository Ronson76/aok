import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 4500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-800 transition-opacity duration-1000 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-4">
        <ShieldCheck className="w-24 h-24 text-primary animate-pulse" />
        <h1 className="text-2xl font-bold text-primary">aok</h1>
        <p className="text-sm text-muted-foreground">Stay Connected, Stay Safe</p>
      </div>
    </div>
  );
}
