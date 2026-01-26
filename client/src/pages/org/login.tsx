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

export default function OrganizationLogin() {
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
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
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
            <CardTitle className="text-2xl">Organisation Login</CardTitle>
            <CardDescription>
              Sign in a client using their email and reference code
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
                Need an organisation account?{" "}
                <a href="mailto:organisations@aok.care?subject=Organisation%20Account%20Enquiry" className="text-primary hover:underline">
                  Contact us
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      <footer className="border-t py-4 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-semibold">aok</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
