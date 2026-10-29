import { NextResponse } from "next/server";
import { allAsync, runAsync, uid } from "@/lib/db";
import { isAdminRequest, audit } from "@/lib/auth";
import { validateCouponInput } from "@/lib/coupons";
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const coupons = await allAsync("SELECT * FROM coupons ORDER BY code");
  return NextResponse.json({ ok: true, coupons });
}
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const v = validateCouponInput(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  try {
    await runAsync("INSERT INTO coupons VALUES(?,?,?,?,?,1)", uid("cp_"), v.value.code, v.value.percentOff, v.value.flatPaise, v.value.minSubtotalPaise);
  } catch {
    return NextResponse.json({ ok: false, error: `Coupon ${v.value.code} already exists.` }, { status: 400 });
  }
  await audit("admin", "coupon_created", `${v.value.code} (${v.value.percentOff ? v.value.percentOff + "%" : "Rs " + v.value.flatPaise / 100})`);
  return NextResponse.json({ ok: true, code: v.value.code });
}
