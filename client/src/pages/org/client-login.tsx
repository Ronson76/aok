import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";

export default function OrganizationClientLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchString = useSearch();
  
  const getRefFromUrl = () => {
    const params = new URLSearchParams(searchString);
    return params.get("ref")?.toUpperCase() || "";
  };
  
  const [referenceCode, setReferenceCode] = useState(getRefFromUrl);
  
  useEffect(() => {
    const refFromUrl = getRefFromUrl();
    if (refFromUrl) {
      setReferenceCode(refFromUrl);
    }
  }, [searchString]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/activate", { referenceCode });
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back",
        description: "You've successfully signed in.",
      });
      setLocation("/app");
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
            <CardTitle className="text-2xl">Client Login</CardTitle>
            <CardDescription>
              Sign in using your reference code
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
                  Enter the 6-digit code sent to you
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
                <Link href="/org/login">
                  <span className="text-primary hover:underline cursor-pointer" data-testid="link-back-login">Back to Login</span>
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      <footer className="py-4 text-center"><p className="text-xs text-muted-foreground">aok Organisation Portal</p></footer>
    </div>
  );
}
