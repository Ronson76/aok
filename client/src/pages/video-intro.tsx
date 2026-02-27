import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Volume2, VolumeX } from "lucide-react";

interface VideoIntroProps {
  onContinue: () => void;
}

export default function VideoIntro({ onContinue }: VideoIntroProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    localStorage.setItem("aok_video_seen", "true");
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="video-intro-container">
      <iframe
        src={`https://aok-demo-maker.replit.app?autoplay=1&muted=${isMuted ? 1 : 0}`}
        className="w-full flex-1 border-0"
        allow="autoplay; fullscreen"
        title="AOK Demo Video"
        data-testid="video-intro-iframe"
      />

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setIsMuted(!isMuted)}
            data-testid="button-toggle-mute"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleContinue}
            className={`text-white bg-primary hover:bg-primary/90 transition-opacity duration-500 ${showSkip ? "opacity-100" : "opacity-0"}`}
            data-testid="button-continue-to-site"
          >
            Continue to AOK
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
