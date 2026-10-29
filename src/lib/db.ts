import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import mysql from "mysql2/promise";
// Dual-mode DB layer (28 Oct 2026, Business plan MySQL migration).
// - No MYSQL_* env: local SQLite (dev.db), synchronous, unchanged behaviour.
// - MYSQL_HOST/USER/PASSWORD/DATABASE set: Hostinger MySQL via mysql2/promise.
//   All app code must use the ASYNC helpers (rowAsync/allAsync/runAsync/withTx)
//   — MySQL is async-only, and the async helpers work identically on SQLite
//   (they just wrap the sync calls), so one code path serves both backends.
// The old sync row/all/run/db are kept only for the local seed script and
// for code not yet converted; new code must not use them.
// MySQL schema: prisma/schema-mysql.sql. Dates are stored as ISO strings
// in VARCHAR columns in MySQL (same as SQLite TEXT), so string comparisons
// (createdAt < cutoff, ORDER BY createdAt DESC) and new Date(value) work
// identically on both backends, with no DATETIME conversion layer.
const file = process.env.DATABASE_FILE || path.join(process.cwd(), "dev.db");
let _db: DatabaseSync | null = null;
export function db(): DatabaseSync {
  if (_db) return _db;
  const d = new DatabaseSync(file);
  d.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, slug TEXT UNIQUE, name TEXT, parentId TEXT, description TEXT);
  CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, slug TEXT UNIQUE, name TEXT, type TEXT, categoryId TEXT, description TEXT, material TEXT, printTechnique TEXT, pattern TEXT, color TEXT, widthCm INTEGER, gsm INTEGER, pricePaise INTEGER, minCm INTEGER, maxCm INTEGER, incrementCm INTEGER, tiersJson TEXT, image TEXT, washCare TEXT, origin TEXT, isActive INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY, productId TEXT, name TEXT, dimensions TEXT, includes TEXT, pricePaise INTEGER, stock INTEGER);
  CREATE TABLE IF NOT EXISTS fabric_rolls(id TEXT PRIMARY KEY, productId TEXT, rollCode TEXT, lot TEXT, originalCm INTEGER, remainingCm INTEGER, warehouse TEXT);
  CREATE TABLE IF NOT EXISTS coupons(id TEXT PRIMARY KEY, code TEXT UNIQUE, percentOff INTEGER, flatPaise INTEGER, minSubtotalPaise INTEGER, active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, number TEXT UNIQUE, userId TEXT, status TEXT, subtotalPaise INTEGER, discountPaise INTEGER, taxPaise INTEGER, shippingPaise INTEGER, totalPaise INTEGER, paymentMethod TEXT, paymentStatus TEXT, addressJson TEXT, pincode TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS order_items(id TEXT PRIMARY KEY, orderId TEXT, productId TEXT, nameSnapshot TEXT, sku TEXT, unitPricePaise INTEGER, quantityCm INTEGER, quantity INTEGER, totalPaise INTEGER, cutInstructions TEXT, rollId TEXT);
  CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY, productId TEXT, author TEXT, rating INTEGER, body TEXT, verified INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS wholesale_inquiries(id TEXT PRIMARY KEY, businessName TEXT, contactName TEXT, email TEXT, gstin TEXT, message TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS subscribers(id TEXT PRIMARY KEY, email TEXT UNIQUE, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE, passwordHash TEXT, name TEXT, role TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS audit_log(id TEXT PRIMARY KEY, actor TEXT, action TEXT, detail TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, userId TEXT, expiresAt TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS addresses(id TEXT PRIMARY KEY, userId TEXT, name TEXT, line1 TEXT, city TEXT, state TEXT, pincode TEXT, phone TEXT, isDefault INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS email_verifications(token TEXT PRIMARY KEY, userId TEXT, expiresAt TEXT);
  CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY, userId TEXT, expiresAt TEXT, used INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS deletion_requests(id TEXT PRIMARY KEY, userId TEXT, reason TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY, orderNumber TEXT, event TEXT, payloadJson TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS refunds(id TEXT PRIMARY KEY, orderId TEXT, orderNumber TEXT, amountPaise INTEGER, reason TEXT, status TEXT, providerRefundId TEXT, razorpayPaymentId TEXT, error TEXT, createdAt TEXT, processedAt TEXT);
  CREATE TABLE IF NOT EXISTS shipments(id TEXT PRIMARY KEY, orderId TEXT, orderNumber TEXT UNIQUE, bigshipOrderId TEXT, courierId TEXT, courierName TEXT, awb TEXT, referenceNumber TEXT, status TEXT, trackingJson TEXT, createdAt TEXT, updatedAt TEXT);
  CREATE TABLE IF NOT EXISTS returns(id TEXT PRIMARY KEY, orderId TEXT, orderNumber TEXT, userId TEXT, reason TEXT, detail TEXT, photoUrl TEXT, status TEXT, adminNote TEXT, refundIntentId TEXT, createdAt TEXT, updatedAt TEXT);`);
  try { d.exec("ALTER TABLE orders ADD COLUMN providerOrderId TEXT"); } catch {}
  try { d.exec("ALTER TABLE orders ADD COLUMN razorpayPaymentId TEXT"); } catch {}
  _db = d; return d;
}
export function row<T>(sql: string, ...p: unknown[]): T | undefined { return db().prepare(sql).get(...(p as never[])) as T | undefined; }
export function all<T>(sql: string, ...p: unknown[]): T[] { return db().prepare(sql).all(...(p as never[])) as T[]; }
export function run(sql: string, ...p: unknown[]) { return db().prepare(sql).run(...(p as never[])); }
export function uid(prefix = ""): string { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---- Async dual-mode layer ----
export function useMysql(): boolean {
  return !!(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE);
}
let pool: mysql.Pool | null = null;
function mysqlPool(): mysql.Pool {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
    waitForConnections: true, connectionLimit: 10, queueLimit: 0, connectTimeout: 15000,
  });
  return pool;
}
// Only SQLite-specific syntax in this codebase, translated for MySQL:
// INSERT OR IGNORE -> INSERT IGNORE, INSERT OR REPLACE -> REPLACE INTO.
// Everything else (including ? placeholders) is identical.
function translate(sql: string): string {
  return sql.replace(/INSERT OR IGNORE/gi, "INSERT IGNORE").replace(/INSERT OR REPLACE/gi, "REPLACE INTO");
}
export type RunResult = { changes: number; lastInsertRowid: number | bigint };
export async function rowAsync<T>(sql: string, ...p: unknown[]): Promise<T | undefined> {
  if (useMysql()) {
    const [rows] = await mysqlPool().execute(translate(sql), p as never[]);
    const r = (rows as Record<string, unknown>[])[0];
    return r ? (JSON.parse(JSON.stringify(r)) as T) : undefined;
  }
  const r = row<T>(sql, ...p);
  return r ? (JSON.parse(JSON.stringify(r)) as T) : undefined;
}
export async function allAsync<T>(sql: string, ...p: unknown[]): Promise<T[]> {
  if (useMysql()) {
    const [rows] = await mysqlPool().execute(translate(sql), p as never[]);
    return JSON.parse(JSON.stringify(rows)) as T[];
  }
  return JSON.parse(JSON.stringify(all<T>(sql, ...p))) as T[];
}
export async function runAsync(sql: string, ...p: unknown[]): Promise<RunResult> {
  if (useMysql()) {
    const [res] = await mysqlPool().execute(translate(sql), p as never[]);
    const h = res as mysql.ResultSetHeader;
    return { changes: h.affectedRows ?? 0, lastInsertRowid: h.insertId ?? 0 };
  }
  const r = run(sql, ...p) as { changes: number; lastInsertRowid: number | bigint };
  return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
}
export type Tx = { row: typeof rowAsync; all: typeof allAsync; run: typeof runAsync };
export async function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (useMysql()) {
    const conn = await mysqlPool().getConnection();
    const tx: Tx = {
      row: async <U>(sql: string, ...p: unknown[]) => {
        const [rows] = await conn.execute(translate(sql), p as never[]);
        const r = (rows as Record<string, unknown>[])[0];
        return r ? (JSON.parse(JSON.stringify(r)) as U) : undefined;
      },
      all: async <U>(sql: string, ...p: unknown[]) => {
        const [rows] = await conn.execute(translate(sql), p as never[]);
        return JSON.parse(JSON.stringify(rows)) as U[];
      },
      run: async (sql: string, ...p: unknown[]) => {
        const [res] = await conn.execute(translate(sql), p as never[]);
        const h = res as mysql.ResultSetHeader;
        return { changes: h.affectedRows ?? 0, lastInsertRowid: h.insertId ?? 0 };
      },
    };
    try { await conn.beginTransaction(); const out = await fn(tx); await conn.commit(); return out; }
    catch (e) { try { await conn.rollback(); } catch {} throw e; }
    finally { conn.release(); }
  }
  // SQLite: same connection, so BEGIN/COMMIT around the sync calls works.
  const d = db(); d.exec("BEGIN IMMEDIATE");
  const tx: Tx = { row: rowAsync, all: allAsync, run: runAsync };
  try { const out = await fn(tx); d.exec("COMMIT"); return out; }
  catch (e) { try { d.exec("ROLLBACK"); } catch {} throw e; }
}
