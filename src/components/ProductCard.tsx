import Link from "next/link";
import { inr } from "@/lib/pricing";
import type { Product } from "@/lib/catalog";
export default function ProductCard({ p }: { p: Product }) {
  return (<Link href={`/products/${p.slug}`} className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition border border-sand">
    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.image} alt={p.name} className="w-full h-52 object-cover" />
    <div className="p-4"><p className="text-xs uppercase tracking-wide text-terracotta">{p.categoryName} · {p.material}</p><h3 className="font-semibold mt-1">{p.name}</h3><p className="text-sm text-gray-600">{p.pattern} · {p.color}{p.widthCm ? ` · ${p.widthCm} cm wide` : ""}</p><p className="mt-2 font-bold text-indigo2">{inr(p.pricePaise)}<span className="text-sm font-normal text-gray-500">{p.type === "FABRIC" ? " / metre" : " / piece"}</span></p></div></Link>);
}
