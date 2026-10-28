"use client";
import { useState } from "react";
import { inr } from "@/lib/pricing";
import { addToCart } from "@/lib/cart";
export default function UnitBuy({ slug, name, image, type, basePaise, variants }: { slug: string; name: string; image: string; type: string; basePaise: number; variants: { id: string; name: string; dimensions: string; includes: string; pricePaise: number; stock: number }[] }) {
  const [vid, setVid] = useState(variants[0]?.id || ""); const [qty, setQty] = useState(1); const [msg, setMsg] = useState("");
  const v = variants.find(x => x.id === vid); const unit = v ? v.pricePaise : basePaise;
  return (<div className="bg-white p-5 rounded-2xl border border-sand">
    {variants.length > 0 ? <div><label className="text-sm font-semibold">Variant</label><select value={vid} onChange={e => setVid(e.target.value)} className="block mt-1 border rounded-lg px-3 py-2 w-full">{variants.map(x => <option key={x.id} value={x.id}>{x.name} — {x.dimensions} — {x.includes} — {inr(x.pricePaise)} ({x.stock} in stock)</option>)}</select></div> : <p className="text-2xl font-bold">{inr(basePaise)}</p>}
    <label className="block mt-4 text-sm font-semibold">Quantity</label><input type="number" min={1} max={99} value={qty} onChange={e => setQty(Number(e.target.value))} className="border rounded-lg px-3 py-2 w-24 mt-1" />
    <p className="mt-3 text-lg">Subtotal: <strong>{inr(unit * qty)}</strong></p>
    <div className="flex gap-3 mt-4"><button onClick={() => { addToCart({ slug, name, image, type, pricePaise: unit, quantity: qty, variantId: vid || undefined, variantName: v?.name }); setMsg("Added to cart."); }} className="bg-terracotta text-white px-5 py-3 rounded-full">Add to Cart</button><button onClick={() => { addToCart({ slug, name, image, type, pricePaise: unit, quantity: qty, variantId: vid || undefined, variantName: v?.name }); window.location.href = "/cart"; }} className="bg-indigo2 text-white px-5 py-3 rounded-full">Buy Now</button></div>{msg && <p className="text-forest mt-2">{msg}</p>}
  </div>);
}
