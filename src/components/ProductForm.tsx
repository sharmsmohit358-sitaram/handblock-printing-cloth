"use client";
import { useState } from "react";
import { inr } from "@/lib/pricing";
export type PF = { id?: string; slug: string; name: string; type: string; categorySlug: string; description: string; material: string; printTechnique: string; pattern: string; color: string; widthCm: string; gsm: string; pricePaise: string; minCm: string; maxCm: string; incrementCm: string; tiersJson: string; image: string; washCare: string; origin: string; isActive: boolean };
export const emptyPF: PF = { slug: "", name: "", type: "FABRIC", categorySlug: "fabric-by-meter", description: "", material: "Cotton", printTechnique: "Handblock", pattern: "", color: "", widthCm: "112", gsm: "110", pricePaise: "25000", minCm: "50", maxCm: "10000", incrementCm: "50", tiersJson: "[]", image: "/patterns/floral.svg", washCare: "Machine wash cold", origin: "India", isActive: true };
export default function ProductForm({ initial, isNew }: { initial: PF; isNew: boolean }) {
  const [f, setF] = useState<PF>(initial); const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [uploadMsg, setUploadMsg] = useState("");
  const set = (k: keyof PF, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }));
  const upload = async (file: File | undefined) => {
    if (!file) return; setUploadMsg("Uploading…");
    const form = new FormData(); form.append("file", file);
    const r = await fetch("/api/admin/products/upload", { method: "POST", body: form }); const j = await r.json();
    if (!r.ok) { setUploadMsg(""); setErr(j.error || "Upload failed."); return; }
    set("image", j.url); setUploadMsg(`Uploaded: ${j.url} — save the product to apply it.`);
  };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); const body = { ...f, widthCm: f.widthCm ? Number(f.widthCm) : null, gsm: f.gsm ? Number(f.gsm) : null, pricePaise: Number(f.pricePaise), minCm: Number(f.minCm), maxCm: Number(f.maxCm), incrementCm: Number(f.incrementCm) }; const url = isNew ? "/api/admin/products" : `/api/admin/products/${f.id}`; const r = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) setErr(j.error || "Save failed."); else setMsg("Saved. Changes are live on the storefront immediately."); };
  const del = async () => { if (!confirm("Delete this product? Its variants and rolls are also deleted. Order snapshots are kept.")) return; const r = await fetch(`/api/admin/products/${f.id}`, { method: "DELETE" }); if (r.ok) window.location.href = "/admin/products"; };
  return (<form onSubmit={submit} className="bg-white p-5 rounded-2xl border border-sand space-y-3 max-w-2xl">
    <p className="text-sm text-gray-600">Price is in paise: ₹250/m = 25000. Fabric lengths are in centimetres: 0.5 m = 50 cm. Tiers example: [{`{"minCm":1000,"pricePaise":23000}`}]</p>
    {([["slug", "Slug (URL)"], ["name", "Name"], ["description", "Description"], ["material", "Material"], ["printTechnique", "Print technique"], ["pattern", "Pattern"], ["color", "Colour"], ["widthCm", "Width (cm, blank if not applicable)"], ["gsm", "GSM (blank if not applicable)"], ["pricePaise", "Price in paise (per metre for fabric, per piece otherwise)"], ["minCm", "Min quantity (cm)"], ["maxCm", "Max quantity (cm)"], ["incrementCm", "Increment (cm)"], ["tiersJson", "Bulk tiers JSON"], ["image", "Image path"], ["washCare", "Wash care"], ["origin", "Origin"] ] as [keyof PF, string][]).map(([k, label]) => <label key={k} className="block text-sm font-semibold">{label}<input value={String(f[k])} onChange={e => set(k, e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1 font-normal" /></label>)}
    <label className="block text-sm font-semibold">Type<select value={f.type} onChange={e => set("type", e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1 font-normal"><option value="FABRIC">FABRIC</option><option value="BEDSHEET">BEDSHEET</option><option value="HOME">HOME</option><option value="CLOTHING">CLOTHING</option></select></label>
    <label className="block text-sm font-semibold">Category slug<input value={f.categorySlug} onChange={e => set("categorySlug", e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1 font-normal" /></label>
    <div className="border rounded-lg p-3"><p className="text-sm font-semibold">Real product photo (replaces the SVG motif)</p><p className="text-sm text-gray-600 mt-1">JPEG, PNG or WebP, max 5 MB. Uploading sets the image path above — save the product to apply it. On a persistent-disk server the photo lives in public/uploads/; on serverless hosts use S3/Cloudinary before launch.</p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} className="mt-2 text-sm" />{f.image && !f.image.startsWith("/patterns/") && <p className="text-sm mt-2"><img src={f.image} alt="Current product photo" className="w-40 rounded-lg" /></p>}{uploadMsg && <p className="text-sm mt-2">{uploadMsg}</p>}</div>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={e => set("isActive", e.target.checked)} /> Active on storefront</label>
    <div className="flex gap-3"><button className="bg-indigo2 text-white px-5 py-2 rounded-lg">Save product</button>{!isNew && <button type="button" onClick={del} className="bg-red-700 text-white px-4 py-2 rounded-lg">Delete</button>}</div>
    {err && <p className="text-red-700 text-sm">{err}</p>}{msg && <p className="text-forest text-sm">{msg}</p>}
  </form>);
}
