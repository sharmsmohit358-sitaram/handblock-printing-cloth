import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { expireUnpaidPrepaidOrders } from "@/lib/restore";
export async function POST(req: Request) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); const body = await req.json().catch(() => ({})); const minutes = typeof body.minutes === "number" && body.minutes >= 0 ? body.minutes : 30; const expired = await expireUnpaidPrepaidOrders(minutes); return NextResponse.json({ ok: true, expired, count: expired.length, message: `Expired ${expired.length} unpaid prepaid order(s) older than ${minutes} minute(s) and restored their stock.` }); }
