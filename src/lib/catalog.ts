import { allAsync, rowAsync } from "./db";
export type Product = { id: string; slug: string; name: string; type: string; categoryId: string; description: string; material: string; printTechnique: string; pattern: string; color: string; widthCm: number | null; gsm: number | null; pricePaise: number; minCm: number; maxCm: number; incrementCm: number; tiersJson: string; image: string; washCare: string; origin: string; categoryName?: string };
export async function listProducts(q: { search?: string; category?: string; material?: string; color?: string; type?: string; maxPrice?: number; sort?: string } = {}): Promise<Product[]> {
  let sql = `SELECT p.*, c.name AS categoryName FROM products p LEFT JOIN categories c ON c.id=p.categoryId WHERE p.isActive=1`;
  const args: unknown[] = [];
  if (q.type) { sql += " AND p.type=?"; args.push(q.type); }
  if (q.category) { sql += " AND c.slug=?"; args.push(q.category); }
  if (q.material) { sql += " AND p.material=?"; args.push(q.material); }
  if (q.color) { sql += " AND p.color=?"; args.push(q.color); }
  if (q.maxPrice) { sql += " AND p.pricePaise<=?"; args.push(q.maxPrice); }
  if (q.search) { sql += " AND (p.name LIKE ? OR p.description LIKE ? OR p.pattern LIKE ?)"; const s = `%${q.search}%`; args.push(s, s, s); }
  sql += q.sort === "price_asc" ? " ORDER BY p.pricePaise ASC" : q.sort === "price_desc" ? " ORDER BY p.pricePaise DESC" : " ORDER BY p.name ASC";
  return allAsync<Product>(sql, ...args);
}
export async function getProduct(slug: string): Promise<Product | undefined> { return rowAsync<Product>(`SELECT p.*, c.name AS categoryName FROM products p LEFT JOIN categories c ON c.id=p.categoryId WHERE p.slug=?`, slug); }
export async function listCategories() { return allAsync<{ slug: string; name: string }>(`SELECT slug, name FROM categories ORDER BY name`); }
export type Variant = { id: string; productId: string; name: string; dimensions: string; includes: string; pricePaise: number; stock: number };
export async function variantsOf(productId: string): Promise<Variant[]> { return allAsync<Variant>(`SELECT * FROM variants WHERE productId=? ORDER BY pricePaise`, productId); }
export async function rollsOf(productId: string) { return allAsync<{ id: string; rollCode: string; remainingCm: number; lot: string }>(`SELECT * FROM fabric_rolls WHERE productId=? AND remainingCm>0 ORDER BY remainingCm`, productId); }
export async function totalFabricCm(productId: string): Promise<number> { const r = await rowAsync<{ s: number }>(`SELECT COALESCE(SUM(remainingCm),0) AS s FROM fabric_rolls WHERE productId=?`, productId); return r?.s ?? 0; }
