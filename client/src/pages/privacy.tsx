import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function Privacy() {
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
            <CardTitle className="text-3xl" data-testid="text-privacy-title">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: February 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                At aok, we take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our personal safety check-in application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We collect the following types of information:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>Account Information:</strong> Name, email address, mobile number, and date of birth</li>
                <li><strong>Emergency Contact Details:</strong> Names, phone numbers, and email addresses of your designated contacts</li>
                <li><strong>Check-in Data:</strong> Times and dates of your check-ins and any missed check-ins</li>
                <li><strong>Location Data:</strong> GPS coordinates when you trigger an emergency alert (only with your permission)</li>
                <li><strong>Emergency Recording Data:</strong> Audio and video recordings captured via your device's camera and microphone during emergency alerts (only when you have explicitly opted in to the Emergency Recording feature)</li>
                <li><strong>Organisation Data:</strong> Supervisor phone numbers provided by your organisation for the Call Supervisor feature</li>
                <li><strong>Optional Wellness Data:</strong> Mood entries, pet information, and digital documents if you choose to use these features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Provide the aok check-in service and send reminders</li>
                <li>Alert your emergency contacts when you miss a check-in</li>
                <li>Share your location with emergency contacts during emergencies (when enabled)</li>
                <li>Capture and securely store audio/video recordings during emergency alerts to share with your emergency contacts (when Emergency Recording is enabled)</li>
                <li>Connect you with your organisation's supervisor via voice call when you use the Call Supervisor feature</li>
                <li>Process payments and manage your subscription</li>
                <li>Improve our service and develop new features</li>
                <li>Communicate important updates about the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>Emergency Contacts:</strong> When you miss a check-in or trigger an emergency alert, including any emergency recordings if the feature is enabled</li>
                <li><strong>Organisation Supervisors:</strong> Your name is shared with the supervisor when you use the Call Supervisor feature, so they know who is calling</li>
                <li><strong>Service Providers:</strong> Trusted partners who help us deliver our service (e.g., email, SMS, voice calls, and payment providers)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                We never sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Emergency Recording</h2>
              <p className="text-muted-foreground leading-relaxed">
                aok offers an optional Emergency Recording feature that, when explicitly enabled by you, allows the app to activate your device's camera and microphone during an emergency alert. The following applies to this feature:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>Opt-In Only:</strong> Emergency Recording is entirely voluntary. Camera and microphone access is never activated unless you have explicitly enabled this feature in your settings.</li>
                <li><strong>Data Collected:</strong> Audio and video recordings captured during the duration of an emergency alert.</li>
                <li><strong>Encryption and Storage:</strong> All emergency recordings are encrypted in transit and at rest and stored on secure servers with strict access controls.</li>
                <li><strong>Sharing:</strong> Emergency recordings are shared only with your designated emergency contacts and are not accessible to any other parties unless required by law.</li>
                <li><strong>Retention:</strong> Emergency recordings are subject to our standard data retention policies and are automatically deleted after 90 days unless you request earlier deletion or legal obligations require longer retention.</li>
                <li><strong>Your Control:</strong> You may disable Emergency Recording at any time through your account settings, and you may request deletion of any stored recordings by contacting us.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organisational measures to protect your personal data, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure password hashing</li>
                <li>Regular security assessments</li>
                <li>Automatic session timeout after 5 minutes of inactivity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data for as long as your account is active or as needed to provide our services. Check-in history is retained for 12 months. When you close your account, we will delete your data within 30 days, except where we are required by law to retain it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                Under UK GDPR, you have the following rights:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain types of processing</li>
                <li><strong>Restriction:</strong> Request limited processing of your data</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                To exercise any of these rights, please contact us at privacy@aok.care.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies to maintain your session and preferences. We do not use tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                aok is intended for users aged 16 and over. We do not knowingly collect personal data from children under 16. If you believe a child has provided us with personal data, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any significant changes by email or through the app.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                Email: privacy@aok.care<br />
                Data Protection Officer: dpo@aok.care
              </p>
            </section>

            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                By using aok, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
