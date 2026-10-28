import { NextResponse } from "next/server";
import { z } from "zod";
import { row, run, uid } from "@/lib/db";
import { verifyRazorpaySignature, fetchRazorpayPayment } from "@/lib/payments";
import { audit } from "@/lib/auth";
const Body = z.object({ orderNumber: z.string(), razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() });
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "Missing payment verification fields." }, { status: 400 });
  const o = row<{ id: string; totalPaise: number; paymentMethod: string; paymentStatus: string; providerOrderId: string | null }>("SELECT * FROM orders WHERE number=?", p.data.orderNumber); if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (o.paymentStatus === "PAID") return NextResponse.json({ ok: true, alreadyPaid: true, message: "Order was already marked paid — duplicate verification ignored." });
  if (o.paymentMethod !== "PREPAID") return NextResponse.json({ ok: false, error: "This order is not a prepaid order." }, { status: 400 });
  if (o.providerOrderId && o.providerOrderId !== p.data.razorpay_order_id) return NextResponse.json({ ok: false, error: "Razorpay order id does not match this order." }, { status: 400 });
  if (!verifyRazorpaySignature(p.data.razorpay_order_id, p.data.razorpay_payment_id, p.data.razorpay_signature)) return NextResponse.json({ ok: false, error: "Payment signature verification failed. Order was NOT marked paid." }, { status: 400 });
  // Remote re-validation: signature alone is not enough when credentials exist.
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    const remote = await fetchRazorpayPayment(p.data.razorpay_payment_id);
    if (!remote) return NextResponse.json({ ok: false, error: "Could not re-validate the payment with Razorpay. Order was NOT marked paid." }, { status: 502 });
    if (remote.status !== "captured" || remote.amount !== o.totalPaise || remote.currency !== "INR" || remote.order_id !== p.data.razorpay_order_id) return NextResponse.json({ ok: false, error: "Razorpay payment does not match this order (amount, currency, order or captured status). Order was NOT marked paid." }, { status: 400 });
  }
  // Record the event first, then mark paid, so a failure between the two
  // still leaves a retryable state (INSERT OR IGNORE + alreadyPaid check).
  run("INSERT OR IGNORE INTO payment_events VALUES(?,?,?,?,?)", p.data.razorpay_payment_id, p.data.orderNumber, "verify.captured", JSON.stringify({ razorpay_order_id: p.data.razorpay_order_id }), new Date().toISOString());
  run("UPDATE orders SET paymentStatus='PAID', status='CONFIRMED', razorpayPaymentId=? WHERE number=?", p.data.razorpay_payment_id, p.data.orderNumber);
  audit("payments", "verify_paid", p.data.orderNumber);
  return NextResponse.json({ ok: true, message: "Payment verified and order confirmed." });
}
