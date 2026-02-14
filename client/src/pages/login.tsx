import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-menu">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href="mailto:support@aok.app" className="flex items-center gap-2" data-testid="link-contact-us">
                <Mail className="h-4 w-4" />
                Contact Us
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="flex flex-col items-center justify-center mb-2 cursor-pointer" data-testid="link-logo-home">
            <ShieldCheck className="h-12 w-12 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
          <CardTitle className="text-2xl">
            {requires2FA ? "Two-Factor Authentication" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {requires2FA
              ? "Enter the 6-digit code from your authenticator app"
              : "Sign in to your aok account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  data-testid="input-login-totp"
                />
              </div>
              <Button
                type="button"
                className="w-full"
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
                className="flex items-center gap-1 text-sm text-primary hover:underline mx-auto"
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
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
                          <FormLabel>Password</FormLabel>
                          <Link 
                            href="/forgot-password" 
                            className="text-sm text-primary hover:underline"
                            data-testid="link-forgot-password"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <PasswordInput
                            placeholder="Enter your password"
                            {...field}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
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

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/onboarding" className="text-primary hover:underline" data-testid="link-register">
                  Sign up
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
