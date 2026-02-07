import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft, Building2, User, Users } from "lucide-react";

export default function OrgLoginSelect() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center relative">
          <Link href="/" className="absolute left-4 hover:opacity-80 transition-opacity" data-testid="link-back">
            <ArrowLeft className="h-5 w-5 text-green-600" />
          </Link>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Organisation Portal</h1>
            <p className="text-muted-foreground">Choose how you'd like to sign in</p>
          </div>

          <div className="space-y-4">
            <Link href="/org/client-login">
              <Card className="cursor-pointer hover-elevate transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-500/10 p-3">
                      <User className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">I'm a Client</CardTitle>
                      <CardDescription>
                        Sign in using your email and reference code
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/org/staff-login">
              <Card className="cursor-pointer hover-elevate transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">I'm from an Organisation</CardTitle>
                      <CardDescription>
                        Sign in to manage your organisation's clients
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/org/team-login">
              <Card className="cursor-pointer hover-elevate transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-orange-500/10 p-3">
                      <Users className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">I'm a Team Member</CardTitle>
                      <CardDescription>
                        Sign in to your organisation team account
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Individual user?{" "}
              <Link href="/login">
                <span className="text-primary hover:underline cursor-pointer">Sign in here</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
