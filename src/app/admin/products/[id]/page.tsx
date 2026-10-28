import { notFound } from "next/navigation";
import { row, all } from "@/lib/db";
import ProductForm from "@/components/ProductForm";
import AdminRolls from "@/components/AdminRolls";
export default function EditProduct({ params }: { params: { id: string } }) {
  const p = row<{ id: string; slug: string; name: string; type: string; categoryId: string; description: string; material: string; printTechnique: string; pattern: string; color: string; widthCm: number | null; gsm: number | null; pricePaise: number; minCm: number; maxCm: number; incrementCm: number; tiersJson: string; image: string; washCare: string; origin: string; isActive: number }>("SELECT * FROM products WHERE id=?", params.id); if (!p) notFound();
  const cat = row<{ slug: string }>("SELECT slug FROM categories WHERE id=?", p.categoryId);
  const rolls = all<{ id: string; rollCode: string; lot: string; remainingCm: number; originalCm: number }>("SELECT * FROM fabric_rolls WHERE productId=? ORDER BY remainingCm", p.id);
  const initial = { id: p.id, slug: p.slug, name: p.name, type: p.type, categorySlug: cat?.slug || "", description: p.description, material: p.material, printTechnique: p.printTechnique, pattern: p.pattern, color: p.color, widthCm: p.widthCm == null ? "" : String(p.widthCm), gsm: p.gsm == null ? "" : String(p.gsm), pricePaise: String(p.pricePaise), minCm: String(p.minCm), maxCm: String(p.maxCm), incrementCm: String(p.incrementCm), tiersJson: p.tiersJson, image: p.image, washCare: p.washCare, origin: p.origin, isActive: p.isActive === 1 };
  return (<div><h1 className="text-3xl font-bold">Edit: {p.name}</h1><div className="mt-4"><ProductForm initial={initial} isNew={false} /></div>{p.type === "FABRIC" && <AdminRolls productId={p.id} initial={rolls} />}</div>);
}
