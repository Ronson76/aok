import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PasswordInput } from "@/components/password-input";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

interface AdminInviteInfo {
  email: string;
  name: string;
  role: "super_admin" | "analyst";
}

function getRoleLabel(role: string) {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "analyst":
      return "Analyst";
    default:
      return role;
  }
}

export default function AdminInvite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const code = new URLSearchParams(window.location.search).get("code");

  const { data, isLoading, isError, error } = useQuery<{ invite: AdminInviteInfo }>({
    queryKey: ["/api/admin/invite", code],
    enabled: !!code,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/invite/${code}/accept`, { password });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "Your admin account has been set up successfully.",
      });
      setLocation("/admin/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to set up account",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8 || !/^[a-zA-Z0-9]+$/.test(password)) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters and contain only letters and numbers.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    acceptMutation.mutate();
  };

  const invite = data?.invite;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        {!code ? (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-error-title">Invalid Invite Link</h2>
              <p className="text-muted-foreground" data-testid="text-error-message">
                This invite link is invalid. Please check the link and try again.
              </p>
              <Link href="/admin/login">
                <Button variant="outline" data-testid="button-go-to-login">Go to Admin Login</Button>
              </Link>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </div>
        ) : isError ? (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-error-title">
                Invitation Invalid or Expired
              </h2>
              <p className="text-muted-foreground" data-testid="text-error-message">
                {(error as any)?.message || "This invitation is no longer valid. It may have expired or been revoked."}
              </p>
              <Link href="/admin/login">
                <Button variant="outline" data-testid="button-go-to-login">Go to Admin Login</Button>
              </Link>
            </CardContent>
          </Card>
        ) : invite ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex flex-col items-center mb-4">
                <ShieldCheck className="h-12 w-12 text-green-600" />
                <span className="text-2xl font-bold text-green-600">aok</span>
                <span className="text-xs text-muted-foreground mt-1">Admin Portal</span>
              </div>
              <CardTitle className="text-2xl" data-testid="text-setup-title">Set Up Admin Account</CardTitle>
              <CardDescription>
                Complete your account setup to join the admin team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={invite.email}
                    readOnly
                    className="bg-muted"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`no-default-hover-elevate no-default-active-elevate ${
                        invite.role === "super_admin"
                          ? "bg-red-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                      data-testid="badge-invite-role"
                    >
                      {getRoleLabel(invite.role)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Password</Label>
                  <PasswordInput
                    id="invite-password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    data-testid="input-invite-password"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-confirm-password">Confirm Password</Label>
                  <PasswordInput
                    id="invite-confirm-password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    data-testid="input-invite-confirm-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={acceptMutation.isPending}
                  data-testid="button-accept-invite"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}