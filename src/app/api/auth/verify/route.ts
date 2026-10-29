import { NextResponse } from "next/server";
import { rowAsync, runAsync } from "@/lib/db";
import { markVerified } from "@/lib/auth";
export async function POST(req: Request) { const { token } = await req.json().catch(() => ({})); const v = await rowAsync<{ userId: string; expiresAt: string }>("SELECT * FROM email_verifications WHERE token=?", token); if (!v || new Date(v.expiresAt) < new Date()) return NextResponse.json({ ok: false, error: "Invalid or expired verification token." }, { status: 400 }); await runAsync("DELETE FROM email_verifications WHERE token=?", token); await markVerified(v.userId); return NextResponse.json({ ok: true }); }
