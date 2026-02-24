import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PasswordInput } from "@/components/password-input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, MoreVertical, Mail, ArrowLeft } from "lucide-react";
import { loginSchema, type LoginInput } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput & { totpCode?: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to login");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.requires2FA) {
        setLoginEmail(form.getValues("email") || loginEmail);
        setLoginPassword(form.getValues("password") || loginPassword);
        setRequires2FA(true);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/app");
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginInput) => {
    setLoginEmail(data.email);
    setLoginPassword(data.password);
    loginMutation.mutate(data);
  };

  const handleVerifyTotp = () => {
    if (totpCode.length !== 6) return;
    loginMutation.mutate({ email: loginEmail, password: loginPassword, totpCode });
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setTotpCode("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 dark:from-green-950 dark:via-gray-950 dark:to-emerald-950">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-back-login-select">
            <ArrowLeft className="h-5 w-5 text-green-400" />
            <ShieldCheck className="h-9 w-9 text-green-400" />
            <span className="text-2xl font-bold text-white">aok</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="button-menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="mailto:help@aok.care" className="flex items-center gap-2" data-testid="link-contact-us">
                  <Mail className="h-4 w-4" />
                  Contact Us
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 border border-green-500/30 mb-2">
              <ShieldCheck className="h-10 w-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {requires2FA ? "Two-Factor Authentication" : "Welcome Back"}
            </h1>
            <p className="text-green-200/70">
              {requires2FA
                ? "Enter the 6-digit code from your authenticator app"
                : "Sign in to your aok account"}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-6">
            {requires2FA ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleVerifyTotp();
                    }}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400/60 focus:ring-green-400/30"
                    data-testid="input-login-totp"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-12 text-base"
                  disabled={totpCode.length !== 6 || loginMutation.isPending}
                  onClick={handleVerifyTotp}
                  data-testid="button-verify-totp"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 hover:underline mx-auto transition-colors"
                  onClick={handleBackToLogin}
                  data-testid="link-back-to-login"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-green-100/90 font-medium">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              {...field}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400/60 focus:ring-green-400/30 h-11"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-green-100/90 font-medium">Password</FormLabel>
                            <Link
                              href="/forgot-password"
                              className="text-sm text-green-400 hover:text-green-300 hover:underline transition-colors"
                              data-testid="link-forgot-password"
                            >
                              Forgot password?
                            </Link>
                          </div>
                          <FormControl>
                            <PasswordInput
                              placeholder="Enter your password"
                              {...field}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400/60 focus:ring-green-400/30 h-11"
                              data-testid="input-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-12 text-base"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
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
                  </form>
                </Form>

                <div className="mt-6 text-center text-sm text-green-200/50">
                  Don't have an account?{" "}
                  <Link href="/onboarding" className="text-green-400 hover:text-green-300 hover:underline font-medium transition-colors" data-testid="link-register">
                    Sign up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-4">
        <p className="text-center text-xs text-green-200/30">&copy; {new Date().getFullYear()} aok by NaiyaTech</p>
      </footer>
    </div>
  );
}
