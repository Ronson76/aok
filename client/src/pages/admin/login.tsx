import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, UserPlus, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminStatus, isLoading: checkingAdmin } = useQuery<{ hasAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const needsSetup = adminStatus?.hasAdmin === false;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation("/admin");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/admin/setup", { email, password, name });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      await login(email, password);
      setLocation("/admin");
      toast({
        title: "Admin account created",
        description: "You are now logged in as an administrator.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message || "Could not create admin account",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex flex-col items-center mb-4" data-testid="link-logo-home">
            <ShieldCheck className="h-12 w-12 text-green-600" />
            <span className="text-lg font-semibold text-green-600">aok</span>
            <span className="text-xs text-muted-foreground mt-1">Admin Portal</span>
          </Link>
          <CardTitle className="text-2xl">
            {needsSetup ? "Create Admin Account" : "Admin Login"}
          </CardTitle>
          <CardDescription>
            {needsSetup 
              ? "Set up the first administrator account for aok"
              : "Sign in to access the admin dashboard"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={needsSetup ? handleSetup : handleLogin} className="space-y-4">
            {needsSetup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="input-admin-name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-admin-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={needsSetup ? "Create a secure password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={needsSetup ? 8 : undefined}
                  className="pr-10"
                  autoComplete="off"
                  data-testid="input-admin-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {needsSetup && (
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-admin-login">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {needsSetup ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                needsSetup ? "Create Admin Account" : "Sign In"
              )}
            </Button>
            {!needsSetup && (
              <div className="text-center">
                <Link href="/admin/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  Forgot password?
                </Link>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
