import ProductCard from "@/components/ProductCard";
import { listProducts, listCategories } from "@/lib/catalog";
export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const products = await listProducts({ search: searchParams.q, category: searchParams.category, material: searchParams.material, color: searchParams.color, type: searchParams.type, sort: searchParams.sort });
  const cats = await listCategories();
  return (<div><h1 className="text-3xl font-bold">All Products</h1><p className="text-gray-600 mt-1">{products.length} product(s) found. Filters use the URL — share or bookmark a filtered view.</p>
    <form className="flex flex-wrap gap-2 mt-4 bg-white p-4 rounded-2xl border border-sand">
      <input name="q" defaultValue={searchParams.q || ""} placeholder="Search…" className="border rounded-lg px-3 py-2" />
      <select name="category" defaultValue={searchParams.category || ""} className="border rounded-lg px-3 py-2"><option value="">All categories</option>{cats.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      <select name="type" defaultValue={searchParams.type || ""} className="border rounded-lg px-3 py-2"><option value="">All types</option><option value="FABRIC">Fabric</option><option value="BEDSHEET">Bedsheet</option><option value="HOME">Home</option><option value="CLOTHING">Clothing</option></select>
      <select name="sort" defaultValue={searchParams.sort || ""} className="border rounded-lg px-3 py-2"><option value="">Sort: Featured</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option></select>
      <button className="bg-indigo2 text-white px-4 py-2 rounded-lg">Apply filters</button>
    </form>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">{products.map(p => <ProductCard key={p.id} p={p} />)}</div>
    {products.length === 0 && <p className="mt-6 text-gray-600">No products match those filters. Try clearing a filter.</p>}
  </div>);
}
