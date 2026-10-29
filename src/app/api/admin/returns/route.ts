import { NextResponse } from "next/server";
import { z } from "zod";
import { rowAsync, allAsync, runAsync } from "@/lib/db";
import { isAdminRequest, audit } from "@/lib/auth";
import { createRefundIntent } from "@/lib/refunds";

// Admin return review. Admin only.
// GET: all return requests, newest first.
// POST { returnId, decision: APPROVED|REJECTED|RECEIVED, adminNote?, refundAmountPaise? }
//  - REJECTED: status REJECTED, no money moves, note is stored.
//  - APPROVED: status APPROVED. If refundAmountPaise is given and the order
//    is a paid prepaid order, a durable refund intent is created (NOT
//    auto-submitted — admin submits it from /admin/refunds, same money
//    rule as cancellations). For COD orders no Razorpay intent is created;
//    the admin handles the cash refund manually and notes it.
//  - RECEIVED: item received back, status RECEIVED (for approved returns).
const Body = z.object({ returnId: z.string(), decision: z.enum(["APPROVED", "REJECTED", "RECEIVED"]), adminNote: z.string().optional(), refundAmountPaise: z.number().int().positive().optional() });

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Admin sign-in required." }, { status: 403 });
  return NextResponse.json({ ok: true, returns: await allAsync("SELECT * FROM returns ORDER BY createdAt DESC LIMIT 100") });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Admin sign-in required." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "returnId and a valid decision are required." }, { status: 400 });
  const r = await rowAsync<{ id: string; orderNumber: string; status: string }>("SELECT * FROM returns WHERE id=?", p.data.returnId);
  if (!r) return NextResponse.json({ ok: false, error: "Return request not found." }, { status: 404 });
  if (r.status === "REJECTED" || r.status === "REFUNDED") return NextResponse.json({ ok: false, error: `Return is already ${r.status}.` }, { status: 400 });
  let refundIntentId: string | null = null; let refundNote = "";
  if (p.data.decision === "APPROVED" && p.data.refundAmountPaise) {
    const intent = await createRefundIntent(r.orderNumber, p.data.refundAmountPaise, `Return approved: ${p.data.adminNote || ""}`.trim());
    if (intent.ok) refundIntentId = intent.id || null;
    else refundNote = ` Refund intent not created: ${intent.error} (for COD orders, handle the refund manually.)`;
  }
  const now = new Date().toISOString();
  await runAsync("UPDATE returns SET status=?, adminNote=?, refundIntentId=COALESCE(?, refundIntentId), updatedAt=? WHERE id=?", p.data.decision, p.data.adminNote || "", refundIntentId, now, r.id);
  await audit("admin", "return_reviewed", `${r.orderNumber}: ${p.data.decision}${refundIntentId ? `, refund intent ${refundIntentId}` : ""}`);
  return NextResponse.json({ ok: true, message: `Return ${p.data.decision}.${refundNote}` });
}
