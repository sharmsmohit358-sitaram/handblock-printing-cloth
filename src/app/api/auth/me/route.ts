import { NextResponse } from "next/server";
import { userFromCookieHeader, checkVerified } from "@/lib/auth";
export async function GET(req: Request) { const u = await userFromCookieHeader(req.headers.get("cookie")); if (!u) return NextResponse.json({ ok: false, user: null }); return NextResponse.json({ ok: true, user: { ...u, verified: await checkVerified(u.id) } }); }
