import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// The Razorpay key_id is a public identifier (it is embedded in checkout.js
// on every merchant site). Only the key_secret and webhook secret stay server-side.
export async function GET() { const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || null; return NextResponse.json({ ok: true, keyId, configured: !!keyId }); }
