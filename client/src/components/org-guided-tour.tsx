import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Play, ShieldCheck, Users, UserPlus, BarChart3, Shield, FileText, AlertTriangle, Bell, Search, Settings } from "lucide-react";

interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-testid="text-org-dashboard-title"]',
    title: "Welcome to Your Dashboard",
    description: "This is your Organisation Dashboard - a real-time overview of all your clients' safety and wellbeing. The LIVE indicator confirms you are seeing up-to-the-minute data.",
    icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="button-register-client"]',
    title: "Register New Clients",
    description: "Click here to register a new client. You will enter their details, assign a supervisor, set their check-in schedule, and configure safety features. They will receive an SMS with their login code.",
    icon: <UserPlus className="h-5 w-5 text-blue-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="button-import-clients"]',
    title: "Bulk Import Clients",
    description: "Need to add many clients at once? Use the Import button to upload an Excel spreadsheet with client details. The system will validate each row and create accounts automatically.",
    icon: <FileText className="h-5 w-5 text-orange-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="button-team-management"]',
    title: "Team Management",
    description: "Manage your staff team here. Invite team members with role-based access (Manager, Supervisor, Viewer, etc.). Each role has specific permissions controlling what they can see and do.",
    icon: <Users className="h-5 w-5 text-green-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="text-total-clients"]',
    title: "Seat Usage",
    description: "This shows how many client seats you have used out of your total allocation. When you approach your limit, speak to AOK about increasing your capacity.",
    icon: <Users className="h-5 w-5 text-indigo-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="text-clients-safe"]',
    title: "Safe Clients",
    description: "The number of clients who have checked in on time. A green status means they confirmed they are safe within their scheduled window.",
    icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="text-clients-overdue"]',
    title: "Overdue Alerts",
    description: "Clients who have missed their check-in window appear here. The system automatically notifies their emergency contacts via email and, if configured, by phone call. Click to view the full overdue report.",
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="text-emergency-alerts"]',
    title: "Emergency Alerts",
    description: "This shows the total number of emergency SOS alerts triggered by your clients. When a client presses their emergency button, their GPS location is captured and their contacts are notified immediately.",
    icon: <Bell className="h-5 w-5 text-red-600" />,
    position: "bottom",
  },
  {
    targetSelector: '[data-testid="input-search-client-name"]',
    title: "Search & Filter Clients",
    description: "Quickly find any client by searching their name, email, or reference code. The client list updates in real-time as you type.",
    icon: <Search className="h-5 w-5 text-muted-foreground" />,
    position: "top",
  },
  {
    targetSelector: '[data-testid="button-toggle-audit-trail"]',
    title: "Activity Log & Audit Trail",
    description: "Every action taken on the platform is recorded here with a tamper-evident audit trail. You can filter by action type, export to CSV or PDF, and verify the integrity of the entire chain - essential for governance and compliance.",
    icon: <FileText className="h-5 w-5 text-purple-600" />,
    position: "top",
  },
  {
    targetSelector: '[data-testid="button-org-logout"]',
    title: "Security & Auto-Logout",
    description: "For security, the dashboard automatically logs you out after 5 minutes of inactivity. Always log out when leaving your workstation. You can also change your password from the action bar.",
    icon: <Settings className="h-5 w-5 text-muted-foreground" />,
    position: "bottom",
  },
];

interface OrgGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrgGuidedTour({ isOpen, onClose }: OrgGuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateHighlight = useCallback(() => {
    if (currentStep < 0 || currentStep >= TOUR_STEPS.length) {
      setHighlightRect(null);
      return;
    }
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setHighlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(-1);
      return;
    }
    updateHighlight();
    const handleResize = () => updateHighlight();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, currentStep, updateHighlight]);

  useEffect(() => {
    if (currentStep >= 0) {
      const timer = setTimeout(updateHighlight, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, updateHighlight]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(-1);
    onClose();
  };

  const handleStart = () => {
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  if (currentStep === -1) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" ref={overlayRef}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" data-testid="tour-welcome-dialog">
          <div className="bg-gradient-to-br from-green-600 to-green-700 px-6 py-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <Play className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Dashboard Walkthrough</h2>
            <p className="text-green-100 text-sm">A quick interactive guide to help you get the most out of your organisation dashboard</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex-shrink-0">{TOUR_STEPS.length}</div>
                <span>{TOUR_STEPS.length} steps covering all key features</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold flex-shrink-0">~</div>
                <span>Takes approximately 2 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex-shrink-0">?</div>
                <span>You can exit at any time and restart later</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose} data-testid="tour-skip-button">
                Maybe Later
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleStart} data-testid="tour-start-button">
                <Play className="h-4 w-4 mr-2" />
                Start Tour
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const padding = 8;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const tooltipWidth = 360;
    const tooltipHeight = 220;
    const gap = 16;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case "bottom":
        top = highlightRect.bottom + gap;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = highlightRect.top - tooltipHeight - gap;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
        left = highlightRect.left - tooltipWidth - gap;
        break;
      case "right":
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
        left = highlightRect.right + gap;
        break;
      default:
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
    }

    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-[9999]" ref={overlayRef}>
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - padding}
                y={highlightRect.top - padding}
                width={highlightRect.width + padding * 2}
                height={highlightRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={handleClose}
        />
      </svg>

      {highlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-green-500 ring-offset-2 ring-offset-transparent"
          style={{
            left: highlightRect.left - padding,
            top: highlightRect.top - padding,
            width: highlightRect.width + padding * 2,
            height: highlightRect.height + padding * 2,
            pointerEvents: "none",
            boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.3)",
            transition: "all 0.3s ease-in-out",
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border overflow-hidden"
        style={{ ...getTooltipStyle(), zIndex: 10000, transition: "top 0.3s ease, left 0.3s ease" }}
        data-testid={`tour-tooltip-step-${currentStep}`}
      >
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step.icon}
            <span className="text-xs font-medium text-muted-foreground">Step {currentStep + 1} of {TOUR_STEPS.length}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            data-testid="tour-close-button"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-4 py-3">
          <h3 className="font-semibold text-base mb-1.5">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
        <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? "w-4 bg-green-600" : i < currentStep ? "w-1.5 bg-green-400" : "w-1.5 bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev} data-testid="tour-prev-button">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleNext}
              data-testid="tour-next-button"
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
