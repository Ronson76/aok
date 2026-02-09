import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/password-input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, CheckCircle, AlertCircle, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const formSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormInput = z.infer<typeof formSchema>;

export default function OrgSetupPassword() {
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const [setupSuccess, setSetupSuccess] = useState(false);

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const setupPasswordMutation = useMutation({
    mutationFn: async (data: FormInput) => {
      const res = await apiRequest("POST", "/api/org/auth/setup-password", {
        password: data.password,
        token,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to set password");
      }
      return res.json();
    },
    onSuccess: () => {
      setSetupSuccess(true);
      setTimeout(() => {
        setLocation("/org/dashboard");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormInput) => {
    setupPasswordMutation.mutate(data);
  };

  if (!token) {
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
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Invalid Link</CardTitle>
              <CardDescription>
                This setup link is invalid or has expired. Please contact your administrator for a new invitation.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <footer className="py-4 text-center"><p className="text-xs text-muted-foreground">aok Organisation Portal</p></footer>
      </div>
    );
  }

  if (setupSuccess) {
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
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Welcome to aok</CardTitle>
              <CardDescription>
                Your password has been set successfully. You're being redirected to your dashboard now...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={() => setLocation("/org/dashboard")}
                data-testid="button-go-dashboard"
              >
                Go to Dashboard
              </Button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Save this site to your desktop for quick access
                </p>
                <p className="text-xs text-muted-foreground">
                  In your browser menu, look for "Add to Home Screen" or "Install App"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <footer className="py-4 text-center"><p className="text-xs text-muted-foreground">aok Organisation Portal</p></footer>
      </div>
    );
  }

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
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Set Up Your Password</CardTitle>
            <CardDescription>
              Welcome to aok. Create a password for your organisation account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="At least 8 characters"
                          {...field}
                          data-testid="input-setup-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Re-enter your password"
                          {...field}
                          data-testid="input-setup-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={setupPasswordMutation.isPending}
                  data-testid="button-setup-submit"
                >
                  {setupPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Set Password & Continue"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <footer className="py-4 text-center"><p className="text-xs text-muted-foreground">aok Organisation Portal</p></footer>
    </div>
  );
}
