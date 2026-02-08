import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ShieldCheck, ArrowLeft } from "lucide-react";

export default function EULA() {
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
              <h2 className="text-xl font-semibold mb-3">4. Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                The software is provided "as is" without warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. A-OK is a personal safety support tool and is not a substitute for emergency services. Features such as Call Supervisor rely on third-party telephony services and network availability; Naiyatech Ltd does not guarantee that calls will always connect successfully. Naiyatech Ltd does not guarantee uninterrupted or error-free operation of the software.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Liability is limited to the fees paid in the last 12 months. In no event shall Naiyatech Ltd be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability, even if Naiyatech Ltd has been advised of the possibility of such damages.
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
