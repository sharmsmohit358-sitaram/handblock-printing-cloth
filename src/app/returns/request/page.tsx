"use client";
import { useState } from "react";
// Customer return request. Only delivered orders, one open request per order.
// A request alone never moves money — admin review decides, and an approved
// refund goes through the existing refund-intent flow (not auto-submitted).
export default function ReturnRequest() {
  const [f, setF] = useState({ orderNumber: "", email: "", reason: "defective", detail: "", photoUrl: "" });
  const [msg, setMsg] = useState("");
  function set(k: string, v: string) { setF((x) => ({ ...x, [k]: v })); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("Submitting…");
    const r = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, email: f.email || undefined }) });
    const j = await r.json(); setMsg(j.ok ? j.message : (j.error || "Failed."));
  }
  return (<div><h1 className="text-3xl font-bold">Request a return</h1><p className="text-sm text-gray-600 mt-2 max-w-2xl">Only delivered orders can be returned. Cut-to-order fabric is reviewed only for defective, incorrect or damaged deliveries, with photo evidence — a correctly cut length is not automatically returnable. See the Return Policy page for the full principle.</p>
    <form onSubmit={submit} className="bg-white p-5 rounded-2xl border border-sand mt-4 space-y-3 max-w-xl">
      <input required value={f.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} placeholder="Order number, e.g. HPC…" className="border rounded-lg px-3 py-2 w-full" />
      <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="Email on the order (for guest orders)" className="border rounded-lg px-3 py-2 w-full" />
      <select value={f.reason} onChange={(e) => set("reason", e.target.value)} className="border rounded-lg px-3 py-2 w-full"><option value="defective">Defective</option><option value="incorrect">Incorrect item</option><option value="damaged">Damaged in transit</option><option value="wrong_size">Wrong size / measurement</option><option value="other">Other</option></select>
      <textarea required value={f.detail} onChange={(e) => set("detail", e.target.value)} placeholder="What is wrong? Describe the issue, item, and what you received." rows={4} className="border rounded-lg px-3 py-2 w-full" />
      <input value={f.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="Photo evidence link (optional — upload link, until in-site photo upload is built)" className="border rounded-lg px-3 py-2 w-full" />
      <button className="bg-indigo2 text-white px-5 py-2 rounded-lg">Submit return request</button>
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </form></div>);
}
