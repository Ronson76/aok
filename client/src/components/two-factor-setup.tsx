import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Copy, Loader2 } from "lucide-react";

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  apiPrefix?: string;
}

export function TwoFactorSetup({
  isOpen,
  onClose,
  isEnabled,
  apiPrefix = "/api/auth",
}: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !isEnabled) {
      fetchSetup();
    }
    if (!isOpen) {
      setSecret("");
      setQrCode("");
      setToken("");
      setPassword("");
    }
  }, [isOpen, isEnabled]);

  async function fetchSetup() {
    setSetupLoading(true);
    try {
      const res = await apiRequest("POST", `${apiPrefix}/2fa/setup`);
      const data = await res.json();
      setSecret(data.secret);
      setQrCode(data.qrCode);
    } catch (err: any) {
      toast({
        title: "Failed to load 2FA setup",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleEnable() {
    setLoading(true);
    try {
      await apiRequest("POST", `${apiPrefix}/2fa/verify`, { secret, token });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/me"] });
      toast({ title: "Two-factor authentication enabled" });
      onClose();
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await apiRequest("POST", `${apiPrefix}/2fa/disable`, { password });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/me"] });
      toast({ title: "Two-factor authentication disabled" });
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to disable 2FA",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    toast({ title: "Secret copied to clipboard" });
  }

  if (isEnabled) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your password to disable two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-disable-password"
              />
            </div>
            <Button
              onClick={handleDisable}
              disabled={!password || loading}
              variant="destructive"
              className="w-full"
              data-testid="button-disable-2fa"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the
            verification code below.
          </DialogDescription>
        </DialogHeader>
        {setupLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  className="h-48 w-48"
                  data-testid="img-qr-code"
                />
              </div>
            )}
            {secret && (
              <Card className="p-3">
                <Label className="text-xs text-muted-foreground">
                  Manual entry key
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <code
                    className="flex-1 text-sm font-mono break-all"
                    data-testid="text-secret-key"
                  >
                    {secret}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={copySecret}
                    data-testid="button-copy-secret"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
            <div className="space-y-2">
              <Label htmlFor="totp-code">Verification code</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit code"
                data-testid="input-totp-code"
              />
            </div>
            <Button
              onClick={handleEnable}
              disabled={token.length !== 6 || loading}
              className="w-full"
              data-testid="button-enable-2fa"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
