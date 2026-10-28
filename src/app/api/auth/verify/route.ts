import { NextResponse } from "next/server";
import { row, run } from "@/lib/db";
import { markVerified } from "@/lib/auth";
export async function POST(req: Request) { const { token } = await req.json().catch(() => ({})); const v = row<{ userId: string; expiresAt: string }>("SELECT * FROM email_verifications WHERE token=?", token); if (!v || new Date(v.expiresAt) < new Date()) return NextResponse.json({ ok: false, error: "Invalid or expired verification token." }, { status: 400 }); run("DELETE FROM email_verifications WHERE token=?", token); markVerified(v.userId); return NextResponse.json({ ok: true }); }
