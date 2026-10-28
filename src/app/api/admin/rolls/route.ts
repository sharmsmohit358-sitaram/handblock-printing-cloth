import { NextResponse } from "next/server";
import { run, uid } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { z } from "zod";
const Body = z.object({ productId: z.string(), rollCode: z.string().min(1), lot: z.string().default(""), lengthCm: z.number().int().positive() });
export async function POST(req: Request) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); const p = Body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: "Roll code and a positive length in cm are required." }, { status: 400 }); run("INSERT INTO fabric_rolls VALUES(?,?,?,?,?,?,?)", uid("roll_"), p.data.productId, p.data.rollCode, p.data.lot, p.data.lengthCm, p.data.lengthCm, "Jaipur WH-1"); return NextResponse.json({ ok: true }); }
export async function DELETE(req: Request) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); const id = new URL(req.url).searchParams.get("id"); run("DELETE FROM fabric_rolls WHERE id=?", id); return NextResponse.json({ ok: true }); }
