import { NextResponse } from "next/server";
import { z } from "zod";
import { db, row, run, uid } from "@/lib/db";
import { userFromCookieHeader, isAdminRequest, audit } from "@/lib/auth";
import { restoreOrderStock } from "@/lib/restore";
import { createRefundIntent } from "@/lib/refunds";
const Body = z.object({ orderNumber: z.string() });
export async function POST(req: Request) {
  const u = userFromCookieHeader(req.headers.get("cookie")); const admin = isAdminRequest(req);
  const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "Order number is required." }, { status: 400 });
  const o = row<{ id: string; userId: string | null; status: string; paymentMethod: string; paymentStatus: string; totalPaise: number }>("SELECT * FROM orders WHERE number=?", p.data.orderNumber); if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (!admin && (!u || o.userId !== u.id)) return NextResponse.json({ ok: false, error: "Only the account that placed this order (or an admin) can cancel it." }, { status: 403 });
  if (o.status !== "PLACED" && o.status !== "CONFIRMED") return NextResponse.json({ ok: false, error: `This order cannot be cancelled in status ${o.status}.` }, { status: 400 });
  const d = db(); d.exec("BEGIN IMMEDIATE");
  try {
    restoreOrderStock(o.id);
    if (o.paymentMethod === "PREPAID" && o.paymentStatus === "PAID") {
      // Paid cancellation creates a durable refund intent only — it does NOT
      // auto-submit to Razorpay. An admin submits the intent from /admin/refunds.
      const intent = createRefundIntent(p.data.orderNumber, o.totalPaise, "Customer/admin cancellation of a paid order"); if (!intent.ok) throw new Error(intent.error || "Could not create refund intent.");
      run("UPDATE orders SET status='CANCELLED', paymentStatus='REFUND_REQUESTED' WHERE id=?", o.id);
      audit(u?.email || "admin", "order_cancelled_refund_intent", p.data.orderNumber);
      d.exec("COMMIT"); return NextResponse.json({ ok: true, message: "Order cancelled and stock restored. A full refund intent was recorded for admin submission — no money was moved automatically." });
    }
    run("UPDATE orders SET status='CANCELLED', paymentStatus='CANCELLED' WHERE id=?", o.id); audit(u?.email || "admin", "order_cancelled", p.data.orderNumber); d.exec("COMMIT");
    return NextResponse.json({ ok: true, message: "Order cancelled and stock restored." });
  } catch (e) { try { d.exec("ROLLBACK"); } catch {} return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Cancel failed." }, { status: 400 }); }
}
