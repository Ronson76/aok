import { Link } from "wouter";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Users } from "lucide-react";

export default function OrgLoginSelect() {
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
        </div>
      </div>

      <footer className="py-4 text-center"><p className="text-xs text-muted-foreground">aok Organisation Portal</p></footer>
    </div>
  );
}
