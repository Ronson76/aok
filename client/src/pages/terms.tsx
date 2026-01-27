import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-green-600" />
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-green-600">aok</span>
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
            <CardTitle className="text-3xl" data-testid="text-terms-title">Terms and Conditions</CardTitle>
            <p className="text-muted-foreground">Last updated: January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to aok ("we," "our," or "us"). These Terms and Conditions govern your use of our personal safety check-in application and related services. By accessing or using aok, you agree to be bound by these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 16 years of age to use aok. By using our service, you represent and warrant that you meet this age requirement. If you are under 18, you confirm that you have obtained consent from a parent or guardian.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                aok is a personal safety check-in application designed to help you stay connected with loved ones. Our service includes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Scheduled check-in reminders at intervals you choose</li>
                <li>Automated alerts to your emergency contacts if you miss a check-in</li>
                <li>Emergency alert functionality with optional GPS location sharing</li>
                <li>Optional wellness features including mood tracking and pet protection profiles</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed">
                By using aok, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Provide accurate and current information during registration</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Ensure your emergency contacts have consented to receive notifications</li>
                <li>Use the service responsibly and not for any unlawful purpose</li>
                <li>Notify us immediately of any unauthorised use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Emergency Contact Consent</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you add emergency contacts, they will receive a confirmation request. Contacts must accept this request within 24 hours to be activated. You are responsible for obtaining verbal consent from your contacts before adding them to aok.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Subscription and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                aok offers subscription-based services with the following terms:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>A 7-day free trial is available for new users</li>
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>You may cancel your subscription at any time through your account settings</li>
                <li>Refunds are handled in accordance with applicable consumer protection laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to provide a reliable service, aok is not a substitute for emergency services. In life-threatening situations, always contact 999 (UK) or your local emergency number directly. We are not liable for any failure to deliver notifications due to network issues, device problems, or other circumstances beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                We process your personal data in accordance with our Privacy Policy and applicable data protection laws, including the UK GDPR. Your data is stored securely and used only for the purposes of providing and improving our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Service Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any aspect of our service at any time. We will provide reasonable notice of significant changes that may affect your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account if you breach these terms or engage in conduct that we determine to be harmful to other users or our service. You may terminate your account at any time by contacting our support team.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms and Conditions are governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms and Conditions, please contact us at support@aok.care.
              </p>
            </section>

            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                By using aok, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
