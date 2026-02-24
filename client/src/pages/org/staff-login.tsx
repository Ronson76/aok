import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function OrganizationStaffLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sessionExpired") === "true") {
      setSessionExpired(true);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/org-login", { email, password });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.accountType !== "organization") {
        toast({
          title: "Access Denied",
          description: "This login is for organisations only.",
          variant: "destructive",
        });
        await apiRequest("POST", "/api/auth/logout");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back",
        description: "You've successfully signed in to your organisation account.",
      });
      setLocation("/org/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-background dark:from-indigo-950 dark:to-background flex flex-col">
      <header className="bg-indigo-900 dark:bg-indigo-950 border-b border-indigo-800">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Building2 className="h-7 w-7 text-white" />
          <span className="text-xl font-bold text-white">aok</span>
          <Badge variant="outline" className="text-indigo-300 border-indigo-600">Organisation</Badge>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Organisation Staff Login</CardTitle>
            <CardDescription>
              Sign in to manage your organisation's clients
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {sessionExpired && (
                <Card className="border-destructive bg-destructive/10" data-testid="card-session-expired">
                  <CardContent className="flex items-center gap-3 p-4">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">Session Expired</p>
                      <p className="text-sm text-muted-foreground">
                        Your session has timed out for security. Please sign in again.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="organisation@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    data-testid="input-password"
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
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-signin"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <div className="text-center space-y-2">
                <Link href="/org/forgot-password">
                  <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-forgot-password">Forgot password?</span>
                </Link>
                <p className="text-sm text-muted-foreground">
                  <Link href="/org/login">
                    <span className="text-primary hover:underline cursor-pointer" data-testid="link-back-login">Back to Login</span>
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      <footer className="py-4 text-center"><p className="text-xs text-muted-foreground">aok Organisation Portal</p></footer>
    </div>
  );
}
