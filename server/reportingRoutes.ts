import { Express, Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import { storage, orgMemberStorage, organizationStorage } from "./storage";

async function requireOrganization(req: Request, res: Response, next: NextFunction) {
  const orgMemberSessionId = req.cookies?.org_member_session;
  if (orgMemberSessionId) {
    const session = await orgMemberStorage.getMemberSession(orgMemberSessionId);
    if (session) {
      const member = await orgMemberStorage.getMemberById(session.memberId);
      if (member && member.status === "active") {
        req.userId = member.organizationId;
        req.orgId = member.organizationId;
        req.orgMember = (() => { const { passwordHash, ...p } = member; return p; })();
        req.orgRole = member.role;
        return next();
      }
    }
  }

  if (!req.user || (req.user as any).accountType !== "organization") {
    return res.status(403).json({ error: "Access denied. Organisation account required." });
  }

  req.orgId = req.userId;
  req.orgRole = "owner";
  next();
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function registerReportingRoutes(app: Express) {
  app.get("/api/org/reports/incident/:incidentId/pdf", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const incident = await storage.getIncident(orgId, req.params.incidentId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      let clientName = "Unknown";
      if (incident.clientId) {
        const client = await organizationStorage.getClientById(incident.clientId);
        if (client) clientName = client.name;
      }

      const orgUser = await storage.getUserById(orgId);
      const orgName = orgUser?.name || "Organisation";

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="incident-report-${incident.id.slice(0, 8)}.pdf"`);
      doc.pipe(res);

      doc.fontSize(20).font("Helvetica-Bold").text("Incident Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor("#666666").text(`Organisation: ${orgName}`, { align: "center" });
      doc.text(`Generated: ${formatDate(new Date())}`, { align: "center" });
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);

      const addField = (label: string, value: string) => {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#333333").text(label, { continued: true });
        doc.font("Helvetica").fillColor("#000000").text(`  ${value}`);
        doc.moveDown(0.3);
      };

      addField("Report ID:", incident.id);
      addField("Date Reported:", formatDate(incident.createdAt));
      addField("Incident Type:", incident.incidentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()));
      addField("Severity:", incident.severity.toUpperCase());
      addField("Status:", incident.status.toUpperCase());
      addField("Client:", clientName);

      if (incident.reportedByName) {
        addField("Reported By:", incident.isAnonymous ? "Anonymous" : incident.reportedByName);
      }

      if (incident.location) addField("Location:", incident.location);
      if (incident.what3words) addField("what3words:", `///${incident.what3words}`);
      if (incident.locationLat && incident.locationLng) {
        addField("Coordinates:", `${incident.locationLat}, ${incident.locationLng}`);
      }

      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text("Description");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#000000").text(incident.description, { lineGap: 2 });

      if (incident.resolution) {
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text("Resolution");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(incident.resolution, { lineGap: 2 });
        if (incident.resolvedAt) addField("Resolved At:", formatDate(incident.resolvedAt));
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor("#999999")
        .text("This report is generated automatically by aok.care and forms part of the organisation's safeguarding audit trail.", { align: "center" });

      doc.end();

      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "export",
        entityType: "incident",
        entityId: incident.id,
        eventType: "pdf_export",
        newData: { format: "pdf", incidentId: incident.id },
      });
    } catch (error) {
      console.error("Error generating incident PDF:", error);
      res.status(500).json({ error: "Failed to generate incident report" });
    }
  });

  app.get("/api/org/reports/audit/csv", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const filters: any = {};
      if (req.query.entityType) filters.entityType = req.query.entityType as string;
      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      filters.limit = 10000;
      filters.offset = 0;

      const { entries } = await storage.getFilteredAuditTrail(orgId, filters);

      const headers = ["ID", "Date", "Action", "Entity Type", "Entity ID", "User Email", "User Role", "Event Type", "IP Address", "Previous Data", "New Data", "Integrity Hash"];
      const rows = entries.map(e => [
        escapeCSV(e.id),
        escapeCSV(formatDate(e.createdAt)),
        escapeCSV(e.action),
        escapeCSV(e.entityType),
        escapeCSV(e.entityId),
        escapeCSV(e.userEmail),
        escapeCSV(e.userRole),
        escapeCSV(e.eventType),
        escapeCSV(e.ipAddress),
        escapeCSV(e.previousData ? JSON.stringify(e.previousData) : ""),
        escapeCSV(e.newData ? JSON.stringify(e.newData) : ""),
        escapeCSV(e.integrityHash),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="audit-trail-${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csv);

      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "export",
        entityType: "audit_trail",
        eventType: "csv_export",
        newData: { format: "csv", recordCount: entries.length, filters },
      });
    } catch (error) {
      console.error("Error generating audit CSV:", error);
      res.status(500).json({ error: "Failed to generate audit CSV" });
    }
  });

  app.get("/api/org/reports/summary/pdf", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const orgUser = await storage.getUserById(orgId);
      const orgName = orgUser?.name || "Organisation";

      const { entries, total } = await storage.getFilteredAuditTrail(orgId, {
        startDate,
        endDate,
        limit: 10000,
        offset: 0,
      });

      const actionCounts: Record<string, number> = {};
      const entityCounts: Record<string, number> = {};
      for (const e of entries) {
        actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
        entityCounts[e.entityType] = (entityCounts[e.entityType] || 0) + 1;
      }

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="audit-summary-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.pdf"`);
      doc.pipe(res);

      doc.fontSize(20).font("Helvetica-Bold").text("Audit Trail Summary Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor("#666666").text(`Organisation: ${orgName}`, { align: "center" });
      doc.text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, { align: "center" });
      doc.text(`Generated: ${formatDate(new Date())}`, { align: "center" });
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);

      doc.fontSize(14).font("Helvetica-Bold").fillColor("#333333").text("Overview");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#000000").text(`Total audit entries: ${total}`);
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold").fillColor("#333333").text("Actions Breakdown");
      doc.moveDown(0.3);
      for (const [action, cnt] of Object.entries(actionCounts).sort((a, b) => b[1] - a[1])) {
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(`  ${action}: ${cnt}`);
      }
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold").fillColor("#333333").text("Entity Types Breakdown");
      doc.moveDown(0.3);
      for (const [entity, cnt] of Object.entries(entityCounts).sort((a, b) => b[1] - a[1])) {
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(`  ${entity.replace(/_/g, " ")}: ${cnt}`);
      }

      doc.moveDown(1);
      const chainResult = await storage.verifyAuditChain(orgId, startDate, endDate);
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#333333").text("Chain Integrity Verification");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor(chainResult.valid ? "#006600" : "#cc0000")
        .text(`Status: ${chainResult.valid ? "VERIFIED - No tampering detected" : "ALERT - Chain integrity broken"}`);
      doc.fillColor("#000000").text(`Entries verified: ${chainResult.totalChecked}`);
      if (!chainResult.valid && chainResult.firstBrokenAt) {
        doc.fillColor("#cc0000").text(`First broken entry: ${chainResult.firstBrokenId} at ${formatDate(chainResult.firstBrokenAt)}`);
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor("#999999")
        .text("This report is generated automatically by aok.care and forms part of the organisation's compliance audit trail.", { align: "center" });

      doc.end();

      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "export",
        entityType: "audit_summary",
        eventType: "pdf_export",
        newData: { format: "pdf", period: { startDate, endDate }, totalEntries: total },
      });
    } catch (error) {
      console.error("Error generating summary PDF:", error);
      res.status(500).json({ error: "Failed to generate summary report" });
    }
  });

  app.get("/api/org/reports/summary/csv", requireOrganization, async (req, res) => {
    try {
      const orgId = (req.user as any).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const { entries, total } = await storage.getFilteredAuditTrail(orgId, {
        startDate,
        endDate,
        limit: 10000,
        offset: 0,
      });

      const actionCounts: Record<string, number> = {};
      const entityCounts: Record<string, number> = {};
      for (const e of entries) {
        actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
        entityCounts[e.entityType] = (entityCounts[e.entityType] || 0) + 1;
      }

      let csv = "Audit Trail Summary Report\n";
      csv += `Period: ${formatDate(startDate)} - ${formatDate(endDate)}\n`;
      csv += `Total Entries: ${total}\n\n`;
      csv += "Actions Breakdown\n";
      csv += "Action,Count\n";
      for (const [action, cnt] of Object.entries(actionCounts).sort((a, b) => b[1] - a[1])) {
        csv += `${escapeCSV(action)},${cnt}\n`;
      }
      csv += "\nEntity Types Breakdown\n";
      csv += "Entity Type,Count\n";
      for (const [entity, cnt] of Object.entries(entityCounts).sort((a, b) => b[1] - a[1])) {
        csv += `${escapeCSV(entity)},${cnt}\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="audit-summary-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv"`);
      res.send(csv);

      await storage.createAuditEntry(orgId, {
        userEmail: (req.user as any).email,
        userRole: "organisation",
        action: "export",
        entityType: "audit_summary",
        eventType: "csv_export",
        newData: { format: "csv", period: { startDate, endDate }, totalEntries: total },
      });
    } catch (error) {
      console.error("Error generating summary CSV:", error);
      res.status(500).json({ error: "Failed to generate summary CSV" });
    }
  });
}
