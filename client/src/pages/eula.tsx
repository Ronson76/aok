import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function EULA() {
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
            <CardTitle className="text-3xl" data-testid="text-eula-title">End User Licence Agreement (EULA)</CardTitle>
            <p className="text-muted-foreground">Company: Naiyatech Ltd</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              This End User Licence Agreement governs use of the A-OK application by individual users. The software is licensed, not sold.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Licence Grant</h2>
              <p className="text-muted-foreground leading-relaxed">
                Naiyatech Ltd grants a non-exclusive, non-transferable licence to use the software. This licence is personal to you and may not be assigned, sublicensed, or otherwise transferred to any third party without the prior written consent of Naiyatech Ltd.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Restrictions</h2>
              <p className="text-muted-foreground leading-relaxed">
                No resale, reverse engineering, or misuse. You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Copy, modify, or distribute the software or any part thereof</li>
                <li>Reverse engineer, decompile, or disassemble the software</li>
                <li>Rent, lease, lend, sell, or sublicense the software</li>
                <li>Use the software for any unlawful or prohibited purpose</li>
                <li>Attempt to circumvent any security features of the software</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Responsibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for your account security. This includes maintaining the confidentiality of your login credentials, ensuring your emergency contact information is accurate and up to date, and promptly notifying us of any unauthorised use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Emergency Recording Feature</h2>
              <p className="text-muted-foreground leading-relaxed">
                The software includes an optional Emergency Recording feature that is licensed under the following additional terms:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>Explicit Opt-In:</strong> The Emergency Recording feature is disabled by default. By enabling it, you explicitly grant the application permission to access your device's camera and microphone during emergency alerts.</li>
                <li><strong>Scope of Use:</strong> Camera and microphone access is activated only when an emergency alert is triggered and the feature has been enabled by you. Recordings are used solely for safety purposes.</li>
                <li><strong>Consent and Permissions:</strong> You acknowledge that enabling this feature constitutes your informed consent for the application to capture audio and video during emergencies. You may revoke this consent at any time by disabling the feature in your settings.</li>
                <li><strong>Data Handling:</strong> All recordings are encrypted, stored securely, and shared only with your designated emergency contacts in accordance with the Privacy Policy.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Fitness Tracking and Activity/Errands Tracker</h2>
              <p className="text-muted-foreground leading-relaxed">
                The software includes optional Fitness Tracking and Activity/Errands Tracker features that are licensed under the following additional terms:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li><strong>GPS Data Collection:</strong> When using Fitness Tracking or the Activity/Errands Tracker, the application collects GPS location data to record your route, distance, and movement. You must grant location permissions on your device for these features to function.</li>
                <li><strong>Activity Types:</strong> The Activity/Errands Tracker supports session-based tracking for everyday activities including walking, shopping, errands, appointments, visiting, commuting, dog walking, and exercise. Each session records duration, GPS points, and activity status.</li>
                <li><strong>Grace Periods:</strong> Activity sessions include a configurable grace period (default 10 minutes). If a session is not completed or extended within the grace period, it may be automatically flagged as overdue and trigger alerts to your designated contacts.</li>
                <li><strong>Not a Medical or Fitness Device:</strong> Fitness Tracking and the Activity/Errands Tracker are informational tools only. They are not medical devices and do not provide medical, health, or fitness advice. You should not rely on these features for any health-related decisions.</li>
                <li><strong>GPS Accuracy:</strong> GPS accuracy depends on your device hardware, environmental conditions, and network availability. Naiyatech Ltd does not guarantee the accuracy of distance, pace, speed, or route data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Feature Availability and Tier Permissions</h2>
              <p className="text-muted-foreground leading-relaxed">
                Access to certain features of the software may be determined by your subscription tier (Essential or Complete Wellbeing) or, for organisation-managed accounts, by feature settings configured by your organisation administrator. Naiyatech Ltd reserves the right to modify, add, or remove features available under each tier at any time with reasonable notice. Feature availability may also be controlled at the organisation level for clients managed through enterprise bundles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                The software is provided "as is" without warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. A-OK is a personal safety support tool and is not a substitute for emergency services. Features such as Call Supervisor rely on third-party telephony services and network availability; Naiyatech Ltd does not guarantee that calls will always connect successfully. Naiyatech Ltd does not guarantee uninterrupted or error-free operation of the software.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Liability is limited to the fees paid in the last 12 months. In no event shall Naiyatech Ltd be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability, even if Naiyatech Ltd has been advised of the possibility of such damages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
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
