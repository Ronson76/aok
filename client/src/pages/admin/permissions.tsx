import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Shield,
  Loader2,
  CheckCircle,
  Bell,
  Zap,
  AlertTriangle,
  MapPin,
  Smartphone,
  Heart,
  MessageSquare,
  Lock,
  TrendingUp,
  Sparkles,
  Scroll,
  Timer,
} from "lucide-react";
import { FaPaw, FaRunning } from "react-icons/fa";
import type { TierPermission } from "@shared/schema";
import { allTierFeatureKeys, featureLabels } from "@shared/schema";

type FeatureKey = typeof allTierFeatureKeys[number];

const featureIcons: Record<string, typeof Bell> = {
  featureCheckIn: Timer,
  featureShakeToAlert: Zap,
  featureEmergencyAlert: AlertTriangle,
  featureGpsLocation: MapPin,
  featurePushNotifications: Smartphone,
  featurePrimaryContact: Heart,
  featureSmsBackup: MessageSquare,
  featureEmergencyRecording: Lock,
  featureMoodTracking: TrendingUp,
  featurePetProtection: Shield,
  featureDigitalWill: Scroll,
  featureWellbeingAi: Sparkles,
  featureFitnessTracking: Shield,
  featureActivitiesTracker: Timer,
};

function TierPanel({ 
  tier, 
  tierLabel, 
  tierDescription,
  permissions, 
  onToggle, 
  isSaving 
}: { 
  tier: "tier1" | "tier2";
  tierLabel: string;
  tierDescription: string;
  permissions: Record<string, boolean>;
  onToggle: (feature: FeatureKey, value: boolean) => void;
  isSaving: boolean;
}) {
  return (
    <Card data-testid={`card-tier-${tier}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {tierLabel}
            </CardTitle>
            <CardDescription className="mt-1">{tierDescription}</CardDescription>
          </div>
          <Badge variant={tier === "tier2" ? "default" : "secondary"}>
            {tier === "tier1" ? "Tier 1" : "Tier 2"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {allTierFeatureKeys.map((key) => {
            const Icon = featureIcons[key] || Shield;
            const enabled = permissions[key] ?? false;
            return (
              <div
                key={key}
                className="flex items-center justify-between py-2.5 px-3 rounded-md hover-elevate"
                data-testid={`toggle-${tier}-${key}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{featureLabels[key] || key}</span>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => onToggle(key, checked)}
                  disabled={isSaving}
                  data-testid={`switch-${tier}-${key}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPermissions() {
  const { toast } = useToast();
  const [tier1State, setTier1State] = useState<Record<string, boolean>>({});
  const [tier2State, setTier2State] = useState<Record<string, boolean>>({});
  const [hasInitialized, setHasInitialized] = useState(false);

  const { data: permissions, isLoading } = useQuery<TierPermission[]>({
    queryKey: ["/api/admin/tier-permissions"],
  });

  useEffect(() => {
    if (permissions && !hasInitialized) {
      const t1 = permissions.find(p => p.tier === "tier1");
      const t2 = permissions.find(p => p.tier === "tier2");
      if (t1) {
        const state: Record<string, boolean> = {};
        for (const key of allTierFeatureKeys) {
          state[key] = (t1 as any)[key] ?? false;
        }
        setTier1State(state);
      }
      if (t2) {
        const state: Record<string, boolean> = {};
        for (const key of allTierFeatureKeys) {
          state[key] = (t2 as any)[key] ?? false;
        }
        setTier2State(state);
      }
      setHasInitialized(true);
    }
  }, [permissions, hasInitialized]);

  const updateTierMutation = useMutation({
    mutationFn: async ({ tier, updates }: { tier: string; updates: Record<string, boolean> }) => {
      const response = await apiRequest("PUT", `/api/admin/tier-permissions/${tier}`, updates);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tier-permissions"] });
      toast({
        title: "Permissions updated",
        description: `${variables.tier === "tier1" ? "Essential" : "Complete Wellbeing"} tier has been updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTier1Toggle = (feature: FeatureKey, value: boolean) => {
    const newState = { ...tier1State, [feature]: value };
    setTier1State(newState);
    updateTierMutation.mutate({ tier: "tier1", updates: { [feature]: value } });
  };

  const handleTier2Toggle = (feature: FeatureKey, value: boolean) => {
    const newState = { ...tier2State, [feature]: value };
    setTier2State(newState);
    updateTierMutation.mutate({ tier: "tier2", updates: { [feature]: value } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions
              </h1>
              <p className="text-sm text-muted-foreground">Control which features are available per subscription tier</p>
            </div>
          </div>
          {updateTierMutation.isPending && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(14)].map((_, j) => (
                    <div key={j} className="flex items-center justify-between py-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-9 rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TierPanel
              tier="tier1"
              tierLabel="Essential"
              tierDescription="Core safety and check-in features for peace of mind."
              permissions={tier1State}
              onToggle={handleTier1Toggle}
              isSaving={updateTierMutation.isPending}
            />
            <TierPanel
              tier="tier2"
              tierLabel="Complete Wellbeing"
              tierDescription="Everything in Essential plus wellness, AI, and more."
              permissions={tier2State}
              onToggle={handleTier2Toggle}
              isSaving={updateTierMutation.isPending}
            />
          </div>
        )}
      </main>
    </div>
  );
}
