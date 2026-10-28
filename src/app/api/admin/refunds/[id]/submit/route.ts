import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { submitRefundIntent } from "@/lib/refunds";
export async function POST(req: Request, { params }: { params: { id: string } }) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); const r = await submitRefundIntent(params.id); return NextResponse.json({ ok: r.ok, status: r.status, message: r.message }, { status: r.ok ? 200 : 502 }); }
