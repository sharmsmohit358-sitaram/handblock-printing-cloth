// Admin sales reporting — no new tables, just reads of orders,
// order_items, refunds, rolls and variants that already exist.
// Dates are ISO strings in VARCHAR on both SQLite and MySQL, so
// SUBSTR(createdAt,1,10) gives the day on both, and string comparison
// against an ISO cutoff works on both. The pure summarizers below are
// tested without a DB; getReport() only fetches rows and calls them.
import { allAsync, rowAsync } from "./db";
export type OrderRow = { status: string; totalPaise: number; createdAt: string };
export function summarizeByStatus(orders: OrderRow[]) {
  const m = new Map<string, { n: number; s: number }>();
  for (const o of orders) { const e = m.get(o.status) || { n: 0, s: 0 }; e.n++; e.s += o.totalPaise || 0; m.set(o.status, e); }
  return [...m.entries()].map(([status, v]) => ({ status, ...v })).sort((a, b) => b.n - a.n);
}
export function summarizeByDay(orders: OrderRow[], days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const m = new Map<string, { n: number; s: number }>();
  for (const o of orders) { const d = (o.createdAt || "").slice(0, 10); if (d < cutoff) continue; const e = m.get(d) || { n: 0, s: 0 }; e.n++; e.s += o.totalPaise || 0; m.set(d, e); }
  return [...m.entries()].map(([day, v]) => ({ day, ...v })).sort((a, b) => b.day.localeCompare(a.day));
}
export function dailyCutoffIso(days = 30): string { return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString(); }
export async function getReport() {
  const orders = await allAsync<OrderRow>("SELECT status,totalPaise,createdAt FROM orders");
  const nonCancelled = orders.filter(o => o.status !== "CANCELLED");
  const paid = orders.filter(o => o.status !== "CANCELLED" && o.status !== "REFUNDED");
  const top = await allAsync<{ nameSnapshot: string; s: number; n: number }>("SELECT nameSnapshot, COALESCE(SUM(totalPaise),0) s, COUNT(*) n FROM order_items GROUP BY nameSnapshot ORDER BY s DESC LIMIT 10");
  const refunds = await allAsync<{ status: string; n: number; s: number }>("SELECT status, COUNT(*) n, COALESCE(SUM(amountPaise),0) s FROM refunds GROUP BY status");
  const refundedRow = await rowAsync<{ s: number }>("SELECT COALESCE(SUM(amountPaise),0) s FROM refunds WHERE status='PROCESSED'");
  const lowRolls = await allAsync<{ name: string; remainingCm: number }>("SELECT p.name, r.remainingCm FROM fabric_rolls r JOIN products p ON p.id=r.productId WHERE r.remainingCm<500 ORDER BY r.remainingCm");
  const lowVariants = await allAsync<{ name: string; stock: number }>("SELECT p.name, v.stock FROM variants v JOIN products p ON p.id=v.productId WHERE v.stock<5 ORDER BY v.stock");
  return {
    totalOrders: orders.length,
    revenuePaise: nonCancelled.reduce((a, o) => a + (o.totalPaise || 0), 0),
    paidOrders: paid.length,
    refundedPaise: refundedRow?.s || 0,
    byStatus: summarizeByStatus(orders),
    byDay: summarizeByDay(orders, 30),
    topProducts: top,
    refundsByStatus: refunds,
    lowRolls, lowVariants,
  };
}
