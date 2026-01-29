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
import { ArrowLeft, Download, Search, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Organisation {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  clientCount: number;
  bundleCount: number;
}

export default function AdminOrganisationsReport() {
  const { admin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfDateRange, setPdfDateRange] = useState<"all" | "month" | "year" | "custom">("all");
  const [pdfCustomStartDate, setPdfCustomStartDate] = useState("");
  const [pdfCustomEndDate, setPdfCustomEndDate] = useState("");

  const { data: organisations, isLoading } = useQuery<Organisation[]>({
    queryKey: ["/api/admin/organisations"],
  });

  const filteredOrganisations = useMemo(() => {
    if (!organisations) return [];
    
    let result = [...organisations].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(org => 
        (org.name || "").toLowerCase().includes(query) ||
        (org.email || "").toLowerCase().includes(query) ||
        format(new Date(org.createdAt), "dd/MM/yyyy").includes(query)
      );
    }
    
    return result;
  }, [organisations, searchQuery]);

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

  const filterByDateRange = (items: Organisation[]): Organisation[] => {
    const { start, end } = getDateRange();
    if (!start || !end) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });
  };

  const downloadPDF = () => {
    if (!filteredOrganisations.length) return;
    
    const dataToExport = filterByDateRange(filteredOrganisations);
    if (dataToExport.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Organisations Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    const tableData = dataToExport.map(org => [
      org.name || "-",
      org.email || "-",
      format(new Date(org.createdAt), "dd/MM/yyyy"),
      org.bundleCount.toString(),
      org.clientCount.toString()
    ]);
    
    (doc as any).autoTable({
      startY: 45,
      head: [["Organisation Name", "Email", "Created", "Bundles", "Clients"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Organisations: ${dataToExport.length}`, 14, currentY);
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Keeping you safe | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-organisations-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
                  <Building2 className="h-6 w-6 text-primary" />
                  Organisations
                </h1>
                <p className="text-muted-foreground">All registered organisations</p>
              </div>
            </div>
            <Button onClick={() => setShowPdfDialog(true)} disabled={!organisations || organisations.length === 0} data-testid="button-download-organisations-pdf">
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
                data-testid="input-search-organisations"
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organisations ({filteredOrganisations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredOrganisations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No organisations found</p>
            ) : (
              <div className="space-y-3">
                {filteredOrganisations.map((org) => (
                  <div 
                    key={org.id} 
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border"
                    data-testid={`organisation-${org.id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{org.bundleCount} bundles</Badge>
                        <Badge variant="outline">{org.clientCount} clients</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(org.createdAt), "d MMM yyyy")}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Organisations PDF</DialogTitle>
            <DialogDescription>
              Select a date range for the PDF export
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={pdfDateRange} onValueChange={(v: any) => setPdfDateRange(v)}>
                <SelectTrigger data-testid="select-pdf-date-range">
                  <SelectValue placeholder="Select date range" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancel
            </Button>
            <Button onClick={downloadPDF} data-testid="button-confirm-download-pdf">
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
