import { Link, useLocation } from "wouter";
import { Home, Users, History, Settings, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const individualNavItems = [
  { path: "/app", icon: Home, label: "Home" },
  { path: "/app/contacts", icon: Users, label: "Contacts" },
  { path: "/app/history", icon: History, label: "History" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

const organizationNavItems = [
  { path: "/app", icon: Building2, label: "Dashboard" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isOrganization = user?.accountType === "organization";
  const navItems = isOrganization ? organizationNavItems : individualNavItems;

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
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px] ${
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
      </div>
    </nav>
  );
}
