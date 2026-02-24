import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Eye, EyeOff, Building2, ArrowLeft } from "lucide-react";

export default function OrgTeamLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/org-member/login", { email, password });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome back",
        description: "You've successfully signed in to your team account.",
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 mb-2">
              <Users className="h-10 w-10 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Team Member Sign In</h1>
            <p className="text-slate-300/70">Sign in to your organisation team account</p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200/90 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:ring-emerald-400/30 h-11"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200/90 font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:ring-emerald-400/30 h-11 pr-10"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-white/50 hover:text-white/80"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 text-base"
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
              <div className="text-center space-y-2 pt-1">
                <Link href="/org/forgot-password">
                  <span className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors" data-testid="link-forgot-password">Forgot password?</span>
                </Link>
                <p className="text-sm text-slate-400/50">
                  <Link href="/org/login">
                    <span className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors" data-testid="link-back-login">Back to Login</span>
                  </Link>
                </p>
              </div>
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
