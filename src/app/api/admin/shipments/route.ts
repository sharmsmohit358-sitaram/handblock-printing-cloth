import { NextResponse } from "next/server";
import { z } from "zod";
import { rowAsync, allAsync, runAsync, uid } from "@/lib/db";
import { isAdminRequest, audit } from "@/lib/auth";
import { bigshipConfigured, bigshipCreateDraftOrder, bigshipCourierRates, bigshipPlaceOrder, estimateParcel } from "@/lib/bigship";

// Admin Bigship flow, two steps, mirroring the PDF order:
// 1. POST { orderNumber } -> creates a Bigship draft (domestic_b2c) and
//    returns courier rates + the Bigship draft id. Nothing is manifested yet.
// 2. POST { orderNumber, bigshipOrderId, courierId } -> places/manifests
//    that draft, stores AWB + courier, and moves the store order to SHIPPED.
// Both steps are admin-only. Without BIGSHIP_* credentials the route
// returns configured:false instead of faking a shipment.
const Body = z.object({ orderNumber: z.string(), bigshipOrderId: z.string().optional(), courierId: z.string().optional(), riskTypeId: z.number().optional() });

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Admin sign-in required." }, { status: 403 });
  if (!bigshipConfigured()) return NextResponse.json({ ok: false, configured: false, error: "Bigship is not configured. Put BIGSHIP_USERNAME, BIGSHIP_PASSWORD, BIGSHIP_ACCESS_KEY and BIGSHIP_WAREHOUSE_ID in the app's local .env only — never in chat." }, { status: 400 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "orderNumber is required." }, { status: 400 });
  const o = await rowAsync<{ id: string; number: string; status: string; totalPaise: number; paymentMethod: string; addressJson: string }>("SELECT * FROM orders WHERE number=?", p.data.orderNumber);
  if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  const existing = await rowAsync<{ bigshipOrderId: string; awb: string }>("SELECT * FROM shipments WHERE orderNumber=?", o.number);
  if (existing?.awb) return NextResponse.json({ ok: false, error: `Order already shipped via Bigship, AWB ${existing.awb}.` }, { status: 400 });

  const warehouseId = Number(process.env.BIGSHIP_WAREHOUSE_ID);
  if (!warehouseId) return NextResponse.json({ ok: false, error: "BIGSHIP_WAREHOUSE_ID is not set in .env. Create/save a warehouse in Bigship and put its ID here." }, { status: 400 });
  const addr = JSON.parse(o.addressJson || "{}") as { name?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string };
  const items = await allAsync<{ nameSnapshot: string; quantityCm: number | null; quantity: number; unitPricePaise: number; totalPaise: number; gsm?: number | null; widthCm?: number | null }>(
    "SELECT oi.*, p.gsm, p.widthCm FROM order_items oi LEFT JOIN products p ON p.id=oi.productId WHERE oi.orderId=?", o.id);
  const box = estimateParcel(items.map((i) => ({ gsm: i.gsm ?? null, widthCm: i.widthCm ?? null, quantityCm: i.quantityCm, quantity: i.quantity })));

  // Step 2: place an already-created draft.
  if (p.data.bigshipOrderId && p.data.courierId) {
    try {
      const placed = await bigshipPlaceOrder({ masterCustomOrderId: p.data.bigshipOrderId, courierId: p.data.courierId, riskTypeId: p.data.riskTypeId || 2 });
      const now = new Date().toISOString();
      await runAsync("INSERT OR REPLACE INTO shipments VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", uid("ship_"), o.id, o.number, p.data.bigshipOrderId, String(p.data.courierId), "", String(placed.awb_assigned), String(placed.reference_number), "SHIPPED", "[]", now, now);
      await runAsync("UPDATE orders SET status='SHIPPED' WHERE id=?", o.id);
      await audit("admin", "bigship_shipped", `${o.number} AWB ${placed.awb_assigned}`);
      try {
        const addr = JSON.parse(o.addressJson || "{}") as { email?: string };
        if (addr.email) { const { sendEmail, orderEmail } = await import("@/lib/email"); await sendEmail(orderEmail(addr.email, "shipped", { number: o.number, totalPaise: o.totalPaise }, { awb: String(placed.awb_assigned) })); }
      } catch { /* email failure must not undo a shipment */ }
      return NextResponse.json({ ok: true, awb: placed.awb_assigned, reference_number: placed.reference_number, message: "Shipment placed with Bigship. Order moved to SHIPPED." });
    } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
  }

  // Step 1: draft + rates.
  try {
    const invoiceRupees = Math.round(o.totalPaise / 100);
    const draftId = await bigshipCreateDraftOrder({
      pickupWarehouseId: warehouseId, returnWarehouseId: warehouseId,
      paymentModeId: o.paymentMethod === "COD" ? 2 : 1,
      invoiceNo: o.number, invoiceAmountRupees: invoiceRupees,
      shippingName: addr.name || "Customer", shippingMobile: addr.phone || "",
      shippingAddress: addr.line1 || "", shippingZip: addr.pincode || "",
      shippingCity: addr.city || "", shippingState: addr.state || "",
      boxes: [box],
      products: items.map((i) => ({
        productName: i.nameSnapshot, qty: i.quantityCm ? 1 : i.quantity,
        amount: Math.round(i.unitPricePaise / 100), totalAmount: Math.round(i.totalPaise / 100),
        collectableAmount: o.paymentMethod === "COD" ? Math.round(i.totalPaise / 100) : 0, categoryId: "1",
      })),
    });
    const rates = await bigshipCourierRates(draftId);
    return NextResponse.json({ ok: true, bigshipOrderId: draftId, rates, box, message: "Bigship draft created. Choose a courierId from rates and call this route again with bigshipOrderId + courierId to place it." });
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
}
