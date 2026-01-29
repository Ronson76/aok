import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Search, AlertOctagon } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface EmergencyAlert {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  contactsNotified: string[];
  orgClientReferenceCode: string | null;
  organizationName: string | null;
}

export default function AdminEmergencyAlertsReport() {
  const { admin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfDateRange, setPdfDateRange] = useState<"all" | "month" | "year" | "custom">("all");
  const [pdfCustomStartDate, setPdfCustomStartDate] = useState("");
  const [pdfCustomEndDate, setPdfCustomEndDate] = useState("");

  const { data: alerts, isLoading } = useQuery<EmergencyAlert[]>({
    queryKey: ["/api/admin/emergency-alerts"],
  });

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    
    let result = [...alerts];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(alert => 
        (alert.userName || "").toLowerCase().includes(query) ||
        (alert.userEmail || "").toLowerCase().includes(query) ||
        (alert.orgClientReferenceCode || "").toLowerCase().includes(query) ||
        format(new Date(alert.timestamp), "dd/MM/yyyy").includes(query)
      );
    }
    
    return result;
  }, [alerts, searchQuery]);

  const getDateRange = (): { start: Date | null; end: Date | null; label: string } => {
    const now = new Date();
    switch (pdfDateRange) {
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now, label: `${format(monthStart, "dd/MM/yyyy")} - ${format(now, "dd/MM/yyyy")}` };
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now, label: `${format(yearStart, "dd/MM/yyyy")} - ${format(now, "dd/MM/yyyy")}` };
      case "custom":
        const start = pdfCustomStartDate ? new Date(pdfCustomStartDate) : null;
        const end = pdfCustomEndDate ? new Date(pdfCustomEndDate) : null;
        if (start && end) {
          return { start, end, label: `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}` };
        }
        return { start: null, end: null, label: "All Time" };
      default:
        return { start: null, end: null, label: "All Time" };
    }
  };

  const filterByDateRange = (items: EmergencyAlert[]): EmergencyAlert[] => {
    const { start, end } = getDateRange();
    if (!start || !end) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= start && itemDate <= end;
    });
  };

  const downloadPDF = () => {
    if (!filteredAlerts.length) return;
    
    const dataToExport = filterByDateRange(filteredAlerts);
    if (dataToExport.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    // Branded header with red for emergency
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Emergency Alerts Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    const tableData = dataToExport.map(alert => [
      format(new Date(alert.timestamp), "dd/MM/yyyy HH:mm"),
      alert.orgClientReferenceCode || alert.userName || "-",
      alert.userEmail || "-",
      alert.contactsNotified?.join(", ") || "-"
    ]);
    
    (doc as any).autoTable({
      startY: 45,
      head: [["Date/Time", "User/Reference", "Email", "Contacts Notified"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      columnStyles: {
        3: { cellWidth: 60 }
      }
    });
    
    // Add total
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Emergency Alerts: ${dataToExport.length}`, 14, currentY);
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Keeping you safe | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-emergency-alerts-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setShowPdfDialog(false);
  };

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" data-testid="button-back-to-dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <AlertOctagon className="h-6 w-6 text-red-500" />
                  Emergency Alerts
                </h1>
                <p className="text-muted-foreground">Complete history of emergency alerts</p>
              </div>
            </div>
            <Button onClick={() => setShowPdfDialog(true)} disabled={!alerts || alerts.length === 0} data-testid="button-download-alerts-pdf">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or date (dd/mm/yyyy)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
                data-testid="input-search-alerts"
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Alerts ({filteredAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No emergency alerts found</p>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex items-start justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/20"
                    data-testid={`alert-row-${alert.id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {alert.orgClientReferenceCode || alert.userName || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">{alert.userEmail}</p>
                      {alert.organizationName && (
                        <p className="text-xs text-muted-foreground italic">
                          Client of {alert.organizationName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Notified: {alert.contactsNotified?.join(", ") || "None"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="bg-red-500">Emergency</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        {format(new Date(alert.timestamp), "dd/MM/yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(alert.timestamp), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Emergency Alerts Report
            </DialogTitle>
            <DialogDescription>
              Select a date range for the PDF report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Date Range</Label>
              <Select value={pdfDateRange} onValueChange={(v: "all" | "month" | "year" | "custom") => setPdfDateRange(v)}>
                <SelectTrigger data-testid="select-pdf-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pdfDateRange === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={pdfCustomStartDate}
                    onChange={(e) => setPdfCustomStartDate(e.target.value)}
                    data-testid="input-pdf-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={pdfCustomEndDate}
                    onChange={(e) => setPdfCustomEndDate(e.target.value)}
                    data-testid="input-pdf-end-date"
                  />
                </div>
              </div>
            )}

            {pdfDateRange !== "all" && pdfDateRange !== "custom" && (
              <p className="text-sm text-muted-foreground">
                Period: {getDateRange().label}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={downloadPDF}
              disabled={pdfDateRange === "custom" && (!pdfCustomStartDate || !pdfCustomEndDate)}
              data-testid="button-generate-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
