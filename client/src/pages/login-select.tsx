import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 dark:from-green-950 dark:via-gray-950 dark:to-emerald-950">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home-logo">
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
            <h1 className="text-3xl font-bold text-white">Welcome back</h1>
            <p className="text-green-200/70">Choose how you'd like to sign in</p>
          </div>

          {sessionExpired && (
            <Card className="border-destructive bg-destructive/10 backdrop-blur-sm" data-testid="card-session-expired">
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

          <div className="space-y-3">
            <Link href="/login/individual">
              <button
                className="w-full group relative overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-5 flex items-center justify-between hover:bg-white/10 hover:border-green-400/40 transition-all duration-300"
                data-testid="button-individual-login"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-green-500/20 p-3 group-hover:bg-green-500/30 transition-colors">
                    <User className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white text-lg">Individual</div>
                    <div className="text-sm text-green-200/60">Personal aok account</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-green-400/50 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
              </button>
            </Link>
            
            <Link href="/org/login">
              <button
                className="w-full group relative overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-5 flex items-center justify-between hover:bg-white/10 hover:border-blue-400/40 transition-all duration-300"
                data-testid="button-organisation-login"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-blue-500/20 p-3 group-hover:bg-blue-500/30 transition-colors">
                    <Building2 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white text-lg">Organisation</div>
                    <div className="text-sm text-blue-200/60">Business or care provider</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </button>
            </Link>
          </div>

          <div className="text-center text-sm text-green-200/50">
            Don't have an account?{" "}
            <Link href="/onboarding" className="text-green-400 hover:text-green-300 hover:underline font-medium transition-colors" data-testid="link-register">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-4">
        <p className="text-center text-xs text-green-200/30">&copy; {new Date().getFullYear()} aok by NaiyaTech</p>
      </footer>
    </div>
  );
}
