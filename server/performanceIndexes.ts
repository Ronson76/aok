import { ensureDb } from "./db";
import { sql } from "drizzle-orm";

export async function ensurePerformanceIndexes(): Promise<void> {
  try {
    const db = ensureDb();

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_check_ins_user_timestamp ON check_ins(user_id, timestamp DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_check_ins_missed ON check_ins(user_id) WHERE status = 'missed'`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_emergency_alerts_active ON active_emergency_alerts(is_active, activated_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user ON active_emergency_alerts(user_id, is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_org_clients_org ON organization_clients(organization_id, client_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_mood_entries_user ON mood_entries(user_id, created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id, created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_archived ON users(archived_at) WHERE archived_at IS NOT NULL`);

    console.log("Performance indexes ensured successfully");
  } catch (error) {
    console.error("Failed to ensure performance indexes:", error);
  }
}
