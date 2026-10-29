import { NextResponse } from "next/server";
import { runAsync } from "@/lib/db";
import { isAdminRequest, audit } from "@/lib/auth";
// Toggle a coupon active/inactive. No delete endpoint on purpose: deleting
// a coupon that old orders used would erase the record of what discount
// was offered — deactivate it instead, and it stops applying at checkout.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const active = body.active === true ? 1 : 0;
  const r = await runAsync("UPDATE coupons SET active=? WHERE id=?", active, params.id);
  if (r.changes === 0) return NextResponse.json({ ok: false, error: "Coupon not found." }, { status: 404 });
  await audit("admin", active ? "coupon_activated" : "coupon_deactivated", params.id);
  return NextResponse.json({ ok: true, active: !!active });
}
