import { NextResponse } from "next/server";
import { row, run } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { ProductBody, parseTiersSafe } from "@/lib/admin-product";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const p = ProductBody.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ ok: false, error: p.error.issues.map(i => i.message).join("; ") }, { status: 400 });
  if (!parseTiersSafe(p.data.tiersJson)) return NextResponse.json({ ok: false, error: "tiersJson must be a JSON array of {minCm, pricePaise}." }, { status: 400 });
  const cat = row<{ id: string }>("SELECT id FROM categories WHERE slug=?", p.data.categorySlug); if (!cat) return NextResponse.json({ ok: false, error: "Category slug not found." }, { status: 400 });
  const d = p.data; run("UPDATE products SET slug=?,name=?,type=?,categoryId=?,description=?,material=?,printTechnique=?,pattern=?,color=?,widthCm=?,gsm=?,pricePaise=?,minCm=?,maxCm=?,incrementCm=?,tiersJson=?,image=?,washCare=?,origin=?,isActive=? WHERE id=?", d.slug, d.name, d.type, cat.id, d.description, d.material, d.printTechnique, d.pattern, d.color, d.widthCm ?? null, d.gsm ?? null, d.pricePaise, d.minCm, d.maxCm, d.incrementCm, d.tiersJson, d.image, d.washCare, d.origin, d.isActive ? 1 : 0, params.id);
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) { if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 }); run("DELETE FROM variants WHERE productId=?", params.id); run("DELETE FROM fabric_rolls WHERE productId=?", params.id); run("DELETE FROM products WHERE id=?", params.id); return NextResponse.json({ ok: true }); }
