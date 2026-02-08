import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Users,
  Building2,
  HardHat,
  CreditCard,
  ExternalLink,
  CheckCircle,
  XCircle,
  Scale,
  Shield,
  ScrollText,
  Clock,
  AlertTriangle,
  Lock,
  KeyRound,
} from "lucide-react";

function DocumentCard({ icon: Icon, title, description, route, color, badges }: {
  icon: typeof FileText;
  title: string;
  description: string;
  route: string;
  color: string;
  badges: string[];
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600" },
    blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" },
    purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600" },
    amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600" },
    indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600" },
    teal: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600" },
    red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600" },
    rose: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600" },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <Card data-testid={`document-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${c.bg}`}>
            <Icon className={`w-6 h-6 ${c.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <Link href={route}>
            <Button variant="outline" size="sm" data-testid={`link-view-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {badges.map((badge) => (
            <Badge key={badge} variant="secondary" className="text-xs">{badge}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Check() {
  return <CheckCircle className="w-5 h-5 text-green-600" />;
}

function Cross() {
  return <XCircle className="w-5 h-5 text-muted-foreground/40" />;
}

export default function AdminLicenceAgreements() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" data-testid="link-back-admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-green-600" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">Licence Agreements</h1>
          </div>
          <Badge variant="outline" className="ml-auto" data-testid="badge-legal">Legal</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

        <Card data-testid="card-deployment-matrix">
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Deployment Matrix</CardTitle>
                <CardDescription>Which legal documents apply to each customer type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-deployment-matrix">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Document</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Individuals</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        <span>Organisations</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <HardHat className="w-4 h-4" />
                        <span>Lone Workers</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        <span>Paid Only</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" data-testid="row-eula">
                    <td className="py-3 pr-4 font-medium">EULA</td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-privacy-policy">
                    <td className="py-3 pr-4 font-medium">Privacy Policy</td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-enterprise-licence">
                    <td className="py-3 pr-4 font-medium">Enterprise Licence</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-dpa">
                    <td className="py-3 pr-4 font-medium">Data Processing Addendum</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-lone-worker-addendum">
                    <td className="py-3 pr-4 font-medium">Lone Worker Addendum</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-sla">
                    <td className="py-3 pr-4 font-medium">SLA</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-ip-ownership">
                    <td className="py-3 pr-4 font-medium">IP Ownership Agreement</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr data-testid="row-nda">
                    <td className="py-3 pr-4 font-medium">NDA</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-individuals">
            <Users className="w-5 h-5 text-green-600" />
            Individual Users
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Individual users must accept the EULA and can access the Privacy Policy. These documents are presented during registration and linked from the site footer.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={ScrollText}
              title="EULA"
              description="End User Licence Agreement for individuals"
              route="/eula"
              color="green"
              badges={["Individuals", "Registration"]}
            />
            <DocumentCard
              icon={Shield}
              title="Privacy Policy"
              description="How we collect, use and protect personal data"
              route="/privacy"
              color="blue"
              badges={["All Users", "GDPR"]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-organisations">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Organisations
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Organisations licensing A-OK for multiple users must accept the Enterprise Licence, Data Processing Addendum, IP Ownership Agreement, and NDA.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={FileText}
              title="Enterprise Licence"
              description="Software licence for organisations with multiple users"
              route="/enterprise-licence"
              color="indigo"
              badges={["Organisations", "Multi-user"]}
            />
            <DocumentCard
              icon={Shield}
              title="Data Processing Addendum"
              description="GDPR data processing agreement"
              route="/data-processing-addendum"
              color="purple"
              badges={["Organisations", "GDPR", "DPA"]}
            />
            <DocumentCard
              icon={KeyRound}
              title="IP Ownership Agreement"
              description="Intellectual property rights and ownership terms"
              route="/ip-ownership"
              color="red"
              badges={["Organisations", "IP Protection"]}
            />
            <DocumentCard
              icon={Lock}
              title="NDA"
              description="Mutual non-disclosure and confidentiality agreement"
              route="/nda"
              color="rose"
              badges={["Organisations", "Confidentiality"]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-lone-workers">
            <HardHat className="w-5 h-5 text-teal-600" />
            Lone Worker Customers
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Organisations using A-OK for lone worker monitoring require the Enterprise Licence, Lone Worker Addendum, SLA, IP Ownership Agreement, and NDA.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DocumentCard
              icon={FileText}
              title="Enterprise Licence"
              description="Base licence for the organisation"
              route="/enterprise-licence"
              color="indigo"
              badges={["Required"]}
            />
            <DocumentCard
              icon={HardHat}
              title="Lone Worker Addendum"
              description="Additional terms for lone worker use"
              route="/lone-worker-addendum"
              color="teal"
              badges={["Safety", "H&S"]}
            />
            <DocumentCard
              icon={Clock}
              title="SLA"
              description="Service level commitments for lone worker"
              route="/sla"
              color="amber"
              badges={["99.9% Uptime"]}
            />
            <DocumentCard
              icon={KeyRound}
              title="IP Ownership Agreement"
              description="IP rights and ownership terms"
              route="/ip-ownership"
              color="red"
              badges={["IP Protection"]}
            />
            <DocumentCard
              icon={Lock}
              title="NDA"
              description="Non-disclosure and confidentiality"
              route="/nda"
              color="rose"
              badges={["Confidentiality"]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-paid">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Paid Tiers Only
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            The SLA applies to paid subscription tiers only. No uptime guarantees are provided on free plans or during free trial periods.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={Clock}
              title="SLA"
              description="Service Level Agreement with 99.9% uptime target"
              route="/sla"
              color="amber"
              badges={["Paid Only", "No Free Plans"]}
            />
          </div>
          <Card className="border-amber-200 dark:border-amber-800 mt-3" data-testid="card-sla-warning">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Important: Never promise uptime on free plans</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The SLA with 99.9% uptime target and service credits only applies to paying customers. Free tier users and users within their 7-day trial period are explicitly excluded from any uptime guarantees or service credit remedies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-commercial">
            <Lock className="w-5 h-5 text-red-600" />
            Commercial &amp; Confidentiality
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            These agreements protect Naiyatech Ltd's intellectual property and confidential information. They apply to organisations and pilot participants accessing the A-OK platform.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={KeyRound}
              title="IP Ownership Agreement"
              description="Intellectual property rights and ownership terms"
              route="/ip-ownership"
              color="red"
              badges={["Organisations", "IP Protection"]}
            />
            <DocumentCard
              icon={Lock}
              title="NDA"
              description="Mutual non-disclosure and confidentiality agreement"
              route="/nda"
              color="rose"
              badges={["Organisations", "Pilots", "Confidentiality"]}
            />
          </div>
        </div>

        <Card data-testid="card-all-documents">
          <CardHeader>
            <CardTitle className="text-lg">All Legal Documents</CardTitle>
            <CardDescription>Quick access to all licence agreements and policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {[
                { title: "End User Licence Agreement (EULA)", route: "/eula", icon: ScrollText },
                { title: "Privacy Policy", route: "/privacy", icon: Shield },
                { title: "Terms and Conditions", route: "/terms", icon: FileText },
                { title: "Enterprise Software Licence", route: "/enterprise-licence", icon: Building2 },
                { title: "Data Processing Addendum (GDPR)", route: "/data-processing-addendum", icon: Shield },
                { title: "Service Level Agreement (SLA)", route: "/sla", icon: Clock },
                { title: "Lone Worker Licence Addendum", route: "/lone-worker-addendum", icon: HardHat },
                { title: "IP Ownership Agreement", route: "/ip-ownership", icon: KeyRound },
                { title: "NDA (Confidentiality)", route: "/nda", icon: Lock },
              ].map((doc) => (
                <Link key={doc.route} href={doc.route}>
                  <div className="flex items-center gap-3 p-3 border rounded-md hover-elevate cursor-pointer" data-testid={`quicklink-${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                    <doc.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">{doc.title}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="py-6 text-center text-xs text-muted-foreground">
          Naiyatech Ltd - Licence Agreements Overview
        </div>
      </div>
    </div>
  );
}
