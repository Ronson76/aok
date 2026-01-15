import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/app" />;
  }

  return <Component />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/app" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/app/contacts" component={() => <ProtectedRoute component={Contacts} />} />
      <Route path="/app/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/app/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        <AppRoutes />
      </main>
      <BottomNav />
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/") {
    return <Landing />;
  }

  if (location === "/login") {
    return <AuthRoute component={Login} />;
  }

  if (location === "/register") {
    return <AuthRoute component={Register} />;
  }

  if (location === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (location.startsWith("/reset-password")) {
    return <ResetPassword />;
  }

  return <AppLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
