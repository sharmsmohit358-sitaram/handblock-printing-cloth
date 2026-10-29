"use client";
import { useEffect, useState } from "react";
// Admin order fulfilment. Admin token cookie required (same gate as /admin).
// Lists orders, and moves each to its next allowed status, with optional
// manual courier / AWB for non-Bigship shipments. Bigship AWB still goes
// through /admin/shipments.
type Order = { number: string; status: string; totalPaise: number; paymentMethod: string; paymentStatus: string; createdAt: string };
const NEXT: Record<string, string[]> = {
  PLACED: ["CONFIRMED", "PROCESSING"], CONFIRMED: ["PROCESSING", "PACKED", "SHIPPED"],
  PROCESSING: ["PACKED", "SHIPPED"], PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY", "RTO"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY", "RTO"],
  FAILED_DELIVERY: ["OUT_FOR_DELIVERY", "RETURNED", "RTO"], DELIVERED: ["RETURNED"],
};
export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");
  const [courier, setCourier] = useState(""); const [awb, setAwb] = useState("");
  async function load() { const r = await fetch("/api/admin/orders"); const j = await r.json(); if (j.ok) setOrders(j.orders); else setMsg(j.error || "Failed to load."); }
  useEffect(() => { load(); }, []);
  async function move(o: Order, status: string) {
    setMsg(`Moving ${o.number} to ${status}…`);
    const r = await fetch("/api/admin/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: o.number, status, courier: courier || undefined, awb: awb || undefined }) });
    const j = await r.json(); setMsg(j.ok ? j.message : (j.error || "Failed.")); if (j.ok) load();
  }
  return (<div><h1 className="text-3xl font-bold">Order fulfilment</h1><p className="text-sm text-gray-600 mt-2">Admin only. Status moves follow the allowed chain — no jumps backwards. For Bigship AWB, use /admin/shipments instead.</p>
    <div className="bg-white p-5 rounded-2xl border border-sand mt-4 flex gap-3 flex-wrap"><input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Manual courier (optional)" className="border rounded-lg px-3 py-2" /><input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="Manual AWB (optional)" className="border rounded-lg px-3 py-2" /></div>
    {msg && <p className="text-sm mt-3">{msg}</p>}
    <div className="bg-white p-5 rounded-2xl border border-sand mt-4">{orders.map((o) => (<div key={o.number} className="py-3 border-b last:border-0 flex flex-wrap gap-2 items-center justify-between"><p className="text-sm"><strong>{o.number}</strong> — {o.status} — {o.paymentMethod}/{o.paymentStatus} — ₹{o.totalPaise / 100}</p><div className="flex gap-2 flex-wrap">{(NEXT[o.status] || []).map((s) => <button key={s} onClick={() => move(o, s)} className="bg-indigo2 text-white px-3 py-1 rounded-lg text-sm">→ {s}</button>)}{(NEXT[o.status] || []).length === 0 && <span className="text-sm text-gray-500">No further move (terminal / cancelled / refunded)</span>}</div></div>))}{orders.length === 0 && <p className="text-sm text-gray-600">No orders yet.</p>}</div></div>);
}
