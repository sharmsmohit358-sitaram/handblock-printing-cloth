import { NextResponse } from "next/server";
import { all, row, run, uid } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { ProductBody, parseTiersSafe } from "@/lib/admin-product";
export async function GET(req: Request) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); return NextResponse.json({ ok: true, products: all("SELECT p.*, c.slug AS categorySlug FROM products p LEFT JOIN categories c ON c.id=p.categoryId ORDER BY p.name") }); }
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const p = ProductBody.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: p.error.issues.map(i => i.message).join("; ") }, { status: 400 });
  if (!parseTiersSafe(p.data.tiersJson)) return NextResponse.json({ ok: false, error: "tiersJson must be a JSON array of {minCm, pricePaise}." }, { status: 400 });
  const cat = row<{ id: string }>("SELECT id FROM categories WHERE slug=?", p.data.categorySlug); if (!cat) return NextResponse.json({ ok: false, error: "Category slug not found. Create the category first, or use an existing slug." }, { status: 400 });
  const d = p.data; run("INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", uid("prod_"), d.slug, d.name, d.type, cat.id, d.description, d.material, d.printTechnique, d.pattern, d.color, d.widthCm ?? null, d.gsm ?? null, d.pricePaise, d.minCm, d.maxCm, d.incrementCm, d.tiersJson, d.image, d.washCare, d.origin, d.isActive ? 1 : 0);
  return NextResponse.json({ ok: true });
}
