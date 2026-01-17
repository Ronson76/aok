import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Activate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [referenceCode, setReferenceCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/activate", {
        referenceCode: referenceCode.toUpperCase(),
        email,
        password,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account activated",
        description: "Your account is now active. Please log in to continue.",
      });
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Activation failed",
        description: error.message || "Please check your reference code and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    
    activateMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <ShieldCheck className="h-12 w-12 text-primary mb-2" />
          <h1 className="text-2xl font-bold">aok</h1>
          <p className="text-muted-foreground text-sm">Personal Safety Check-In</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Activate Your Account
            </CardTitle>
            <CardDescription>
              Enter the reference code you received via SMS to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="referenceCode">Reference Code</Label>
                <Input
                  id="referenceCode"
                  placeholder="ABC123"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-xl font-mono tracking-widest uppercase"
                  data-testid="input-reference-code"
                />
                <p className="text-xs text-muted-foreground">
                  The 6-character code sent to your phone
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-activate-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-activate-password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-activate-confirm-password"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={!referenceCode || !email || !password || !confirmPassword || activateMutation.isPending}
                data-testid="button-activate"
              >
                {activateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating...</>
                ) : (
                  "Activate Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
