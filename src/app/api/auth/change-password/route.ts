import { NextResponse } from "next/server";
import { z } from "zod";
import { row, run } from "@/lib/db";
import { userFromCookieHeader, verifyPassword, hashPassword } from "@/lib/auth";
const Body = z.object({ current: z.string().min(1), password: z.string().min(8) });
export async function POST(req: Request) { const u = userFromCookieHeader(req.headers.get("cookie")); if (!u) return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 }); const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "New password must be at least 8 characters." }, { status: 400 }); const full = row<{ passwordHash: string }>("SELECT passwordHash FROM users WHERE id=?", u.id); if (!full || !verifyPassword(p.data.current, full.passwordHash)) return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 401 }); run("UPDATE users SET passwordHash=? WHERE id=?", hashPassword(p.data.password), u.id); return NextResponse.json({ ok: true }); }
