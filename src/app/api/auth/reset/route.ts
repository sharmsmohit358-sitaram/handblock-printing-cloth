import { NextResponse } from "next/server";
import { z } from "zod";
import { row, run } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
const Body = z.object({ token: z.string().min(10), password: z.string().min(8) });
export async function POST(req: Request) { const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "A valid token and a password of at least 8 characters are required." }, { status: 400 }); const r = row<{ userId: string; expiresAt: string; used: number }>("SELECT * FROM password_resets WHERE token=?", p.data.token); if (!r || r.used || new Date(r.expiresAt) < new Date()) return NextResponse.json({ ok: false, error: "Invalid or expired reset token." }, { status: 400 }); run("UPDATE users SET passwordHash=? WHERE id=?", hashPassword(p.data.password), r.userId); run("UPDATE password_resets SET used=1 WHERE token=?", p.data.token); run("DELETE FROM sessions WHERE userId=?", r.userId); return NextResponse.json({ ok: true }); }
