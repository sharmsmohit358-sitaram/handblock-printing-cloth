import crypto from "node:crypto";
// Provider adapters. Security rules (learned from the amberfabric audit):
// - A browser callback alone never marks an order paid. It must pass HMAC
//   signature verification AND, when Razorpay credentials exist, remote
//   re-validation of the payment (amount, currency, order id, captured status).
// - Webhooks are HMAC-verified and replay-guarded by payment_events.
// - No fake success: without credentials, prepaid checkout is rejected
//   outright (see checkout.ts) instead of creating an "awaiting" order.
export type PaymentAdapterResult = { mode: "cod" | "disabled" | "razorpay"; orderId?: string; message: string };
function timingEqual(a: string, b: string): boolean { const ba = Buffer.from(a), bb = Buffer.from(b); if (ba.length !== bb.length) return false; return crypto.timingSafeEqual(ba, bb); }
export async function createPaymentOrder(totalPaise: number, method: string): Promise<PaymentAdapterResult> {
  if (method === "COD") return { mode: "cod", message: "Cash on delivery selected." };
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) return { mode: "disabled", message: "Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are empty). Choose Cash on Delivery, or configure Razorpay test keys — see docs/RAZORPAY_SANDBOX.md." };
  // 15s timeout: without one, a hung provider call holds the checkout DB
  // transaction open (see createOrder) and blocks every later order.
  let res: Response;
  try { res = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"), "Content-Type": "application/json" }, body: JSON.stringify({ amount: totalPaise, currency: "INR", receipt: "hpc-" + Date.now() }), signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error("Razorpay order creation timed out after 15s (no response from api.razorpay.com). No order was created and no payment was taken."); }
  if (!res.ok) { const body = await res.text().catch(() => ""); throw new Error(`Razorpay order creation failed (${res.status}). No order was created and no payment was taken. Razorpay response: ${body.slice(0, 200)}`); }
  const j = await res.json() as { id: string };
  return { mode: "razorpay", orderId: j.id, message: "Razorpay order created. Complete payment below — the order is only marked paid after signature verification." };
}
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET; if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingEqual(expected, signature);
}
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET; if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingEqual(expected, signature);
}
export async function fetchRazorpayPayment(paymentId: string): Promise<{ id: string; order_id: string; amount: number; currency: string; status: string } | null> {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET; if (!key || !secret) return null;
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64") }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null; return await res.json() as { id: string; order_id: string; amount: number; currency: string; status: string };
}
export type ShipResult = { serviceable: boolean; etaDays: number | null; provider: string; note: string };
export async function checkShipping(pincode: string): Promise<ShipResult> {
  if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
    return { serviceable: true, etaDays: null, provider: "shiprocket (credentials present; live courier check requires a Shiprocket token exchange at deploy time)", note: "Live Shiprocket serviceability is not verified in this build without a token." };
  }
  const ok = /^[1-9][0-9]{5}$/.test(pincode);
  return { serviceable: ok, etaDays: ok ? 5 : null, provider: "local-rule (Shiprocket not configured)", note: ok ? "Estimated 5 days by the local rule. Shiprocket credentials are not set, so this is an estimate, not a courier confirmation." : "Enter a valid 6-digit Indian pincode." };
}
