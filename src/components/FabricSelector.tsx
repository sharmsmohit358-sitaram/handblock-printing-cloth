"use client";
import { useMemo, useState } from "react";
import { inr, validateFabricQty, unitPricePaise, parseTiers } from "@/lib/pricing";
import { addToCart } from "@/lib/cart";
export default function FabricSelector({ slug, name, image, basePaise, tiersJson, minCm, maxCm, incCm, stockCm }: { slug: string; name: string; image: string; basePaise: number; tiersJson: string; minCm: number; maxCm: number; incCm: number; stockCm: number }) {
  const [metres, setMetres] = useState(3.5); const [allowSplit, setAllowSplit] = useState(false); const [msg, setMsg] = useState("");
  const cm = Math.round(metres * 100); const tiers = parseTiers(tiersJson); const unit = unitPricePaise(basePaise, tiers, cm); const err = validateFabricQty(cm, minCm, maxCm, incCm); const subtotal = Math.round(unit * cm / 100);
  const options = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 5, 10];
  return (<div className="bg-white p-5 rounded-2xl border border-sand">
    <p className="text-2xl font-bold text-indigo2">{inr(unit)} <span className="text-base font-normal text-gray-500">/ metre</span></p>
    <p className="text-sm text-gray-600 mt-1">Available: {(stockCm / 100).toFixed(1)} m in stock · Width and GSM on this page · Cut from a single roll unless you approve multiple cuts.</p>
    <label className="block mt-4 text-sm font-semibold">Length (metres)</label>
    <div className="flex flex-wrap gap-2 mt-2">{options.map(o => <button key={o} onClick={() => setMetres(o)} className={`px-3 py-2 rounded-full border ${metres === o ? "bg-indigo2 text-white" : "bg-white"}`}>{o} m</button>)}</div>
    <input type="number" step="0.5" min={minCm / 100} max={maxCm / 100} value={metres} onChange={e => setMetres(Number(e.target.value))} className="mt-3 border rounded-lg px-3 py-2 w-32" aria-label="Custom length in metres" />
    {tiers.length > 0 && <p className="text-sm mt-2 text-forest">Bulk tiers: {tiers.map(t => `${t.minCm / 100} m+ at ${inr(t.pricePaise)}/m`).join(" · ")}</p>}
    <p className="mt-3 text-lg">Subtotal: <strong>{inr(subtotal)}</strong> <span className="text-sm text-gray-500">(tax and shipping calculated at checkout)</span></p>
    {err && <p className="text-red-700 text-sm mt-1">{err}</p>}
    <label className="flex gap-2 items-center mt-3 text-sm"><input type="checkbox" checked={allowSplit} onChange={e => setAllowSplit(e.target.checked)} /> Allow multiple cuts if one continuous cut is unavailable</label>
    <div className="flex gap-3 mt-4">
      <button disabled={!!err} onClick={() => { addToCart({ slug, name, image, type: "FABRIC", pricePaise: unit, quantityCm: cm, allowSplit }); setMsg("Added to cart."); }} className="bg-terracotta text-white px-5 py-3 rounded-full disabled:opacity-50">Add to Cart</button>
      <button disabled={!!err} onClick={() => { addToCart({ slug, name, image, type: "FABRIC", pricePaise: unit, quantityCm: cm, allowSplit }); window.location.href = "/cart"; }} className="bg-indigo2 text-white px-5 py-3 rounded-full disabled:opacity-50">Buy Now</button>
    </div>{msg && <p className="text-forest mt-2">{msg}</p>}
    <p className="text-xs text-gray-500 mt-4">Measurement helper (estimate only, not a cutting pattern): curtains ~2.5–3 m per panel, a kurta ~2.5–3 m, a cushion cover ~0.5 m. Check width and drape before ordering.</p>
  </div>);
}
