import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function SLA() {
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
            <CardTitle className="text-3xl" data-testid="text-sla-title">Service Level Agreement (SLA)</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed font-medium">
              This Service Level Agreement applies to paid subscription tiers only. No uptime guarantees are provided on free plans or during free trial periods.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Target uptime: 99.9% monthly. Uptime is calculated as the percentage of time the A-OK platform is operational and accessible during a calendar month, measured at the application layer. This target excludes scheduled maintenance windows.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Exclusions</h2>
              <p className="text-muted-foreground leading-relaxed">
                Planned maintenance and force majeure. The following are excluded from uptime calculations:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Scheduled maintenance (notified at least 48 hours in advance)</li>
                <li>Force majeure events (natural disasters, government actions, pandemics)</li>
                <li>Third-party service outages affecting alerts, Call Supervisor calls, or AI features (Twilio, Resend, Stripe, OpenAI)</li>
                <li>Issues caused by the Customer's own systems or network</li>
                <li>DDoS attacks or other malicious external activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Remedies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Service credits only. If Naiyatech Ltd fails to meet the 99.9% uptime target in any calendar month, the Customer is entitled to service credits as follows:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>99.0% - 99.9% uptime: 5% service credit</li>
                <li>95.0% - 99.0% uptime: 10% service credit</li>
                <li>Below 95.0% uptime: 25% service credit</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Service credits are applied to future invoices and do not exceed 25% of the monthly fee. Credits must be requested within 30 days of the affected month.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Support Response</h2>
              <p className="text-muted-foreground leading-relaxed">
                Critical issues: 4 business hours. Support response times by severity:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>Critical</strong> (service unavailable): Initial response within 4 business hours</li>
                <li><strong>High</strong> (major feature impaired): Initial response within 8 business hours</li>
                <li><strong>Medium</strong> (minor feature impaired): Initial response within 2 business days</li>
                <li><strong>Low</strong> (general enquiry): Initial response within 5 business days</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Business hours are Monday to Friday, 09:00 - 17:00 GMT, excluding UK bank holidays.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Monitoring and Reporting</h2>
              <p className="text-muted-foreground leading-relaxed">
                Naiyatech Ltd continuously monitors the A-OK platform and will provide monthly uptime reports to enterprise customers upon request.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                This agreement shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or in connection with this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.
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
