import { NextResponse } from "next/server";
import { checkShipping } from "@/lib/payments";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("pincode") || "";
  return NextResponse.json(await checkShipping(p));
}
