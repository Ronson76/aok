import { Link, useLocation } from "wouter";
import { Home, Users, History, Settings, Building2, TrendingUp, PawPrint, FileText, Heart, Lock, Shield, MapPin, ArrowUpCircle } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const coreNavItems = [
  { path: "/app", icon: Home, label: "Home" },
  { path: "/app/contacts", icon: Users, label: "Contacts" },
  { path: "/app/history", icon: History, label: "History" },
];

const settingsNavItem = { path: "/app/settings", icon: Settings, label: "Settings" };

const organizationNavItems = [
  { path: "/app", icon: Building2, label: "Dashboard" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

const staffNavItems = [
  { path: "/app", icon: Shield, label: "Lone Worker" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

const orgManagedClientNavItems = [
  { path: "/app", icon: Home, label: "Home" },
];

interface FeatureFlags {
  isOrgClient: boolean;
  planTier?: string;
  featureWellbeingAi: boolean;
  featureMoodTracking: boolean;
  featurePetProtection: boolean;
  featureDigitalWill: boolean;
  featureFitnessTracking: boolean;
  featureShakeToAlert?: boolean;
  featureContinuousTracking?: boolean;
  featureEmergencyRecording?: boolean;
  featurePushNotifications?: boolean;
  maxActiveContacts?: number;
}

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isOrganization = user?.accountType === "organization";
  const isOrgManagedClient = !!user?.referenceId;
  const isStaff = !!(user as any)?.isStaffMember;
  const [moreOpen, setMoreOpen] = useState(false);
  
  const { data: features } = useQuery<FeatureFlags>({
    queryKey: ["/api/features"],
    enabled: !!user && !isOrganization && !isStaff,
  });
  
  const isRegistrationComplete = !!user?.termsAcceptedAt;
  
  const navItems = isStaff
    ? staffNavItems
    : isOrganization 
      ? organizationNavItems 
      : isOrgManagedClient 
        ? orgManagedClientNavItems 
        : coreNavItems;

  // Wellness features for the More menu
  const wellnessFeatures = [
    { 
      path: "/app/mood", 
      icon: TrendingUp, 
      label: "Mood Tracking", 
      enabled: features?.featureMoodTracking === true && isRegistrationComplete 
    },
    { 
      path: "/app/pets", 
      icon: PawPrint, 
      label: "Pet Protection", 
      enabled: features?.featurePetProtection === true && isRegistrationComplete 
    },
    { 
      path: "/app/documents", 
      icon: FileText, 
      label: "Documents", 
      enabled: features?.featureDigitalWill === true && isRegistrationComplete 
    },
    { 
      path: "/app/errands", 
      icon: MapPin, 
      label: "Activities", 
      enabled: features?.featureFitnessTracking === true && isRegistrationComplete 
    },
  ];
  
  const isMoreActive = wellnessFeatures.some(f => location === f.path);

  const hasAnyWellnessFeatures = wellnessFeatures.some(f => f.enabled) || 
    (features?.featureWellbeingAi === true && isRegistrationComplete);

  const showMoreMenu = !isOrganization && !isStaff && hasAnyWellnessFeatures;

  return (
    <nav role="navigation" aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        {showMoreMenu && (
          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Wellbeing"
                aria-current={isMoreActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
                  isMoreActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="nav-wellbeing"
              >
                <Heart className={`h-5 w-5 ${isMoreActive ? "text-primary" : ""}`} />
                <span className="text-xs font-medium">Wellbeing</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mb-2">
              {wellnessFeatures.map((feature) => {
                const Icon = feature.icon;
                const isActive = location === feature.path;
                
                if (feature.enabled) {
                  return (
                    <DropdownMenuItem key={feature.path} asChild>
                      <Link
                        href={feature.path}
                        className={`flex items-center gap-3 cursor-pointer text-green-600 ${isActive ? "font-semibold" : ""}`}
                        onClick={() => setMoreOpen(false)}
                        data-testid={`nav-wellbeing-${feature.label.toLowerCase()}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{feature.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                } else {
                  return (
                    <DropdownMenuItem key={feature.path} asChild>
                      <Link
                        href="/app/settings?upgrade=true"
                        className="flex items-center gap-3 cursor-pointer text-muted-foreground opacity-60"
                        onClick={() => setMoreOpen(false)}
                        data-testid={`nav-wellbeing-${feature.label.toLowerCase()}-locked`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{feature.label}</span>
                        <ArrowUpCircle className="h-3 w-3 ml-auto text-amber-500" />
                      </Link>
                    </DropdownMenuItem>
                  );
                }
              })}
              
              {isRegistrationComplete && features?.featureWellbeingAi === true ? (
                <DropdownMenuItem asChild>
                  <Link
                    href="/app/wellbeing-ai"
                    className="flex items-center gap-3 cursor-pointer text-green-600"
                    onClick={() => setMoreOpen(false)}
                    data-testid="nav-wellbeing-ai"
                  >
                    <div className="relative h-4 w-4 flex items-center justify-center">
                      <div className="w-3 h-1 bg-green-600 absolute rounded-sm" />
                      <div className="w-1 h-3 bg-green-600 absolute rounded-sm" />
                    </div>
                    <span>Wellbeing AI</span>
                  </Link>
                </DropdownMenuItem>
              ) : !isOrgManagedClient ? (
                <DropdownMenuItem asChild>
                  <Link
                    href="/app/settings?upgrade=true"
                    className="flex items-center gap-3 cursor-pointer text-muted-foreground opacity-60"
                    onClick={() => setMoreOpen(false)}
                    data-testid="nav-wellbeing-ai-locked"
                  >
                    <div className="relative h-4 w-4 flex items-center justify-center">
                      <div className="w-3 h-1 bg-muted-foreground absolute rounded-sm" />
                      <div className="w-1 h-3 bg-muted-foreground absolute rounded-sm" />
                    </div>
                    <span>Wellbeing AI</span>
                    <ArrowUpCircle className="h-3 w-3 ml-auto text-amber-500" />
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {!isOrganization && !isOrgManagedClient && !isStaff && (
          <Link
            href={settingsNavItem.path}
            aria-label={settingsNavItem.label}
            aria-current={location === settingsNavItem.path ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
              location === settingsNavItem.path
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-settings"
          >
            <Settings className={`h-5 w-5 ${location === settingsNavItem.path ? "text-primary" : ""}`} />
            <span className="text-xs font-medium">Settings</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
