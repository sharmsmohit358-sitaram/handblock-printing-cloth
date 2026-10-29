import { NextResponse } from "next/server";
import { z } from "zod";
import { rowAsync, allAsync, runAsync, uid } from "@/lib/db";
import { userFromCookieHeader, isAdminRequest, audit } from "@/lib/auth";

// Customer return requests. Policy (see /returns page): ready-made items
// are reviewed normally; cut-to-order fabric is reviewed only for
// defective / incorrect / damaged deliveries, with photo evidence — a
// correctly cut length is not automatically returnable. Admin review
// decides; a request alone never moves money.
// Eligibility: order must be DELIVERED, and no open return request for it.
// Ownership: logged-in owner, admin, or a guest whose email matches the
// email stored on the order (checkout email / account email fallback).
const Body = z.object({ orderNumber: z.string(), email: z.string().email().optional(), reason: z.enum(["defective", "incorrect", "damaged", "wrong_size", "other"]), detail: z.string().min(3).max(1000), photoUrl: z.string().optional() });

export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "orderNumber, a valid reason, and a detail (3-1000 chars) are required." }, { status: 400 });
  const o = await rowAsync<{ id: string; number: string; status: string; userId: string | null; addressJson: string }>("SELECT * FROM orders WHERE number=?", p.data.orderNumber);
  if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (o.status !== "DELIVERED") return NextResponse.json({ ok: false, error: `Only delivered orders can be returned (this order is ${o.status}).` }, { status: 400 });
  const u = await userFromCookieHeader(req.headers.get("cookie"));
  const addr = JSON.parse(o.addressJson || "{}") as { email?: string };
  const owner = isAdminRequest(req) || (u && o.userId === u.id) || (p.data.email && addr.email && p.data.email.toLowerCase() === addr.email.toLowerCase());
  if (!owner) return NextResponse.json({ ok: false, error: "Only the account / email that placed this order (or an admin) can request a return." }, { status: 403 });
  const open = await rowAsync("SELECT id FROM returns WHERE orderNumber=? AND status IN ('REQUESTED','APPROVED','RECEIVED')", o.number);
  if (open) return NextResponse.json({ ok: false, error: "There is already an open return request for this order." }, { status: 400 });
  const id = uid("ret_"); const now = new Date().toISOString();
  await runAsync("INSERT INTO returns VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", id, o.id, o.number, u?.id || null, p.data.reason, p.data.detail, p.data.photoUrl || "", "REQUESTED", "", null, now, now);
  await audit(u?.email || p.data.email || "guest", "return_requested", `${o.number} (${p.data.reason})`);
  return NextResponse.json({ ok: true, returnId: id, message: "Return request submitted. An admin will review it — a request alone does not move money." });
}

export async function GET(req: Request) {
  const number = new URL(req.url).searchParams.get("orderNumber") || "";
  if (!number) return NextResponse.json({ ok: false, error: "orderNumber is required." }, { status: 400 });
  const o = await rowAsync<{ userId: string | null; addressJson: string }>("SELECT userId,addressJson FROM orders WHERE number=?", number);
  if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  const u = await userFromCookieHeader(req.headers.get("cookie"));
  if (!isAdminRequest(req) && (!u || o.userId !== u.id)) return NextResponse.json({ ok: false, error: "Only the account that placed this order (or an admin) can view its returns." }, { status: 403 });
  const list = await allAsync("SELECT * FROM returns WHERE orderNumber=? ORDER BY createdAt DESC", number);
  return NextResponse.json({ ok: true, returns: list });
}
