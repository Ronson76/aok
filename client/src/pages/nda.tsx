import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function NDA() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" data-testid="text-nda-title">Mutual Non-Disclosure Agreement (NDA)</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd, incorporated in England and Wales</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              This agreement governs disclosure of confidential information relating to the A-OK platform for evaluation, pilot use, licensing, or ongoing commercial use.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Purpose</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Agreement governs disclosure of confidential information relating to the A-OK platform for evaluation, pilot use, licensing, or ongoing commercial use.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Confidential Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Includes all non-public information whether written, verbal, visual, or electronic including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Software, source code concepts, system architecture</li>
                <li>Workflows, safeguarding logic, data models</li>
                <li>Commercial terms, pricing, roadmaps</li>
                <li>Pilot results, user data</li>
                <li>Screenshots, recordings, and documentation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Obligations of Recipient</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Recipient shall:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Keep all Confidential Information strictly confidential</li>
                <li>Not disclose to any third party without prior written consent</li>
                <li>Limit access to employees strictly on a need-to-know basis</li>
                <li>Apply security measures no less protective than its own</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Prohibited Use</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Recipient shall not: reverse engineer, replicate, benchmark, publish, white-label, or disclose any part of A-OK; share pilot outcomes, opinions, or findings with any third party.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Duration</h2>
              <p className="text-muted-foreground leading-relaxed">
                Confidentiality obligations survive for five (5) years following termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Remedies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Breach constitutes irreparable harm. The Company is entitled to injunctive relief in addition to damages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                This agreement is governed by the laws of England and Wales.
              </p>
            </section>

            <div className="pt-6 border-t mt-8">
              <p className="text-xs text-muted-foreground">
                Naiyatech Ltd - Mutual Non-Disclosure Agreement
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
