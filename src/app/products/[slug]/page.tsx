import { notFound } from "next/navigation";
import Link from "next/link";
import FabricSelector from "@/components/FabricSelector";
import UnitBuy from "@/components/UnitBuy";
import { getProduct, variantsOf, rollsOf, totalFabricCm } from "@/lib/catalog";
import { allAsync } from "@/lib/db";
import { inr } from "@/lib/pricing";
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await getProduct(params.slug); if (!p) notFound();
  const variants = await variantsOf(p.id); const rolls = await rollsOf(p.id); const reviews = await allAsync<{ author: string; rating: number; body: string }>("SELECT * FROM reviews WHERE productId=?", p.id);
  const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const productJsonLd = { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, material: p.material, image: p.image.startsWith("http") ? p.image : `${site}${p.image}`, offers: { "@type": "Offer", priceCurrency: "INR", price: (p.pricePaise / 100).toFixed(2), availability: "https://schema.org/InStock" } };
  return (<div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    <p className="text-sm text-gray-500"><Link href="/products">Products</Link> / {p.categoryName}</p>
    <div className="grid md:grid-cols-2 gap-8 mt-4">
      <div>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.image} alt={p.name} className="w-full rounded-3xl h-96 object-cover" />{p.image.startsWith("/patterns/") && <p className="text-xs text-gray-500 mt-2">Pattern artwork shown here is a locally generated textile motif used as a placeholder until product photography is uploaded. It is not claimed to be a photograph of the physical fabric.</p>}</div>
      <div><h1 className="text-3xl font-bold">{p.name}</h1><p className="text-gray-600 mt-2">{p.description}</p>
        <dl className="grid grid-cols-2 gap-2 mt-4 text-sm bg-white p-4 rounded-2xl border border-sand"><div><dt className="text-gray-500">Material</dt><dd>{p.material}</dd></div><div><dt className="text-gray-500">Technique</dt><dd>{p.printTechnique}</dd></div><div><dt className="text-gray-500">Pattern</dt><dd>{p.pattern}</dd></div><div><dt className="text-gray-500">Colour</dt><dd>{p.color}</dd></div>{p.widthCm && <div><dt className="text-gray-500">Width</dt><dd>{p.widthCm} cm ({(p.widthCm / 2.54).toFixed(1)} in)</dd></div>}{p.gsm && <div><dt className="text-gray-500">Weight</dt><dd>{p.gsm} GSM</dd></div>}<div><dt className="text-gray-500">Wash care</dt><dd>{p.washCare}</dd></div><div><dt className="text-gray-500">Origin (as stored)</dt><dd>{p.origin}</dd></div></dl>
        <div className="mt-5">{p.type === "FABRIC" ? <FabricSelector slug={p.slug} name={p.name} image={p.image} basePaise={p.pricePaise} tiersJson={p.tiersJson} minCm={p.minCm} maxCm={p.maxCm} incCm={p.incrementCm} stockCm={await totalFabricCm(p.id)} /> : <UnitBuy slug={p.slug} name={p.name} image={p.image} type={p.type} basePaise={p.pricePaise} variants={variants} />}</div>
        {p.type === "FABRIC" && <div className="mt-4 text-sm bg-white p-4 rounded-2xl border border-sand"><h3 className="font-semibold">Rolls in stock</h3><ul className="mt-1">{rolls.map(r => <li key={r.id}>{r.rollCode} · Lot {r.lot} · {(r.remainingCm / 100).toFixed(1)} m remaining</li>)}</ul><p className="text-gray-500 mt-1">A continuous-cut order is allocated to the shortest single roll that fits it.</p></div>}
      </div>
    </div>
    <section className="mt-10"><h2 className="text-2xl font-bold">Verified buyer reviews (seeded)</h2>{reviews.length === 0 ? <p className="text-gray-600 mt-2">No reviews yet for this product.</p> : reviews.map((r, i) => <blockquote key={i} className="bg-white p-4 rounded-2xl border border-sand mt-3"><p>★ {r.rating}/5 — {r.author}</p><p className="mt-1">{r.body}</p></blockquote>)}</section>
  </div>);
}
