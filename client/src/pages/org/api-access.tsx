import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { OrgHelpButton } from "@/components/org-help-center";
import {
  Key, ArrowLeft, Plus, Loader2, Copy, Check, Trash2,
  Shield, Clock, Activity, AlertTriangle, Eye, EyeOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  requestCount: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface CreateKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  expiresAt: string | null;
  apiKey: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: "assurance.overview", label: "Assurance Overview", description: "Real-time compliance summary and control scores" },
  { id: "assurance.heatmap", label: "Service Heatmap", description: "Client risk levels and check-in status" },
  { id: "assurance.oversight", label: "Manager Oversight", description: "Staff login activity and engagement metrics" },
  { id: "assurance.timeline", label: "Incident Timeline", description: "Emergency alert history (90-day window)" },
  { id: "assurance.chronology", label: "Event Chronology", description: "Chronological event feed for audit trails" },
];

export default function OrgApiAccess() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (authUser && (!authUser.orgFeatureApiAccess || (authUser.orgFeatureApiAccessExpiresAt && new Date(authUser.orgFeatureApiAccessExpiresAt) < new Date()))) {
      setLocation("/org/dashboard");
    }
  }, [authUser, setLocation]);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(AVAILABLE_PERMISSIONS.map(p => p.id));
  const [expiryDays, setExpiryDays] = useState<string>("365");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery<ApiKeyData[]>({
    queryKey: ["/api/org/api-keys"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = expiryDays !== "never"
        ? new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString()
        : null;
      const res = await apiRequest("POST", "/api/org/api-keys", {
        name: newKeyName.trim(),
        permissions: selectedPermissions,
        expiresAt,
      });
      return res.json() as Promise<CreateKeyResponse>;
    },
    onSuccess: (data) => {
      setGeneratedKey(data.apiKey);
      setShowCreateDialog(false);
      setShowKeyDialog(true);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/org/api-keys"] });
      toast({ title: "API key created", description: `Key "${data.name}" is ready to use.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create API key", variant: "destructive" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest("DELETE", `/api/org/api-keys/${keyId}`);
    },
    onSuccess: () => {
      setShowRevokeDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/org/api-keys"] });
      toast({ title: "Key revoked", description: "The API key has been permanently deactivated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to revoke API key", variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = apiKeys.filter(k => k.isActive);
  const revokedKeys = apiKeys.filter(k => !k.isActive);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/org/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </Link>
          <div className="flex-1" />
          <OrgHelpButton />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2" data-testid="text-page-title">
              <Key className="h-6 w-6 text-indigo-600" />
              API Access
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid="text-page-description">
              Manage API keys for external GRC platform integration
            </p>
          </div>
          <Button onClick={() => { setShowCreateDialog(true); setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id)); }} data-testid="button-create-key">
            <Plus className="h-4 w-4 mr-2" />
            Create Key
          </Button>
        </div>

        <Card className="mb-6 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200" data-testid="text-api-info-title">External Assurance API</p>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1" data-testid="text-api-info-desc">
                  API keys provide read-only access to your assurance data for integration with third-party GRC, compliance, and monitoring platforms. 
                  All requests are rate-limited to 100/minute and fully audit-logged.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Base URL: /api/v1/assurance/</Badge>
                  <Badge variant="outline" className="text-xs">Auth: X-API-Key header</Badge>
                  <Badge variant="outline" className="text-xs">Rate: 100 req/min</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : activeKeys.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2" data-testid="text-no-keys-title">No API keys yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4" data-testid="text-no-keys-desc">
                Create an API key to allow external platforms to access your assurance data.
              </p>
              <Button onClick={() => { setShowCreateDialog(true); setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id)); }} data-testid="button-create-first-key">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200" data-testid="text-active-keys-heading">
              Active Keys ({activeKeys.length})
            </h2>
            {activeKeys.map(key => (
              <Card key={key.id} data-testid={`card-api-key-${key.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-900 dark:text-white" data-testid={`text-key-name-${key.id}`}>{key.name}</h3>
                        <Badge variant="secondary" className="text-xs font-mono" data-testid={`text-key-prefix-${key.id}`}>{key.keyPrefix}...</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {key.permissions.map(p => (
                          <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {format(new Date(key.createdAt), "dd MMM yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {key.requestCount.toLocaleString()} requests
                        </span>
                        {key.lastUsedAt && (
                          <span>Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}</span>
                        )}
                        {key.expiresAt && (
                          <span className={`flex items-center gap-1 ${new Date(key.expiresAt) < new Date() ? "text-red-500" : ""}`}>
                            <AlertTriangle className="h-3 w-3" />
                            {new Date(key.expiresAt) < new Date() ? "Expired" : `Expires ${format(new Date(key.expiresAt), "dd MMM yyyy")}`}
                          </span>
                        )}
                        {key.createdBy && <span>By {key.createdBy}</span>}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowRevokeDialog(key.id)}
                      data-testid={`button-revoke-key-${key.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {revokedKeys.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-slate-500 dark:text-slate-400" data-testid="text-revoked-keys-heading">
              Revoked Keys ({revokedKeys.length})
            </h2>
            {revokedKeys.map(key => (
              <Card key={key.id} className="opacity-60" data-testid={`card-revoked-key-${key.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-500 dark:text-slate-400 line-through">{key.name}</h3>
                    <Badge variant="destructive" className="text-xs">Revoked</Badge>
                    <Badge variant="secondary" className="text-xs font-mono">{key.keyPrefix}...</Badge>
                    <span className="text-xs text-slate-400 ml-auto">{key.requestCount.toLocaleString()} total requests</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-endpoints-title">Available Endpoints</CardTitle>
            <CardDescription>Read-only endpoints accessible with a valid API key</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { method: "GET", path: "/api/v1/assurance/overview", perm: "assurance.overview", desc: "Compliance summary with control score, SLA %, and open alerts" },
                { method: "GET", path: "/api/v1/assurance/service-heatmap", perm: "assurance.heatmap", desc: "Per-client risk levels based on check-in recency and alerts" },
                { method: "GET", path: "/api/v1/assurance/manager-oversight", perm: "assurance.oversight", desc: "Staff login activity and overdue engagement flags" },
                { method: "GET", path: "/api/v1/assurance/incident-timeline", perm: "assurance.timeline", desc: "90-day emergency incident history with resolution times" },
              ].map(ep => (
                <div key={ep.path} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Badge className="bg-green-600 text-white text-xs mt-0.5 no-default-hover-elevate">{ep.method}</Badge>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">{ep.path}</code>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ep.desc}</p>
                    <Badge variant="outline" className="text-xs mt-1">{ep.perm}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-example-title">Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto" data-testid="code-example">
{`curl -H "X-API-Key: aok_your_key_here" \\
  https://aok.care/api/v1/assurance/overview`}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new key for external platform access. The key will only be shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. BoardEffect Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                data-testid="input-key-name"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <div key={perm.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={selectedPermissions.includes(perm.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions(prev => [...prev, perm.id]);
                        } else {
                          setSelectedPermissions(prev => prev.filter(p => p !== perm.id));
                        }
                      }}
                      data-testid={`checkbox-perm-${perm.id}`}
                    />
                    <div>
                      <label htmlFor={`perm-${perm.id}`} className="text-sm font-medium cursor-pointer">{perm.label}</label>
                      <p className="text-xs text-slate-500">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="expiry">Expiry</Label>
              <select
                id="expiry"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-expiry"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">6 months</option>
                <option value="365">1 year</option>
                <option value="never">Never expires</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button
              onClick={() => createKeyMutation.mutate()}
              disabled={!newKeyName.trim() || selectedPermissions.length === 0 || createKeyMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showKeyDialog} onOpenChange={(open) => { if (!open) { setShowKeyDialog(false); setGeneratedKey(null); setShowKey(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription>
              This key will only be displayed once. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>
          {generatedKey && (
            <div className="space-y-3">
              <div className="relative">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 pr-20 font-mono text-sm break-all" data-testid="text-generated-key">
                  {showKey ? generatedKey : "••••••••••••••••••••••••••••••••••••••••••••••"}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)} data-testid="button-toggle-key-visibility">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedKey)} data-testid="button-copy-key">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Store this key in a secure location. It cannot be retrieved after closing this dialog.</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setShowKeyDialog(false); setGeneratedKey(null); setShowKey(false); }} data-testid="button-close-key-dialog">
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showRevokeDialog} onOpenChange={() => setShowRevokeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              This action is permanent. Any systems using this key will immediately lose access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(null)} data-testid="button-cancel-revoke">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => showRevokeDialog && revokeKeyMutation.mutate(showRevokeDialog)}
              disabled={revokeKeyMutation.isPending}
              data-testid="button-confirm-revoke"
            >
              {revokeKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
