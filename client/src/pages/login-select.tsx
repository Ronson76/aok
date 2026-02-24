import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShieldCheck, User, Building2, MoreVertical, Mail, ChevronRight, ArrowLeft, AlertTriangle } from "lucide-react";

export default function LoginSelect() {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sessionExpired") === "true") {
      setSessionExpired(true);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home-logo">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-menu">
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
      <div className="w-full max-w-md space-y-4">
        {sessionExpired && (
          <Card className="border-destructive bg-destructive/10" data-testid="card-session-expired">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Session Timed Out</p>
                  <p className="text-xs text-muted-foreground">You were logged out due to inactivity. Please sign in again to continue.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      <Card className="w-full">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Choose how you'd like to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/login/individual">
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 flex items-center justify-between"
              data-testid="button-individual-login"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Individual</div>
                  <div className="text-xs text-muted-foreground">Personal aok account</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
          
          <Link href="/org/login">
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 flex items-center justify-between"
              data-testid="button-organisation-login"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Organisation</div>
                  <div className="text-xs text-muted-foreground">Business or care provider</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/onboarding" className="text-primary hover:underline" data-testid="link-register">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
