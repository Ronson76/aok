import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface RegistrationDay {
  date: string;
  count: number;
  users: any[];
}

export default function AdminRegistrationsReport() {
  const { admin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfDateRange, setPdfDateRange] = useState<"all" | "month" | "year" | "custom">("all");
  const [pdfCustomStartDate, setPdfCustomStartDate] = useState("");
  const [pdfCustomEndDate, setPdfCustomEndDate] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const { data: registrations, isLoading } = useQuery<RegistrationDay[]>({
    queryKey: ["/api/admin/registrations"],
  });

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    
    let result = [...registrations];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(day => {
        const dateMatch = format(new Date(day.date), "dd/MM/yyyy").includes(query);
        const userMatch = day.users.some(user => 
          (user.name || "").toLowerCase().includes(query) ||
          (user.email || "").toLowerCase().includes(query)
        );
        return dateMatch || userMatch;
      });
    }
    
    return result;
  }, [registrations, searchQuery]);

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

  const filterByDateRange = (items: RegistrationDay[]): RegistrationDay[] => {
    const { start, end } = getDateRange();
    if (!start || !end) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
  };

  const downloadPDF = () => {
    if (!filteredRegistrations.length) return;
    
    const dataToExport = filterByDateRange(filteredRegistrations);
    if (dataToExport.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { label } = getDateRange();
    
    // Branded header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("aok", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Daily Registrations Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Period: ${label}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 28, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    
    // Summary table
    const summaryData = dataToExport.map(day => [
      format(new Date(day.date), "dd/MM/yyyy"),
      day.count.toString()
    ]);
    
    (doc as any).autoTable({
      startY: 45,
      head: [["Date", "Registrations"]],
      body: summaryData,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    });
    
    // Add total
    const totalRegistrations = dataToExport.reduce((sum, day) => sum + day.count, 0);
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Registrations: ${totalRegistrations}`, 14, currentY);
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.setFont("helvetica", "normal");
      doc.text(`aok - Keeping you safe | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`aok-registrations-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
                  <Calendar className="h-6 w-6" />
                  Daily Registrations
                </h1>
                <p className="text-muted-foreground">User registrations by date</p>
              </div>
            </div>
            <Button onClick={() => setShowPdfDialog(true)} disabled={!registrations || registrations.length === 0} data-testid="button-download-registrations-pdf">
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
                data-testid="input-search-registrations"
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrations by Date</CardTitle>
            <CardDescription>Click on a date to expand and see users registered that day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No registrations found</p>
            ) : (
              <div className="space-y-2">
                {filteredRegistrations.map((day) => (
                  <div key={day.date} className="border rounded-lg">
                    <button
                      onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                      className="w-full flex items-center justify-between p-4 hover-elevate rounded-lg"
                      data-testid={`registration-date-${day.date}`}
                    >
                      <span className="font-medium">{format(new Date(day.date), "EEEE, dd MMMM yyyy")}</span>
                      <Badge variant="secondary">{day.count} user{day.count !== 1 ? "s" : ""}</Badge>
                    </button>
                    
                    {expandedDate === day.date && (
                      <div className="border-t p-4 bg-muted/30">
                        <div className="space-y-2">
                          {day.users.map((user: any) => (
                            <div key={user.id} className="flex items-center justify-between p-2 rounded bg-background">
                              <div>
                                <p className="font-medium text-sm">{user.orgClientReferenceCode || user.name || "Unnamed"}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {user.organizationName ? "org client" : user.accountType}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
              Download Registrations Report
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
