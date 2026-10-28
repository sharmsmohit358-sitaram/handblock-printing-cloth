import { NextResponse } from "next/server";
import { z } from "zod";
import { all } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { createRefundIntent, submitRefundIntent } from "@/lib/refunds";
const Body = z.object({ orderNumber: z.string(), amountPaise: z.number().int().positive(), reason: z.string().default(""), autoSubmit: z.boolean().optional() });
export async function GET(req: Request) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); return NextResponse.json({ ok: true, refunds: all("SELECT * FROM refunds ORDER BY createdAt DESC LIMIT 100") }); }
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "Order number and a positive refund amount in paise are required." }, { status: 400 });
  const created = createRefundIntent(p.data.orderNumber, p.data.amountPaise, p.data.reason); if (!created.ok || !created.id) return NextResponse.json({ ok: false, error: created.error }, { status: 400 });
  if (p.data.autoSubmit === false) return NextResponse.json({ ok: true, refundId: created.id, status: "REQUESTED", message: "Refund intent recorded, not submitted. Submit it from the refunds page or via the submit endpoint." });
  const submitted = await submitRefundIntent(created.id); return NextResponse.json({ ok: submitted.ok, refundId: created.id, status: submitted.status, message: submitted.message }, { status: submitted.ok ? 200 : 502 });
}
