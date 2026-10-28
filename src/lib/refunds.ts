import { row, run, uid } from "./db";
export function applyRefundToOrder(orderId: string): void {
  const order = row<{ totalPaise: number }>("SELECT totalPaise FROM orders WHERE id=?", orderId); if (!order) return;
  const refunded = row<{ s: number }>("SELECT COALESCE(SUM(amountPaise),0) s FROM refunds WHERE orderId=? AND status='PROCESSED'", orderId)?.s || 0;
  if (refunded >= order.totalPaise) { const cur = row<{ status: string }>("SELECT status FROM orders WHERE id=?", orderId); if (cur?.status === "CANCELLED") run("UPDATE orders SET paymentStatus='REFUNDED' WHERE id=?", orderId); else run("UPDATE orders SET status='REFUNDED', paymentStatus='REFUNDED' WHERE id=?", orderId); }
  else run("UPDATE orders SET paymentStatus='PARTIALLY_REFUNDED' WHERE id=?", orderId);
}
export async function submitRefundIntent(refundId: string): Promise<{ ok: boolean; status: string; message: string }> {
  const r = row<{ id: string; orderId: string; orderNumber: string; amountPaise: number; razorpayPaymentId: string | null; status: string }>("SELECT * FROM refunds WHERE id=?", refundId); if (!r) return { ok: false, status: "NOT_FOUND", message: "Refund not found." };
  if (r.status === "PROCESSED") return { ok: true, status: "PROCESSED", message: "Refund was already processed — not submitted twice." };
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret || !r.razorpayPaymentId) { run("UPDATE refunds SET status='MANUAL_PENDING', error='Razorpay not configured or no Razorpay payment id on file' WHERE id=?", refundId); return { ok: true, status: "MANUAL_PENDING", message: "Refund recorded for manual processing. No money was moved by Razorpay because keys or a payment id are missing." }; }
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(r.razorpayPaymentId)}/refund`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"), "Content-Type": "application/json" }, body: JSON.stringify({ amount: r.amountPaise }) });
  if (!res.ok) { const body = await res.text().catch(() => ""); run("UPDATE refunds SET status='FAILED', error=? WHERE id=?", body.slice(0, 500), refundId); return { ok: false, status: "FAILED", message: `Razorpay refund failed (${res.status}). The intent is kept for retry; no duplicate is created.` }; }
  const j = await res.json() as { id: string };
  run("UPDATE refunds SET status='PROCESSED', providerRefundId=?, processedAt=? WHERE id=?", j.id, new Date().toISOString(), refundId);
  applyRefundToOrder(r.orderId);
  return { ok: true, status: "PROCESSED", message: "Refund processed via Razorpay." };
}
export function createRefundIntent(orderNumber: string, amountPaise: number, reason: string): { ok: boolean; id?: string; error?: string } {
  const o = row<{ id: string; totalPaise: number; paymentStatus: string; razorpayPaymentId: string | null }>("SELECT * FROM orders WHERE number=?", orderNumber); if (!o) return { ok: false, error: "Order not found." };
  if (o.paymentStatus !== "PAID" && o.paymentStatus !== "PARTIALLY_REFUNDED") return { ok: false, error: `Only paid orders can be refunded (this order is ${o.paymentStatus}).` };
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { ok: false, error: "Refund amount must be a positive number of paise." };
  const refunded = row<{ s: number }>("SELECT COALESCE(SUM(amountPaise),0) s FROM refunds WHERE orderId=? AND status IN ('PROCESSED','REQUESTED','MANUAL_PENDING')", o.id)?.s || 0;
  if (refunded + amountPaise > o.totalPaise) return { ok: false, error: `Refund would exceed the order total. Already refunded/intended: ${refunded} paise of ${o.totalPaise}.` };
  const id = uid("ref_"); run("INSERT INTO refunds VALUES(?,?,?,?,?,?,?,?,?,?,?)", id, o.id, orderNumber, amountPaise, reason || "", "REQUESTED", null, o.razorpayPaymentId, null, new Date().toISOString(), null);
  return { ok: true, id };
}
