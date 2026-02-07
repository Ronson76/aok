import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function LoneWorkerAddendum() {
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
            <CardTitle className="text-3xl" data-testid="text-lone-worker-addendum-title">Lone Worker Licence Addendum</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              This addendum applies where A-OK is used for lone or field workers. It supplements the Enterprise Software Licence Agreement and should be read in conjunction with it.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Safety Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                A-OK is a support tool, not an emergency service. While A-OK provides check-in monitoring, GPS tracking, and alert capabilities for lone workers, it does not replace:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Emergency services (999/112)</li>
                <li>Proper lone worker risk assessments</li>
                <li>Physical safety equipment and procedures</li>
                <li>Direct human supervision where required by law</li>
                <li>Compliance with Health and Safety at Work Act 1974</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Connectivity Limitation</h2>
              <p className="text-muted-foreground leading-relaxed">
                Service depends on network availability. A-OK requires an active internet connection (mobile data or Wi-Fi) to function. The following limitations apply:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Check-ins and alerts require active network connectivity</li>
                <li>GPS accuracy varies by device and environmental conditions</li>
                <li>SMS fallback is available but depends on mobile network coverage</li>
                <li>Areas with poor or no signal may result in delayed or missed check-ins</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Employers must consider connectivity limitations when assessing lone worker risks for remote or underground locations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Responsibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                Employer retains duty of care. The organisation using A-OK for lone worker monitoring retains full responsibility for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Conducting appropriate risk assessments for lone working activities</li>
                <li>Implementing suitable safe systems of work</li>
                <li>Providing adequate training on A-OK and emergency procedures</li>
                <li>Maintaining alternative communication methods</li>
                <li>Responding to alerts and escalations in a timely manner</li>
                <li>Compliance with all applicable health and safety legislation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Indemnity</h2>
              <p className="text-muted-foreground leading-relaxed">
                Customer indemnifies Naiyatech Ltd. The Customer agrees to indemnify and hold harmless Naiyatech Ltd against any claims, losses, damages, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>The Customer's failure to implement adequate lone worker procedures</li>
                <li>Reliance on A-OK as a sole means of lone worker protection</li>
                <li>Failure to respond to alerts or escalations</li>
                <li>Any injury or harm to lone workers where A-OK was used outside its intended scope</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                This addendum shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or in connection with this addendum shall be subject to the exclusive jurisdiction of the courts of England and Wales.
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
