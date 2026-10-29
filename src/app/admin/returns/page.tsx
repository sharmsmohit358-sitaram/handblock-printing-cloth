"use client";
import { useEffect, useState } from "react";
// Admin return review. Admin token cookie required.
type Ret = { id: string; orderNumber: string; reason: string; detail: string; photoUrl: string; status: string; adminNote: string; refundIntentId: string | null; createdAt: string };
export default function AdminReturns() {
  const [list, setList] = useState<Ret[]>([]); const [msg, setMsg] = useState(""); const [note, setNote] = useState(""); const [refund, setRefund] = useState("");
  async function load() { const r = await fetch("/api/admin/returns"); const j = await r.json(); if (j.ok) setList(j.returns); else setMsg(j.error || "Failed."); }
  useEffect(() => { load(); }, []);
  async function review(id: string, decision: string) {
    setMsg(`Reviewing ${decision}…`);
    const r = await fetch("/api/admin/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnId: id, decision, adminNote: note || undefined, refundAmountPaise: refund ? Number(refund) : undefined }) });
    const j = await r.json(); setMsg(j.ok ? j.message : (j.error || "Failed.")); if (j.ok) load();
  }
  return (<div><h1 className="text-3xl font-bold">Return requests</h1><p className="text-sm text-gray-600 mt-2">Admin only. Approving does not move money by itself — if you enter a refund amount (in paise) for a paid prepaid order, a refund intent is created for submission from /admin/refunds. For COD orders, handle the refund manually and note it.</p>
    <div className="bg-white p-5 rounded-2xl border border-sand mt-4 flex gap-3 flex-wrap"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Admin note (optional)" className="border rounded-lg px-3 py-2 flex-1" /><input value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="Refund amount in paise (optional, on approve)" className="border rounded-lg px-3 py-2" /></div>
    {msg && <p className="text-sm mt-3">{msg}</p>}
    <div className="mt-4 space-y-3">{list.map((r) => (<div key={r.id} className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm"><strong>{r.orderNumber}</strong> — {r.status} — {r.reason} — {r.createdAt}</p><p className="text-sm mt-1">{r.detail}</p>{r.photoUrl && <p className="text-sm mt-1">Photo: <a className="underline" href={r.photoUrl}>{r.photoUrl}</a></p>}{r.adminNote && <p className="text-sm mt-1">Admin note: {r.adminNote}</p>}{r.refundIntentId && <p className="text-sm mt-1">Refund intent: {r.refundIntentId}</p>}<div className="flex gap-2 mt-3 flex-wrap"><button onClick={() => review(r.id, "APPROVED")} className="bg-forest text-white px-3 py-1 rounded-lg text-sm">Approve</button><button onClick={() => review(r.id, "RECEIVED")} className="bg-indigo2 text-white px-3 py-1 rounded-lg text-sm">Mark received</button><button onClick={() => review(r.id, "REJECTED")} className="bg-terracotta text-white px-3 py-1 rounded-lg text-sm">Reject</button></div></div>))}{list.length === 0 && <p className="text-sm text-gray-600">No return requests yet.</p>}</div></div>);
}
