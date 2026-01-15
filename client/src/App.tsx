import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AdminProvider, useAdmin } from "@/contexts/admin-context";
import { Loader2, Shield } from "lucide-react";
import { Link } from "wouter";
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
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminBundles from "@/pages/admin/bundles";
import OrganizationDashboard from "@/pages/org/dashboard";

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

function AdminProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAdmin();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function AdminAuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAdmin();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/admin" />;
  }

  return <Component />;
}

function AppRoutes() {
  const { user } = useAuth();
  const isOrganization = user?.accountType === "organization";

  return (
    <Switch>
      <Route path="/app" component={() => <ProtectedRoute component={isOrganization ? OrganizationDashboard : Dashboard} />} />
      <Route path="/app/org" component={() => <ProtectedRoute component={OrganizationDashboard} />} />
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
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <Link href="/app">
            <div className="flex items-center gap-2 cursor-pointer w-fit" data-testid="link-home-logo">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">CheckMate24</span>
            </div>
          </Link>
        </div>
      </header>
      <main className="pb-16">
        <AppRoutes />
      </main>
      <BottomNav />
    </div>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin" component={() => <AdminProtectedRoute component={AdminDashboard} />} />
      <Route path="/admin/users" component={() => <AdminProtectedRoute component={AdminUsers} />} />
      <Route path="/admin/bundles" component={() => <AdminProtectedRoute component={AdminBundles} />} />
      <Route component={NotFound} />
    </Switch>
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

  if (location === "/admin/login") {
    return (
      <AdminProvider>
        <AdminAuthRoute component={AdminLogin} />
      </AdminProvider>
    );
  }

  if (location.startsWith("/admin")) {
    return (
      <AdminProvider>
        <AdminRoutes />
      </AdminProvider>
    );
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
