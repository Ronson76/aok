import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function DataProcessingAddendum() {
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
            <CardTitle className="text-3xl" data-testid="text-dpa-title">Data Processing Addendum (GDPR)</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Roles</h2>
              <p className="text-muted-foreground leading-relaxed">
                Customer: Data Controller. Naiyatech Ltd: Data Processor.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                The Customer determines the purposes and means of processing personal data. Naiyatech Ltd processes personal data solely on behalf of the Customer and in accordance with the Customer's documented instructions, unless required to do so by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Processing Scope</h2>
              <p className="text-muted-foreground leading-relaxed">
                Provision of A-OK services. The scope of processing includes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>User account data (names, email addresses, phone numbers)</li>
                <li>Emergency contact information</li>
                <li>Check-in records and scheduling data</li>
                <li>Location data when emergency features are activated</li>
                <li>Optional wellness data (mood entries, pet profiles, digital documents)</li>
                <li>Call Supervisor records (call timestamps, caller identity, supervisor phone number)</li>
                <li>Safeguarding records and case files (for organisation accounts)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Appropriate technical measures in place. Naiyatech Ltd implements and maintains appropriate technical and organisational measures to protect personal data, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Breach Notification</h2>
              <p className="text-muted-foreground leading-relaxed">
                Within 72 hours. In the event of a personal data breach, Naiyatech Ltd shall notify the Customer without undue delay and in any event within 72 hours of becoming aware of the breach. The notification shall include:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>The nature of the personal data breach</li>
                <li>The categories and approximate number of data subjects affected</li>
                <li>The likely consequences of the breach</li>
                <li>The measures taken or proposed to address the breach</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Sub-processors</h2>
              <p className="text-muted-foreground leading-relaxed">
                Naiyatech Ltd engages the following categories of sub-processors to deliver the A-OK service:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Cloud infrastructure providers (hosting and data storage)</li>
                <li>Email delivery services (Resend)</li>
                <li>SMS and voice call services, including Call Supervisor calls (Twilio)</li>
                <li>Payment processing (Stripe)</li>
                <li>AI services (OpenAI) for optional wellbeing features</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                The Customer will be notified of any changes to sub-processors and may object within 14 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Subject Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                Naiyatech Ltd shall assist the Customer in responding to data subject requests, including requests for access, rectification, erasure, data portability, and restriction of processing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                This addendum shall be governed by and construed in accordance with the laws of England and Wales, and is subject to the UK GDPR and Data Protection Act 2018.
              </p>
            </section>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Naiyatech Ltd. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
