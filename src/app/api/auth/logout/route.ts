import { NextResponse } from "next/server";
import { clearSessionCookie, userFromCookieHeader } from "@/lib/auth";
import { runAsync } from "@/lib/db";
export async function POST(req: Request) { const u = await userFromCookieHeader(req.headers.get("cookie")); const h = req.headers.get("cookie") || ""; const m = h.match(/hpc-session=([^;]+)/); if (m) await runAsync("DELETE FROM sessions WHERE token=?", m[1]); const res = NextResponse.json({ ok: true }); res.headers.set("Set-Cookie", clearSessionCookie()); return res; }
