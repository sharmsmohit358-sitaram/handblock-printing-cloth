import { allAsync, withTx, type Tx } from "./db";
export function parseRollAllocations(rollId: string | null, quantityCm: number | null): { rollId: string; cm: number }[] {
  if (!rollId) return [];
  if (rollId.includes(":")) return rollId.split(",").map(part => { const [id, cm] = part.split(":"); return { rollId: id, cm: parseInt(cm, 10) || 0 }; }).filter(a => a.rollId && a.cm > 0);
  return quantityCm ? [{ rollId, cm: quantityCm }] : [];
}
// Restore stock for one order. Called with the caller's transaction (tx),
// so stock, status and audit commit or roll back together on both SQLite
// and MySQL. Previously this used the global sync DB inside BEGIN IMMEDIATE.
export async function restoreOrderStock(tx: Tx, orderId: string): Promise<void> {
  const items = await tx.all<{ quantityCm: number | null; quantity: number; cutInstructions: string; rollId: string | null; productId: string }>("SELECT * FROM order_items WHERE orderId=?", orderId);
  for (const it of items) {
    const product = (await tx.all<{ type: string }>("SELECT type FROM products WHERE id=?", it.productId))[0];
    if (product?.type === "FABRIC") { for (const a of parseRollAllocations(it.rollId, it.quantityCm)) await tx.run("UPDATE fabric_rolls SET remainingCm = remainingCm + ? WHERE id=?", a.cm, a.rollId); }
    else if (it.cutInstructions) { await tx.run("UPDATE variants SET stock = stock + ? WHERE id=?", it.quantity || 1, it.cutInstructions); }
  }
}
export async function expireUnpaidPrepaidOrders(maxAgeMinutes = 30): Promise<string[]> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  const orders = await allAsync<{ id: string; number: string }>("SELECT id,number FROM orders WHERE paymentMethod='PREPAID' AND paymentStatus='AWAITING_PAYMENT' AND status='PLACED' AND createdAt < ?", cutoff);
  const expired: string[] = [];
  for (const o of orders) {
    try {
      await withTx(async (tx) => {
        await restoreOrderStock(tx, o.id);
        await tx.run("UPDATE orders SET status='CANCELLED', paymentStatus='EXPIRED' WHERE id=?", o.id);
        await tx.run("INSERT INTO audit_log VALUES(?,?,?,?,?)", "aud_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), "expiry", "unpaid_expired", o.number, new Date().toISOString());
      });
      expired.push(o.number);
    } catch { /* one failed expiry must not stop the rest */ }
  }
  return expired;
}
