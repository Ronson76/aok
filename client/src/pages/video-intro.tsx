import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";

interface VideoIntroProps {
  onContinue: () => void;
}

const VIDEO_DURATION_MS = 64000;

export default function VideoIntro({ onContinue }: VideoIntroProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 3000);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.min((elapsed / VIDEO_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (elapsed >= VIDEO_DURATION_MS) {
        clearInterval(progressInterval);
        handleContinue();
      }
    }, 200);

    return () => {
      clearTimeout(skipTimer);
      clearInterval(progressInterval);
    };
  }, []);

  const handleContinue = () => {
    localStorage.setItem("aok_video_seen", "true");
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="video-intro-container">
      <iframe
        src="https://aok-demo-maker.replit.app"
        className="w-full flex-1 border-0"
        allow="autoplay; fullscreen"
        title="AOK Demo Video"
        data-testid="video-intro-iframe"
      />

      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all duration-200 ease-linear"
            style={{ width: `${progress}%` }}
            data-testid="video-progress-bar"
          />
        </div>
        <div className="p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-end max-w-4xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleContinue}
              className={`text-white/80 hover:text-white hover:bg-white/20 transition-opacity duration-500 ${showSkip ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              data-testid="button-skip-video"
            >
              Skip
              <SkipForward className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
