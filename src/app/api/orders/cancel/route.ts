import { NextResponse } from "next/server";
import { z } from "zod";
import { rowAsync, withTx, uid } from "@/lib/db";
import { userFromCookieHeader, isAdminRequest } from "@/lib/auth";
import { restoreOrderStock } from "@/lib/restore";
import { createRefundIntent } from "@/lib/refunds";
const Body = z.object({ orderNumber: z.string() });
export async function POST(req: Request) {
  const u = await userFromCookieHeader(req.headers.get("cookie")); const admin = isAdminRequest(req);
  const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "Order number is required." }, { status: 400 });
  const o = await rowAsync<{ id: string; userId: string | null; status: string; paymentMethod: string; paymentStatus: string; totalPaise: number }>("SELECT * FROM orders WHERE number=?", p.data.orderNumber); if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (!admin && (!u || o.userId !== u.id)) return NextResponse.json({ ok: false, error: "Only the account that placed this order (or an admin) can cancel it." }, { status: 403 });
  if (o.status !== "PLACED" && o.status !== "CONFIRMED") return NextResponse.json({ ok: false, error: `This order cannot be cancelled in status ${o.status}.` }, { status: 400 });
  try {
    const paid = o.paymentMethod === "PREPAID" && o.paymentStatus === "PAID";
    await withTx(async (tx) => {
      await restoreOrderStock(tx, o.id);
      if (paid) {
        // Paid cancellation creates a durable refund intent only — it does NOT
        // auto-submit to Razorpay. An admin submits the intent from /admin/refunds.
        // Intent is created with tx so it rolls back with the cancellation.
        const intent = await createRefundIntent(p.data.orderNumber, o.totalPaise, "Customer/admin cancellation of a paid order", tx); if (!intent.ok) throw new Error(intent.error || "Could not create refund intent.");
        await tx.run("UPDATE orders SET status='CANCELLED', paymentStatus='REFUND_REQUESTED' WHERE id=?", o.id);
        await tx.run("INSERT INTO audit_log VALUES(?,?,?,?,?)", uid("aud_"), u?.email || "admin", "order_cancelled_refund_intent", p.data.orderNumber, new Date().toISOString());
      } else {
        await tx.run("UPDATE orders SET status='CANCELLED', paymentStatus='CANCELLED' WHERE id=?", o.id);
        await tx.run("INSERT INTO audit_log VALUES(?,?,?,?,?)", uid("aud_"), u?.email || "admin", "order_cancelled", p.data.orderNumber, new Date().toISOString());
      }
    });
    return NextResponse.json({ ok: true, message: paid ? "Order cancelled and stock restored. A full refund intent was recorded for admin submission — no money was moved automatically." : "Order cancelled and stock restored." });
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Cancel failed." }, { status: 400 }); }
}
