import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Globe,
  Lock,
  Shield,
  ShieldCheck,
  Users,
  Building2,
  Database,
  Server,
  Smartphone,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  CreditCard,
  TreeDeciduous,
  Brain,
  ArrowDown,
  Layers,
  Monitor,
  Key,
} from "lucide-react";

function LayerDivider({ label, icon: Icon }: { label: string; icon?: typeof Lock }) {
  return (
    <div className="flex items-center gap-3 py-3" data-testid="layer-divider">
      <div className="flex-1 border-t border-dashed border-muted-foreground/40" />
      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 border-t border-dashed border-muted-foreground/40" />
    </div>
  );
}

function ServiceBox({ icon: Icon, label, sublabel }: { icon: typeof Globe; label: string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-md bg-background" data-testid={`service-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground leading-tight">{sublabel}</p>}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="w-5 h-5 text-muted-foreground/60" />
    </div>
  );
}

export default function AdminArchitecture() {
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
            <ShieldCheck className="h-7 w-7 text-green-600" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">aok VPC Architecture</h1>
          </div>
          <Badge variant="outline" className="ml-auto" data-testid="badge-live-system">Live System</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-2">

        {/* Layer 1: Front End / Public Access */}
        <Card data-testid="layer-frontend">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-100 dark:bg-green-900/30">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Front End</CardTitle>
                <CardDescription>Public-facing application layer</CardDescription>
              </div>
              <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">aok.care</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ServiceBox icon={Monitor} label="React SPA" sublabel="Vite + TypeScript" />
              <ServiceBox icon={Smartphone} label="Native Apps" sublabel="iOS + Android" />
              <ServiceBox icon={Layers} label="PWA" sublabel="Service Worker" />
            </div>
          </CardContent>
        </Card>

        <FlowArrow />

        {/* SSL Certificate Layer */}
        <div className="flex items-center gap-3 px-6 py-3 border rounded-md bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid="layer-ssl-cert">
          <Lock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">SSL Certificate</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">TLS 1.3 encryption for all traffic</p>
          </div>
          <Badge variant="outline" className="ml-auto text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">HTTPS</Badge>
        </div>

        <FlowArrow />

        {/* Layer 2: Product Layer - Consumer & Commercial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="layer-products">
          {/* Consumer Product */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Consumer Product</CardTitle>
                  <CardDescription className="text-xs">Individual users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <ServiceBox icon={ShieldCheck} label="Check-in System" sublabel="1-48 hour intervals" />
              <ServiceBox icon={Phone} label="Emergency Alerts" sublabel="Email, SMS, Voice" />
              <ServiceBox icon={MapPin} label="GPS + what3words" sublabel="Location sharing" />
              <ServiceBox icon={Brain} label="Wellbeing AI" sublabel="Mood + Voice chat" />
              <ServiceBox icon={Smartphone} label="Shake to SOS" sublabel="Motion detection" />
              <ServiceBox icon={CreditCard} label="Stripe Billing" sublabel="Subscriptions" />
            </CardContent>
          </Card>

          {/* Commercial Product */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Commercial Product</CardTitle>
                  <CardDescription className="text-xs">Organisations + Bundles</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <ServiceBox icon={Users} label="Client Management" sublabel="Add, pause, archive" />
              <ServiceBox icon={Shield} label="Safeguarding Hub" sublabel="Incidents + case files" />
              <ServiceBox icon={Layers} label="Lone Worker" sublabel="7-phase sessions" />
              <ServiceBox icon={Key} label="Staff Invites" sublabel="Role-based access" />
              <ServiceBox icon={Mail} label="Branded Comms" sublabel="Org notifications" />
              <ServiceBox icon={TreeDeciduous} label="Ecologi Impact" sublabel="Tree planting" />
            </CardContent>
          </Card>
        </div>

        <FlowArrow />

        {/* SSL / Security Layer */}
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" data-testid="layer-security">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-100 dark:bg-red-900/30">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-red-800 dark:text-red-400">SSL / Security Layer</CardTitle>
                <CardDescription>Authentication, authorisation, and session management</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ServiceBox icon={Key} label="Session Auth" sublabel="Secure cookies" />
              <ServiceBox icon={Shield} label="Role-Based Access" sublabel="4 org roles" />
              <ServiceBox icon={Lock} label="Password Hashing" sublabel="bcrypt" />
              <ServiceBox icon={Mail} label="Email Verification" sublabel="Contact confirmation" />
              <ServiceBox icon={MessageSquare} label="SMS Tokens" sublabel="Tokenised check-in" />
              <ServiceBox icon={Shield} label="GDPR Compliance" sublabel="Ephemeral AI chat" />
            </div>
          </CardContent>
        </Card>

        <FlowArrow />

        {/* Layer 4: Organisation Admin */}
        <Card className="border-indigo-200 dark:border-indigo-800" data-testid="layer-admin">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Organisation Admin</CardTitle>
                <CardDescription>Back-office management and oversight</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ServiceBox icon={Users} label="User Management" sublabel="Archive + restore" />
              <ServiceBox icon={Building2} label="Org Oversight" sublabel="Bundle management" />
              <ServiceBox icon={Shield} label="Audit Logging" sublabel="Full trail" />
              <ServiceBox icon={Layers} label="Reports" sublabel="PDF exports" />
              <ServiceBox icon={Key} label="Admin Team" sublabel="Super admin + analyst" />
              <ServiceBox icon={Monitor} label="Dashboard" sublabel="Live stats" />
            </div>
          </CardContent>
        </Card>

        <FlowArrow />

        {/* Layer 5: Database Layer */}
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" data-testid="layer-database">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <Database className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-emerald-800 dark:text-emerald-400">Database Layer</CardTitle>
                <CardDescription>Persistent data storage and management</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ServiceBox icon={Database} label="PostgreSQL" sublabel="Neon-backed" />
              <ServiceBox icon={Layers} label="Drizzle ORM" sublabel="Type-safe queries" />
              <ServiceBox icon={Users} label="Users + Contacts" sublabel="Core data" />
              <ServiceBox icon={ShieldCheck} label="Check-ins" sublabel="History + streaks" />
              <ServiceBox icon={Shield} label="Safeguarding" sublabel="Incidents + cases" />
              <ServiceBox icon={Key} label="Sessions" sublabel="Auth state" />
            </div>
          </CardContent>
        </Card>

        <FlowArrow />

        {/* External Services */}
        <LayerDivider label="External Services" icon={Server} />

        <Card data-testid="layer-external">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                <Server className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">External Services</CardTitle>
                <CardDescription>Third-party integrations connected via the security layer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ServiceBox icon={Mail} label="Resend" sublabel="Email delivery" />
              <ServiceBox icon={Phone} label="Twilio" sublabel="SMS + Voice" />
              <ServiceBox icon={CreditCard} label="Stripe" sublabel="Payments" />
              <ServiceBox icon={MapPin} label="what3words" sublabel="Location" />
              <ServiceBox icon={Brain} label="OpenAI" sublabel="AI + TTS + STT" />
              <ServiceBox icon={TreeDeciduous} label="Ecologi" sublabel="Tree planting" />
            </div>
          </CardContent>
        </Card>

        <div className="py-6 text-center text-xs text-muted-foreground">
          aok VPC Architecture Diagram
        </div>
      </div>
    </div>
  );
}
