import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function IPOwnership() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" data-testid="text-ip-ownership-title">Intellectual Property &amp; Ownership Agreement</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              This agreement governs intellectual property rights between Naiyatech Ltd and the Licensee in relation to the A-OK platform.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Ownership</h2>
              <p className="text-muted-foreground leading-relaxed">
                All Intellectual Property relating to the A-OK platform, including software, workflows, UI/UX, logic, data structures, analytics, reports, trademarks, and branding, is and shall remain the exclusive property of Naiyatech Ltd.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Licence</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Licensee is granted a limited, non-exclusive, non-transferable, revocable licence solely to use A-OK.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. No Assignment</h2>
              <p className="text-muted-foreground leading-relaxed">
                No rights, title, or interest are transferred under this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Feedback &amp; Derivatives</h2>
              <p className="text-muted-foreground leading-relaxed">
                All feedback, suggestions, enhancements, or derivative works provided by the Licensee vest automatically and irrevocably in Naiyatech Ltd without compensation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Restrictions</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Licensee shall not:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Develop competing products</li>
                <li>Disclose technical or commercial details</li>
                <li>Grant access to any third party</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Survival</h2>
              <p className="text-muted-foreground leading-relaxed">
                IP ownership and restriction clauses survive termination indefinitely.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Remedies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Any breach results in immediate termination and legal enforcement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                This agreement is governed by the laws of England and Wales.
              </p>
            </section>

            <div className="pt-6 border-t mt-8">
              <p className="text-xs text-muted-foreground">
                Naiyatech Ltd - Intellectual Property &amp; Ownership Agreement
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
