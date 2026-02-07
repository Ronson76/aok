import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { ShieldCheck, Loader2, AlertCircle, UserPlus } from "lucide-react";

interface InviteInfo {
  email: string;
  name: string;
  role: string;
  organizationId: number;
}

export default function OrgTeamInvite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const code = new URLSearchParams(window.location.search).get("code");

  const { data, isLoading, isError, error } = useQuery<{ invite: InviteInfo }>({
    queryKey: ["/api/org-member/invite", code],
    enabled: !!code,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/org-member/invite/${code}/accept`, { password });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "Your account has been set up successfully.",
      });
      setLocation("/org/dashboard");
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
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
                No invite code was provided. Please check the link you received and try again.
              </p>
              <Link href="/org/login">
                <Button variant="outline" className="mt-4" data-testid="button-back-login">
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-4" data-testid="loading-state">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading invite details...</p>
          </div>
        ) : isError || !invite ? (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-error-title">Invite Invalid or Expired</h2>
              <p className="text-muted-foreground" data-testid="text-error-message">
                {(error as any)?.message || "This invite link is no longer valid. Please contact your organisation administrator for a new invitation."}
              </p>
              <Link href="/org/login">
                <Button variant="outline" className="mt-4" data-testid="button-back-login">
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <UserPlus className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl" data-testid="text-page-title">Set Up Your Account</CardTitle>
              <CardDescription>
                Create a password to complete your team account setup
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invite.email}
                    disabled
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={invite.role}
                    disabled
                    className="capitalize"
                    data-testid="input-role"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <PasswordInput
                    id="confirm-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={acceptMutation.isPending}
                  data-testid="button-submit"
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
              </CardContent>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
