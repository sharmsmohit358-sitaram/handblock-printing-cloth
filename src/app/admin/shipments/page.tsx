"use client";
import { useState } from "react";
// Admin Bigship flow (admin token cookie required, same gate as /admin).
// Step 1: enter order number -> draft + courier rates.
// Step 2: enter courierId -> place shipment, AWB returned, order -> SHIPPED.
export default function Shipments() {
  const [orderNumber, setOrderNumber] = useState("");
  const [draft, setDraft] = useState<{ bigshipOrderId: string; rates: Array<{ courierId: string | number; courierName: string; total: number; tat?: string }> } | null>(null);
  const [courierId, setCourierId] = useState("");
  const [msg, setMsg] = useState("");
  async function draftOrder() {
    setMsg("Creating Bigship draft…");
    const r = await fetch("/api/admin/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber }) });
    const j = await r.json();
    if (!j.ok) { setMsg(j.error || "Failed."); return; }
    setDraft(j); setMsg(j.message);
  }
  async function place() {
    if (!draft) return;
    setMsg("Placing shipment…");
    const r = await fetch("/api/admin/shipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, bigshipOrderId: draft.bigshipOrderId, courierId, riskTypeId: 2 }) });
    const j = await r.json();
    setMsg(j.ok ? `Shipped. AWB: ${j.awb}` : (j.error || "Failed."));
  }
  return (<div><h1 className="text-3xl font-bold">Bigship shipments</h1><p className="text-sm text-gray-600 mt-2">Admin only. Bigship credentials must be in the server .env; without them this page returns configured:false and creates nothing.</p>
    <div className="bg-white p-5 rounded-2xl border border-sand mt-4 space-y-3 max-w-xl">
      <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order number, e.g. HPC…" className="border rounded-lg px-3 py-2 w-full" />
      <button onClick={draftOrder} className="bg-indigo2 text-white px-4 py-2 rounded-lg">1. Create draft + get courier rates</button>
      {draft && (<div><p className="text-sm">Draft: {draft.bigshipOrderId}</p>{draft.rates.map((r) => <p key={String(r.courierId)} className="text-sm mt-1">{r.courierName} — ID {r.courierId} — ₹{r.total} — {r.tat} day(s)</p>)}
        <input value={courierId} onChange={(e) => setCourierId(e.target.value)} placeholder="Courier ID from rates" className="border rounded-lg px-3 py-2 w-full mt-3" />
        <button onClick={place} className="bg-forest text-white px-4 py-2 rounded-lg mt-2">2. Place shipment (AWB)</button></div>)}
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </div></div>);
}
