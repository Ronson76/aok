import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/activate", {
        referenceCode: referenceCode.toUpperCase(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Activation failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome to aok",
        description: "You're now signed in.",
      });
      setLocation("/app");
    },
    onError: (error: any) => {
      toast({
        title: "Invalid code",
        description: error.message || "Please check your reference code and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (referenceCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter your 6-character reference code.",
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
              Enter Your Code
            </CardTitle>
            <CardDescription>
              Enter the reference code you received via SMS to get started.
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
                  className="text-center text-2xl font-mono tracking-widest uppercase"
                  data-testid="input-reference-code"
                />
                <p className="text-xs text-muted-foreground text-center">
                  The 6-character code sent to your phone
                </p>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={referenceCode.length !== 6 || activateMutation.isPending}
                data-testid="button-activate"
              >
                {activateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
