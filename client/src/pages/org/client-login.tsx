import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, Building2, ArrowLeft } from "lucide-react";

export default function OrganizationClientLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [referenceCode, setReferenceCode] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/org-client-login", { email, referenceCode });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.accountType !== "organization") {
        toast({
          title: "Access Denied",
          description: "This login is for organisations only. Please use the main sign in page.",
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <span className="text-lg font-semibold text-green-600">aok</span>
          </Link>
          <Link href="/org/login">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
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
            <CardTitle className="text-2xl">Client Login</CardTitle>
            <CardDescription>
              Sign in using your email and reference code
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="org@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-org-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceCode">Reference Code</Label>
                <Input
                  id="referenceCode"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  className="uppercase tracking-widest text-center font-mono text-lg"
                  autoComplete="off"
                  data-testid="input-org-reference"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-character code sent to the client
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-org-signin"
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
              <p className="text-sm text-muted-foreground text-center">
                From an organisation?{" "}
                <Link href="/org/staff-login">
                  <span className="text-primary hover:underline cursor-pointer">Staff login</span>
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      <footer className="border-t py-4 px-4">
        <div className="container mx-auto text-center">
          <Link href="/" className="flex items-center justify-center gap-2" data-testid="link-footer-logo-home">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">aok</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
