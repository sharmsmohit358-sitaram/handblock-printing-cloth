import { NextResponse } from "next/server";
import { CheckoutInput, createOrder } from "@/lib/checkout";
import { userFromCookieHeader } from "@/lib/auth";
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CheckoutInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues.map(i => i.message).join("; ") }, { status: 400 });
  const u = userFromCookieHeader(req.headers.get("cookie"));
  const r = await createOrder({ ...parsed.data, userId: u?.id || null });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
