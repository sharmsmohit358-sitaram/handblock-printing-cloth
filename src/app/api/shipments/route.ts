import { NextResponse } from "next/server";
import { rowAsync, runAsync } from "@/lib/db";
import { userFromCookieHeader, isAdminRequest } from "@/lib/auth";
import { bigshipConfigured, bigshipTrackOrder, bigshipDownloadDocument } from "@/lib/bigship";

// Customer/admin shipment tracking. Owner of the order or admin only.
// GET ?orderNumber=HPC... -> Bigship track, stored in shipments.trackingJson.
// GET ?orderNumber=HPC...&document=label -> Bigship document URL (label/invoice/manifest).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const number = url.searchParams.get("orderNumber") || "";
  const document = url.searchParams.get("document") || "";
  const s = await rowAsync<{ orderId: string; orderNumber: string; bigshipOrderId: string; awb: string; courierName: string; status: string; trackingJson: string }>("SELECT * FROM shipments WHERE orderNumber=?", number);
  if (!s) return NextResponse.json({ ok: false, error: "No Bigship shipment for this order yet." }, { status: 404 });
  const o = await rowAsync<{ userId: string | null }>("SELECT userId FROM orders WHERE number=?", number);
  const u = await userFromCookieHeader(req.headers.get("cookie"));
  if (!isAdminRequest(req) && (!u || o?.userId !== u.id)) return NextResponse.json({ ok: false, error: "Only the account that placed this order (or an admin) can view its shipment." }, { status: 403 });
  if (!bigshipConfigured()) return NextResponse.json({ ok: false, error: "Bigship is not configured." }, { status: 400 });
  try {
    if (document) {
      if (!["invoice", "label", "ewaybill", "manifest"].includes(document)) return NextResponse.json({ ok: false, error: "document must be invoice, label, ewaybill or manifest." }, { status: 400 });
      const doc = await bigshipDownloadDocument(s.bigshipOrderId, document as "invoice" | "label" | "ewaybill" | "manifest");
      return NextResponse.json({ ok: true, document, url: doc.AttachmentData, type: doc.File_extention });
    }
    const track = await bigshipTrackOrder(s.bigshipOrderId);
    await runAsync("UPDATE shipments SET status=?, trackingJson=?, updatedAt=? WHERE orderNumber=?", track.order_status || track.tag || s.status, JSON.stringify(track), new Date().toISOString(), number);
    return NextResponse.json({ ok: true, awb: s.awb || track.tracking_number, courier: track.courier_name || s.courierName, status: track.order_status || track.tag, latest: track.latest_checkpoint_time, histories: track.tracking_histories || [] });
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }
}
