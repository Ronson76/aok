import { Link, useLocation } from "wouter";
import { Home, Users, History, Settings, Building2, TrendingUp, PawPrint, FileText, MoreHorizontal, Lock } from "lucide-react";
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
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

const organizationNavItems = [
  { path: "/app", icon: Building2, label: "Dashboard" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

// Restricted nav for org-managed clients (only home/dashboard)
const orgManagedClientNavItems = [
  { path: "/app", icon: Home, label: "Home" },
];

interface FeatureFlags {
  isOrgClient: boolean;
  featureMoodTracking: boolean;
  featurePetProtection: boolean;
  featureDigitalWill: boolean;
}

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isOrganization = user?.accountType === "organization";
  const isOrgManagedClient = !!user?.referenceId;
  const [moreOpen, setMoreOpen] = useState(false);
  
  // Fetch feature flags
  const { data: features } = useQuery<FeatureFlags>({
    queryKey: ["/api/features"],
    enabled: !!user && !isOrganization,
  });
  
  // Check if registration is complete
  const isRegistrationComplete = !!user?.termsAcceptedAt;
  
  // Determine which nav items to show
  const navItems = isOrganization 
    ? organizationNavItems 
    : isOrgManagedClient 
      ? orgManagedClientNavItems 
      : coreNavItems;

  // Wellness features for the More menu
  const wellnessFeatures = [
    { 
      path: "/app/mood", 
      icon: TrendingUp, 
      label: "Wellness", 
      enabled: features?.featureMoodTracking !== false && isRegistrationComplete 
    },
    { 
      path: "/app/pets", 
      icon: PawPrint, 
      label: "Pets", 
      enabled: features?.featurePetProtection !== false && isRegistrationComplete 
    },
    { 
      path: "/app/documents", 
      icon: FileText, 
      label: "Documents", 
      enabled: features?.featureDigitalWill !== false && isRegistrationComplete 
    },
  ];
  
  const isMoreActive = wellnessFeatures.some(f => location === f.path);

  // Don't show More menu for organizations or org-managed clients
  const showMoreMenu = !isOrganization && !isOrgManagedClient;

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
                data-testid="nav-more"
              >
                <MoreHorizontal className={`h-5 w-5 ${isMoreActive ? "text-primary" : ""}`} />
                <span className="text-xs font-medium">More</span>
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
                        className={`flex items-center gap-3 cursor-pointer ${isActive ? "text-primary" : ""}`}
                        onClick={() => setMoreOpen(false)}
                        data-testid={`nav-more-${feature.label.toLowerCase()}`}
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
                      className="flex items-center gap-3 opacity-50"
                      data-testid={`nav-more-${feature.label.toLowerCase()}-disabled`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{feature.label}</span>
                      <Lock className="h-3 w-3 ml-auto" />
                    </DropdownMenuItem>
                  );
                }
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
