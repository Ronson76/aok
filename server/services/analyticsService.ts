import { sql } from "drizzle-orm";
import { ensureDb } from "../db";
import { analyticsLogger } from "../logger";

const orderedDays = [
  { day: "Mon", dow: 1 },
  { day: "Tue", dow: 2 },
  { day: "Wed", dow: 3 },
  { day: "Thu", dow: 4 },
  { day: "Fri", dow: 5 },
  { day: "Sat", dow: 6 },
  { day: "Sun", dow: 0 },
];

function buildHourlyData(rows: any[]): { hour: number; count: number }[] {
  return Array.from({ length: 24 }, (_, i) => {
    const row = rows.find((r: any) => Number(r.hour) === i);
    return { hour: i, count: row ? Number(row.count) : 0 };
  });
}

function buildDailyData(rows: any[]): { day: string; count: number }[] {
  return orderedDays.map(({ day, dow }) => {
    const row = rows.find((r: any) => Number(r.dow) === dow);
    return { day, count: row ? Number(row.count) : 0 };
  });
}

export async function getPeakTimes(orgId?: string) {
  const db = ensureDb();
  const orgFilter = orgId
    ? sql`AND a.user_id IN (SELECT client_id FROM organization_clients WHERE organization_id = ${orgId} AND client_id IS NOT NULL)`
    : sql``;
  const orgFilterCheckins = orgId
    ? sql`AND c.user_id IN (SELECT client_id FROM organization_clients WHERE organization_id = ${orgId} AND client_id IS NOT NULL)`
    : sql``;

  const [alertsByHourResult, alertsByDowResult, missedByHourResult, missedByDowResult] = await Promise.all([
    db.execute(sql`
      SELECT EXTRACT(HOUR FROM a.activated_at)::int AS hour, COUNT(*)::int AS count
      FROM active_emergency_alerts a
      WHERE 1=1 ${orgFilter}
      GROUP BY hour ORDER BY hour
    `),
    db.execute(sql`
      SELECT EXTRACT(DOW FROM a.activated_at)::int AS dow, COUNT(*)::int AS count
      FROM active_emergency_alerts a
      WHERE 1=1 ${orgFilter}
      GROUP BY dow ORDER BY dow
    `),
    db.execute(sql`
      SELECT EXTRACT(HOUR FROM c.timestamp)::int AS hour, COUNT(*)::int AS count
      FROM check_ins c
      WHERE c.status = 'missed' ${orgFilterCheckins}
      GROUP BY hour ORDER BY hour
    `),
    db.execute(sql`
      SELECT EXTRACT(DOW FROM c.timestamp)::int AS dow, COUNT(*)::int AS count
      FROM check_ins c
      WHERE c.status = 'missed' ${orgFilterCheckins}
      GROUP BY dow ORDER BY dow
    `),
  ]);

  const alertsHourRows = (alertsByHourResult as any).rows || [];
  const alertsDowRows = (alertsByDowResult as any).rows || [];
  const missedHourRows = (missedByHourResult as any).rows || [];
  const missedDowRows = (missedByDowResult as any).rows || [];

  analyticsLogger.info({ orgId: orgId || "admin" }, "Peak times analytics fetched");

  return {
    alertsByHour: buildHourlyData(alertsHourRows),
    alertsByDay: buildDailyData(alertsDowRows),
    missedByHour: buildHourlyData(missedHourRows),
    missedByDay: buildDailyData(missedDowRows),
  };
}

export async function getAlertHeatmap(orgId?: string) {
  const db = ensureDb();
  const orgFilter = orgId
    ? sql`AND a.user_id IN (SELECT client_id FROM organization_clients WHERE organization_id = ${orgId} AND client_id IS NOT NULL)`
    : sql``;

  const result = await db.execute(sql`
    SELECT a.latitude, a.longitude, a.what3words, COUNT(*)::int AS count
    FROM active_emergency_alerts a
    WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL ${orgFilter}
    GROUP BY a.latitude, a.longitude, a.what3words
  `);

  const rows = (result as any).rows || result;
  const points = (rows as any[]).map((r: any) => ({
    lat: parseFloat(r.latitude),
    lng: parseFloat(r.longitude),
    count: Number(r.count),
    ...(r.what3words ? { what3words: r.what3words } : {}),
  }));

  analyticsLogger.info({ orgId: orgId || "admin", pointCount: points.length }, "Alert heatmap data fetched");
  return { points };
}

export async function getActiveSOSAlerts(orgId?: string) {
  const db = ensureDb();

  let result;
  if (orgId) {
    result = await db.execute(sql`
      SELECT
        a.id AS alert_id,
        COALESCE(oc.client_name, u.name) AS client_name,
        COALESCE(oc.client_phone, u.mobile_number) AS client_phone,
        oc.reference_code,
        a.activated_at,
        a.latitude,
        a.longitude,
        a.what3words,
        oc.nickname
      FROM active_emergency_alerts a
      INNER JOIN organization_clients oc ON oc.client_id = a.user_id AND oc.organization_id = ${orgId}
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.is_active = true
      ORDER BY a.activated_at DESC
    `);
  } else {
    result = await db.execute(sql`
      SELECT
        a.id AS alert_id,
        COALESCE(oc.client_name, u.name) AS client_name,
        COALESCE(oc.client_phone, u.mobile_number) AS client_phone,
        oc.reference_code,
        a.activated_at,
        a.latitude,
        a.longitude,
        a.what3words,
        oc.nickname,
        org.name AS org_name
      FROM active_emergency_alerts a
      LEFT JOIN organization_clients oc ON oc.client_id = a.user_id
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN users org ON org.id = oc.organization_id
      WHERE a.is_active = true
      ORDER BY a.activated_at DESC
    `);
  }

  const rows = (result as any).rows || result;
  const alerts = (rows as any[]).map((r: any) => ({
    alertId: r.alert_id,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    referenceCode: r.reference_code,
    activatedAt: r.activated_at,
    latitude: r.latitude,
    longitude: r.longitude,
    what3words: r.what3words,
    nickname: r.nickname,
    ...(r.org_name ? { orgName: r.org_name } : {}),
  }));

  analyticsLogger.info({ orgId: orgId || "admin", activeCount: alerts.length }, "Active SOS alerts fetched");
  return alerts;
}
