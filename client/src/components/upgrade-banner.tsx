import { ArrowUpCircle, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PlanData {
  tier: string;
  features: {
    tier: string;
    maxActiveContacts: number;
    moodTracking: boolean;
    petProtection: boolean;
    digitalDocuments: boolean;
    activities: boolean;
    wellbeingAi: boolean;
    shakeToAlert: boolean;
    continuousTracking: boolean;
    emergencyRecording: boolean;
  };
}

const PLAN_DETAILS = {
  essential: {
    name: "Essential",
    price: "£9.99",
    highlights: [
      "Up to 5 emergency contacts",
      "SMS & voice call alerts for check-ins",
      "Shake to Alert",
      "GPS with what3words",
      "Mood tracking & pet protection",
      "Digital documents",
      "Push notifications",
    ],
  },
  complete: {
    name: "Complete Wellbeing",
    price: "£16.99",
    highlights: [
      "Everything in Essential",
      "Wellbeing AI companion",
      "Emergency recording",
      "Activities tracker",
      "Full wellness suite",
    ],
  },
};

interface UpgradeBannerProps {
  feature?: string;
  compact?: boolean;
}

export function UpgradeBanner({ feature, compact = false }: UpgradeBannerProps) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const { data: plan } = useQuery<PlanData>({
    queryKey: ["/api/plan"],
  });

  if (!plan || plan.tier === "complete") return null;

  const nextTier = plan.tier === "basic" || plan.tier === "free" ? "essential" : "complete";
  const details = PLAN_DETAILS[nextTier as keyof typeof PLAN_DETAILS];

  const handleUpgrade = async (targetTier: string) => {
    setUpgrading(targetTier);
    try {
      const priceId = targetTier === "essential"
        ? import.meta.env.VITE_STRIPE_ESSENTIAL_PRICE_ID
        : import.meta.env.VITE_STRIPE_COMPLETE_PRICE_ID;

      const res = await apiRequest("POST", "/api/stripe/upgrade-subscription", {
        newPriceId: priceId,
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        toast({ title: "Plan upgraded!", description: `You're now on the ${details.name} plan.` });
        window.location.reload();
      }
    } catch (error) {
      toast({ title: "Upgrade failed", description: "Please try again or contact help@aok.care", variant: "destructive" });
    } finally {
      setUpgrading(null);
    }
  };

  if (compact) {
    return (
      <div
        className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3"
        data-testid="upgrade-banner-compact"
      >
        <ArrowUpCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {feature ? `${feature} requires an upgrade` : "Unlock more features"}
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade to {details.name} for {details.price}/month
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => handleUpgrade(nextTier)}
          disabled={!!upgrading}
          data-testid="button-upgrade-compact"
        >
          {upgrading ? "..." : "Upgrade"}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-emerald-500/5" data-testid="upgrade-banner">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-lg" data-testid="text-upgrade-title">
            {feature ? `Unlock ${feature}` : "Upgrade Your Plan"}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {feature
            ? `${feature} is available on the ${details.name} plan and above.`
            : `Get more from aok with the ${details.name} plan.`}
        </p>

        <div className="space-y-4">
          {(plan.tier === "basic" || plan.tier === "free") && (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">Essential</p>
                  <p className="text-sm text-muted-foreground">£9.99/month</p>
                </div>
                <Button
                  onClick={() => handleUpgrade("essential")}
                  disabled={!!upgrading}
                  variant="outline"
                  data-testid="button-upgrade-essential"
                >
                  {upgrading === "essential" ? "Processing..." : "Upgrade"}
                </Button>
              </div>
              <ul className="space-y-1.5">
                {PLAN_DETAILS.essential.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">Complete Wellbeing</p>
                <p className="text-sm text-muted-foreground">£16.99/month</p>
              </div>
              <Button
                onClick={() => handleUpgrade("complete")}
                disabled={!!upgrading}
                data-testid="button-upgrade-complete"
              >
                {upgrading === "complete" ? "Processing..." : "Upgrade"}
              </Button>
            </div>
            <ul className="space-y-1.5">
              {PLAN_DETAILS.complete.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
