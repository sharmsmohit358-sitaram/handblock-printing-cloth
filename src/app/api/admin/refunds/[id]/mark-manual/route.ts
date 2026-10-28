import { NextResponse } from "next/server";
import { row, run } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { applyRefundToOrder } from "@/lib/refunds";
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const r = row<{ orderId: string; status: string }>("SELECT * FROM refunds WHERE id=?", params.id); if (!r) return NextResponse.json({ ok: false, error: "Refund not found." }, { status: 404 });
  if (r.status === "PROCESSED") return NextResponse.json({ ok: true, message: "Already processed." });
  const { providerRefundId } = await req.json().catch(() => ({}));
  run("UPDATE refunds SET status='PROCESSED', providerRefundId=?, processedAt=? WHERE id=?", String(providerRefundId || "manual"), new Date().toISOString(), params.id);
  applyRefundToOrder(r.orderId);
  return NextResponse.json({ ok: true, message: "Refund marked as manually processed (for example, after processing it in the Razorpay Dashboard). Record the dashboard refund id in your books." });
}
