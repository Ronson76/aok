import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function EnterpriseLicence() {
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
            <CardTitle className="text-3xl" data-testid="text-enterprise-licence-title">Enterprise Software Licence Agreement</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              This agreement applies to organisations licensing A-OK for multiple users.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Licence Scope</h2>
              <p className="text-muted-foreground leading-relaxed">
                Licence granted to the organisation. Naiyatech Ltd grants the organisation a non-exclusive, non-transferable licence to use the A-OK software for its authorised users. The licence scope is determined by the number of seats purchased and the specific bundle terms agreed upon. The licence includes access to all organisation features, including client management, safeguarding hub, Call Supervisor, Activity/Errands Tracker, GPS Fitness Tracking, and any optional wellness features enabled for clients.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. User Management</h2>
              <p className="text-muted-foreground leading-relaxed">
                The organisation manages authorised users. The organisation is responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Adding and removing users within their allocated seat count</li>
                <li>Ensuring users comply with this licence agreement</li>
                <li>Managing user access credentials and permissions</li>
                <li>Maintaining accurate records of authorised users</li>
                <li>Providing and maintaining an accurate supervisor phone number for the Call Supervisor feature</li>
                <li>Configuring feature availability for clients through the organisation dashboard feature defaults</li>
                <li>Promptly deactivating access for departing personnel</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Feature Permissions and Tier Control</h2>
              <p className="text-muted-foreground leading-relaxed">
                Feature availability is governed by subscription tier (Tier 1: Essential or Tier 2: Complete Wellbeing) as determined by Naiyatech Ltd. Organisations may further customise which features are enabled or disabled for their clients through the organisation dashboard. Features subject to tier and organisation control include: Check-in System, Shake to Alert, Emergency Alert, GPS Location, Push Notifications, Primary Contact/Carer, SMS Backup, Emergency Recording, Mood and Wellness Tracking, Pet Protection, Important Documents, AI Wellbeing Chat, Fitness Tracking, and Activity/Errands Tracker. Naiyatech Ltd reserves the right to modify tier structures and feature assignments with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Fees and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                As agreed in commercial terms. Payment terms, pricing, and billing cycles are determined by the specific commercial agreement between the organisation and Naiyatech Ltd. All fees are exclusive of applicable taxes unless otherwise stated.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Ownership</h2>
              <p className="text-muted-foreground leading-relaxed">
                Customer retains ownership of data. All data entered into the A-OK platform by the organisation and its users remains the property of the organisation. Naiyatech Ltd acts as a data processor and will handle all data in accordance with the Data Processing Addendum and applicable data protection legislation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                For breach or non-payment. Either party may terminate this agreement:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>With 30 days written notice for convenience</li>
                <li>Immediately upon material breach that remains uncured after 14 days written notice</li>
                <li>Immediately if the other party becomes insolvent or enters administration</li>
                <li>Upon non-payment of fees after 30 days from the due date</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Upon termination, the organisation's data will be made available for export for a period of 30 days, after which it will be securely deleted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Governing Law</h2>
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
