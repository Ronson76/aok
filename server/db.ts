import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Only create pool if DATABASE_URL exists (deferred for build time)
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null!;

export function ensureDb() {
  if (!db) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return db;
}

export const getDb = ensureDb;
