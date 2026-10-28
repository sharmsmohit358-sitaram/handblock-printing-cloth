import { NextResponse } from "next/server";
import { z } from "zod";
import { row } from "@/lib/db";
import { verifyPassword, createSession, sessionCookie, rateLimit, audit } from "@/lib/auth";
const Body = z.object({ email: z.string().email(), password: z.string().min(1) });
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local"; if (!rateLimit("login:" + ip, 10)) return NextResponse.json({ ok: false, error: "Too many login attempts. Try again in a minute." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  const u = row<{ id: string; passwordHash: string; email: string }>("SELECT * FROM users WHERE email=?", parsed.data.email.toLowerCase()); if (!u || !verifyPassword(parsed.data.password, u.passwordHash)) return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  const token = createSession(u.id); audit(u.email, "login", u.id); const res = NextResponse.json({ ok: true }); res.headers.set("Set-Cookie", sessionCookie(token)); return res;
}
