import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, User, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/org/login" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-back-org-login">
            <ArrowLeft className="h-5 w-5 text-emerald-400" />
          </Link>
          <Building2 className="h-7 w-7 text-emerald-400" />
          <span className="text-xl font-bold text-white">aok</span>
          <span className="text-xs text-emerald-300 border border-emerald-700 rounded-full px-2 py-0.5">Organisation</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-2">
              <User className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Client Login</h1>
            <p className="text-slate-300/70">Sign in using your reference code</p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="referenceCode" className="text-slate-200/90 font-medium">Reference Code</Label>
                <Input
                  id="referenceCode"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  className="uppercase tracking-widest text-center font-mono text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:ring-emerald-400/30 h-12"
                  autoComplete="off"
                  data-testid="input-org-reference"
                />
                <p className="text-xs text-slate-400/60 text-center">
                  Enter the 6-digit code sent to you
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 text-base"
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
              <p className="text-sm text-center text-slate-400/50">
                <Link href="/org/login">
                  <span className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors" data-testid="link-back-login">Back to Login</span>
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-4">
        <p className="text-center text-xs text-slate-400/30">&copy; {new Date().getFullYear()} aok by NaiyaTech</p>
      </footer>
    </div>
  );
}
