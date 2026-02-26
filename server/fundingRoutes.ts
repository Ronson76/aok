import { Express, Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { orgMemberStorage } from "./storage";
import {
  fundingSources,
  fundingTransactions,
  fundingAllocations,
  fundingActivities,
  fundingIncidents,
  fundingAuditEvents,
  users,
} from "@shared/schema";
import { eq, and, isNull, desc, sql, sum } from "drizzle-orm";

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

async function requireFundingFeature(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await getDb().select().from(users).where(eq(users.id, req.userId!));
    const orgUser = rows[0];
    if (!orgUser) {
      return res.status(403).json({ error: "Organisation not found." });
    }
    if (!orgUser.orgFeatureDashboard) {
      return res.status(403).json({ error: "Funding Assurance is not enabled for this account." });
    }
    if (orgUser.orgFeatureDashboardExpiresAt && new Date(orgUser.orgFeatureDashboardExpiresAt) < new Date()) {
      return res.status(403).json({ error: "Funding Assurance access has expired." });
    }
    next();
  } catch (err) {
    console.error("[FUNDING] Feature check failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function writeAudit(organisationId: string, actorUserId: string | undefined, entityType: string, entityId: string, action: string, before: any, after: any) {
  try {
    await getDb().insert(fundingAuditEvents).values({
      organisationId,
      actorUserId: actorUserId || null,
      entityType,
      entityId,
      action,
      before: before || null,
      after: after || null,
    });
  } catch (err) {
    console.error("[FUNDING AUDIT] Failed to write audit event:", err);
  }
}

export function registerFundingRoutes(app: Express) {
  const mw = [requireOrganization, requireFundingFeature];

  app.get("/api/org/funding/sources", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const rows = await getDb()
        .select()
        .from(fundingSources)
        .where(and(eq(fundingSources.organisationId, orgId), isNull(fundingSources.deletedAt)))
        .orderBy(desc(fundingSources.createdAt));
      res.json(rows);
    } catch (err) {
      console.error("[FUNDING] List sources error:", err);
      res.status(500).json({ error: "Failed to list funding sources" });
    }
  });

  app.post("/api/org/funding/sources", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { name, type, restricted, startDate, endDate, totalValue, complianceRules } = req.body;
      const [row] = await getDb()
        .insert(fundingSources)
        .values({
          organisationId: orgId,
          name,
          type,
          restricted: restricted || false,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          totalValue: totalValue || null,
          complianceRules: complianceRules || null,
        })
        .returning();
      await writeAudit(orgId, req.userId, "funding_source", row.id, "CREATE", null, row);
      res.status(201).json(row);
    } catch (err) {
      console.error("[FUNDING] Create source error:", err);
      res.status(500).json({ error: "Failed to create funding source" });
    }
  });

  app.put("/api/org/funding/sources/:id", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { id } = req.params;
      const existing = await getDb()
        .select()
        .from(fundingSources)
        .where(and(eq(fundingSources.id, id), eq(fundingSources.organisationId, orgId), isNull(fundingSources.deletedAt)));
      if (!existing[0]) return res.status(404).json({ error: "Funding source not found" });

      const { name, type, restricted, startDate, endDate, totalValue, complianceRules } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      if (restricted !== undefined) updates.restricted = restricted;
      if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
      if (totalValue !== undefined) updates.totalValue = totalValue;
      if (complianceRules !== undefined) updates.complianceRules = complianceRules;

      const [updated] = await getDb()
        .update(fundingSources)
        .set(updates)
        .where(eq(fundingSources.id, id))
        .returning();
      await writeAudit(orgId, req.userId, "funding_source", id, "UPDATE", existing[0], updated);
      res.json(updated);
    } catch (err) {
      console.error("[FUNDING] Update source error:", err);
      res.status(500).json({ error: "Failed to update funding source" });
    }
  });

  app.get("/api/org/funding/transactions", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const conditions: any[] = [eq(fundingTransactions.organisationId, orgId), isNull(fundingTransactions.deletedAt)];
      if (req.query.sourceId) conditions.push(eq(fundingTransactions.fundingSourceId, req.query.sourceId as string));
      if (req.query.direction) conditions.push(eq(fundingTransactions.direction, req.query.direction as string));

      const rows = await getDb()
        .select({
          id: fundingTransactions.id,
          organisationId: fundingTransactions.organisationId,
          fundingSourceId: fundingTransactions.fundingSourceId,
          amount: fundingTransactions.amount,
          direction: fundingTransactions.direction,
          transactionDate: fundingTransactions.transactionDate,
          reference: fundingTransactions.reference,
          externalApiProvider: fundingTransactions.externalApiProvider,
          externalApiId: fundingTransactions.externalApiId,
          linkedPropertyId: fundingTransactions.linkedPropertyId,
          linkedServiceUserId: fundingTransactions.linkedServiceUserId,
          createdAt: fundingTransactions.createdAt,
          deletedAt: fundingTransactions.deletedAt,
          sourceName: fundingSources.name,
        })
        .from(fundingTransactions)
        .leftJoin(fundingSources, eq(fundingTransactions.fundingSourceId, fundingSources.id))
        .where(and(...conditions))
        .orderBy(desc(fundingTransactions.transactionDate));

      const enriched = await Promise.all(rows.map(async (tx) => {
        const allocSum = await getDb()
          .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingAllocations.allocatedAmount} AS NUMERIC)), 0)` })
          .from(fundingAllocations)
          .where(and(eq(fundingAllocations.transactionId, tx.id), isNull(fundingAllocations.deletedAt)));
        const allocated = parseFloat(allocSum[0]?.total || "0");
        return {
          ...tx,
          sourceName: tx.sourceName || null,
          status: allocated >= parseFloat(tx.amount) ? "FULLY_ALLOCATED" : allocated > 0 ? "PARTIALLY_ALLOCATED" : "UNALLOCATED",
          allocatedAmount: allocated,
        };
      }));

      res.json(enriched);
    } catch (err) {
      console.error("[FUNDING] List transactions error:", err);
      res.status(500).json({ error: "Failed to list transactions" });
    }
  });

  app.post("/api/org/funding/transactions", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { fundingSourceId, amount, direction, transactionDate, reference, externalApiProvider, externalApiId, linkedPropertyId, linkedServiceUserId } = req.body;
      const [row] = await getDb()
        .insert(fundingTransactions)
        .values({
          organisationId: orgId,
          fundingSourceId: fundingSourceId || null,
          amount,
          direction,
          transactionDate: new Date(transactionDate),
          reference,
          externalApiProvider: externalApiProvider || null,
          externalApiId: externalApiId || null,
          linkedPropertyId: linkedPropertyId || null,
          linkedServiceUserId: linkedServiceUserId || null,
        })
        .returning();
      await writeAudit(orgId, req.userId, "funding_transaction", row.id, "CREATE", null, row);
      res.status(201).json(row);
    } catch (err) {
      console.error("[FUNDING] Create transaction error:", err);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.put("/api/org/funding/transactions/:id", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { id } = req.params;
      const existing = await getDb()
        .select()
        .from(fundingTransactions)
        .where(and(eq(fundingTransactions.id, id), eq(fundingTransactions.organisationId, orgId), isNull(fundingTransactions.deletedAt)));
      if (!existing[0]) return res.status(404).json({ error: "Transaction not found" });

      const { fundingSourceId, amount, direction, transactionDate, reference, externalApiProvider, externalApiId, linkedPropertyId, linkedServiceUserId } = req.body;
      const updates: any = {};
      if (fundingSourceId !== undefined) updates.fundingSourceId = fundingSourceId;
      if (amount !== undefined) updates.amount = amount;
      if (direction !== undefined) updates.direction = direction;
      if (transactionDate !== undefined) updates.transactionDate = new Date(transactionDate);
      if (reference !== undefined) updates.reference = reference;
      if (externalApiProvider !== undefined) updates.externalApiProvider = externalApiProvider;
      if (externalApiId !== undefined) updates.externalApiId = externalApiId;
      if (linkedPropertyId !== undefined) updates.linkedPropertyId = linkedPropertyId;
      if (linkedServiceUserId !== undefined) updates.linkedServiceUserId = linkedServiceUserId;

      const [updated] = await getDb()
        .update(fundingTransactions)
        .set(updates)
        .where(eq(fundingTransactions.id, id))
        .returning();
      await writeAudit(orgId, req.userId, "funding_transaction", id, "UPDATE", existing[0], updated);
      res.json(updated);
    } catch (err) {
      console.error("[FUNDING] Update transaction error:", err);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  app.get("/api/org/funding/transactions/:id/allocations", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { id } = req.params;
      const rows = await getDb()
        .select()
        .from(fundingAllocations)
        .where(and(eq(fundingAllocations.organisationId, orgId), eq(fundingAllocations.transactionId, id), isNull(fundingAllocations.deletedAt)))
        .orderBy(desc(fundingAllocations.createdAt));

      const txRows = await getDb()
        .select()
        .from(fundingTransactions)
        .where(and(eq(fundingTransactions.id, id), eq(fundingTransactions.organisationId, orgId)));
      const txAmount = txRows[0] ? parseFloat(txRows[0].amount) : 0;

      const allocatedTotal = rows.reduce((sum, a) => sum + parseFloat(a.allocatedAmount), 0);

      res.json({ allocations: rows, remaining: txAmount - allocatedTotal });
    } catch (err) {
      console.error("[FUNDING] List allocations error:", err);
      res.status(500).json({ error: "Failed to list allocations" });
    }
  });

  app.post("/api/org/funding/allocations", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { transactionId, allocatedToType, allocatedToId, allocatedAmount, allocationDate, notes } = req.body;

      const txRows = await getDb()
        .select()
        .from(fundingTransactions)
        .where(and(eq(fundingTransactions.id, transactionId), eq(fundingTransactions.organisationId, orgId), isNull(fundingTransactions.deletedAt)));
      if (!txRows[0]) return res.status(404).json({ error: "Transaction not found" });

      const existingSum = await getDb()
        .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingAllocations.allocatedAmount} AS NUMERIC)), 0)` })
        .from(fundingAllocations)
        .where(and(eq(fundingAllocations.transactionId, transactionId), isNull(fundingAllocations.deletedAt)));

      const currentTotal = parseFloat(existingSum[0]?.total || "0");
      const newAmount = parseFloat(allocatedAmount);
      const txAmount = parseFloat(txRows[0].amount);

      if (currentTotal + newAmount > txAmount) {
        return res.status(400).json({ error: `Allocation would exceed transaction amount. Available: ${(txAmount - currentTotal).toFixed(2)}` });
      }

      const [row] = await getDb()
        .insert(fundingAllocations)
        .values({
          organisationId: orgId,
          transactionId,
          allocatedToType,
          allocatedToId,
          allocatedAmount,
          allocationDate: new Date(allocationDate),
          createdByUserId: req.userId!,
          notes: notes || null,
        })
        .returning();
      await writeAudit(orgId, req.userId, "funding_allocation", row.id, "CREATE", null, row);
      res.status(201).json(row);
    } catch (err) {
      console.error("[FUNDING] Create allocation error:", err);
      res.status(500).json({ error: "Failed to create allocation" });
    }
  });

  app.get("/api/org/funding/activities", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const rows = await getDb()
        .select()
        .from(fundingActivities)
        .where(and(eq(fundingActivities.organisationId, orgId), isNull(fundingActivities.deletedAt)))
        .orderBy(desc(fundingActivities.startTime));
      res.json(rows);
    } catch (err) {
      console.error("[FUNDING] List activities error:", err);
      res.status(500).json({ error: "Failed to list activities" });
    }
  });

  app.post("/api/org/funding/activities", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { propertyId, serviceUserId, activityType, startTime, endTime, status, safeguardingCoverage, fundingAllocationId } = req.body;
      const [row] = await getDb()
        .insert(fundingActivities)
        .values({
          organisationId: orgId,
          propertyId: propertyId || null,
          serviceUserId: serviceUserId || null,
          activityType,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          status,
          safeguardingCoverage: safeguardingCoverage !== undefined ? safeguardingCoverage : true,
          fundingAllocationId: fundingAllocationId || null,
          createdByUserId: req.userId!,
        })
        .returning();
      await writeAudit(orgId, req.userId, "funding_activity", row.id, "CREATE", null, row);
      res.status(201).json(row);
    } catch (err) {
      console.error("[FUNDING] Create activity error:", err);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.put("/api/org/funding/activities/:id", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { id } = req.params;
      const existing = await getDb()
        .select()
        .from(fundingActivities)
        .where(and(eq(fundingActivities.id, id), eq(fundingActivities.organisationId, orgId), isNull(fundingActivities.deletedAt)));
      if (!existing[0]) return res.status(404).json({ error: "Activity not found" });

      const { status, endTime, safeguardingCoverage, fundingAllocationId } = req.body;
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (endTime !== undefined) updates.endTime = new Date(endTime);
      if (safeguardingCoverage !== undefined) updates.safeguardingCoverage = safeguardingCoverage;
      if (fundingAllocationId !== undefined) updates.fundingAllocationId = fundingAllocationId;

      const [updated] = await getDb()
        .update(fundingActivities)
        .set(updates)
        .where(eq(fundingActivities.id, id))
        .returning();
      await writeAudit(orgId, req.userId, "funding_activity", id, "UPDATE", existing[0], updated);
      res.json(updated);
    } catch (err) {
      console.error("[FUNDING] Update activity error:", err);
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  app.get("/api/org/funding/incidents", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const rows = await getDb()
        .select()
        .from(fundingIncidents)
        .where(and(eq(fundingIncidents.organisationId, orgId), isNull(fundingIncidents.deletedAt)))
        .orderBy(desc(fundingIncidents.occurredAt));
      res.json(rows);
    } catch (err) {
      console.error("[FUNDING] List incidents error:", err);
      res.status(500).json({ error: "Failed to list incidents" });
    }
  });

  app.post("/api/org/funding/incidents", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { propertyId, serviceUserId, severity, description, occurredAt, fundingAllocationId } = req.body;
      const [row] = await getDb()
        .insert(fundingIncidents)
        .values({
          organisationId: orgId,
          propertyId: propertyId || null,
          serviceUserId: serviceUserId || null,
          severity,
          description,
          occurredAt: new Date(occurredAt),
          status: "OPEN",
          fundingAllocationId: fundingAllocationId || null,
          createdByUserId: req.userId!,
        })
        .returning();
      await writeAudit(orgId, req.userId, "funding_incident", row.id, "CREATE", null, row);
      res.status(201).json(row);
    } catch (err) {
      console.error("[FUNDING] Create incident error:", err);
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  app.put("/api/org/funding/incidents/:id", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { id } = req.params;
      const existing = await getDb()
        .select()
        .from(fundingIncidents)
        .where(and(eq(fundingIncidents.id, id), eq(fundingIncidents.organisationId, orgId), isNull(fundingIncidents.deletedAt)));
      if (!existing[0]) return res.status(404).json({ error: "Incident not found" });

      const { status, resolvedAt, description, severity } = req.body;
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (resolvedAt !== undefined) updates.resolvedAt = new Date(resolvedAt);
      if (status === "RESOLVED" && !resolvedAt) updates.resolvedAt = new Date();
      if (description !== undefined) updates.description = description;
      if (severity !== undefined) updates.severity = severity;

      const [updated] = await getDb()
        .update(fundingIncidents)
        .set(updates)
        .where(eq(fundingIncidents.id, id))
        .returning();
      await writeAudit(orgId, req.userId, "funding_incident", id, "UPDATE", existing[0], updated);
      res.json(updated);
    } catch (err) {
      console.error("[FUNDING] Update incident error:", err);
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  app.get("/api/org/funding/dashboard", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const incomingResult = await getDb()
        .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingTransactions.amount} AS NUMERIC)), 0)` })
        .from(fundingTransactions)
        .where(and(
          eq(fundingTransactions.organisationId, orgId),
          eq(fundingTransactions.direction, "INCOMING"),
          isNull(fundingTransactions.deletedAt),
          sql`${fundingTransactions.transactionDate} >= ${startOfMonth}`
        ));

      const outgoingResult = await getDb()
        .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingTransactions.amount} AS NUMERIC)), 0)` })
        .from(fundingTransactions)
        .where(and(
          eq(fundingTransactions.organisationId, orgId),
          eq(fundingTransactions.direction, "OUTGOING"),
          isNull(fundingTransactions.deletedAt),
          sql`${fundingTransactions.transactionDate} >= ${startOfMonth}`
        ));

      const totalIncomingAll = await getDb()
        .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingTransactions.amount} AS NUMERIC)), 0)` })
        .from(fundingTransactions)
        .where(and(
          eq(fundingTransactions.organisationId, orgId),
          eq(fundingTransactions.direction, "INCOMING"),
          isNull(fundingTransactions.deletedAt)
        ));

      const totalAllocated = await getDb()
        .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingAllocations.allocatedAmount} AS NUMERIC)), 0)` })
        .from(fundingAllocations)
        .where(and(
          eq(fundingAllocations.organisationId, orgId),
          isNull(fundingAllocations.deletedAt)
        ));

      const allActivities = await getDb()
        .select()
        .from(fundingActivities)
        .where(and(eq(fundingActivities.organisationId, orgId), isNull(fundingActivities.deletedAt)));

      const totalActivitiesCount = allActivities.length;
      const safeguardedCount = allActivities.filter(a => a.safeguardingCoverage).length;
      const safeguardingCoverage = totalActivitiesCount > 0 ? Math.round((safeguardedCount / totalActivitiesCount) * 100) : 100;

      const openIncidentsResult = await getDb()
        .select({ count: sql<string>`COUNT(*)` })
        .from(fundingIncidents)
        .where(and(
          eq(fundingIncidents.organisationId, orgId),
          eq(fundingIncidents.status, "OPEN"),
          isNull(fundingIncidents.deletedAt)
        ));

      const monthlyData: { month: string; incoming: number; activities: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const label = d.toLocaleString("default", { month: "short", year: "numeric" });

        const mIncoming = await getDb()
          .select({ total: sql<string>`COALESCE(SUM(CAST(${fundingTransactions.amount} AS NUMERIC)), 0)` })
          .from(fundingTransactions)
          .where(and(
            eq(fundingTransactions.organisationId, orgId),
            eq(fundingTransactions.direction, "INCOMING"),
            isNull(fundingTransactions.deletedAt),
            sql`${fundingTransactions.transactionDate} >= ${d}`,
            sql`${fundingTransactions.transactionDate} < ${monthEnd}`
          ));

        const mActivities = await getDb()
          .select({ count: sql<string>`COUNT(*)` })
          .from(fundingActivities)
          .where(and(
            eq(fundingActivities.organisationId, orgId),
            isNull(fundingActivities.deletedAt),
            sql`${fundingActivities.startTime} >= ${d}`,
            sql`${fundingActivities.startTime} < ${monthEnd}`
          ));

        monthlyData.push({
          month: label,
          incoming: parseFloat(mIncoming[0]?.total || "0"),
          activities: parseInt(mActivities[0]?.count || "0", 10),
        });
      }

      res.json({
        totalIncoming: parseFloat(incomingResult[0]?.total || "0"),
        totalOutgoing: parseFloat(outgoingResult[0]?.total || "0"),
        unallocatedFunds: parseFloat(totalIncomingAll[0]?.total || "0") - parseFloat(totalAllocated[0]?.total || "0"),
        safeguardingCoveragePercent: safeguardingCoverage,
        openIncidents: parseInt(openIncidentsResult[0]?.count || "0", 10),
        monthlyData,
      });
    } catch (err) {
      console.error("[FUNDING] Dashboard error:", err);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get("/api/org/funding/risk", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const flags: { key: string; label: string; description: string; severity: string }[] = [];
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const txs = await getDb()
        .select()
        .from(fundingTransactions)
        .where(and(eq(fundingTransactions.organisationId, orgId), isNull(fundingTransactions.deletedAt)));

      const allocs = await getDb()
        .select()
        .from(fundingAllocations)
        .where(and(eq(fundingAllocations.organisationId, orgId), isNull(fundingAllocations.deletedAt)));

      const acts = await getDb()
        .select()
        .from(fundingActivities)
        .where(and(eq(fundingActivities.organisationId, orgId), isNull(fundingActivities.deletedAt)));

      const openIncidents = await getDb()
        .select()
        .from(fundingIncidents)
        .where(and(eq(fundingIncidents.organisationId, orgId), eq(fundingIncidents.status, "OPEN"), isNull(fundingIncidents.deletedAt)));

      const allocTxIds = new Set(allocs.map(a => a.transactionId));
      const unallocatedTxs = txs.filter(t => !allocTxIds.has(t.id) && new Date(t.createdAt) < sevenDaysAgo);
      if (unallocatedTxs.length > 0) {
        flags.push({
          key: "unallocated_transactions",
          label: "Unallocated Transactions",
          description: `${unallocatedTxs.length} transaction(s) with no allocations after 7 days`,
          severity: "HIGH",
        });
      }

      const allocsWithActivities = new Set(acts.filter(a => a.fundingAllocationId).map(a => a.fundingAllocationId));
      const orphanedAllocs = allocs.filter(a => !allocsWithActivities.has(a.id));
      if (orphanedAllocs.length > 0) {
        flags.push({
          key: "orphaned_allocations",
          label: "Orphaned Allocations",
          description: `${orphanedAllocs.length} allocation(s) with no linked activities`,
          severity: "MEDIUM",
        });
      }

      const unlinkedActivities = acts.filter(a => !a.fundingAllocationId);
      if (unlinkedActivities.length > 0) {
        flags.push({
          key: "unlinked_activities",
          label: "Unlinked Activities",
          description: `${unlinkedActivities.length} activit${unlinkedActivities.length === 1 ? "y" : "ies"} with no linked allocation`,
          severity: "MEDIUM",
        });
      }

      const totalActs = acts.length;
      const safeguarded = acts.filter(a => a.safeguardingCoverage).length;
      const coverage = totalActs > 0 ? (safeguarded / totalActs) * 100 : 100;
      if (coverage < 95) {
        flags.push({
          key: "low_safeguarding",
          label: "Low Safeguarding Coverage",
          description: `Safeguarding coverage is ${coverage.toFixed(1)}% (below 95% threshold)`,
          severity: "CRITICAL",
        });
      }

      const oldIncidents = openIncidents.filter(i => new Date(i.occurredAt) < fourteenDaysAgo);
      if (oldIncidents.length > 0) {
        flags.push({
          key: "stale_incidents",
          label: "Stale Open Incidents",
          description: `${oldIncidents.length} open incident(s) older than 14 days`,
          severity: "HIGH",
        });
      }

      let complianceScore = 100;
      if (unallocatedTxs.length > 0) complianceScore -= 15;
      if (orphanedAllocs.length > 0) complianceScore -= 10;
      if (unlinkedActivities.length > 0) complianceScore -= 10;
      if (coverage < 95) complianceScore -= 20;
      if (oldIncidents.length > 0) complianceScore -= 15;
      complianceScore = Math.max(0, complianceScore);

      res.json({ flags, complianceScore });
    } catch (err) {
      console.error("[FUNDING] Risk assessment error:", err);
      res.status(500).json({ error: "Failed to compute risk assessment" });
    }
  });

  app.get("/api/org/funding/audit-export", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const { startDate, endDate } = req.query;

      const conditions: any[] = [eq(fundingAuditEvents.organisationId, orgId)];
      if (startDate) conditions.push(sql`${fundingAuditEvents.createdAt} >= ${new Date(startDate as string)}`);
      if (endDate) conditions.push(sql`${fundingAuditEvents.createdAt} <= ${new Date(endDate as string)}`);

      const events = await getDb()
        .select()
        .from(fundingAuditEvents)
        .where(and(...conditions))
        .orderBy(desc(fundingAuditEvents.createdAt));

      const header = "id,organisationId,actorUserId,entityType,entityId,action,createdAt\n";
      const rows = events.map(e =>
        `"${e.id}","${e.organisationId}","${e.actorUserId || ""}","${e.entityType}","${e.entityId}","${e.action}","${e.createdAt.toISOString()}"`
      ).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="funding-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(header + rows);
    } catch (err) {
      console.error("[FUNDING] Audit export error:", err);
      res.status(500).json({ error: "Failed to export audit data" });
    }
  });

  app.post("/api/org/funding/simulate-import", ...mw, async (req: Request, res: Response) => {
    try {
      const orgId = req.userId!;
      const demoTransactions = [];
      for (let i = 0; i < 5; i++) {
        const txDate = new Date();
        txDate.setDate(txDate.getDate() - i * 3);
        const amount = (1000 + Math.random() * 4000).toFixed(2);
        const [row] = await getDb()
          .insert(fundingTransactions)
          .values({
            organisationId: orgId,
            fundingSourceId: null,
            amount,
            direction: i % 2 === 0 ? "INCOMING" : "OUTGOING",
            transactionDate: txDate,
            reference: `TL-DEMO-${Date.now()}-${i}`,
            externalApiProvider: "TrueLayer",
            externalApiId: `tl_${Date.now()}_${i}`,
          })
          .returning();
        await writeAudit(orgId, req.userId, "funding_transaction", row.id, "CREATE", null, { ...row, simulated: true });
        demoTransactions.push(row);
      }
      res.status(201).json({ imported: demoTransactions.length, transactions: demoTransactions });
    } catch (err) {
      console.error("[FUNDING] Simulate import error:", err);
      res.status(500).json({ error: "Failed to simulate import" });
    }
  });
}
