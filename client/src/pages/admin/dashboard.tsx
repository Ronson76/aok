import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Building2, User, CheckCircle, XCircle, Package, 
  LogOut, Shield, TrendingUp, Calendar, AlertOctagon
} from "lucide-react";
import { format } from "date-fns";
import type { DashboardStats } from "@shared/schema";

export default function AdminDashboard() {
  const { admin, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex flex-col items-center cursor-pointer" data-testid="link-home-logo">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">&copy; Ghuman</span>
              </div>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {admin?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{admin?.role}</Badge>
            <nav className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin")}
                data-testid="nav-dashboard"
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/users")}
                data-testid="nav-users"
              >
                Users
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/bundles")}
                data-testid="nav-bundles"
              >
                Bundles
              </Button>
            </nav>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-6">Overview</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-users">
                    {stats.totalUsers}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-organizations">
                    {stats.totalOrganizations}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Individuals</CardTitle>
                  <User className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-individuals">
                    {stats.totalIndividuals}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-checkins">
                    {stats.totalCheckIns}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Missed Check-ins</CardTitle>
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive" data-testid="stat-missed">
                    {stats.totalMissedCheckIns}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Active Bundles</CardTitle>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-bundles">
                    {stats.activeBundles}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Seats Allocated</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-seats-allocated">
                    {stats.totalSeatsAllocated}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Seats Used</CardTitle>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-seats-used">
                    {stats.totalSeatsUsed}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Emergency Alerts</CardTitle>
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500" data-testid="stat-emergency-alerts">
                    {stats.totalEmergencyAlerts}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No users yet</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentUsers.slice(0, 5).map((user) => (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          data-testid={`recent-user-${user.id}`}
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.accountType === "organization" ? "default" : "secondary"}>
                              {user.accountType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(user.createdAt?.toString() || "")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Registrations</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.dailyRegistrations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No registration data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.dailyRegistrations.slice(-7).map((day) => (
                        <div 
                          key={day.date} 
                          className="flex items-center justify-between p-2 rounded bg-muted/30"
                        >
                          <span className="text-sm">{formatDate(day.date)}</span>
                          <Badge variant="secondary">{day.count} users</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    Recent Emergency Alerts
                  </CardTitle>
                  <CardDescription>Users who triggered emergency alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentEmergencyAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No emergency alerts</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.recentEmergencyAlerts.slice(0, 5).map((alert) => (
                        <div 
                          key={alert.id} 
                          className="flex items-start justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                          data-testid={`emergency-alert-${alert.id}`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{alert.userName}</p>
                            <p className="text-sm text-muted-foreground">{alert.userEmail}</p>
                            <p className="text-xs text-muted-foreground">
                              Notified: {alert.contactsNotified.join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="bg-red-500">Emergency</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(alert.timestamp), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Failed to load statistics</p>
        )}
      </main>
    </div>
  );
}
