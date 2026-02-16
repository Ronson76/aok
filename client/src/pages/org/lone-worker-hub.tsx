import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { OrgHelpButton } from "@/components/org-help-center";
import {
  Users, ArrowLeft, Plus, Loader2, Send, XCircle, Clock, CheckCircle,
  Search, Phone, Mail, ShieldCheck, LogOut, UserPlus, Trash2, Shield,
  Radio, MapPin, AlertTriangle, Siren, Eye, History, Briefcase,
  FileText, ChevronDown, ChevronUp, Upload, Download, FileSpreadsheet,
  CheckCircle2, XOctagon, Video, Edit2, MessageSquare, User, Navigation
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import type { LoneWorkerSession } from "@shared/schema";

interface StaffInvite {
  id: string;
  organizationId: string;
  bundleId: string;
  staffName: string;
  staffPhone: string;
  staffEmail: string | null;
  supervisorName: string | null;
  supervisorPhone: string | null;
  supervisorEmail: string | null;
  inviteCode: string;
  status: "pending" | "accepted" | "revoked";
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

interface StaffStats {
  totalInvites: number;
  pendingInvites: number;
  acceptedInvites: number;
  revokedInvites: number;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  bundles: Array<{ id: string; name: string; seatLimit: number; seatsUsed: number; status: string }>;
}

interface AuditEntry {
  id: string;
  organizationId: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  createdAt: string;
}

type SessionWithUser = LoneWorkerSession & { userName: string; userPhone: string | null };

const JOB_LABELS: Record<string, string> = {
  visit: "Home Visit",
  inspection: "Site Inspection",
  outreach: "Outreach",
  delivery: "Delivery",
  patrol: "Patrol",
  maintenance: "Maintenance",
  other: "Other",
};

function getSessionStatusBadge(status: string) {
  switch (status) {
    case "active": return <Badge className="bg-green-600 text-white">Active</Badge>;
    case "check_in_due": return <Badge className="bg-yellow-600 text-white">Check-in Due</Badge>;
    case "unresponsive": return <Badge className="bg-orange-600 text-white">Unresponsive</Badge>;
    case "panic": return <Badge className="bg-red-600 text-white animate-pulse">PANIC</Badge>;
    case "resolved": return <Badge>Resolved</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function statusPriority(status: string): number {
  switch (status) {
    case "panic": return 0;
    case "unresponsive": return 1;
    case "check_in_due": return 2;
    case "active": return 3;
    default: return 4;
  }
}

function LiveLocationMap({ session }: { session: SessionWithUser }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const lat = session.lastLocationLat ? parseFloat(session.lastLocationLat) : null;
  const lng = session.lastLocationLng ? parseFloat(session.lastLocationLng) : null;
  const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  useEffect(() => {
    if (!hasLocation || !mapContainerRef.current) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;
      const map = L.default.map(mapContainerRef.current!, {
        center: [lat!, lng!],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const statusColor = session.status === "panic" ? "#dc2626" : session.status === "unresponsive" ? "#ea580c" : "#16a34a";
      const icon = L.default.divIcon({
        className: "live-location-marker",
        html: `<div style="position:relative;background:${statusColor};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.3)"><div style="position:absolute;top:-6px;left:-6px;width:28px;height:28px;border-radius:50%;border:2px solid ${statusColor};opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.default.marker([lat!, lng!], { icon }).addTo(map);
      marker.bindPopup(`<b>${session.userName}</b><br/>${session.status.replace(/_/g, " ")}`);
      mapInstanceRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [hasLocation]);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && hasLocation) {
      markerRef.current.setLatLng([lat!, lng!]);
      mapInstanceRef.current.panTo([lat!, lng!], { animate: true });
    }
  }, [lat, lng, hasLocation]);

  useEffect(() => {
    if (!markerRef.current) return;
    import("leaflet").then((L) => {
      if (!markerRef.current) return;
      const statusColor = session.status === "panic" ? "#dc2626" : session.status === "unresponsive" ? "#ea580c" : "#16a34a";
      const icon = L.default.divIcon({
        className: "live-location-marker",
        html: `<div style="position:relative;background:${statusColor};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.3)"><div style="position:absolute;top:-6px;left:-6px;width:28px;height:28px;border-radius:50%;border:2px solid ${statusColor};opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current.setIcon(icon);
      markerRef.current.setPopupContent(`<b>${session.userName}</b><br/>${session.status.replace(/_/g, " ")}`);
    });
  }, [session.status, session.userName]);

  if (!hasLocation) {
    return (
      <div className="mt-3 p-4 rounded border bg-muted/30 text-center" data-testid={`map-no-location-${session.id}`}>
        <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No location data available yet</p>
        <p className="text-xs text-muted-foreground mt-1">Location will appear once the worker's device sends GPS data</p>
      </div>
    );
  }

  const updatedAgo = session.lastLocationAt ? formatDistanceToNow(new Date(session.lastLocationAt), { addSuffix: true }) : null;

  return (
    <div className="mt-3 space-y-2" data-testid={`map-panel-${session.id}`}>
      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      `}</style>
      <div
        ref={mapContainerRef}
        className="w-full rounded border overflow-hidden"
        style={{ height: "250px" }}
        data-testid={`map-container-${session.id}`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5 p-2 rounded border bg-muted/30">
          <Navigation className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-muted-foreground">Coordinates</p>
            <p className="font-mono font-medium">{lat!.toFixed(6)}, {lng!.toFixed(6)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded border bg-muted/30">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">{updatedAgo || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded border bg-muted/30">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-muted-foreground">Open in Maps</p>
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline"
              data-testid={`link-google-maps-${session.id}`}
            >
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function getInviteStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "accepted": return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    case "revoked": return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getAuditActionBadge(action: string, entityType: string) {
  if (entityType === "lone_worker_session") {
    switch (action) {
      case "session_started": return <Badge variant="outline" className="text-xs"><Radio className="h-3 w-3 mr-1" />Shift Started</Badge>;
      case "check_in_ok": return <Badge variant="outline" className="text-xs text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Checked In</Badge>;
      case "check_in_help_needed": return <Badge variant="outline" className="text-xs text-orange-600 border-orange-600"><AlertTriangle className="h-3 w-3 mr-1" />Help Needed</Badge>;
      case "panic_triggered": return <Badge variant="outline" className="text-xs text-red-600 border-red-600"><Siren className="h-3 w-3 mr-1" />Panic</Badge>;
      case "session_resolved": return <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" />Resolved</Badge>;
      default: return <Badge variant="outline" className="text-xs capitalize">{action.replace(/_/g, " ")}</Badge>;
    }
  }
  switch (action) {
    case "created": return <Badge variant="outline" className="text-xs"><Plus className="h-3 w-3 mr-1" />Invited</Badge>;
    case "resent": return <Badge variant="outline" className="text-xs"><Send className="h-3 w-3 mr-1" />Resent</Badge>;
    case "revoked": return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    case "deleted": return <Badge variant="outline" className="text-xs text-red-600 border-red-600"><Trash2 className="h-3 w-3 mr-1" />Deleted</Badge>;
    default: return <Badge variant="outline" className="text-xs capitalize">{action.replace(/_/g, " ")}</Badge>;
  }
}

export default function OrgLoneWorkerHub() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mainTab, setMainTab] = useState("monitor");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffCountryCode, setStaffCountryCode] = useState("+44");
  const [staffEmail, setStaffEmail] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecCountryCode, setEcCountryCode] = useState("+44");
  const [ecEmail, setEcEmail] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [emergencyRecordingEnabled, setEmergencyRecordingEnabled] = useState(false);
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supCountryCode, setSupCountryCode] = useState("+44");
  const [supEmail, setSupEmail] = useState("");
  const [supSmsCode, setSupSmsCode] = useState("");
  const [supSmsSending, setSupSmsSending] = useState(false);
  const [supSmsVerifying, setSupSmsVerifying] = useState(false);
  const [supSmsSent, setSupSmsSent] = useState(false);
  const [supSmsVerified, setSupSmsVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [expandedAuditUsers, setExpandedAuditUsers] = useState<Set<string>>(new Set());
  const [expandedHistoryUsers, setExpandedHistoryUsers] = useState<Set<string>>(new Set());
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingInvite, setEditingInvite] = useState<StaffInvite | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffPhone, setEditStaffPhone] = useState("");
  const [editStaffCountryCode, setEditStaffCountryCode] = useState("+44");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editSupervisorName, setEditSupervisorName] = useState("");
  const [editSupervisorPhone, setEditSupervisorPhone] = useState("");
  const [editSupervisorCountryCode, setEditSupervisorCountryCode] = useState("+44");
  const [editSupervisorEmail, setEditSupervisorEmail] = useState("");
  const [editSupervisorSmsVerified, setEditSupervisorSmsVerified] = useState(false);
  const [editSupervisorSmsCode, setEditSupervisorSmsCode] = useState("");
  const [editSupervisorSmsSending, setEditSupervisorSmsSending] = useState(false);
  const [editSupervisorSmsVerifying, setEditSupervisorSmsVerifying] = useState(false);
  const [editSupervisorSmsSent, setEditSupervisorSmsSent] = useState(false);
  const [expandedLocationSession, setExpandedLocationSession] = useState<string | null>(null);
  const [expandedStaffLocation, setExpandedStaffLocation] = useState<string | null>(null);
  const [cancelEmergencySession, setCancelEmergencySession] = useState<any | null>(null);
  const [cancelPin, setCancelPin] = useState("");
  const [cancelConfirmSpoken, setCancelConfirmSpoken] = useState(false);
  const [cancelPinError, setCancelPinError] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "results">("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBundleId, setImportBundleId] = useState("");
  const [importData, setImportData] = useState<Array<{
    staffName: string;
    staffPhone: string;
    staffEmail: string;
    emergencyContactName: string;
    emergencyContactEmail: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
  }>>([]);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; errors: string[] }>>([]);
  const [importResults, setImportResults] = useState<Array<{ row: number; staffName: string; success: boolean; inviteCode?: string; error?: string }>>([]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutRef = useRef(logout);
  const toastRef = useRef(toast);
  const setLocationRef = useRef(setLocation);

  useEffect(() => {
    logoutRef.current = logout;
    toastRef.current = toast;
    setLocationRef.current = setLocation;
  }, [logout, toast, setLocation]);

  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      toastRef.current({ title: "Session expired", description: "You have been logged out due to inactivity.", variant: "destructive" });
      try {
        await logoutRef.current();
      } catch (e) {
        // Session may already be expired on server - that's fine
      }
      queryClient.clear();
      window.location.href = "/";
    }, 15 * 60 * 1000);
  }, []);

  useEffect(() => {
    resetInactivityTimer();
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetInactivityTimer]);

  const handleLogout = async () => {
    try {
      await fetch("/api/org-member/logout", { method: "POST", credentials: "include" });
    } catch (e) {}
    try {
      await logout();
    } catch (e) {}
    queryClient.clear();
    window.location.href = "/";
  };

  const { data: stats, isLoading: statsLoading } = useQuery<StaffStats>({
    queryKey: ["/api/org/staff/stats"],
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<StaffInvite[]>({
    queryKey: ["/api/org/staff/invites"],
  });

  const { data: auditTrail } = useQuery<AuditEntry[]>({
    queryKey: ["/api/org/staff/audit-trail"],
  });

  const activeSessionsQuery = useQuery<SessionWithUser[]>({
    queryKey: ["/api/org/lone-worker/active"],
    refetchInterval: 10000,
  });

  const sessionHistoryQuery = useQuery<(LoneWorkerSession & { userName: string })[]>({
    queryKey: ["/api/org/lone-worker/history"],
  });

  const formatFullPhone = (countryCode: string, phone: string) => {
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digits}`;
  };

  const parsePhoneForForm = (fullPhone: string) => {
    const codes = ["+353", "+44", "+49", "+33", "+1"];
    for (const code of codes) {
      if (fullPhone.startsWith(code)) {
        return { countryCode: code, phone: fullPhone.slice(code.length) };
      }
    }
    return { countryCode: "+44", phone: fullPhone.replace(/^\+?\d{1,3}/, "") };
  };

  const createInviteMutation = useMutation({
    mutationFn: async (data: { staffName: string; staffPhone: string; staffEmail: string; bundleId: string; emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactEmail?: string; emergencyContactRelationship?: string; emergencyRecordingEnabled?: boolean; supervisorName?: string; supervisorPhone?: string; supervisorEmail?: string }) => {
      const res = await apiRequest("POST", "/api/org/staff/invite", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowInviteDialog(false);
      resetInviteForm();
      toast({
        title: "Invite sent",
        description: data.smsSent
          ? "SMS sent with invite code."
          : "Invite created but SMS delivery failed. You can resend it later.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await apiRequest("POST", `/api/org/staff/invite/${inviteId}/revoke`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      toast({ title: "Invite revoked" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await apiRequest("DELETE", `/api/org/staff/invite/${inviteId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowDeleteConfirm(null);
      toast({ title: "Invite deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const supervisorCancelMutation = useMutation({
    mutationFn: async (data: { sessionId: string; cancellationPin: string; confirmSpoken: boolean }) => {
      const res = await apiRequest("POST", `/api/org/lone-worker/${data.sessionId}/supervisor-cancel`, {
        cancellationPin: data.cancellationPin,
        confirmSpoken: data.confirmSpoken,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel emergency");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setCancelEmergencySession(null);
      setCancelPin("");
      setCancelConfirmSpoken(false);
      setCancelPinError("");
      toast({ title: "Emergency cancelled", description: "The session has been resolved as safe." });
    },
    onError: (error: Error) => {
      setCancelPinError(error.message);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (data: { inviteId: string; staffName: string; staffPhone: string; staffEmail: string }) => {
      const res = await apiRequest("POST", `/api/org/staff/invite/${data.inviteId}/resend`, {
        staffName: data.staffName,
        staffPhone: data.staffPhone,
        staffEmail: data.staffEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowInviteDialog(false);
      setResendingInviteId(null);
      resetInviteForm();
      toast({ title: "Invite resent", description: "The invite SMS has been resent with updated details." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetInviteForm = () => {
    setStaffName("");
    setStaffPhone("");
    setStaffCountryCode("+44");
    setStaffEmail("");
    setSelectedBundleId("");
    setEcName("");
    setEcPhone("");
    setEcCountryCode("+44");
    setEcEmail("");
    setEcRelationship("");
    setEmergencyRecordingEnabled(false);
    setSupName("");
    setSupPhone("");
    setSupCountryCode("+44");
    setSupEmail("");
    setSupSmsCode("");
    setSupSmsSending(false);
    setSupSmsVerifying(false);
    setSupSmsSent(false);
    setSupSmsVerified(false);
    setResendingInviteId(null);
  };

  const isValidPhoneDigits = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const openEditDialog = (invite: StaffInvite) => {
    setEditingInvite(invite);
    setEditStaffName(invite.staffName);
    const staffParsed = parsePhoneForForm(invite.staffPhone || "");
    setEditStaffPhone(staffParsed.phone);
    setEditStaffCountryCode(staffParsed.countryCode);
    setEditStaffEmail(invite.staffEmail || "");
    setEditSupervisorName(invite.supervisorName || "");
    const supParsed = parsePhoneForForm(invite.supervisorPhone || "");
    setEditSupervisorPhone(supParsed.phone);
    setEditSupervisorCountryCode(supParsed.countryCode);
    setEditSupervisorEmail(invite.supervisorEmail || "");
    setEditSupervisorSmsVerified(false);
    setEditSupervisorSmsCode("");
    setEditSupervisorSmsSent(false);
    setShowEditDialog(true);
  };

  const updateInviteDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!editingInvite) throw new Error("No invite selected");
      const fullStaffPhone = editStaffPhone ? formatFullPhone(editStaffCountryCode, editStaffPhone) : editingInvite.staffPhone;
      const fullSupervisorPhone = editSupervisorPhone ? formatFullPhone(editSupervisorCountryCode, editSupervisorPhone) : "";
      const res = await apiRequest("PATCH", `/api/org/staff/invite/${editingInvite.id}/details`, {
        staffName: editStaffName,
        staffPhone: fullStaffPhone,
        staffEmail: editStaffEmail,
        supervisorName: editSupervisorName || null,
        supervisorPhone: fullSupervisorPhone || null,
        supervisorEmail: editSupervisorEmail || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setShowEditDialog(false);
      setEditingInvite(null);
      toast({ title: "Details updated", description: "Staff member details have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const importStaffMutation = useMutation({
    mutationFn: async ({ staff, bundleId }: { staff: typeof importData; bundleId: string }) => {
      const res = await apiRequest("POST", "/api/org/staff/bulk-import", { staff, bundleId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/staff/audit-trail"] });
      setImportResults(data.results || []);
      setImportStep("results");
      toast({
        title: "Import complete",
        description: `${data.successCount} of ${data.totalProcessed} staff imported successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      setImportStep("preview");
    },
  });

  const resetImportForm = () => {
    setImportFile(null);
    setImportData([]);
    setImportErrors([]);
    setImportResults([]);
    setImportStep("upload");
    setImportBundleId("");
  };

  const handleImportFileUpload = async (file: File) => {
    setImportFile(file);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast({ title: "Empty spreadsheet", description: "The spreadsheet contains no data rows.", variant: "destructive" });
        return;
      }

      const parsedStaff: typeof importData = [];
      const errors: typeof importErrors = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowErrors: string[] = [];

        const staffName = String(row["Staff Name"] || row["staff_name"] || row["Name"] || row["name"] || "").trim();
        const staffPhone = String(row["Mobile Number"] || row["staff_phone"] || row["Phone"] || row["phone"] || row["Mobile"] || row["mobile"] || "").trim();
        const staffEmail = String(row["Email"] || row["staff_email"] || row["email"] || "").trim();
        const ecName = String(row["Emergency Contact Name"] || row["ec_name"] || row["Emergency Name"] || "").trim();
        const ecEmail = String(row["Emergency Contact Email"] || row["ec_email"] || row["Emergency Email"] || "").trim();
        const ecPhone = String(row["Emergency Contact Phone"] || row["ec_phone"] || row["Emergency Phone"] || "").trim();
        const ecRelationship = String(row["Emergency Contact Relationship"] || row["ec_relationship"] || row["Relationship"] || "").trim();

        if (!staffName) rowErrors.push("Staff name is required");
        if (!staffPhone) rowErrors.push("Mobile number is required");
        else if (staffPhone.replace(/\D/g, "").length < 10) rowErrors.push("Mobile number must be at least 10 digits");
        if (!staffEmail) rowErrors.push("Email is required");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) rowErrors.push("Invalid email address");
        if (!ecName) rowErrors.push("Emergency contact name is required");
        if (!ecEmail) rowErrors.push("Emergency contact email is required");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ecEmail)) rowErrors.push("Invalid emergency contact email");

        if (rowErrors.length > 0) {
          errors.push({ row: i + 2, errors: rowErrors });
        }

        parsedStaff.push({
          staffName,
          staffPhone: staffPhone.replace(/\D/g, "").length >= 10 ? staffPhone : "",
          staffEmail,
          emergencyContactName: ecName,
          emergencyContactEmail: ecEmail,
          emergencyContactPhone: ecPhone,
          emergencyContactRelationship: ecRelationship,
        });
      }

      setImportData(parsedStaff);
      setImportErrors(errors);
      setImportStep("preview");
    } catch (err: any) {
      toast({ title: "Failed to read file", description: err.message || "Please check the file format.", variant: "destructive" });
    }
  };

  const downloadStaffTemplate = () => {
    import("xlsx").then((XLSX) => {
      const templateData = [
        {
          "Staff Name": "Jane Smith",
          "Mobile Number": "+447700900123",
          "Email": "jane@example.com",
          "Emergency Contact Name": "John Smith",
          "Emergency Contact Email": "john@example.com",
          "Emergency Contact Phone": "+447700900456",
          "Emergency Contact Relationship": "Partner",
        },
        {
          "Staff Name": "Bob Jones",
          "Mobile Number": "+447700900789",
          "Email": "bob@example.com",
          "Emergency Contact Name": "Alice Jones",
          "Emergency Contact Email": "alice@example.com",
          "Emergency Contact Phone": "+447700900012",
          "Emergency Contact Relationship": "Colleague",
        },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws["!cols"] = [
        { wch: 20 }, { wch: 18 }, { wch: 25 },
        { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Staff");
      XLSX.writeFile(wb, "aok-staff-import-template.xlsx");
    });
  };

  const openResendDialog = (invite: StaffInvite) => {
    const parsed = parsePhoneForForm(invite.staffPhone);
    setStaffName(invite.staffName);
    setStaffPhone(parsed.phone);
    setStaffCountryCode(parsed.countryCode);
    setStaffEmail(invite.staffEmail || "");
    setSelectedBundleId(invite.bundleId);
    setResendingInviteId(invite.id);
    setShowInviteDialog(true);
  };

  const handleSendSupSms = async () => {
    if (!supPhone.trim()) {
      toast({ title: "Missing phone", description: "Please enter the supervisor's phone number first.", variant: "destructive" });
      return;
    }
    const fullPhone = formatFullPhone(supCountryCode, supPhone);
    setSupSmsSending(true);
    try {
      const res = await fetch("/api/org/supervisor/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)?.[1] || "" },
        credentials: "include",
        body: JSON.stringify({ phone: fullPhone, supervisorName: supName }),
      });
      const data = await res.json();
      if (data.success) {
        setSupSmsSent(true);
        toast({ title: "Code sent", description: "A verification code has been sent to the supervisor's phone." });
      } else {
        toast({ title: "Failed", description: data.error || "Could not send verification code.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send verification SMS.", variant: "destructive" });
    } finally {
      setSupSmsSending(false);
    }
  };

  const handleVerifySupSms = async () => {
    if (!supSmsCode.trim()) return;
    const fullPhone = formatFullPhone(supCountryCode, supPhone);
    setSupSmsVerifying(true);
    try {
      const res = await fetch("/api/org/supervisor/verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)?.[1] || "" },
        credentials: "include",
        body: JSON.stringify({ phone: fullPhone, code: supSmsCode }),
      });
      const data = await res.json();
      if (data.verified) {
        setSupSmsVerified(true);
        toast({ title: "Verified", description: "Supervisor phone number confirmed." });
      } else {
        toast({ title: "Not verified", description: data.error || "Incorrect code.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to verify code.", variant: "destructive" });
    } finally {
      setSupSmsVerifying(false);
    }
  };

  const handleSubmitInvite = () => {
    if (!staffName.trim() || !staffPhone.trim() || !staffEmail.trim()) {
      toast({ title: "Missing fields", description: "Please fill in name, mobile number, and email.", variant: "destructive" });
      return;
    }
    if (!ecName.trim() || !ecPhone.trim() || !ecEmail.trim() || !ecRelationship.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all emergency contact details including email.", variant: "destructive" });
      return;
    }
    if (!selectedBundleId && !resendingInviteId) {
      toast({ title: "Missing fields", description: "Please select a bundle.", variant: "destructive" });
      return;
    }
    if (supPhone.trim() && !supSmsVerified) {
      toast({ title: "Verification required", description: "Please verify the supervisor's phone number before sending the invite.", variant: "destructive" });
      return;
    }
    const fullPhone = formatFullPhone(staffCountryCode, staffPhone);
    const fullEcPhone = formatFullPhone(ecCountryCode, ecPhone);
    const fullSupPhone = supPhone.trim() ? formatFullPhone(supCountryCode, supPhone) : "";
    if (resendingInviteId) {
      resendMutation.mutate({ inviteId: resendingInviteId, staffName: staffName.trim(), staffPhone: fullPhone, staffEmail: staffEmail.trim() });
    } else {
      createInviteMutation.mutate({
        staffName: staffName.trim(),
        staffPhone: fullPhone,
        staffEmail: staffEmail.trim(),
        bundleId: selectedBundleId,
        emergencyContactName: ecName.trim(),
        emergencyContactPhone: fullEcPhone,
        emergencyContactEmail: ecEmail.trim(),
        emergencyContactRelationship: ecRelationship.trim(),
        emergencyRecordingEnabled,
        supervisorName: supName.trim(),
        supervisorPhone: fullSupPhone,
        supervisorEmail: supEmail.trim(),
      });
    }
  };

  const filteredInvites = invites?.filter(invite => {
    const matchesSearch = !searchQuery ||
      invite.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.staffPhone.includes(searchQuery) ||
      (invite.staffEmail && invite.staffEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = inviteFilter === "all" || invite.status === inviteFilter;
    return matchesSearch && matchesTab;
  }) || [];

  const filteredAudit = (auditTrail || []).filter(entry => {
    if (auditFilter === "all") return true;
    if (auditFilter === "lone_worker") return entry.entityType === "lone_worker_session";
    if (auditFilter === "invites") return entry.entityType === "staff_invite";
    return true;
  });

  const auditGroupedByUser = (() => {
    const groups: Record<string, AuditEntry[]> = {};
    for (const entry of filteredAudit) {
      const name = entry.newData?.staffName || entry.newData?.userName || entry.userEmail;
      if (!groups[name]) groups[name] = [];
      groups[name].push(entry);
    }
    return Object.entries(groups).sort((a, b) => {
      const latestA = new Date(a[1][0].createdAt).getTime();
      const latestB = new Date(b[1][0].createdAt).getTime();
      return latestB - latestA;
    });
  })();

  const historyGroupedByUser = (() => {
    const resolved = (sessionHistoryQuery.data || []).filter((s: any) => s.status === "resolved");
    const groups: Record<string, typeof resolved> = {};
    for (const s of resolved) {
      const name = (s as any).userName || "Unknown";
      if (!groups[name]) groups[name] = [];
      groups[name].push(s);
    }
    return Object.entries(groups).sort((a, b) => {
      const latestA = a[1][0]?.resolvedAt ? new Date(String(a[1][0].resolvedAt)).getTime() : 0;
      const latestB = b[1][0]?.resolvedAt ? new Date(String(b[1][0].resolvedAt)).getTime() : 0;
      return latestB - latestA;
    });
  })();

  const toggleAuditUser = (name: string) => {
    setExpandedAuditUsers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleHistoryUser = (name: string) => {
    setExpandedHistoryUsers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const activeSessions = (activeSessionsQuery.data || []).sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
  const panicCount = activeSessions.filter(s => s.status === "panic").length;
  const unresponsiveCount = activeSessions.filter(s => s.status === "unresponsive").length;
  const activeCount = activeSessions.filter(s => s.status === "active" || s.status === "check_in_due").length;

  const isMutating = createInviteMutation.isPending || resendMutation.isPending || importStaffMutation.isPending;
  const isLoading = statsLoading || invitesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            data-testid="link-home-logo"
            onClick={async () => { await logout(); setLocation("/"); }}
          >
            <ShieldCheck className="h-9 w-9 text-green-600" />
            <span className="text-2xl font-bold text-green-600">aok</span>
          </div>
          <div className="flex items-center gap-2">
            <OrgHelpButton />
            <Button variant="outline" onClick={handleLogout} data-testid="button-hub-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/org/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-hub-title">
                <Shield className="h-6 w-6" /> Lone Worker Hub
              </h1>
              <p className="text-muted-foreground">Monitor active shifts, manage staff, and view audit trail</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setShowInviteDialog(true)}
              disabled={!stats?.availableSeats || stats.availableSeats <= 0}
              data-testid="button-invite-staff"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Staff
            </Button>
            <Button
              variant="outline"
              onClick={() => { resetImportForm(); setShowImportDialog(true); }}
              disabled={!stats?.availableSeats || stats.availableSeats <= 0}
              data-testid="button-import-staff"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Staff
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <Card className={panicCount > 0 ? "border-red-600 border-2" : ""}>
            <CardContent className="py-3 text-center">
              <p className={`text-2xl font-bold ${panicCount > 0 ? "text-red-600 animate-pulse" : "text-red-600"}`} data-testid="text-panic-count">{panicCount}</p>
              <p className="text-xs text-muted-foreground">Panic</p>
            </CardContent>
          </Card>
          <Card className={unresponsiveCount > 0 ? "border-orange-500" : ""}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-orange-500" data-testid="text-unresponsive-count">{unresponsiveCount}</p>
              <p className="text-xs text-muted-foreground">Unresponsive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-green-600" data-testid="text-active-count">{activeCount}</p>
              <p className="text-xs text-muted-foreground">On Shift</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold" data-testid="text-accepted-staff">{stats?.acceptedInvites || 0}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold" data-testid="text-pending-invites">{stats?.pendingInvites || 0}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold" data-testid="text-seats-available">{stats?.availableSeats || 0}</p>
              <p className="text-xs text-muted-foreground">Seats Free</p>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="monitor" data-testid="tab-monitor">
              <Radio className="h-4 w-4 mr-1" /> Live Monitor
              {panicCount > 0 && <span className="ml-1 w-2 h-2 bg-red-600 rounded-full animate-pulse inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff">
              <Users className="h-4 w-4 mr-1" /> Staff
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <FileText className="h-4 w-4 mr-1" /> Audit Trail
            </TabsTrigger>
          </TabsList>

          {/* ========== LIVE MONITOR TAB ========== */}
          <TabsContent value="monitor" className="space-y-4">
            {activeSessionsQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : activeSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active lone worker sessions</p>
                  <p className="text-sm text-muted-foreground">Staff sessions will appear here when they start a shift</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((s) => (
                  <Card
                    key={s.id}
                    data-testid={`card-session-${s.id}`}
                    className={s.status === "panic" ? "border-red-600 border-2" : s.status === "unresponsive" ? "border-orange-500 border-2" : ""}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                        <div>
                          <p className="font-medium" data-testid={`text-user-${s.id}`}>{s.userName}</p>
                          <p className="text-sm text-muted-foreground">{JOB_LABELS[s.jobType] || s.jobType}</p>
                          {s.jobDescription && <p className="text-xs text-muted-foreground mt-1">{s.jobDescription}</p>}
                        </div>
                        {getSessionStatusBadge(s.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Started: {s.startedAt ? format(new Date(s.startedAt), "HH:mm") : "—"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Radio className="w-3 h-3" /> Interval: {s.checkInIntervalMins}m
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Last: {s.lastCheckInAt ? formatDistanceToNow(new Date(s.lastCheckInAt), { addSuffix: true }) : "—"}
                        </div>
                        {s.userPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${s.userPhone}`} className="text-primary underline">{s.userPhone}</a>
                          </div>
                        )}
                      </div>
                      {s.status === "panic" && s.panicTriggeredAt && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-700 dark:text-red-300 flex items-center gap-2 flex-wrap">
                          <Siren className="w-4 h-4 flex-shrink-0" />
                          <span>Panic triggered {formatDistanceToNow(new Date(s.panicTriggeredAt), { addSuffix: true })}</span>
                          {s.lastLocationLat && s.lastLocationLng && (
                            <a
                              href={`https://maps.google.com/?q=${s.lastLocationLat},${s.lastLocationLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto underline flex items-center gap-1"
                              data-testid={`link-location-${s.id}`}
                            >
                              <MapPin className="w-3 h-3" /> View Location
                            </a>
                          )}
                        </div>
                      )}
                      {(s.status === "unresponsive" || s.status === "panic") && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded text-sm text-orange-700 dark:text-orange-300 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{s.status === "panic" ? "Panic triggered" : "Missed check-in — staff member unresponsive"}</span>
                            {s.lastLocationLat && s.lastLocationLng && (
                              <a
                                href={`https://maps.google.com/?q=${s.lastLocationLat},${s.lastLocationLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto underline flex items-center gap-1"
                              >
                                <MapPin className="w-3 h-3" /> Last Known Location
                              </a>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-400 text-orange-700 dark:text-orange-300"
                            onClick={() => {
                              setCancelEmergencySession(s);
                              setCancelPin("");
                              setCancelConfirmSpoken(false);
                              setCancelPinError("");
                            }}
                            data-testid={`button-cancel-emergency-${s.id}`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                            Cancel Emergency
                          </Button>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant={expandedLocationSession === s.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setExpandedLocationSession(expandedLocationSession === s.id ? null : s.id)}
                          data-testid={`button-location-${s.id}`}
                        >
                          <MapPin className="w-3.5 h-3.5 mr-1.5" />
                          {expandedLocationSession === s.id ? "Hide Location" : "Location"}
                        </Button>
                        {s.lastLocationLat && s.lastLocationLng && s.lastLocationAt && (
                          <span className="text-xs text-muted-foreground">
                            Updated {formatDistanceToNow(new Date(s.lastLocationAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {expandedLocationSession === s.id && (
                        <LiveLocationMap session={s} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {historyGroupedByUser.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground">Recently Resolved</h3>
                {historyGroupedByUser.map(([userName, sessions]) => (
                  <Card key={userName} className="opacity-75 overflow-visible">
                    <CardContent className="py-0">
                      <button
                        onClick={() => toggleHistoryUser(userName)}
                        className="w-full py-3 flex items-center justify-between gap-2 text-left"
                        data-testid={`button-history-user-${userName.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{userName}</span>
                          <Badge variant="secondary">{sessions.length}</Badge>
                        </div>
                        {expandedHistoryUsers.has(userName) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedHistoryUsers.has(userName) && (
                        <div className="space-y-2 pb-3 border-t pt-3">
                          {sessions.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between flex-wrap gap-2 p-2 rounded border text-sm">
                              <div>
                                <p className="text-sm">{JOB_LABELS[s.jobType] || s.jobType}</p>
                                {s.jobDescription && <p className="text-xs text-muted-foreground">{s.jobDescription}</p>}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{s.resolvedAt ? format(new Date(s.resolvedAt), "dd/MM/yyyy HH:mm") : "—"}</p>
                                {s.outcome && <p className="capitalize">{s.outcome.replace(/_/g, " ")}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== STAFF TAB ========== */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>Staff Members</CardTitle>
                  <CardDescription>
                    {invites && invites.length > 0
                      ? `${filteredInvites.length} of ${invites.length} staff invitations`
                      : "No staff invitations yet"}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-staff"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={inviteFilter} onValueChange={setInviteFilter}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                    <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted" data-testid="tab-accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="revoked" data-testid="tab-revoked">Revoked</TabsTrigger>
                  </TabsList>

                  <div className="space-y-3">
                    {filteredInvites.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No invitations match your search." : "No invitations in this category."}
                      </div>
                    ) : (
                      filteredInvites.map((invite) => {
                        const staffSession = invite.status === "accepted" && invite.acceptedByUserId
                          ? activeSessions.find(s => s.userId === invite.acceptedByUserId)
                          : null;
                        return (
                        <Card key={invite.id} className="overflow-visible" data-testid={`card-invite-${invite.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium" data-testid={`text-staff-name-${invite.id}`}>{invite.staffName}</span>
                                  {getInviteStatusBadge(invite.status)}
                                  {staffSession && (
                                    <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-400 dark:border-green-700">
                                      <Radio className="h-3 w-3 mr-1" /> On Shift
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{invite.staffPhone}</span>
                                  {invite.staffEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{invite.staffEmail}</span>}
                                </div>
                                {invite.supervisorName && (
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> Supervisor: {invite.supervisorName}</span>
                                    {invite.supervisorPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{invite.supervisorPhone}</span>}
                                    {invite.supervisorEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{invite.supervisorEmail}</span>}
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                  <span>Sent: {format(new Date(invite.createdAt), "dd/MM/yyyy HH:mm")}</span>
                                  {invite.acceptedAt && <span>Accepted: {format(new Date(invite.acceptedAt), "dd/MM/yyyy HH:mm")}</span>}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {staffSession && (
                                  <Button
                                    variant={expandedStaffLocation === invite.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setExpandedStaffLocation(expandedStaffLocation === invite.id ? null : invite.id)}
                                    data-testid={`button-staff-location-${invite.id}`}
                                  >
                                    <MapPin className="h-3 w-3 mr-1" /> Location
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(invite)} data-testid={`button-edit-${invite.id}`}>
                                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                {invite.status === "pending" && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openResendDialog(invite)} data-testid={`button-resend-${invite.id}`}>
                                      <Send className="h-3 w-3 mr-1" /> Resend
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(invite.id)} disabled={revokeMutation.isPending} data-testid={`button-revoke-${invite.id}`}>
                                      <XCircle className="h-3 w-3 mr-1" /> Revoke
                                    </Button>
                                  </>
                                )}
                                <Button variant="outline" size="sm" className="text-destructive border-destructive/50" onClick={() => setShowDeleteConfirm(invite.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-${invite.id}`}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              </div>
                            </div>
                            {staffSession && expandedStaffLocation === invite.id && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Radio className="h-3 w-3" />
                                    {JOB_LABELS[staffSession.jobType] || staffSession.jobType}
                                  </span>
                                  <span>Started {staffSession.startedAt ? format(new Date(staffSession.startedAt), "HH:mm") : "—"}</span>
                                  {staffSession.lastLocationAt && (
                                    <span>Location updated {formatDistanceToNow(new Date(staffSession.lastLocationAt), { addSuffix: true })}</span>
                                  )}
                                </div>
                                <LiveLocationMap session={staffSession} />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        );
                      })
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== AUDIT TRAIL TAB ========== */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Complete log of all lone worker and staff actions</CardDescription>
                  </div>
                  <Tabs value={auditFilter} onValueChange={setAuditFilter}>
                    <TabsList>
                      <TabsTrigger value="all" data-testid="tab-audit-all">All</TabsTrigger>
                      <TabsTrigger value="lone_worker" data-testid="tab-audit-sessions">Sessions</TabsTrigger>
                      <TabsTrigger value="invites" data-testid="tab-audit-invites">Invites</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {auditGroupedByUser.length > 0 ? (
                  <div className="space-y-2">
                    {auditGroupedByUser.map(([userName, entries]) => (
                      <div key={userName} className="rounded-lg border overflow-visible">
                        <button
                          onClick={() => toggleAuditUser(userName)}
                          className="w-full p-3 flex items-center justify-between gap-2 text-left hover-elevate rounded-lg"
                          data-testid={`button-audit-user-${userName.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{userName}</span>
                            <Badge variant="secondary">{entries.length}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Latest: {format(new Date(entries[0].createdAt), "dd/MM/yyyy HH:mm")}
                            </span>
                            {expandedAuditUsers.has(userName) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        {expandedAuditUsers.has(userName) && (
                          <div className="border-t px-3 pb-3 space-y-2 pt-2">
                            {entries.map((entry) => (
                              <div key={entry.id} className="p-2 rounded border flex items-start justify-between gap-4 flex-wrap" data-testid={`audit-entry-${entry.id}`}>
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getAuditActionBadge(entry.action, entry.entityType)}
                                    <span className="text-sm font-medium capitalize">{entry.entityType.replace(/_/g, " ")}</span>
                                  </div>
                                  {entry.entityType === "lone_worker_session" && entry.newData && (
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      {entry.newData.jobType && <span className="mr-3">Job: {JOB_LABELS[entry.newData.jobType] || entry.newData.jobType}</span>}
                                      {entry.newData.expectedDurationMins && <span className="mr-3">Duration: {entry.newData.expectedDurationMins}m</span>}
                                      {entry.newData.outcome && <span className="mr-3">Outcome: {entry.newData.outcome.replace(/_/g, " ")}</span>}
                                      {entry.newData.notes && <p className="mt-1">Notes: {entry.newData.notes}</p>}
                                      {entry.newData.lat && entry.newData.lng && (
                                        <a
                                          href={`https://maps.google.com/?q=${entry.newData.lat},${entry.newData.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary underline inline-flex items-center gap-1"
                                        >
                                          <MapPin className="w-3 h-3" /> Location
                                        </a>
                                      )}
                                      {entry.newData.what3words && <span className="ml-2">w3w: {entry.newData.what3words}</span>}
                                    </div>
                                  )}
                                  {entry.entityType === "staff_invite" && (
                                    <p className="text-xs text-muted-foreground">
                                      {(entry.newData?.staffName || entry.previousData?.staffName) && <span>Name: {entry.newData?.staffName || entry.previousData?.staffName}</span>}
                                      {(entry.newData?.staffPhone || entry.previousData?.staffPhone) && <span className="ml-3">Phone: {entry.newData?.staffPhone || entry.previousData?.staffPhone}</span>}
                                      {(entry.newData?.staffEmail || entry.previousData?.staffEmail) && <span className="ml-3">Email: {entry.newData?.staffEmail || entry.previousData?.staffEmail}</span>}
                                    </p>
                                  )}
                                  {entry.ipAddress && <p className="text-xs text-muted-foreground">IP: {entry.ipAddress}</p>}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No audit entries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => { setShowInviteDialog(open); if (!open) resetInviteForm(); }}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{resendingInviteId ? "Resend Invite" : "Invite Staff Member"}</DialogTitle>
            <DialogDescription>
              {resendingInviteId
                ? "Review and update details before resending the invite SMS."
                : "Send an SMS invitation to a staff member. They will go through the full onboarding process at no cost."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="staffName">Full Name *</Label>
              <Input id="staffName" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="e.g. Jane Smith" data-testid="input-staff-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email *</Label>
              <Input id="staffEmail" type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="e.g. jane@example.com" data-testid="input-staff-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffPhone">Mobile Number *</Label>
              <div className="flex gap-2">
                <Select value={staffCountryCode} onValueChange={setStaffCountryCode}>
                  <SelectTrigger className="w-28" data-testid="select-staff-country-code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+44">+44 UK</SelectItem>
                    <SelectItem value="+1">+1 US</SelectItem>
                    <SelectItem value="+353">+353 IE</SelectItem>
                    <SelectItem value="+33">+33 FR</SelectItem>
                    <SelectItem value="+49">+49 DE</SelectItem>
                  </SelectContent>
                </Select>
                <Input id="staffPhone" type="tel" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-staff-phone" />
              </div>
              <p className="text-xs text-muted-foreground">Leading zero will be removed automatically</p>
            </div>
            {!resendingInviteId && (
              <div className="space-y-2">
                <Label htmlFor="bundleId">Bundle *</Label>
                <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                  <SelectTrigger data-testid="select-bundle">
                    <SelectValue placeholder="Select a bundle" />
                  </SelectTrigger>
                  <SelectContent>
                    {stats?.bundles?.map((bundle) => (
                      <SelectItem key={bundle.id} value={bundle.id} data-testid={`option-bundle-${bundle.id}`}>
                        {bundle.name} ({bundle.seatLimit - bundle.seatsUsed} seats available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Supervisor (Primary Contact)</p>
              <p className="text-xs text-muted-foreground mb-3">The supervisor is notified first for missed check-ins and emergencies. Leave blank if not applicable.</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="supName">Supervisor Name</Label>
                  <Input id="supName" value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="e.g. Sarah Manager" data-testid="input-sup-name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supPhone">Supervisor Phone</Label>
                  <div className="flex gap-2">
                    <Select value={supCountryCode} onValueChange={(v) => { setSupCountryCode(v); setSupSmsVerified(false); setSupSmsSent(false); setSupSmsCode(""); }}>
                      <SelectTrigger className="w-28" data-testid="select-sup-country-code">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+44">+44 UK</SelectItem>
                        <SelectItem value="+1">+1 US</SelectItem>
                        <SelectItem value="+353">+353 IE</SelectItem>
                        <SelectItem value="+33">+33 FR</SelectItem>
                        <SelectItem value="+49">+49 DE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input id="supPhone" type="tel" value={supPhone} onChange={(e) => { setSupPhone(e.target.value); setSupSmsVerified(false); setSupSmsSent(false); setSupSmsCode(""); }} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-sup-phone" />
                  </div>
                  {supPhone.trim() && !supSmsVerified && (
                    <div className="mt-2 space-y-2">
                      {!supSmsSent ? (
                        <Button type="button" size="sm" variant="outline" onClick={handleSendSupSms} disabled={supSmsSending} data-testid="button-send-sup-sms">
                          {supSmsSending ? "Sending..." : "Send Verification Code"}
                        </Button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input type="text" placeholder="6-digit code" value={supSmsCode} onChange={(e) => setSupSmsCode(e.target.value)} className="w-32" maxLength={6} data-testid="input-sup-sms-code" />
                          <Button type="button" size="sm" onClick={handleVerifySupSms} disabled={supSmsVerifying || !supSmsCode.trim()} data-testid="button-verify-sup-sms">
                            {supSmsVerifying ? "Verifying..." : "Verify"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={handleSendSupSms} disabled={supSmsSending} data-testid="button-resend-sup-sms">
                            Resend
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {supSmsVerified && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1" data-testid="text-sup-verified">
                      <CheckCircle className="h-3 w-3" /> Phone verified
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supEmail">Supervisor Email</Label>
                  <Input id="supEmail" type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="e.g. supervisor@company.com" data-testid="input-sup-email" />
                </div>
              </div>
            </div>
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Emergency Contact *</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="ecName">Contact Name *</Label>
                  <Input id="ecName" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g. John Smith" data-testid="input-ec-name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecPhone">Contact Phone *</Label>
                  <div className="flex gap-2">
                    <Select value={ecCountryCode} onValueChange={setEcCountryCode}>
                      <SelectTrigger className="w-28" data-testid="select-ec-country-code">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+44">+44 UK</SelectItem>
                        <SelectItem value="+1">+1 US</SelectItem>
                        <SelectItem value="+353">+353 IE</SelectItem>
                        <SelectItem value="+33">+33 FR</SelectItem>
                        <SelectItem value="+49">+49 DE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input id="ecPhone" type="tel" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-ec-phone" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecEmail">Contact Email *</Label>
                  <Input id="ecEmail" type="email" value={ecEmail} onChange={(e) => setEcEmail(e.target.value)} placeholder="e.g. john@example.com" data-testid="input-ec-email" />
                  <p className="text-xs text-muted-foreground">A confirmation email will be sent to this address</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecRelationship">Relationship *</Label>
                  <Select value={ecRelationship} onValueChange={setEcRelationship}>
                    <SelectTrigger data-testid="select-ec-relationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {!resendingInviteId && (
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium mb-3">Emergency Recording Consent</p>
                <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Video className={`h-5 w-5 ${emergencyRecordingEnabled ? "text-red-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium">Emergency recording</p>
                      <p className="text-xs text-muted-foreground">Activate camera and microphone during emergencies</p>
                    </div>
                  </div>
                  <Switch
                    checked={emergencyRecordingEnabled}
                    onCheckedChange={setEmergencyRecordingEnabled}
                    data-testid="switch-staff-emergency-recording"
                  />
                </div>
                {emergencyRecordingEnabled && (
                  <p className="text-xs text-muted-foreground mt-2">
                    When enabled, the staff member's phone will record audio and video during emergency alerts. They can change this in their own settings after registration.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); resetInviteForm(); }}>Cancel</Button>
            <Button onClick={handleSubmitInvite} disabled={isMutating} data-testid="button-send-invite">
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {resendingInviteId ? "Resend Invite" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Details Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingInvite(null); } }}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Staff Details</DialogTitle>
            <DialogDescription>Update the details for {editingInvite?.staffName}.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="editStaffName">Staff Name</Label>
                <Input id="editStaffName" value={editStaffName} onChange={(e) => setEditStaffName(e.target.value)} data-testid="input-edit-staff-name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="editStaffPhone">Staff Phone</Label>
                <div className="flex gap-2">
                  <Select value={editStaffCountryCode} onValueChange={setEditStaffCountryCode}>
                    <SelectTrigger className="w-28" data-testid="select-edit-staff-country-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+44">+44 UK</SelectItem>
                      <SelectItem value="+1">+1 US</SelectItem>
                      <SelectItem value="+353">+353 IE</SelectItem>
                      <SelectItem value="+33">+33 FR</SelectItem>
                      <SelectItem value="+49">+49 DE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input id="editStaffPhone" type="tel" value={editStaffPhone} onChange={(e) => setEditStaffPhone(e.target.value)} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-edit-staff-phone" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="editStaffEmail">Staff Email</Label>
                <Input id="editStaffEmail" type="email" value={editStaffEmail} onChange={(e) => setEditStaffEmail(e.target.value)} data-testid="input-edit-staff-email" />
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Supervisor (Primary Contact)</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="editSupName">Supervisor Name</Label>
                  <Input id="editSupName" value={editSupervisorName} onChange={(e) => setEditSupervisorName(e.target.value)} placeholder="e.g. Sarah Manager" data-testid="input-edit-sup-name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editSupPhone">Supervisor Phone</Label>
                  <div className="flex gap-2">
                    <Select value={editSupervisorCountryCode} onValueChange={(v) => { setEditSupervisorCountryCode(v); setEditSupervisorSmsVerified(false); setEditSupervisorSmsSent(false); setEditSupervisorSmsCode(""); }}>
                      <SelectTrigger className="w-28" data-testid="select-edit-sup-country-code">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+44">+44 UK</SelectItem>
                        <SelectItem value="+1">+1 US</SelectItem>
                        <SelectItem value="+353">+353 IE</SelectItem>
                        <SelectItem value="+33">+33 FR</SelectItem>
                        <SelectItem value="+49">+49 DE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input id="editSupPhone" type="tel" value={editSupervisorPhone} onChange={(e) => { setEditSupervisorPhone(e.target.value); setEditSupervisorSmsVerified(false); setEditSupervisorSmsSent(false); setEditSupervisorSmsCode(""); }} placeholder="7XXX XXXXXX" className="flex-1" data-testid="input-edit-sup-phone" />
                  </div>
                  {editSupervisorPhone.trim() && !editSupervisorSmsVerified && (
                    <div className="mt-2 space-y-2">
                      {!editSupervisorSmsSent ? (
                        <Button type="button" size="sm" variant="outline" disabled={editSupervisorSmsSending} data-testid="button-edit-send-sup-sms"
                          onClick={async () => {
                            const fullPhone = `${editSupervisorCountryCode}${editSupervisorPhone.replace(/\D/g, "").replace(/^0+/, "")}`;
                            setEditSupervisorSmsSending(true);
                            try {
                              const res = await fetch("/api/org/supervisor/send-verification", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "x-csrf-token": document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)?.[1] || "" },
                                credentials: "include",
                                body: JSON.stringify({ phone: fullPhone, supervisorName: editSupervisorName }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                setEditSupervisorSmsSent(true);
                                toast({ title: "Code sent", description: "A verification code has been sent to the supervisor's phone." });
                              } else {
                                toast({ title: "Failed", description: data.error || "Could not send verification code.", variant: "destructive" });
                              }
                            } catch { toast({ title: "Error", description: "Failed to send verification SMS.", variant: "destructive" }); }
                            finally { setEditSupervisorSmsSending(false); }
                          }}
                        >
                          {editSupervisorSmsSending ? "Sending..." : "Send Verification Code"}
                        </Button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input type="text" placeholder="6-digit code" value={editSupervisorSmsCode} onChange={(e) => setEditSupervisorSmsCode(e.target.value)} className="w-32" maxLength={6} data-testid="input-edit-sup-sms-code" />
                          <Button type="button" size="sm" disabled={editSupervisorSmsVerifying || !editSupervisorSmsCode.trim()} data-testid="button-edit-verify-sup-sms"
                            onClick={async () => {
                              const fullPhone = `${editSupervisorCountryCode}${editSupervisorPhone.replace(/\D/g, "").replace(/^0+/, "")}`;
                              setEditSupervisorSmsVerifying(true);
                              try {
                                const res = await fetch("/api/org/supervisor/verify-sms", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", "x-csrf-token": document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)?.[1] || "" },
                                  credentials: "include",
                                  body: JSON.stringify({ phone: fullPhone, code: editSupervisorSmsCode }),
                                });
                                const data = await res.json();
                                if (data.verified) {
                                  setEditSupervisorSmsVerified(true);
                                  toast({ title: "Verified", description: "Supervisor phone number confirmed." });
                                } else {
                                  toast({ title: "Not verified", description: data.error || "Incorrect code.", variant: "destructive" });
                                }
                              } catch { toast({ title: "Error", description: "Failed to verify code.", variant: "destructive" }); }
                              finally { setEditSupervisorSmsVerifying(false); }
                            }}
                          >
                            {editSupervisorSmsVerifying ? "Verifying..." : "Verify"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" disabled={editSupervisorSmsSending} data-testid="button-edit-resend-sup-sms"
                            onClick={async () => {
                              const fullPhone = `${editSupervisorCountryCode}${editSupervisorPhone.replace(/\D/g, "").replace(/^0+/, "")}`;
                              setEditSupervisorSmsSending(true);
                              try {
                                const res = await fetch("/api/org/supervisor/send-verification", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", "x-csrf-token": document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)?.[1] || "" },
                                  credentials: "include",
                                  body: JSON.stringify({ phone: fullPhone, supervisorName: editSupervisorName }),
                                });
                                const data = await res.json();
                                if (data.success) { toast({ title: "Code resent" }); }
                                else { toast({ title: "Failed", description: data.error, variant: "destructive" }); }
                              } catch { toast({ title: "Error", variant: "destructive" }); }
                              finally { setEditSupervisorSmsSending(false); }
                            }}
                          >
                            Resend
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {editSupervisorSmsVerified && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1" data-testid="text-edit-sup-verified">
                      <CheckCircle className="h-3 w-3" /> Phone verified
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editSupEmail">Supervisor Email</Label>
                  <Input id="editSupEmail" type="email" value={editSupervisorEmail} onChange={(e) => setEditSupervisorEmail(e.target.value)} placeholder="e.g. supervisor@company.com" data-testid="input-edit-sup-email" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingInvite(null); }} data-testid="button-edit-cancel">Cancel</Button>
            <Button
              onClick={() => {
                if (editSupervisorPhone.trim() && !editSupervisorSmsVerified) {
                  toast({ title: "Verification required", description: "Please verify the supervisor's phone number before saving.", variant: "destructive" });
                  return;
                }
                updateInviteDetailsMutation.mutate();
              }}
              disabled={updateInviteDetailsMutation.isPending}
              data-testid="button-edit-save"
            >
              {updateInviteDetailsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invitation</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete this invitation? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (showDeleteConfirm) deleteMutation.mutate(showDeleteConfirm); }} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelEmergencySession} onOpenChange={(open) => {
        if (!open) {
          setCancelEmergencySession(null);
          setCancelPin("");
          setCancelConfirmSpoken(false);
          setCancelPinError("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Cancel Emergency
            </DialogTitle>
            <DialogDescription>
              Cancel the emergency for <strong>{cancelEmergencySession?.userName}</strong>. You must confirm you have spoken to the lone worker and verify their cancellation password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 rounded border bg-muted/30">
              <input
                type="checkbox"
                id="confirm-spoken"
                checked={cancelConfirmSpoken}
                onChange={(e) => { setCancelConfirmSpoken(e.target.checked); setCancelPinError(""); }}
                className="mt-1 h-5 w-5 rounded border-muted-foreground accent-primary"
                data-testid="checkbox-confirm-spoken"
              />
              <label htmlFor="confirm-spoken" className="text-sm cursor-pointer">
                I confirm that I have spoken directly to <strong>{cancelEmergencySession?.userName}</strong> and they have confirmed they are safe and well.
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Staff Member's Cancellation Password</Label>
              <PasswordInput
                placeholder="Enter the cancellation password"
                value={cancelPin}
                onChange={(e) => { setCancelPin(e.target.value); setCancelPinError(""); }}
                data-testid="input-cancel-pin"
              />
              <p className="text-xs text-muted-foreground">
                This is the password the staff member created when they set up their account.
              </p>
            </div>
            {cancelPinError && (
              <p className="text-sm text-destructive" role="alert" data-testid="text-cancel-pin-error">{cancelPinError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelEmergencySession(null)} data-testid="button-cancel-emergency-dismiss">
              Go Back
            </Button>
            <Button
              disabled={!cancelConfirmSpoken || !cancelPin || supervisorCancelMutation.isPending}
              onClick={() => {
                if (!cancelConfirmSpoken) {
                  setCancelPinError("You must confirm you have spoken to the worker");
                  return;
                }
                if (!cancelPin) {
                  setCancelPinError("Please enter the cancellation password");
                  return;
                }
                supervisorCancelMutation.mutate({
                  sessionId: cancelEmergencySession.id,
                  cancellationPin: cancelPin,
                  confirmSpoken: cancelConfirmSpoken,
                });
              }}
              data-testid="button-confirm-cancel-emergency"
            >
              {supervisorCancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Confirm & Cancel Emergency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Staff Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        if (!open && importStep !== "importing") {
          setShowImportDialog(false);
          resetImportForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Staff from Spreadsheet
            </DialogTitle>
            <DialogDescription>
              Upload an Excel spreadsheet (.xlsx, .xls) to invite multiple staff members at once.
            </DialogDescription>
          </DialogHeader>

          {importStep === "upload" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button variant="outline" onClick={downloadStaffTemplate} data-testid="button-download-staff-template">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <p className="text-xs text-muted-foreground">Use our template for best results</p>
              </div>

              <div
                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => document.getElementById("staff-import-file-input")?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImportFileUpload(file);
                }}
                data-testid="dropzone-staff-import"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files (max 100 staff)</p>
                <input
                  id="staff-import-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFileUpload(file);
                    e.target.value = "";
                  }}
                  data-testid="input-staff-import-file"
                />
              </div>

              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-2">Required Columns</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Staff Name</span>
                  <span>Mobile Number</span>
                  <span>Email</span>
                  <span>Emergency Contact Name</span>
                  <span>Emergency Contact Email</span>
                </div>
                <h4 className="text-sm font-semibold mt-3 mb-2">Optional Columns</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Emergency Contact Phone</span>
                  <span>Emergency Contact Relationship</span>
                </div>
              </Card>
            </div>
          )}

          {importStep === "preview" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{importData.length} staff found</Badge>
                  {importErrors.length > 0 && (
                    <Badge variant="destructive">{importErrors.length} row{importErrors.length !== 1 ? "s" : ""} with errors</Badge>
                  )}
                  {importErrors.length === 0 && (
                    <Badge className="bg-green-600 text-white">All rows valid</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setImportStep("upload"); setImportFile(null); setImportData([]); setImportErrors([]); }}>
                  Choose Different File
                </Button>
              </div>

              {importFile && (
                <p className="text-xs text-muted-foreground">File: {importFile.name}</p>
              )}

              {importErrors.length > 0 && (
                <Card className="p-3 border-destructive">
                  <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Errors
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.map((err, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium">Row {err.row}:</span>{" "}
                        <span className="text-muted-foreground">{err.errors.join("; ")}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {stats?.bundles && stats.bundles.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to Bundle *</Label>
                  <Select value={importBundleId} onValueChange={setImportBundleId}>
                    <SelectTrigger data-testid="select-staff-import-bundle">
                      <SelectValue placeholder="Select a bundle" />
                    </SelectTrigger>
                    <SelectContent>
                      {stats.bundles.filter(b => b.status === "active").map((bundle) => (
                        <SelectItem
                          key={bundle.id}
                          value={bundle.id}
                          disabled={bundle.seatsUsed >= bundle.seatLimit}
                        >
                          {bundle.name} ({bundle.seatLimit - bundle.seatsUsed} seats available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      <th className="px-2 py-1.5 text-left font-medium">Name</th>
                      <th className="px-2 py-1.5 text-left font-medium">Mobile</th>
                      <th className="px-2 py-1.5 text-left font-medium">Email</th>
                      <th className="px-2 py-1.5 text-left font-medium">Emergency Contact</th>
                      <th className="px-2 py-1.5 text-left font-medium">EC Email</th>
                      <th className="px-2 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((member, idx) => {
                      const rowError = importErrors.find(e => e.row === idx + 2);
                      return (
                        <tr key={idx} className={rowError ? "bg-destructive/5" : ""} data-testid={`row-import-staff-${idx}`}>
                          <td className="px-2 py-1.5">{idx + 1}</td>
                          <td className="px-2 py-1.5 font-medium">{member.staffName || "-"}</td>
                          <td className="px-2 py-1.5">{member.staffPhone || "-"}</td>
                          <td className="px-2 py-1.5">{member.staffEmail || "-"}</td>
                          <td className="px-2 py-1.5">{member.emergencyContactName || "-"}</td>
                          <td className="px-2 py-1.5">{member.emergencyContactEmail || "-"}</td>
                          <td className="px-2 py-1.5">
                            {rowError ? (
                              <XOctagon className="h-3.5 w-3.5 text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importStep === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Importing {importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2)).length} staff members...</p>
              <p className="text-xs text-muted-foreground">Each staff member will receive an SMS with their invite code</p>
            </div>
          )}

          {importStep === "results" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600 text-white">
                  {importResults.filter(r => r.success).length} invited
                </Badge>
                {importResults.filter(r => !r.success).length > 0 && (
                  <Badge variant="destructive">
                    {importResults.filter(r => !r.success).length} failed
                  </Badge>
                )}
              </div>

              <div className="border rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      <th className="px-2 py-1.5 text-left font-medium">Staff Name</th>
                      <th className="px-2 py-1.5 text-left font-medium">Invite Code</th>
                      <th className="px-2 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.map((result, idx) => (
                      <tr key={idx} className={result.success ? "" : "bg-destructive/5"} data-testid={`row-staff-import-result-${idx}`}>
                        <td className="px-2 py-1.5">{result.row}</td>
                        <td className="px-2 py-1.5 font-medium">{result.staffName}</td>
                        <td className="px-2 py-1.5">
                          {result.inviteCode ? (
                            <Badge variant="secondary">{result.inviteCode}</Badge>
                          ) : "-"}
                        </td>
                        <td className="px-2 py-1.5">
                          {result.success ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Invited
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <XOctagon className="h-3.5 w-3.5" /> {result.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            {importStep === "upload" && (
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
            )}
            {importStep === "preview" && (
              <>
                <Button variant="outline" onClick={() => { setShowImportDialog(false); resetImportForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const validStaff = importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2));
                    if (validStaff.length === 0) {
                      toast({ title: "No valid rows", description: "Please fix all errors before importing.", variant: "destructive" });
                      return;
                    }
                    if (!importBundleId) {
                      toast({ title: "Bundle required", description: "Please select a bundle to assign staff to.", variant: "destructive" });
                      return;
                    }
                    setImportData(validStaff);
                    setImportStep("importing");
                    importStaffMutation.mutate({ staff: validStaff, bundleId: importBundleId });
                  }}
                  disabled={importStaffMutation.isPending}
                  data-testid="button-confirm-staff-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import {importData.filter((_, idx) => !importErrors.find(e => e.row === idx + 2)).length} Staff
                </Button>
              </>
            )}
            {importStep === "results" && (
              <Button onClick={() => { setShowImportDialog(false); resetImportForm(); }} data-testid="button-close-staff-import-results">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}