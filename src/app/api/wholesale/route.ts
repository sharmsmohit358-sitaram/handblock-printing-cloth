import { NextResponse } from "next/server";
import { runAsync, uid } from "@/lib/db";
export async function POST(req: Request) { const b = await req.json(); if (!b.businessName || !b.email) return NextResponse.json({ ok: false, error: "Business name and email are required" }, { status: 400 }); await runAsync("INSERT INTO wholesale_inquiries VALUES(?,?,?,?,?,?,?)", uid("ws_"), b.businessName, b.contactName || "", b.email, b.gstin || "", b.message || "", new Date().toISOString()); return NextResponse.json({ ok: true }); }
