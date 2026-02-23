import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ArrowLeft, Lock, Server, Eye, FileCheck,
  Shield, CheckCircle, Database, Globe, Key, UserCheck, ScrollText,
  AlertTriangle, Fingerprint
} from "lucide-react";
import isoBadge from "@/assets/images/iso-27001-badge.png";

export default function Security() {
  const complianceItems = [
    {
      icon: ShieldCheck,
      title: "ISO 27001 Certified Infrastructure",
      description: "aok is built on Google Cloud Platform (GCP), which holds ISO 27001 certification — the international standard for information security management systems (ISMS).",
      status: "certified",
    },
    {
      icon: Shield,
      title: "SOC 2 Type 2 Compliant Hosting",
      description: "Our hosting platform has achieved SOC 2 Type 2 attestation after a rigorous 12-month security audit with zero exceptions, demonstrating ongoing commitment to security best practices.",
      status: "certified",
    },
    {
      icon: FileCheck,
      title: "UK GDPR Compliant",
      description: "aok fully complies with the UK General Data Protection Regulation. Users can export their data, delete their accounts, and manage consent preferences directly from their settings.",
      status: "compliant",
    },
    {
      icon: Lock,
      title: "Cyber Essentials Ready",
      description: "aok is actively pursuing Cyber Essentials certification — the UK government-backed scheme that helps organisations guard against the most common cyber threats.",
      status: "in-progress",
    },
    {
      icon: ScrollText,
      title: "ISO 27001 Roadmap",
      description: "Naiyatech Ltd is working towards full ISO 27001 organisational certification, building on the strong technical controls already in place within aok.",
      status: "in-progress",
    },
  ];

  const securityFeatures = [
    {
      icon: Fingerprint,
      title: "Two-Factor Authentication (2FA)",
      description: "TOTP-based two-factor authentication available for all account types — users, organisations, and administrators.",
    },
    {
      icon: Key,
      title: "Encrypted Passwords",
      description: "All passwords are securely hashed using industry-standard bcrypt. Plain-text passwords are never stored.",
    },
    {
      icon: Database,
      title: "Data Minimisation",
      description: "We only collect and store the minimum personal data necessary to provide our safety services. No case files, no unnecessary profiling.",
    },
    {
      icon: Eye,
      title: "AI Privacy",
      description: "Wellbeing AI conversations are fully ephemeral — they are never stored, logged, or used for training.",
    },
    {
      icon: Server,
      title: "Tamper-Evident Audit Trails",
      description: "All actions are logged with cryptographic hash chains, making any tampering immediately detectable. Full integrity verification available.",
    },
    {
      icon: AlertTriangle,
      title: "Rate Limiting & CSRF Protection",
      description: "Login endpoints are rate-limited to prevent brute-force attacks. All API requests are protected against cross-site request forgery.",
    },
    {
      icon: Globe,
      title: "Service Resilience",
      description: "Critical notifications use retry mechanisms with exponential backoff, circuit breakers, and multi-provider email fallback chains.",
    },
    {
      icon: UserCheck,
      title: "Contact Consent",
      description: "Emergency contacts must actively confirm their consent before receiving any alerts, with full GDPR privacy notices included.",
    },
  ];

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

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img
              src={isoBadge}
              alt="ISO 27001 Certified Infrastructure"
              className="h-32 w-32 object-contain"
              data-testid="img-iso-badge"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4" data-testid="text-security-title">Security & Compliance</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            aok is built on ISO 27001-certified cloud infrastructure with enterprise-grade security controls to keep your data safe.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Certifications & Compliance
          </h2>
          <div className="grid gap-4">
            {complianceItems.map((item) => (
              <Card key={item.title} className="border" data-testid={`card-compliance-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      {item.status === "certified" && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-100">
                          Certified
                        </Badge>
                      )}
                      {item.status === "compliant" && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-100">
                          Compliant
                        </Badge>
                      )}
                      {item.status === "in-progress" && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Lock className="h-6 w-6 text-green-600" />
            Security Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {securityFeatures.map((feature) => (
              <Card key={feature.title} className="border" data-testid={`card-security-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="flex items-start gap-3 pt-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-300">
                <Shield className="h-6 w-6" />
                Data Architecture Principles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>No case-file storage</strong> — aok does not store case files, detailed case notes, or sensitive care records. Only essential safety data is held.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Data minimisation by design</strong> — we collect only what's needed for your safety. Nothing more.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Automatic data retention</strong> — configurable retention policies ensure data isn't held longer than necessary, with expiration warnings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Self-service data rights</strong> — export your data or delete your account at any time from Settings, in full compliance with UK GDPR.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Emergency recordings auto-delete</strong> — encrypted recordings are automatically removed after 90 days.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="text-center mb-12">
          <h2 className="text-2xl font-semibold mb-4">Related Documents</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/privacy">
              <Button variant="outline" size="sm" data-testid="link-security-privacy">Privacy Policy</Button>
            </Link>
            <Link href="/terms">
              <Button variant="outline" size="sm" data-testid="link-security-terms">Terms & Conditions</Button>
            </Link>
            <Link href="/data-processing-addendum">
              <Button variant="outline" size="sm" data-testid="link-security-dpa">Data Processing Addendum</Button>
            </Link>
            <Link href="/eula">
              <Button variant="outline" size="sm" data-testid="link-security-eula">EULA</Button>
            </Link>
            <Link href="/nda">
              <Button variant="outline" size="sm" data-testid="link-security-nda">NDA</Button>
            </Link>
          </div>
        </section>

        <div className="text-center text-sm text-muted-foreground">
          <p>Questions about our security practices? Contact us at <a href="mailto:security@aok.care" className="text-green-600 hover:underline">security@aok.care</a></p>
          <p className="mt-1">Data protection enquiries: <a href="mailto:dpo@aok.care" className="text-green-600 hover:underline">dpo@aok.care</a></p>
        </div>
      </main>
    </div>
  );
}
