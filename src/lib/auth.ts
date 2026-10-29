import crypto from "node:crypto";
import { rowAsync, runAsync, uid } from "./db";
export type SessionUser = { id: string; email: string; name: string; role: string };
export function hashPassword(pw: string): string { const salt = crypto.randomBytes(16).toString("hex"); const hash = crypto.scryptSync(pw, salt, 64).toString("hex"); return `${salt}:${hash}`; }
export function verifyPassword(pw: string, stored: string): boolean { const [salt, hash] = stored.split(":"); if (!salt || !hash) return false; const h = crypto.scryptSync(pw, salt, 64).toString("hex"); return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash)); }
export function randomToken(): string { return crypto.randomBytes(32).toString("hex"); }
export async function createSession(userId: string): Promise<string> { const token = randomToken(); const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); await runAsync("INSERT INTO sessions VALUES(?,?,?,?)", token, userId, exp, new Date().toISOString()); return token; }
export function sessionCookie(token: string): string { return `hpc-session=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
export function clearSessionCookie(): string { return `hpc-session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`; }
export async function userFromCookieHeader(header: string | null): Promise<SessionUser | null> {
  if (!header) return null; const m = header.match(/(?:^|;\s*)hpc-session=([^;]+)/); if (!m) return null;
  const s = await rowAsync<{ userId: string; expiresAt: string }>("SELECT * FROM sessions WHERE token=?", m[1]); if (!s || new Date(s.expiresAt) < new Date()) return null;
  return (await rowAsync<SessionUser>("SELECT id,email,name,role FROM users WHERE id=?", s.userId)) || null;
}
export function isAdminRequest(req: Request): boolean { const expected = process.env.ADMIN_TOKEN || ""; if (!expected) return false; const h = req.headers.get("cookie") || ""; const m = h.match(/(?:^|;\s*)hpc-admin=([^;]+)/); return !!m && m[1] === expected; }
// Email verification is tracked by absence of a pending token + a verified flag table.
// Simpler, explicit model: a user is verified when they have no pending verification
// AND a verification record exists in audit_log. To avoid ambiguity, we store verified
// state in a dedicated table created lazily:
export async function markVerified(userId: string) { try { await runAsync("CREATE TABLE IF NOT EXISTS verified_users(userId VARCHAR(64) PRIMARY KEY)"); } catch {} await runAsync("INSERT OR IGNORE INTO verified_users VALUES(?)", userId); }
export async function checkVerified(userId: string): Promise<boolean> { try { const r = await rowAsync<{ n: number }>("SELECT COUNT(*) n FROM verified_users WHERE userId=?", userId); return (r?.n || 0) > 0; } catch { return false; } }
// In-memory per-instance rate limit (not a substitute for a shared limiter in production).
const attempts = new Map<string, number[]>();
export function rateLimit(key: string, limit = 10, windowMs = 60000): boolean { const now = Date.now(); const arr = (attempts.get(key) || []).filter(t => now - t < windowMs); if (arr.length >= limit) return false; arr.push(now); attempts.set(key, arr); return true; }
export async function audit(actor: string, action: string, detail: string) { await runAsync("INSERT INTO audit_log VALUES(?,?,?,?,?)", uid("aud_"), actor, action, detail, new Date().toISOString()); }
