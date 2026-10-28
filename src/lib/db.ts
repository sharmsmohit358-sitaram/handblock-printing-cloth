import { DatabaseSync } from "node:sqlite";
import path from "node:path";
// Runtime DB: SQLite file next to the project (dev.db). Schema mirrors prisma/schema.prisma.
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
  CREATE TABLE IF NOT EXISTS refunds(id TEXT PRIMARY KEY, orderId TEXT, orderNumber TEXT, amountPaise INTEGER, reason TEXT, status TEXT, providerRefundId TEXT, razorpayPaymentId TEXT, error TEXT, createdAt TEXT, processedAt TEXT);`);
  try { d.exec("ALTER TABLE orders ADD COLUMN providerOrderId TEXT"); } catch {}
  try { d.exec("ALTER TABLE orders ADD COLUMN razorpayPaymentId TEXT"); } catch {}
  _db = d; return d;
}
export function row<T>(sql: string, ...p: unknown[]): T | undefined { return db().prepare(sql).get(...(p as never[])) as T | undefined; }
export function all<T>(sql: string, ...p: unknown[]): T[] { return db().prepare(sql).all(...(p as never[])) as T[]; }
export function run(sql: string, ...p: unknown[]) { return db().prepare(sql).run(...(p as never[])); }
export function uid(prefix = ""): string { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
