import { Link, useLocation } from "wouter";
import { Home, Users, History, Settings, Building2, TrendingUp, PawPrint, FileText, Heart, Lock, Shield } from "lucide-react";
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
  featureWellbeingAi: boolean;
  featureMoodTracking: boolean;
  featurePetProtection: boolean;
  featureDigitalWill: boolean;
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
      enabled: features?.featureMoodTracking !== false && isRegistrationComplete 
    },
    { 
      path: "/app/pets", 
      icon: PawPrint, 
      label: "Pet Protection", 
      enabled: features?.featurePetProtection !== false && isRegistrationComplete 
    },
    { 
      path: "/app/documents", 
      icon: FileText, 
      label: "Digital Will", 
      enabled: features?.featureDigitalWill !== false && isRegistrationComplete 
    },
  ];
  
  const isMoreActive = wellnessFeatures.some(f => location === f.path);

  // Check if any wellness features are enabled (including Wellbeing AI)
  const hasAnyWellnessFeatures = wellnessFeatures.some(f => f.enabled) || 
    (features?.featureWellbeingAi !== false && isRegistrationComplete);

  const showMoreMenu = !isOrganization && !isStaff && (!isOrgManagedClient || hasAnyWellnessFeatures);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
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
                    <DropdownMenuItem 
                      key={feature.path} 
                      disabled 
                      className="flex items-center gap-3 text-muted-foreground opacity-50"
                      data-testid={`nav-wellbeing-${feature.label.toLowerCase()}-disabled`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{feature.label}</span>
                      <Lock className="h-3 w-3 ml-auto" />
                    </DropdownMenuItem>
                  );
                }
              })}
              
              {/* Wellbeing-ai internal link - shown when feature is enabled */}
              {isRegistrationComplete && features?.featureWellbeingAi !== false ? (
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
                <DropdownMenuItem 
                  disabled 
                  className="flex items-center gap-3 opacity-50"
                  data-testid="nav-wellbeing-ai-disabled"
                >
                  <div className="relative h-4 w-4 flex items-center justify-center">
                    <div className="w-3 h-1 bg-muted-foreground absolute rounded-sm" />
                    <div className="w-1 h-3 bg-muted-foreground absolute rounded-sm" />
                  </div>
                  <span>Wellbeing AI</span>
                  <Lock className="h-3 w-3 ml-auto" />
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {!isOrganization && !isOrgManagedClient && !isStaff && (
          <Link
            href={settingsNavItem.path}
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
