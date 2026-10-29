"use client";
import { useState } from "react";
import { inr } from "@/lib/pricing";
export type CouponRow = { id: string; code: string; percentOff: number; flatPaise: number; minSubtotalPaise: number; active: number };
export default function CouponManager({ initial }: { initial: CouponRow[] }) {
  const [code, setCode] = useState(""); const [percent, setPercent] = useState(""); const [flat, setFlat] = useState(""); const [min, setMin] = useState(""); const [msg, setMsg] = useState("");
  const create = async () => {
    const r = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, percentOff: Number(percent || 0), flatPaise: Math.round(Number(flat || 0) * 100), minSubtotalPaise: Math.round(Number(min || 0) * 100) }) });
    const j = await r.json(); setMsg(j.ok ? `Coupon ${j.code} created.` : (j.error || "Create failed.")); if (j.ok) setTimeout(() => window.location.reload(), 800);
  };
  const toggle = async (c: CouponRow) => {
    const r = await fetch(`/api/admin/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) });
    const j = await r.json(); if (j.ok) window.location.reload(); else setMsg(j.error || "Toggle failed.");
  };
  return (<div>
    <div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Create coupon</h2><p className="text-sm text-gray-600 mt-1">Code is uppercase letters/digits, 3–20 chars. Use either percent or flat (in ₹), not both. Minimum is the order subtotal in ₹ that must be reached before the coupon applies. Checkout already only applies active coupons.</p>
      <div className="grid sm:grid-cols-4 gap-2 mt-3"><input value={code} onChange={e => setCode(e.target.value)} placeholder="Code, e.g. DIWALI20" className="border rounded-lg px-3 py-2" /><input value={percent} onChange={e => setPercent(e.target.value)} placeholder="Percent off, e.g. 10" type="number" min="0" max="100" className="border rounded-lg px-3 py-2" /><input value={flat} onChange={e => setFlat(e.target.value)} placeholder="Flat off in ₹, e.g. 500" type="number" min="0" className="border rounded-lg px-3 py-2" /><input value={min} onChange={e => setMin(e.target.value)} placeholder="Min subtotal in ₹, e.g. 2000" type="number" min="0" className="border rounded-lg px-3 py-2" /></div>
      <button onClick={create} className="bg-indigo2 text-white px-4 py-2 rounded-lg mt-3">Create coupon</button>{msg && <p className="text-sm mt-2">{msg}</p>}</div>
    <div className="bg-white rounded-2xl border border-sand mt-4 divide-y">{initial.length === 0 && <p className="p-4 text-sm text-gray-600">No coupons yet.</p>}{initial.map(c => <div key={c.id} className="p-4 flex justify-between flex-wrap gap-2"><div><p className="font-semibold">{c.code}</p><p className="text-sm text-gray-600">{c.percentOff ? `${c.percentOff}% off` : `${inr(c.flatPaise)} off`}{c.minSubtotalPaise ? ` · min ${inr(c.minSubtotalPaise)}` : ""} · {c.active ? "Active" : "Inactive"}</p></div><button onClick={() => toggle(c)} className="bg-white border px-4 py-2 rounded-full text-sm">{c.active ? "Deactivate" : "Activate"}</button></div>)}</div>
  </div>);
}
