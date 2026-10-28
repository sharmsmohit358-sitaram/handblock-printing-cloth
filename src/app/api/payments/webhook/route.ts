import { NextResponse } from "next/server";
import { row, run, uid } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payments";
import { audit } from "@/lib/auth";
export async function POST(req: Request) {
  const raw = await req.text(); const sig = req.headers.get("x-razorpay-signature");
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return NextResponse.json({ ok: false, error: "Webhook secret is not configured." }, { status: 500 });
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 400 });
  const body = JSON.parse(raw) as { event: string; created_at?: number; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; currency: string; status: string } } } };
  const pay = body.payload?.payment?.entity; if (!pay) return NextResponse.json({ ok: true, ignored: true });
  const eventId = `${body.event}:${pay.id}:${body.created_at || ""}`;
  const inserted = run("INSERT OR IGNORE INTO payment_events VALUES(?,?,?,?,?)", eventId, null, body.event, raw.slice(0, 2000), new Date().toISOString());
  if ((inserted as { changes?: number }).changes === 0) return NextResponse.json({ ok: true, duplicate: true, message: "Duplicate webhook ignored." });
  const o = row<{ number: string; totalPaise: number; paymentStatus: string }>("SELECT * FROM orders WHERE providerOrderId=?", pay.order_id); if (!o) { audit("payments", "webhook_unknown_order", pay.order_id); return NextResponse.json({ ok: true, ignored: true, message: "No local order for this Razorpay order id." }); }
  run("UPDATE payment_events SET orderNumber=? WHERE id=?", o.number, eventId);
  if (body.event === "payment.captured") {
    if (pay.amount !== o.totalPaise || pay.currency !== "INR") { audit("payments", "webhook_amount_mismatch", o.number); return NextResponse.json({ ok: true, ignored: true, message: "Amount/currency mismatch — order NOT marked paid." }); }
    run("UPDATE orders SET paymentStatus='PAID', status='CONFIRMED', razorpayPaymentId=? WHERE number=?", pay.id, o.number); audit("payments", "webhook_paid", o.number);
  } else if (body.event === "payment.failed") {
    if (o.paymentStatus !== "PAID") run("UPDATE orders SET paymentStatus='FAILED' WHERE number=?", o.number); audit("payments", "webhook_failed", o.number);
  }
  return NextResponse.json({ ok: true });
}
