import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { listProducts, listCategories } from "@/lib/catalog";
export default function Home() {
  const fabrics = listProducts({ type: "FABRIC" }); const beds = listProducts({ type: "BEDSHEET" }); const all = listProducts({}); const cats = listCategories();
  return (<div className="space-y-12">
    <section className="bg-indigo2 text-white rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
      <div><h1 className="text-4xl md:text-5xl leading-tight">Handblock-printed fabric, by the metre.</h1><p className="mt-4 text-lg text-sand">Choose your length in 0.5 m steps, get one continuous cut, and pay only for what you order — plus bedsheets and home textiles made from the same craft.</p><div className="flex gap-3 mt-6"><Link href="/products?type=FABRIC" className="bg-terracotta px-5 py-3 rounded-full font-semibold">Shop Fabric by Metre</Link><Link href="/products?type=BEDSHEET" className="bg-white text-indigo2 px-5 py-3 rounded-full font-semibold">Shop Bedsheets</Link></div></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/patterns/floral.svg" alt="Blue floral handblock pattern" className="rounded-2xl w-full h-64 object-cover" />
    </section>
    <section><h2 className="text-2xl font-bold">Shop by Category</h2><div className="flex flex-wrap gap-2 mt-4">{cats.map(c => <Link key={c.slug} href={`/products?category=${c.slug}`} className="bg-white border border-sand px-4 py-2 rounded-full">{c.name}</Link>)}</div></section>
    <section><h2 className="text-2xl font-bold">Trending Fabrics</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{fabrics.slice(0, 3).map(p => <ProductCard key={p.id} p={p} />)}</div></section>
    <section><h2 className="text-2xl font-bold">Fabric by Metre Collection</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{fabrics.map(p => <ProductCard key={p.id} p={p} />)}</div></section>
    <section><h2 className="text-2xl font-bold">Handblock-Printed Bedsheets</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{beds.map(p => <ProductCard key={p.id} p={p} />)}</div></section>
    <section className="bg-sand rounded-3xl p-8"><h2 className="text-2xl font-bold">Craftsmanship &amp; Artisan Story</h2><p className="mt-2 max-w-3xl">Handblock printing is a hand process: carved wooden blocks, dye and cloth, repeated by hand. That is why small variations in print and colour are part of the product, not a defect — each product page states its material, technique and origin from its stored data, and no claim is made beyond that data.</p><Link href="/about" className="text-indigo2 font-semibold underline">Read about the craft →</Link></section>
    <section><h2 className="text-2xl font-bold">New Arrivals &amp; Best Sellers</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{all.slice(0, 6).map(p => <ProductCard key={p.id} p={p} />)}</div></section>
    <section><h2 className="text-2xl font-bold">Wholesale &amp; Bulk Orders</h2><p className="mt-2">Bulk tiers start at 10 m on fabric products, and businesses can request a quotation. <Link href="/wholesale" className="text-indigo2 font-semibold underline">Request a wholesale quote →</Link></p></section>
  </div>);
}
