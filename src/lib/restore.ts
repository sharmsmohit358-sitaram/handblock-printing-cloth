import { db, all, run } from "./db";
// Parse the roll allocation stored on an order_item.
// Single cut: rollId is one roll id. Split cut: "rollId:cm,rollId:cm".
export function parseRollAllocations(rollId: string | null, quantityCm: number | null): { rollId: string; cm: number }[] {
  if (!rollId) return [];
  if (rollId.includes(":")) return rollId.split(",").map(part => { const [id, cm] = part.split(":"); return { rollId: id, cm: parseInt(cm, 10) || 0 }; }).filter(a => a.rollId && a.cm > 0);
  return quantityCm ? [{ rollId, cm: quantityCm }] : [];
}
// Restore stock for one order. Must be called inside a transaction owned by the caller.
export function restoreOrderStock(orderId: string): void {
  const items = all<{ quantityCm: number | null; quantity: number; cutInstructions: string; rollId: string | null; productId: string }>("SELECT * FROM order_items WHERE orderId=?", orderId);
  for (const it of items) {
    const product = all<{ type: string }>("SELECT type FROM products WHERE id=?", it.productId)[0];
    if (product?.type === "FABRIC") { for (const a of parseRollAllocations(it.rollId, it.quantityCm)) run("UPDATE fabric_rolls SET remainingCm = remainingCm + ? WHERE id=?", a.cm, a.rollId); }
    else if (it.cutInstructions) { run("UPDATE variants SET stock = stock + ? WHERE id=?", it.quantity || 1, it.cutInstructions); }
  }
}
export function expireUnpaidPrepaidOrders(maxAgeMinutes = 30): string[] {
  const d = db(); const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  const orders = all<{ id: string; number: string }>("SELECT id,number FROM orders WHERE paymentMethod='PREPAID' AND paymentStatus='AWAITING_PAYMENT' AND status='PLACED' AND createdAt < ?", cutoff);
  const expired: string[] = [];
  for (const o of orders) { d.exec("BEGIN IMMEDIATE"); try { restoreOrderStock(o.id); run("UPDATE orders SET status='CANCELLED', paymentStatus='EXPIRED' WHERE id=?", o.id); run("INSERT INTO audit_log VALUES(?,?,?,?,?)", "aud_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), "expiry", "unpaid_expired", o.number, new Date().toISOString()); d.exec("COMMIT"); expired.push(o.number); } catch { try { d.exec("ROLLBACK"); } catch {} } }
  return expired;
}
