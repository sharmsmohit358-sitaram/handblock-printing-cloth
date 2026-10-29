import { NextResponse } from "next/server";
import { z } from "zod";
import { rowAsync, runAsync, allAsync, uid } from "@/lib/db";
import { isAdminRequest, audit } from "@/lib/auth";
import { canTransition } from "@/lib/fulfilment";

// GET (admin): list orders, most recent first.
// POST (admin): move an order to the next fulfilment status.
//   { orderNumber, status, courier?, awb?, note? }
// Guards: transition must be allowed (see fulfilment.ts), cancelled /
// refunded orders cannot be moved, and a manual courier/AWB (for a
// non-Bigship shipment) is stored in shipments so the order page shows it.
// Bigship shipments still go through /api/admin/shipments.
const Body = z.object({ orderNumber: z.string(), status: z.string(), courier: z.string().optional(), awb: z.string().optional(), note: z.string().optional() });

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Admin sign-in required." }, { status: 403 });
  const orders = await allAsync<{ number: string; status: string; totalPaise: number; paymentMethod: string; paymentStatus: string; createdAt: string }>("SELECT number,status,totalPaise,paymentMethod,paymentStatus,createdAt FROM orders ORDER BY createdAt DESC LIMIT 100");
  return NextResponse.json({ ok: true, orders });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Admin sign-in required." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "orderNumber and status are required." }, { status: 400 });
  const o = await rowAsync<{ id: string; number: string; status: string }>("SELECT * FROM orders WHERE number=?", p.data.orderNumber);
  if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (!canTransition(o.status, p.data.status)) {
    return NextResponse.json({ ok: false, error: `Cannot move order from ${o.status} to ${p.data.status}. Allowed from ${o.status}: ${(await import("@/lib/fulfilment")).FULFILMENT_TRANSITIONS[o.status]?.join(", ") || "none"}. Use cancel for cancellations, and /admin/shipments for Bigship AWB.` }, { status: 400 });
  }
  await runAsync("UPDATE orders SET status=? WHERE id=?", p.data.status, o.id);
  if (p.data.status === "SHIPPED" || p.data.status === "DELIVERED") {
    try {
      const full = await rowAsync<{ addressJson: string; userId: string | null; totalPaise: number }>("SELECT addressJson,userId,totalPaise FROM orders WHERE number=?", o.number);
      const addr = JSON.parse(full?.addressJson || "{}") as { email?: string };
      const toEmail = addr.email || (full?.userId ? (await rowAsync<{ email: string }>("SELECT email FROM users WHERE id=?", full.userId))?.email : "") || "";
      if (toEmail) { const { sendEmail, orderEmail } = await import("@/lib/email"); await sendEmail(orderEmail(toEmail, p.data.status === "SHIPPED" ? "shipped" : "delivered", { number: o.number, totalPaise: full?.totalPaise || 0 }, { awb: p.data.awb, courier: p.data.courier })); }
    } catch { /* email failure must not undo a status move */ }
  }
  if (p.data.courier || p.data.awb) {
    const now = new Date().toISOString();
    const existing = await rowAsync<{ id: string }>("SELECT id FROM shipments WHERE orderNumber=?", o.number);
    if (existing) await runAsync("UPDATE shipments SET courierName=?, awb=?, status=?, updatedAt=? WHERE orderNumber=?", p.data.courier || "", p.data.awb || "", p.data.status, now, o.number);
    else await runAsync("INSERT INTO shipments VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", uid("ship_"), o.id, o.number, "", "", p.data.courier || "", p.data.awb || "", "", p.data.status, "[]", now, now);
  }
  await audit("admin", "order_status_changed", `${o.number}: ${o.status} -> ${p.data.status}${p.data.courier ? ` via ${p.data.courier}` : ""}${p.data.awb ? ` AWB ${p.data.awb}` : ""}${p.data.note ? ` (${p.data.note})` : ""}`);
  return NextResponse.json({ ok: true, orderNumber: o.number, from: o.status, to: p.data.status, message: `Order moved to ${p.data.status}.` });
}
