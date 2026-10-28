import { NextResponse } from "next/server";
import { listProducts } from "@/lib/catalog";
export async function GET(req: Request) {
  const s = new URL(req.url).searchParams;
  return NextResponse.json(listProducts({ search: s.get("q") || undefined, category: s.get("category") || undefined, material: s.get("material") || undefined, color: s.get("color") || undefined, type: s.get("type") || undefined }));
}
